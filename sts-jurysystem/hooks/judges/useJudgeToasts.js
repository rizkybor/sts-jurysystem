"use client";

import { useCallback, useRef, useState } from "react";

/**
 * Shared toast queue used by every judge penalty page. Extracted so all
 * 4 pages behave identically instead of drifting (see redesign plan).
 */
export default function useJudgeToasts() {
  const [toasts, setToasts] = useState([]);
  const toastId = useRef(1);

  const pushToast = useCallback((msg, ttlMs = 4000) => {
    const id = toastId.current++;
    setToasts((prev) => [...prev, { id, ...msg }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, ttlMs);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return { toasts, pushToast, removeToast };
}
