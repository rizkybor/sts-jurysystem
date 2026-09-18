"use client";

import { useEffect, useRef } from "react";
import getSocket from "@/utils/socket";

/**
 * Connect once, listen for operator notifications, clean up on unmount.
 * Shared by every judge page. Returns a ref to the live socket instance
 * for pages to emit on (e.g. sendRealtimeMessage).
 */
export default function useJudgeSocket(pushToast) {
  const socketRef = useRef(null);

  useEffect(() => {
    const socket = getSocket();
    socketRef.current = socket;

    // Tipe event internal yang punya toast/handler khusus di halaman
    // masing-masing (mis. "sprint:team-started" di app/judges/sprint/
    // page.jsx, "h2h:round-active" di app/judges/headtohead/page.jsx) —
    // jangan ikut ditampilkan sebagai toast generik di sini, supaya tidak
    // dobel. "FoulsReport" khusus: cuma boleh dilihat operator timing
    // system, juri LAIN yang sedang buka halaman H2H tidak perlu (dan
    // tidak boleh) ikut dapat notifikasi soal laporan fouls juri lain.
    const INTERNAL_EVENT_TYPES = [
      "sprint:team-started",
      "h2h:round-active",
      "FoulsReport",
    ];

    const handler = (msg) => {
      if (msg?.senderId && msg.senderId === socketRef.current?.id) return;
      if (msg?.type && INTERNAL_EVENT_TYPES.includes(msg.type)) return;
      pushToast?.({
        title: msg?.from ? `Pesan dari ${msg.from}` : "Notifikasi",
        text: msg?.text || "Pesan baru diterima",
        type: "info",
      });
    };

    socket.on("custom:event", handler);
    return () => socket.off("custom:event", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return socketRef;
}
