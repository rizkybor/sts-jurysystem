"use client";

/**
 * Live selection summary pinned above the action bar, so the judge can
 * visually double-check team/role/value before submitting. Di tablet/
 * desktop (kolom kanan) placeholder tetap tampil walau belum ada pilihan,
 * supaya posisi tombol Submit tidak loncat-loncat.
 */
export default function JudgeSummaryBar({ parts }) {
  const filled = (parts || []).filter((p) => p?.value);

  if (!filled.length) {
    return (
      <div className="hidden md:block rounded-2xl border border-dashed border-gray-300 bg-white px-4 py-3 text-sm text-gray-400">
        Ringkasan pilihan akan tampil di sini.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-sts/30 bg-sts/5 px-4 py-3">
      <div className="text-[11px] font-semibold text-sts uppercase tracking-wider mb-1.5">
        Ringkasan
      </div>
      <div className="flex flex-wrap gap-1.5">
        {filled.map((p) => (
          <span
            key={p.label}
            className="inline-flex items-center px-2.5 py-1 rounded-lg bg-white border border-sts/20 text-sm font-semibold text-stsDarkHiglight"
          >
            {p.value}
          </span>
        ))}
      </div>
    </div>
  );
}
