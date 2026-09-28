"use client";

import { useMutation, useQueryClient, type QueryKey } from "@tanstack/react-query";
import { toast } from "sonner";
import { useApiErrorMessage } from "./use-api-error";

interface ActionOptions<TVars, TData> {
  mutationFn: (vars: TVars) => Promise<TData>;
  /** Toast shown on success (already translated). */
  successMessage?: string | ((data: TData, vars: TVars) => string);
  /** Query key prefixes to invalidate on success. */
  invalidate?: QueryKey[];
  onSuccess?: (data: TData, vars: TVars) => void;
  /** Return true to suppress the default error toast (e.g. when showing field errors). */
  onError?: (error: unknown, vars: TVars) => boolean | void;
}

/**
 * Standard mutation wrapper: loading state via `isPending` (use it to disable
 * buttons and prevent duplicate submissions), success/error toasts and cache
 * invalidation.
 */
export function useActionMutation<TVars = void, TData = unknown>(opts: ActionOptions<TVars, TData>) {
  const qc = useQueryClient();
  const toMessage = useApiErrorMessage();
  return useMutation({
    mutationFn: opts.mutationFn,
    onSuccess: async (data, vars) => {
      await Promise.all((opts.invalidate ?? []).map((key) => qc.invalidateQueries({ queryKey: key })));
      if (opts.successMessage) {
        toast.success(typeof opts.successMessage === "function" ? opts.successMessage(data, vars) : opts.successMessage);
      }
      opts.onSuccess?.(data, vars);
    },
    onError: (error, vars) => {
      const handled = opts.onError?.(error, vars);
      if (!handled) toast.error(toMessage(error));
    },
  });
}
