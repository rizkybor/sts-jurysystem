"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import iconHandPush from "@/assets/images/icon-fouls-hand.png";
import iconFootKick from "@/assets/images/icon-fouls-kick.png";
import iconPunch from "@/assets/images/icon-fouls-punch.png";
import iconTouchGate from "@/assets/images/icon-fouls-touch-gate.png";
import iconOutside from "@/assets/images/icon-fouls-outside.png";

// 4 posisi di perahu (dilihat dari atas, haluan/depan di atas) — sesuai
// mockup Modal-Fouls.pdf: 4 area melingkar yang bisa dipilih juri.
export const FOUL_POSITIONS = [
  { key: "front-left", label: "Depan Kiri" },
  { key: "front-right", label: "Depan Kanan" },
  { key: "back-left", label: "Belakang Kiri" },
  { key: "back-right", label: "Belakang Kanan" },
];

// 5 jenis pelanggaran + estimasi durasi penalty (INFORMASI SAJA — angka
// ini TIDAK pernah dikirim/diterapkan sbg penalty resmi ke timing system,
// murni label supaya operator tahu tingkat keseriusan pelanggarannya).
// "Outside" pakai "DQ" (Diskualifikasi) sbg label, bukan durasi detik.
export const FOUL_DETAILS = [
  { key: "hand_push", label: "Hand Push", seconds: 5 },
  { key: "foot_kick", label: "Foot Kick", seconds: 5 },
  { key: "punch", label: "Punch", seconds: 10 },
  { key: "touch_gate", label: "Touch Gate", seconds: 50 },
  { key: "outside", label: "Outside", seconds: "DQ" },
];

const DETAIL_ICON_SRC = {
  hand_push: iconHandPush,
  foot_kick: iconFootKick,
  punch: iconPunch,
  touch_gate: iconTouchGate,
  outside: iconOutside,
};

// Fallback utk key yang tidak punya PNG tetap (mis. Pen Detail baru yang
// ditambahkan operator lewat Race Settings, lihat MEMORY-H2H.md) — supaya
// tetap ada indikator visual, bukan kotak kosong.
function DetailIcon({ iconKey, selected }) {
  const src = DETAIL_ICON_SRC[iconKey];
  if (!src) {
    return (
      <svg
        viewBox="0 0 20 20"
        fill="currentColor"
        className={`w-6 h-6 sm:w-7 sm:h-7 transition ${
          selected ? "text-sts" : "text-gray-400"
        }`}
      >
        <path
          fillRule="evenodd"
          d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-7-4a1 1 0 1 0-2 0v4a1 1 0 0 0 2 0V6Zm-1 7a1.25 1.25 0 1 0 0 2.5 1.25 1.25 0 0 0 0-2.5Z"
          clipRule="evenodd"
        />
      </svg>
    );
  }
  return (
    <Image
      src={src}
      alt=""
      width={48}
      height={48}
      className={`w-6 h-6 sm:w-7 sm:h-7 object-contain transition ${
        selected ? "" : "opacity-70"
      }`}
    />
  );
}

/**
 * Modal Fouls Report — MURNI informasi juri ke operator timing system
 * (lihat MEMORY-H2H.md), sama sekali tidak menyentuh penalty resmi.
 * Layout mengikuti Modal-Fouls.pdf: banner biru (Round/Foul Team/Unfouls
 * Team), dua kolom (Pen Position boat-shape + Pen Detail icon grid),
 * Catatan, Submit.
 */
