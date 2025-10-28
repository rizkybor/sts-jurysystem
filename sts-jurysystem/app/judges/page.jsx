"use client";

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import NavigationButton from "@/components/NavigationButton";

/* === UI Utility Components === */
const Badge = ({ children, color = "bg-gray-100 text-gray-700" }) => (
  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${color}`}>
    {children}
  </span>
);

const Pill = ({ active, children }) => (
  <span
    className={`px-3 py-1 rounded-lg text-sm font-medium inline-block min-w-20 text-center
      ${active ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-600"}
    `}
  >
    {children}
  </span>
);

const EmptyNote = ({ children }) => (
  <div className="w-full rounded-xl border border-amber-200 bg-amber-50 text-amber-800 px-4 py-3">
    {children}
  </div>
);

const JudgesPage = () => {
  const [user, setUser] = useState(null);
  const [events, setEvents] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // === Helper: Hitung total tugas aktif ===
  const countActiveTasks = (assignments) => {
    if (!Array.isArray(assignments)) return 0;
    let count = 0;
    assignments.forEach((item) => {
      (item.judges || []).forEach((judge) => {
        if (judge.h2h) Object.values(judge.h2h).forEach((v) => v && count++);
        if (judge.sprint)
          Object.values(judge.sprint).forEach((v) => v && count++);
        if (judge.slalom)
          Object.values(judge.slalom).forEach((v) => v && count++);
        if (judge.drr) Object.values(judge.drr).forEach((v) => v && count++);
      });
    });
    return count;
  };

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
        const judgeAssignment = assign.judges.find(
          (j) => j.eventId === eventId
        );
        if (judgeAssignment) return judgeAssignment;
      }
    }
    return null;
  };

  // === Konfigurasi tombol navigasi juri ===
  const judgeButtonsConfig = useMemo(
    () => [
      {
        key: "sprint",
        href: "/judges/sprint",
        label: "Sprint",
        checkActive: (a) => a?.sprint && (a.sprint.start || a.sprint.finish),
      },
      {
        key: "h2h",
        href: "/judges/headtohead",
        label: "H2H",
        checkActive: (a) =>
          a?.h2h && Object.values(a.h2h).some((v) => v === true),
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
        label: "DRR",
        checkActive: (a) =>
          a?.drr &&
          Object.values(a.drr).some(
            (v) => v === true || (Array.isArray(v) && v.length > 0)
          ),
      },
    ],
    []
  );

  // === Helper: parse tanggal aman ===
  const toDate = (v) => {
    if (!v) return null;
    if (typeof v === "number") return new Date(v);
    if (v instanceof Date) return v;
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d;
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
        const diffA = Math.abs(da.getTime() - now);
        const diffB = Math.abs(db.getTime() - now);
        return diffA - diffB; // yang paling dekat dengan sekarang di urutan pertama
      }

      // kalau salah satu tidak valid
      if (!da && db) return 1;
      if (da && !db) return -1;
      return (a?.eventName || "").localeCompare(b?.eventName || "");
    });
  }, [events]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-100 via-white to-purple-100">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  if (error && !user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-red-50 via-white to-orange-50 px-6">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-7xl mb-4"
        >
          😕
        </motion.div>
        <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-800 mb-2">
          Terjadi Kesalahan
        </h2>
        <p className="text-gray-600 mb-6">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl shadow hover:shadow-xl hover:scale-105 transition-all"
        >
          Coba Lagi
        </button>
      </div>
    );
  }

  const totalTasks = countActiveTasks(assignments);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <div className="max-w-6xl px-4 sm:px-6 lg:px-8 py-10 mx-auto">
        {/* === Profile Card === */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white rounded-3xl shadow-xl p-6 border border-gray-100"
        >
          <div className="flex flex-col items-center gap-4">
            {user?.image ? (
              <Image
                src={user.image}
                alt={user.username}
                width={112}
                height={112}
                className="rounded-2xl object-cover shadow"
                unoptimized
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-28 h-28 rounded-2xl ...">
                {user?.username?.charAt(0) || "U"}
              </div>
            )}

            <div className="text-center">
              <h2 className="text-2xl font-extrabold text-gray-900">
                {user?.username}
              </h2>
              <p className="text-gray-600">{user?.email}</p>
              <div className="flex items-center justify-center gap-2 mt-3 flex-wrap">
                <Badge color="bg-orange-100 text-orange-700">
                  {events?.length || 0} Event
                </Badge>
                <Badge color="bg-blue-100 text-blue-700">
                  {totalTasks} Task
                </Badge>
              </div>
            </div>
          </div>
        </motion.div>

        {/* === Section Title === */}
        <div className="mt-10 mb-4">
          <h3 className="text-2xl sm:text-3xl font-extrabold text-gray-900">
            Recent Match
          </h3>
        </div>

        {/* === Horizontal Scroll Cards === */}
        <div className="relative">
          <div
            className="flex gap-6 overflow-x-auto pb-4 snap-x snap-mandatory scroll-smooth hide-scrollbar"
            style={{ WebkitOverflowScrolling: "touch" }}
          >
            {sortedEvents.map((event, index) => {
              const assignment = getJudgeAssignment(event._id);
              const logo = event.eventLogo?.trim() || "/images/logo-dummy.png";
              const flags = {
                sprint: judgeButtonsConfig[0].checkActive(assignment),
                h2h: judgeButtonsConfig[1].checkActive(assignment),
                slalom: judgeButtonsConfig[2].checkActive(assignment),
                drr: judgeButtonsConfig[3].checkActive(assignment),
              };
              const anyActive =
                flags.sprint || flags.h2h || flags.slalom || flags.drr;

              return (
                <motion.div
                  key={event._id}
                  initial={{ y: 16, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: index * 0.05 }}
                  className="min-w-[280px] sm:min-w-[320px] max-w-[320px] flex-shrink-0 snap-start bg-white rounded-3xl shadow-xl border border-gray-100 p-6 flex flex-col"
                >
                  {/* Logo */}
                  <div className="w-20 h-20 mx-auto rounded-xl bg-gray-100 overflow-hidden flex items-center justify-center">
                    <img
                      src={logo}
                      alt="logo"
                      className="w-16 h-16 object-contain"
                    />
                  </div>

                  {/* Info */}
                  <div className="mt-4 text-center">
                    <h4 className="font-bold text-gray-900">
                      {event.eventName}
                    </h4>
                    <p className="text-sm text-gray-500">
                      {event.dateString || event.dateRange || ""}{" "}
                      {event.location ? ` | ${event.location}` : ""}
                    </p>
                  </div>

                  <div className="mt-4 space-y-1 text-sm">
                    <p>
                      <span className="font-semibold">Status: </span>
                      <span
                        className={
                          event.statusEvent === "Activated"
                            ? "text-green-600"
                            : "text-gray-500"
                        }
                      >
                        {event.statusEvent === "Activated"
                          ? "Actived"
                          : "InActived"}
                      </span>
                    </p>
                    <p>
                      <span className="font-semibold">Activated Role: </span>
                      <span className="text-gray-700">Judge</span>
                    </p>
                  </div>

                  {/* Buttons / Empty */}
                  <div className="mt-4">
                    {assignment ? (
                      anyActive ? (
                        <div className="grid grid-cols-2 gap-2">
                          {judgeButtonsConfig.map((btn) => {
                            const isActive = btn.checkActive(assignment);
                            return isActive ? (
                              <NavigationButton
                                key={btn.key}
                                href={btn.href}
                                label={btn.label}
                                color="btnNavigation-sts"
                                params={{
                                  eventId: event._id,
                                  userId: user?._id,
                                  assignmentId: assignment._id,
                                }}
                                className="w-full"
                              />
                            ) : (
                              <Pill key={btn.key} active={false}>
                                {btn.label}
                              </Pill>
                            );
                          })}
                        </div>
                      ) : (
                        <EmptyNote>
                          ⚠️ You don’t have any assignments for this event yet
                        </EmptyNote>
                      )
                    ) : (
                      <EmptyNote>
                        ⚠️ You don’t have any assignments for this event yet
                      </EmptyNote>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default JudgesPage;
