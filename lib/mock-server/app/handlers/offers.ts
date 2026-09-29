import "server-only";

import { nextId, recomputeAggregates, userRefOf, listingRefOf, type MockDb } from "@/lib/mock/db";
import { sendOfferSchema } from "@/schemas/site.schema";
import type { BarterRequest, Listing, SiteOffer } from "@/types";
import { conflict, forbidden, notFound, ok, paginate, parseListParams, tooManyRequests, unprocessable, validate } from "../../http";
import { appRoute, requireActiveUser, requireUser } from "../core";
import { toCard } from "./catalog";

const DAY = 86_400_000;
const MAX_OFFERS_PER_DAY = 30;
const OFFER_TTL_DAYS = 7;

function isOfferable(db: MockDb, l: Listing | undefined): l is Listing {
  if (!l || l.status !== "ACTIVE" || l.deletedAt) return false;
  const owner = db.users.find((u) => u.id === l.userId);
  return !!owner && owner.status !== "BLOCKED" && owner.status !== "DELETED";
}

function toSiteOffer(db: MockDb, b: BarterRequest, viewerId: string): SiteOffer {
  const incoming = b.receiverId === viewerId;
  const otherId = incoming ? b.senderId : b.receiverId;
  const other = db.users.find((u) => u.id === otherId);
  const cards = (ids: string[]) => ids.map((id) => db.listings.find((l) => l.id === id)).filter((l): l is Listing => !!l).map(toCard);
  return {
    id: b.id,
    code: b.code,
    status: b.status,
    direction: incoming ? "incoming" : "outgoing",
    offered: cards(b.offeredListingIds),
    requested: cards(b.requestedListingIds),
    counterpart: {
      id: otherId,
      fullName: other?.fullName ?? "—",
      avatar: other?.avatar ?? null,
      // Contact details are shared only once both sides agreed.
      phone: b.status === "ACCEPTED" || b.status === "COMPLETED" ? (other?.phone ?? null) : null,
    },
    message: b.message,
    createdAt: b.createdAt,
    respondedAt: b.respondedAt,
  };
}

function findOffer(db: MockDb, id: string) {
  const b = db.barterRequests.find((x) => x.id === id);
  if (!b) throw notFound("Offer not found");
  // Lazily expire old pending offers.
  if (b.status === "PENDING" && b.expiresAt && b.expiresAt < new Date().toISOString()) b.status = "EXPIRED";
  return b;
}

function respond(db: MockDb, b: BarterRequest, status: BarterRequest["status"]) {
  const now = new Date().toISOString();
  b.status = status;
  b.respondedAt = now;
  b.updatedAt = now;
  recomputeAggregates(db);
}

export const offerRoutes = [
  /** Sends a barter offer: one or more of my active listings for someone else's listing. */
  appRoute("POST", "/offers", (ctx) => {
    requireActiveUser(ctx);
    const input = validate(sendOfferSchema, ctx.body);
    const { db, user } = ctx;

    const target = db.listings.find((l) => l.id === input.listingId);
    if (!isOfferable(db, target)) throw notFound("Listing not found");
    if (target.userId === user.id) throw unprocessable({ listingId: ["site.offer.ownListing"] });

    const offeredIds = [...new Set(input.offeredListingIds)];
    const offered = offeredIds.map((id) => db.listings.find((l) => l.id === id));
    if (offered.some((l) => !isOfferable(db, l) || l.userId !== user.id)) throw unprocessable({ offeredListingIds: ["site.offer.notYours"] });

    const duplicate = db.barterRequests.find(
      (b) => b.senderId === user.id && b.status === "PENDING" && b.requestedListingIds.includes(target.id),
    );
    if (duplicate) throw conflict("You already sent an offer for this listing", "OFFER_EXISTS");
    const today = db.barterRequests.filter((b) => b.senderId === user.id && Date.now() - new Date(b.createdAt).getTime() < DAY).length;
    if (today >= MAX_OFFERS_PER_DAY) throw tooManyRequests("Daily offer limit reached");

    const now = new Date();
    const id = nextId(db, "bar");
    const code = `BAR-${id.replace(/\D/g, "")}`;
    const b: BarterRequest = {
      id,
      code,
      senderId: user.id,
      receiverId: target.userId,
      sender: userRefOf(db, user.id),
      receiver: userRefOf(db, target.userId),
      offeredListingIds: offeredIds,
      requestedListingIds: [target.id],
      items: [
        ...offeredIds.map((lid, k) => ({ id: `${id}_o${k}`, barterRequestId: id, listingId: lid, side: "OFFERED" as const, listing: listingRefOf(db, lid) })),
        { id: `${id}_r0`, barterRequestId: id, listingId: target.id, side: "REQUESTED" as const, listing: listingRefOf(db, target.id) },
      ],
      message: input.message?.trim() || null,
      cashDifferenceNote: null,
      status: "PENDING",
      expiresAt: new Date(now.getTime() + OFFER_TTL_DAYS * DAY).toISOString(),
      respondedAt: null,
      exchangeId: null,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };
    db.barterRequests.unshift(b);
    target.offersCount += 1;
    recomputeAggregates(db);
    return ok(toSiteOffer(db, b, user.id), "Offer sent", { status: 201 });
  }),

  /** My offers: `?box=incoming` (sent to me) or `?box=outgoing` (sent by me). */
  appRoute("GET", "/me/offers", (ctx) => {
    requireUser(ctx);
    const p = parseListParams(ctx.url, { limit: 50 });
    const box = p.filters.box === "outgoing" ? "outgoing" : "incoming";
    const items = ctx.db.barterRequests
      .filter((b) => (box === "incoming" ? b.receiverId : b.senderId) === ctx.user!.id)
      .map((b) => findOffer(ctx.db, b.id))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((b) => toSiteOffer(ctx.db, b, ctx.user!.id));
    return paginate(items, p);
  }),

  appRoute("POST", "/offers/:id/accept", (ctx) => {
    requireActiveUser(ctx);
    const b = findOffer(ctx.db, ctx.params.id);
    if (b.receiverId !== ctx.user.id) throw forbidden();
    if (b.status !== "PENDING") throw conflict("This offer can no longer be accepted", "OFFER_NOT_PENDING");
    respond(ctx.db, b, "ACCEPTED");
    return ok(toSiteOffer(ctx.db, b, ctx.user.id), "Offer accepted");
  }),

  appRoute("POST", "/offers/:id/decline", (ctx) => {
    requireUser(ctx);
    const b = findOffer(ctx.db, ctx.params.id);
    if (b.receiverId !== ctx.user.id) throw forbidden();
    if (b.status !== "PENDING") throw conflict("This offer is no longer pending", "OFFER_NOT_PENDING");
    respond(ctx.db, b, "DECLINED");
    return ok(toSiteOffer(ctx.db, b, ctx.user.id), "Offer declined");
  }),

  appRoute("POST", "/offers/:id/cancel", (ctx) => {
    requireUser(ctx);
    const b = findOffer(ctx.db, ctx.params.id);
    if (b.senderId !== ctx.user.id) throw forbidden();
    if (b.status !== "PENDING") throw conflict("This offer is no longer pending", "OFFER_NOT_PENDING");
    respond(ctx.db, b, "CANCELLED");
    return ok(toSiteOffer(ctx.db, b, ctx.user.id), "Offer cancelled");
  }),
];
