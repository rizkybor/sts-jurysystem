"use client";

const selectClass =
  "w-full px-4 py-3 border border-gray-300 rounded-xl text-base bg-white focus:outline-none focus:ring-2 focus:ring-sts/40 focus:border-sts transition disabled:bg-gray-100 disabled:text-gray-400";

// Style tombol pilihan — SAMA PERSIS dgn tombol Run/Gate yang sudah ada di
// app/judges/slalom/page.jsx, dipakai di sini via categoryAsButtons/
// teamAsButtons supaya konsisten visual, bukan reka ulang gaya baru.
// `activeColor` opsional (default "sts") — Slalom pakai "orange" saat
// Run 2 dipilih, supaya juri langsung sadar sedang di Run mana dari
// warna tombol aktifnya, tanpa perlu baca label.
const ACTIVE_COLOR_CLASSES = {
  sts: "bg-sts text-white border-sts shadow-sm",
  orange: "bg-orange-500 text-white border-orange-500 shadow-sm",
};
const optionButtonClass = (selected, disabled, activeColor = "sts") =>
  `min-h-[48px] px-3 rounded-xl border text-sm font-semibold transition text-left ${
    disabled
      ? "bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed"
      : selected
      ? ACTIVE_COLOR_CLASSES[activeColor] || ACTIVE_COLOR_CLASSES.sts
      : "bg-white border-gray-300 text-gray-700 hover:border-sts/50"
  }`;

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
 * Category + Team selects shared by all judge pages, including the
 * "team has no valid teamId" warning box. Extracting this is what fixes
 * Sprint's missing hasValidTeamId guard for good (it now comes from the
 * same place every other page reads it from).
 */
