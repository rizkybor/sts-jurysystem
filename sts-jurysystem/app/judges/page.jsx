"use client";

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { firstEventFileUrl } from "@/utils/eventMedia";

// Nama kategori di eventsCollection.categoriesEvent -> key
// judgeButtonsConfig, sama pola dgn EVENT_CATEGORY_NAME_TO_CODE di
// LiveEventDetail.jsx.
const EVENT_CATEGORY_NAME_TO_KEY = {
  SPRINT: "sprint",
  HEAD2HEAD: "h2h",
  SLALOM: "slalom",
  DRR: "drr",
  RX: "rx",
};

// === Konfigurasi tombol navigasi juri ===
const JUDGE_BUTTONS = [
  {
    key: "sprint",
    href: "/judges/sprint",
    label: "Sprint",
    checkActive: (a) => a?.sprint && (a.sprint.start || a.sprint.finish),
  },
  {
    key: "h2h",
    href: "/judges/headtohead",
    label: "Head to Head",
    checkActive: (a) => a?.h2h && Object.values(a.h2h).some((v) => v === true),
  },
  {
    key: "slalom",
    href: "/judges/slalom",
    label: "Slalom",
    checkActive: (a) =>
      a?.slalom &&
      Object.values(a.slalom).some(
        (v) => v === true || (Array.isArray(v) && v.length > 0)
      ),
  },
  {
    key: "drr",
    href: "/judges/downriverrace",
    label: "Down River Race",
    checkActive: (a) =>
      a?.drr &&
      Object.values(a.drr).some(
        (v) => v === true || (Array.isArray(v) && v.length > 0)
      ),
  },
  {
    key: "rx",
    href: "/judges/raftingcross",
    label: "Rafting Cross",
    checkActive: (a) =>
      a?.rx && Array.isArray(a.rx.gates) && a.rx.gates.length > 0,
  },
];

// === Helper: Hitung total tugas aktif ===
const countActiveTasks = (assignments) => {
  if (!Array.isArray(assignments)) return 0;
  let count = 0;
  assignments.forEach((item) => {
    (item.judges || []).forEach((judge) => {
      if (judge.h2h) Object.values(judge.h2h).forEach((v) => v && count++);
      if (judge.sprint) Object.values(judge.sprint).forEach((v) => v && count++);
      if (judge.slalom) Object.values(judge.slalom).forEach((v) => v && count++);
      if (judge.drr) Object.values(judge.drr).forEach((v) => v && count++);
      if (judge.rx)
        Object.values(judge.rx).forEach(
          (v) => (v === true || (Array.isArray(v) && v.length > 0)) && count++
        );
    });
  });
  return count;
};

// Kategori yang BENAR-BENAR dipertandingkan di event ini — kalau event
// tidak punya Rafting Cross sama sekali, tombolnya jangan ditampilkan
// sama sekali (beda dari "tidak aktif utk juri ini", yang tetap tampil
// sbg chip abu-abu). undefined/kosong `categoriesEvent` = fallback
// tampilkan semua (data lama yang belum punya field ini).
const getEventCategoryKeys = (event) => {
  if (!Array.isArray(event?.categoriesEvent) || !event.categoriesEvent.length) {
    return null; // null = tidak difilter
  }
  return new Set(
    event.categoriesEvent
      .map((c) => EVENT_CATEGORY_NAME_TO_KEY[String(c?.name || "").toUpperCase()])
      .filter(Boolean)
  );
};

// === Helper: parse tanggal aman ===
const toDate = (v) => {
  if (!v) return null;
  if (typeof v === "number") return new Date(v);
  if (v instanceof Date) return v;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
};

const formatDateRange = (start, end) => {
  const s = toDate(start);
  const e = toDate(end);
  if (!s) return "";
  const full = { day: "2-digit", month: "short", year: "numeric" };
  if (!e || s.toDateString() === e.toDateString()) {
    return s.toLocaleDateString("id-ID", full);
  }
  return `${s.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
  })} – ${e.toLocaleDateString("id-ID", full)}`;
};

const eventLocation = (event) =>
  [event?.riverName, event?.addressCity].filter(Boolean).join(", ");

