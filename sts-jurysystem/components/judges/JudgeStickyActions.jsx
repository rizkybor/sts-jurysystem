"use client";

/**
 * Sticky bottom action bar (safe-area aware) so Submit stays
 * thumb-reachable without scrolling on a phone.
 */
export default function JudgeStickyActions({
  onHistory,
  historyDisabled,
  submitLabel = "Kirim →",
  submitting,
  submitDisabled,
}) {
  return (
    <div
      className="sticky bottom-0 z-30 -mx-4 md:-mx-8 mt-6 border-t border-gray-200 bg-white/95 backdrop-blur px-4 md:px-8 pt-3"
      style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
    >
      <div className="flex flex-col sm:flex-row gap-3">
        {onHistory && (
          <button
            type="button"
            onClick={onHistory}
            disabled={historyDisabled}
            className="w-full sm:w-1/2 min-h-[48px] py-3 text-base btn-outline-sts rounded-xl font-semibold shadow-sm hover:btnActive-sts hover:text-white disabled:opacity-50 transition"
          >
            Lihat Riwayat
          </button>
        )}
        <button
          type="submit"
          disabled={submitDisabled}
          className={`w-full ${
            onHistory ? "sm:w-1/2" : ""
          } min-h-[48px] py-3 text-base bg-sts text-white rounded-xl font-semibold shadow-md hover:bg-stsDarkHiglight disabled:bg-gray-300 disabled:text-gray-500 transition`}
        >
          {submitting ? "Mengirim..." : submitLabel}
        </button>
      </div>
    </div>
  );
}