export default function JudgeCategoryTeamFields({
  loadingEvent,
  combinedCategories,
  selectedCategory,
  onCategoryChange,
  loadingTeams,
  teams,
  selectedTeam,
  onTeamChange,
  // Opsional — kalau di-set (mis. dari filter "babak aktif" H2H), tim yang
  // _id-nya TIDAK ada di set ini akan disabled di dropdown. undefined/null
  // = tidak ada filter sama sekali (perilaku lama, dipakai Sprint/Slalom/
  // DRR/RX yang tidak punya konsep ini).
  activeTeamIds,
  // Opsional — konten (mis. dropdown Heat di H2H) yang dirender di ANTARA
  // field Kategori & Team, supaya urutannya Kategori > Heat > Team tanpa
  // memecah komponen ini jadi 2 (yang dipakai bersama semua halaman judge).
  betweenCategoryAndTeam,
  // Opsional — kalau di-set, GANTIKAN seluruh blok "Team" (label + select
  // + warning) dgn konten ini. Dipakai H2H: begitu Heat dipilih, cuma ada
  // 2 Team yang mungkin (sudah ditentukan operator timing system) jadi
  // dropdown diganti 2 tombol Team 1 vs Team 2 — lebih cepat dipilih juri
  // drpd buka dropdown utk 2 opsi. undefined/null = pakai dropdown default
  // (perilaku lama, dipakai Sprint/Slalom/DRR/RX & H2H saat Heat blm dipilih).
  teamFieldOverride,
  // Opsional — kalau true, tampilkan pilihan Kategori/Team sbg grid tombol
  // (gaya sama persis dgn tombol Run/Gate di Slalom) drpd dropdown
  // <select>. Default false utk SEMUA halaman lain (Sprint/DRR/RX/H2H)
  // supaya tidak ada perubahan tampilan di luar yang diminta — cuma
  // Slalom yang mengaktifkan ini.
  categoryAsButtons = false,
  teamAsButtons = false,
  // Opsional — warna tombol AKTIF saat categoryAsButtons/teamAsButtons
  // dipakai (lihat ACTIVE_COLOR_CLASSES di atas). Default "sts", tidak
  // berpengaruh sama sekali kalau categoryAsButtons/teamAsButtons false.
  activeColor = "sts",
}) {
  const selectedTeamData = teams.find((t) => t._id === selectedTeam);
  const showInvalidTeamWarning =
    selectedTeam && selectedTeamData && !selectedTeamData.hasValidTeamId;
  const hasActiveFilter = activeTeamIds instanceof Set;
  const isTeamInactive = (t) =>
    hasActiveFilter && t.hasValidTeamId && !activeTeamIds.has(t._id);
  const showInactiveTeamWarning =
    selectedTeam &&
    selectedTeamData?.hasValidTeamId &&
    isTeamInactive(selectedTeamData);

  return (
    <>
      <div>
        <label className="block text-gray-700 mb-2 font-medium">
          Kategori
        </label>
        {categoryAsButtons ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {combinedCategories.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => onCategoryChange(opt.value)}
                aria-pressed={selectedCategory === opt.value}
                className={optionButtonClass(selectedCategory === opt.value, false, activeColor)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        ) : (
          <select
            value={selectedCategory}
            onChange={(e) => onCategoryChange(e.target.value)}
            className={selectClass}
            required
          >
            <option value="" disabled>
              {loadingEvent
                ? "Loading..."
                : combinedCategories.length
                ? "Pilih Kategori"
                : "Tidak ada kategori"}
            </option>
            {combinedCategories.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        )}
        {!loadingEvent && !combinedCategories.length && (
          <p className="mt-1.5 text-xs text-gray-500">
            Belum ada kategori untuk event ini.
          </p>
        )}
      </div>

      {betweenCategoryAndTeam}

      {teamFieldOverride || (
        <div>
          <label className="block text-gray-700 mb-2 font-medium">Team</label>
          {teamAsButtons ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {teams.map((t) => {
                const disabled = !t.hasValidTeamId || isTeamInactive(t);
                return (
                  <button
                    key={t._id}
                    type="button"
                    disabled={disabled}
                    onClick={() => onTeamChange(t._id)}
                    aria-pressed={selectedTeam === t._id}
                    className={optionButtonClass(selectedTeam === t._id, disabled, activeColor)}
                  >
                    {t.nameTeam} {t.bibTeam ? `(BIB ${t.bibTeam})` : ""}
                    {!t.hasValidTeamId
                      ? " — Tidak bisa submit"
                      : isTeamInactive(t)
                      ? " — Belum di babak aktif"
                      : ""}
                  </button>
                );
              })}
              {!loadingTeams && !teams.length && (
                <p className="text-xs text-gray-500 col-span-full">
                  Tidak ada tim.
                </p>
              )}
              {loadingTeams && (
                <p className="text-xs text-gray-500 col-span-full">
                  Loading teams...
                </p>
              )}
            </div>
          ) : (
            <select
              value={selectedTeam}
              onChange={(e) => onTeamChange(e.target.value)}
              className={selectClass}
              required
              disabled={!selectedCategory || loadingTeams}
            >
              <option value="" disabled>
                {loadingTeams
                  ? "Loading teams..."
                  : teams.length
                  ? "Pilih Team"
                  : "Tidak ada tim"}
              </option>
              {teams.map((t) => (
                <option
                  key={t._id}
                  value={t._id}
                  disabled={isTeamInactive(t)}
                  className={
                    !t.hasValidTeamId || isTeamInactive(t)
                      ? "text-orange-500 bg-orange-50"
                      : ""
                  }
                >
                  {t.nameTeam} {t.bibTeam ? `(BIB ${t.bibTeam})` : ""}
                  {!t.hasValidTeamId
                    ? " — Tidak bisa submit"
                    : isTeamInactive(t)
                    ? " — Belum di babak aktif"
                    : ""}
                </option>
              ))}
            </select>
          )}
          {!selectedCategory && (
            <p className="mt-1.5 text-xs text-gray-500">
              Pilih kategori terlebih dahulu.
            </p>
          )}
          {showInvalidTeamWarning && (
            <div className="mt-2 flex items-start gap-2.5 p-3 bg-orange-50 border border-orange-200 rounded-xl">
              <WarningIcon className="w-4 h-4 mt-0.5 text-orange-500 shrink-0" />
              <div>
                <p className="text-orange-800 text-sm font-medium">
                  Team ini tidak memiliki ID yang valid dan tidak bisa
                  menerima penalty.
                </p>
                <p className="text-orange-700 text-xs mt-1">
                  Silakan hubungi administrator untuk memperbaiki data team.
                </p>
              </div>
            </div>
          )}
          {showInactiveTeamWarning && (
            <div className="mt-2 flex items-start gap-2.5 p-3 bg-orange-50 border border-orange-200 rounded-xl">
              <WarningIcon className="w-4 h-4 mt-0.5 text-orange-500 shrink-0" />
              <div>
                <p className="text-orange-800 text-sm font-medium">
                  Team ini belum ada di babak yang sedang aktif di timing
                  system.
                </p>
                <p className="text-orange-700 text-xs mt-1">
                  Pilih team lain, atau tunggu operator membuka babak yang
                  sesuai.
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}

export function getSelectedTeamData(teams, selectedTeam) {
  return teams.find((t) => t._id === selectedTeam) || null;
}