/* === UI Utility Components === */
const Icon = {
  calendar: (
    <path
      fillRule="evenodd"
      d="M5.75 2a.75.75 0 0 1 .75.75V4h7V2.75a.75.75 0 0 1 1.5 0V4h.25A2.75 2.75 0 0 1 18 6.75v8.5A2.75 2.75 0 0 1 15.25 18H4.75A2.75 2.75 0 0 1 2 15.25v-8.5A2.75 2.75 0 0 1 4.75 4H5V2.75A.75.75 0 0 1 5.75 2Zm-1 5.5c-.69 0-1.25.56-1.25 1.25v6.5c0 .69.56 1.25 1.25 1.25h10.5c.69 0 1.25-.56 1.25-1.25v-6.5c0-.69-.56-1.25-1.25-1.25H4.75Z"
      clipRule="evenodd"
    />
  ),
  pin: (
    <path
      fillRule="evenodd"
      d="m9.69 18.933.003.001C9.89 19.02 10 19 10 19s.11.02.308-.066l.002-.001.006-.003.018-.008a5.741 5.741 0 0 0 .281-.14c.186-.096.446-.24.757-.433.62-.384 1.445-.966 2.274-1.765C15.302 14.988 17 12.493 17 9A7 7 0 1 0 3 9c0 3.492 1.698 5.988 3.355 7.584a13.731 13.731 0 0 0 2.273 1.765 11.842 11.842 0 0 0 .976.544l.062.029.018.008.006.003ZM10 11.25a2.25 2.25 0 1 0 0-4.5 2.25 2.25 0 0 0 0 4.5Z"
      clipRule="evenodd"
    />
  ),
  clock: (
    <path
      fillRule="evenodd"
      d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm.75-13a.75.75 0 0 0-1.5 0v5c0 .27.144.518.378.651l3.5 2a.75.75 0 0 0 .744-1.302L10.75 9.567V5Z"
      clipRule="evenodd"
    />
  ),
  arrow: (
    <path
      fillRule="evenodd"
      d="M3 10a.75.75 0 0 1 .75-.75h10.638L10.23 5.29a.75.75 0 1 1 1.04-1.08l5.5 5.25a.75.75 0 0 1 0 1.08l-5.5 5.25a.75.75 0 1 1-1.04-1.08l4.158-3.96H3.75A.75.75 0 0 1 3 10Z"
      clipRule="evenodd"
    />
  ),
};

const Svg = ({ name, className = "w-4 h-4" }) => (
  <svg viewBox="0 0 20 20" fill="currentColor" className={className} aria-hidden="true">
    {Icon[name]}
  </svg>
);

const StatTile = ({ value, label, accent }) => (
  <div className="flex-1 min-w-0 rounded-xl bg-white/10 ring-1 ring-white/15 px-3 py-2.5">
    <div className={`text-xl sm:text-2xl font-bold tabular-nums ${accent || "text-white"}`}>
      {value}
    </div>
    <div className="text-[11px] sm:text-xs text-white/70 font-medium uppercase tracking-wide truncate">
      {label}
    </div>
  </div>
);

const EmptyNote = ({ tone = "amber", children }) => {
  const tones = {
    amber: "border-amber-200 bg-amber-50 text-amber-800",
    gray: "border-gray-200 bg-gray-50 text-gray-600",
  };
  return (
    <div className={`w-full rounded-xl border px-3.5 py-3 text-sm ${tones[tone]}`}>
      {children}
    </div>
  );
};

const SkeletonCard = () => (
  <div className="bg-white rounded-2xl border border-gray-200 p-5 animate-pulse">
    <div className="flex gap-3">
      <div className="w-14 h-14 rounded-xl bg-gray-100" />
      <div className="flex-1 space-y-2 py-1">
        <div className="h-4 bg-gray-100 rounded w-3/4" />
        <div className="h-3 bg-gray-100 rounded w-1/2" />
      </div>
    </div>
    <div className="mt-5 space-y-2">
      <div className="h-11 bg-gray-100 rounded-xl" />
      <div className="h-11 bg-gray-100 rounded-xl" />
    </div>
  </div>
);

const FILTERS = [
  { key: "all", label: "Semua" },
  { key: "active", label: "Aktif" },
  { key: "inactive", label: "Nonaktif" },
];

