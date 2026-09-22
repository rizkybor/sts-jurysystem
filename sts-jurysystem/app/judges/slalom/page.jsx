"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import useJudgeToasts from "@/hooks/judges/useJudgeToasts";
import useJudgeSocket from "@/hooks/judges/useJudgeSocket";
import useJudgeAssignments from "@/hooks/judges/useJudgeAssignments";
import useEventDetail from "@/hooks/judges/useEventDetail";
import useJudgeTeams from "@/hooks/judges/useJudgeTeams";
import useJudgeHistory from "@/hooks/judges/useJudgeHistory";
import useRaceSettings from "@/hooks/judges/useRaceSettings";

import JudgeToastStack from "@/components/judges/JudgeToastStack";
import JudgeTopBar from "@/components/judges/JudgeTopBar";
import JudgeRoleBadges from "@/components/judges/JudgeRoleBadges";
import JudgeCategoryTeamFields, {
  getSelectedTeamData,
} from "@/components/judges/JudgeCategoryTeamFields";
import JudgeSectionCard from "@/components/judges/JudgeSectionCard";
import JudgePenaltyGrid from "@/components/judges/JudgePenaltyGrid";
import JudgeSummaryBar from "@/components/judges/JudgeSummaryBar";
import JudgeStickyActions from "@/components/judges/JudgeStickyActions";
import JudgeHistoryModal, {
  penaltyBadgeColor,
} from "@/components/judges/JudgeHistoryModal";
import FieldNotesModal from "@/components/judges/FieldNotesModal";

// Fallback kalau event belum pernah dikustomisasi lewat Race Settings —
// sama dgn DEFAULT_SLALOM_START_PENALTIES / DEFAULT_SLALOM_FINISH_PENALTIES
// / DEFAULT_SLALOM_GATE_PENALTIES di timing system (editRaceSettings.js).
const DEFAULT_START_FINISH_PENALTIES = [0, 10, 50];
const DEFAULT_GATE_PENALTIES = [0, 5, 50];
const RUNS = [
  { label: "Run 1", value: 1 },
  { label: "Run 2", value: 2 },
];

