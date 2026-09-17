"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

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

// Fallback kalau event belum pernah dikustomisasi lewat Race Settings —
// sesuai Peraturan Kompetisi Arung Jeram FAJI Pasal 37 & 43 (lihat
// DEFAULT_START_PENALTIES/DEFAULT_FINISH_PENALTIES di
// editRaceSettings.js): Pen. Start & Pen. Finish itu DUA daftar
// independen, bukan satu daftar gabungan — PS cuma 0/50 (kesalahan
// start), PF cuma 0/10 (pelanggaran elektronik finish). Halaman ini dulu
// pakai satu PENALTIES=[0,10,50] gabungan utk keduanya, jadi juri yang
// ditugaskan Start bisa pilih nilai "10" yang sebenarnya cuma valid utk
// Finish (dan sebaliknya "50" utk Finish) — nilai itu lolos di sini tapi
// diam-diam ditolak validasi timing system.
const DEFAULT_START_PENALTIES = [0, 50];
const DEFAULT_FINISH_PENALTIES = [0, 10];

// {label, value}[] (lihat editRaceSettings.js cleanPenaltyList()) -> angka
// murni buat JudgePenaltyGrid.
function extractPenaltyValues(list) {
  if (!Array.isArray(list) || !list.length) return null;
  const values = list
    .map((p) => Number(p?.value))
    .filter((v) => Number.isFinite(v));
  return values.length ? values : null;
}

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
  const { settings: raceSettings } = useRaceSettings(eventId);

  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedTeam, setSelectedTeam] = useState("");
  const [selectedPenalty, setSelectedPenalty] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const assignedPosition = useMemo(
    () => getSprintPositionFromAssignments(assignments, eventId),
    [assignments, eventId]
  );

  // Pilihan nilai penalty Start vs Finish ikut kustomisasi Race Settings
  // event ini (kalau ada) dan TIDAK digabung — supaya juri Start tidak
  // pernah bisa memilih nilai yang cuma valid utk Finish (atau sebaliknya)
  // dan diam-diam ditolak timing system.
  const penalties = useMemo(() => {
    const sprint = raceSettings?.sprint || {};
    if (assignedPosition === "Finish") {
      return (
        extractPenaltyValues(sprint.finishPenalties) ||
        DEFAULT_FINISH_PENALTIES
      );
    }
    return extractPenaltyValues(sprint.startPenalties) || DEFAULT_START_PENALTIES;
  }, [assignedPosition, raceSettings]);

  // Relay broadcast "sprint:team-started" dari sts-timingsystem (dikirim
  // saat operator mengisi Start Time per baris, lihat updateTime() di
  // SprintRace.vue) ke /api/judges/sprint/team-started supaya tersimpan
  // dan bisa dibaca validasi submit penalty di backend. Hanya browser
  // juri yang sedang online saat event ini terkirim yang bisa
  // meneruskannya — keterbatasan yang disadari & diterima.
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !eventId) return;

    const handler = (msg) => {
      if (msg?.type !== "sprint:team-started") return;
      if (String(msg?.eventId) !== String(eventId)) return;
      fetch("/api/judges/sprint/team-started", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: msg.eventId,
          initialId: msg.initialId,
          divisionId: msg.divisionId,
          raceId: msg.raceId,
          teamId: msg.teamId,
          bibTeam: msg.bibTeam,
          startTime: msg.startTime,
        }),
      }).catch((err) => {
        console.error("❌ Gagal relay sprint:team-started:", err);
      });
    };

    socket.on("custom:event", handler);
    return () => socket.off("custom:event", handler);
  }, [eventId, socketRef]);

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
        eventId,
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
            const isFailed = item?.status === "failed";
            const timeStr = item?.createdAt
              ? new Date(item.createdAt).toLocaleTimeString("id-ID", {
                  hour: "2-digit",
                  minute: "2-digit",
                })
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
                    Sprint Penalty — {item?.position || "-"}
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

export default JudgesSprintPage;
