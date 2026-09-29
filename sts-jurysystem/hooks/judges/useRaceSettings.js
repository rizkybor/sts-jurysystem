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
  // BUG FIX (2026-09-29): dulu cuma fetch SEKALI saat mount (dependency
  // array cuma [eventId]) — kalau operator ubah Race Settings di
  // sts-timingsystem SEMENTARA juri sudah buka halamannya duluan,
  // perubahan itu tidak pernah kebaca sampai juri refresh manual.
  // `refreshTick` dipakai pemanggil (lihat listener socket
  // "race-settings:updated" di app/judges/downriverrace/page.jsx) utk
  // memicu refetch tanpa reload halaman.
  const [refreshTick, setRefreshTick] = useState(0);

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
  }, [eventId, refreshTick]);

  const refetch = () => setRefreshTick((t) => t + 1);

  return { settings, loadingSettings, refetch };
}
