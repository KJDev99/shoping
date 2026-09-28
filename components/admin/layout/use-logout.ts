"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useT } from "@/lib/i18n/provider";
import { authService } from "@/services/auth.service";

export function useLogout() {
  const qc = useQueryClient();
  const t = useT();
  return useMutation({
    mutationFn: authService.logout,
    onSettled: () => {
      qc.clear();
      toast.success(t("header.loggedOut"));
      // Full navigation so no cached admin UI survives the session.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- deliberate hard reload to drop all client state
      window.location.assign("/admin/login");
    },
  });
}
