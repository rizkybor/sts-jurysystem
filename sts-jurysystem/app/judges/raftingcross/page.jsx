"use client";

import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

import useJudgeToasts from "@/hooks/judges/useJudgeToasts";
import useJudgeSocket from "@/hooks/judges/useJudgeSocket";
import useJudgeAssignments from "@/hooks/judges/useJudgeAssignments";
import useEventDetail from "@/hooks/judges/useEventDetail";
import useJudgeTeams from "@/hooks/judges/useJudgeTeams";
import useJudgeHistory from "@/hooks/judges/useJudgeHistory";

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

const GATE_PENALTIES = [0, 5, 50];

function getRXPositionsFromAssignments(list, evId) {
  if (!Array.isArray(list) || !evId) return [];
  const match = list
    .flatMap((item) => item.judges || [])
    .find((j) => String(j.eventId) === String(evId));
  if (!match?.rx) return [];

  const positions = [];
  if (Array.isArray(match.rx.gates)) {
    positions.push(...match.rx.gates.map((g) => `Gate ${g}`));
  }
  return positions;
}

const JudgesRaftingCrossPage = () => {
  const searchParams = useSearchParams();
  const eventId = searchParams.get("eventId");
  const userId = searchParams.get("userId");

  const { toasts, pushToast, removeToast } = useJudgeToasts();
  const socketRef = useJudgeSocket(pushToast);
  const { assignments } = useJudgeAssignments();
  const { eventDetail, loadingEvent, combinedCategories } =
    useEventDetail(eventId);

  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedTeam, setSelectedTeam] = useState("");
  const [selectedGate, setSelectedGate] = useState("");
  const [selectedPenalty, setSelectedPenalty] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const assignedPositions = useMemo(
    () => getRXPositionsFromAssignments(assignments, eventId),
    [assignments, eventId]
  );

  const { teams, loadingTeams, refreshTeams, resetTeams } = useJudgeTeams({
    eventId,
    eventName: "RX",
    selectedCategory,
    pushToast,
  });

  const history = useJudgeHistory({ eventId, eventType: "RX", pushToast });

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

  const selectedTeamData = getSelectedTeamData(teams, selectedTeam);

  const sendRealtimeMessage = (gateNumber) => {
    const socket = socketRef.current;
    if (!socket) return;
    const teamName = selectedTeamData?.nameTeam || "Unknown Team";
    const actualTeamId = selectedTeamData?.teamId || selectedTeam;

    const messageData = {
      senderId: socket.id,
      from: "Judges Dashboard - Rafting Cross",
      text: `RX: ${teamName} - Gate ${gateNumber} - Penalty ${selectedPenalty}`,
      teamId: actualTeamId,
      teamName,
      type: gateNumber === 1 ? "PenaltyGate1" : "PenaltyGate2",
      gate: gateNumber === 1 ? "gate1" : "gate2",
      value: Number(selectedPenalty),
      eventId,
      ts: new Date().toISOString(),
    };

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
        pushToast({
          title: "Berhasil!",
          text: `${selectedGate}: Penalty ${selectedPenalty} berhasil disimpan!`,
          type: "success",
        });
        sendRealtimeMessage(gateNumber);
        await refreshTeams();
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
          raceLabel="Rafting Cross"
          eventDetail={eventDetail}
          loadingEvent={loadingEvent}
        />

        <JudgeRoleBadges
          items={assignedPositions}
          emptyHint="Gate belum ter-assign untuk event ini. Hubungi admin assignment."
        />

        <form
          onSubmit={handleSubmit}
          className="max-w-2xl mx-auto px-4 pb-6 pt-4 space-y-5"
        >
          <fieldset disabled={submitting} className="space-y-4">
            <JudgeSectionCard step={1} title="Kategori & Team">
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
                <div className="grid grid-cols-2 gap-2">
                  {assignedPositions.map((position) => (
                    <button
                      key={position}
                      type="button"
                      onClick={() => setSelectedGate(position)}
                      aria-pressed={selectedGate === position}
                      className={`min-h-[48px] rounded-xl border text-sm font-semibold transition ${
                        selectedGate === position
                          ? "bg-sts text-white border-sts shadow-sm"
                          : "bg-white border-gray-300 text-gray-700 hover:border-sts/50"
                      }`}
                    >
                      {position}
                    </button>
                  ))}
                </div>
                {!assignedPositions.length && (
                  <p className="mt-1.5 text-xs text-gray-500">
                    Tidak ada gate ter-assign.
                  </p>
                )}
              </div>

              <JudgePenaltyGrid
                values={GATE_PENALTIES}
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
              item?.operationType === "gate1"
                ? "Gate 1"
                : item?.operationType === "gate2"
                ? "Gate 2"
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
                    Rafting Cross Penalty — {gateLabel}
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
                      {item?.teamInfo?.bibTeam || "-"} • Penalty: {p} points
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

export default JudgesRaftingCrossPage;
