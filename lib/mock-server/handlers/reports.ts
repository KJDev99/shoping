import "server-only";

import { adminRefOf, listingRefOf, recomputeAggregates, userRefOf, type MockDb } from "@/lib/mock/db";
import {
  reportEnforcementSchema,
  reportNoteSchema,
  reportSuspendSchema,
  type ReportDetail,
  type ReportedUserSummary,
  type ReportTargetDetails,
} from "@/schemas/report.schema";
import { REPORT_STATUSES, type Report, type User } from "@/types";
import { audit, requirePermission, type AuthedContext } from "../context";
import { badRequest, conflict, csv, inDateRange, matchesSearch, notFound, ok, paginate, parseListParams, sortItems, validate } from "../http";
import { route } from "../router";
import { blockListing, blockUser, closeReport, findListing, findUser, isOpenReport, suspendUser } from "./moderation";

function findReport(db: MockDb, id: string): Report {
  const report = db.reports.find((r) => r.id === id);
  if (!report) throw notFound("Report not found");
  return report;
}

/** Refreshes embedded refs (reporter, target owner name) from live data. */
function presentReport(db: MockDb, r: Report): Report {
  const owner = r.target.ownerId ? db.users.find((u) => u.id === r.target.ownerId) : undefined;
  let label = r.target.label;
  let image = r.target.image;
  if (r.targetType === "LISTING") {
    const l = db.listings.find((x) => x.id === r.targetId);
    if (l) {
      label = l.title;
      image = l.images[0]?.url ?? null;
    }
  } else if (r.targetType === "USER" && owner) {
    label = owner.fullName;
    image = owner.avatar;
  }
  return { ...r, reporter: userRefOf(db, r.reporterId), target: { ...r.target, label, image, ownerName: owner?.fullName ?? r.target.ownerName } };
}

function userSummary(u: User | undefined): ReportedUserSummary | null {
  if (!u) return null;
  return {
    id: u.id,
    fullName: u.fullName,
    avatar: u.avatar,
    phone: u.phone,
    status: u.status,
    riskLevel: u.riskLevel,
    reportsCount: u.reportsCount,
    listingsCount: u.listingsCount,
    suspendedUntil: u.suspendedUntil,
  };
}

function targetDetails(db: MockDb, r: Report): ReportTargetDetails {
  switch (r.targetType) {
    case "LISTING": {
      const l = db.listings.find((x) => x.id === r.targetId);
      return {
        type: "LISTING",
        listing: l
          ? {
              id: l.id,
              code: l.code,
              title: l.title,
              image: l.images[0]?.url ?? null,
              status: l.status,
              condition: l.condition,
              categoryId: l.subcategoryId ?? l.categoryId,
              reportsCount: l.reportsCount,
              rejectionCount: l.rejectionCount,
              createdAt: l.createdAt,
            }
          : null,
      };
    }
    case "USER":
      return { type: "USER", user: userSummary(db.users.find((u) => u.id === r.targetId)) };
    case "BARTER_REQUEST": {
      const b = db.barterRequests.find((x) => x.id === r.targetId);
      return {
        type: "BARTER_REQUEST",
        request: b
          ? {
              id: b.id,
              code: b.code,
              status: b.status,
              sender: userRefOf(db, b.senderId),
              receiver: userRefOf(db, b.receiverId),
              offered: b.items.filter((i) => i.side === "OFFERED").map((i) => listingRefOf(db, i.listingId)),
              requested: b.items.filter((i) => i.side === "REQUESTED").map((i) => listingRefOf(db, i.listingId)),
              message: b.message,
              createdAt: b.createdAt,
            }
          : null,
      };
    }
    case "MESSAGE":
      return { type: "MESSAGE", message: { id: r.targetId, text: r.target.label, sender: r.target.ownerId ? userRefOf(db, r.target.ownerId) : null } };
  }
}

/** Every enforcement action also closes the report (unless it is already closed). */
function resolveAfterAction(ctx: AuthedContext, report: Report, note: string) {
  if (isOpenReport(report)) closeReport(ctx, report, "RESOLVED", note);
  recomputeAggregates(ctx.db);
}

function responsibleUser(ctx: AuthedContext, report: Report): User {
  if (!report.target.ownerId) throw badRequest("This report has no responsible user");
  return findUser(ctx.db, report.target.ownerId);
}

const STATUS_ORDER = (s: Report["status"]) => REPORT_STATUSES.indexOf(s);

