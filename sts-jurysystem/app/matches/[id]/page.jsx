"use client";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useEffect, useState, useMemo } from "react";
import Spinner from "@/components/Spinner";

const DEFAULT_IMG = "/images/logo-dummy.png";

// Sama dengan palet di components/MatchCard.jsx, biar konsisten satu app
const LEVEL_COLORS = {
  A: "bg-gradient-to-r from-green-500 to-green-600 text-white",
  B: "bg-gradient-to-r from-blue-500 to-blue-600 text-white",
  C: "bg-gradient-to-r from-yellow-400 to-yellow-500 text-gray-800",
  D: "bg-gradient-to-r from-orange-400 to-orange-500 text-white",
  E: "bg-gradient-to-r from-red-500 to-rose-600 text-white",
  F: "bg-gradient-to-r from-purple-500 to-indigo-600 text-white",
  G: "bg-gradient-to-r from-cyan-400 to-sky-500 text-gray-900",
  H: "bg-gradient-to-r from-pink-400 to-pink-600 text-white",
  I: "bg-gradient-to-r from-gray-400 to-gray-500 text-white",
};
const DEFAULT_LEVEL_COLOR = "bg-gray-200 text-gray-800";

const AVATAR_PALETTE = [
  "#1874a5",
  "#148a3b",
  "#a5581a",
  "#7c3aed",
  "#d9534f",
  "#0d9488",
  "#be185d",
  "#4b5563",
];

function initials(name) {
  const clean = (name || "").trim();
  if (!clean) return "?";
  return (
    clean
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() || "")
      .join("") || "?"
  );
}

function avatarColor(name) {
  const str = name || "";
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
}

