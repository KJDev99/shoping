import { z } from "zod";

/**
 * Shared Zod instance whose default messages are translation keys, so a
 * missing field yields "validation.required" on both client and server.
 * Import `z` from here in every schema file.
 */
z.setErrorMap((issue, ctx) => {
  if (issue.code === z.ZodIssueCode.invalid_type) {
    if (issue.received === "undefined" || issue.received === "null") return { message: "validation.required" };
    return { message: "validation.invalid" };
  }
  if (issue.code === z.ZodIssueCode.invalid_enum_value || issue.code === z.ZodIssueCode.invalid_literal) return { message: "validation.invalid" };
  return { message: ctx.defaultError };
});

export { z };
