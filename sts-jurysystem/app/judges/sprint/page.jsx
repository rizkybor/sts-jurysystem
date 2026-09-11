"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";

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

const PENALTIES = [0, 10, 50];

function getSprintPositionFromAssignments(list, evId) {
  if (!Array.isArray(list) || !evId) return "";
  const match = list
    .flatMap((item) => item.judges || [])
    .find((j) => String(j.eventId) === String(evId));
  if (!match?.sprint) return "";
  if (match.sprint.start) return "Start";
  if (match.sprint.finish) return "Finish";
  return "";
}

const JudgesSprintPage = () => {
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
  const [selectedPenalty, setSelectedPenalty] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const assignedPosition = useMemo(
    () => getSprintPositionFromAssignments(assignments, eventId),
    [assignments, eventId]
  );

  const { teams, loadingTeams, refreshTeams, resetTeams } = useJudgeTeams({
    eventId,
    eventName: "SPRINT",
    selectedCategory,
    pushToast,
  });

  const history = useJudgeHistory({ eventId, eventType: "SPRINT", pushToast });

  const backHref = eventId
    ? `/judges?eventId=${eventId}${userId ? `&userId=${userId}` : ""}`
    : "/judges";

  const handleCategoryChange = useCallback(
    (value) => {
      setSelectedCategory(value);
      setSelectedTeam("");
      setSelectedPenalty(null);
      resetTeams();
    },
    [resetTeams]
  );

  const selectedTeamData = getSelectedTeamData(teams, selectedTeam);

  const isSubmitDisabled =
    submitting ||
    !eventId ||
    !selectedCategory ||
    !selectedTeam ||
    selectedPenalty === null ||
    !assignedPosition;

  const sendRealtimeMessage = () => {
    const socket = socketRef.current;
    if (!socket) return;
    socket.emit(
      "custom:event",
      {
        senderId: socket.id,
        from: "Judges Dashboard - Sprint",
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitDisabled) {
      pushToast({
        title: "Data Belum Lengkap",
        text: "Pilih kategori, tim, penalty, dan pastikan posisi Start/Finish terassign.",
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

    setSubmitting(true);
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
        // non-JSON, ignore
      }

      if (res.ok && data?.success) {
        pushToast({
          title: "Berhasil!",
          text: `${assignedPosition} Penalty: ${selectedPenalty} points tersimpan.`,
          type: "success",
        });
        sendRealtimeMessage();
        await refreshTeams();
        setSelectedTeam("");
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
          raceLabel="Sprint Race"
          eventDetail={eventDetail}
          loadingEvent={loadingEvent}
        />

        <JudgeRoleBadges
          items={assignedPosition ? [assignedPosition] : []}
          emptyHint="Posisi belum ter-assign untuk event ini. Hubungi admin assignment."
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

            <JudgeSectionCard step={2} title="Nilai Penalty">
              <JudgePenaltyGrid
                values={PENALTIES}
                selected={selectedPenalty}
                onChange={setSelectedPenalty}
                columns={3}
              />
            </JudgeSectionCard>
          </fieldset>

          <JudgeSummaryBar
            parts={[
              { label: "team", value: selectedTeamData?.nameTeam },
              { label: "position", value: assignedPosition },
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
            submitDisabled={isSubmitDisabled}
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
                    Sprint Penalty — {item?.position || "-"}
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

export default JudgesSprintPage;
