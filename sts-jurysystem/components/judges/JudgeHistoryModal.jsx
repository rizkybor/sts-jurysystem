"use client";

/**
 * Shared history modal shell (fetch state handling, empty/loading state,
 * header/footer) used by Sprint/Slalom/DRR. Each page supplies its own
 * `renderItem` so item-specific fields (run/gate/section) stay per page.
 */
export default function JudgeHistoryModal({
  open,
  onClose,
  loading,
  data,
  renderItem,
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Riwayat</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 text-gray-500"
            aria-label="Close"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
              <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
            </svg>
          </button>
        </div>

        <div className="p-4 max-h-[70vh] overflow-y-auto">
          {loading ? (
            <p className="text-center text-gray-500 py-10">
              Memuat riwayat…
            </p>
          ) : !data.length ? (
            <p className="text-center text-gray-500 py-10">
              Belum ada riwayat.
            </p>
          ) : (
            <ul className="space-y-3">
              {data.map((item, idx) => (
                <li
                  key={item._id || idx}
                  className="flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm hover:shadow transition"
                >
                  {renderItem(item)}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-medium hover:bg-gray-50"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}

export function penaltyBadgeColor(p) {
  const val = Number(p ?? 0);
  if (val >= 50) return "bg-red-100 text-red-600 ring-red-200";
  if (val >= 10) return "bg-sts/10 text-stsDark ring-sts/20";
  return "bg-emerald-100 text-emerald-600 ring-emerald-200";
}
