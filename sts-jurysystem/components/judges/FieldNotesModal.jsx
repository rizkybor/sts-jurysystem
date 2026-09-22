"use client";

import { useEffect, useState } from "react";

/**
 * Modal Field Notes — versi ringan dari Fouls Report H2H, dipakai
 * Sprint/Slalom/DRR/RX (kategori single-boat/tanpa kontak antartim
 * langsung, jadi TIDAK butuh Pen Position/Pen Detail spt H2H). MURNI
 * catatan bebas juri ke operator timing system — sama sekali tidak
 * menyentuh penalty resmi. Lihat MEMORY-<KATEGORI>.md.
 */
export default function FieldNotesModal({
  open,
  onClose,
  team,
  categoryLabel,
  onSubmit,
}) {
  const [remarks, setRemarks] = useState("");

  // Reset catatan tiap kali modal dibuka utk team baru — cegah teks
  // lama nyangkut kalau juri sebelumnya batal lalu buka modal lagi.
  useEffect(() => {
    if (open) {
      setRemarks("");
    }
  }, [open, team?.teamId]);

  if (!open) return null;

  const canSubmit = remarks.trim().length > 0;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    const ok = await onSubmit?.({ remarks: remarks.trim() });
    if (ok) {
      setRemarks("");
    }
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center bg-black/50 px-0 sm:px-4">
      <div className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl max-h-[92vh] overflow-y-auto">
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
              <span className="text-white/70">Kategori : </span>
              <span className="font-semibold">{categoryLabel || "-"}</span>
            </div>
            <div>
              <span className="text-white/70">Team : </span>
              <span className="font-bold">
                {team?.nameTeam || "-"}
                {team?.bibTeam ? ` (${team.bibTeam})` : ""}
              </span>
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-6 space-y-4">
          <p className="text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
            Field Notes hanya bersifat <strong>informasi</strong> untuk
            operator timing system — tidak mengubah nilai penalty resmi.
          </p>

          <div>
            <label className="block text-gray-700 mb-2 font-medium text-sm">
              Catatan Lapangan
            </label>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              rows={5}
              autoFocus
              placeholder="Tuliskan kejadian/pelanggaran yang terlihat di lapangan untuk team ini..."
              className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sts/40 focus:border-sts transition resize-none"
            />
          </div>

          <button
            type="button"
            disabled={!canSubmit}
            onClick={handleSubmit}
            className="w-full py-3.5 rounded-xl bg-sts text-white font-bold tracking-wide hover:bg-stsDark transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            SUBMIT FIELD NOTES
          </button>
        </div>
      </div>
    </div>
  );
}
