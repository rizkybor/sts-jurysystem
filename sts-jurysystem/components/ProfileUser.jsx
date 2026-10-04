"use client";
import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import profileDefault from "@/assets/images/profile.png";

const DEFAULT_IMG = "/images/logo-dummy.png";

function fmtDate(s) {
  if (!s) return "-";
  const d = new Date(s);
  return isNaN(d)
    ? s
    : d.toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
}

async function fetchEventById(id) {
  const res = await fetch(`/api/matches/${id}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to fetch event ${id}`);
  const data = await res.json();
  return data.event || data;
}

const ProfileUser = () => {
  const { data: session } = useSession();
  const profileName = session?.user?.name || "User";
  const profileEmail = session?.user?.email || "-";
  const profileImage =
    typeof session?.user?.image === "string"
      ? session.user.image
      : profileDefault.src;

  const [userDetail, setUserDetail] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch user detail
  useEffect(() => {
    if (!session) return;
    let abort = false;
    const fetchUser = async () => {
      try {
        const res = await fetch("/api/user", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (!abort) setUserDetail(data);
      } catch (e) {
        if (!abort) console.error("GET /api/user error:", e);
      }
    };
    fetchUser();
    return () => {
      abort = true;
    };
  }, [session]);

  // Fetch events by mainEvents
  useEffect(() => {
    if (!session) return;
    let abort = false;

    const loadEvents = async (ids = []) => {
      setLoading(true);
      try {
        if (!ids.length) {
          if (!abort) setEvents([]);
          return;
        }
        const results = await Promise.allSettled(
          ids.map((id) => fetchEventById(id))
        );
        const okEvents = results
          .filter((r) => r.status === "fulfilled" && r.value)
          .map((r) => r.value);

        const normalized = okEvents.map((e) => {
          const posterUrl =
            e.poster_url || e.posterUrl || e.imageUrl || DEFAULT_IMG;
          return {
            id: String(e.id ?? e._id),
            name: e.eventName ?? "Untitled",
            posterUrl,
            city: e.addressCity || "",
            province: e.addressProvince || "",
            start: e.startDateEvent || e.startDate || null,
            end: e.endDateEvent || e.endDate || null,
            levelName: e.levelName || null,
          };
        });

        if (!abort) setEvents(normalized);
      } catch (err) {
        if (!abort) {
          console.error(err);
          setEvents([]);
        }
      } finally {
        if (!abort) setLoading(false);
      }
    };

    loadEvents(userDetail?.mainEvents || []);
    return () => {
      abort = true;
    };
  }, [session, userDetail?.mainEvents]);

  const stats = useMemo(
    () => ({
      myEvents: userDetail?.mainEvents?.length || 0,
      bookmarks: userDetail?.bookmarks?.length || 0,
    }),
    [userDetail]
  );

  if (!session) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center bg-slate-50 px-4">
        <div className="text-center bg-white border border-slate-200 rounded-2xl shadow-sm px-8 py-10 max-w-sm w-full">
          <h1 className="text-xl font-semibold text-slate-900">
            Please sign in to view your profile
          </h1>
          <Link
            href="/auth"
            className="inline-flex mt-5 px-5 py-2.5 rounded-xl bg-sts text-white text-sm font-semibold hover:bg-stsDark transition-colors"
          >
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  const joinedAt = userDetail?.createdAt ? fmtDate(userDetail.createdAt) : null;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-6xl mx-auto px-4 md:px-6 lg:px-8 py-6 md:py-10 md:grid md:grid-cols-[280px_minmax(0,1fr)] lg:grid-cols-[320px_minmax(0,1fr)] md:gap-6 md:items-start space-y-5 md:space-y-0">
        {/* PROFILE CARD */}
        <aside className="md:sticky md:top-24 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="h-1 bg-sts" />
            <div className="p-5 flex md:flex-col items-center md:items-start gap-4">
              <div className="h-20 w-20 md:h-24 md:w-24 rounded-2xl overflow-hidden ring-1 ring-slate-200 bg-slate-100 shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={profileImage}
                  alt={profileName}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="min-w-0">
                <h1 className="text-xl md:text-2xl font-bold text-slate-900 leading-tight truncate">
                  {profileName}
                </h1>
                <p className="text-sm text-slate-500 truncate">{profileEmail}</p>
                <span className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-sts/10 text-stsDark text-xs font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-sts" />
                  Judge
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 border-t border-slate-100 divide-x divide-slate-100">
              <div className="px-5 py-3">
                <p className="text-xl font-bold text-slate-900 tabular-nums">{stats.myEvents}</p>
                <p className="text-xs text-slate-500">My Events</p>
              </div>
              <div className="px-5 py-3">
                <p className="text-sm font-semibold text-slate-900 mt-1">{joinedAt || "-"}</p>
                <p className="text-xs text-slate-500">Bergabung</p>
              </div>
            </div>
          </div>

          <nav className="bg-white rounded-2xl border border-slate-200 shadow-sm p-2 grid grid-cols-2 md:grid-cols-1 gap-1">
            <Link
              href="/judges"
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold text-white bg-sts hover:bg-stsDark transition-colors"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 shrink-0">
                <path d="M3 4.75A1.75 1.75 0 0 1 4.75 3h3.5A1.75 1.75 0 0 1 10 4.75v3.5A1.75 1.75 0 0 1 8.25 10h-3.5A1.75 1.75 0 0 1 3 8.25v-3.5Zm7 7A1.75 1.75 0 0 1 11.75 10h3.5A1.75 1.75 0 0 1 17 11.75v3.5A1.75 1.75 0 0 1 15.25 17h-3.5A1.75 1.75 0 0 1 10 15.25v-3.5ZM11.75 3A1.75 1.75 0 0 0 10 4.75v.5c0 .966.784 1.75 1.75 1.75h3.5A1.75 1.75 0 0 0 17 5.25v-.5A1.75 1.75 0 0 0 15.25 3h-3.5ZM3 14.75c0-.966.784-1.75 1.75-1.75h3.5c.966 0 1.75.784 1.75 1.75v.5A1.75 1.75 0 0 1 8.25 17h-3.5A1.75 1.75 0 0 1 3 15.25v-.5Z" />
              </svg>
              <span className="truncate">Judge Task</span>
            </Link>
            <Link
              href="/histories"
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 shrink-0 text-slate-400">
                <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm.75-13a.75.75 0 0 0-1.5 0v5c0 .27.144.518.378.651l3.5 2a.75.75 0 0 0 .744-1.302L10.75 9.567V5Z" clipRule="evenodd" />
              </svg>
              <span className="truncate">History</span>
            </Link>
          </nav>
        </aside>

        {/* MY EVENTS */}
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between gap-3 px-4 md:px-5 py-4 border-b border-slate-100">
            <div className="min-w-0">
              <h2 className="text-base md:text-lg font-bold text-slate-900">My Events</h2>
              <p className="text-xs text-slate-500">
                Event tempat Anda ditugaskan sebagai juri
              </p>
            </div>
            <Link
              href="/matches"
              className="shrink-0 inline-flex items-center gap-1.5 h-10 px-4 rounded-xl border border-slate-200 text-sm font-semibold text-stsDark hover:bg-sts/5 hover:border-sts/30 transition-colors"
            >
              Browse Events
            </Link>
          </div>

          <div className="p-4 md:p-5">
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="rounded-xl border border-slate-200 overflow-hidden animate-pulse">
                    <div className="aspect-[4/3] bg-slate-100" />
                    <div className="p-4 space-y-2">
                      <div className="h-4 bg-slate-100 rounded w-3/4" />
                      <div className="h-3 bg-slate-100 rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : events.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center py-14">
                <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-4 text-slate-400">
                  <svg width="24" height="24" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M12 3l9 6v12H3V9l9-6m0 2.2L5 10v9h14v-9l-7-4.8Z"
                    />
                  </svg>
                </div>
                <h3 className="text-base font-semibold text-slate-800">
                  Belum ada event
                </h3>
                <p className="text-sm text-slate-500 mt-1">
                  Event tempat Anda ditugaskan akan tampil di sini.
                </p>
                <Link
                  href="/matches"
                  className="mt-5 px-5 py-2.5 rounded-xl bg-sts text-white text-sm font-semibold hover:bg-stsDark transition-colors"
                >
                  Explore Events
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {events.map((ev) => (
                  <EventCard key={ev.id} ev={ev} />
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

const EventCard = ({ ev }) => (
  <Link
    href={`/matches/${ev.id}`}
    className="group flex flex-col rounded-xl overflow-hidden border border-slate-200 bg-white hover:border-sts/40 hover:shadow-md transition"
  >
    <div className="relative aspect-[4/3] w-full bg-slate-100 overflow-hidden">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={ev.posterUrl || DEFAULT_IMG}
        alt={ev.name}
        className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
        loading="lazy"
        onError={(e) => {
          if (!e.currentTarget.src.endsWith(DEFAULT_IMG)) {
            e.currentTarget.src = DEFAULT_IMG;
          }
        }}
      />
      {ev.levelName && (
        <span className="absolute top-3 left-3 text-[11px] font-semibold px-2 py-1 rounded-md bg-white/95 text-slate-800 border border-slate-200">
          {ev.levelName}
        </span>
      )}
    </div>

    <div className="p-4 flex-1 flex flex-col gap-1.5">
      <h3 className="font-semibold text-slate-900 leading-snug line-clamp-2 group-hover:text-stsDark transition-colors">
        {ev.name}
      </h3>
      {(ev.city || ev.province) && (
        <p className="flex items-center gap-1.5 text-xs text-slate-500">
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 text-slate-400 shrink-0">
            <path fillRule="evenodd" d="m9.69 18.933.003.001C9.89 19.02 10 19 10 19s.11.02.308-.066l.002-.001.006-.003.018-.008a5.741 5.741 0 0 0 .281-.14c.186-.096.446-.24.757-.433.62-.384 1.445-.966 2.274-1.765C15.302 14.988 17 12.493 17 9A7 7 0 1 0 3 9c0 3.492 1.698 5.988 3.355 7.584a13.731 13.731 0 0 0 2.273 1.765 11.842 11.842 0 0 0 .976.544l.062.029.018.008.006.003ZM10 11.25a2.25 2.25 0 1 0 0-4.5 2.25 2.25 0 0 0 0 4.5Z" clipRule="evenodd" />
          </svg>
          <span className="truncate">
            {ev.city}
            {ev.city && ev.province ? ", " : ""}
            {ev.province}
          </span>
        </p>
      )}
      {(ev.start || ev.end) && (
        <p className="flex items-center gap-1.5 text-xs text-slate-500">
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 text-slate-400 shrink-0">
            <path fillRule="evenodd" d="M5.75 2a.75.75 0 0 1 .75.75V4h7V2.75a.75.75 0 0 1 1.5 0V4h.25A2.75 2.75 0 0 1 18 6.75v8.5A2.75 2.75 0 0 1 15.25 18H4.75A2.75 2.75 0 0 1 2 15.25v-8.5A2.75 2.75 0 0 1 4.75 4H5V2.75A.75.75 0 0 1 5.75 2Zm-1 5.5c-.69 0-1.25.56-1.25 1.25v6.5c0 .69.56 1.25 1.25 1.25h10.5c.69 0 1.25-.56 1.25-1.25v-6.5c0-.69-.56-1.25-1.25-1.25H4.75Z" clipRule="evenodd" />
          </svg>
          {fmtDate(ev.start)} — {fmtDate(ev.end)}
        </p>
      )}
    </div>
  </Link>
);

export default ProfileUser;