export default function EventDetailPage() {
  const { id } = useParams();

  const [event, setEvent] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [raceCategories, setRaceCategories] = useState([]);
  const [initialCategories, setInitialCategories] = useState([]);
  const [divisionCategories, setDivisionCategories] = useState([]);
  const [eventCategories, setEventCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errMsg, setErrMsg] = useState(null);

  const [selectedEventCat, setSelectedEventCat] = useState("");
  const [selectedRace, setSelectedRace] = useState("");
  const [selectedInitial, setSelectedInitial] = useState("");
  const [selectedDivision, setSelectedDivision] = useState("");

  useEffect(() => {
    if (!id) return;

    const fetchData = async () => {
      setLoading(true);
      setErrMsg(null);

      try {
        console.log("🔍 Fetching event details for ID:", id);

        // Ambil event detail
        const eventRes = await fetch(`/api/events/${id}`, {
          cache: "no-store",
        });
        if (!eventRes.ok)
          throw new Error(`Failed to fetch event (${eventRes.status})`);
        const eventJson = await eventRes.json();
        const eventData = eventJson.event;
        if (!eventData) throw new Error("Event data is empty");

        const normalizedEvent = {
          id: eventData.id,
          name: eventData.eventName ?? "Untitled",
          levelName: eventData.levelName ?? "-",
          startDate: eventData.startDateEvent
            ? new Date(eventData.startDateEvent).toLocaleDateString()
            : "-",
          endDate: eventData.endDateEvent
            ? new Date(eventData.endDateEvent).toLocaleDateString()
            : "-",
          city: eventData.addressCity ?? "",
          province: eventData.addressProvince ?? "",
          image: eventData.eventBanner || DEFAULT_IMG,
          chiefJudge: eventData.chiefJudge ?? "-",
          raceDirector: eventData.raceDirector ?? "-",
          safetyDirector: eventData.safetyDirector ?? "-",
          eventDirector: eventData.eventDirector ?? "-",
        };
        setEvent(normalizedEvent);

        setRaceCategories(
          (eventData.categoriesRace || []).map((cat) => ({
            value: String(cat.value ?? cat._id),
            name: cat.name,
          }))
        );
        setInitialCategories(
          (eventData.categoriesInitial || []).map((cat) => ({
            value: String(cat.value ?? cat._id),
            name: cat.name,
          }))
        );
        setDivisionCategories(
          (eventData.categoriesDivision || []).map((cat) => ({
            value: String(cat.value ?? cat._id),
            name: cat.name,
          }))
        );

        // Ambil tim peserta + event metadata
        const teamsRes = await fetch(`/api/events/${id}/teams`, {
          cache: "no-store",
        });
        if (!teamsRes.ok)
          throw new Error(`Failed to fetch teams (${teamsRes.status})`);
        const teamsJson = await teamsRes.json();

        setParticipants(teamsJson.teams || []);
        setEventCategories(
          (teamsJson.eventMetadata || []).map((meta) => ({
            value: String(meta.eventCatId ?? meta._id),
            name: (meta.eventName ?? "").trim(),
          }))
        );
      } catch (err) {
        console.error(err);
        setErrMsg(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const raceCatMap = useMemo(
    () =>
      Object.fromEntries(
        (raceCategories || []).map((c) => [String(c.value), c.name])
      ),
    [raceCategories]
  );
  const initialCatMap = useMemo(
    () =>
      Object.fromEntries(
        (initialCategories || []).map((c) => [String(c.value), c.name])
      ),
    [initialCategories]
  );
  const divisionCatMap = useMemo(
    () =>
      Object.fromEntries(
        (divisionCategories || []).map((c) => [String(c.value), c.name])
      ),
    [divisionCategories]
  );

  const eventCatMap = useMemo(() => {
    return Object.fromEntries(
      (eventCategories || []).map((c) => [String(c.value), c.name])
    );
  }, [eventCategories]);

  const eventCatNameOptions = useMemo(() => {
    const names = (eventCategories || []).map((c) => (c.name || "").trim());
    return Array.from(new Set(names));
  }, [eventCategories]);

  const filteredTeams = useMemo(() => {
    return participants.filter((team) => {
      let ok = true;
      const teamEventName = (eventCatMap[String(team.eventCatId)] || "").trim();

      if (selectedEventCat && teamEventName !== selectedEventCat) ok = false;
      if (selectedRace && String(team.raceId) !== String(selectedRace))
        ok = false;
      if (selectedInitial && String(team.initialId) !== String(selectedInitial))
        ok = false;
      if (
        selectedDivision &&
        String(team.divisionId) !== String(selectedDivision)
      )
        ok = false;

      return ok;
    });
  }, [
    participants,
    selectedEventCat,
    selectedRace,
    selectedInitial,
    selectedDivision,
    eventCatMap,
  ]);

  const activeFilterCount = [
    selectedEventCat,
    selectedRace,
    selectedInitial,
    selectedDivision,
  ].filter(Boolean).length;

  const resetFilters = () => {
    setSelectedEventCat("");
    setSelectedRace("");
    setSelectedInitial("");
    setSelectedDivision("");
  };

  const levelClassification = (event?.levelName || "").split("-").pop().trim();
  const levelBadgeClass = LEVEL_COLORS[levelClassification] || DEFAULT_LEVEL_COLOR;

  const selectClass =
    "w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-700 font-medium " +
    "focus:outline-none focus:ring-2 focus:ring-sts/30 focus:border-sts transition-colors";

  return (
    <section className="min-h-screen bg-gray-50 py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Link
            href="/matches"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-sts hover:text-stsHighlight transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path fillRule="evenodd" d="M17 10a.75.75 0 0 1-.75.75H5.612l4.158 3.96a.75.75 0 1 1-1.04 1.08l-5.5-5.25a.75.75 0 0 1 0-1.08l5.5-5.25a.75.75 0 1 1 1.04 1.08L5.612 9.25H16.25A.75.75 0 0 1 17 10Z" clipRule="evenodd" />
            </svg>
            Kembali ke Events
          </Link>
        </div>

        {/* Loading / Error */}
        {loading && (
          <div className="bg-white shadow-sm ring-1 ring-gray-200/70 rounded-2xl p-10 text-center">
            <Spinner loading={true} />
            <p className="mt-2 text-sm text-gray-500">Memuat detail event…</p>
          </div>
        )}
        {errMsg && (
          <div className="bg-red-50 border border-red-200 text-red-700 shadow-sm rounded-2xl p-4">
            {errMsg}
          </div>
        )}

        {/* Event Info — hero banner */}
        {!loading && !errMsg && event && (
          <div className="relative overflow-hidden rounded-2xl bg-white shadow-md ring-1 ring-gray-200/70">
            <div className="relative h-52 sm:h-64 w-full bg-gray-100">
              <img
                src={event.image}
                alt={event.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />

              <span
                className={`absolute top-4 left-4 px-3 py-1 rounded-full text-xs font-semibold shadow-md backdrop-blur-sm ${levelBadgeClass}`}
              >
                {event.levelName}
              </span>

              <h1 className="absolute bottom-4 left-4 right-4 text-xl sm:text-3xl font-bold text-white drop-shadow-sm">
                {event.name}
              </h1>
            </div>

            <div className="flex flex-wrap gap-x-8 gap-y-3 px-5 sm:px-6 py-5">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <svg width="18" height="18" viewBox="0 0 24 24" className="text-sts flex-shrink-0">
                  <path fill="currentColor" d="M12 2C8.14 2 5 5.14 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.86-3.14-7-7-7m0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5Z" />
                </svg>
                <span>
                  {event.city}
                  {event.city && event.province ? ", " : ""}
                  {event.province || "-"}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <svg width="18" height="18" viewBox="0 0 24 24" className="text-sts flex-shrink-0">
                  <path fill="currentColor" d="M7 2v2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2V2h-2v2H9V2H7Zm-2 8h14v10H5V10Z" />
                </svg>
                <span>{event.startDate} — {event.endDate}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <svg width="18" height="18" viewBox="0 0 24 24" className="text-sts flex-shrink-0">
                  <path fill="currentColor" d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3Zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3Zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5Zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5Z" />
                </svg>
                <span>{filteredTeams.length} dari {participants.length} peserta terdaftar</span>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        {!loading && !errMsg && (
          <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm ring-1 ring-gray-200/70">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <svg width="18" height="18" viewBox="0 0 24 24" className="text-sts">
                  <path fill="currentColor" d="M4 4h16v2.17a2 2 0 0 1-.59 1.42L14 13v7l-4-2v-5L4.59 7.59A2 2 0 0 1 4 6.17V4Z" />
                </svg>
                Filter Peserta
                {activeFilterCount > 0 && (
                  <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-sts text-white text-[11px] font-bold">
                    {activeFilterCount}
                  </span>
                )}
              </h3>
              {activeFilterCount > 0 && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="text-xs font-medium text-gray-500 hover:text-red-500 transition-colors"
                >
                  Reset Filter
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-[11px] uppercase tracking-wider text-gray-400 font-semibold mb-1.5">
                  Kategori Event
                </label>
                <select
                  value={selectedEventCat}
                  onChange={(e) => setSelectedEventCat(e.target.value)}
                  className={selectClass}
                >
                  <option value="">Semua Kategori Event</option>
                  {eventCatNameOptions.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-wider text-gray-400 font-semibold mb-1.5">
                  Race Category
                </label>
                <select
                  value={selectedRace}
                  onChange={(e) => setSelectedRace(e.target.value)}
                  className={selectClass}
                >
                  <option value="">Semua Race Category</option>
                  {raceCategories.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-wider text-gray-400 font-semibold mb-1.5">
                  Initial Category
                </label>
                <select
                  value={selectedInitial}
                  onChange={(e) => setSelectedInitial(e.target.value)}
                  className={selectClass}
                >
                  <option value="">Semua Initial Category</option>
                  {initialCategories.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-wider text-gray-400 font-semibold mb-1.5">
                  Division Category
                </label>
                <select
                  value={selectedDivision}
                  onChange={(e) => setSelectedDivision(e.target.value)}
                  className={selectClass}
                >
                  <option value="">Semua Division Category</option>
                  {divisionCategories.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Participants Table */}
        {!loading && !errMsg && (
          <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-200/70 overflow-hidden">
            <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-gray-100">
              <h3 className="text-base font-semibold text-gray-900">Daftar Peserta</h3>
              <span className="text-xs text-gray-400">
                Menampilkan {filteredTeams.length} dari {participants.length} tim
              </span>
            </div>

            {filteredTeams.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center py-16 px-4">
                <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                  <svg width="22" height="22" viewBox="0 0 24 24" className="text-gray-400">
                    <path fill="currentColor" d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3Zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3Zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5Zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5Z" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-gray-600">Tidak ada peserta yang cocok</p>
                <p className="text-xs text-gray-400 mt-1">Coba ubah atau reset filter di atas.</p>
                {activeFilterCount > 0 && (
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="mt-4 px-4 py-2 rounded-lg bg-sts text-white text-sm font-medium hover:bg-stsHighlight transition-colors"
                  >
                    Reset Filter
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="bg-gradient-to-r from-sts to-stsDark">
                      <th className="px-5 py-3 text-left font-semibold text-white/90 text-xs uppercase tracking-wider">No</th>
                      <th className="px-5 py-3 text-left font-semibold text-white/90 text-xs uppercase tracking-wider">Tim</th>
                      <th className="px-5 py-3 text-left font-semibold text-white/90 text-xs uppercase tracking-wider">BIB</th>
                      <th className="px-5 py-3 text-left font-semibold text-white/90 text-xs uppercase tracking-wider">Event</th>
                      <th className="px-5 py-3 text-left font-semibold text-white/90 text-xs uppercase tracking-wider">Race</th>
                      <th className="px-5 py-3 text-left font-semibold text-white/90 text-xs uppercase tracking-wider">Initial</th>
                      <th className="px-5 py-3 text-left font-semibold text-white/90 text-xs uppercase tracking-wider">Division</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredTeams.map((team, idx) => (
                      <tr
                        key={team._id || `${team.nameTeam}-${idx}`}
                        className="hover:bg-sts/5 transition-colors"
                      >
                        <td className="px-5 py-3.5 text-gray-500 font-medium">{idx + 1}</td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <span
                              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0"
                              style={{ background: avatarColor(team.nameTeam) }}
                            >
                              {initials(team.nameTeam)}
                            </span>
                            <span className="font-semibold text-gray-800">{team.nameTeam}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="inline-flex px-2 py-0.5 rounded-md bg-gray-100 text-gray-600 font-mono text-xs">
                            {team.bibTeam}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="inline-flex px-2.5 py-0.5 rounded-full bg-sts/10 text-stsDark text-xs font-medium">
                            {eventCatMap[String(team.eventCatId)] ?? "-"}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="inline-flex px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-600 text-xs font-medium">
                            {raceCatMap[String(team.raceId)] ?? "-"}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="inline-flex px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-600 text-xs font-medium">
                            {initialCatMap[String(team.initialId)] ?? "-"}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="inline-flex px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-600 text-xs font-medium">
                            {divisionCatMap[String(team.divisionId)] ?? "-"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
