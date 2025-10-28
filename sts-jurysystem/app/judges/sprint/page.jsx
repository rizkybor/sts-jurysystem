"use client";
import Link from "next/link";
import getSocket from "@/utils/socket";
import { useSearchParams } from "next/navigation";
import { useState, useEffect, useMemo, useRef } from "react";
import ResultSprint from "@/components/ResultSprint";
import { motion } from "framer-motion";

const JudgesSprintPages = () => {
  const searchParams = useSearchParams();
  const eventId = searchParams.get("eventId");

  // UI states
  const [loading, setLoading] = useState(false);

  // User / judge
  const [user, setUser] = useState(null);

  // Event & teams
  const [eventDetail, setEventDetail] = useState(null);
  const [loadingEvent, setLoadingEvent] = useState(true);
  const [teams, setTeams] = useState([]);
  const [loadingTeams, setLoadingTeams] = useState(true);

  // Form states
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedTeam, setSelectedTeam] = useState("");
  const [selectedPenalty, setSelectedPenalty] = useState(null);

  // Results modal
  const [sprintResults, setSprintResults] = useState([]);

  // Assignments & events
  const [assignments, setAssignments] = useState([]);
  const [events, setEvents] = useState([]);
  const [error, setError] = useState(null);
  const [toasts, setToasts] = useState([]);

  // History modal
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [historyData, setHistoryData] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

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
  const toastId = useRef(1);
  const socketRef = useRef(null);

  const penalties = [0, 10, 50];

  // const openHistoryModal = async () => {
  //   setIsHistoryOpen(true);
  //   setLoadingHistory(true);

  //   try {
  //     const res = await fetch(
  //       `/api/judges/judge-reports/detail?eventId=${eventId}&eventType=SPRINT`
  //     );
  //     const data = await res.json();

  //     if (res.ok && data?.data) {
  //       setHistoryData(data.data);
  //     } else {
  //       setHistoryData([]);
  //       pushToast({
  //         title: "Tidak ada riwayat",
  //         text: "Belum ada data penalty untuk tim ini",
  //         type: "info",
  //       });
  //     }
  //   } catch (err) {
  //     console.error("❌ Fetch history error:", err);
  //     setHistoryData([]);
  //     pushToast({
  //       title: "Error",
  //       text: "Gagal memuat riwayat penalty",
  //       type: "error",
  //     });
  //   } finally {
  //     setLoadingHistory(false);
  //   }
  // };