export default function FoulsReportModal({
  open,
  onClose,
  roundName,
  foulTeam,
  unfoulTeam,
  submitting,
  onSubmit,
  // Opsional — override daftar Pen Detail dari Race Settings H2H
  // (sts-timingsystem), lihat MEMORY-H2H.md. Fallback ke FOUL_DETAILS
  // bawaan kalau event belum pernah dikustomisasi.
  foulDetails,
}) {
  const [position, setPosition] = useState(null);
  const [detail, setDetail] = useState(null);
  const [remarks, setRemarks] = useState("");
  const details =
    Array.isArray(foulDetails) && foulDetails.length
      ? foulDetails
      : FOUL_DETAILS;

  // Reset pilihan tiap kali modal dibuka — cegah pilihan lama (posisi/
  // detail/catatan) nyangkut kalau juri sebelumnya batal submit lalu
  // buka modal ini lagi utk team yang berbeda.
  useEffect(() => {
    if (open) {
      setPosition(null);
      setDetail(null);
      setRemarks("");
    }
  }, [open, foulTeam?.teamId]);

  if (!open) return null;

  const canSubmit = !!position && !!detail && !submitting;
  const detailInfo = details.find((d) => d.key === detail);

  const handleSubmit = async () => {
    if (!canSubmit) return;
    const positionInfo = FOUL_POSITIONS.find((p) => p.key === position);
    const ok = await onSubmit?.({
      position,
      positionLabel: positionInfo?.label || "",
      detail,
      detailLabel: detailInfo?.label || "",
      penaltySecondsLabel: detailInfo?.seconds ?? null,
      remarks: remarks.trim(),
    });
    if (ok) {
      setPosition(null);
      setDetail(null);
      setRemarks("");
    }
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center bg-black/50 px-0 sm:px-4">
      <div className="w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl max-h-[92vh] overflow-y-auto">
        {/* Header banner */}
        <div className="relative bg-gradient-to-br from-sts via-stsDark to-stsDarkHiglight rounded-t-3xl sm:rounded-t-2xl p-4 sm:p-5">
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="absolute top-3 right-3 h-8 w-8 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center transition"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path d="M4.293 4.293a1 1 0 0 1 1.414 0L10 8.586l4.293-4.293a1 1 0 1 1 1.414 1.414L11.414 10l4.293 4.293a1 1 0 0 1-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 0 1-1.414-1.414L8.586 10 4.293 5.707a1 1 0 0 1 0-1.414Z" />
            </svg>
          </button>
          <div className="text-white text-sm space-y-1 pr-10">
            <div>
              <span className="text-white/70">Round : </span>
              <span className="font-semibold">{roundName || "-"}</span>
            </div>
            <div>
              <span className="text-white/70">Foul Team : </span>
              <span className="font-bold text-red-300">
                {foulTeam?.nameTeam || "-"}
                {foulTeam?.bibTeam ? ` (${foulTeam.bibTeam})` : ""}
              </span>
            </div>
            <div>
              <span className="text-white/70">Unfouls Team : </span>
              <span className="font-semibold">
                {unfoulTeam?.nameTeam || "-"}
                {unfoulTeam?.bibTeam ? ` (${unfoulTeam.bibTeam})` : ""}
              </span>
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-6 space-y-6">
          <p className="text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
            Fouls Report hanya bersifat <strong>informasi</strong> untuk
            operator timing system — tidak mengubah nilai penalty resmi.
          </p>

          <div className="grid grid-cols-2 gap-4 sm:gap-6">
            {/* Pen Position — boat shape 2x2 */}
            <div>
              <h3 className="text-center text-sm font-bold text-gray-800 mb-3">
                Pen Position
              </h3>
              <div className="relative mx-auto w-full max-w-[190px] aspect-[9/16] bg-gray-200 rounded-t-full rounded-b-[36px]">
                {FOUL_POSITIONS.map((p) => {
                  const selected = position === p.key;
                  const isTop = p.key.startsWith("front");
                  const isLeft = p.key.endsWith("left");
                  return (
                    <button
                      key={p.key}
                      type="button"
                      onClick={() => setPosition(p.key)}
                      aria-pressed={selected}
                      className={`absolute aspect-square w-[38%] rounded-full flex items-center justify-center text-center transition ${
                        isTop ? "top-[10%]" : "bottom-[8%]"
                      } ${isLeft ? "left-[8%]" : "right-[8%]"} ${
                        selected
                          ? "bg-white ring-4 ring-sts"
                          : "bg-white/90 hover:bg-white"
                      }`}
                    >
                      {selected ? (
                        <span className="h-4 w-4 rounded-full bg-red-500" />
                      ) : (
                        <span className="text-[10px] leading-tight text-gray-400 px-1.5">
                          {p.label}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              {position && (
                <p className="text-center text-xs font-semibold text-sts mt-2">
                  {FOUL_POSITIONS.find((p) => p.key === position)?.label}
                </p>
              )}
            </div>

            {/* Pen Detail — icon grid */}
            <div>
              <h3 className="text-center text-sm font-bold text-gray-800 mb-3">
                Pen Detail
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {details.map((d) => {
                  const selected = detail === d.key;
                  return (
                    <button
                      key={d.key}
                      type="button"
                      onClick={() => setDetail(d.key)}
                      aria-pressed={selected}
                      title={
                        d.seconds === "DQ"
                          ? `${d.label} (Diskualifikasi)`
                          : `${d.label} (Penalti ${d.seconds} Detik)`
                      }
                      className={`relative flex flex-col items-center gap-1.5 py-2`}
                    >
                      <span
                        className={`relative aspect-square w-full rounded-full flex items-center justify-center transition ${
                          selected
                            ? "bg-white ring-4 ring-sts shadow-md shadow-sts/30 scale-105"
                            : "bg-gray-100 hover:bg-gray-200"
                        }`}
                      >
                        <DetailIcon iconKey={d.key} selected={selected} />
                        {selected && (
                          <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-emerald-500 text-white flex items-center justify-center ring-2 ring-white">
                            <svg
                              viewBox="0 0 20 20"
                              fill="currentColor"
                              className="w-3 h-3"
                            >
                              <path
                                fillRule="evenodd"
                                d="M16.704 5.29a1 1 0 0 1 0 1.415l-7.5 7.5a1 1 0 0 1-1.415 0l-3.5-3.5a1 1 0 1 1 1.415-1.414l2.792 2.792 6.793-6.793a1 1 0 0 1 1.415 0Z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </span>
                        )}
                      </span>
                      <span
                        className={`text-[11px] text-center leading-tight ${
                          selected
                            ? "text-sts font-bold"
                            : "text-gray-500 font-medium"
                        }`}
                      >
                        {d.label}
                        <br />
                        <span
                          className={selected ? "text-sts/80" : "text-gray-400"}
                        >
                          {d.seconds === "DQ" ? "(DQ)" : `(${d.seconds}s)`}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-gray-700 mb-2 font-medium text-sm">
              Catatan (opsional)
            </label>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              rows={3}
              placeholder="Tambahkan catatan detail pelanggaran (opsional)..."
              className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sts/40 focus:border-sts transition resize-none"
            />
          </div>

          <button
            type="button"
            disabled={!canSubmit}
            onClick={handleSubmit}
            className="w-full py-3.5 rounded-xl bg-sts text-white font-bold tracking-wide hover:bg-stsDark transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {submitting ? "MENGIRIM..." : "SUBMIT FOULS REPORT"}
          </button>
        </div>
      </div>
    </div>
  );
}