export const reportRoutes = [
  route("GET", "/reports", (ctx) => {
    requirePermission(ctx, "reports.read");
    const p = parseListParams(ctx.url, { sort: "createdAt", order: "desc" });
    const f = p.filters;
    const statuses = csv(f.status);
    const types = csv(f.targetType);
    const reasons = csv(f.reason);
    const mine = f.assignedToMe === "true" || f.assignedToMe === "1";
    const me = ctx.session.admin.id;
    let items = ctx.db.reports
      .map((r) => presentReport(ctx.db, r))
      .filter(
        (r) =>
          (!statuses.length || statuses.includes(r.status)) &&
          (!types.length || types.includes(r.targetType)) &&
          (!reasons.length || reasons.includes(r.reason)) &&
          (!mine || r.assignedTo?.id === me) &&
          inDateRange(r.createdAt, f.from, f.to) &&
          matchesSearch(p.search, r.code, r.id, r.reporter.fullName, r.reporter.phone, r.target.label, r.target.ownerName),
      );
    items = sortItems(items, p.sort, p.order, { createdAt: (r) => r.createdAt, status: (r) => STATUS_ORDER(r.status) });
    return paginate(items, p);
  }),

  route("GET", "/reports/:id", (ctx) => {
    requirePermission(ctx, "reports.read");
    const report = findReport(ctx.db, ctx.params.id);
    const sameTarget = ctx.db.reports
      .filter((r) => r.id !== report.id && r.targetType === report.targetType && r.targetId === report.targetId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const byReporter = ctx.db.reports.filter((r) => r.reporterId === report.reporterId);
    const owner = report.target.ownerId ? ctx.db.users.find((u) => u.id === report.target.ownerId) : undefined;
    const detail: ReportDetail = {
      report: presentReport(ctx.db, report),
      target: targetDetails(ctx.db, report),
      responsibleUser: userSummary(owner),
      otherReports: sameTarget.slice(0, 10).map((r) => presentReport(ctx.db, r)),
      otherReportsTotal: sameTarget.length,
      reporterStats: {
        submitted: byReporter.length,
        rejected: byReporter.filter((r) => r.status === "REJECTED").length,
        resolved: byReporter.filter((r) => r.status === "RESOLVED").length,
      },
    };
    return ok(detail);
  }),

  /** Take the report: NEW → REVIEWING and assign to the current admin. */
  route("POST", "/reports/:id/review", (ctx) => {
    requirePermission(ctx, "reports.resolve");
    const report = findReport(ctx.db, ctx.params.id);
    if (!isOpenReport(report)) throw conflict("Report is already closed");
    if (report.status === "REVIEWING" && report.assignedTo?.id === ctx.session.admin.id) throw conflict("You are already reviewing this report");
    const old = { status: report.status, assignedTo: report.assignedTo?.id ?? null };
    report.status = "REVIEWING";
    report.assignedTo = adminRefOf(ctx.db, ctx.session.admin.id);
    report.updatedAt = new Date().toISOString();
    audit(ctx, { action: "report.review", entityType: "REPORT", entityId: report.id, entityLabel: report.code, oldValue: old, newValue: { status: "REVIEWING", assignedTo: ctx.session.admin.id } });
    return ok(presentReport(ctx.db, report), "Report assigned to you");
  }),

  route("POST", "/reports/:id/resolve", (ctx) => {
    requirePermission(ctx, "reports.resolve");
    const report = findReport(ctx.db, ctx.params.id);
    const { note } = validate(reportNoteSchema, ctx.body);
    if (!isOpenReport(report)) throw conflict("Report is already closed");
    closeReport(ctx, report, "RESOLVED", note);
    recomputeAggregates(ctx.db);
    return ok(presentReport(ctx.db, report), "Report resolved");
  }),

  route("POST", "/reports/:id/reject", (ctx) => {
    requirePermission(ctx, "reports.resolve");
    const report = findReport(ctx.db, ctx.params.id);
    const { note } = validate(reportNoteSchema, ctx.body);
    if (!isOpenReport(report)) throw conflict("Report is already closed");
    closeReport(ctx, report, "REJECTED", note);
    recomputeAggregates(ctx.db);
    return ok(presentReport(ctx.db, report), "Report rejected");
  }),

  route("POST", "/reports/:id/actions/block-listing", (ctx) => {
    requirePermission(ctx, "reports.resolve", "listings.block");
    const report = findReport(ctx.db, ctx.params.id);
    const { reason } = validate(reportEnforcementSchema, ctx.body);
    if (report.targetType !== "LISTING") throw badRequest("This report does not target a listing");
    const listing = findListing(ctx.db, report.targetId);
    blockListing(ctx, listing, reason);
    resolveAfterAction(ctx, report, `Listing blocked: ${reason}`);
    return ok(presentReport(ctx.db, report), "Listing blocked");
  }),

  route("POST", "/reports/:id/actions/block-user", (ctx) => {
    requirePermission(ctx, "reports.resolve", "users.block");
    const report = findReport(ctx.db, ctx.params.id);
    const { reason } = validate(reportEnforcementSchema, ctx.body);
    const user = responsibleUser(ctx, report);
    blockUser(ctx, user, reason);
    resolveAfterAction(ctx, report, `User blocked: ${reason}`);
    return ok(presentReport(ctx.db, report), "User blocked");
  }),

  route("POST", "/reports/:id/actions/suspend-user", (ctx) => {
    requirePermission(ctx, "reports.resolve", "users.block");
    const report = findReport(ctx.db, ctx.params.id);
    const { reason, days } = validate(reportSuspendSchema, ctx.body);
    const user = responsibleUser(ctx, report);
    suspendUser(ctx, user, reason, days);
    resolveAfterAction(ctx, report, `User suspended for ${days}d: ${reason}`);
    return ok(presentReport(ctx.db, report), "User suspended");
  }),
];
