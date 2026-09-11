"use client";

/**
 * Live selection summary pinned above the action bar, so the judge can
 * visually double-check team/role/value before submitting.
 */
export default function JudgeSummaryBar({ parts }) {
  const filled = (parts || []).filter((p) => p?.value);
  if (!filled.length) return null;

  return (
    <div className="rounded-xl border border-sts/30 bg-sts/5 px-4 py-2.5 text-sm text-stsDarkHiglight flex flex-wrap items-center gap-x-2 gap-y-1">
      {filled.map((p, i) => (
        <span key={p.label} className="inline-flex items-center gap-1">
          {i > 0 && <span className="text-sts/40">•</span>}
          <span className="font-semibold">{p.value}</span>
        </span>
      ))}
    </div>
  );
}
