"use client";

/**
 * Action bar. Mobile: sticky di bawah layar (safe-area aware) supaya
 * Submit selalu terjangkau jempol tanpa scroll. Tablet/desktop (md+):
 * tampil biasa di dalam kolom kanan (JudgeFormAside) yang sudah sticky,
 * jadi tidak perlu bar mengambang lagi.
 */
export default function JudgeStickyActions({
  onHistory,
  historyDisabled,
  submitLabel = "Kirim ke Operator →",
  submitting,
  submitDisabled,
}) {
  return (
    <div
      className="sticky bottom-0 z-30 -mx-4 border-t border-gray-200 bg-white/95 backdrop-blur px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]
        md:static md:z-auto md:mx-0 md:border-0 md:bg-transparent md:backdrop-blur-none md:p-0"
    >
      <div className="flex flex-row gap-2 sm:gap-3 md:flex-col-reverse md:gap-2">
        {onHistory && (
          <button
            type="button"
            onClick={onHistory}
            disabled={historyDisabled}
            className="w-1/2 md:w-full min-h-[48px] py-3 px-1 text-sm sm:text-base btn-outline-sts rounded-xl font-semibold shadow-sm hover:btnActive-sts hover:text-white disabled:opacity-50 transition"
          >
            Lihat Riwayat
          </button>
        )}
        <button
          type="submit"
          disabled={submitDisabled}
          className={`${
            onHistory ? "w-1/2 md:w-full" : "w-full"
          } min-h-[48px] md:min-h-[56px] py-3 px-1 text-sm sm:text-base bg-sts text-white rounded-xl font-semibold shadow-md hover:bg-stsDarkHiglight disabled:bg-gray-300 disabled:text-gray-500 disabled:shadow-none transition`}
        >
          {submitting ? "Mengirim..." : submitLabel}
        </button>
      </div>
    </div>
  );
}
