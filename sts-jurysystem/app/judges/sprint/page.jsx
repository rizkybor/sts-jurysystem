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
import FieldNotesModal from "@/components/judges/FieldNotesModal";

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
  const { user, assignments } = useJudgeAssignments();
  const { eventDetail, loadingEvent, combinedCategories } =
    useEventDetail(eventId);
  const { settings: raceSettings } = useRaceSettings(eventId);

  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedTeam, setSelectedTeam] = useState("");
  const [selectedPenalty, setSelectedPenalty] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [fieldNotesModalOpen, setFieldNotesModalOpen] = useState(false);

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

  // Lookup label kategori ("Initial - Division - Race") dari kombinasi
  // initialId|divisionId|raceId, dipakai utk menampilkan kategori per-entry
  // riwayat penalty (JudgeReportDetail cuma simpan ID, bukan nama).
  const categoryLabelByKey = useMemo(() => {
    const map = {};
    combinedCategories.forEach((c) => {
      map[c.value] = c.label;
    });
    return map;
  }, [combinedCategories]);

  const categoryLabelForHistoryItem = useCallback(
    (item) => {
      const key = `${item?.initialId || ""}|${item?.divisionId || ""}|${
        item?.raceId || ""
      }`;
      return categoryLabelByKey[key] || null;
    },
    [categoryLabelByKey]
  );

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

      // Beri tahu juri yang bertugas: tim mana yang baru saja lepas
      // Start, lengkap dengan BIB, nama tim, dan kategorinya — supaya
      // juri tahu persis tim mana yang sedang berjalan tanpa harus buka
      // dropdown Team satu-satu.
      const categoryLabel =
        [msg.initialName, msg.divisionName, msg.raceName]
          .filter(Boolean)
          .join(" - ") ||
        categoryLabelByKey[`${msg.initialId || ""}|${msg.divisionId || ""}|${msg.raceId || ""}`] ||
        "-";
      pushToast({
        title: "Team Lepas Start",
        text: `BIB ${msg.bibTeam || "-"} - ${
          msg.teamName || "Team"
        } - Kategori ${categoryLabel} - Lepas START`,
        type: "info",
      });

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
  }, [eventId, socketRef, pushToast, categoryLabelByKey]);

  // Relay broadcast "sprint:team-finished" dari sts-timingsystem (dikirim
  // saat satu tim genuinely selesai — Start & Finish Time terisi, lihat
  // updateTime() di SprintRace.vue) ke /api/judges/sprint/live-preview
  // supaya Live Result publik bisa menampilkan hasil tim ini SEBELUM
  // operator klik "Save Result". Tanpa toast (beda dgn team-started) —
  // ini murni data utk halaman Live Result, bukan info yg relevan buat
  // juri yang sedang bertugas.
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !eventId) return;

    const handler = (msg) => {
      if (msg?.type !== "sprint:team-finished") return;
      if (String(msg?.eventId) !== String(eventId)) return;

      fetch("/api/judges/sprint/live-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: msg.eventId,
          initialId: msg.initialId,
          divisionId: msg.divisionId,
          raceId: msg.raceId,
          teamId: msg.teamId,
          bibTeam: msg.bibTeam,
          nameTeam: msg.nameTeam,
          startTime: msg.startTime,
          finishTime: msg.finishTime,
          raceTime: msg.raceTime,
          startPenalty: msg.startPenalty,
          finishPenalty: msg.finishPenalty,
          penaltyTime: msg.penaltyTime,
          totalTime: msg.totalTime,
        }),
      }).catch((err) => {
        console.error("❌ Gagal relay sprint:team-finished:", err);
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
    // BUG FIX (2026-09-23): payload ini sebelumnya cuma teamId — kalau
    // teamId yang sama dipakai ulang di Initial lain (mis. tim yang sama
    // tampil di SENIOR & U23, lihat MEMORY-SPRINT.md), applyPenaltyFromSocket
    // di timing system bisa salah menempelkan nilai penalty ini ke baris
    // kategori LAIN yang sedang dibuka operator, krn cuma cek teamId tanpa
    // verifikasi kategori. initialId/raceId/divisionId ditambahkan supaya
    // timing system bisa memverifikasi kategori aktifnya cocok dulu.
    const [initialId, divisionId, raceId] = selectedCategory.split("|");
    socket.emit(
      "custom:event",
      {
        senderId: socket.id,
        from: "Judges Dashboard - Sprint",
        text: "Pesan realtime ke operator timing",
        teamId: selectedTeam,
        type: assignedPosition,
        value: selectedPenalty,
        judge: user?.username || user?.name || "",
        eventId,
        initialId,
        divisionId,
        raceId,
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

  // Field Notes — catatan bebas juri ke operator, versi ringan Fouls
  // Report H2H tanpa Pen Position/Detail (Sprint cuma 1 tim jalan per
  // waktu, tidak ada konsep "Unfouls Team"). MURNI socket emit, tidak
  // menyentuh /api/judges/judge-reports/detail sama sekali — sama pola
  // dgn handleFoulsSubmit H2H. Alert sukses & tutup modal OPTIMISTIC
  // (tidak menunggu ack) krn ini konfirmasi "juri sudah selesai
  // melapor", bukan konfirmasi operator sudah menerima (lihat
  // MEMORY-H2H.md, bagian sama persis).
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
      from: "Judges Dashboard - Sprint",
      eventId,
      initialId,
      divisionId,
      raceId,
      category: "SPRINT",
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

        {/* Field Notes — di luar <form> spy tidak ikut ke-disable oleh
            fieldset[disabled] submit penalty (sama pola dgn tombol
            Fouls Report H2H). */}
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
          categoryLabel={categoryLabelByKey[selectedCategory]}
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
                  {categoryLabelForHistoryItem(item) && (
                    <div className="text-xs text-gray-500">
                      Kategori: {categoryLabelForHistoryItem(item)}
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
