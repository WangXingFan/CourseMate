"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { recordUsageVisit } from "@/shared/api/analytics";
import { useAuthSession } from "@/shared/auth/auth-session-context";
import { createSecureUUID } from "@/shared/lib/secure-id";

export function useAnalyticsTracking() {
  const pathname = usePathname();
  const { accessToken, user } = useAuthSession();
  const actor = user?.publicID;
  const previous = useRef("");
  useEffect(() => {
    if (!actor || !accessToken) { previous.current = ""; return; }
    if (pathname === "/" || pathname.startsWith("/desktop/") || pathname.startsWith("/auth/") || pathname === "/login") return;
    const key = `${actor}:${pathname}`;
    if (previous.current === key) return;
    previous.current = key;
    // A fresh event on each navigation/refresh; retries retain the same event ID.
    // Leave the request alive through Strict Mode cleanup and route transitions.
    void (async () => {
      try { await recordUsageVisit(accessToken, { eventId: createSecureUUID(), path: pathname }); }
      catch (error) { console.warn("Usage visit could not be recorded", error); }
    })();
  }, [accessToken, actor, pathname]);
}
