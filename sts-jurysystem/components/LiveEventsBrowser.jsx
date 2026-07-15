"use client";
import Link from "next/link";
import { useEffect, useMemo, useState, useRef } from "react";
import FilterSidebar from "@/components/FilterSidebar";
import LoadingSpinner from "@/components/LoadingSpinner";
import { CardSkeletonGrid } from "@/components/CardSkeleton";

const PAGE_SIZE = 9;
const DEFAULT_IMG = "/images/logo-dummy.png"; // pastikan ada di /public/images

const LEVELS = [
  "Classification - A",
  "Classification - B",
  "Classification - C",
  "Classification - D",
  "Classification - E",
  "Classification - F",
  "Classification - G",
  "Classification - H",
  "Classification - I",
];

function fmtDate(s) {
  if (!s) return null;
  const d = new Date(s);
  if (isNaN(d)) return s;
  return d.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// Ambil "sekarang" dalam zona waktu Asia/Jakarta
function nowJakarta() {
  // buat now di WIB
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = Object.fromEntries(
    fmt.formatToParts(new Date()).map((p) => [p.type, p.value])
  );
  // YYYY-MM-DDTHH:mm:ss+07:00
  return new Date(
    `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}+07:00`
  );
}

// Parse string tanggal ke Date WIB.
// - Jika string hanya "YYYY-MM-DD": start → 00:00:00+07, end → 23:59:59+07
function parseWIB(s, { endOfDay = false } = {}) {
  if (!s) return null;
  // jika format date-only
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    return new Date(`${s}T${endOfDay ? "23:59:59" : "00:00:00"}+07:00`);
  }
  // kalau ISO dengan waktu, biarkan apa adanya (Date akan handle offset jika ada)
  const d = new Date(s);
  if (!isNaN(d)) return d;
  // fallback: treat as date-only tak dikenal
  return null;
}

function isLiveEvent(evt) {
  const now = nowJakarta();
  const start = parseWIB(
    evt.startDate || evt.startDateEvent || evt.start_date,
    { endOfDay: false }
  );
  const end = parseWIB(evt.endDate || evt.endDateEvent || evt.end_date, {
    endOfDay: true,
  });
  if (!start && !end) return true; // kalau tidak ada tanggal, anggap aktif
  if (start && end) return now >= start && now <= end;
  if (start && !end) return now >= start;
  if (!start && end) return now <= end;
  return false;
}

