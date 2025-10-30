"use client";
import Link from "next/link";
import getSocket from "@/utils/socket";
import { useSearchParams } from "next/navigation";
import { useState, useEffect, useMemo, useRef } from "react";
import ResultDRR from "@/components/ResultDRR";
import { motion } from "framer-motion";

const JudgesDRRPages = () => {
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
  const [selectedSection, setSelectedSection] = useState("");

  const [drrResults, setDrrResults] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [events, setEvents] = useState([]);
  const [error, setError] = useState(null);
  const [toasts, setToasts] = useState([]);
  const toastId = useRef(1);
  const socketRef = useRef(null);

  // History states (ditambahkan)
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [historyData, setHistoryData] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const penalties = [0, -10, 10, 50];

  // Toast handler
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

  // ✅ GET DRR POSITIONS (Sections, Start, Finish)
  function getDRRPositionsFromAssignments(list, evId) {
    if (!Array.isArray(list) || !evId) return [];
    const allJudges = list.flatMap((item) => item.judges || []);
    const match = allJudges.find((j) => String(j.eventId) === String(evId));
    if (!match?.drr) return [];

    const positions = [];
    if (Array.isArray(match.drr.sections)) {
      positions.push(...match.drr.sections.map((s) => `Section ${s}`));
    }
    if (match.drr.start) positions.push("Start");
    if (match.drr.finish) positions.push("Finish");
    return positions;
  }

  const assignedPositions = useMemo(() => {
    return getDRRPositionsFromAssignments(assignments, eventId);
  }, [assignments, eventId]);

  // ✅ SOCKET CONNECTION
  useEffect(() => {
    const socket = getSocket();
    socketRef.current = socket;

    const handler = (msg) => {
      if (msg?.senderId && msg.senderId === socketRef.current?.id) return;
      pushToast({
        title: msg.from ? `Pesan dari ${msg.from}` : "Notifikasi",
        text: msg.text || "Pesan baru diterima",
        type: "info",
      });
    };

    socket.on("custom:event", handler);
    return () => socket.off("custom:event", handler);
  }, []);

  // ✅ SEND REALTIME MESSAGE FUNCTION
  const sendRealtimeMessage = (operationType, sectionNumber) => {
    const socket = socketRef.current || getSocket();
    if (!socket) return;

    const selectedTeamData = teams.find((t) => t._id === selectedTeam);
    const teamName = selectedTeamData?.nameTeam || "Unknown Team";

    // ✅ ubah section menjadi angka saja jika format "Section X"
    let sectionValue = selectedSection;
    if (selectedSection && selectedSection.startsWith("Section ")) {
      sectionValue = selectedSection.replace("Section ", "");
    }

    let messageData = {
      senderId: socket.id,
      from: "Judges Dashboard - DRR",
      text: `DRR: ${teamName} - ${selectedSection} - Penalty ${selectedPenalty}`,
      teamId: selectedTeam,
      teamName: teamName,
      value: selectedPenalty,
      section: sectionValue,
      penalty: Number(selectedPenalty),
      eventId: eventId,
      ts: new Date().toISOString(),
    };

    // Tentukan tipe message
    if (operationType === "start") messageData.type = "PenaltyStart";
    else if (operationType === "finish") messageData.type = "PenaltyFinish";
    else messageData.type = "PenaltyGates";

    socket.emit("custom:event", messageData, (ok) => {
      if (ok) {
        console.log("✅ [DRR SOCKET] Message delivered to operator");
      } else {
        console.log("❌ [DRR SOCKET] Message failed to deliver");
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
      const catEvent = "DRR";

      const res = await fetch(
        `/api/events/${eventId}/judge-tasks?initialId=${initialId}&divisionId=${divisionId}&raceId=${raceId}&eventName=${catEvent}&t=${Date.now()}`
      );

      const data = await res.json();
      if (res.ok && data?.success) {
        setTeams(data.teams || []);
      }
    } catch (error) {
      console.error("❌ Failed to refresh DRR teams:", error);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setError(null);
        setLoading(true);
        const judgesRes = await fetch("/api/judges", { cache: "no-store" });
        const judgesData = await judgesRes.json();
        if (judgesData.user) setUser(judgesData.user);
        setEvents(judgesData.events || []);
        const userEmail = judgesData.user?.email;
        if (!userEmail) throw new Error("Email tidak ditemukan");
        const assignmentsRes = await fetch(
          `/api/assignments?email=${encodeURIComponent(userEmail)}`,
          { cache: "no-store" }
        );
        const assignmentsData = await assignmentsRes.json();
        setAssignments(assignmentsData.data || []);
      } catch (err) {
        console.error(err);
        setError(err.message);
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
        const catEvent = "DRR";
        const res = await fetch(
          `/api/events/${eventId}/judge-tasks?initialId=${initialId}&divisionId=${divisionId}&raceId=${raceId}&eventName=${catEvent}`
        );
        const data = await res.json();

        if (res.ok && data?.success) {
          setTeams(data.teams || []);
          console.log("🔍 DRR Teams loaded:", data.teams);
        } else {
          setTeams([]);
          pushToast({
            title: "Data Tim Kosong",
            text: "Tidak ada tim untuk kategori ini",
            type: "info",
          });
        }
      } catch (err) {
        console.error("❌ Failed to fetch DRR teams:", err);
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
        setEventDetail(data.event || data);
      } catch {
        setEventDetail(null);
      } finally {
        setLoadingEvent(false);
      }
    };
    fetchEventDetail();
  }, [eventId]);

  useEffect(() => {
    if (!isModalOpen) return;
    const fetchDRRResults = async () => {
      try {
        const res = await fetch("/api/judges/drr");
        const data = await res.json();
        if (res.ok) setDrrResults(data.data || []);
      } catch {}
    };
    fetchDRRResults();
  }, [isModalOpen]);

  const combinedCategories = useMemo(() => {
    const list = [];
    const initials = eventDetail?.categoriesInitial || [];
    const divisions = eventDetail?.categoriesDivision || [];
    const races = eventDetail?.categoriesRace || [];
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
    setSelectedSection("");
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

  // ✅ SUBMIT HANDLER YANG DIPERBAIKI
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (
      !selectedCategory ||
      !selectedTeam ||
      !selectedSection ||
      selectedPenalty === null
    ) {
      pushToast({
        title: "Data Belum Lengkap",
        text: "Harap pilih kategori, tim, section, dan penalty sebelum submit",
        type: "error",
      });
      return;
    }

    // ✅ CEK APAKAH TEAM VALID (PUNYA teamId)
    const selectedTeamData = teams.find((t) => t._id === selectedTeam);

    if (!selectedTeamData?.hasValidTeamId) {
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

    // ✅ EXTRACT SECTION NUMBER (jika "Section X")
    // ✅ Tentukan jenis operasi berdasarkan pilihan
    let operationType = "section";
    let sectionNumber = selectedSection;
    if (selectedSection.startsWith("Section ")) {
      sectionNumber = parseInt(selectedSection.replace("Section ", ""));
    } else if (selectedSection === "Start") {
      operationType = "start";
    } else if (selectedSection === "Finish") {
      operationType = "finish";
    }

    const payload = {
      eventType: "DRR",
      team: actualTeamId,
      penalty: selectedPenalty,
      section: sectionNumber, // bisa null kalau bukan section
      eventId,
      initialId,
      divisionId,
      raceId,
      operationType, // 'section' | 'start' | 'finish'
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

      if (res.ok && data?.success) {
        pushToast({
          title: "Berhasil!",
          text: `✅ ${selectedSection}: Penalty ${selectedPenalty} berhasil disimpan!`,
          type: "success",
        });

        // ✅ KIRIM REALTIME MESSAGE KE OPERATOR
        sendRealtimeMessage();

        // Refresh teams data
        await refreshTeams();

        // Reset form (opsional)
        setSelectedPenalty(null);
      } else {
        const msg = data?.message || `HTTP ${res.status}`;
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

  /* ========== OPEN HISTORY (fungsi & modal, sama seperti sebelumnya) ========== */
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
      url.searchParams.set("eventType", "DRR");
      // optional: if (selectedTeam) url.searchParams.set('team', selectedTeam)

      const res = await fetch(url.toString(), { cache: "no-store" });
      const data = await res.json();

      if (res.ok && Array.isArray(data?.data)) {
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
        <div className="w-full max-w-md bg-white p-6 rounded-2xl shadow-lg relative">
          <div className="text-start my-4">
            <Link href="/judges">
              <button className="text-blue-500 hover:underline">
                ← Back to Judges
              </button>
            </Link>
          </div>

          {/* DETAIL EVENTS  */}
          {eventDetail && (
            <div className="mb-4 space-y-1 bg-gray-100 p-4 rounded-lg">
              <div className="font-semibold">{eventDetail.eventName}</div>
              <div className="text-sm text-gray-600">
                {new Date(eventDetail.startDateEvent).toLocaleDateString(
                  "id-ID",
                  {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  }
                )}{" "}
                –{" "}
                {new Date(eventDetail.endDateEvent).toLocaleDateString(
                  "id-ID",
                  {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  }
                )}
              </div>
              <div className="text-sm text-gray-600">
                {eventDetail.addressProvince}, {eventDetail.addressState}
              </div>
            </div>
          )}

          <h1 className="text-2xl font-bold text-center text-gray-800 mb-2">
            Judges {assignedPositions.join(", ") || "DRR"}
          </h1>
          <small className="text-center block mb-4">
            Race Number : DRR Race
          </small>

          {/* ✅ BUTTON TEST REALTIME MESSAGE */}
          <div className="mb-6 text-center">
            <button
              onClick={sendRealtimeMessage}
              disabled={!selectedTeam || !selectedSection}
              className={`px-5 py-2.5 w-full rounded-xl shadow transition-all ${
                !selectedTeam || !selectedSection
                  ? "bg-gray-400 cursor-not-allowed text-white"
                  : "bg-blue-600 text-white hover:shadow-lg hover:scale-105"
              }`}
            >
              Test Kirim Pesan ke Operator
            </button>
            <p className="text-xs text-gray-500 mt-2">
              *Button untuk test mengirim pesan realtime ke operator timing
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* CATEGORY */}
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
                  className="w-full px-4 py-2 border rounded-lg"
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

            {/* TEAM */}
            <div>
              <label className="block text-gray-700 mb-2">Select Team:</label>
              {loadingTeams ? (
                <select
                  disabled
                  className="w-full px-4 py-2 border rounded-lg bg-gray-100 text-gray-400"
                >
                  <option>Loading teams...</option>
                </select>
              ) : filteredTeams.length ? (
                <select
                  value={selectedTeam}
                  onChange={(e) => setSelectedTeam(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg"
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
                  className="w-full px-4 py-2 border rounded-lg bg-gray-100 text-gray-400"
                >
                  <option>No teams available for this category</option>
                </select>
              )}

              {/* WARNING MESSAGE */}
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

            {/* SECTION */}
            <div>
              <label className="block text-gray-700 mb-2">
                Select Section:
              </label>
              <select
                value={selectedSection}
                onChange={(e) => setSelectedSection(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg"
                required
              >
                <option value="">Select Section</option>
                {assignedPositions.map((position, index) => (
                  <option key={index} value={position}>
                    {position}
                  </option>
                ))}
              </select>
            </div>

            {/* PENALTY */}
            <div className="space-y-2">
              <div className="text-sm text-gray-600 mb-2">Select Penalty:</div>
              {penalties.map((pen) => (
                <button
                  key={pen}
                  type="button"
                  onClick={() => setSelectedPenalty(pen)}
                  className={`w-full py-3 rounded-lg border ${
                    selectedPenalty === pen
                      ? "bg-blue-100 border-blue-500 text-blue-700 font-semibold"
                      : "bg-white border-gray-300 text-gray-700"
                  }`}
                >
                  Penalty: {pen} points
                </button>
              ))}
            </div>

            {/* ACTIONS: View History + Submit (posisi sama seperti sebelumnya) */}
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
                disabled={loading}
                className={`w-full sm:w-1/2 py-3 rounded-lg font-semibold shadow-md transition duration-300 ${
                  loading
                    ? "bg-gray-400 cursor-not-allowed text-white"
                    : "bg-blue-500 hover:bg-blue-600 text-white"
                }`}
              >
                {loading ? "Submitting..." : "Submit →"}
              </button>
            </div>
          </form>

          {/* <div className='text-center mt-4'>
            <button
              onClick={() => setIsModalOpen(true)}
              className='text-blue-500 hover:underline'>
              View Result
            </button>
          </div> */}
        </div>

        {/* Modal Result */}
        <ResultDRR
          isOpen={isModalOpen}
          closeModal={() => setIsModalOpen(false)}
          resultData={{ team: selectedTeam, penalty: selectedPenalty }}
        />

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

                      const title = `${item?.divisionName || "Category"} - DRR`;
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

export default JudgesDRRPages;
