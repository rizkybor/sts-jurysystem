"use client";

import { motion } from "framer-motion";

const TYPE_STYLES = {
  error: "border-red-300 text-red-800",
  success: "border-sts/40 text-stsDarkHiglight",
  warning: "border-orange-300 text-orange-800",
  info: "border-sts/30 text-stsDark",
};

const TYPE_ICON_BG = {
  error: "bg-red-100 text-red-600",
  success: "bg-sts/10 text-stsDarkHiglight",
  warning: "bg-orange-100 text-orange-600",
  info: "bg-sts/10 text-stsDark",
};

function ToastIcon({ type }) {
  if (type === "success") {
    return (
      <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
        <path
          fillRule="evenodd"
          d="M16.7 5.3a1 1 0 0 1 0 1.4l-7.4 7.4a1 1 0 0 1-1.4 0L3.3 9.5a1 1 0 1 1 1.4-1.4l3.6 3.6 6.7-6.7a1 1 0 0 1 1.4 0Z"
          clipRule="evenodd"
        />
      </svg>
    );
  }
  if (type === "error" || type === "warning") {
    return (
      <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
        <path
          fillRule="evenodd"
          d="M8.485 3.495c.673-1.165 2.357-1.165 3.03 0l6.28 10.875c.673 1.167-.17 2.63-1.516 2.63H3.72c-1.346 0-2.189-1.463-1.515-2.63L8.485 3.495ZM10 7a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 7Zm0 7a.9.9 0 1 0 0-1.8.9.9 0 0 0 0 1.8Z"
          clipRule="evenodd"
        />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
      <path
        fillRule="evenodd"
        d="M18 10A8 8 0 1 1 2 10a8 8 0 0 1 16 0ZM9 9a1 1 0 0 1 2 0v4a1 1 0 1 1-2 0V9Zm1-4a1 1 0 1 0 0 2 1 1 0 0 0 0-2Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

/**
 * Shared toast stack for judge penalty pages. Bottom-center on phones
 * (thumb-reachable, clear of the status bar / notch), top-right from
 * `sm:` up. Accent bar uses the brand blue instead of an indigo/purple
 * gradient.
 */
export default function JudgeToastStack({ toasts, onDismiss }) {
  return (
    <div
      className="fixed z-50 flex flex-col gap-3 px-4 left-0 right-0 bottom-4 items-center
        sm:left-auto sm:right-6 sm:bottom-auto sm:top-6 sm:items-end sm:px-0"
    >
      {toasts.map((toast) => (
        <motion.div
          key={toast.id}
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 40, opacity: 0 }}
          className={`w-full max-w-sm p-4 rounded-xl shadow-lg border backdrop-blur-xl bg-white/90 relative overflow-hidden ${
            TYPE_STYLES[toast.type] || TYPE_STYLES.info
          }`}
        >
          <div className="flex items-start gap-3">
            <div
              className={`shrink-0 flex items-center justify-center h-8 w-8 rounded-full ${
                TYPE_ICON_BG[toast.type] || TYPE_ICON_BG.info
              }`}
            >
              <ToastIcon type={toast.type} />
            </div>
            <div className="flex-1 pt-0.5">
              <p className="font-semibold text-sm">{toast.title}</p>
              <p className="text-sm opacity-90">{toast.text}</p>
            </div>
            <button
              onClick={() => onDismiss(toast.id)}
              className="p-1 rounded-full hover:bg-black/10 shrink-0"
              aria-label="Close toast"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
              </svg>
            </button>
          </div>
          <motion.div
            initial={{ width: "100%" }}
            animate={{ width: 0 }}
            transition={{ duration: 4, ease: "linear" }}
            className="absolute bottom-0 left-0 h-1 bg-sts"
          />
        </motion.div>
      ))}
    </div>
  );
}
