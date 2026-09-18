"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

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

/**
 * Tipe penalty yang boleh dikirim juri ini, berdasarkan assignment
 * H2H-nya (start/cl/finish/other/R1/R2/L1/L2). Kontrak `key` di sini
 * HARUS bisa dipetakan ke `type` yang dipahami applyPenaltyFromSocketH2H()
 * di timing system: S/CL/F/Other -> "PenaltyStart"/"PenaltyCutLine"/
 * "PenaltyFinish"/"PenaltyOther", R1/R2/L1/L2 -> "BooyanCorner".
 */
const getH2HAssignedTypes = (list, evId) => {
  if (!Array.isArray(list) || !evId) return [];
  const match = list
    .flatMap((item) => item.judges || [])
    .find((j) => String(j.eventId) === String(evId));
  if (!match?.h2h) return [];

  const types = [];
  if (match.h2h.start) types.push({ key: "start", label: "Pen. Start (S)" });
  if (match.h2h.cl) types.push({ key: "cl", label: "Cut Line (CL)" });
  if (match.h2h.finish) types.push({ key: "finish", label: "Pen. Finish (F)" });
  if (match.h2h.other) types.push({ key: "other", label: "Pen. Others (PO)" });
  if (match.h2h.R1) types.push({ key: "r1", label: "Booyan R1" });
  if (match.h2h.R2) types.push({ key: "r2", label: "Booyan R2" });
  if (match.h2h.L1) types.push({ key: "l1", label: "Booyan L1" });
  if (match.h2h.L2) types.push({ key: "l2", label: "Booyan L2" });
  return types;
};

// Fallback kalau event belum pernah dikustomisasi lewat Race Settings —
// sama dgn DEFAULT_H2H_PENALTIES di timing system (RaceSettings.vue).
const DEFAULT_PENALTY_CHOICES = [0, 5, 10, 50];
const CORNER_KEYS = ["r1", "r2", "l1", "l2"];

// {label, value}[] (lihat editRaceSettings.js cleanPenaltyList()) -> angka
// murni buat JudgePenaltyGrid.
function extractPenaltyValues(list) {
  if (!Array.isArray(list) || !list.length) return null;
  const values = list
    .map((p) => Number(p?.value))
    .filter((v) => Number.isFinite(v));
  return values.length ? values : null;
}

