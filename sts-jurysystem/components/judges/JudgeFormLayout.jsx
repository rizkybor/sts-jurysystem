"use client";

/**
 * Layout bersama halaman penalty juri (Sprint/Slalom/DRR/RX/H2H).
 *
 * - Mobile (< md): satu kolom, urutan: Step 1 → Step 2 → aksi sekunder →
 *   ringkasan → action bar sticky di bawah layar.
 * - Tablet/desktop (md+): 2 kolom. Kiri = Step 1 (kategori/heat/team,
 *   biasanya daftar panjang). Kanan = JudgeFormAside yang sticky (Step 2,
 *   ringkasan, tombol Submit), jadi juri bisa pilih team di kiri sambil
 *   tombol penalty & Submit tetap terlihat tanpa scroll.
 *
 * MURNI tampilan — tidak ada state/logic di sini.
 */

export function JudgePageContainer({ children }) {
  return (
    <div className="max-w-6xl mx-auto px-4 md:px-6 lg:px-8 pt-4 md:pt-6 pb-6 md:pb-10 space-y-4 md:space-y-6">
      {children}
    </div>
  );
}

export function JudgeForm({ onSubmit, children }) {
  return (
    <form
      onSubmit={onSubmit}
      className="flex flex-col gap-4 md:grid md:grid-cols-[minmax(0,1fr)_320px] lg:grid-cols-[minmax(0,1fr)_380px] md:gap-6 md:items-start"
    >
      {children}
    </form>
  );
}

// `contents` di mobile: anak-anaknya ikut flow <form> langsung, sehingga
// JudgeStickyActions tetap sticky terhadap seluruh form (perilaku lama),
// bukan cuma terhadap kolom ini.
export function JudgeFormAside({ children }) {
  return (
    <div className="contents md:flex md:flex-col md:gap-4 md:sticky md:top-[84px] md:max-h-[calc(100vh-100px)] md:overflow-y-auto md:-mx-1 md:px-1 md:pb-1">
      {children}
    </div>
  );
}

const TONES = {
  sts: "border-sts/30 text-sts bg-white hover:bg-sts/5",
  amber:
    "border-dashed border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100",
};

/**
 * Tombol aksi sekunder (Field Notes / Fouls Report). Di md+ dipindah ke
 * paling bawah kolom kanan via `md:order-last`.
 */
export function JudgeSideAction({ onClick, disabled, hint, tone = "sts", icon, children }) {
  return (
    <div className="md:order-last">
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={`w-full min-h-[48px] flex items-center justify-center gap-2 py-3 rounded-xl border-2 font-semibold text-sm transition disabled:opacity-40 disabled:cursor-not-allowed ${
          TONES[tone] || TONES.sts
        }`}
      >
        {icon}
        {children}
      </button>
      {disabled && hint && (
        <p className="mt-1.5 text-xs text-gray-500 text-center">{hint}</p>
      )}
    </div>
  );
}

export function FieldNotesIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
      <path d="M10 2 3 6v5c0 4 3 6.5 7 7 4-.5 7-3 7-7V6l-7-4Z" />
    </svg>
  );
}
