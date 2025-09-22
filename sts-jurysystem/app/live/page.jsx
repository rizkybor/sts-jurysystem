"use client";
import Link from "next/link";
import { useEffect, useState, useRef } from "react";

const PAGE_SIZE = 9;
const DEFAULT_IMG = "/images/logo-dummy.png"; // pastikan ada di /public/images

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

export default function LivePage() {
  const [page, setPage] = useState(1);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(null);
  const lastBatchCountRef = useRef(0);

  useEffect(() => {
    let aborted = false;

    const fetchMatches = async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/matches?page=${page}&pageSize=${PAGE_SIZE}`,
          {
            cache: "no-store",
          }
        );
        if (!res.ok) throw new Error("Failed to fetch matches");
        const data = await res.json();

        const normalized = (data.events || []).map((it) => ({
          id: String(it.id ?? it._id),
          name: it.eventName ?? "Untitled",
          image: DEFAULT_IMG,
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

  return (
    <section className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <h1 className="text-2xl font-bold text-center mb-8">📊 Live Results - All Whitewater Rafting Championship Events</h1>

        {/* GRID CARD */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((event) => {
            const live = isLiveEvent(event);
            const Card = (
              <div
                className={`bg-white rounded-xl overflow-hidden transition shadow-md ${
                  live
                    ? "hover:shadow-lg hover:-translate-y-0.5 cursor-pointer"
                    : "opacity-60 grayscale cursor-not-allowed"
                }`}
              >
                {/* Gambar */}
                <div className="relative h-44 w-full bg-gray-100">
                  <img
                    src={event.image}
                    alt={event.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />

                  {/* badge level */}
                  {event.levelName && (
                    <span className="absolute top-3 left-3 bg-white/90 text-gray-800 text-xs font-semibold px-2.5 py-1 rounded-full shadow">
                      {event.levelName}
                    </span>
                  )}

                  {/* badge live/offline */}
                  {live ? (
                    <span className="absolute top-3 right-3 flex items-center gap-1.5">
                      {/* bulatan merah berkedip */}
                      <span className="h-2.5 w-2.5 rounded-full bg-red-500 animate-ping" />
                      <span className="h-2.5 w-2.5 rounded-full bg-red-500 absolute" />
                      <span className="px-2 py-0.5 rounded-md bg-red-600 text-white text-xs font-bold animate-pulse">
                        LIVE
                      </span>
                    </span>
                  ) : (
                    <span className="absolute top-3 right-3 px-2.5 py-1 rounded-md text-xs font-semibold bg-gray-300 text-gray-700 shadow">
                      Not Live
                    </span>
                  )}
                </div>

                {/* Body */}
                <div className="p-4">
                  <h2 className="text-lg font-semibold text-gray-900 line-clamp-1">
                    {event.name}
                  </h2>

                  {event.city && (
                    <p className="text-sm text-gray-600 mt-1">
                      {event.city}
                      {event.province ? `, ${event.province}` : ""}
                    </p>
                  )}

                  {(event.startDate || event.endDate) && (
                    <p className="text-sm text-gray-600 mt-1">
                      <span className="font-medium">Tanggal:</span>{" "}
                      {fmtDate(event.startDate)} — {fmtDate(event.endDate)}
                    </p>
                  )}

                  {typeof event.participantCount === "number" && (
                    <p className="text-sm text-gray-700 mt-2">
                      👥 {event.participantCount} peserta
                    </p>
                  )}
                </div>
              </div>
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

        {/* Pagination */}
        <div className="mt-8 flex justify-center">
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={loading || !hasMore}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg shadow-md hover:bg-blue-600 disabled:opacity-60"
          >
            {loading ? "Loading..." : hasMore ? "Load More" : "No More Data"}
          </button>
        </div>
      </div>
    </section>
  );
}