const JudgesHeadToHeadPage = () => {
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
  const [selectedType, setSelectedType] = useState("");
  const [selectedPenalty, setSelectedPenalty] = useState(null);
  const [otherValue, setOtherValue] = useState("");
  const [cornerTouched, setCornerTouched] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Babak (round) H2H yang sedang aktif di timing system utk kategori
  // terpilih — H2H tidak punya "Start Time" per tim spt Sprint, jadi ini
  // pengganti sinyal "tim mana yang sekarang boleh dinilai juri".
  const [activeRound, setActiveRound] = useState(null); // {roundName, teams: [{teamId,...}]}

  const assignedTypes = useMemo(
    () => getH2HAssignedTypes(assignments, eventId),
    [assignments, eventId]
  );
  const isCornerType = CORNER_KEYS.includes(selectedType);

  // Pilihan nilai penalty Start/Cut Line/Finish ikut kustomisasi Race
  // Settings event ini (kalau ada) — bukan daftar hardcode, supaya tidak
  // ada nilai yang diam-diam ditolak timing system karena tidak termasuk
  // daftar yang benar-benar dikonfigurasi untuk event tsb.
  const penaltyChoicesByType = useMemo(() => {
    const h2h = raceSettings?.h2h || {};
    return {
      start:
        extractPenaltyValues(h2h.startPenalties) || DEFAULT_PENALTY_CHOICES,
      cl:
        extractPenaltyValues(h2h.cutLinePenalties) || DEFAULT_PENALTY_CHOICES,
      finish:
        extractPenaltyValues(h2h.finishPenalties) || DEFAULT_PENALTY_CHOICES,
    };
  }, [raceSettings]);
  const activePenaltyChoices =
    penaltyChoicesByType[selectedType] || DEFAULT_PENALTY_CHOICES;

  const { teams, loadingTeams, resetTeams } = useJudgeTeams({
    eventId,
    eventName: "HEADTOHEAD",
    selectedCategory,
    pushToast,
  });

  const history = useJudgeHistory({ eventId, eventType: "H2H", pushToast });

  const backHref = eventId
    ? `/judges?eventId=${eventId}${userId ? `&userId=${userId}` : ""}`
    : "/judges";

  const handleCategoryChange = (value) => {
    setSelectedCategory(value);
    setSelectedTeam("");
    setSelectedType("");
    setSelectedPenalty(null);
    setOtherValue("");
    setCornerTouched(null);
    setActiveRound(null);
    resetTeams();
  };

  // Muat babak aktif tersimpan (kalau ada) begitu kategori dipilih — supaya
  // status tidak kosong hanya karena juri baru membuka halaman SETELAH
  // broadcast round-active terakhir terkirim (lihat keterbatasan relay di
  // MEMORY-H2H.md).
  useEffect(() => {
    if (!eventId || !selectedCategory) return;
    const [, divisionId, raceId] = selectedCategory.split("|");
    if (!divisionId || !raceId) return;

    let cancelled = false;
    fetch(
      `/api/judges/h2h/round-active?eventId=${eventId}&divisionId=${divisionId}&raceId=${raceId}`,
      { cache: "no-store" }
    )
      .then((res) => res.json())
      .then((data) => {
        if (cancelled || !data?.success) return;
        setActiveRound(
          data.roundName
            ? { roundName: data.roundName, teams: data.teams || [] }
            : null
        );
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [eventId, selectedCategory]);

  // Relay broadcast "h2h:round-active" dari sts-timingsystem (dikirim
  // saat operator pindah/buka babak lain, lihat broadcastActiveRound() di
  // HeadToHead.vue) — tampilkan toast per tim di babak itu, simpan ke
  // database (utk filter dropdown Team + label babak aktif), dan update
  // state lokal kalau kategorinya sama dgn yang sedang dipilih juri.
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !eventId) return;

    const handler = (msg) => {
      if (msg?.type !== "h2h:round-active") return;
      if (String(msg?.eventId) !== String(eventId)) return;

      const categoryLabel =
        [msg.initialName, msg.divisionName, msg.raceName]
          .filter(Boolean)
          .join(" - ") || "-";

      (msg.teams || []).forEach((t) => {
        pushToast({
          title: "Babak Aktif",
          text: `BIB ${t.bibTeam || "-"} - ${
            t.nameTeam || "Team"
          } - Kategori ${categoryLabel} - Babak ${
            msg.roundName || "-"
          } AKTIF`,
          type: "info",
        });
      });

      fetch("/api/judges/h2h/round-active", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: msg.eventId,
          initialId: msg.initialId,
          divisionId: msg.divisionId,
          raceId: msg.raceId,
          roundId: msg.roundId,
          roundName: msg.roundName,
          teams: msg.teams,
        }),
      }).catch((err) => {
        console.error("❌ Gagal relay h2h:round-active:", err);
      });

      const [, curDivisionId, curRaceId] = (selectedCategory || "").split(
        "|"
      );
      if (
        String(msg.divisionId) === String(curDivisionId) &&
        String(msg.raceId) === String(curRaceId)
      ) {
        setActiveRound({ roundName: msg.roundName, teams: msg.teams || [] });
      }
    };

    socket.on("custom:event", handler);
    return () => socket.off("custom:event", handler);
  }, [eventId, socketRef, pushToast, selectedCategory]);

  // Set teamId dari activeRound (kalau ada babak aktif tersimpan) — dipakai
  // JudgeCategoryTeamFields utk disable tim yang tidak ada di babak itu.
  // undefined (bukan Set kosong) kalau belum ada info sama sekali, supaya
  // tidak salah menganggap "semua tim tidak aktif" sebelum data termuat.
  const activeTeamIds = useMemo(() => {
    if (!activeRound?.teams?.length) return undefined;
    return new Set(
      activeRound.teams.map((t) => String(t.teamId || "")).filter(Boolean)
    );
  }, [activeRound]);

  const handleTypeChange = (key) => {
    setSelectedType(key);
    setSelectedPenalty(null);
    setOtherValue("");
    setCornerTouched(null);
  };

  const selectedTeamData = getSelectedTeamData(teams, selectedTeam);

  // Promisify the socket ack so isSubmitting genuinely reflects whether
  // the operator received the message (fixes the double-submit race and
  // lets a failed send keep the form values instead of clearing them).
  const sendRealtimeMessage = () =>
    new Promise((resolve) => {
      const socket = socketRef.current;
      if (!socket) {
        resolve(false);
        return;
      }

      const teamName = selectedTeamData?.nameTeam || "Unknown Team";
      const actualTeamId = selectedTeamData?.teamId || selectedTeam;

      const base = {
        senderId: socket.id,
        from: "Judges Dashboard - H2H",
        teamId: actualTeamId,
        teamName,
        bibTeam: selectedTeamData?.bibTeam || "",
        judge: user?.username || user?.name || "",
        eventId,
        ts: new Date().toISOString(),
      };

      let messageData;
      if (isCornerType) {
        messageData = {
          ...base,
          text: `H2H: ${teamName} - Booyan ${selectedType.toUpperCase()} - ${
            cornerTouched ? "Passed Booyan (Y)" : "Not Passed Booyan (N)"
          }`,
          type: "BooyanCorner",
          corner: selectedType,
          touched: !!cornerTouched,
        };
      } else {
        const typeMap = {
          start: "PenaltyStart",
          cl: "PenaltyCutLine",
          finish: "PenaltyFinish",
          other: "PenaltyOther",
        };
        const value =
          selectedType === "other"
            ? Number(otherValue)
            : Number(selectedPenalty);
        messageData = {
          ...base,
          text: `H2H: ${teamName} - ${selectedType.toUpperCase()} - Penalty ${value}`,
          type: typeMap[selectedType],
          value,
        };
      }

      let settled = false;
      const timeout = setTimeout(() => {
        if (settled) return;
        settled = true;
        resolve(false);
      }, 5000);

      socket.emit("custom:event", messageData, (ok) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        resolve(!!ok);
      });
    });

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedCategory || !selectedTeam || !selectedType) {
      pushToast({
        title: "Data Belum Lengkap",
        text: "Harap pilih kategori, tim, dan tipe penalty sebelum submit",
        type: "error",
      });
      return;
    }

    if (isCornerType) {
      if (cornerTouched === null) {
        pushToast({
          title: "Data Belum Lengkap",
          text: "Harap pilih Touched / Clear",
          type: "error",
        });
        return;
      }
    } else if (selectedType === "other") {
      if (otherValue === "" || Number.isNaN(Number(otherValue))) {
        pushToast({
          title: "Data Belum Lengkap",
          text: "Harap isi nilai penalty Others",
          type: "error",
        });
        return;
      }
    } else if (selectedPenalty === null) {
      pushToast({
        title: "Data Belum Lengkap",
        text: "Harap pilih nilai penalty",
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
    const penaltyValue = isCornerType
      ? cornerTouched
        ? 1
        : 0
      : selectedType === "other"
      ? Number(otherValue)
      : Number(selectedPenalty);

    const payload = {
      eventType: "H2H",
      team: selectedTeamData.teamId,
      penalty: penaltyValue,
      eventId,
      initialId,
      divisionId,
      raceId,
      position: selectedType,
      remarks: isCornerType
        ? cornerTouched
          ? "Passed Booyan (Y)"
          : "Not Passed Booyan (N)"
        : undefined,
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

      if (!res.ok || !data?.success) {
        pushToast({
          title: "Error Submit",
          text: data?.message || `HTTP ${res.status}`,
          type: "error",
        });
        return;
      }

      const ok = await sendRealtimeMessage();
      if (ok) {
        pushToast({
          title: "Berhasil",
          text: "Penalty tersimpan dan pesan terkirim ke operator timing",
          type: "success",
        });
        // Reset value fields only (tim & kategori tetap, supaya cepat
        // lanjut ke penalty berikutnya di tim yang sama).
        setSelectedPenalty(null);
        setOtherValue("");
        setCornerTouched(null);
      } else {
        pushToast({
          title: "Tersimpan, Belum Terkirim",
          text: "Penalty sudah tersimpan, tapi pesan realtime belum sampai ke operator (pastikan babak yang sesuai sedang dibuka). Nilai yang sudah dipilih tetap tersimpan, silakan coba kirim lagi.",
          type: "warning",
          ttlMs: 6000,
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
          raceLabel="Head to Head"
          eventDetail={eventDetail}
          loadingEvent={loadingEvent}
        />

        <JudgeRoleBadges
          items={assignedTypes}
          emptyHint="Posisi belum ter-assign untuk event ini. Hubungi admin assignment."
        />

        <form
          onSubmit={handleSubmit}
          className="max-w-2xl mx-auto px-4 pb-6 pt-4 space-y-5"
        >
          <fieldset disabled={submitting} className="space-y-4">
            <JudgeSectionCard step={1} title="Kategori & Team">
              {selectedCategory && (
                <div
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium ${
                    activeRound?.roundName
                      ? "bg-sts/10 text-sts"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-current shrink-0" />
                  {activeRound?.roundName
                    ? `Babak Aktif: ${activeRound.roundName}`
                    : "Babak aktif belum diketahui — menunggu update dari timing system."}
                </div>
              )}
              <JudgeCategoryTeamFields
                loadingEvent={loadingEvent}
                combinedCategories={combinedCategories}
                selectedCategory={selectedCategory}
                onCategoryChange={handleCategoryChange}
                loadingTeams={loadingTeams}
                teams={teams}
                selectedTeam={selectedTeam}
                onTeamChange={setSelectedTeam}
                activeTeamIds={activeTeamIds}
              />
            </JudgeSectionCard>

            <JudgeSectionCard step={2} title="Tipe & Nilai Penalty">
              <div>
                <label className="block text-gray-700 mb-2 font-medium">
                  Tipe Penalty
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {assignedTypes.map((t) => (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => handleTypeChange(t.key)}
                      aria-pressed={selectedType === t.key}
                      className={`min-h-[48px] py-2 px-3 rounded-xl border text-sm font-semibold transition ${
                        selectedType === t.key
                          ? "bg-sts text-white border-sts shadow-sm"
                          : "bg-white border-gray-300 text-gray-700 hover:border-sts/50"
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
                {!assignedTypes.length && (
                  <p className="mt-1.5 text-xs text-gray-500">
                    Tidak ada tipe penalty ter-assign.
                  </p>
                )}
              </div>

              {isCornerType && (
                <div>
                  <label className="block text-gray-700 mb-2 font-medium">
                    {selectedType.toUpperCase()}
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setCornerTouched(true)}
                      aria-pressed={cornerTouched === true}
                      className={`min-h-[52px] px-2 text-sm sm:text-base rounded-xl font-semibold border transition ${
                        cornerTouched === true
                          ? "bg-red-500 text-white border-red-600"
                          : "bg-white border-gray-300 text-gray-700"
                      }`}
                    >
                      Passed Booyan (Y)
                    </button>
                    <button
                      type="button"
                      onClick={() => setCornerTouched(false)}
                      aria-pressed={cornerTouched === false}
                      className={`min-h-[52px] px-2 text-sm sm:text-base rounded-xl font-semibold border transition ${
                        cornerTouched === false
                          ? "bg-emerald-500 text-white border-emerald-600"
                          : "bg-white border-gray-300 text-gray-700"
                      }`}
                    >
                      Not Passed Booyan (N)
                    </button>
                  </div>
                </div>
              )}

              {selectedType === "other" && (
                <div>
                  <label className="block text-gray-700 mb-2 font-medium">
                    Nilai Penalty Others (detik)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={otherValue}
                    onChange={(e) => setOtherValue(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-sts/40 focus:border-sts transition"
                    placeholder="0"
                  />
                </div>
              )}

              {selectedType && !isCornerType && selectedType !== "other" && (
                <JudgePenaltyGrid
                  values={activePenaltyChoices}
                  selected={selectedPenalty}
                  onChange={setSelectedPenalty}
                />
              )}
            </JudgeSectionCard>
          </fieldset>

          <JudgeSummaryBar
            parts={[
              { label: "team", value: selectedTeamData?.nameTeam },
              {
                label: "type",
                value: assignedTypes.find((t) => t.key === selectedType)
                  ?.label,
              },
              {
                label: "value",
                value: isCornerType
                  ? cornerTouched === null
                    ? ""
                    : cornerTouched
                    ? "Passed Booyan (Y)"
                    : "Not Passed Booyan (N)"
                  : selectedType === "other"
                  ? otherValue !== ""
                    ? `Penalty ${otherValue}`
                    : ""
                  : selectedPenalty !== null
                  ? `Penalty ${selectedPenalty}`
                  : "",
              },
            ]}
          />

          <JudgeStickyActions
            onHistory={history.open}
            historyDisabled={submitting}
            submitting={submitting}
            submitDisabled={submitting}
            submitLabel="Kirim ke Operator →"
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
            const typeLabel =
              assignedTypes.find((t) => t.key === item.position)?.label ||
              item.position?.toUpperCase() ||
              "H2H";
            const valueLabel = item.remarks
              ? item.remarks
              : `Penalty ${p}`;
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
                    H2H Penalty — {typeLabel}
                  </div>
                  <div className="text-gray-600 text-sm">
                    {item?.teamInfo?.nameTeam || "Team"} BIB{" "}
                    {item?.teamInfo?.bibTeam || "-"} • {valueLabel}
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

export default JudgesHeadToHeadPage;
