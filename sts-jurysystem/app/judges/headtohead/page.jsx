"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
import {
  JudgePageContainer,
  JudgeForm,
  JudgeFormAside,
  JudgeSideAction,
} from "@/components/judges/JudgeFormLayout";
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
import FoulsReportModal from "@/components/judges/FoulsReportModal";
import {
  fetchWithTimeout,
  TIMEOUT_RETRY_MESSAGE,
} from "@/utils/fetchWithTimeout";
import {
  reportSubmitFailure,
  isConnectionFailureStatus,
} from "@/utils/judgeChatSuggestions";

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
  const [foulsModalOpen, setFoulsModalOpen] = useState(false);

  // Babak (round) H2H yang sedang aktif di timing system utk kategori
  // terpilih — H2H tidak punya "Start Time" per tim spt Sprint, jadi ini
  // pengganti sinyal "tim mana yang sekarang boleh dinilai juri".
  const [activeRound, setActiveRound] = useState(null); // {roundName, teams: [{teamId,...}]}

  // FITUR (2026-09-29, atas permintaan user): juri TIDAK perlu lagi pilih
  // Kategori dulu — langsung dapat SEMUA Heat yang sudah di-assign
  // operator lintas SELURUH kategori H2H event ini sekaligus (bukan cuma
  // babak yang kebetulan sedang "aktif" di timing system), dgn info
  // kategori tetap ditampilkan per Heat. Heat yang match-nya sudah py
  // pemenang (`completed`) otomatis disabled — tidak perlu/tidak bisa lagi
  // diberi penalty. `selectedHeatItem` = data lengkap Heat yang diklik
  // (kategori+babak+team1/team2), MENGGANTIKAN ketergantungan pada
  // activeRound utk resolve 2 tim di heat itu.
  const [allHeats, setAllHeats] = useState([]);
  const [loadingAllHeats, setLoadingAllHeats] = useState(true);
  const [selectedHeatItem, setSelectedHeatItem] = useState(null);

  const assignedTypes = useMemo(
    () => getH2HAssignedTypes(assignments, eventId),
    [assignments, eventId]
  );

  // Relay broadcast "h2h:team-finished" dari sts-timingsystem (dikirim
  // saat satu tim genuinely selesai — Start & Finish Time terisi di babak
  // aktif, lihat updateTime() di HeadToHead.vue) ke
  // /api/judges/h2h/live-preview supaya Live Result publik bisa
  // menampilkan waktu tim ini SEBELUM operator klik "Save Round" — pola
  // sama persis dgn relay sprint:team-finished di app/judges/sprint/page.jsx.
  // Win/Lose & placement akhir TETAP dari mesin bracket, tidak disentuh di
  // sini. Tanpa toast, murni data utk halaman Live Result.
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !eventId) return;

    const handler = (msg) => {
      if (msg?.type !== "h2h:team-finished") return;
      if (String(msg?.eventId) !== String(eventId)) return;

      fetch("/api/judges/h2h/live-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: msg.eventId,
          initialId: msg.initialId,
          divisionId: msg.divisionId,
          raceId: msg.raceId,
          teamId: msg.teamId,
          roundId: msg.roundId,
          roundName: msg.roundName,
          bibTeam: msg.bibTeam,
          nameTeam: msg.nameTeam,
          startTime: msg.startTime,
          finishTime: msg.finishTime,
          raceTime: msg.raceTime,
        }),
      }).catch((err) => {
        console.error("❌ Gagal relay h2h:team-finished:", err);
      });
    };

    socket.on("custom:event", handler);
    return () => socket.off("custom:event", handler);
  }, [eventId, socketRef]);

  // FITUR (2026-09-29): ambil SEMUA Heat yang sudah di-assign lintas
  // kategori dari /api/judges/h2h/all-heats, lalu refresh otomatis begitu
  // broadcast "h2h:bracket-updated" diterima (dikirim sts-timingsystem
  // setiap bracket manapun disimpan — Heat baru, match selesai, dll — lihat
  // notifyH2HBracketUpdated() di socketBroadcast.js). Ini yang membuat
  // daftar Heat di halaman ini selalu real-time TANPA operator perlu
  // menjadikan babak itu "aktif" dulu.
  const fetchAllHeats = () => {
    if (!eventId) return;
    setLoadingAllHeats(true);
    fetch(`/api/judges/h2h/all-heats?eventId=${eventId}`, { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (data?.success) setAllHeats(data.heats || []);
      })
      .catch((err) => console.error("❌ Gagal memuat daftar Heat:", err))
      .finally(() => setLoadingAllHeats(false));
  };

  useEffect(() => {
    fetchAllHeats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !eventId) return;

    const handler = (msg) => {
      if (msg?.type !== "h2h:bracket-updated") return;
      if (String(msg?.eventId) !== String(eventId)) return;
      fetchAllHeats();
    };

    socket.on("custom:event", handler);
    return () => socket.off("custom:event", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId, socketRef]);

  // Klik tombol Heat (lintas kategori) — derive Kategori dari Heat yang
  // dipilih (initialId|divisionId|raceId, format sama dgn value di
  // combinedCategories), lalu reuse handleCategoryChange() apa adanya
  // supaya semua efek samping (reset field, refetch teams via
  // useJudgeTeams, dll) tetap konsisten dgn alur pilih-kategori-manual yg
  // lama.
  const handleHeatButtonClick = (item) => {
    const categoryKey = `${item.initialId}|${item.divisionId}|${item.raceId}`;
    if (selectedCategory !== categoryKey) {
      handleCategoryChange(categoryKey);
    }
    setSelectedHeatItem(item);
  };

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

  // Pilihan "Pen Detail" di Fouls Report ikut kustomisasi Race Settings
  // event ini (kalau operator sudah mengaturnya) — fallback ke
  // FOUL_DETAILS bawaan (hardcode) kalau event belum pernah diatur sama
  // sekali. Bentuk data dari Race Settings SUDAH `{key,label,seconds}[]`
  // (lihat editRaceSettings.js cleanFoulDetailsList()), sama persis dgn
  // shape yang dipakai FoulsReportModal — tidak perlu transformasi lagi.
  const foulDetails = useMemo(() => {
    const list = raceSettings?.h2h?.foulsDetails;
    return Array.isArray(list) && list.length ? list : undefined;
  }, [raceSettings]);

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
    setSelectedHeatItem(null);
    resetTeams();
  };

  // Muat babak aktif tersimpan (kalau ada) begitu kategori dipilih — supaya
  // status tidak kosong hanya karena juri baru membuka halaman SETELAH
  // broadcast round-active terakhir terkirim (lihat keterbatasan relay di
  // MEMORY-H2H.md).
  useEffect(() => {
    if (!eventId || !selectedCategory) return;
    // BUG FIX (2026-09-23): initialId sebelumnya dibuang (destructure `[,
    // divisionId, raceId]`) — kalau raceId+divisionId KEBETULAN sama di
    // Initial berbeda (mis. SENIOR vs U23, sama pola dgn bug initialId
    // Sprint/Slalom/DRR, lihat MEMORY-SPRINT.md), babak aktif/Heat yang
    // ditampilkan bisa salah nyasar ambil dari kategori lain.
    const [initialId, divisionId, raceId] = selectedCategory.split("|");
    if (!divisionId || !raceId) return;

    let cancelled = false;
    fetch(
      `/api/judges/h2h/round-active?eventId=${eventId}&initialId=${initialId}&divisionId=${divisionId}&raceId=${raceId}`,
      { cache: "no-store" }
    )
      .then((res) => res.json())
      .then((data) => {
        if (cancelled || !data?.success) return;
        setActiveRound(
          data.roundName
            ? {
                roundId: data.roundId,
                roundName: data.roundName,
                teams: data.teams || [],
                matches: data.matches || [],
              }
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

      // BUG FIX: broadcastActiveRound() sekarang juga terpanggil dari edit
      // bracket (assign/lepas tim, ubah Heat) — bukan cuma pindah babak.
      // `msg.silent` (dikirim dari HeadToHead.vue) menandai broadcast itu
      // sbg "cuma update data", supaya toast per-tim di bawah TIDAK ikut
      // fire ulang utk semua tim di babak tiap kali operator mengedit
      // bracket satu per satu — data (filter Team/label babak) tetap
      // diperbarui via fetch di bawah, cuma toast-nya yang dilewati.
      if (!msg.silent) {
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
      }

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
          matches: msg.matches,
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
        setActiveRound({
          roundId: msg.roundId,
          roundName: msg.roundName,
          teams: msg.teams || [],
          matches: msg.matches || [],
        });
      }
    };

    socket.on("custom:event", handler);
    return () => socket.off("custom:event", handler);
  }, [eventId, socketRef, pushToast, selectedCategory]);

  // 2 tombol Team 1 vs Team 2 begitu tombol Heat diklik — menggantikan
  // dropdown Team (lihat `teamFieldOverride` di JudgeCategoryTeamFields).
  // BEDA dgn versi lama: `selectedHeatItem` datang dari data bracket
  // (h2h_brackets, lihat all-heats/route.js) yang TIDAK menyimpan teamId
  // sama sekali (`assignTeamToMatchSlot()` di HeadToHead.vue cuma simpan
  // {name, bibTeam}) — jadi resolve ke `teams` (dari useJudgeTeams, sumber
  // `_id`/`hasValidTeamId`) HARUS lewat `bibTeam`, bukan `teamId` lagi.
  const heatTeamButtons = useMemo(() => {
    if (!selectedHeatItem) return null;
    const resolve = (slot) => {
      const bib = slot?.bibTeam ? String(slot.bibTeam) : "";
      const matched = bib
        ? teams.find((t) => String(t.bibTeam || "") === bib)
        : null;
      return {
        _id: matched?._id || "",
        nameTeam: matched?.nameTeam || slot?.nameTeam || "-",
        bibTeam: matched?.bibTeam || slot?.bibTeam || "",
        hasValidTeamId: matched ? matched.hasValidTeamId : false,
      };
    };
    const t1 = resolve(selectedHeatItem.team1);
    const t2 = resolve(selectedHeatItem.team2);
    if (!t1 && !t2) return null;
    return [t1, t2].filter(Boolean);
  }, [selectedHeatItem, teams]);

  const handleTypeChange = (key) => {
    setSelectedType(key);
    setSelectedPenalty(null);
    setOtherValue("");
    setCornerTouched(null);
  };

  const selectedTeamData = getSelectedTeamData(teams, selectedTeam);

  // Tombol "Kirim ke Operator" — sebelumnya HANYA disable saat `submitting`,
  // semua validasi lain (kategori/heat/tim/tipe/nilai belum lengkap) baru
  // ketahuan SETELAH diklik lewat toast di handleSubmit(). Disamakan dgn
  // pola isSubmitDisabled Sprint (app/judges/sprint/page.jsx) supaya juri
  // langsung lihat tombolnya nonaktif kalau ada yg belum diisi — DITAMBAH
  // `!selectedHeatItem` krn alur H2H (2026-09-29) sekarang WAJIB pilih Heat
  // dulu (bukan lagi kategori manual) sebelum tim & tipe penalty bisa
  // diisi. Cek `hasValidTeamId` sengaja TETAP di luar (spt Sprint) supaya
  // juri dapat toast spesifik "Team Tidak Valid" di handleSubmit(), bukan
  // cuma tombol mati tanpa penjelasan.
  const isSubmitDisabled =
    submitting ||
    !eventId ||
    !selectedHeatItem ||
    !selectedCategory ||
    !selectedTeam ||
    !selectedType ||
    (isCornerType
      ? cornerTouched === null
      : selectedType === "other"
      ? otherValue === "" || Number.isNaN(Number(otherValue))
      : selectedPenalty === null);

  // "Unfouls Team" utk modal Fouls Report — otomatis diambil dari lawan
  // team terpilih di Heat yang diklik (selectedHeatItem), TIDAK dipilih
  // manual oleh juri. Match by `bibTeam` (bracket tidak simpan teamId,
  // lihat catatan di heatTeamButtons di atas). null kalau team terpilih
  // bukan salah satu dari 2 tim di heat itu.
  const unfoulTeamData = useMemo(() => {
    const bib = selectedTeamData?.bibTeam ? String(selectedTeamData.bibTeam) : "";
    if (!bib || !selectedHeatItem) return null;
    if (String(selectedHeatItem.team1?.bibTeam || "") === bib) {
      return selectedHeatItem.team2 || null;
    }
    if (String(selectedHeatItem.team2?.bibTeam || "") === bib) {
      return selectedHeatItem.team1 || null;
    }
    return null;
  }, [selectedTeamData, selectedHeatItem]);

  // Cegah juri submit Fouls Report yang PERSIS SAMA (tim+babak+posisi+
  // detail) 2x — cek sesi lokal (ref, bukan state, supaya tidak trigger
  // re-render) sebelum mengirim. Ini lapisan pertama (langsung, tanpa
  // round-trip); lapisan kedua ada di sts-timingsystem
  // (insertH2HFoulsReport, cek DB) sbg jaring pengaman kalau ada juri
  // lain/device lain yang kebetulan kirim kombinasi identik.
  const submittedFoulsKeysRef = useRef(new Set());

  // Kirim Fouls Report — MURNI socket, TIDAK lewat
  // /api/judges/judge-reports/detail sama sekali, supaya tidak pernah
  // menyentuh alur penalty resmi (STEP 0 validasi, JudgeReportDetail,
  // dsb). Timing system yang menyimpannya (lihat
  // HeadToHead.vue::receiveFoulsReport()).
  const handleFoulsSubmit = (payload) =>
    new Promise((resolve) => {
      const socket = socketRef.current;
      if (!socket || !selectedTeamData?.hasValidTeamId) {
        pushToast({
          title: "Gagal Mengirim",
          text: "Koneksi realtime belum siap atau team tidak valid.",
          type: "error",
        });
        resolve(false);
        return;
      }

      const foulsKey = [
        selectedTeamData.teamId,
        selectedHeatItem?.roundId || activeRound?.roundId || "",
        payload.position,
        payload.detail,
      ].join("|");
      if (submittedFoulsKeysRef.current.has(foulsKey)) {
        pushToast({
          title: "Sudah Pernah Dilaporkan",
          text: `Fouls "${payload.detailLabel || payload.detail}" di posisi "${
            payload.positionLabel || payload.position
          }" utk team ${
            selectedTeamData.nameTeam
          } di babak ini sudah pernah dilaporkan. Tidak bisa dikirim 2x.`,
          type: "warning",
          ttlMs: 6000,
        });
        resolve(false);
        return;
      }

      const [initialId, divisionId, raceId] = selectedCategory.split("|");
      const message = {
        senderId: socket.id,
        type: "FoulsReport",
        from: "Judges Dashboard - H2H",
        eventId,
        initialId,
        divisionId,
        raceId,
        roundId: selectedHeatItem?.roundId || activeRound?.roundId || "",
        roundName: selectedHeatItem?.roundName || activeRound?.roundName || "",
        foulTeam: {
          teamId: selectedTeamData.teamId,
          bibTeam: selectedTeamData.bibTeam || "",
          nameTeam: selectedTeamData.nameTeam || "",
        },
        unfoulTeam: unfoulTeamData
          ? {
              teamId: unfoulTeamData.teamId,
              bibTeam: unfoulTeamData.bibTeam || "",
              nameTeam: unfoulTeamData.nameTeam || "",
            }
          : null,
        judge: user?.username || user?.name || "",
        ts: new Date().toISOString(),
        ...payload, // position, positionLabel, detail, detailLabel, penaltySecondsLabel, remarks
      };

      // Alert "berhasil submit" di sini menandakan JURI sudah selesai
      // mengisi & mengirim laporannya — bukan konfirmasi operator timing
      // system sudah menerimanya (itu urusan terpisah, di sisi
      // sts-timingsystem sendiri lewat toast "Fouls Report Diterima").
      // Makanya alert & tutup modal ini TIDAK menunggu ack socket — kalau
      // ditunggu, dan kebetulan tidak ada operator/juri lain yang online
      // utk me-relay tepat saat itu (keterbatasan yang sudah didokumentasi
      // di MEMORY-H2H.md), juri pengirim akan melihat modal "menggantung"
      // padahal aksinya sendiri sudah tuntas.
      submittedFoulsKeysRef.current.add(foulsKey);
      pushToast({
        title: "Fouls Report Terkirim",
        text: `${payload.detailLabel || "Fouls"} — ${
          selectedTeamData.nameTeam
        } berhasil disubmit.`,
        type: "success",
      });
      setFoulsModalOpen(false);
      resolve(true);

      let settled = false;
      const timeout = setTimeout(() => {
        if (settled) return;
        settled = true;
        console.warn(
          "⚠️ FoulsReport: tidak ada balasan ack socket dalam 5 detik (kemungkinan tidak ada juri/operator online utk me-relay)."
        );
      }, 5000);

      socket.emit("custom:event", message, (ok) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        if (!ok) {
          console.warn(
            "⚠️ FoulsReport: ack socket mengembalikan gagal — laporan mungkin belum sampai ke operator."
          );
        }
      });
    });

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
      // BUG FIX (2026-09-23): sama pola dgn Sprint/Slalom/DRR/RX
      // (MEMORY-SPRINT.md) — initialId/raceId/divisionId/roundId
      // ditambahkan supaya timing system bisa verifikasi kategori+babak
      // aktifnya cocok sebelum menempelkan penalty ini (teamId bisa
      // dipakai ulang lintas Initial).
      const [initialId, divisionId, raceId] = selectedCategory.split("|");

      const base = {
        senderId: socket.id,
        from: "Judges Dashboard - H2H",
        teamId: actualTeamId,
        teamName,
        bibTeam: selectedTeamData?.bibTeam || "",
        judge: user?.username || user?.name || "",
        eventId,
        initialId,
        divisionId,
        raceId,
        roundId: selectedHeatItem?.roundId || activeRound?.roundId || "",
        // Dikirim (2026-09-30) supaya toast "Penalty Realtime Ditolak" di
        // sts-timingsystem (applyPenaltyFromSocketH2H) bisa kasih tau
        // operator PERSIS kategori & babak mana yg harus dibuka, kalau
        // Heat yg dipilih juri kebetulan bukan yg sedang tampil di layar
        // operator saat ini.
        heat: selectedHeatItem?.heat || null,
        categoryLabel: selectedHeatItem?.categoryLabel || "",
        heatRoundName: selectedHeatItem?.roundName || "",
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

    // BUG FIX (2026-09-29): pesan lama selalu bilang "pilih kategori, tim,
    // dan tipe penalty" sekaligus — membingungkan krn sejak redesign, juri
    // TIDAK PERNAH memilih Kategori secara manual lagi (`selectedCategory`
    // otomatis ke-derive dari tombol Heat yang diklik, lihat
    // handleHeatButtonClick()). Jadi `!selectedCategory` di sini artinya
    // "belum klik Heat manapun", bukan "belum pilih kategori" — pesannya
    // dipecah per kondisi supaya sesuai apa yg benar2 juri lihat di layar.
    if (!selectedHeatItem || !selectedCategory) {
      pushToast({
        title: "Data Belum Lengkap",
        text: "Harap pilih salah satu Heat terlebih dahulu",
        type: "error",
      });
      return;
    }
    if (!selectedTeam) {
      pushToast({
        title: "Data Belum Lengkap",
        text: "Harap pilih Team terlebih dahulu",
        type: "error",
      });
      return;
    }
    if (!selectedType) {
      pushToast({
        title: "Data Belum Lengkap",
        text: "Harap pilih tipe penalty terlebih dahulu",
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
      roundId: selectedHeatItem?.roundId || activeRound?.roundId || "",
      position: selectedType,
      remarks: isCornerType
        ? cornerTouched
          ? "Passed Booyan (Y)"
          : "Not Passed Booyan (N)"
        : undefined,
    };

    // Data utk saran pesan Live Chat kalau submit gagal krn koneksi
    // (lihat utils/judgeChatSuggestions.js).
    const failureInfo = {
      eventId,
      category: "h2h",
      task: (assignedTypes.find((t) => t.key === selectedType) || {}).label || selectedType,
      categoryLabel:
        (combinedCategories.find((c) => c.value === selectedCategory) || {})
          .label || "",
      team: selectedTeamData?.nameTeam || "",
      bib: selectedTeamData?.bibTeam || "",
      penalty: isCornerType ? payload.remarks : penaltyValue,
    };

    setSubmitting(true);
    try {
      const res = await fetchWithTimeout("/api/judges/judge-reports/detail", {
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
        if (isConnectionFailureStatus(res.status)) {
          reportSubmitFailure({ ...failureInfo, reason: "server" });
        }
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
        reportSubmitFailure({ ...failureInfo, reason: "realtime" });
        pushToast({
          title: "Tersimpan, Belum Terkirim",
          text: "Penalty sudah tersimpan, tapi pesan realtime belum sampai ke operator (pastikan babak yang sesuai sedang dibuka). Nilai yang sudah dipilih tetap tersimpan, silakan coba kirim lagi.",
          type: "warning",
          ttlMs: 6000,
        });
      }
    } catch (err) {
      console.error("Submit error:", err);
      const timedOut = err?.name === "AbortError";
      reportSubmitFailure({
        ...failureInfo,
        reason: timedOut ? "timeout" : "network",
      });
      pushToast(
        {
          title: timedOut ? "Timeout" : "Network Error",
          text: timedOut
            ? TIMEOUT_RETRY_MESSAGE
            : "Gagal mengirim data! Coba lagi, atau laporkan lewat Live Chat (saran pesan sudah disiapkan).",
          type: "error",
        },
        timedOut ? 8000 : undefined
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <JudgeToastStack toasts={toasts} onDismiss={removeToast} />

      <div className="min-h-screen bg-slate-50">
        <JudgeTopBar
          backHref={backHref}
          raceLabel="Head to Head"
          eventDetail={eventDetail}
          loadingEvent={loadingEvent}
        />

        <JudgePageContainer>
          <JudgeRoleBadges
            items={assignedTypes}
            emptyHint="Posisi belum ter-assign untuk event ini. Hubungi admin assignment."
          />

          <JudgeForm onSubmit={handleSubmit}>
            <fieldset disabled={submitting} className="min-w-0 space-y-4">
              <JudgeSectionCard step={1} title="Pilih Heat & Team">
                {selectedHeatItem && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium bg-sts/10 text-sts">
                    <span className="w-1.5 h-1.5 rounded-full bg-current shrink-0" />
                    {`Heat ${selectedHeatItem.heat} — ${selectedHeatItem.categoryLabel} · ${selectedHeatItem.roundName}`}
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
                  hideCategoryField
                  categoryRequiredMessage="Pilih salah satu Heat di atas terlebih dahulu."
                  betweenCategoryAndTeam={
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-gray-700 font-medium">
                          Heat
                        </label>
                        {!loadingAllHeats && allHeats.length > 0 && (
                          <span className="text-xs font-semibold text-gray-500 bg-gray-100 rounded-full px-2 py-0.5">
                            {allHeats.length} Heat
                          </span>
                        )}
                      </div>
                      {loadingAllHeats ? (
                        <p className="text-xs text-gray-500">Loading heat...</p>
                      ) : allHeats.length === 0 ? (
                        <p className="text-xs text-gray-500">
                          Belum ada Heat yang di-assign operator timing system.
                        </p>
                      ) : (
                        <div
                          className={`grid grid-cols-2 lg:grid-cols-3 gap-2 ${
                            allHeats.length > 8
                              ? "max-h-72 md:max-h-[28rem] overflow-y-auto pr-1 -mr-1"
                              : ""
                          }`}
                        >
                          {allHeats.map((item) => {
                            const key = `${item.initialId}|${item.divisionId}|${item.raceId}|${item.roundId}|${item.heat}`;
                            const selected =
                              selectedHeatItem &&
                              String(selectedHeatItem.heat) === String(item.heat) &&
                              selectedHeatItem.roundId === item.roundId;
                            return (
                              <button
                                key={key}
                                type="button"
                                disabled={item.completed}
                                onClick={() => handleHeatButtonClick(item)}
                                className={`px-3 py-2.5 rounded-xl border text-left transition ${
                                  item.completed
                                    ? "bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed"
                                    : selected
                                    ? "bg-sts text-white border-sts shadow-md"
                                    : "bg-white border-gray-300 text-gray-700 hover:border-sts/50"
                                }`}
                              >
                                <span className="block text-[11px] opacity-80 truncate">
                                  {item.categoryLabel} · {item.roundName}
                                </span>
                                <span className="block text-sm font-bold">
                                  Heat {item.heat}
                                  {item.completed ? " (Selesai)" : ""}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                      <p className="mt-1.5 text-xs text-gray-500">
                        Heat yang sudah selesai dipertandingkan (sudah py
                        pemenang) otomatis dinonaktifkan.
                      </p>
                    </div>
                  }
                  teamFieldOverride={
                    heatTeamButtons ? (
                      <div>
                        <label className="block text-gray-700 mb-2 font-medium">
                          Team
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          {heatTeamButtons.map((t, idx) => {
                            const selected =
                              !!t._id && selectedTeam === t._id;
                            const disabled = !t._id || !t.hasValidTeamId;
                            return (
                              <button
                                key={t._id || idx}
                                type="button"
                                disabled={disabled}
                                onClick={() => setSelectedTeam(t._id)}
                                className={`px-3 py-3 rounded-xl text-sm font-semibold border transition text-center ${
                                  selected
                                    ? "bg-sts text-white border-sts shadow-md"
                                    : disabled
                                    ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                                    : "bg-white text-gray-800 border-gray-300 hover:border-sts hover:text-sts"
                                }`}
                              >
                                {t.nameTeam}
                                {t.bibTeam ? ` - ${t.bibTeam}` : ""}
                                {disabled && !t._id
                                  ? " (tidak ditemukan)"
                                  : disabled
                                  ? " (ID tidak valid)"
                                  : ""}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ) : null
                  }
                />
              </JudgeSectionCard>
            </fieldset>

            <JudgeFormAside>
              <fieldset disabled={submitting} className="min-w-0 space-y-4">
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
                              ? "bg-emerald-500 text-white border-emerald-600 "
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
                              ? "bg-red-500 text-white border-red-600"
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

              {/* Fouls Report — fitur terpisah dari alur penalty resmi, murni
                  informasi ke operator (lihat MEMORY-H2H.md). Sengaja di luar
                  fieldset[disabled] supaya tidak ikut ter-disable saat submit
                  penalty biasa berjalan. type="button" → tidak men-submit form. */}
              <JudgeSideAction
                tone="amber"
                disabled={!selectedCategory || !selectedTeam}
                onClick={() => setFoulsModalOpen(true)}
                hint="Pilih kategori & team terlebih dahulu utk melaporkan fouls."
                icon={
                  <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                    <path
                      fillRule="evenodd"
                      d="M8.485 2.495c.673-1.165 2.357-1.165 3.03 0l6.28 10.875c.673 1.167-.17 2.63-1.516 2.63H3.72c-1.346 0-2.189-1.463-1.515-2.63L8.485 2.495ZM10 6a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 6Zm0 7a.9.9 0 1 0 0-1.8.9.9 0 0 0 0 1.8Z"
                      clipRule="evenodd"
                    />
                  </svg>
                }
              >
                Laporkan Fouls (Pelanggaran)
              </JudgeSideAction>

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
                submitDisabled={isSubmitDisabled}
              />
            </JudgeFormAside>
          </JudgeForm>
        </JudgePageContainer>

        <FoulsReportModal
          open={foulsModalOpen}
          onClose={() => setFoulsModalOpen(false)}
          roundName={selectedHeatItem?.roundName || activeRound?.roundName}
          foulTeam={selectedTeamData}
          unfoulTeam={unfoulTeamData}
          foulDetails={foulDetails}
          onSubmit={handleFoulsSubmit}
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
                    H2H Penalty — {typeLabel}
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
                      {item?.teamInfo?.bibTeam || "-"} • {valueLabel}
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

export default JudgesHeadToHeadPage;
