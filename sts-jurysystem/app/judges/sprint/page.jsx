"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import getSocket from "@/utils/socket";
import { motion } from "framer-motion";

/* ---------------------------------- CONST --------------------------------- */
const PENALTIES = [0, 10, 50];

/* ---------------------------- Helper Functions ---------------------------- */
function getSprintPositionFromAssignments(list, evId) {
  if (!Array.isArray(list) || !evId) return "";
  const match = list
    .flatMap(item => item.judges || [])
    .find(j => String(j.eventId) === String(evId));
  if (!match || !match.sprint) return "";
  if (match.sprint.start) return "Start";
  if (match.sprint.finish) return "Finish";
  return "";
}

/* --------------------------------- PAGE ----------------------------------- */
const JudgesSprintPages = () => {
  const searchParams = useSearchParams();
  const eventId = searchParams.get("eventId");

  /* --------------------------------- State -------------------------------- */
  // UI
  const [loading, setLoading] = useState(false);
  const [toasts, setToasts] = useState([]);

  // User / judge
  const [user, setUser] = useState(null);

  // Event & teams
  const [eventDetail, setEventDetail] = useState(null);
  const [loadingEvent, setLoadingEvent] = useState(true);
  const [teams, setTeams] = useState([]);
  const [loadingTeams, setLoadingTeams] = useState(true);

  // Form
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedTeam, setSelectedTeam] = useState("");
  const [selectedPenalty, setSelectedPenalty] = useState(null);

  // Assignments & events
  const [assignments, setAssignments] = useState([]);
  const [events, setEvents] = useState([]);
  const [error, setError] = useState(null);

  // History
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [historyData, setHistoryData] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Refs
  const toastId = useRef(1);
  const socketRef = useRef(null);

  /* ------------------------------- Derived -------------------------------- */
  const assignedPosition = useMemo(
    () => getSprintPositionFromAssignments(assignments, eventId),
    [assignments, eventId]
  );

  const combinedCategories = useMemo(() => {
    const list = [];
    const initials = eventDetail?.categoriesInitial || [];
    const divisions = eventDetail?.categoriesDivision || [];
    const races = eventDetail?.categoriesRace || [];
    initials.forEach(initial => {
      divisions.forEach(division => {
        races.forEach(race => {
          list.push({
            label: `${initial.name} - ${division.name} - ${race.name}`,
            value: `${initial.value}|${division.value}|${race.value}`,
          });
        });
      });
    });
    return list;
  }, [eventDetail]);

  const filteredTeams = useMemo(() => {
    if (!selectedCategory) return teams;
    const [initialId, divisionId, raceId] = selectedCategory.split("|");
    return teams.filter(
      team =>
        String(team.initialId) === String(initialId) &&
        String(team.divisionId) === String(divisionId) &&
        String(team.raceId) === String(raceId)
    );
  }, [selectedCategory, teams]);

  const isSubmitDisabled = useMemo(() => {
    return (
      loading ||
      !eventId ||
      !selectedCategory ||
      !selectedTeam ||
      selectedPenalty === null ||
      !assignedPosition
    );
  }, [loading, eventId, selectedCategory, selectedTeam, selectedPenalty, assignedPosition]);

  /* ------------------------------- Toasting ------------------------------- */
  const pushToast = useCallback((msg, ttlMs = 4000) => {
    const id = toastId.current++;
    setToasts(prev => [...prev, { id, ...msg }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, ttlMs);
  }, []);

  const removeToast = useCallback(id => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  /* -------------------------------- Effects ------------------------------- */
  // Fetch judges, events, assignments
  useEffect(() => {
    const fetchData = async () => {
      try {
        setError(null);
        setLoading(true);

        const judgesRes = await fetch("/api/judges", { cache: "no-store" });
        if (!judgesRes.ok) throw new Error(`Gagal memuat data judges: ${judgesRes.status}`);
        const judgesData = await judgesRes.json();

        if (judgesData.user) setUser(judgesData.user);
        setEvents(judgesData.events || []);

        const userEmail = judgesData.user?.email;
        if (!userEmail) throw new Error("Email tidak ditemukan");

        const assignmentsRes = await fetch(
          `/api/assignments?email=${encodeURIComponent(userEmail)}`,
          { cache: "no-store" }
        );
        if (!assignmentsRes.ok) throw new Error(`Gagal memuat assignments: ${assignmentsRes.status}`);

        const assignmentsData = await assignmentsRes.json();
        setAssignments(assignmentsData.data || []);
      } catch (err) {
        console.error(err);
        setError(err.message);
        pushToast({ title: "Error", text: err.message || "Gagal memuat data awal", type: "error" });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [pushToast]);

  // Fetch teams (by category)
  useEffect(() => {
    if (!eventId || !selectedCategory) return;

    const fetchTeams = async () => {
      try {
        const [initialId, divisionId, raceId] = selectedCategory.split("|");
        const catEvent = "SPRINT";

        const res = await fetch(
          `/api/events/${eventId}/judge-tasks?initialId=${initialId}&divisionId=${divisionId}&raceId=${raceId}&eventName=${catEvent}`
        );
        const data = await res.json();

        if (res.ok && data?.success) {
          setTeams(data.teams || []);
        } else {
          setTeams([]);
          pushToast({ title: "Data Tim Kosong", text: "Tidak ada tim untuk kategori ini", type: "info" });
        }
      } catch (err) {
        console.error("❌ Failed to fetch teams:", err);
        setTeams([]);
        pushToast({ title: "Error", text: "Gagal memuat data tim", type: "error" });
      } finally {
        setLoadingTeams(false);
      }
    };

    setLoadingTeams(true);
    fetchTeams();
  }, [eventId, selectedCategory, pushToast]);

  // Fetch event detail
  useEffect(() => {
    if (!eventId) return;
    const fetchEventDetail = async () => {
      setLoadingEvent(true);
      try {
        const res = await fetch(`/api/matches/${eventId}`);
        const data = await res.json();
        const evt = data.event || data;
        setEventDetail(evt || null);
      } catch {
        setEventDetail(null);
      } finally {
        setLoadingEvent(false);
      }
    };
    fetchEventDetail();
  }, [eventId]);

  // Socket connect
  useEffect(() => {
    const socket = getSocket();
    socketRef.current = socket;

    const handler = msg => {
      if (msg?.senderId && msg.senderId === socketRef.current?.id) return;
      pushToast({
        title: msg.from ? `Pesan dari ${msg.from}` : "Notifikasi",
        text: msg.text || "Pesan baru diterima",
        type: "info",
      });
    };

    socket.on("custom:event", handler);
    return () => socket.off("custom:event", handler);
  }, [pushToast]);

  /* ------------------------------ Callbacks ------------------------------- */
  const handleCategoryChange = useCallback(value => {
    setSelectedCategory(value);
    setSelectedTeam("");
    setTeams([]);
    setLoadingTeams(true);
  }, []);

  const openHistoryModal = useCallback(async () => {
    setIsHistoryOpen(true);
    setLoadingHistory(true);

    try {
      const url = new URL(`/api/judges/judge-reports/detail`, window.location.origin);
      url.searchParams.set("fromReport", "true");
      if (eventId) url.searchParams.set("eventId", eventId);
      url.searchParams.set("eventType", "SPRINT");
      // Optional filter per tim:
      // if (selectedTeam) url.searchParams.set("team", selectedTeam);

      const res = await fetch(url.toString(), { cache: "no-store" });
      const data = await res.json();

      if (res.ok && Array.isArray(data?.data)) {
        setHistoryData(data.data);
      } else {
        setHistoryData([]);
        pushToast({ title: "Tidak ada riwayat", text: "Belum ada data penalty", type: "info" });
      }
    } catch (err) {
      console.error("❌ Fetch history error:", err);
      setHistoryData([]);
      pushToast({ title: "Error", text: "Gagal memuat riwayat penalty", type: "error" });
    } finally {
      setLoadingHistory(false);
    }
  }, [eventId, pushToast /*, selectedTeam*/]);

  const refreshTeams = useCallback(async () => {
    if (!selectedCategory || !eventId) return;
    try {
      const [initialId, divisionId, raceId] = selectedCategory.split("|");
      const catEvent = "SPRINT";
      const res = await fetch(
        `/api/events/${eventId}/judge-tasks?initialId=${initialId}&divisionId=${divisionId}&raceId=${raceId}&eventName=${catEvent}&t=${Date.now()}`
      );
      const data = await res.json();
      if (res.ok && data?.success) setTeams(data.teams || []);
    } catch (error) {
      console.error("❌ Failed to refresh teams:", error);
      pushToast({ title: "Refresh Gagal", text: "Gagal memuat ulang data tim", type: "error" });
    }
  }, [eventId, selectedCategory, pushToast]);

  const sendRealtimeMessage = useCallback(() => {
    const socket = socketRef.current || getSocket();
    if (!socket) return;
    socket.emit(
      "custom:event",
      {
        senderId: socket.id,
        from: "Judges Dashboard",
        text: "Pesan realtime ke operator timing",
        teamId: selectedTeam,
        type: assignedPosition,
        value: selectedPenalty,
        ts: new Date().toISOString(),
      },
      ok => {
        if (ok) {
          pushToast({ title: "Berhasil", text: "Pesan terkirim ke operator timing", type: "success" });
        }
      }
    );
  }, [assignedPosition, selectedPenalty, selectedTeam, pushToast]);

  const handleSubmit = useCallback(
    async e => {
      e.preventDefault();
      if (isSubmitDisabled) {
        pushToast({
          title: "Data Belum Lengkap",
          text: "Pilih kategori, tim, penalty, dan pastikan posisi Start/Finish terassign.",
          type: "error",
        });
        return;
      }

      const [initialId, divisionId, raceId] = selectedCategory.split("|");
      const formData = {
        eventType: "SPRINT",
        position: assignedPosition,
        team: selectedTeam,
        penalty: selectedPenalty,
        eventId,
        initialId,
        divisionId,
        raceId,
      };

      setLoading(true);
      try {
        const res = await fetch(`/api/judges/judge-reports/detail`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });

        let data = null;
        try {
          data = await res.json();
        } catch {
          // non-JSON, biarkan
        }

        if (res.ok && data?.success) {
          pushToast({
            title: "Berhasil!",
            text: `✅ ${assignedPosition} Penalty: ${selectedPenalty} points tersimpan.`,
            type: "success",
          });
          sendRealtimeMessage();
          await refreshTeams();
          setSelectedTeam("");
          setSelectedPenalty(null);
        } else {
          const msg = data?.message || `HTTP ${res.status}`;
          pushToast({ title: "Error Submit", text: `❌ ${msg}`, type: "error" });
        }
      } catch (err) {
        console.error("Submit error:", err);
        pushToast({ title: "Network Error", text: "❌ Gagal mengirim data! Coba lagi.", type: "error" });
      } finally {
        setLoading(false);
      }
    },
    [
      isSubmitDisabled,
      selectedCategory,
      assignedPosition,
      selectedTeam,
      selectedPenalty,
      eventId,
      pushToast,
      sendRealtimeMessage,
      refreshTeams,
    ]
  );

  /* --------------------------------- JSX ---------------------------------- */
  return (
    <>
      {/* Toasts */}
      <div className="fixed top-6 right-6 z-50 flex flex-col gap-4">
        {toasts.map(toast => (
          <motion.div
            key={toast.id}
            initial={{ x: 200, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 200, opacity: 0 }}
            className={`p-4 rounded-xl shadow-lg border backdrop-blur-xl bg-white/70 relative overflow-hidden
              ${
                toast.type === "error"
                  ? "border-red-300 text-red-800"
                  : toast.type === "success"
                  ? "border-green-300 text-green-800"
                  : "border-blue-300 text-blue-800"
              }`}
          >
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <p className="font-semibold text-sm">{toast.title}</p>
                <p className="text-sm opacity-90">{toast.text}</p>
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="p-1 rounded-full hover:bg-black/10"
                aria-label="Close toast"
              >
                ✕
              </button>
            </div>
            <motion.div
              initial={{ width: "100%" }}
              animate={{ width: 0 }}
              transition={{ duration: 4, ease: "linear" }}
              className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-indigo-500 to-purple-500"
            />
          </motion.div>
        ))}
      </div>

      <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4 py-8">
        <div className="w-full max-w-md bg-white p-6 rounded-2xl shadow-lg relative">
          {/* Back */}
          <div className="text-start my-2">
            <Link href="/judges">
              <button className="surface-text-sts hover:underline">← Back to Judges</button>
            </Link>
          </div>

          {/* Event header */}
          {eventDetail && (
            <div className="mb-4 space-y-1 bg-gray-100 p-4 rounded-lg">
              <div className="font-semibold">{eventDetail.eventName}</div>
              <div className="text-sm text-gray-600">
                {new Date(eventDetail.startDateEvent).toLocaleDateString("id-ID", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                })}
                {" – "}
                {new Date(eventDetail.endDateEvent).toLocaleDateString("id-ID", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                })}
              </div>
              <div className="text-sm text-gray-600">
                {eventDetail.addressProvince}, {eventDetail.addressState}
              </div>
            </div>
          )}

          {/* Title */}
          <div className="text-center mb-5">
            <h1 className="text-2xl font-bold text-gray-800">Judges {assignedPosition || "—"}</h1>
            <small className="text-center">Race Number : Sprint Race</small>
            {!assignedPosition && (
              <div className="mt-2 text-xs text-red-600">
                Posisi belum ter-assign untuk event ini. Hubungi admin assignment.
              </div>
            )}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Category */}
            <div>
              <label className="block text-gray-700 mb-2">Category:</label>
              {loadingEvent ? (
                <p className="text-gray-500 text-sm">Loading categories...</p>
              ) : combinedCategories.length ? (
                <select
                  value={selectedCategory}
                  onChange={e => handleCategoryChange(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg"
                  required
                >
                  <option value="">Select Category</option>
                  {combinedCategories.map(opt => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              ) : (
                <p className="text-gray-500 text-sm">No categories available.</p>
              )}
            </div>

            {/* Team */}
            <div>
              <label className="block text-gray-700 mb-2">Team:</label>
              {loadingTeams ? (
                <select disabled className="w-full px-4 py-2 border rounded-lg bg-gray-100 text-gray-400">
                  <option>Select Teams...</option>
                </select>
              ) : filteredTeams.length ? (
                <select
                  value={selectedTeam}
                  onChange={e => setSelectedTeam(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg"
                  required
                >
                  <option value="" disabled>
                    Select Team
                  </option>
                  {filteredTeams.map(team => (
                    <option key={team._id} value={team._id}>
                      {team.nameTeam} (BIB {team.bibTeam})
                    </option>
                  ))}
                </select>
              ) : (
                <select disabled className="w-full px-4 py-2 border rounded-lg bg-gray-100 text-gray-400">
                  <option>No teams available for this category.</option>
                </select>
              )}
            </div>

            {/* Penalty */}
            <div className="space-y-2">
              <div className="text-sm text-gray-600 mb-2">Select Penalty:</div>
              {PENALTIES.map(pen => (
                <button
                  key={pen}
                  type="button"
                  onClick={() => setSelectedPenalty(prev => (prev === pen ? null : pen))}
                  className={`w-full py-3 rounded-lg border ${
                    selectedPenalty === pen
                      ? "bg-blue-100 surface-border-sts surface-text-sts font-semibold"
                      : "bg-white border-gray-300 text-gray-700"
                  }`}
                  aria-pressed={selectedPenalty === pen}
                >
                  Penalty: {pen} points
                </button>
              ))}
              {selectedPenalty === null && (
                <div className="text-xs text-gray-500">Pilih salah satu penalty.</div>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 w-full">
              <button
                type="button"
                onClick={openHistoryModal}
                className="w-full sm:w-1/2 py-3 btn-outline-sts rounded-lg font-semibold shadow-md hover:btnActive-sts hover:text-white disabled:bg-gray-400 transition"
                disabled={loading}
              >
                View History
              </button>

              <button
                type="submit"
                className="w-full sm:w-1/2 py-3 bg-green-500 text-white rounded-lg font-semibold shadow-md hover:bg-green-600 disabled:bg-gray-400 transition"
                disabled={isSubmitDisabled}
              >
                {loading ? "Processing..." : "Submit →"}
              </button>
            </div>
          </form>
        </div>

        {/* Modal: History */}
        {isHistoryOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
            <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="px-6 py-4 border-b flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">History</h2>
                <button
                  onClick={() => setIsHistoryOpen(false)}
                  className="p-2 rounded-full hover:bg-red-50 text-red-500"
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>

              {/* Body */}
              <div className="p-4 max-h-[70vh] overflow-y-auto">
                {loadingHistory ? (
                  <p className="text-center text-gray-500 py-10">Loading history…</p>
                ) : historyData.length === 0 ? (
                  <p className="text-center text-gray-500 py-10">No history yet.</p>
                ) : (
                  <ul className="space-y-3">
                    {historyData.map((item, idx) => {
                      const p = Number(item.penalty ?? 0);
                      const color =
                        p >= 50
                          ? "bg-red-100 text-red-600 ring-red-200"
                          : p >= 10
                          ? "bg-amber-100 text-amber-600 ring-amber-200"
                          : "bg-emerald-100 text-emerald-600 ring-emerald-200";

                      const title = `${item?.divisionName || "Category"} - Sprint`;
                      const subtitle =
                        `${item?.teamInfo?.nameTeam || "Team"} BIB ${item?.teamInfo?.bibTeam || "-"}` +
                        ` • Penalty: ${p} points`;
                      const timeStr = item?.createdAt
                        ? new Date(item.createdAt).toLocaleTimeString("id-ID", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "-";

                      return (
                        <li
                          key={item._id || idx}
                          className="flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm hover:shadow transition"
                        >
                          <div className={`grid place-items-center h-12 w-12 rounded-xl ring ${color}`}>
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-6 w-6">
                              <path
                                fill="currentColor"
                                d="M6 2a1 1 0 0 0-1 1v18h2v-6h9l-1-4 1-4H7V3a1 1 0 0 0-1-1Z"
                              />
                            </svg>
                          </div>
                          <div className="flex-1">
                            <div className="font-semibold text-gray-900">{title}</div>
                            <div className="text-gray-600 text-sm">{subtitle}</div>
                          </div>
                          <div className="text-xs text-gray-500 whitespace-nowrap">{timeStr}</div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t flex justify-end">
                <button
                  onClick={() => setIsHistoryOpen(false)}
                  className="px-5 py-2.5 rounded-xl border border-red-300 text-red-600 font-medium hover:bg-red-50"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default JudgesSprintPages;