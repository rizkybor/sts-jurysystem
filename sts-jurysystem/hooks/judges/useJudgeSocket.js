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

    const handler = (msg) => {
      if (msg?.senderId && msg.senderId === socketRef.current?.id) return;
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
