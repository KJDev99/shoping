import "server-only";

import { recomputeAggregates } from "@/lib/mock/db";
import { attributesFor, validateListingAttributes } from "@/schemas/listing.schema";
import { createListingSchema, UPLOAD_RULES, VIDEO_RULES } from "@/schemas/site.schema";
import type { FieldErrors, Listing } from "@/types";
import { badRequest, notFound, ok, paginate, parseListParams, tooManyRequests, unprocessable, validate } from "../../http";
import { validateReferences } from "../../handlers/listings";
import { appRoute, requireActiveUser, requireUser } from "../core";
import { toMyListing } from "./catalog";

const DAY = 86_400_000;
const MAX_LISTINGS_PER_DAY = 10;

/** Detects the real image type from magic bytes; never trust the client-declared MIME type. */
function sniffImage(bytes: Uint8Array): (typeof UPLOAD_RULES.types)[number] | null {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "image/png";
  const ascii = (from: number, to: number) => String.fromCharCode(...bytes.slice(from, to));
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "image/webp";
  return null;
}

/** MP4/MOV ("ftyp" box at offset 4) and WebM (EBML header). */
function sniffVideo(bytes: Uint8Array): (typeof VIDEO_RULES.types)[number] | null {
  const ascii = (from: number, to: number) => String.fromCharCode(...bytes.slice(from, to));
  if (ascii(4, 8) === "ftyp") return ascii(8, 10) === "qt" ? "video/quicktime" : "video/mp4";
  if (bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3) return "video/webm";
  return null;
}

function nextListingCode(listings: Listing[]) {
  const max = listings.reduce((m, l) => Math.max(m, Number(l.code.replace(/\D/g, "")) || 0), 10000);
  return max + 1;
}

