"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import ResultSlalom from "@/components/ResultSlalom";
import getSocket from "@/utils/socket";
import { motion } from "framer-motion";

/** 🔹 Helper: ambil posisi Slalom dari assignments */
const getSlalomPositionsFromAssignments = (list, evId) => {
  if (!Array.isArray(list) || !evId) return [];

  const match = list
    .flatMap((item) => item.judges || [])
    .find((j) => String(j.eventId) === String(evId));

  if (!match?.slalom) return [];

  const positions = [];
  if (Array.isArray(match.slalom.gates)) {
    positions.push(...match.slalom.gates.map((g) => `Gate ${g}`));
  }
  if (match.slalom.start === true) positions.push("Start");
  if (match.slalom.finish === true) positions.push("Finish");
  return positions;
};

const JudgesSlalomPage = () => {
  const searchParams = useSearchParams();
  const eventId = searchParams.get("eventId");
  const userId = searchParams.get("userId");

  const [user, setUser] = useState(null);
  const [assignments, setAssignments] = useState([]);

  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedTeam, setSelectedTeam] = useState("");
  const [selectedGate, setSelectedGate] = useState("");
  const [selectedPenalty, setSelectedPenalty] = useState(null);
  const [runNumber, setRunNumber] = useState(1);

  const [clickedCircles, setClickedCircles] = useState({
    P1: false,
    P2: false,
    P3: false,
    P4: false,
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [resultData, setResultData] = useState({});

  const [eventDetail, setEventDetail] = useState(null);
  const [loadingEvent, setLoadingEvent] = useState(true);

  const [teams, setTeams] = useState([]);
  const [loadingTeams, setLoadingTeams] = useState(true);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toasts, setToasts] = useState([]);
  const toastId = useRef(1);
  const socketRef = useRef(null);

  // --- History state (ditambahkan sesuai permintaan) ---
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

  const gateOptions = useMemo(() => {
    return getSlalomPositionsFromAssignments(assignments, eventId);
  }, [assignments, eventId]);

  const penalties = useMemo(() => {
    if (selectedGate === "Start" || selectedGate === "Finish") {
      return [0, 10, 50];
    } else if (selectedGate.startsWith("Gate")) {
      return [0, 5, 50];
    } else {
      return []; // fallback, misal belum pilih gate
    }
  }, [selectedGate]);

  const runs = [
    { label: "Run 1", value: 1 },
    { label: "Run 2", value: 2 },
  ];

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

  /** 🔹 Helper: tentukan tipe penalty dari gate */
  const getPenaltyType = (gate) => {
    if (gate === "Start") return "PenaltyStart";
    if (gate === "Finish") return "PenaltyFinish";
    return "PenaltyGates";
  };

  // ✅ SEND REALTIME MESSAGE FUNCTION
  const sendRealtimeMessage = (operationType, gateNumber) => {
    const socket = socketRef.current || getSocket();
    if (!socket) return;

    const selectedTeamData = teams.find((t) => t._id === selectedTeam);
    const teamName = selectedTeamData?.nameTeam || "Unknown Team";

    let messageData = {};

    if (operationType === "start") {
      messageData = {
        senderId: socket.id,
        from: "Judges Dashboard - SLALOM",
        text: `Slalom: ${teamName} - Run ${runNumber} Start - Penalty ${selectedPenalty} detik`,
        teamId: selectedTeam,
        teamName: teamName,
        type: "PenaltyStart",
        runNumber: runNumber,
        penalty: Number(selectedPenalty),
        eventId: eventId,
        ts: new Date().toISOString(),
        bib: selectedTeamData?.bibTeam || "",
        run: runNumber,
      };
    } else if (operationType === "finish") {
      messageData = {
        senderId: socket.id,
        from: "Judges Dashboard - SLALOM",
        text: `Slalom: ${teamName} - Run ${runNumber} Finish - Penalty ${selectedPenalty} detik`,
        teamId: selectedTeam,
        teamName: teamName,
        type: "PenaltyFinish",
        runNumber: runNumber,
        penalty: Number(selectedPenalty),
        eventId: eventId,
        ts: new Date().toISOString(),
        bib: selectedTeamData?.bibTeam || "",
        run: runNumber,
      };
    } else {
      messageData = {
        senderId: socket.id,
        from: "Judges Dashboard - SLALOM",
        text: `Slalom: ${teamName} - Run ${runNumber} Gate ${gateNumber} - Penalty ${selectedPenalty} detik`,
        teamId: selectedTeam,
        teamName: teamName,
        type: "PenaltyGates",
        runNumber: runNumber,
        gate: `Gate ${gateNumber}`,
        gateNumber: gateNumber,
        penalty: Number(selectedPenalty),
        eventId: eventId,
        ts: new Date().toISOString(),
        bib: selectedTeamData?.bibTeam || "",
        run: runNumber,
      };
    }

    console.log("📡 [SLALOM SOCKET] Sending realtime message:", messageData);

    socket.emit("custom:event", messageData, (ok) => {
      if (ok) {
        console.log("✅ [SLALOM SOCKET] Message delivered to operator");
      } else {
        console.log("❌ [SLALOM SOCKET] Message failed to deliver");
        pushToast({
          title: "Peringatan",
          text: "Pesan tidak terkirim ke operator",
          type: "warning",
        });
      }
    });
  };

  /** 🔹 Fetch event detail */
  useEffect(() => {
    if (!eventId) return;
    const fetchEventDetail = async () => {
      setLoadingEvent(true);
      try {
        const res = await fetch(`/api/matches/${eventId}`, {
          cache: "no-store",
        });
        const data = await res.json();
        const evt = data.event || data;
        setEventDetail(evt || null);
      } catch (err) {
        console.error(err);
        setEventDetail(null);
      } finally {
        setLoadingEvent(false);
      }
    };
    fetchEventDetail();
  }, [eventId]);

  /** 🔹 Fetch user & assignments */
  useEffect(() => {
    if (!eventId) return;
    const fetchData = async () => {
      try {
        const judgesRes = await fetch("/api/judges", { cache: "no-store" });
        if (!judgesRes.ok) return;
        const judgesData = await judgesRes.json();
        setUser(judgesData.user || null);

        const userEmail = judgesData.user?.email;
        if (!userEmail) return;

        const assignmentsRes = await fetch(
          `/api/assignments?email=${encodeURIComponent(userEmail)}`,
          { cache: "no-store" }
        );
        if (!assignmentsRes.ok) return;
        const assignmentsData = await assignmentsRes.json();
        setAssignments(assignmentsData.data || []);
      } catch (err) {
        console.error(err);
      }
    };
    fetchData();
  }, [eventId]);

  /** 🔹 Fetch registered teams (SLALOM) */
  useEffect(() => {
    if (!eventId || !selectedCategory) return;

    const fetchTeams = async () => {
      try {
        const [initialId, divisionId, raceId] = selectedCategory.split("|");
        const catEvent = "SLALOM";

        const res = await fetch(
          `/api/events/${eventId}/judge-tasks?initialId=${initialId}&divisionId=${divisionId}&raceId=${raceId}&eventName=${catEvent}`
        );

        const data = await res.json();
        if (res.ok && data?.success) {
          setTeams(data.teams || []);
          console.log("🔍 SLALOM Teams loaded:", data.teams);

          // ✅ DEBUG: Lihat data slalom setiap team
          data.teams.forEach((team) => {
            console.log(`Team: ${team.nameTeam}`);
            console.log(
              "Run 1 penalties:",
              team.results?.[0]?.penaltyTotal?.gates || []
            );
            console.log(
              "Run 2 penalties:",
              team.results?.[1]?.penaltyTotal?.gates || []
            );
          });
        } else {
          setTeams([]);
          pushToast({
            title: "Data Tim Kosong",
            text: "Tidak ada tim untuk kategori ini",
            type: "info",
          });
        }
      } catch (err) {
        console.error("❌ Failed to fetch SLALOM teams:", err);
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

  /** 🔹 Refresh teams setelah submit */
  const refreshTeams = async () => {
    if (!selectedCategory || !eventId) return;

    try {
      const [initialId, divisionId, raceId] = selectedCategory.split("|");
      const res = await fetch(
        `/api/events/${eventId}/judge-tasks?initialId=${initialId}&divisionId=${divisionId}&raceId=${raceId}&eventName=SLALOM&t=${Date.now()}`
      );
      const data = await res.json();
      if (res.ok && data?.success) {
        setTeams(data.teams || []);
      }
    } catch (error) {
      console.error("❌ Failed to refresh teams:", error);
    }
  };

  /** 🔹 Combined categories */
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

  /** 🔹 Filtered teams */
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

  /** 🔹 Handlers */
  const handleCategoryChange = (value) => {
    setSelectedCategory(value);
    setSelectedTeam("");
    setTeams([]);
    setLoadingTeams(true);
  };

  const handleClick = (position) => {
    setClickedCircles((prev) => ({
      ...prev,
      [position]: !prev[position],
    }));
  };

  /** 🔹 Open History (disimpan & diposisikan seperti sebelumnya) */
  const openHistoryModal = async () => {
    setIsHistoryOpen(true);
    setLoadingHistory(true);

    try {
      const url = new URL(
        `/api/judges/judge-reports/detail`,
        window.location.origin
      );
      url.searchParams.set("fromReport", "true");
      if (eventId) url.searchParams.set("eventId", eventId);
      url.searchParams.set("eventType", "SLALOM");
      // optional: if (selectedTeam) url.searchParams.set("team", selectedTeam);

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

  /** 🔹 SUBMIT HANDLER YANG SUDAH DIPERBAIKI (tidak diubah) */
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

    // ✅ DETERMINE OPERATION TYPE
    let operationType = "";
    let gateNumber = undefined;

    if (selectedGate === "Start") {
      operationType = "start";
    } else if (selectedGate === "Finish") {
      operationType = "finish";
    } else {
      operationType = "gate";
      // ✅ EXTRACT GATE NUMBER dari "Gate X"
      gateNumber = parseInt(selectedGate.replace("Gate ", ""));
      if (isNaN(gateNumber)) {
        pushToast({
          title: "Gate Tidak Valid",
          text: "Format gate tidak valid",
          type: "error",
        });
        return;
      }
    }

    // ✅ CEK APAKAH TEAM VALID
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

    // ✅ PAYLOAD YANG SESUAI DENGAN API BARU
    const payload = {
      eventType: "SLALOM",
      runNumber,
      team: actualTeamId,
      penalty: selectedPenalty,
      eventId,
      initialId,
      divisionId,
      raceId,
      operationType, // ✅ 'start', 'gate', atau 'finish'
    };

    // ✅ HANYA TAMBAH gateNumber UNTUK OPERASI GATES
    if (operationType === "gate") {
      payload.gateNumber = gateNumber;
    }

    if (selectedGate === "Start") {
      payload.gateNumber = 100;
    }

    if (selectedGate === "Finish") {
      payload.gateNumber = 200;
    }

    console.log("🔍 Submitting SLALOM penalty:", payload);
    setIsSubmitting(true);

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
        let successMessage = "";

        if (operationType === "start") {
          successMessage = `✅ Start penalty recorded - Run ${runNumber}: ${selectedPenalty} seconds`;
        } else if (operationType === "finish") {
          successMessage = `✅ Finish penalty recorded - Run ${runNumber}: ${selectedPenalty} seconds`;
        } else {
          successMessage = `✅ Gate penalty added - Run ${runNumber} Gate ${gateNumber}: ${selectedPenalty} seconds`;
        }

        pushToast({
          title: "Berhasil!",
          text: successMessage,
          type: "success",
        });

        // ✅ KIRIM REALTIME MESSAGE KE OPERATOR
        sendRealtimeMessage(operationType, gateNumber);

        // Refresh teams data
        await refreshTeams();
        // Reset form
        setSelectedGate("");
        setSelectedPenalty(null);
        setClickedCircles({ P1: false, P2: false, P3: false, P4: false });
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
      setIsSubmitting(false);
    }
  };

  /** 🔹 Render */
  return (
    <>
      {/* Toasts dengan animasi */}
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
                  : toast.type === "warning"
                  ? "border-orange-300 text-orange-800"
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
        <div className="w-full max-w-xl bg-white p-6 rounded-2xl shadow-lg">
          {/* Back */}
          <div className="text-start my-2">
            <Link href={`/judges`}>
              <button className="text-blue-500 hover:underline">
                ← Back to Judge Dashboard
              </button>
            </Link>
          </div>

          {/* Event header */}
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

          <div className="mb-6 bg-white rounded-2xl shadow-sm p-5 border border-gray-100">
              <small className="block text-sm text-gray-500 tracking-wide">
              Race Number:{" "}
              <span className="font-medium text-gray-700">Slalom Race</span>
            </small>
            <div className="text-l font-semibold text-gray-900 mb-3 flex items-center gap-3 flex-wrap">
              Judge Task :
            </div>
            <h1 className="text-2xl font-semibold text-gray-900 mb-3 flex items-center gap-3 flex-wrap">
              {gateOptions.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {gateOptions.map((gate, i) => (
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
            <div className="flex flex-col-reverse md:flex-row gap-8">
              {/* 🏁 LEFT FORM */}
              <div className="w-full space-y-6">
                {/* RUN SELECT */}
                <div>
                  <label className="block text-gray-700 mb-2">
                    Select Run :
                  </label>
                  <select
                    value={runNumber}
                    onChange={(e) => setRunNumber(Number(e.target.value))}
                    className="w-full px-4 py-2 border rounded-lg"
                  >
                    {runs.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* SELECT CATEGORY */}
                <div>
                  <label className="block text-gray-700 mb-2">
                    Select Category :
                  </label>
                  {loadingEvent ? (
                    <p className="text-gray-500 text-sm">
                      Loading categories...
                    </p>
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

                {/* SELECT TEAM */}
                <div>
                  <label className="block text-gray-700 mb-2">
                    Select Team:
                  </label>
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
                          ⚠️ Team ini tidak memiliki ID yang valid dan tidak
                          bisa menerima penalty.
                        </p>
                        <p className="text-orange-700 text-xs mt-1">
                          Silakan hubungi administrator untuk memperbaiki data
                          team.
                        </p>
                      </div>
                    )}
                </div>

                {/* SELECT GATE */}
                <div>
                  <label className="block text-gray-700 mb-2">
                    Select Gate :
                  </label>
                  <select
                    value={selectedGate}
                    onChange={(e) => setSelectedGate(e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg"
                    required
                  >
                    <option value="">Select Gate</option>
                    {gateOptions.map((gate, index) => (
                      <option key={index} value={gate}>
                        {gate}
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

                {/* PENALTY */}
                <div className="space-y-4">
                  {penalties.map((penalty, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => setSelectedPenalty(penalty)}
                      className={`w-full py-3 rounded-lg border ${
                        selectedPenalty === penalty
                          ? "bg-blue-100 border-blue-500 text-blue-700 font-semibold"
                          : "bg-white border-gray-300 text-gray-700"
                      }`}
                    >
                      Penalty: {penalty} points
                    </button>
                  ))}
                </div>

                {/* --- ACTIONS: View History (left) + Submit (right) - posisi sesuai permintaan --- */}
                <div className="flex flex-col sm:flex-row gap-3 w-full">
                  <button
                    type="button"
                    onClick={openHistoryModal}
                    className="w-full sm:w-1/2 py-3 btn-outline-sts rounded-lg font-semibold shadow-md hover:btnActive-sts hover:text-white disabled:bg-gray-400 transition"
                    disabled={isSubmitting}
                  >
                    View History
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className={`w-full sm:w-1/2 py-3 rounded-lg font-semibold shadow-md transition duration-300 ${
                      isSubmitting
                        ? "bg-gray-400 cursor-not-allowed text-white"
                        : "bg-blue-500 hover:bg-blue-600 text-white"
                    }`}
                  >
                    {isSubmitting ? "Submitting..." : "Submit →"}
                  </button>
                </div>
              </div>

              {/* 🚣‍♂️ RIGHT VIEW */}
              {/* (dikosongkan / dikomentari seperti semula — tidak diubah) */}
            </div>
          </form>

          {/* Modal Result (tetap ada, tapi kamu sudah menghapus tombol View Result sehingga modal tidak otomatis terbuka) */}
          <ResultSlalom
            isOpen={isModalOpen}
            closeModal={() => setIsModalOpen(false)}
            resultData={{
              category: selectedCategory,
              team: selectedTeam,
              gate: selectedGate,
              selectedPenalty,
              penaltiesDetail: clickedCircles,
              runNumber,
            }}
          />

          {/* Modal: History (posisi & fungsi sama seperti file sebelumnya) */}
          {isHistoryOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
              <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="px-6 py-4 border-b flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">
                    History
                  </h2>
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

                        const title = `Slalom Penalty`;

                        const subtitle =
                          `${item?.teamInfo?.nameTeam || "Team"} BIB ${
                            item?.teamInfo?.bibTeam || "-"
                          }` + ` • Penalty: ${p} points`;
                        const timeStr = item?.createdAt
                          ? new Date(item.createdAt).toLocaleTimeString(
                              "id-ID",
                              {
                                hour: "2-digit",
                                minute: "2-digit",
                              }
                            )
                          : "-";

                        const runSection = `Run : ${
                          item?.runNumber || "Undefined"
                        }`;

                        const gateNumber = `Gates : ${
                          item?.gateNumber == 100
                            ? "Start"
                            : item?.gateNumber == 200
                            ? "Finish"
                            : item?.gateNumber
                        }`;

                        const createdPenaltyBy = `Created By : ${
                          item?.judge || "Undefined"
                        }`;

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
                                {title} - {runSection}
                              </div>
                              <div className="text-gray-600 text-sm">
                                Team : {subtitle}
                              </div>
                              <div className="text-gray-600 text-sm">
                                {gateNumber}
                              </div>
                              <small className="text-gray-600">
                                {createdPenaltyBy}
                              </small>
                            </div>
                            <div className="text-xs text-gray-500 whitespace-nowrap">
                              Timestamp : {timeStr}
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
      </div>
    </>
  );
};

export default JudgesSlalomPage;
