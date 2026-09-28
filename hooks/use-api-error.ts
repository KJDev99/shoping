"use client";

import { useCallback } from "react";
import type { FieldValues, Path, UseFormSetError } from "react-hook-form";
import { isApiError } from "@/lib/api/client";
import { useT } from "@/lib/i18n/provider";

/** Maps any thrown error to a user-facing, translated message. */
export function useApiErrorMessage() {
  const t = useT();
  return useCallback(
    (error: unknown): string => {
      if (!isApiError(error)) return t("common.states.error");
      if (error.status === 0) return t("common.states.networkHint");
      if (error.isForbidden) return t("common.states.forbiddenHint");
      if (error.isNotFound) return t("common.states.notFoundHint");
      if (error.isRateLimited) return t("common.states.rateLimitedHint");
      if (error.isValidation) return t("common.toast.validation");
      if (error.status === 409) return error.message;
      if (error.isServerError) return t("common.states.errorHint");
      return error.message || t("common.toast.error");
    },
    [t],
  );
}

/**
 * Applies 422 field errors from the API to a react-hook-form instance so they
 * render next to the matching fields. Returns true if any were applied.
 */
export function applyFieldErrors<T extends FieldValues>(error: unknown, setError: UseFormSetError<T>): boolean {
  if (!isApiError(error) || !error.isValidation || !error.fieldErrors) return false;
  let applied = false;
  for (const [field, messages] of Object.entries(error.fieldErrors)) {
    if (!messages.length) continue;
    setError(field as Path<T>, { type: "server", message: messages[0] });
    applied = true;
  }
  return applied;
}