const JudgesPage = () => {
  const [user, setUser] = useState(null);
  const [events, setEvents] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("all");

  // === Fetch data ===
  useEffect(() => {
    const fetchData = async () => {
      try {
        setError(null);
        const judgesRes = await fetch("/api/judges", { cache: "no-store" });
        if (!judgesRes.ok)
          throw new Error(`Gagal memuat data judges: ${judgesRes.status}`);
        const judgesData = await judgesRes.json();
        setUser(judgesData.user);
        setEvents(judgesData.events || []);

        const userEmail = judgesData.user?.email;
        if (!userEmail) throw new Error("Email tidak ditemukan");

        const assignmentsRes = await fetch(
          `/api/assignments?email=${encodeURIComponent(userEmail)}`,
          { cache: "no-store" }
        );
        if (!assignmentsRes.ok)
          throw new Error(`Gagal memuat assignments: ${assignmentsRes.status}`);
        const assignmentsData = await assignmentsRes.json();
        setAssignments(assignmentsData.data || []);
      } catch (e) {
        console.error(e);
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // === Helper: ambil assignment user per event ===
  const getJudgeAssignment = (eventId) => {
    if (!assignments?.length) return null;
    for (const assign of assignments) {
      if (assign.judges?.length) {
        const judgeAssignment = assign.judges.find((j) => j.eventId === eventId);
        if (judgeAssignment) return judgeAssignment;
      }
    }
    return null;
  };

  // === Urutkan event berdasarkan tanggal terdekat dari hari ini ===
  const sortedEvents = useMemo(() => {
    const arr = Array.isArray(events) ? [...events] : [];
    const now = Date.now();

    return arr.sort((a, b) => {
      const da = toDate(a?.startDateEvent);
      const db = toDate(b?.startDateEvent);

      // kalau dua-duanya valid, bandingkan jarak absolut ke waktu sekarang
      if (da && db) {
        return Math.abs(da.getTime() - now) - Math.abs(db.getTime() - now);
      }

      // kalau salah satu tidak valid
      if (!da && db) return 1;
      if (da && !db) return -1;
      return (a?.eventName || "").localeCompare(b?.eventName || "");
    });
  }, [events]);

  const activeEventCount = sortedEvents.filter(
    (e) => e.statusEvent === "Activated"
  ).length;

  const filteredEvents = sortedEvents.filter((e) => {
    if (filter === "active") return e.statusEvent === "Activated";
    if (filter === "inactive") return e.statusEvent !== "Activated";
    return true;
  });

  if (error && !user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 px-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center mb-4">
          <svg viewBox="0 0 24 24" className="w-8 h-8" fill="currentColor" aria-hidden="true">
            <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm1 15h-2v-2h2Zm0-4h-2V7h2Z" />
          </svg>
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">
          Terjadi Kesalahan
        </h2>
        <p className="text-sm text-gray-600 mb-6 max-w-sm">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-5 py-2.5 rounded-xl bg-sts text-white text-sm font-semibold shadow-sm hover:bg-stsDark transition"
        >
          Coba Lagi
        </button>
      </div>
    );
  }

  const totalTasks = countActiveTasks(assignments);
  const initial = user?.username?.charAt(0)?.toUpperCase() || "U";

  return (
    <div className="min-h-screen bg-slate-50">
      {/* === Header / Profil === */}
      <header className="bg-gradient-to-br from-sts to-stsDarkHiglight text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16 sm:pb-20">
          <div className="flex items-center gap-4">
            {loading ? (
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white/15 animate-pulse shrink-0" />
            ) : user?.image ? (
              <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden ring-2 ring-white/30 shrink-0">
                <Image
                  src={user.image}
                  alt={user.username || "User avatar"}
                  width={80}
                  height={80}
                  className="w-full h-full object-cover"
                  unoptimized
                  referrerPolicy="no-referrer"
                />
              </div>
            ) : (
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white/15 ring-2 ring-white/30 flex items-center justify-center text-2xl sm:text-3xl font-bold shrink-0">
                {initial}
              </div>
            )}

            <div className="min-w-0 flex-1">
              <p className="text-xs sm:text-sm text-white/70 font-medium uppercase tracking-wider">
                Judge Task
              </p>
              <h1 className="text-xl sm:text-3xl font-bold font-title leading-tight truncate text-white">
                {loading ? "Memuat…" : `Halo, ${user?.username || "Juri"}`}
              </h1>
              <p className="text-sm text-white/70 truncate">{user?.email || " "}</p>
            </div>

            <Link
              href="/profile"
              className="inline-flex shrink-0 items-center gap-1.5 h-10 px-3 sm:px-4 rounded-xl bg-white text-stsDark text-sm font-semibold shadow-sm hover:bg-slate-100 transition"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 shrink-0" aria-hidden="true">
                <path d="M10 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM3.465 14.493a1.23 1.23 0 0 0 .41 1.412A9.957 9.957 0 0 0 10 18c2.31 0 4.438-.784 6.131-2.1.43-.333.604-.903.408-1.41a7.002 7.002 0 0 0-13.074.003Z" />
              </svg>
              <span className="whitespace-nowrap">Go to Profile</span>
            </Link>
          </div>

          <div className="mt-6 flex gap-2 sm:gap-3 max-w-xl">
            <StatTile value={loading ? "–" : events?.length || 0} label="Event" />
            <StatTile
              value={loading ? "–" : activeEventCount}
              label="Event Aktif"
              accent="text-emerald-300"
            />
            <StatTile value={loading ? "–" : totalTasks ?? 0} label="Tugas" />
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 -mt-10 sm:-mt-12 pb-12">
        {/* === Toolbar: judul + filter === */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-gray-900">Event Saya</h2>
            <p className="text-xs text-gray-500">
              Diurutkan dari tanggal terdekat dengan hari ini
            </p>
          </div>
          <div
            role="tablist"
            className="inline-flex p-1 rounded-xl bg-gray-100 self-start sm:self-auto"
          >
            {FILTERS.map((f) => (
              <button
                key={f.key}
                role="tab"
                aria-selected={filter === f.key}
                onClick={() => setFilter(f.key)}
                className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition ${
                  filter === f.key
                    ? "bg-white text-stsDark shadow-sm"
                    : "text-gray-500 hover:text-gray-800"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* === Daftar Event === */}
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {loading &&
            Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}

          {!loading && filteredEvents.length === 0 && (
            <div className="sm:col-span-2 lg:col-span-3 bg-white rounded-2xl border border-dashed border-gray-300 px-6 py-12 text-center">
              <div className="mx-auto w-12 h-12 rounded-xl bg-sts/10 text-sts flex items-center justify-center">
                <Svg name="calendar" className="w-6 h-6" />
              </div>
              <h3 className="mt-3 font-semibold text-gray-900">
                {sortedEvents.length ? "Tidak ada event di filter ini" : "Belum ada event"}
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {sortedEvents.length
                  ? "Coba pilih filter lain."
                  : "Anda belum terdaftar sebagai juri di event mana pun."}
              </p>
            </div>
          )}

          {!loading &&
            filteredEvents.map((event, index) => {
              const assignment = getJudgeAssignment(event._id);
              // BUG FIX: "eventLogo" TIDAK PERNAH ditulis oleh
              // sts-timingsystem — logo event yang sebenarnya ada di
              // elemen pertama `eventFiles[]` (lihat utils/eventMedia.js,
              // pola sama dgn LiveEventDetail.jsx).
              const logo =
                firstEventFileUrl(event.eventFiles) || "/images/logo-dummy.png";
              // Cuma tampilkan tombol kategori yang BENAR-BENAR
              // dipertandingkan di event ini (mis. event tanpa Rafting
              // Cross tidak menampilkan tombol RX sama sekali).
              const eventCategoryKeys = getEventCategoryKeys(event);
              const visibleButtons = eventCategoryKeys
                ? JUDGE_BUTTONS.filter((btn) => eventCategoryKeys.has(btn.key))
                : JUDGE_BUTTONS;
              const anyActive = visibleButtons.some((btn) =>
                btn.checkActive(assignment)
              );
              // Event yang sudah di-nonaktifkan panitia (statusEvent !==
              // "Activated") — card & tombol aksinya (navigasi kategori)
              // ikut dinonaktifkan, bukan cuma label status yang berubah.
              const isEventActive = event.statusEvent === "Activated";
              const dateLabel = formatDateRange(
                event.startDateEvent,
                event.endDateEvent
              );
              const locationLabel = eventLocation(event);

              return (
                <motion.article
                  key={event._id}
                  initial={{ y: 12, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: Math.min(index, 8) * 0.04 }}
                  className={`bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col overflow-hidden ${
                    isEventActive ? "hover:shadow-md transition-shadow" : ""
                  }`}
                >
                  <div className={`h-1 ${isEventActive ? "bg-sts" : "bg-gray-300"}`} />

                  <div
                    className={`p-4 sm:p-5 flex flex-col flex-1 ${
                      isEventActive ? "" : "opacity-60 saturate-0 select-none"
                    }`}
                  >
                    {/* Identitas event */}
                    <div className="flex gap-3">
                      <div className="w-14 h-14 shrink-0 rounded-xl bg-gray-50 ring-1 ring-gray-100 overflow-hidden flex items-center justify-center">
                        <img
                          src={logo}
                          alt={`${event.eventName || "Event"} logo`}
                          className="w-11 h-11 object-contain"
                          onError={(e) => {
                            if (!e.currentTarget.src.endsWith("/images/logo-dummy.png")) {
                              e.currentTarget.src = "/images/logo-dummy.png";
                            }
                          }}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-semibold text-gray-900 leading-snug line-clamp-2">
                            {event.eventName}
                          </h3>
                          <span
                            className={`shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ring-1 ${
                              isEventActive
                                ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                                : "bg-gray-100 text-gray-500 ring-gray-200"
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                isEventActive ? "bg-emerald-500" : "bg-gray-400"
                              }`}
                            />
                            {isEventActive ? "Aktif" : "Nonaktif"}
                          </span>
                        </div>
                        {event.levelName && (
                          <p className="mt-0.5 text-xs font-medium text-stsDark">
                            {event.levelName}
                          </p>
                        )}
                      </div>
                    </div>

                    {(dateLabel || locationLabel) && (
                      <div className="mt-3 space-y-1 text-xs text-gray-500">
                        {dateLabel && (
                          <p className="flex items-center gap-1.5">
                            <Svg name="calendar" className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                            {dateLabel}
                          </p>
                        )}
                        {locationLabel && (
                          <p className="flex items-center gap-1.5 truncate">
                            <Svg name="pin" className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                            <span className="truncate">{locationLabel}</span>
                          </p>
                        )}
                      </div>
                    )}

                    {/* Tugas juri */}
                    <div className="mt-4 pt-4 border-t border-gray-100 flex-1">
                      <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
                        Tugas Anda
                      </p>

                      {!isEventActive ? (
                        <EmptyNote tone="gray">
                          Event ini sedang tidak aktif — aksi juri dinonaktifkan
                          sementara.
                        </EmptyNote>
                      ) : assignment && anyActive ? (
                        <div className="space-y-2">
                          {visibleButtons.map((btn) => {
                            const isActive = btn.checkActive(assignment);
                            if (!isActive) {
                              return (
                                <div
                                  key={btn.key}
                                  className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-gray-50 text-sm text-gray-400"
                                >
                                  <span>{btn.label}</span>
                                  <span className="text-[11px]">Tidak ditugaskan</span>
                                </div>
                              );
                            }
                            const query = new URLSearchParams({
                              eventId: event._id,
                              userId: user?._id,
                              assignmentId: assignment._id,
                            }).toString();
                            return (
                              <Link
                                key={btn.key}
                                href={`${btn.href}?${query}`}
                                className="group flex items-center justify-between px-3.5 py-3 rounded-xl bg-gradient-to-r from-sts to-stsDark text-white text-sm font-semibold shadow-sm hover:shadow-md active:scale-[0.99] transition"
                              >
                                <span>{btn.label}</span>
                                <Svg
                                  name="arrow"
                                  className="w-4 h-4 opacity-80 group-hover:translate-x-0.5 transition-transform"
                                />
                              </Link>
                            );
                          })}
                        </div>
                      ) : (
                        <EmptyNote>
                          Anda belum memiliki tugas di event ini.
                        </EmptyNote>
                      )}
                    </div>
                  </div>

                  {/* Riwayat Aktivitas Saya — semua penalty/fouls yang
                      SUDAH pernah dikirim juri ini di event ini, lintas
                      kategori, dalam satu halaman. Tampil selama juri
                      punya assignment apa pun di event ini (tidak
                      tergantung anyActive — riwayat lama tetap relevan
                      dilihat walau tugas aktif sekarang kosong). */}
                  {assignment && isEventActive && (
                    <a
                      href={`/judges/history?eventId=${event._id}${
                        user?._id ? `&userId=${user._id}` : ""
                      }`}
                      className="flex items-center justify-center gap-1.5 px-4 py-3 border-t border-gray-100 bg-gray-50/60 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-stsDark transition"
                    >
                      <Svg name="clock" className="w-4 h-4 text-gray-400" />
                      Riwayat Aktivitas Saya
                    </a>
                  )}
                </motion.article>
              );
            })}
        </div>

      </main>
    </div>
  );
};

export default JudgesPage;
