"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const STORAGE_KEY = "sts_cookie_consent";

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) {
        setVisible(true);
      }
    } catch {
      // localStorage tidak tersedia (mis. private mode) — biarkan banner tersembunyi
    }
  }, []);

  const acknowledge = () => {
    try {
      localStorage.setItem(STORAGE_KEY, "acknowledged");
    } catch {
      // gagal menyimpan preferensi tidak masalah, cukup sembunyikan untuk sesi ini
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Pemberitahuan cookie"
      className="fixed inset-x-0 bottom-0 z-[100] px-4 pb-4 sm:inset-x-auto sm:right-4 sm:bottom-4 sm:max-w-sm"
    >
      <div className="bg-white rounded-2xl ring-1 ring-gray-200/70 shadow-xl shadow-black/10 overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-sts via-stsDark to-stsDarkHiglight" />
        <div className="p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <div className="shrink-0 w-9 h-9 rounded-xl bg-sts/10 text-sts flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                className="w-5 h-5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 12a9 9 0 11-9-9c.34 0 .67.02 1 .05a3 3 0 004.5 3.5c.02.15.05.3.09.45a3 3 0 003.36 3.9c.03.33.05.67.05 1z"
                />
                <circle cx="8.5" cy="12.5" r="0.9" fill="currentColor" stroke="none" />
                <circle cx="12" cy="16.5" r="0.9" fill="currentColor" stroke="none" />
                <circle cx="14.5" cy="10.5" r="0.9" fill="currentColor" stroke="none" />
              </svg>
            </div>
            <div className="flex-1">
              <h2 className="text-sm font-bold text-gray-900">
                Kami menggunakan cookie
              </h2>
              <p className="mt-1 text-xs sm:text-[13px] text-gray-600 leading-relaxed">
                STiming Scoring hanya menggunakan cookie esensial untuk menjaga
                sesi login Anda tetap aktif. Kami tidak menggunakan cookie
                iklan atau pelacakan pihak ketiga.{" "}
                <Link
                  href="/cookies"
                  className="text-sts font-medium hover:underline"
                >
                  Pelajari selengkapnya
                </Link>
                .
              </p>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={acknowledge}
              className="rounded-xl bg-sts text-white text-xs sm:text-sm font-semibold px-4 py-2 hover:bg-stsDark transition"
            >
              Mengerti
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