export default function LiveEventsBrowser() {
  const [page, setPage] = useState(1);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(null);
  const lastBatchCountRef = useRef(0);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState("All");
  const [liveOnly, setLiveOnly] = useState(false);

  useEffect(() => {
    let aborted = false;

    const fetchMatches = async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/matches?page=${page}&pageSize=${PAGE_SIZE}&sort=nearest`,
          {
            cache: "no-store",
          }
        );
        if (!res.ok) throw new Error("Failed to fetch matches");
        const data = await res.json();

        const normalized = (data.events || []).map((it) => ({
          id: String(it.id ?? it._id),
          name: it.eventName ?? "Untitled",
          image: it.poster_url || it.posterUrl || it.imageUrl || DEFAULT_IMG,
          levelName: it.levelName ?? null,
          city: it.addressCity ?? null,
          province: it.addressProvince ?? null,
          startDate: it.startDateEvent ?? null,
          endDate: it.endDateEvent ?? null,
          participantCount: Array.isArray(it.participant)
            ? it.participant.length
            : undefined,
        }));

        if (!aborted) {
          lastBatchCountRef.current = normalized.length;
          setTotal(typeof data.total === "number" ? data.total : null);
          setEvents((prev) =>
            page === 1 ? normalized : [...prev, ...normalized]
          );
        }
      } catch (e) {
        if (!aborted) console.error(e);
      } finally {
        if (!aborted) setLoading(false);
      }
    };

    fetchMatches();
    return () => {
      aborted = true;
    };
  }, [page]);

  const hasMore =
    total != null
      ? events.length < total
      : lastBatchCountRef.current === PAGE_SIZE;

  const liveCount = events.filter(isLiveEvent).length;

  const filteredEvents = useMemo(() => {
    const q = search.trim().toLowerCase();
    return events.filter((event) => {
      if (q && !event.name.toLowerCase().includes(q)) return false;
      if (levelFilter !== "All" && event.levelName !== levelFilter) return false;
      if (liveOnly && !isLiveEvent(event)) return false;
      return true;
    });
  }, [events, search, levelFilter, liveOnly]);

  // Event yang masih Live diprioritaskan tampil di paling atas — sisanya
  // tetap mengikuti urutan "paling dekat dengan hari ini" dari server
  // (Array.prototype.sort stabil, jadi urutan relatif dalam grup tidak berubah).
  const sortedEvents = useMemo(() => {
    return [...filteredEvents].sort((a, b) => {
      const aLive = isLiveEvent(a) ? 0 : 1;
      const bLive = isLiveEvent(b) ? 0 : 1;
      return aLive - bLive;
    });
  }, [filteredEvents]);

  const hasActiveFilter = Boolean(search.trim()) || levelFilter !== "All" || liveOnly;
  const resetFilters = () => {
    setSearch("");
    setLevelFilter("All");
    setLiveOnly(false);
  };

  const initialLoading = loading && events.length === 0;

  return (
    <section className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-sts via-stsDark to-stsDarkHiglight py-12 sm:py-14">
        <div className="pointer-events-none absolute -top-24 -left-16 w-72 h-72 rounded-full bg-stsHighlight/25 blur-[100px]" />
        <div className="pointer-events-none absolute bottom-0 right-0 w-72 h-72 rounded-full bg-cyan-400/15 blur-[100px]" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center text-center">
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Live Results
          </h1>
          <p className="mt-1.5 text-sm text-white/80 max-w-lg">
            All Whitewater Rafting Championship events currently in progress.
          </p>
          {liveCount > 0 && (
            <span className="mt-4 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 border border-white/20 text-white text-xs font-semibold backdrop-blur-sm">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
              </span>
              {liveCount} event{liveCount > 1 ? "s" : ""} live now
            </span>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12">
        {/* Mobile filter trigger */}
        <div className="lg:hidden mb-5">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white ring-1 ring-gray-200 shadow-sm text-sm font-semibold text-gray-700 hover:bg-gray-50 transition"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 4.5h18M6 9.75h12M10.5 15h3" />
            </svg>
            Filter Events
          </button>
        </div>

        <div className="flex flex-col lg:flex-row gap-6 items-start">
          <FilterSidebar
            title="Filter Live Events"
            open={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
          >
            <div className="space-y-5">
              {/* Search */}
              <div>
                <label htmlFor="live-search" className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  Keyword
                </label>
                <div className="relative">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M11 4a7 7 0 1 1 0 14 7 7 0 0 1 0-14Z" />
                  </svg>
                  <input
                    type="text"
                    id="live-search"
                    placeholder="Event name..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-stsHighlight focus:border-transparent transition"
                  />
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  Status
                </label>
                <button
                  type="button"
                  onClick={() => setLiveOnly((v) => !v)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition ${
                    liveOnly
                      ? "bg-red-50 text-red-600 ring-1 ring-red-200"
                      : "bg-gray-50 text-gray-600 ring-1 ring-gray-200 hover:bg-gray-100"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                      {liveOnly && (
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
                      )}
                      <span className={`relative inline-flex rounded-full h-2 w-2 ${liveOnly ? "bg-red-500" : "bg-gray-400"}`} />
                    </span>
                    Live Only
                  </span>
                  <span className={`w-9 h-5 rounded-full p-0.5 transition-colors ${liveOnly ? "bg-red-500" : "bg-gray-300"}`}>
                    <span
                      className={`block w-4 h-4 rounded-full bg-white shadow transition-transform ${
                        liveOnly ? "translate-x-4" : "translate-x-0"
                      }`}
                    />
                  </span>
                </button>
              </div>

              {/* Level */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  Classification Level
                </label>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => setLevelFilter("All")}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${
                      levelFilter === "All"
                        ? "bg-sts text-white shadow-sm"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    All
                  </button>
                  {LEVELS.map((lvl) => {
                    const short = lvl.split("-").pop().trim();
                    const active = levelFilter === lvl;
                    return (
                      <button
                        key={lvl}
                        type="button"
                        onClick={() => setLevelFilter(lvl)}
                        title={lvl}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${
                          active
                            ? "bg-sts text-white shadow-sm"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        }`}
                      >
                        {short}
                      </button>
                    );
                  })}
                </div>
              </div>

              {hasActiveFilter && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-gray-500 text-sm font-medium hover:bg-gray-50 transition"
                >
                  Reset Filters
                </button>
              )}
            </div>
          </FilterSidebar>

          <main className="flex-1 min-w-0 w-full">
            {initialLoading ? (
              <CardSkeletonGrid count={6} />
            ) : sortedEvents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center text-gray-500 bg-white rounded-2xl ring-1 ring-gray-200/70">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  className="w-20 h-20 text-sts/50 mb-4"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z"
                  />
                </svg>
                <h3 className="text-xl font-semibold text-gray-700 mb-1">
                  {hasActiveFilter ? "No Matching Events" : "No Live Events"}
                </h3>
                <p className="text-gray-500 max-w-md px-4">
                  {hasActiveFilter
                    ? "Try adjusting your keyword, level, or status filter."
                    : "There are no events to show right now. Check back later once an event goes live."}
                </p>
                {hasActiveFilter && (
                  <button
                    onClick={resetFilters}
                    className="mt-6 px-6 py-3 rounded-lg bg-sts text-white hover:bg-stsHighlight transition-colors"
                  >
                    Reset Filters
                  </button>
                )}
              </div>
            ) : (
              /* GRID CARD */
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {sortedEvents.map((event) => {
                  const live = isLiveEvent(event);
                  const Card = (
                    <article
                      className={`group relative overflow-hidden rounded-2xl bg-white ring-1 ring-gray-200/70 transition-all duration-500 ease-out ${
                        live
                          ? "shadow-md hover:-translate-y-1 hover:scale-[1.02] hover:ring-[2px] hover:ring-[#4690B7]/70 hover:shadow-[0_0_40px_rgba(70,144,183,0.45)] cursor-pointer"
                          : "opacity-70 saturate-50 cursor-not-allowed"
                      }`}
                    >
                      {/* Glow overlay on hover (live only) */}
                      {live && (
                        <div
                          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition duration-500 pointer-events-none"
                          style={{
                            background:
                              "radial-gradient(circle at 50% -20%, rgba(70,144,183,0.25), rgba(24,116,165,0.1), transparent 70%)",
                          }}
                        />
                      )}

                      {/* Gambar */}
                      <div className="relative h-44 w-full bg-gray-100 overflow-hidden border-b border-gray-200">
                        <img
                          src={event.image}
                          alt={event.name}
                          className={`w-full h-full object-cover transition-transform duration-300 ${
                            live ? "group-hover:scale-105" : ""
                          }`}
                          loading="lazy"
                        />

                        {/* badge level */}
                        {event.levelName && (
                          <span className="absolute top-3 left-3 bg-white/90 text-gray-800 text-xs font-semibold px-2.5 py-1 rounded-full shadow backdrop-blur-sm">
                            {event.levelName}
                          </span>
                        )}

                        {/* badge live/offline */}
                        {live ? (
                          <span className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-600 text-white text-xs font-bold shadow-md">
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
                            </span>
                            LIVE
                          </span>
                        ) : (
                          <span className="absolute top-3 right-3 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 ring-1 ring-gray-200 shadow">
                            Not Live
                          </span>
                        )}
                      </div>

                      {/* Body */}
                      <div className="relative p-4 z-10">
                        <h2
                          className={`text-base md:text-lg font-semibold text-gray-900 line-clamp-1 transition-colors duration-200 ${
                            live ? "group-hover:text-stsHighlight" : ""
                          }`}
                        >
                          {event.name}
                        </h2>

                        {event.city && (
                          <div className="mt-1 text-sm text-gray-600 flex items-center gap-1.5">
                            <svg width="16" height="16" viewBox="0 0 24 24" className="text-sts flex-shrink-0">
                              <path
                                fill="currentColor"
                                d="M12 2C8.14 2 5 5.14 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.86-3.14-7-7-7m0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5Z"
                              />
                            </svg>
                            <span className="truncate">
                              {event.city}
                              {event.province ? `, ${event.province}` : ""}
                            </span>
                          </div>
                        )}

                        {(event.startDate || event.endDate) && (
                          <p className="mt-1 text-sm text-gray-600">
                            <span className="font-medium">Date:</span>{" "}
                            {fmtDate(event.startDate)} — {fmtDate(event.endDate)}
                          </p>
                        )}

                        <div className="mt-3 flex items-center justify-between">
                          <div className="min-h-[20px] text-sm text-gray-500">
                            {typeof event.participantCount === "number"
                              ? `👥 ${event.participantCount} peserta`
                              : ""}
                          </div>
                          {live && (
                            <span className="text-sts text-sm font-semibold group-hover:text-stsHighlight group-hover:translate-x-0.5 transition-all duration-200">
                              View Live →
                            </span>
                          )}
                        </div>
                      </div>
                    </article>
                  );

                  // Jika live → bungkus Link; jika tidak → div biasa (disabled)
                  return live ? (
                    <Link href={`/live/${event.id}`} key={event.id}>
                      {Card}
                    </Link>
                  ) : (
                    <div key={event.id} aria-disabled className="pointer-events-none">
                      {Card}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Pagination */}
            {events.length > 0 && (
              <div className="mt-10 flex justify-center">
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={loading || !hasMore}
                  className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-sts to-stsDark text-white font-semibold shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-md min-w-[160px]"
                >
                  {loading ? (
                    <>
                      <LoadingSpinner size={16} />
                      Loading...
                    </>
                  ) : hasMore ? (
                    "Load More"
                  ) : (
                    "No More Data"
                  )}
                </button>
              </div>
            )}
          </main>
        </div>
      </div>
    </section>
  );
}
