"use client";

function GavelIcon({ className = "w-4 h-4" }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M14.53 3.47a.75.75 0 0 0-1.06 1.06l.72.72-2.5 2.5-1.19-1.19a.75.75 0 0 0-1.06 1.06l.5.5-6.69 6.69a1.5 1.5 0 0 0 0 2.12l1.06 1.06a1.5 1.5 0 0 0 2.12 0l6.69-6.69.5.5a.75.75 0 0 0 1.06-1.06l-1.19-1.19 2.5-2.5.72.72a.75.75 0 0 0 1.06-1.06l-3.24-3.24Zm-.44 15.03a.75.75 0 0 1 .75-.75h6.5a.75.75 0 0 1 0 1.5h-6.5a.75.75 0 0 1-.75-.75Z" />
    </svg>
  );
}

function WarningIcon({ className = "w-4 h-4" }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className={className}>
      <path
        fillRule="evenodd"
        d="M8.485 3.495c.673-1.165 2.357-1.165 3.03 0l6.28 10.875c.673 1.167-.17 2.63-1.516 2.63H3.72c-1.346 0-2.189-1.463-1.515-2.63L8.485 3.495ZM10 7a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 7Zm0 7a.9.9 0 1 0 0-1.8.9.9 0 0 0 0 1.8Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

/**
 * Assigned-role/gate/section strip shown under the top bar. Lebar/padding
 * diatur oleh container halaman (lihat JudgePageContainer), komponen ini
 * cuma kartunya.
 */
export default function JudgeRoleBadges({ items, emptyHint }) {
  const list = items || [];
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-4">
      <div className="flex items-center gap-2 shrink-0">
        <span className="flex items-center justify-center h-8 w-8 rounded-lg bg-sts/10 text-sts">
          <GavelIcon className="w-4 h-4" />
        </span>
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Judge Task
        </span>
      </div>

      {list.length ? (
        <div className="flex flex-wrap gap-2 sm:border-l sm:border-gray-200 sm:pl-4">
          {list.map((item) => (
            <span
              key={item.key ?? item}
              className="inline-flex items-center px-3 py-1 bg-sts/5 border border-sts/25 text-stsDark rounded-full text-sm font-semibold"
            >
              {item.label ?? item}
            </span>
          ))}
        </div>
      ) : (
        <div className="flex-1 flex items-start gap-2 text-orange-700 bg-orange-50 border border-orange-200 rounded-lg px-3 py-2">
          <WarningIcon className="w-4 h-4 mt-0.5 text-orange-500 shrink-0" />
          <p className="text-xs font-medium leading-relaxed">
            {emptyHint || "Belum ada tugas ter-assign untuk event ini."}
          </p>
        </div>
      )}
    </div>
  );
}
