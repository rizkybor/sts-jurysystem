"use client";

import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

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
// sama dgn DEFAULT_DRR_SECTION_PENALTIES / DEFAULT_DRR_START_PENALTIES /
// DEFAULT_DRR_FINISH_PENALTIES di timing system (editRaceSettings.js).
const DEFAULT_SECTION_PENALTIES = [0, 5, 10, 50];
const DEFAULT_START_FINISH_PENALTIES = [0, 10, 50];

// {label, value}[] (lihat editRaceSettings.js cleanPenaltyList()) -> angka
// murni buat JudgePenaltyGrid.
function extractPenaltyValues(list) {
  if (!Array.isArray(list) || !list.length) return null;
  const values = list
    .map((p) => Number(p?.value))
    .filter((v) => Number.isFinite(v));
  return values.length ? values : null;
}

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
  const { user, assignments } = useJudgeAssignments();
  const { eventDetail, loadingEvent, combinedCategories } =
    useEventDetail(eventId);
  const { settings: raceSettings } = useRaceSettings(eventId);

  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedTeam, setSelectedTeam] = useState("");
  const [selectedSection, setSelectedSection] = useState("");
  const [selectedPenalty, setSelectedPenalty] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [fieldNotesModalOpen, setFieldNotesModalOpen] = useState(false);

  const assignedPositions = useMemo(
    () => getDRRPositionsFromAssignments(assignments, eventId),
    [assignments, eventId]
  );

  // Pilihan nilai penalty Start/Finish/Section ikut kustomisasi Race
  // Settings event ini (kalau ada) — bukan daftar hardcode, supaya tidak
  // ada nilai yang diam-diam ditolak timing system karena tidak termasuk
  // daftar yang benar-benar dikonfigurasi untuk event tsb.
  const displayedPenalties = useMemo(() => {
    if (!selectedSection) return [];
    const drr = raceSettings?.drr || {};
    const s = selectedSection.trim().toLowerCase();
    if (s === "start") {
      return (
        extractPenaltyValues(drr.startPenalties) ||
        DEFAULT_START_FINISH_PENALTIES
      );
    }
    if (s === "finish") {
      return (
        extractPenaltyValues(drr.finishPenalties) ||
        DEFAULT_START_FINISH_PENALTIES
      );
    }
    return (
      extractPenaltyValues(drr.sectionPenalties) || DEFAULT_SECTION_PENALTIES
    );
  }, [selectedSection, raceSettings]);

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

  const sendRealtimeMessage = (operationType) => {
    const socket = socketRef.current;
    if (!socket) return;
    const teamName = selectedTeamData?.nameTeam || "Unknown Team";

    let sectionValue = selectedSection;
    if (selectedSection?.startsWith("Section ")) {
      sectionValue = selectedSection.replace("Section ", "");
    }

    // BUG FIX (2026-09-23): sama pola dgn Sprint/Slalom (MEMORY-SPRINT.md)
    // — initialId/raceId/divisionId ditambahkan supaya timing system bisa
    // verifikasi kategori aktifnya cocok sebelum menempelkan penalty ini.
    const [initialId, divisionId, raceId] = selectedCategory.split("|");

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
      initialId,
      divisionId,
      raceId,
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

  // Field Notes — catatan bebas juri ke operator, versi ringan Fouls
  // Report H2H tanpa Pen Position/Detail (DRR tidak ada konsep "Unfouls
  // Team"). MURNI socket emit, tidak menyentuh
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
      from: "Judges Dashboard - DRR",
      eventId,
      initialId,
      divisionId,
      raceId,
      category: "DRR",
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
        sendRealtimeMessage(operationType);
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

        {/* Field Notes — di luar <form> spy tidak ikut ke-disable oleh
            fieldset[disabled] submit penalty (sama pola dgn Fouls
            Report H2H). */}
        <div className="max-w-2xl mx-auto px-4 pb-6 mt-4">
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
            const opLabel = item?.section
              ? `Section ${item.section}`
              : item?.operationType === "start"
              ? "Start"
              : item?.operationType === "finish"
              ? "Finish"
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
                    DRR Penalty {item?.section ? `— Section ${item.section}` : ""}
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
                      {item?.teamInfo?.bibTeam || "-"} • {opLabel} • Penalty:{" "}
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

export default JudgesDRRPage;
