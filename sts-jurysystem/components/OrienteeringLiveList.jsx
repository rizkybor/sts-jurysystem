"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CardSkeletonGrid } from "@/components/CardSkeleton";

// Daftar event Orienteering di halaman /live (tab "Orienteering"). Data dari
// /api/orienteering/events — ditulis modul Orienteering sts-timingsystem.

function fmtDate(s) {
  if (!s) return "";
  const d = new Date(`${s}T00:00:00+07:00`);
  if (isNaN(d)) return s;
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Jakarta" });
}

function todayWIB() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());
}

export function orienteeringStatus(ev) {
  const today = todayWIB();
  if (!ev.startDate) return "upcoming";
  if (today < ev.startDate) return "upcoming";
  if (today > (ev.endDate || ev.startDate)) return "done";
  return "live";
}

const STATUS_RANK = { live: 0, upcoming: 1, done: 2 };

export default function OrienteeringLiveList({ search = "", liveOnly = false }) {
  const [events, setEvents] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let aborted = false;
    (async () => {
      try {
        const res = await fetch("/api/orienteering/events", { cache: "no-store" });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Failed to load");
        if (!aborted) setEvents(data.events || []);
      } catch (e) {
        if (!aborted) {
          setError(e.message || "Failed to load");
          setEvents([]);
        }
      }
    })();
    return () => {
      aborted = true;
    };
  }, []);

  const list = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (events || [])
      .map((e) => ({ ...e, status: orienteeringStatus(e) }))
      .filter((e) => (!q || e.name.toLowerCase().includes(q)) && (!liveOnly || e.status === "live"))
      .sort((a, b) => STATUS_RANK[a.status] - STATUS_RANK[b.status]);
  }, [events, search, liveOnly]);

  if (events === null) return <CardSkeletonGrid count={3} />;

  if (!list.length) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center text-gray-500 bg-white rounded-2xl ring-1 ring-gray-200/70">
        <CompassIcon className="w-16 h-16 text-emerald-600/40 mb-4" />
        <h3 className="text-xl font-semibold text-gray-700 mb-1">
          {error ? "Failed to load events" : "No Orienteering events yet"}
        </h3>
        <p className="text-gray-500 max-w-md px-4 text-sm">
          {error || "Orienteering events published from STiming System will appear here."}
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
      {list.map((ev) => (
        <Link key={ev.id} href={`/live/orienteering/${ev.id}`} className="group">
          <article className="relative h-full overflow-hidden rounded-2xl bg-white ring-1 ring-gray-200/70 shadow-sm transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-[0_12px_32px_rgba(16,185,129,0.25)] group-hover:ring-emerald-400/60">
            <div className="relative h-44 w-full overflow-hidden bg-gradient-to-br from-emerald-700 via-teal-700 to-sts">
              {ev.image ? (
                <img
                  src={ev.image}
                  alt={ev.name}
                  loading="lazy"
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              ) : (
                <CompassIcon className="absolute inset-0 m-auto w-20 h-20 text-white/25" />
              )}
              <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/45 to-transparent" />
              <StatusBadge status={ev.status} className="absolute top-3 right-3" />
              <span className="absolute top-3 left-3 bg-white/90 text-emerald-700 text-xs font-semibold px-2.5 py-1 rounded-full shadow backdrop-blur-sm">
                Orienteering
              </span>
            </div>
            {/* di luar cover (overflow-hidden) supaya tidak terpotong */}
            {ev.logo && (
              <span className="absolute left-4 top-[148px] z-10 w-14 h-14 rounded-xl bg-white ring-2 ring-white shadow-md overflow-hidden">
                <img src={ev.logo} alt="" className="w-full h-full object-contain p-1" />
              </span>
            )}
            <div className={`p-4 ${ev.logo ? "pt-9" : ""}`}>
              <h2 className="text-base md:text-lg font-semibold text-gray-900 line-clamp-1 group-hover:text-emerald-700 transition-colors">
                {ev.name}
              </h2>
              <p className="mt-1 text-sm text-gray-600">
                {fmtDate(ev.startDate)}
                {ev.endDate && ev.endDate !== ev.startDate ? ` — ${fmtDate(ev.endDate)}` : ""}
              </p>
              {ev.races.length > 0 && (
                <ul className="mt-3 space-y-1">
                  {ev.races.map((r) => (
                    <li key={r.id} className="flex items-center gap-2 text-sm text-gray-700">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-none" />
                      <span className="font-medium">{r.name}</span>
                      {r.location && <span className="text-gray-500 truncate">· {r.location}</span>}
                      <span className="ml-auto flex-none text-xs text-gray-400">{r.participantCount} runners</span>
                    </li>
                  ))}
                </ul>
              )}
              {ev.types.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {ev.types.map((t) => (
                    <span
                      key={t}
                      className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ring-1 ${
                        /world ranking/i.test(t)
                          ? "bg-amber-50 text-amber-700 ring-amber-200"
                          : "bg-sky-50 text-sky-700 ring-sky-200"
                      }`}
                    >
                      {t}
                    </span>
                  ))}
                </div>
              )}
              <div className="mt-4 flex items-center justify-between text-sm">
                <span className="text-gray-500">
                  👥 {ev.participantCount} runners · {ev.categoryCount} categories
                </span>
                <span className="text-emerald-700 font-semibold group-hover:translate-x-0.5 transition-transform">
                  View Results →
                </span>
              </div>
            </div>
          </article>
        </Link>
      ))}
    </div>
  );
}

export function StatusBadge({ status, className = "" }) {
  if (status === "live") {
    return (
      <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-600 text-white text-xs font-bold shadow-md ${className}`}>
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
        </span>
        LIVE
      </span>
    );
  }
  return (
    <span
      className={`px-2.5 py-1 rounded-full text-xs font-semibold shadow ${
        status === "done" ? "bg-gray-100 text-gray-600 ring-1 ring-gray-200" : "bg-white/90 text-sky-700"
      } ${className}`}
    >
      {status === "done" ? "Finished" : "Upcoming"}
    </span>
  );
}

export function CompassIcon({ className = "" }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16Zm-5.5-2.5 7.51-3.49L17.5 6.5 9.99 9.99 6.5 17.5Zm5.5-6.6a1.1 1.1 0 1 1 0 2.2 1.1 1.1 0 0 1 0-2.2Z" />
    </svg>
  );
}
