"use client";

import { useEffect, useState } from "react";

/**
 * Race Settings mentah untuk satu event (mis. settings.h2h.startPenalties/
 * cutLinePenalties/finishPenalties) — dipakai supaya pilihan nilai
 * penalty di halaman judge mengikuti kustomisasi operator di
 * sts-timingsystem, bukan daftar hardcode yang bisa berbeda dari yang
 * sebenarnya dikonfigurasi untuk event tsb.
 */
export default function useRaceSettings(eventId) {
  const [settings, setSettings] = useState(null);
  const [loadingSettings, setLoadingSettings] = useState(true);

  useEffect(() => {
    if (!eventId) return;
    let cancelled = false;

    const fetchSettings = async () => {
      setLoadingSettings(true);
      try {
        const res = await fetch(`/api/events/${eventId}/race-settings`, {
          cache: "no-store",
        });
        const data = await res.json();
        if (!cancelled) {
          setSettings(res.ok && data?.success ? data.settings || {} : {});
        }
      } catch (err) {
        console.error("❌ Race settings error:", err);
        if (!cancelled) setSettings({});
      } finally {
        if (!cancelled) setLoadingSettings(false);
      }
    };

    fetchSettings();
    return () => {
      cancelled = true;
    };
  }, [eventId]);

  return { settings, loadingSettings };
}