export const meRoutes = [
  /** Image (≤5 MB) or video (≤10 MB) upload, multipart field "file". Returns an id to reference when creating a listing. */
  appRoute("POST", "/uploads", async (ctx) => {
    requireActiveUser(ctx);
    const form = await ctx.req.formData().catch(() => {
      throw badRequest("Expected multipart/form-data");
    });
    const file = form.get("file");
    if (!(file instanceof File)) throw unprocessable({ file: ["validation.required"] });
    if (file.size > VIDEO_RULES.maxBytes) throw unprocessable({ file: ["site.validation.videoTooLarge"] });
    const data = new Uint8Array(await file.arrayBuffer());
    // The real type comes from the file content, never from the client-declared MIME type.
    const image = sniffImage(data);
    const video = image ? null : sniffVideo(data);
    if (!image && !video) throw unprocessable({ file: ["site.validation.fileType"] });
    if (image && file.size > UPLOAD_RULES.maxBytes) throw unprocessable({ file: ["site.validation.fileTooLarge"] });
    const recent = [...ctx.db.uploads.values()].filter((u) => u.userId === ctx.user.id && u.createdAt > Date.now() - DAY).length;
    if (recent >= 100) throw tooManyRequests();
    const id = crypto.randomUUID().replace(/-/g, "");
    ctx.db.uploads.set(id, { id, userId: ctx.user.id, kind: image ? "image" : "video", contentType: (image ?? video)!, data, createdAt: Date.now() });
    return ok({ id, url: `/api/app/uploads/${id}`, kind: image ? "image" : "video" }, "Uploaded", { status: 201 });
  }),

  /** Serves uploads; supports HTTP Range so videos can be streamed and seeked. */
  appRoute(
    "GET",
    "/uploads/:id",
    (ctx) => {
      const upload = ctx.db.uploads.get(ctx.params.id);
      if (!upload) throw notFound();
      const headers: Record<string, string> = {
        "Content-Type": upload.contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'",
        "Accept-Ranges": "bytes",
      };
      const total = upload.data.length;
      const range = /^bytes=(\d*)-(\d*)$/.exec(ctx.req.headers.get("range") ?? "");
      if (range && (range[1] || range[2])) {
        let start = range[1] ? Number(range[1]) : Math.max(0, total - Number(range[2]));
        let end = range[1] && range[2] ? Number(range[2]) : total - 1;
        end = Math.min(end, total - 1);
        start = Math.min(start, end);
        return new Response(new Blob([upload.data.slice(start, end + 1) as BlobPart]), {
          status: 206,
          headers: { ...headers, "Content-Range": `bytes ${start}-${end}/${total}`, "Content-Length": String(end - start + 1) },
        });
      }
      return new Response(new Blob([upload.data as BlobPart], { type: upload.contentType }), { headers: { ...headers, "Content-Length": String(total) } });
    },
    { public: true },
  ),

  appRoute("GET", "/me/listings", (ctx) => {
    requireUser(ctx);
    const p = parseListParams(ctx.url, { limit: 20 });
    const status = p.filters.status;
    const items = ctx.db.listings
      .filter((l) => l.userId === ctx.user.id && !l.deletedAt && (!status || l.status === status))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map(toMyListing);
    return paginate(items, p);
  }),

  /** Publishes a new barter listing. It goes to moderation unless the user is trusted. */
  appRoute("POST", "/me/listings", (ctx) => {
    requireActiveUser(ctx);
    const input = validate(createListingSchema, ctx.body);
    const { db, user } = ctx;
    const settings = db.settings;

    const errors: FieldErrors = { ...validateReferences(db, input, null) };
    const add = (k: string, m: string) => (errors[k] ??= []).push(m);

    const defs = attributesFor(db.attributes, input.categoryId, input.subcategoryId);
    const attrs = validateListingAttributes(defs, input.attributes);
    Object.assign(errors, attrs.errors);

    if (input.exchangePreferences.openToOffers && !settings.barter.allowOpenOffers) add("exchangePreferences.openToOffers", "site.validation.openOffersDisabled");
    if (input.imageIds.length > settings.listings.maxImages) add("imageIds", "site.validation.tooManyImages");
    const uploads = input.imageIds.map((id) => db.uploads.get(id));
    if (uploads.some((u) => !u || u.userId !== user.id || u.kind === "video")) add("imageIds", "validation.invalid");
    const videoUpload = input.video ? db.uploads.get(input.video.id) : null;
    if (input.video && (!videoUpload || videoUpload.userId !== user.id || videoUpload.kind !== "video")) add("video", "validation.invalid");

    // Blocked keywords (Settings → Moderation), e.g. words that turn a barter into a sale.
    const text = `${input.title} ${input.description}`.toLowerCase();
    const hit = settings.moderation.blockedKeywords.find((k) => k && text.includes(k.toLowerCase()));
    if (hit) add("title", "site.validation.blockedKeyword");

    if (Object.keys(errors).length) throw unprocessable(errors);

    const today = db.listings.filter((l) => l.userId === user.id && Date.now() - new Date(l.createdAt).getTime() < DAY).length;
    if (today >= MAX_LISTINGS_PER_DAY) throw tooManyRequests("Daily listing limit reached");

    const trusted = settings.listings.autoPublishTrustedUsers && user.completedExchanges >= settings.listings.trustedUserMinExchanges;
    const publishNow = !settings.listings.requireModeration || trusted;
    const now = new Date();
    const num = nextListingCode(db.listings);
    const listing: Listing = {
      id: `lst_${num}`,
      code: `LST-${num}`,
      userId: user.id,
      owner: { id: user.id, fullName: user.fullName, avatar: user.avatar, phone: user.phone },
      title: input.title,
      description: input.description,
      categoryId: input.categoryId,
      subcategoryId: input.subcategoryId,
      condition: input.condition,
      images: input.imageIds.map((id, i) => ({ id: `img_${id}`, url: `/api/app/uploads/${id}`, sortOrder: i, isCover: i === 0 })),
      video:
        input.video && videoUpload
          ? {
              url: `/api/app/uploads/${videoUpload.id}`,
              durationSec: Math.round(input.video.durationSec),
              sizeMb: Math.round((videoUpload.data.length / 1024 / 1024) * 10) / 10,
              views: 0,
            }
          : null,
      attributes: attrs.values,
      regionId: input.regionId,
      districtId: input.districtId,
      location: input.location,
      exchangePreferences: settings.barter.allowCashDifference ? input.exchangePreferences : { ...input.exchangePreferences, cashDifference: null },
      status: publishNow ? "ACTIVE" : "PENDING",
      rejectionReason: null,
      rejectionNote: null,
      rejectionCount: 0,
      views: 0,
      favoritesCount: 0,
      offersCount: 0,
      reportsCount: 0,
      possibleDuplicateOf: db.listings.find((l) => l.userId === user.id && !l.deletedAt && l.title.trim().toLowerCase() === input.title.trim().toLowerCase())?.id ?? null,
      publishedAt: publishNow ? now.toISOString() : null,
      expiresAt: publishNow ? new Date(now.getTime() + settings.listings.expirationDays * DAY).toISOString() : null,
      deletedAt: null,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };
    db.listings.unshift(listing);
    db.listingsVersion++;
    recomputeAggregates(db);
    if (!publishNow) {
      // Surfaces in the admin header bell and the moderation "Pending listings" queue.
      db.alerts.unshift({ id: `alr_${listing.id}`, kind: "PENDING_LISTING", title: listing.title, href: `/admin/listings/${listing.id}`, read: false, createdAt: listing.createdAt });
    }
    return ok(toMyListing(listing), publishNow ? "Listing published" : "Listing sent to moderation", { status: 201 });
  }),
];
