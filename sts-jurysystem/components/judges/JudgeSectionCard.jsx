"use client";

/**
 * White, bordered card used to group one logical step of the form
 * (Kategori & Tim / Detail Posisi / Nilai Penalty). Gives the page a
 * structured, "dashboard" feel instead of fields floating on the flat
 * background.
 */
export default function JudgeSectionCard({ step, title, children }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      {(step || title) && (
        <div className="flex items-center gap-2.5 px-4 md:px-5 py-3 border-b border-gray-100 bg-gray-50/70">
          {step && (
            <span className="flex items-center justify-center h-6 w-6 rounded-full bg-sts text-white text-xs font-bold shrink-0">
              {step}
            </span>
          )}
          {title && (
            <h2 className="text-sm font-semibold text-gray-800 tracking-wide uppercase">
              {title}
            </h2>
          )}
        </div>
      )}
      <div className="p-4 md:p-5 space-y-5">{children}</div>
    </div>
  );
}
