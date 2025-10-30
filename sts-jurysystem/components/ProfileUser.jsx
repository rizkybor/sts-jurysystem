"use client";
import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSession } from "next-auth/react";
import profileDefault from "@/assets/images/profile.png";
import Spinner from "@/components/Spinner";

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
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-gray-800">
            Please sign in to view your profile
          </h1>
          <Link
            href="/auth"
            className="inline-block mt-4 px-5 py-2.5 rounded-lg bg-sts text-white hover:bg-stsHighlight transition-colors"
          >
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* HEADER */}
      <div className="bg-gradient-to-br from-[#1874A5] via-[#4690B7] to-[#1558B0] text-white">
        <div className="container m-auto px-4 py-10">
          <div className="flex flex-col md:flex-row md:items-center gap-6">
            <div className="relative h-24 w-24 md:h-28 md:w-28 rounded-full ring-4 ring-white/30 overflow-hidden shadow-lg">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={profileImage}
                alt={profileName}
                className="w-full h-full object-cover"
              />
            </div>

            <div className="flex-1">
              <h3 className="text-2xl md:text-3xl font-bold">{profileName}</h3>
              <h6 className="text-white/90">{profileEmail}</h6>
              <small className="text-white/90">Judges - Level ...</small>

              <div className="mt-4 flex flex-wrap gap-2">
                <Link
                  href="/judges"
                  className="px-4 py-2 rounded-lg bg-white text-sts font-semibold hover:bg-sts/10 hover:text-white ring-1 ring-white/50 transition-all"
                >
                  Judges Dashboard
                </Link>
                {/* <Link
                  href="/profile/edit"
                  className="px-4 py-2 rounded-lg bg-white/10 text-white hover:bg-white/20 ring-1 ring-white/30 transition-all"
                >
                  Profile Settings
                </Link> */}
                <Link
                  href="/histories"
                  className="px-4 py-2 rounded-lg bg-white/10 text-white hover:bg-white/20 ring-1 ring-white/30 transition-all"
                >
                  History
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 md:gap-4">
              <div className="rounded-xl bg-white/10 px-4 py-3 text-center ring-1 ring-white/20">
                <p className="text-2xl font-bold">{stats.myEvents}</p>
                <p className="text-sm text-white/90">My Events</p>
              </div>
              {/* <div className="rounded-xl bg-white/10 px-4 py-3 text-center ring-1 ring-white/20">
                <p className="text-2xl font-bold">{stats.bookmarks}</p>
                <p className="text-sm text-white/90">Bookmarks</p>
              </div> */}
            </div>
          </div>
        </div>
      </div>

      {/* CONTENT */}
      <div className="container m-auto px-4 py-8">
        {userDetail?.mainEvents?.length ? (
          <div className="mb-6">
            <h2 className="text-sm font-semibold text-gray-700 mb-2">
              Pinned Events
            </h2>
            <div className="flex flex-wrap gap-2">
              {userDetail.mainEvents.slice(0, 3).map((id) => {
                const ev = events.find((e) => String(e.id) === String(id));
                return (
                  <Link
                    key={id}
                    href={`/matches/${id}`}
                    className="px-3 py-1.5 rounded-full text-xs font-semibold bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors"
                  >
                    #{String(id).slice(0, 6)} {ev ? ev.name : ""}
                  </Link>
                );
              })}

              {userDetail.mainEvents.length > 3 && (
                <span className="px-3 py-1.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-500">
                  ...
                </span>
              )}
            </div>
          </div>
        ) : null}

        {/* MY EVENTS */}
        <div className="rounded-2xl bg-white ring-1 ring-gray-200 shadow-md overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800">My Events</h3>
            <Link
              href="/matches"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-sts text-white hover:bg-stsHighlight transition-colors"
            >
              Browse Events
            </Link>
          </div>

          <div className="p-6">
            {loading ? (
              <div className="py-10">
                <Spinner loading={loading} />
              </div>
            ) : events.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center py-16">
                <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    className="text-gray-400"
                  >
                    <path
                      fill="currentColor"
                      d="M12 3l9 6v12H3V9l9-6m0 2.2L5 10v9h14v-9l-7-4.8Z"
                    />
                  </svg>
                </div>
                <h4 className="text-lg font-semibold text-gray-700">
                  No events pinned
                </h4>
                <p className="text-gray-500 mt-1">
                  Pin your favorite events so they appear here.
                </p>
                <Link
                  href="/matches"
                  className="mt-4 px-5 py-2.5 rounded-lg bg-sts text-white hover:bg-stsHighlight transition-colors"
                >
                  Explore Events
                </Link>
              </div>
            ) : events.length <= 3 ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {events.map((ev) => (
                  <EventCard key={ev.id} ev={ev} />
                ))}
              </div>
            ) : (
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-white to-transparent" />
                <div className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-white to-transparent" />

                <div
                  className="events-scroll flex gap-5 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-2 pr-2"
                  aria-label="My events horizontal list"
                >
                  {events.map((ev) => (
                    <div
                      key={ev.id}
                      className="snap-start flex-shrink-0 w-[85%] sm:w-[70%] md:w-[32%] lg:w-[32%]"
                    >
                      <EventCard ev={ev} />
                    </div>
                  ))}
                </div>

                <style jsx>{`
                  .events-scroll {
                    scrollbar-width: none;
                  }
                  .events-scroll::-webkit-scrollbar {
                    display: none;
                  }
                `}</style>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ✨ Card dengan hover glow biru dan shadow halus
const EventCard = ({ ev }) => (
  <div className="group rounded-xl overflow-hidden ring-1 ring-gray-200 bg-white shadow-sm hover:shadow-xl hover:ring-sts/50 transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1 relative">
    {/* Glow overlay */}
    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-br from-sts/10 to-blue-200/20 blur-md pointer-events-none"></div>

    <Link href={`/matches/${ev.id}`}>
      <div className="relative h-80 w-full bg-gray-100 overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={ev.posterUrl || DEFAULT_IMG}
          alt={ev.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />
        {ev.levelName && (
          <span className="absolute top-3 left-3 text-xs font-semibold px-2 py-1 rounded-full bg-white/90 text-gray-800 ring-1 ring-gray-200">
            {ev.levelName}
          </span>
        )}
      </div>
    </Link>

    <div className="p-4 relative z-10">
      <Link href={`/matches/${ev.id}`}>
        <h4 className="font-semibold text-gray-900 line-clamp-1 group-hover:text-stsHighlight transition-colors">
          {ev.name}
        </h4>
      </Link>
      {(ev.city || ev.province) && (
        <p className="text-sm text-gray-600 mt-1">
          {ev.city}
          {ev.city && ev.province ? ", " : ""}
          {ev.province}
        </p>
      )}
      {(ev.start || ev.end) && (
        <p className="text-sm text-gray-600 mt-1">
          <span className="font-medium">Date:</span> {fmtDate(ev.start)} —{" "}
          {fmtDate(ev.end)}
        </p>
      )}
    </div>
  </div>
);

export default ProfileUser;