// {label, value}[] (lihat editRaceSettings.js cleanPenaltyList()) -> angka
// murni buat JudgePenaltyGrid.
function extractPenaltyValues(list) {
  if (!Array.isArray(list) || !list.length) return null;
  const values = list
    .map((p) => Number(p?.value))
    .filter((v) => Number.isFinite(v));
  return values.length ? values : null;
}

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

  const { toasts, pushToast, removeToast } = useJudgeToasts();
  const socketRef = useJudgeSocket(pushToast);
  const { user, assignments } = useJudgeAssignments();
  const { eventDetail, loadingEvent, combinedCategories } =
    useEventDetail(eventId);
  const { settings: raceSettings } = useRaceSettings(eventId);

  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedTeam, setSelectedTeam] = useState("");
  const [selectedGate, setSelectedGate] = useState("");
  const [selectedPenalty, setSelectedPenalty] = useState(null);
  const [runNumber, setRunNumber] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [fieldNotesModalOpen, setFieldNotesModalOpen] = useState(false);

  const gateOptions = useMemo(
    () => getSlalomPositionsFromAssignments(assignments, eventId),
    [assignments, eventId]
  );

  // Pilihan nilai penalty Start/Finish/Gate ikut kustomisasi Race Settings
  // event ini (kalau ada) — bukan daftar hardcode, supaya tidak ada nilai
  // yang diam-diam ditolak timing system karena tidak termasuk daftar yang
  // benar-benar dikonfigurasi untuk event tsb.
  const penalties = useMemo(() => {
    const slalom = raceSettings?.slalom || {};
    if (selectedGate === "Start") {
      return (
        extractPenaltyValues(slalom.startPenalties) ||
        DEFAULT_START_FINISH_PENALTIES
      );
    }
    if (selectedGate === "Finish") {
      return (
        extractPenaltyValues(slalom.finishPenalties) ||
        DEFAULT_START_FINISH_PENALTIES
      );
    }
    if (selectedGate.startsWith("Gate")) {
      return extractPenaltyValues(slalom.gatePenalties) || DEFAULT_GATE_PENALTIES;
    }
    return [];
  }, [selectedGate, raceSettings]);

  const { teams, loadingTeams, refreshTeams, resetTeams } = useJudgeTeams({
    eventId,
    eventName: "SLALOM",
    selectedCategory,
    pushToast,
  });

  // Relay broadcast "slalom:team-started" dari sts-timingsystem (dikirim
  // saat operator mengisi Start Time satu baris utk run tertentu, lihat
  // updateTime() di SlalomRace.vue) ke /api/judges/slalom/team-started
  // supaya tersimpan dan bisa dibaca validasi submit penalty di backend.
  // Hanya browser juri yang sedang online saat event ini terkirim yang
  // bisa meneruskannya — keterbatasan yang sama dgn Sprint/H2H, diterima.
  // Tidak ada toast di sini (beda dgn Sprint yang punya "Team Lepas
  // Start") — baru sekadar validasi "belum Start", bukan flagging UI.
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !eventId) return;

    const handler = (msg) => {
      if (msg?.type !== "slalom:team-started") return;
      if (String(msg?.eventId) !== String(eventId)) return;

      fetch("/api/judges/slalom/team-started", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: msg.eventId,
          initialId: msg.initialId,
          divisionId: msg.divisionId,
          raceId: msg.raceId,
          teamId: msg.teamId,
          bibTeam: msg.bibTeam,
          runNumber: msg.runNumber,
          startTime: msg.startTime,
        }),
      }).catch((err) => {
        console.error("❌ Gagal relay slalom:team-started:", err);
      });
    };

    socket.on("custom:event", handler);
    return () => socket.off("custom:event", handler);
  }, [eventId, socketRef]);

  const history = useJudgeHistory({ eventId, eventType: "SLALOM", pushToast });

  const backHref = eventId
    ? `/judges?eventId=${eventId}${userId ? `&userId=${userId}` : ""}`
    : "/judges";

  const handleCategoryChange = (value) => {
    setSelectedCategory(value);
    setSelectedTeam("");
    setSelectedGate("");
    setSelectedPenalty(null);
    resetTeams();
  };

  const handleGateChange = (value) => {
    setSelectedGate(value);
    // penalty is auto-reset by JudgePenaltyGrid when the allowed set changes
  };

  const selectedTeamData = getSelectedTeamData(teams, selectedTeam);

  const sendRealtimeMessage = (operationType, gateNumber) => {
    const socket = socketRef.current;
    if (!socket) return;
    const teamName = selectedTeamData?.nameTeam || "Unknown Team";
    const actualTeamId = selectedTeamData?.teamId || selectedTeam;
    // BUG FIX (2026-09-23): sama pola dgn Sprint (MEMORY-SPRINT.md) —
    // initialId/raceId/divisionId ditambahkan supaya timing system bisa
    // verifikasi kategori aktifnya cocok sebelum menempelkan penalty ini
    // ke baris yg sedang tampil (teamId bisa dipakai ulang lintas Initial).
    const [initialId, divisionId, raceId] = selectedCategory.split("|");

    let messageData = {
      senderId: socket.id,
      from: "Judges Dashboard - SLALOM",
      teamId: actualTeamId,
      teamName,
      runNumber,
      penalty: Number(selectedPenalty),
      eventId,
      initialId,
      divisionId,
      raceId,
      ts: new Date().toISOString(),
      bib: selectedTeamData?.bibTeam || "",
      run: runNumber,
    };

    if (operationType === "start") {
      messageData = {
        ...messageData,
        text: `Slalom: ${teamName} - Run ${runNumber} Start - Penalty ${selectedPenalty} detik`,
        type: "PenaltyStart",
      };
    } else if (operationType === "finish") {
      messageData = {
        ...messageData,
        text: `Slalom: ${teamName} - Run ${runNumber} Finish - Penalty ${selectedPenalty} detik`,
        type: "PenaltyFinish",
      };
    } else {
      messageData = {
        ...messageData,
        text: `Slalom: ${teamName} - Run ${runNumber} Gate ${gateNumber} - Penalty ${selectedPenalty} detik`,
        type: "PenaltyGates",
        gate: `Gate ${gateNumber}`,
        gateNumber,
      };
    }

    socket.emit("custom:event", messageData, (ok) => {
      if (!ok) {
        pushToast({
          title: "Peringatan",
          text: "Pesan tidak terkirim ke operator",
          type: "warning",
        });
      }
    });
  };

  // Field Notes — catatan bebas juri ke operator, versi ringan Fouls
  // Report H2H tanpa Pen Position/Detail (Slalom tidak ada konsep
  // "Unfouls Team"). MURNI socket emit, tidak menyentuh
  // /api/judges/judge-reports/detail. Alert sukses & tutup modal
  // OPTIMISTIC (tidak menunggu ack) — lihat MEMORY-H2H.md.
  const handleFieldNotesSubmit = (payload) => {
    const socket = socketRef.current;
    if (!socket || !selectedTeamData?.hasValidTeamId) {
      pushToast({
        title: "Gagal Mengirim",
        text: "Koneksi realtime belum siap atau team tidak valid.",
        type: "error",
      });
      return Promise.resolve(false);
    }

    const [initialId, divisionId, raceId] = selectedCategory.split("|");
    const message = {
      senderId: socket.id,
      type: "FieldNotes",
      from: "Judges Dashboard - SLALOM",
      eventId,
      initialId,
      divisionId,
      raceId,
      category: "SLALOM",
      runNumber,
      team: {
        teamId: selectedTeamData.teamId,
        bibTeam: selectedTeamData.bibTeam || "",
        nameTeam: selectedTeamData.nameTeam || "",
      },
      judge: user?.username || user?.name || "",
      ts: new Date().toISOString(),
      ...payload,
    };

    pushToast({
      title: "Field Notes Terkirim",
      text: `Catatan lapangan utk ${selectedTeamData.nameTeam} berhasil disubmit.`,
      type: "success",
    });
    setFieldNotesModalOpen(false);

    socket.emit("custom:event", message, (ok) => {
      if (!ok) {
        console.warn(
          "⚠️ FieldNotes: ack socket mengembalikan gagal — catatan mungkin belum sampai ke operator."
        );
      }
    });
    return Promise.resolve(true);
  };

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

    let operationType = "";
    let gateNumber;
    if (selectedGate === "Start") {
      operationType = "start";
    } else if (selectedGate === "Finish") {
      operationType = "finish";
    } else {
      operationType = "gate";
      gateNumber = parseInt(selectedGate.replace("Gate ", ""), 10);
      if (Number.isNaN(gateNumber)) {
        pushToast({
          title: "Gate Tidak Valid",
          text: "Format gate tidak valid",
          type: "error",
        });
        return;
      }
    }

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

    const payload = {
      eventType: "SLALOM",
      runNumber,
      team: actualTeamId,
      penalty: selectedPenalty,
      eventId,
      initialId,
      divisionId,
      raceId,
      operationType,
    };
    if (operationType === "gate") payload.gateNumber = gateNumber;
    if (selectedGate === "Start") payload.gateNumber = 100;
    if (selectedGate === "Finish") payload.gateNumber = 200;

    setSubmitting(true);
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
        const label =
          operationType === "start"
            ? "Start"
            : operationType === "finish"
            ? "Finish"
            : `Gate ${gateNumber}`;
        pushToast({
          title: "Berhasil!",
          text: `${label} - Run ${runNumber}: ${selectedPenalty} detik tersimpan`,
          type: "success",
        });

        sendRealtimeMessage(operationType, gateNumber);
        await refreshTeams();
        setSelectedGate("");
        setSelectedPenalty(null);
      } else {
        pushToast({
          title: "Error Submit",
          text: data?.message || `HTTP ${res.status}`,
          type: "error",
        });
      }
    } catch (err) {
      console.error("Submit error:", err);
      pushToast({
        title: "Network Error",
        text: "Gagal mengirim data! Coba lagi.",
        type: "error",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <JudgeToastStack toasts={toasts} onDismiss={removeToast} />

      <div className="min-h-screen bg-gray-50">
        <JudgeTopBar
          backHref={backHref}
          raceLabel="Slalom Race"
          eventDetail={eventDetail}
          loadingEvent={loadingEvent}
        />

        <JudgeRoleBadges
          items={gateOptions}
          emptyHint="Posisi/gate belum ter-assign untuk event ini. Hubungi admin assignment."
        />

        <form
          onSubmit={handleSubmit}
          className="max-w-2xl mx-auto px-4 pb-6 pt-4 space-y-5"
        >
          <fieldset disabled={submitting} className="space-y-4">
            <JudgeSectionCard step={1} title="Kategori & Team">
              <div>
                <label className="block text-gray-700 mb-2 font-medium">
                  Run
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {RUNS.map((r) => (
                    <button
                      key={r.value}
                      type="button"
                      onClick={() => setRunNumber(r.value)}
                      aria-pressed={runNumber === r.value}
                      className={`min-h-[48px] rounded-xl border text-sm font-semibold transition ${
                        runNumber === r.value
                          ? "bg-sts text-white border-sts shadow-sm"
                          : "bg-white border-gray-300 text-gray-700 hover:border-sts/50"
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>

              <JudgeCategoryTeamFields
                loadingEvent={loadingEvent}
                combinedCategories={combinedCategories}
                selectedCategory={selectedCategory}
                onCategoryChange={handleCategoryChange}
                loadingTeams={loadingTeams}
                teams={teams}
                selectedTeam={selectedTeam}
                onTeamChange={setSelectedTeam}
              />
            </JudgeSectionCard>

            <JudgeSectionCard step={2} title="Gate & Nilai Penalty">
              <div>
                <label className="block text-gray-700 mb-2 font-medium">
                  Gate
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {gateOptions.map((gate) => (
                    <button
                      key={gate}
                      type="button"
                      onClick={() => handleGateChange(gate)}
                      aria-pressed={selectedGate === gate}
                      className={`min-h-[48px] rounded-xl border text-sm font-semibold transition ${
                        selectedGate === gate
                          ? "bg-sts text-white border-sts shadow-sm"
                          : "bg-white border-gray-300 text-gray-700 hover:border-sts/50"
                      }`}
                    >
                      {gate}
                    </button>
                  ))}
                </div>
                {!gateOptions.length && (
                  <p className="mt-1.5 text-xs text-gray-500">
                    Tidak ada gate/posisi ter-assign.
                  </p>
                )}
              </div>

              <JudgePenaltyGrid
                values={penalties}
                selected={selectedPenalty}
                onChange={setSelectedPenalty}
                columns={3}
              />
            </JudgeSectionCard>
          </fieldset>

          <JudgeSummaryBar
            parts={[
              { label: "team", value: selectedTeamData?.nameTeam },
              { label: "gate", value: selectedGate },
              {
                label: "penalty",
                value:
                  selectedPenalty !== null ? `Penalty ${selectedPenalty}` : "",
              },
            ]}
          />

          <JudgeStickyActions
            onHistory={history.open}
            historyDisabled={submitting}
            submitting={submitting}
            submitDisabled={submitting}
          />
        </form>

        {/* Field Notes — di luar <form> spy tidak ikut ke-disable oleh
            fieldset[disabled] submit penalty (sama pola dgn Fouls
            Report H2H). */}
        <div className="mt-4">
          <button
            type="button"
            onClick={() => setFieldNotesModalOpen(true)}
            disabled={!selectedCategory || !selectedTeam}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-sts/30 text-sts font-semibold text-sm hover:bg-sts/5 transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path d="M10 2 3 6v5c0 4 3 6.5 7 7 4-.5 7-3 7-7V6l-7-4Z" />
            </svg>
            Laporkan Field Notes
          </button>
          {(!selectedCategory || !selectedTeam) && (
            <p className="mt-1.5 text-xs text-gray-500 text-center">
              Pilih kategori & team terlebih dahulu utk melaporkan field
              notes.
            </p>
          )}
        </div>

        <FieldNotesModal
          open={fieldNotesModalOpen}
          onClose={() => setFieldNotesModalOpen(false)}
          team={selectedTeamData}
          categoryLabel={
            combinedCategories.find((c) => c.value === selectedCategory)
              ?.label
          }
          onSubmit={handleFieldNotesSubmit}
        />

        <JudgeHistoryModal
          open={history.isOpen}
          onClose={history.close}
          loading={history.loading}
          data={history.data}
          renderItem={(item) => {
            const p = Number(item.penalty ?? 0);
            const isFailed = item?.status === "failed";
            const timeStr = item?.createdAt
              ? new Date(item.createdAt).toLocaleTimeString("id-ID", {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "-";
            const gateLabel =
              item?.gateNumber === 100
                ? "Start"
                : item?.gateNumber === 200
                ? "Finish"
                : item?.gateNumber
                ? `Gate ${item.gateNumber}`
                : "-";
            return (
              <>
                <div
                  className={`grid place-items-center h-12 w-12 rounded-xl ring shrink-0 ${
                    isFailed
                      ? "bg-red-50 text-red-600 ring-red-200"
                      : penaltyBadgeColor(p)
                  }`}
                >
                  {isFailed ? (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      className="h-6 w-6"
                    >
                      <path
                        fill="currentColor"
                        d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm1 15h-2v-2h2Zm0-4h-2V7h2Z"
                      />
                    </svg>
                  ) : (
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
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-gray-900 flex items-center gap-1.5">
                    Slalom Penalty — Run {item?.runNumber || "-"}
                    {isFailed && (
                      <span className="text-[10px] font-bold uppercase tracking-wider text-red-600 bg-red-50 ring-1 ring-red-200 rounded-full px-2 py-0.5">
                        Gagal
                      </span>
                    )}
                  </div>
                  {isFailed ? (
                    <div className="text-red-600 text-sm">
                      {item?.failReason || "Submit ditolak sistem."}
                    </div>
                  ) : (
                    <div className="text-gray-600 text-sm">
                      {item?.teamInfo?.nameTeam || "Team"} BIB{" "}
                      {item?.teamInfo?.bibTeam || "-"} • {gateLabel} • Penalty:{" "}
                      {p} points
                    </div>
                  )}
                  <small className="text-gray-500">
                    Oleh: {item?.judge || "Undefined"}
                  </small>
                </div>
                <div className="text-xs text-gray-500 whitespace-nowrap">
                  {timeStr}
                </div>
              </>
            );
          }}
        />
      </div>
    </>
  );
};

export default JudgesSlalomPage;
