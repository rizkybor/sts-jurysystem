"use client";

import { useCallback, useState } from "react";

/**
 * Fetch a judge's own penalty history for an event/eventType from the
 * judge-reports/detail endpoint (fromReport mode). Shared by
 * Sprint/Slalom/DRR history modals.
 */
export default function useJudgeHistory({ eventId, eventType, pushToast }) {
  const [isOpen, setIsOpen] = useState(false);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  const open = useCallback(async () => {
    setIsOpen(true);
    setLoading(true);
    try {
      const url = new URL(
        "/api/judges/judge-reports/detail",
        window.location.origin
      );
      url.searchParams.set("fromReport", "true");
      if (eventId) url.searchParams.set("eventId", eventId);
      url.searchParams.set("eventType", eventType);

      const res = await fetch(url.toString(), { cache: "no-store" });
      const json = await res.json();

      if (res.ok && Array.isArray(json?.data)) {
        setData(json.data);
      } else {
        setData([]);
        pushToast?.({
          title: "Tidak ada riwayat",
          text: "Belum ada data penalty",
          type: "info",
        });
      }
    } catch (err) {
      console.error("❌ Fetch history error:", err);
      setData([]);
      pushToast?.({
        title: "Error",
        text: "Gagal memuat riwayat penalty",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  }, [eventId, eventType, pushToast]);

  const close = useCallback(() => setIsOpen(false), []);

  return { isOpen, data, loading, open, close };
}
