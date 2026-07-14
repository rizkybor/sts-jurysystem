"use client";
import Link from "next/link";
import getSocket from "@/utils/socket";
import { useSearchParams } from "next/navigation";
import { useState, useEffect, useMemo, useRef } from "react";
import ResultRaftingCross from "@/components/ResultRaftingCross";
import { motion } from "framer-motion";

const JudgesRaftingCrossPage = () => {
  const searchParams = useSearchParams();
  const eventId = searchParams.get("eventId");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [user, setUser] = useState(null);
  const [eventDetail, setEventDetail] = useState(null);
  const [loadingEvent, setLoadingEvent] = useState(true);
  const [teams, setTeams] = useState([]);
  const [loadingTeams, setLoadingTeams] = useState(true);

  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedTeam, setSelectedTeam] = useState("");
  const [selectedPenalty, setSelectedPenalty] = useState(null);
  const [selectedGate, setSelectedGate] = useState("");

  const [assignments, setAssignments] = useState([]);
  const [events, setEvents] = useState([]);
  const [error, setError] = useState(null);
  const [toasts, setToasts] = useState([]);
  const toastId = useRef(1);
  const socketRef = useRef(null);

  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [historyData, setHistoryData] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const GATE_PENALTIES = useMemo(() => [0, 5, 50], []);

  const pushToast = (msg, ttlMs = 4000) => {
    const id = toastId.current++;
    setToasts((prev) => [...prev, { id, ...msg }]);
    setTimeout(
      () => setToasts((prev) => prev.filter((t) => t.id !== id)),
      ttlMs
    );
  };
  const removeToast = (id) =>
    setToasts((prev) => prev.filter((t) => t.id !== id));

  // ✅ GET RX POSITIONS (Gate 1, Gate 2)
  function getRXPositionsFromAssignments(list, evId) {
    if (!Array.isArray(list) || !evId) return [];
    const allJudges = list.flatMap((item) => item.judges || []);
    const match = allJudges.find((j) => String(j.eventId) === String(evId));
    if (!match || !match.rx) return [];

    const positions = [];
    if (Array.isArray(match.rx.gates)) {
      positions.push(...match.rx.gates.map((g) => `Gate ${g}`));
    }
    return positions;
  }

  const assignedPositions = useMemo(() => {
    return getRXPositionsFromAssignments(assignments, eventId);
  }, [assignments, eventId]);

  // ✅ SOCKET CONNECTION
  useEffect(() => {
    const socket = getSocket();
    socketRef.current = socket;

    const handler = (msg) => {
      if (
        msg &&
        msg.senderId &&
        socketRef.current &&
        msg.senderId === socketRef.current.id
      )
        return;
      if (msg && msg.type === "chat") return;
      pushToast({
        title: msg && msg.from ? `Pesan dari ${msg.from}` : "Notifikasi",
        text: msg && msg.text ? msg.text : "Pesan baru diterima",
        type: "info",
      });
    };

    socket.on("custom:event", handler);
    return () => socket.off("custom:event", handler);
  }, []);

  // ✅ SEND REALTIME MESSAGE FUNCTION — kontrak persis applyPenaltyFromSocketRX
  // (sts-timingsystem RaftingCross.vue)
  const sendRealtimeMessage = (gateNumber) => {
    const socket = socketRef.current || getSocket();
    if (!socket) return;

    const selectedTeamData = teams.find((t) => t._id === selectedTeam);
    const teamName =
      selectedTeamData && selectedTeamData.nameTeam
        ? selectedTeamData.nameTeam
        : "Unknown Team";
    const actualTeamId =
      selectedTeamData && selectedTeamData.teamId
        ? selectedTeamData.teamId
        : selectedTeam;

    const messageData = {
      senderId: socket.id,
      from: "Judges Dashboard - Rafting Cross",
      text: `RX: ${teamName} - Gate ${gateNumber} - Penalty ${selectedPenalty}`,
      teamId: actualTeamId,
      teamName: teamName,
      type: gateNumber === 1 ? "PenaltyGate1" : "PenaltyGate2",
      gate: gateNumber === 1 ? "gate1" : "gate2",
      value: Number(selectedPenalty),
      eventId: eventId,
      ts: new Date().toISOString(),
    };

    socket.emit("custom:event", messageData, (ok) => {
      if (ok) {
        console.log("✅ [RX SOCKET] Message delivered to operator");
      } else {
        console.log("❌ [RX SOCKET] Message failed to deliver");
        pushToast({
          title: "Peringatan",
          text: "Pesan tidak terkirim ke operator",
          type: "warning",
        });
      }
    });
  };

  // ✅ REFRESH TEAMS FUNCTION
  const refreshTeams = async () => {
    if (!selectedCategory || !eventId) return;

    try {
      const [initialId, divisionId, raceId] = selectedCategory.split("|");
      const res = await fetch(
        `/api/events/${eventId}/judge-tasks?initialId=${initialId}&divisionId=${divisionId}&raceId=${raceId}&eventName=RX&t=${Date.now()}`
      );

      const data = await res.json();
      if (res.ok && data && data.success) {
        setTeams(data.teams || []);
      }
    } catch (error) {
      console.error("❌ Failed to refresh RX teams:", error);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setError(null);
        setLoading(true);
        const judgesRes = await fetch("/api/judges", { cache: "no-store" });
        const judgesData = await judgesRes.json();
        if (judgesData && judgesData.user) setUser(judgesData.user);
        setEvents((judgesData && judgesData.events) || []);
        const userEmail =
          judgesData && judgesData.user && judgesData.user.email;
        if (!userEmail) throw new Error("Email tidak ditemukan");
        const assignmentsRes = await fetch(
          `/api/assignments?email=${encodeURIComponent(userEmail)}`,
          { cache: "no-store" }
        );
        const assignmentsData = await assignmentsRes.json();
        setAssignments((assignmentsData && assignmentsData.data) || []);
      } catch (err) {
        console.error(err);
        setError(err && err.message ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (!eventId || !selectedCategory) return;
    const fetchTeams = async () => {
      try {
        const [initialId, divisionId, raceId] = selectedCategory.split("|");
        const res = await fetch(
          `/api/events/${eventId}/judge-tasks?initialId=${initialId}&divisionId=${divisionId}&raceId=${raceId}&eventName=RX`
        );
        const data = await res.json();

        if (res.ok && data && data.success) {
          setTeams(data.teams || []);
        } else {
          setTeams([]);
          pushToast({
            title: "Data Tim Kosong",
            text: "Tidak ada tim untuk kategori ini",
            type: "info",
          });
        }
      } catch (err) {
        console.error("❌ Failed to fetch RX teams:", err);
        setTeams([]);
        pushToast({
          title: "Error",
          text: "Gagal memuat data tim",
          type: "error",
        });
      } finally {
        setLoadingTeams(false);
      }
    };
    setLoadingTeams(true);
    fetchTeams();
  }, [eventId, selectedCategory]);

  useEffect(() => {
    if (!eventId) return;
    const fetchEventDetail = async () => {
      setLoadingEvent(true);
      try {
        const res = await fetch(`/api/matches/${eventId}`);
        const data = await res.json();
        setEventDetail((data && (data.event || data)) || null);
      } catch {
        setEventDetail(null);
      } finally {
        setLoadingEvent(false);
      }
    };
    fetchEventDetail();
  }, [eventId]);

  const combinedCategories = useMemo(() => {
    const list = [];
    const initials = (eventDetail && eventDetail.categoriesInitial) || [];
    const divisions = (eventDetail && eventDetail.categoriesDivision) || [];
    const races = (eventDetail && eventDetail.categoriesRace) || [];
    initials.forEach((initial) => {
      divisions.forEach((division) => {
        races.forEach((race) => {
          list.push({
            label: `${initial.name} - ${division.name} - ${race.name}`,
            value: `${initial.value}|${division.value}|${race.value}`,
          });
        });
      });
    });
    return list;
  }, [eventDetail]);

  const handleCategoryChange = (value) => {
    setSelectedCategory(value);
    setSelectedTeam("");
    setSelectedGate("");
    setSelectedPenalty(null);
    setTeams([]);
    setLoadingTeams(true);
  };

  const filteredTeams = useMemo(() => {
    if (!selectedCategory) return [];
    const [initialId, divisionId, raceId] = selectedCategory.split("|");
    return teams.filter(
      (team) =>
        String(team.initialId) === String(initialId) &&
        String(team.divisionId) === String(divisionId) &&
        String(team.raceId) === String(raceId)
    );
  }, [selectedCategory, teams]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (
      !selectedCategory ||
      !selectedTeam ||
      !selectedGate ||
      selectedPenalty === null
    ) {
      pushToast({
        title: "Data Belum Lengkap",
        text: "Harap pilih kategori, tim, gate, dan penalty sebelum submit",
        type: "error",
      });
      return;
    }

    const selectedTeamData = teams.find((t) => t._id === selectedTeam);

    if (!selectedTeamData || !selectedTeamData.hasValidTeamId) {
      pushToast({
        title: "Team Tidak Valid",
        text: `Team ${selectedTeamData?.nameTeam} tidak memiliki ID yang valid dan tidak bisa submit penalty. Silakan pilih team lain.`,
        type: "warning",
        ttlMs: 6000,
      });
      return;
    }

    const [initialId, divisionId, raceId] = selectedCategory.split("|");
    const actualTeamId = selectedTeamData.teamId;
    const gateNumber = parseInt(selectedGate.replace("Gate ", ""), 10);
    const operationType = gateNumber === 1 ? "gate1" : "gate2";

    const payload = {
      eventType: "RX",
      team: actualTeamId,
      penalty: selectedPenalty,
      eventId,
      initialId,
      divisionId,
      raceId,
      operationType,
    };

    setLoading(true);

    try {
      const res = await fetch("/api/judges/judge-reports/detail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      let data = null;
      try {
        data = await res.json();
      } catch {
        // non-JSON response
      }

      if (res.ok && data && data.success) {
        pushToast({
          title: "Berhasil!",
          text: `✅ ${selectedGate}: Penalty ${selectedPenalty} berhasil disimpan!`,
          type: "success",
        });

        sendRealtimeMessage(gateNumber);

        await refreshTeams();

        setSelectedPenalty(null);
      } else {
        const msg = (data && data.message) || `HTTP ${res.status}`;
        pushToast({
          title: "Error Submit",
          text: `❌ ${msg}`,
          type: "error",
        });
      }
    } catch (err) {
      console.error("Submit error:", err);
      pushToast({
        title: "Network Error",
        text: "❌ Gagal mengirim data! Coba lagi.",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const openHistoryModal = async () => {
    setIsHistoryOpen(true);
    setLoadingHistory(true);

    try {
      const url = new URL(
        "/api/judges/judge-reports/detail",
        window.location.origin
      );
      url.searchParams.set("fromReport", "true");
      if (eventId) url.searchParams.set("eventId", eventId);
      url.searchParams.set("eventType", "RX");

      const res = await fetch(url.toString(), { cache: "no-store" });
      const data = await res.json();

      if (res.ok && Array.isArray(data && data.data ? data.data : [])) {
        setHistoryData(data.data);
      } else {
        setHistoryData([]);
        pushToast({
          title: "Tidak ada riwayat",
          text: "Belum ada data penalty",
          type: "info",
        });
      }
    } catch (err) {
      console.error("❌ Fetch history error:", err);
      setHistoryData([]);
      pushToast({
        title: "Error",
        text: "Gagal memuat riwayat penalty",
        type: "error",
      });
    } finally {
      setLoadingHistory(false);
    }
  };

  return (
    <>
      <div className="fixed top-6 right-6 z-50 flex flex-col gap-4">
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ x: 200, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 200, opacity: 0 }}
            className={`p-4 rounded-xl shadow-lg border backdrop-blur-xl bg-white/70 relative overflow-hidden ${
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
        <div className="w-full max-w-md sm:max-w-lg md:max-w-xl bg-white p-6 md:p-8 rounded-2xl shadow-lg relative">
          <div className="text-start my-4">
            <Link href="/judges">
              <button className="inline-flex items-center gap-1 py-2 text-sm font-medium surface-text-sts hover:underline">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                  <path fillRule="evenodd" d="M17 10a.75.75 0 0 1-.75.75H5.612l4.158 3.96a.75.75 0 1 1-1.04 1.08l-5.5-5.25a.75.75 0 0 1 0-1.08l5.5-5.25a.75.75 0 1 1 1.04 1.08L5.612 9.25H16.25A.75.75 0 0 1 17 10Z" clipRule="evenodd" />
                </svg>
                Back to Judge Dashboard
              </button>
            </Link>
          </div>

          {eventDetail && (
            <div className="mb-4 space-y-1 bg-gray-100 p-4 rounded-lg">
              <div className="font-semibold">{eventDetail.eventName}</div>
              <div className="text-sm text-gray-600">
                {new Date(eventDetail.startDateEvent).toLocaleDateString(
                  "id-ID",
                  { day: "2-digit", month: "long", year: "numeric" }
                )}{" "}
                –{" "}
                {new Date(eventDetail.endDateEvent).toLocaleDateString(
                  "id-ID",
                  { day: "2-digit", month: "long", year: "numeric" }
                )}
              </div>
              <div className="text-sm text-gray-600">
                {eventDetail.addressProvince}, {eventDetail.addressState}
              </div>
            </div>
          )}

          <div className="mb-6 bg-white rounded-2xl shadow-sm p-5 border border-gray-100">
            <small className="block text-sm text-gray-500 tracking-wide">
              Race Number:{" "}
              <span className="font-medium text-gray-700">
                Rafting Cross
              </span>
            </small>
            <div className="text-l font-semibold text-gray-900 mb-3 flex items-center gap-3 flex-wrap">
              Judge Task :
            </div>

            <h1 className="text-2xl font-semibold text-gray-900 mb-3 flex items-center gap-3 flex-wrap">
              {assignedPositions && assignedPositions.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {assignedPositions.map((gate, i) => (
                    <span
                      key={i}
                      className="px-3 py-1 bg-gradient-to-r from-blue-100 to-indigo-200 text-indigo-800 rounded-full text-sm font-medium shadow-sm"
                    >
                      {gate}
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-gray-500 italic">No gates selected</span>
              )}
            </h1>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-gray-700 mb-2">
                Select Category:
              </label>
              {loadingEvent ? (
                <p className="text-gray-500 text-sm">Loading categories...</p>
              ) : combinedCategories.length ? (
                <select
                  value={selectedCategory}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-sts/40 focus:border-sts transition"
                  required
                >
                  <option value="">Select Category</option>
                  {combinedCategories.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              ) : (
                <p className="text-gray-500 text-sm">
                  No categories available.
                </p>
              )}
            </div>

            <div>
              <label className="block text-gray-700 mb-2">Select Team:</label>
              {loadingTeams ? (
                <select
                  disabled
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base bg-gray-100 text-gray-400"
                >
                  <option>Loading teams...</option>
                </select>
              ) : filteredTeams.length ? (
                <select
                  value={selectedTeam}
                  onChange={(e) => setSelectedTeam(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-sts/40 focus:border-sts transition"
                  required
                >
                  <option value="">Select Team</option>
                  {filteredTeams.map((team) => (
                    <option
                      key={team._id}
                      value={team._id}
                      className={
                        !team.hasValidTeamId
                          ? "text-orange-500 bg-orange-50"
                          : ""
                      }
                    >
                      {team.nameTeam} (BIB {team.bibTeam})
                      {!team.hasValidTeamId && " ⚠️ Tidak bisa submit"}
                    </option>
                  ))}
                </select>
              ) : (
                <select
                  disabled
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base bg-gray-100 text-gray-400"
                >
                  <option>No teams available for this category</option>
                </select>
              )}

              {selectedTeam &&
                !filteredTeams.find((t) => t._id === selectedTeam)
                  ?.hasValidTeamId && (
                  <div className="mt-2 p-3 bg-orange-100 border border-orange-300 rounded-lg">
                    <p className="text-orange-800 text-sm font-medium">
                      ⚠️ Team ini tidak memiliki ID yang valid dan tidak bisa
                      menerima penalty.
                    </p>
                    <p className="text-orange-700 text-xs mt-1">
                      Silakan hubungi administrator untuk memperbaiki data team.
                    </p>
                  </div>
                )}
            </div>

            <div>
              <label className="block text-gray-700 mb-2">Select Gate:</label>
              <select
                value={selectedGate}
                onChange={(e) => {
                  setSelectedGate(e.target.value);
                  setSelectedPenalty(null);
                }}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-sts/40 focus:border-sts transition"
                required
              >
                <option value="">Select Gate</option>
                {assignedPositions.map((position, index) => (
                  <option key={index} value={position}>
                    {position}
                  </option>
                ))}
              </select>
            </div>

            <div className="text-center mb-6">
              <div className="inline-block bg-gradient-to-r from-indigo-100 to-blue-50 border border-indigo-200 px-6 py-3 rounded-xl shadow-sm">
                <span className="block text-sm uppercase tracking-wide text-indigo-600 font-semibold mb-1">
                  Assign Penalty
                </span>
                <span className="text-lg font-bold text-gray-800">
                  {selectedGate || "Pilih Select Gate"}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-sm text-gray-600 mb-2">Select Penalty:</div>
              {GATE_PENALTIES.map((pen) => (
                <button
                  key={String(pen)}
                  type="button"
                  onClick={() => setSelectedPenalty(pen)}
                  className={`w-full min-h-[48px] py-3 rounded-lg border text-base ${
                    selectedPenalty === pen
                      ? "bg-blue-100 border-blue-500 text-blue-700 font-semibold"
                      : "bg-white border-gray-300 text-gray-700"
                  }`}
                >
                  Penalty: {pen} points
                </button>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 w-full">
              <button
                type="button"
                onClick={openHistoryModal}
                className="w-full sm:w-1/2 min-h-[48px] py-3 text-base btn-outline-sts rounded-lg font-semibold shadow-md hover:btnActive-sts hover:text-white disabled:bg-gray-400 transition"
                disabled={loading}
              >
                View History
              </button>

              <button
                type="submit"
                disabled={loading}
                className={`w-full sm:w-1/2 min-h-[48px] py-3 text-base rounded-lg font-semibold shadow-md transition duration-300 ${
                  loading
                    ? "bg-gray-400 cursor-not-allowed text-white"
                    : "bg-blue-500 hover:bg-blue-600 text-white"
                }`}
              >
                {loading ? "Submitting..." : "Submit →"}
              </button>
            </div>
          </form>
        </div>

        <ResultRaftingCross
          isOpen={isModalOpen}
          closeModal={() => setIsModalOpen(false)}
          resultData={{ team: selectedTeam, penalty: selectedPenalty }}
        />

        {isHistoryOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
            <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden">
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

              <div className="p-4 max-h-[70vh] overflow-y-auto">
                {loadingHistory ? (
                  <p className="text-center text-gray-500 py-10">
                    Loading history…
                  </p>
                ) : historyData.length === 0 ? (
                  <p className="text-center text-gray-500 py-10">
                    No history yet.
                  </p>
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

                      const title = `${item?.divisionName || "Category"} - RX`;
                      const subtitle =
                        `${item?.teamInfo?.nameTeam || "Team"} BIB ${
                          item?.teamInfo?.bibTeam || "-"
                        }` + ` • Penalty: ${p} points`;
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
                          <div
                            className={`grid place-items-center h-12 w-12 rounded-xl ring ${color}`}
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 24 24"
                              className="h-6 w-6"
                            >
                              <path
                                fill="currentColor"
                                d="M6 2a1 1 0 0 0-1 1v18h2v-6h9l-1-4 1-4H7V3a1 1 0 0 0-1-1Z"
                              />
                            </svg>
                          </div>
                          <div className="flex-1">
                            <div className="font-semibold text-gray-900">
                              {title}
                            </div>
                            <div className="text-gray-600 text-sm">
                              {subtitle}
                            </div>
                          </div>
                          <div className="text-xs text-gray-500 whitespace-nowrap">
                            {timeStr}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              <div className="px-6 py-2 border-t flex justify-end">
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

export default JudgesRaftingCrossPage;
