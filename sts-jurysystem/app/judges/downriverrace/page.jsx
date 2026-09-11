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

const ALL_PENALTIES = [0, 5, 10, -10, 50];
const START_FINISH_PENALTIES = [0, 10, 50];

function getDRRPositionsFromAssignments(list, evId) {
  if (!Array.isArray(list) || !evId) return [];
  const match = list
    .flatMap((item) => item.judges || [])
    .find((j) => String(j.eventId) === String(evId));
  if (!match?.drr) return [];

  const positions = [];
  if (Array.isArray(match.drr.sections)) {
    positions.push(...match.drr.sections.map((s) => `Section ${s}`));
  }
  if (match.drr.start) positions.push("Start");
  if (match.drr.finish) positions.push("Finish");
  return positions;
}

const JudgesDRRPage = () => {
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
  const [selectedSection, setSelectedSection] = useState("");
  const [selectedPenalty, setSelectedPenalty] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const assignedPositions = useMemo(
    () => getDRRPositionsFromAssignments(assignments, eventId),
    [assignments, eventId]
  );

  const displayedPenalties = useMemo(() => {
    if (!selectedSection) return [];
    const s = selectedSection.trim().toLowerCase();
    if (s === "start" || s === "finish") return START_FINISH_PENALTIES;
    return ALL_PENALTIES;
  }, [selectedSection]);

  const { teams, loadingTeams, refreshTeams, resetTeams } = useJudgeTeams({
    eventId,
    eventName: "DRR",
    selectedCategory,
    pushToast,
  });

  const history = useJudgeHistory({ eventId, eventType: "DRR", pushToast });

  const backHref = eventId
    ? `/judges?eventId=${eventId}${userId ? `&userId=${userId}` : ""}`
    : "/judges";

  const handleCategoryChange = (value) => {
    setSelectedCategory(value);
    setSelectedTeam("");
    setSelectedSection("");
    setSelectedPenalty(null);
    resetTeams();
  };

  const selectedTeamData = getSelectedTeamData(teams, selectedTeam);

  const sendRealtimeMessage = (operationType, sectionNumber) => {
    const socket = socketRef.current;
    if (!socket) return;
    const teamName = selectedTeamData?.nameTeam || "Unknown Team";

    let sectionValue = selectedSection;
    if (selectedSection?.startsWith("Section ")) {
      sectionValue = selectedSection.replace("Section ", "");
    }

    const messageData = {
      senderId: socket.id,
      from: "Judges Dashboard - DRR",
      text: `DRR: ${teamName} - ${selectedSection} - Penalty ${selectedPenalty}`,
      teamId: selectedTeam,
      teamName,
      value: selectedPenalty,
      section: sectionValue,
      penalty: Number(selectedPenalty),
      eventId,
      ts: new Date().toISOString(),
      type:
        operationType === "start"
          ? "PenaltyStart"
          : operationType === "finish"
          ? "PenaltyFinish"
          : "PenaltyGates",
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

    let operationType = "section";
    let sectionNumber = selectedSection;
    if (selectedSection.startsWith("Section ")) {
      sectionNumber = parseInt(selectedSection.replace("Section ", ""), 10);
    } else if (selectedSection === "Start") {
      operationType = "start";
    } else if (selectedSection === "Finish") {
      operationType = "finish";
    }

    const payload = {
      eventType: "DRR",
      team: actualTeamId,
      penalty: selectedPenalty,
      section: sectionNumber,
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
          text: `${selectedSection}: Penalty ${selectedPenalty} berhasil disimpan!`,
          type: "success",
        });
        sendRealtimeMessage(operationType, sectionNumber);
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
          raceLabel="Down River Race"
          eventDetail={eventDetail}
          loadingEvent={loadingEvent}
        />

        <JudgeRoleBadges
          items={assignedPositions}
          emptyHint="Posisi/section belum ter-assign untuk event ini. Hubungi admin assignment."
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

            <JudgeSectionCard step={2} title="Section & Nilai Penalty">
              <div>
                <label className="block text-gray-700 mb-2 font-medium">
                  Section
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {assignedPositions.map((position) => (
                    <button
                      key={position}
                      type="button"
                      onClick={() => {
                        setSelectedSection(position);
                      }}
                      aria-pressed={selectedSection === position}
                      className={`min-h-[48px] rounded-xl border text-sm font-semibold transition ${
                        selectedSection === position
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
                    Tidak ada section/posisi ter-assign.
                  </p>
                )}
              </div>

              <JudgePenaltyGrid
                values={displayedPenalties}
                selected={selectedPenalty}
                onChange={setSelectedPenalty}
                columns={displayedPenalties.length > 4 ? 5 : 3}
              />
            </JudgeSectionCard>
          </fieldset>

          <JudgeSummaryBar
            parts={[
              { label: "team", value: selectedTeamData?.nameTeam },
              { label: "section", value: selectedSection },
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
            const timeStr = item?.createdAt
              ? new Date(item.createdAt).toLocaleTimeString("id-ID", {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "-";
            return (
              <>
                <div
                  className={`grid place-items-center h-12 w-12 rounded-xl ring shrink-0 ${penaltyBadgeColor(
                    p
                  )}`}
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
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-gray-900">
                    DRR Penalty {item?.section ? `— Section ${item.section}` : ""}
                  </div>
                  <div className="text-gray-600 text-sm">
                    {item?.teamInfo?.nameTeam || "Team"} BIB{" "}
                    {item?.teamInfo?.bibTeam || "-"} • Penalty: {p} points
                  </div>
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

export default JudgesDRRPage;