const openHistoryModal = async () => {
  setIsHistoryOpen(true);
  setLoadingHistory(true);

  try {
    const url = new URL(`/api/judges/judge-reports/detail`, window.location.origin);
    url.searchParams.set('fromReport', 'true'); // ← mode baru
    url.searchParams.set('eventId', eventId);
    url.searchParams.set('eventType', 'SPRINT');
    // Optional jika mau 1 tim saja:
    // if (selectedTeam) url.searchParams.set('team', selectedTeam);

    const res = await fetch(url.toString(), { cache: 'no-store' });
    const data = await res.json();

    if (res.ok && Array.isArray(data?.data)) {
      setHistoryData(data.data); // ini adalah array dari JudgeReportDetail
    } else {
      setHistoryData([]);
      pushToast({ title: 'Tidak ada riwayat', text: 'Belum ada data penalty', type: 'info' });
    }
  } catch (err) {
    console.error('❌ Fetch history error:', err);
    setHistoryData([]);
    pushToast({ title: 'Error', text: 'Gagal memuat riwayat penalty', type: 'error' });
  } finally {
    setLoadingHistory(false);
  }
};


  /** Helper: ambil posisi SPRINT untuk eventId aktif dari struktur assignments */
  function getSprintPositionFromAssignments(list, evId) {
    if (!Array.isArray(list) || !evId) return "";
    // Kumpulkan semua 'judges' dari setiap item, lalu cari eventId yang cocok
    const match = list
      .flatMap((item) => item.judges || [])
      .find((j) => String(j.eventId) === String(evId));

    if (!match || !match.sprint) return "";

    // Prioritas: start > finish. Jika keduanya false, kosong.
    if (match.sprint.start) return "Start";
    if (match.sprint.finish) return "Finish";
    return "";
  }

  // Posisi ter-assign (otomatis) dari assignments -> khusus sprint
  const assignedPosition = useMemo(() => {
    return getSprintPositionFromAssignments(assignments, eventId);
  }, [assignments, eventId]);

  // Fetch assignments & user/events sekali, lalu derive selectedPosition dari assignments
  useEffect(() => {
    const fetchData = async () => {
      try {
        setError(null);
        setLoading(true);

        // 1) Ambil info judges (user + events)
        const judgesRes = await fetch("/api/judges", { cache: "no-store" });
        if (!judgesRes.ok)
          throw new Error(`Gagal memuat data judges: ${judgesRes.status}`);
        const judgesData = await judgesRes.json();

        if (judgesData.user) setUser(judgesData.user);
        setEvents(judgesData.events || []);

        const userEmail = judgesData.user?.email;
        if (!userEmail) throw new Error("Email tidak ditemukan");

        // 2) Ambil assignments berdasarkan email
        const assignmentsRes = await fetch(
          `/api/assignments?email=${encodeURIComponent(userEmail)}`,
          { cache: "no-store" }
        );
        if (!assignmentsRes.ok)
          throw new Error(`Gagal memuat assignments: ${assignmentsRes.status}`);

        const assignmentsData = await assignmentsRes.json();
        const list = assignmentsData.data || [];
        setAssignments(list);
      } catch (err) {
        console.error(err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Fetch teams (berdasarkan kategori terpilih)
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
          console.log("🔍 Teams structure from API:", data.teams); // ✅ DI SINI
        } else {
          setTeams([]);
          pushToast({
            title: "Data Tim Kosong",
            text: "Tidak ada tim untuk kategori ini",
            type: "info",
          });
        }
      } catch (err) {
        console.error("❌ Failed to fetch teams:", err);
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

  const sendRealtimeMessage = () => {
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
      (ok) => {
        if (ok) {
          pushToast({
            title: "Berhasil",
            text: "Pesan terkirim ke operator timing",
            type: "success",
          });
        }
      }
    );
  };

  // Refresh teams setelah submit - GUNAKAN ENDPOINT YANG SAMA
  const refreshTeams = async () => {
    if (!selectedCategory || !eventId) return;

    try {
      const [initialId, divisionId, raceId] = selectedCategory.split("|");
      const catEvent = "SPRINT";

      const res = await fetch(
        `/api/events/${eventId}/judge-tasks?initialId=${initialId}&divisionId=${divisionId}&raceId=${raceId}&eventName=${catEvent}&t=${Date.now()}`
      );

      const data = await res.json();
      if (res.ok && data?.success) {
        setTeams(data.teams || []);
      }
    } catch (error) {
      console.error("❌ Failed to refresh teams:", error);
      pushToast({
        title: "Refresh Gagal",
        text: "Gagal memuat ulang data tim",
        type: "error",
      });
    }
  };

  // Daftar kategori gabungan (Initial|Division|Race)
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

  // Ubah kategori
  const handleCategoryChange = (value) => {
    setSelectedCategory(value);
    setSelectedTeam("");
    setTeams([]);
    setLoadingTeams(true);
  };

  // Filter tim sesuai kategori
  const filteredTeams = useMemo(() => {
    if (!selectedCategory) return teams;
    const [initialId, divisionId, raceId] = selectedCategory.split("|");
    return teams.filter(
      (team) =>
        String(team.initialId) === String(initialId) &&
        String(team.divisionId) === String(divisionId) &&
        String(team.raceId) === String(raceId)
    );
  }, [selectedCategory, teams]);

  // Submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    const finalPosition = assignedPosition;

    if (
      !selectedTeam ||
      selectedPenalty === null ||
      !finalPosition ||
      !selectedCategory
    ) {
      pushToast({
        title: "Data Belum Lengkap",
        text: "Harap pilih kategori, tim, dan penalty sebelum submit",
        type: "error",
      });
      return;
    }

    const parts = selectedCategory.split("|");
    if (parts.length !== 3) {
      pushToast({
        title: "Format Kategori Salah",
        text: "Kategori tidak valid",
        type: "error",
      });
      return;
    }
    const [initialId, divisionId, raceId] = parts;

    // ✅ GUNAKAN _id SEBAGAI teamId
    const formData = {
      eventType: "SPRINT",
      position: finalPosition,
      team: selectedTeam,
      penalty: selectedPenalty,
      eventId: eventId,
      initialId,
      divisionId,
      raceId,
    };

    console.log("Submitting penalty:", formData);

    setLoading(true);
    try {
      // const res = await fetch(`/api/judges/sprint`, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(formData),
      // }) // menggunakan judge sprint details

      // yang dibawah menggunakan report global dinamis
      const res = await fetch(`/api/judges/judge-reports/detail`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
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
          text: `✅ ${finalPosition} Penalty: ${selectedPenalty} points berhasil disimpan!`,
          type: "success",
        });

        sendRealtimeMessage();
        await refreshTeams();
        setSelectedTeam("");
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

  return (
    <>
      {/* Toasts */}
      <div className="fixed top-6 right-6 z-50 flex flex-col gap-4">
        {toasts.map((toast) => (
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
          {/* BACK */}
          <div className="text-start my-2">
            <Link href="/judges">
              <button className="surface-text-sts hover:underline">
                ← Back to Judges
              </button>
            </Link>
          </div>

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
                )}
                {" – "}
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

          <div className="text-center mb-5">
            <h1 className="text-2xl font-bold text-gray-800">
              Judges {assignedPosition}
            </h1>
            <small className="text-center">Race Number : Sprint Race</small>
          </div>

          {/* <button
            onClick={sendRealtimeMessage}
            className="mt-5 mb-5 px-5 py-2.5 w-full sm:w-auto
                   bg-blue-600 text-white rounded-xl shadow 
                   hover:shadow-lg hover:scale-105 transition-all"
          >
            Kirim Pesan ke Operator
          </button> */}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* CATEGORY */}
            <div>
              <label className="block text-gray-700 mb-2">Category:</label>
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
              <label className="block text-gray-700 mb-2">Team:</label>
              {loadingTeams ? (
                <select
                  disabled
                  className="w-full px-4 py-2 border rounded-lg bg-gray-100 text-gray-400"
                >
                  <option>Select Teams...</option>
                </select>
              ) : filteredTeams.length ? (
                <select
                  value={selectedTeam}
                  onChange={(e) => setSelectedTeam(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg"
                  required
                >
                  <option value="" disabled>
                    Select Team
                  </option>
                  {filteredTeams.map((team) => (
                    <option key={team._id} value={team._id}>
                      {team.nameTeam} (BIB {team.bibTeam})
                    </option>
                  ))}
                </select>
              ) : (
                <select disabled className="select-base select-disabled">
                  <option>No teams available for this category.</option>
                </select>
              )}
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
                      ? "bg-blue-100 surface-border-sts surface-text-sts font-semibold"
                      : "bg-white border-gray-300 text-gray-700"
                  }`}
                >
                  Penalty: {pen} points
                </button>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 w-full">
              {/* SUBMIT LEFT */}
              <button
                type="button"
                onClick={openHistoryModal}
                className="w-full sm:w-1/2 py-3 btn-outline-sts rounded-lg font-semibold shadow-md hover:btnActive-sts hover:text-white disabled:bg-gray-400 transition"
                disabled={loading}
              >
                View History
              </button>

              {/* SUBMIT RIGHT */}
              <button
                type="button"
                className="w-full sm:w-1/2 py-3 bg-green-500 text-white rounded-lg font-semibold shadow-md hover:bg-green-600 disabled:bg-gray-400 transition"
                disabled={
                  loading ||
                  !selectedTeam ||
                  selectedPenalty === null ||
                  !selectedCategory
                }
              >
                {loading ? "Processing..." : "Submit →"}
              </button>
            </div>
          </form>
        </div>

        {/* MODAL: HISTORY */}
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
                      // warna ikon sesuai penalty
                      const p = Number(item.penalty ?? 0);
                      const color =
                        p >= 50
                          ? "bg-red-100 text-red-600 ring-red-200"
                          : p >= 10
                          ? "bg-amber-100 text-amber-600 ring-amber-200"
                          : "bg-emerald-100 text-emerald-600 ring-emerald-200";

                      const title = `${
                        item?.divisionName || "Category"
                      } - Sprint`; // ubah sesuai datamu
                      const subtitle =
                        `${item?.teamInfo?.nameTeam || "Team"} BIB ${
                          item?.teamInfo?.bibTeam || "-"
                        }` + ` Penalty: ${p} points`;
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
                          {/* Icon */}
                          <div
                            className={`grid place-items-center h-12 w-12 rounded-xl ring ${color}`}
                          >
                            {/* bendera kecil */}
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

                          {/* Texts */}
                          <div className="flex-1">
                            <div className="font-semibold text-gray-900">
                              {title}
                            </div>
                            <div className="text-gray-600 text-sm">
                              {subtitle}
                            </div>
                          </div>

                          {/* Time */}
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

export default JudgesSprintPages;
