"use client";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Fragment, useEffect, useMemo, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import getSocket from "@/utils/socket";
import { firstEventFileUrl } from "@/utils/eventMedia";

const DEFAULT_IMG = "/images/logo-dummy.png";

// Format waktu timingsystem "HH:MM:SS.mmm" -> ms, dipakai buat cari run
// tercepat (best time) per tim di tabel Slalom.
function timeToMs(str) {
  if (!str || typeof str !== "string") return Infinity;
  const [h = "0", m = "0", rest = "0.000"] = str.split(":");
  const [s = "0", ms = "0"] = String(rest).split(".");
  const n =
    Number(h) * 3600000 + Number(m) * 60000 + Number(s) * 1000 + Number(ms);
  return Number.isFinite(n) ? n : Infinity;
}

const CATEGORY_TABS = [
  { label: "Sprint", code: "SPRINT" },
  { label: "Head To Head", code: "H2H" },
  { label: "Slalom", code: "SLALOM" },
  { label: "DRR", code: "DRR" },
  { label: "Rafting Cross", code: "RX" },
  { label: "Overall", code: "OVERALL" },
];

// Nama kategori di eventsCollection.categoriesEvent -> kode tab internal
const EVENT_CATEGORY_NAME_TO_CODE = {
  SPRINT: "SPRINT",
  HEAD2HEAD: "H2H",
  SLALOM: "SLALOM",
  DRR: "DRR",
  RX: "RX",
};

// Kode tab lokal -> key di eventsCollection.resultsOfficialByCategory
// (ditulis sts-timingsystem, lihat insertNewEvent.js::setResultsOfficial()
// — field lama `resultsOfficial` (event-wide, satu flag utk semua
// kategori) sudah TIDAK dipakai lagi oleh timing system sejak migrasi
// ke per-kategori, "raftingcross" bukan "rx").
const CATEGORY_CODE_TO_OFFICIAL_KEY = {
  SPRINT: "sprint",
  H2H: "h2h",
  SLALOM: "slalom",
  DRR: "drr",
  RX: "raftingcross",
};

// Kolom breakdown per kategori di tab Overall — persis field yang
// dibangun mapOverallDetailed() di API, sama dengan tabel "Print Result
// Overall" (event-overall-pdfResult.vue) di sts-timingsystem.
const OVERALL_CATEGORY_META = [
  { code: "SPRINT", label: "Sprint", scoreKey: "sprintScore", rankKey: "sprintRank" },
  { code: "H2H", label: "H2H", scoreKey: "h2hScore", rankKey: "h2hRank" },
  { code: "SLALOM", label: "Slalom", scoreKey: "slalomScore", rankKey: "slalomRank" },
  { code: "DRR", label: "DRR", scoreKey: "drrScore", rankKey: "drrRank" },
  { code: "RX", label: "Rafting Cross", scoreKey: "rxScore", rankKey: "rxRank" },
];

// Sprint, DRR, Slalom, H2H, dan Overall punya tabel detail sendiri (lihat
// isSprintDetailed/isDrrDetailed/isSlalomDetailed/isH2HDetailed/
// isOverallDetailed) — ini cuma dipakai RX yang masih pakai tampilan kartu
// ringkas.
const CATEGORY_COLUMNS = {
  RX: ["score", "rank"],
};

const POLL_INTERVAL_MS = 20000;

const ROTATE_DURATION_OPTIONS = [5, 10, 15, 20, 30];

const RANK_BADGE = {
  1: "from-yellow-300 via-yellow-400 to-yellow-600 text-yellow-950 shadow-[0_0_18px_rgba(250,204,21,0.55)]",
  2: "from-slate-200 via-slate-300 to-slate-400 text-slate-900 shadow-[0_0_14px_rgba(203,213,225,0.4)]",
  3: "from-amber-500 via-amber-600 to-amber-800 text-amber-50 shadow-[0_0_14px_rgba(180,83,9,0.45)]",
};

function LiveClock() {
  const [now, setNow] = useState(null);
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  if (!now) return null;
  return (
    <span className="tabular-nums">
      {now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
    </span>
  );
}

export default function LiveEventDetail() {
  const { id } = useParams(); // "/live/[id]"

  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errMsg, setErrMsg] = useState(null);
  const abortRef = useRef(null);

  const [activeCategory, setActiveCategory] = useState(null);
  const [selectedBucket, setSelectedBucket] = useState("");

  const [results, setResults] = useState({ teams: [], updatedAt: null });
  const [loadingResults, setLoadingResults] = useState(false);
  const [resultsError, setResultsError] = useState(null);
  const [justUpdated, setJustUpdated] = useState(false);

  const [toasts, setToasts] = useState([]);
  const toastId = useRef(1);
  const socketRef = useRef(null);

  const [shareOpen, setShareOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const shareMenuRef = useRef(null);

  // Fullscreen pakai Fullscreen API BAWAAN BROWSER pada root <section> di
  // bawah — Navbar/Footer global (app/layout.jsx) otomatis ikut tersembunyi
  // begitu masuk fullscreen karena keduanya BUKAN bagian dari elemen yang
  // di-fullscreen-kan (bukan lewat state React/hide manual).
  const sectionRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const [autoPlay, setAutoPlay] = useState(false);
  const [rotateSeconds, setRotateSeconds] = useState(10);
  const [slideKey, setSlideKey] = useState(0);
  const rotateIndexRef = useRef(0);

  const pushToast = (msg, ttlMs = 3500) => {
    const tid = toastId.current++;
    setToasts((prev) => [...prev, { id: tid, ...msg }]);
    setTimeout(
      () => setToasts((prev) => prev.filter((t) => t.id !== tid)),
      ttlMs
    );
  };

  // Fetch event detail
  useEffect(() => {
    if (!id) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const fetchById = async () => {
      setLoading(true);
      setErrMsg(null);
      try {
        const res = await fetch(`/api/matches/${id}`, {
          signal: controller.signal,
          cache: "no-store",
        });
        if (!res.ok) throw new Error(`Failed to fetch event (${res.status})`);
        const data = await res.json();

        const normalized = {
          id: String(data.id ?? data._id ?? id),
          name: data.eventName ?? "Untitled",
          levelName: data.levelName ?? "-",
          participantCount: Array.isArray(data.participant)
            ? data.participant.length
            : 0,
          startDate: data.startDateEvent ?? null,
          endDate: data.endDateEvent ?? null,
          city: data.addressCity ?? "",
          province: data.addressProvince ?? "",
          image: DEFAULT_IMG,
          posterUrl: data.poster_url || "",
          logoUrl: firstEventFileUrl(data.eventFiles),
          sponsorLogos: Array.isArray(data.sponsorFiles) ? data.sponsorFiles : [],
          categoriesEvent: data.categoriesEvent || [],
          categoriesInitial: data.categoriesInitial || [],
          categoriesDivision: data.categoriesDivision || [],
          categoriesRace: data.categoriesRace || [],
          // Status Official/Unofficial PER KATEGORI, diset operator di
          // sts-timingsystem (event:set-official ->
          // eventsCollection.resultsOfficialByCategory.<kategori>) — sama
          // field & makna dengan stempel OFFICIAL/UNOFFICIAL di PDF Print
          // Result timing system. Dibaca ulang scr live lewat
          // refreshOfficialStatus() (poll + broadcast socket
          // "official:changed"), lihat useEffect di bawah.
          officialByCategory: data.resultsOfficialByCategory || {},
        };

        setEvent(normalized);
      } catch (e) {
        if (e.name !== "AbortError") setErrMsg(e.message || "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    fetchById();
    return () => controller.abort();
  }, [id]);

  // Refresh RINGAN cuma status Official/Unofficial (bukan seluruh detail
  // event) — dipanggil dari polling & socket "official:changed" di bawah,
  // supaya badge Official ikut hidup tanpa perlu refetch seluruh payload
  // event tiap kali.
  const refreshOfficialStatus = async () => {
    if (!id) return;
    try {
      const res = await fetch(`/api/matches/${id}`, { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setEvent((prev) =>
        prev
          ? { ...prev, officialByCategory: data.resultsOfficialByCategory || {} }
          : prev
      );
    } catch {
      // non-fatal — badge cukup tetap nilai lama, poll berikutnya coba lagi
    }
  };

  // Tutup menu share saat klik di luar
  useEffect(() => {
    if (!shareOpen) return;
    const onClickOutside = (e) => {
      if (shareMenuRef.current && !shareMenuRef.current.contains(e.target)) {
        setShareOpen(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [shareOpen]);

  const getShareUrl = () =>
    typeof window !== "undefined" ? window.location.href : "";

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(getShareUrl());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      pushToast({ title: "Gagal", text: "Tidak bisa menyalin link.", type: "error" });
    }
  };

  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(
      `🔴 Live Result — ${event?.name || "Event"}\n${getShareUrl()}`
    );
    window.open(`https://wa.me/?text=${text}`, "_blank", "noopener,noreferrer");
    setShareOpen(false);
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: event?.name || "Live Result",
          text: `Live Result — ${event?.name || ""}`,
          url: getShareUrl(),
        });
      } catch {
        // dibatalkan user, abaikan
      }
      setShareOpen(false);
    } else {
      setShareOpen((v) => !v);
    }
  };

  // Sinkron state tombol dgn status fullscreen sesungguhnya — perlu,
  // karena user bisa keluar fullscreen lewat Esc/tombol browser, bukan
  // cuma lewat tombol kita.
  useEffect(() => {
    const onFsChange = () => {
      const fsEl =
        document.fullscreenElement || document.webkitFullscreenElement;
      setIsFullscreen(!!fsEl && fsEl === sectionRef.current);
    };
    document.addEventListener("fullscreenchange", onFsChange);
    document.addEventListener("webkitfullscreenchange", onFsChange);
    return () => {
      document.removeEventListener("fullscreenchange", onFsChange);
      document.removeEventListener("webkitfullscreenchange", onFsChange);
    };
  }, []);

  const toggleFullscreen = async () => {
    try {
      const el = sectionRef.current;
      const fsEl = document.fullscreenElement || document.webkitFullscreenElement;
      if (!fsEl) {
        if (el?.requestFullscreen) await el.requestFullscreen();
        else if (el?.webkitRequestFullscreen) el.webkitRequestFullscreen();
      } else {
        if (document.exitFullscreen) await document.exitFullscreen();
        else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
      }
    } catch (err) {
      console.error("❌ Fullscreen error:", err);
      pushToast({
        title: "Fullscreen Gagal",
        text: "Browser ini tidak mendukung mode fullscreen.",
        type: "error",
      });
    }
  };

  // Tab kategori mengikuti disiplin yang benar-benar dipertandingkan di
  // event ini (eventsCollection.categoriesEvent), bukan daftar tetap.
  const availableTabs = useMemo(() => {
    if (!event) return [];
    const codes = new Set(
      event.categoriesEvent
        .map((c) => EVENT_CATEGORY_NAME_TO_CODE[String(c.name || "").toUpperCase()])
        .filter(Boolean)
    );
    const tabs = CATEGORY_TABS.filter((t) => t.code !== "OVERALL" && codes.has(t.code));
    if (tabs.length > 1) tabs.push(CATEGORY_TABS[CATEGORY_TABS.length - 1]); // Overall
    return tabs;
  }, [event]);

  // Pilih tab pertama yang valid begitu daftar tab diketahui / berubah
  useEffect(() => {
    if (!availableTabs.length) return;
    if (!availableTabs.some((t) => t.code === activeCategory)) {
      setActiveCategory(availableTabs[0].code);
    }
  }, [availableTabs, activeCategory]);

  // Bucket (Initial - Division - Race) options, sama pola dengan halaman judges
  const bucketOptions = useMemo(() => {
    if (!event) return [];
    const list = [];
    event.categoriesInitial.forEach((initial) => {
      event.categoriesDivision.forEach((division) => {
        event.categoriesRace.forEach((race) => {
          list.push({
            label: `${initial.name} - ${division.name} - ${race.name}`,
            value: `${initial.value}|${division.value}|${race.value}`,
            initialId: initial.value,
            divisionId: division.value,
            raceId: race.value,
            raceName: race.name,
          });
        });
      });
    });
    return list;
  }, [event]);

  useEffect(() => {
    if (!selectedBucket && bucketOptions.length) {
      setSelectedBucket(bucketOptions[0].value);
    }
  }, [bucketOptions, selectedBucket]);

  const activeBucket = useMemo(
    () => bucketOptions.find((b) => b.value === selectedBucket) || null,
    [bucketOptions, selectedBucket]
  );

  // Urutan slide auto-play: tiap tab kategori, diputar lagi utk tiap kelas/divisi
  const rotationSlides = useMemo(() => {
    if (!availableTabs.length) return [];
    if (!bucketOptions.length) {
      return availableTabs.map((t) => ({ category: t.code, bucketValue: null }));
    }
    return availableTabs.flatMap((t) =>
      bucketOptions.map((b) => ({ category: t.code, bucketValue: b.value }))
    );
  }, [availableTabs, bucketOptions]);

  const toggleAutoPlay = () => {
    setAutoPlay((prev) => {
      const next = !prev;
      if (next) {
        const idx = rotationSlides.findIndex(
          (s) =>
            s.category === activeCategory &&
            (s.bucketValue === selectedBucket || !s.bucketValue)
        );
        rotateIndexRef.current = idx >= 0 ? idx : 0;
        setSlideKey((k) => k + 1);
      }
      return next;
    });
  };

  const stopAutoPlay = () => setAutoPlay(false);

  // Jalankan rotasi otomatis: ganti tab + bucket tiap `rotateSeconds`
  useEffect(() => {
    if (!autoPlay || rotationSlides.length < 2) return;
    const timer = setInterval(() => {
      rotateIndexRef.current = (rotateIndexRef.current + 1) % rotationSlides.length;
      const slide = rotationSlides[rotateIndexRef.current];
      setActiveCategory(slide.category);
      if (slide.bucketValue) setSelectedBucket(slide.bucketValue);
      setSlideKey((k) => k + 1);
    }, rotateSeconds * 1000);
    return () => clearInterval(timer);
  }, [autoPlay, rotationSlides, rotateSeconds]);

  // Kalau daftar slide berubah (mis. event baru dimuat) sementara auto-play
  // aktif, hentikan supaya tidak merujuk index yang sudah tidak valid.
  useEffect(() => {
    if (rotationSlides.length < 2) setAutoPlay(false);
  }, [rotationSlides.length]);

  const fetchResults = async () => {
    if (!id || !activeCategory) return;
    if (activeCategory !== "OVERALL" && !activeBucket) return;

    setLoadingResults((cur) => (results.teams.length ? cur : true));
    setResultsError(null);
    try {
      const params = new URLSearchParams({ category: activeCategory });
      if (activeBucket) {
        params.set("initialId", activeBucket.initialId);
        params.set("divisionId", activeBucket.divisionId);
        params.set("raceId", activeBucket.raceId);
        if (activeCategory === "OVERALL") {
          params.set("raceName", activeBucket.raceName);
        }
      }
      const res = await fetch(
        `/api/events/${id}/live-results?${params.toString()}`,
        { cache: "no-store" }
      );
      const data = await res.json();
      if (res.ok && data.success) {
        setResults((prev) => {
          // Kategori yang doc-nya konsisten menyimpan updatedAt (Sprint/
          // DRR/Slalom) bisa dibandingkan murah tanpa serialize seluruh
          // array tim; kalau salah satu sisi tidak punya updatedAt (mis.
          // h2h_overall/rx_overall), fallback ke deep-compare biar animasi
          // "baru diperbarui" tetap akurat.
          const changed =
            data.updatedAt && prev.updatedAt
              ? data.updatedAt !== prev.updatedAt
              : JSON.stringify(prev.teams) !== JSON.stringify(data.teams || []);
          if (changed && prev.teams.length) {
            setJustUpdated(true);
            setTimeout(() => setJustUpdated(false), 1200);
          }
          return { teams: data.teams || [], updatedAt: data.updatedAt };
        });
      } else {
        setResultsError(data.message || "Gagal memuat hasil");
      }
    } catch (err) {
      setResultsError(err.message || "Gagal memuat hasil");
    } finally {
      setLoadingResults(false);
    }
  };

  useEffect(() => {
    fetchResults();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, activeCategory, activeBucket?.value]);

  useEffect(() => {
    const timer = setInterval(() => {
      fetchResults();
      refreshOfficialStatus();
    }, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, activeCategory, activeBucket?.value]);

  useEffect(() => {
    const socket = getSocket();
    socketRef.current = socket;

    const handler = (msg) => {
      if (!msg || String(msg.eventId || "") !== String(id)) return;

      // BUG FIX: operator toggle Official/Unofficial di timing system
      // (event:set-official) sebelumnya TIDAK PERNAH broadcast apa pun —
      // badge di sini cuma bisa "kebetulan" ikut benar kalau
      // fetchResults() lain kejadian ke-trigger bersamaan. Sekarang
      // timing system broadcast tipe "official:changed" (lihat
      // notifyOfficialStatusChanged() di socketBroadcast.js) begitu
      // toggle disimpan — refresh langsung, tidak nunggu poll 20 detik.
      if (msg.type === "official:changed") {
        refreshOfficialStatus();
        pushToast({
          title: "Status Resmi Diperbarui",
          text: `Kategori ${msg.category || "-"} sekarang ${
            msg.value ? "OFFICIAL" : "UNOFFICIAL"
          }.`,
          type: "info",
        });
        return;
      }

      if (msg.type !== "results:updated") return;
      if (String(msg.category || "") !== activeCategory) return;
      if (
        activeBucket &&
        (String(msg.initialId || "") !== String(activeBucket.initialId) ||
          String(msg.divisionId || "") !== String(activeBucket.divisionId) ||
          String(msg.raceId || "") !== String(activeBucket.raceId))
      ) {
        return;
      }

      fetchResults();
      pushToast({ title: "Hasil diperbarui", text: "Live result baru saja diperbarui.", type: "success" });
    };

    socket.on("custom:event", handler);
    return () => socket.off("custom:event", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, activeCategory, activeBucket?.value]);

  const columns = CATEGORY_COLUMNS[activeCategory] || ["rank"];
  const activeTabLabel = availableTabs.find((t) => t.code === activeCategory)?.label || "";
  // Status Official/Unofficial utk TAB YANG SEDANG AKTIF — key mapping
  // lihat CATEGORY_CODE_TO_OFFICIAL_KEY (mis. RX -> "raftingcross").
  const activeCategoryOfficialKey = CATEGORY_CODE_TO_OFFICIAL_KEY[activeCategory];
  const isActiveCategoryOfficial = activeCategoryOfficialKey
    ? !!event?.officialByCategory?.[activeCategoryOfficialKey]
    : false;
  const isSprintDetailed = activeCategory === "SPRINT";
  const isDrrDetailed = activeCategory === "DRR";
  const isSlalomDetailed = activeCategory === "SLALOM";
  const isH2HDetailed = activeCategory === "H2H";
  const isOverallDetailed = activeCategory === "OVERALL";
  const overallCategories = OVERALL_CATEGORY_META.filter((c) =>
    availableTabs.some((t) => t.code === c.code)
  );

  return (
    <section
      ref={sectionRef}
      // overflow-x-hidden (bukan overflow-hidden) supaya SAAT fullscreen
      // browser masih bisa scroll vertikal — Fullscreen API bawaan browser
      // memaksa elemen ini persis setinggi viewport, jadi overflow-y perlu
      // tetap "auto" kalau hasil race lebih panjang dari layar.
      className="min-h-screen bg-[#050b16] text-white relative overflow-x-hidden overflow-y-auto"
    >
      {/* Ambient glow background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[32rem] h-[32rem] rounded-full bg-sts/25 blur-[120px]" />
        <div className="absolute top-1/3 -right-40 w-[28rem] h-[28rem] rounded-full bg-blue-600/20 blur-[120px]" />
        <div className="absolute bottom-0 left-1/4 w-[24rem] h-[24rem] rounded-full bg-cyan-500/10 blur-[110px]" />
      </div>

      {/* Toasts */}
      <div className="fixed top-6 right-6 z-50 flex flex-col gap-3">
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ x: 200, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 200, opacity: 0 }}
            className="p-3 rounded-xl border border-emerald-400/30 bg-emerald-950/80 backdrop-blur-xl text-emerald-300 shadow-lg"
          >
            <p className="font-semibold text-sm">{toast.title}</p>
            <p className="text-xs opacity-90">{toast.text}</p>
          </motion.div>
        ))}
      </div>

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-6">
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
            </span>
            <span className="uppercase tracking-[0.25em] text-[11px] sm:text-xs font-bold text-red-400">
              Live
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <span className="hidden sm:block text-xs text-white/50 font-medium">
              <LiveClock />
            </span>

            {/* Share */}
            <div className="relative" ref={shareMenuRef}>
              <button
                type="button"
                onClick={handleNativeShare}
                className="flex items-center gap-1.5 text-xs sm:text-sm px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
                  <path d="M18 16.08a2.92 2.92 0 0 0-1.95.75L8.91 12.7a3 3 0 0 0 0-1.4l7.05-4.11a3 3 0 1 0-.9-1.72L8 9.58a3 3 0 1 0 0 4.84l7.13 4.16a3 3 0 1 0 2.87-2.5Z" />
                </svg>
                <span className="hidden xs:inline">Bagikan</span>
              </button>

              <AnimatePresence>
                {shareOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -6, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.97 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 mt-2 w-52 rounded-xl border border-white/10 bg-[#0c1a2e] shadow-2xl shadow-black/50 overflow-hidden z-20"
                  >
                    <button
                      type="button"
                      onClick={handleShareWhatsApp}
                      className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-white hover:bg-white/5 transition-colors"
                    >
                      <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-emerald-400 flex-shrink-0">
                        <path d="M12 2a10 10 0 0 0-8.6 15L2 22l5.14-1.35A10 10 0 1 0 12 2Zm0 18.2a8.17 8.17 0 0 1-4.17-1.14l-.3-.18-3.05.8.81-2.97-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.14c-.25-.12-1.45-.72-1.68-.8-.22-.08-.39-.12-.55.12-.16.25-.63.8-.78.96-.14.16-.28.18-.53.06-.25-.12-1.06-.39-2.01-1.24-.75-.66-1.25-1.48-1.4-1.73-.14-.25-.02-.38.11-.5.11-.11.25-.28.37-.42.12-.14.16-.25.25-.41.08-.16.04-.31-.02-.43-.06-.12-.55-1.32-.75-1.81-.2-.48-.4-.41-.55-.42h-.47c-.16 0-.43.06-.65.31-.22.25-.86.84-.86 2.04 0 1.2.88 2.36 1 2.53.12.16 1.73 2.64 4.2 3.7.59.25 1.05.4 1.4.51.59.19 1.13.16 1.55.1.47-.07 1.45-.59 1.66-1.16.2-.57.2-1.06.14-1.16-.06-.11-.22-.17-.47-.29Z" />
                      </svg>
                      WhatsApp
                    </button>
                    <button
                      type="button"
                      onClick={handleCopyLink}
                      className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-white hover:bg-white/5 transition-colors border-t border-white/5"
                    >
                      <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-sts flex-shrink-0">
                        {copied ? (
                          <path d="M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17Z" />
                        ) : (
                          <path d="M16 1H4a2 2 0 0 0-2 2v14h2V3h12V1Zm3 4H8a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2Zm0 16H8V7h11v14Z" />
                        )}
                      </svg>
                      {copied ? "Link tersalin!" : "Salin Link"}
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Fullscreen — sembunyikan Navbar/Footer global (bukan
                bagian elemen ini) supaya cocok dipakai di layar TV/proyektor
                venue lomba. */}
            <button
              type="button"
              onClick={toggleFullscreen}
              title={isFullscreen ? "Keluar Fullscreen" : "Fullscreen"}
              className="flex items-center gap-1.5 text-xs sm:text-sm px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
            >
              {isFullscreen ? (
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
                  <path d="M8 3v3a2 2 0 0 1-2 2H3v2h3a4 4 0 0 0 4-4V3H8Zm8 0h-2v3a4 4 0 0 0 4 4h3V8h-3a2 2 0 0 1-2-2V3ZM8 21v-3a2 2 0 0 0-2-2H3v-2h3a4 4 0 0 1 4 4v3H8Zm8 0h-2v-3a4 4 0 0 1 4-4h3v2h-3a2 2 0 0 0-2 2v3Z" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
                  <path d="M3 9V3h6v2H5v4H3Zm12-6h6v6h-2V5h-4V3ZM3 15h2v4h4v2H3v-6Zm16 4v-4h2v6h-6v-2h4Z" />
                </svg>
              )}
              <span className="hidden xs:inline">
                {isFullscreen ? "Keluar" : "Fullscreen"}
              </span>
            </button>

            <Link
              href="/live"
              className="text-xs sm:text-sm px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
            >
              ← Kembali
            </Link>
          </div>
        </div>

        {/* Loading / Error */}
        {loading && (
          <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-8 mb-6 text-center text-white/60">
            Memuat data event…
          </div>
        )}
        {errMsg && (
          <div className="rounded-2xl border border-red-500/30 bg-red-950/40 text-red-300 p-4 mb-6">
            {errMsg}
          </div>
        )}

        {/* Event Info */}
        {!loading && !errMsg && event && (
          <div className="mb-8 flex items-center gap-4 sm:gap-5">
            {event.logoUrl ? (
              <img
                src={event.logoUrl}
                alt={`${event.name} logo`}
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-contain border border-white/15 shadow-lg flex-shrink-0 bg-white p-1.5"
                onError={(e) => {
                  if (!e.currentTarget.src.endsWith(DEFAULT_IMG)) {
                    e.currentTarget.src = DEFAULT_IMG;
                    e.currentTarget.className =
                      "w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border border-white/15 shadow-lg flex-shrink-0 bg-white/5";
                  }
                }}
              />
            ) : (
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl border border-white/15 bg-gradient-to-br from-sts/40 to-blue-900/40 shadow-lg flex-shrink-0 flex items-center justify-center text-2xl sm:text-3xl font-extrabold text-white/80">
                {event.name?.charAt(0)?.toUpperCase() || "E"}
              </div>
            )}

            <div className="min-w-0">
              <h1 className="text-2xl sm:text-5xl font-extrabold tracking-tight leading-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-white to-white/70">
                {event.name}
              </h1>
              <div className="mt-2 sm:mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs sm:text-sm text-white/60">
                <span className="inline-flex items-center gap-1.5">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5 text-sts">
                    <path d="M12 2 1 21h22L12 2Z" />
                  </svg>
                  {event.levelName}
                </span>
                {(event.city || event.province) && (
                  <span className="inline-flex items-center gap-1.5">
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5 text-sts">
                      <path d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7Zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5Z" />
                    </svg>
                    {event.city}
                    {event.city && event.province ? ", " : ""}
                    {event.province}
                  </span>
                )}
                <span className="inline-flex items-center gap-1.5">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5 text-sts">
                    <path d="M7 2v2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2V2h-2v2H9V2H7Zm-2 8h14v10H5V10Z" />
                  </svg>
                  {event.startDate
                    ? new Date(event.startDate).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })
                    : "-"}
                  {" – "}
                  {event.endDate
                    ? new Date(event.endDate).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })
                    : "-"}
                </span>
              </div>
            </div>
          </div>
        )}

        {!loading && !errMsg && event && (
          <>
            {/* Tabs + Auto-play control */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div className="flex flex-wrap items-center gap-2">
                {availableTabs.map((tab) => (
                  <button
                    key={tab.code}
                    onClick={() => {
                      setActiveCategory(tab.code);
                      stopAutoPlay();
                    }}
                    className={`relative px-4 sm:px-5 py-2 sm:py-2.5 rounded-full text-sm sm:text-base font-semibold transition-all ${
                      activeCategory === tab.code
                        ? "bg-gradient-to-r from-sts to-blue-500 text-white shadow-[0_0_20px_rgba(24,116,165,0.5)]"
                        : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white border border-white/10"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
                {availableTabs.length === 0 && (
                  <p className="text-white/50 text-sm">
                    Belum ada kategori yang dikonfigurasi untuk event ini.
                  </p>
                )}
              </div>

              {/* Auto-play */}
              {rotationSlides.length > 1 && (
                <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] pl-1.5 pr-3 py-1.5">
                  <button
                    type="button"
                    onClick={toggleAutoPlay}
                    className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
                      autoPlay
                        ? "bg-red-500 text-white hover:bg-red-600"
                        : "bg-gradient-to-r from-sts to-blue-500 text-white hover:opacity-90"
                    }`}
                    aria-label={autoPlay ? "Hentikan auto-play" : "Mulai auto-play"}
                    title={autoPlay ? "Stop" : "Play"}
                  >
                    {autoPlay ? (
                      <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
                        <rect x="6" y="5" width="4" height="14" rx="1" />
                        <rect x="14" y="5" width="4" height="14" rx="1" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5 ml-0.5">
                        <path d="M8 5v14l11-7L8 5Z" />
                      </svg>
                    )}
                  </button>

                  <select
                    value={rotateSeconds}
                    onChange={(e) => setRotateSeconds(Number(e.target.value))}
                    className="bg-transparent text-white/70 text-xs sm:text-sm font-medium border-none outline-none focus:ring-0 [color-scheme:dark]"
                  >
                    {ROTATE_DURATION_OPTIONS.map((s) => (
                      <option key={s} value={s} className="bg-[#0a1628] text-white">
                        {s}s
                      </option>
                    ))}
                  </select>

                  {autoPlay && (
                    <span className="relative flex h-1.5 w-10 rounded-full bg-white/10 overflow-hidden">
                      <motion.span
                        key={slideKey}
                        initial={{ width: "0%" }}
                        animate={{ width: "100%" }}
                        transition={{ duration: rotateSeconds, ease: "linear" }}
                        className="absolute inset-y-0 left-0 bg-gradient-to-r from-sts to-blue-400 rounded-full"
                      />
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Bucket selector */}
            {bucketOptions.length > 0 && (
              <div className="mb-6 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
                <label className="text-[11px] uppercase tracking-wider text-white/40 font-semibold sm:whitespace-nowrap">
                  Kelas / Divisi
                </label>
                <select
                  value={selectedBucket}
                  onChange={(e) => {
                    setSelectedBucket(e.target.value);
                    stopAutoPlay();
                  }}
                  className="w-full sm:max-w-md bg-transparent text-white text-sm sm:text-base font-medium border-none outline-none focus:ring-0 py-1 [color-scheme:dark]"
                >
                  {bucketOptions.map((opt) => (
                    <option key={opt.value} value={opt.value} className="bg-[#0a1628] text-white">
                      {opt.label}
                    </option>
                  ))}
                </select>
                {autoPlay && (
                  <span className="inline-flex items-center gap-1.5 text-[11px] text-sts font-semibold sm:ml-auto">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sts opacity-75" />
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-sts" />
                    </span>
                    Auto-play aktif
                  </span>
                )}
              </div>
            )}

            {/* Updated-at info */}
            <div className="flex items-center justify-between mb-3 px-1">
              <div className="flex items-center gap-2.5">
                <h2 className="text-lg sm:text-xl font-bold text-white/90">{activeTabLabel}</h2>
                {activeCategory !== "OVERALL" && (
                  <span
                    className={`px-2.5 py-1 rounded-full text-[10px] sm:text-[11px] font-bold uppercase tracking-wider border ${
                      isActiveCategoryOfficial
                        ? "border-emerald-400/60 text-emerald-300 bg-emerald-500/10"
                        : "border-red-400/60 text-red-300 bg-red-500/10"
                    }`}
                    title="Status hasil ditetapkan operator di timing system, per kategori"
                  >
                    {isActiveCategoryOfficial ? "Official" : "Unofficial"}
                  </span>
                )}
              </div>
              {results.updatedAt && (
                <p className="text-[11px] sm:text-xs text-white/40">
                  Diperbarui {new Date(results.updatedAt).toLocaleTimeString("id-ID")}
                </p>
              )}
            </div>

            {/* Leaderboard */}
            <motion.div
              animate={justUpdated ? { boxShadow: "0 0 0 2px rgba(74,222,128,0.5)" } : { boxShadow: "0 0 0 0px rgba(74,222,128,0)" }}
              transition={{ duration: 0.6 }}
              className="rounded-2xl overflow-hidden border border-white/10 bg-white/[0.03] backdrop-blur"
            >
              {loadingResults && !results.teams.length ? (
                <div className="p-12 text-center text-white/50">Memuat hasil…</div>
              ) : resultsError ? (
                <div className="p-6 text-center text-red-300">{resultsError}</div>
              ) : results.teams.length === 0 ? (
                <div className="p-12 text-center">
                  <p className="text-white/50">Belum ada hasil untuk kategori/kelas ini.</p>
                </div>
              ) : isSprintDetailed ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="text-[11px] uppercase tracking-wider text-white/40 font-semibold border-b border-white/10">
                        <th className="text-left px-4 py-3 whitespace-nowrap">No</th>
                        <th className="text-left px-4 py-3 whitespace-nowrap">Team Name</th>
                        <th className="text-left px-4 py-3 whitespace-nowrap">BIB</th>
                        <th className="text-right px-4 py-3 whitespace-nowrap">Ranked</th>
                        <th className="text-right px-4 py-3 whitespace-nowrap">Start Time</th>
                        <th className="text-right px-4 py-3 whitespace-nowrap">Finish Time</th>
                        <th className="text-right px-4 py-3 whitespace-nowrap">Penalty Time</th>
                        <th className="text-right px-4 py-3 whitespace-nowrap">Result</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.teams.map((r, idx) => {
                        const isTop3 = r.rank >= 1 && r.rank <= 3;
                        const isProvisional = r.rank != null && !r.rankIsFinal;
                        return (
                          <tr
                            key={`${r.bib}-${r.name}`}
                            className={`border-b border-white/5 last:border-b-0 ${
                              isTop3 ? "bg-white/[0.04]" : "hover:bg-white/[0.02]"
                            } ${r.isLivePreview ? "bg-emerald-500/[0.04]" : ""} transition-colors`}
                          >
                            <td className="px-4 py-3 text-white/50 font-medium whitespace-nowrap">
                              {idx + 1}
                            </td>
                            <td className="px-4 py-3 font-bold text-white whitespace-nowrap">
                              <span className="inline-flex items-center gap-1.5">
                                {r.name}
                                {r.isLivePreview && (
                                  <span
                                    className="inline-flex items-center gap-1 text-[9px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-400/30"
                                    title="Tim sudah selesai di timing system, hasil sementara ini belum di-Save Result oleh operator"
                                  >
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                    Live
                                  </span>
                                )}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-white/60 whitespace-nowrap">{r.bib}</td>
                            <td className="px-4 py-3 text-right whitespace-nowrap">
                              <span
                                className={`inline-flex items-center gap-1 font-bold tabular-nums ${
                                  isTop3 ? "text-yellow-300" : "text-white"
                                }`}
                              >
                                {r.rank ?? "-"}
                                {isProvisional && (
                                  <span
                                    className="text-[9px] uppercase tracking-wider font-semibold px-1 py-0.5 rounded-full bg-white/10 text-white/50 border border-white/10"
                                    title="Peringkat sementara berdasarkan hasil saat ini — belum difinalisasi operator"
                                  >
                                    Live
                                  </span>
                                )}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right font-mono text-white/70 tabular-nums whitespace-nowrap">
                              {r.startTime || "-"}
                            </td>
                            <td className="px-4 py-3 text-right font-mono text-white/70 tabular-nums whitespace-nowrap">
                              {r.finishTime || "-"}
                            </td>
                            <td className="px-4 py-3 text-right font-mono text-red-400 tabular-nums whitespace-nowrap">
                              {r.penaltyTime || "-"}
                            </td>
                            <td className="px-4 py-3 text-right font-mono font-bold text-white tabular-nums whitespace-nowrap">
                              {r.totalTime || "-"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : isDrrDetailed ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="text-[11px] uppercase tracking-wider text-white/40 font-semibold border-b border-white/10">
                        <th className="text-left px-4 py-3 whitespace-nowrap">No</th>
                        <th className="text-left px-4 py-3 whitespace-nowrap">Team Name</th>
                        <th className="text-left px-4 py-3 whitespace-nowrap">BIB</th>
                        <th className="text-right px-4 py-3 whitespace-nowrap">Ranked</th>
                        <th className="text-right px-4 py-3 whitespace-nowrap">Penalty Time</th>
                        <th className="text-right px-4 py-3 whitespace-nowrap">Start Time</th>
                        <th className="text-right px-4 py-3 whitespace-nowrap">Finish Time</th>
                        <th className="text-right px-4 py-3 whitespace-nowrap">Result</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.teams.map((r, idx) => {
                        const isTop3 = r.rank >= 1 && r.rank <= 3;
                        const isProvisional = r.rank != null && !r.rankIsFinal;
                        return (
                          <tr
                            key={`${r.bib}-${r.name}`}
                            className={`border-b border-white/5 last:border-b-0 ${
                              isTop3 ? "bg-white/[0.04]" : "hover:bg-white/[0.02]"
                            } transition-colors`}
                          >
                            <td className="px-4 py-3 text-white/50 font-medium whitespace-nowrap">
                              {idx + 1}
                            </td>
                            <td className="px-4 py-3 font-bold text-white whitespace-nowrap">
                              {r.name}
                            </td>
                            <td className="px-4 py-3 text-white/60 whitespace-nowrap">{r.bib}</td>
                            <td className="px-4 py-3 text-right whitespace-nowrap">
                              <span
                                className={`inline-flex items-center gap-1 font-bold tabular-nums ${
                                  isTop3 ? "text-yellow-300" : "text-white"
                                }`}
                              >
                                {r.rank ?? "-"}
                                {isProvisional && (
                                  <span
                                    className="text-[9px] uppercase tracking-wider font-semibold px-1 py-0.5 rounded-full bg-white/10 text-white/50 border border-white/10"
                                    title="Peringkat sementara berdasarkan hasil saat ini — belum difinalisasi operator"
                                  >
                                    Live
                                  </span>
                                )}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right font-mono text-red-400 tabular-nums whitespace-nowrap">
                              {r.penaltyTime || "-"}
                            </td>
                            <td className="px-4 py-3 text-right font-mono text-white/70 tabular-nums whitespace-nowrap">
                              {r.startTime || "-"}
                            </td>
                            <td className="px-4 py-3 text-right font-mono text-white/70 tabular-nums whitespace-nowrap">
                              {r.finishTime || "-"}
                            </td>
                            <td className="px-4 py-3 text-right font-mono font-bold text-white tabular-nums whitespace-nowrap">
                              {r.totalTime || "-"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : isSlalomDetailed ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="text-[11px] uppercase tracking-wider text-white/40 font-semibold border-b border-white/10">
                        <th className="text-left px-4 py-3 whitespace-nowrap">No</th>
                        <th className="text-left px-4 py-3 whitespace-nowrap">Team Name</th>
                        <th className="text-left px-4 py-3 whitespace-nowrap">BIB</th>
                        <th className="text-right px-4 py-3 whitespace-nowrap">Ranked</th>
                        <th className="text-left px-4 py-3 whitespace-nowrap">Run</th>
                        <th className="text-right px-4 py-3 whitespace-nowrap">Penalty Time</th>
                        <th className="text-right px-4 py-3 whitespace-nowrap">Start Time</th>
                        <th className="text-right px-4 py-3 whitespace-nowrap">Finish Time</th>
                        <th className="text-right px-4 py-3 whitespace-nowrap">Result</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.teams.map((r, idx) => {
                        const isTop3 = r.rank >= 1 && r.rank <= 3;
                        const isProvisional = r.rank != null && !r.rankIsFinal;
                        const runs = r.runs && r.runs.length ? r.runs : [{}];
                        // Run tercepat (waktu terkecil di antara run yang
                        // sudah selesai) — dipakai buat highlight best time.
                        const bestRunIdx = runs.reduce((best, run, i) => {
                          const ms = timeToMs(run.totalTime);
                          if (ms === Infinity) return best;
                          if (best === -1) return i;
                          return ms < timeToMs(runs[best].totalTime) ? i : best;
                        }, -1);
                        return runs.map((run, runIdx) => {
                          const isBestRun = runIdx === bestRunIdx;
                          return (
                          <tr
                            key={`${r.bib}-${r.name}-run${runIdx}`}
                            className={`border-b border-white/5 last:border-b-0 ${
                              isBestRun
                                ? "bg-emerald-500/10"
                                : isTop3
                                ? "bg-white/[0.04]"
                                : "hover:bg-white/[0.02]"
                            } transition-colors`}
                          >
                            {runIdx === 0 && (
                              <td
                                rowSpan={runs.length}
                                className="px-4 py-3 text-white/50 font-medium whitespace-nowrap align-top"
                              >
                                {idx + 1}
                              </td>
                            )}
                            {runIdx === 0 && (
                              <td
                                rowSpan={runs.length}
                                className="px-4 py-3 font-bold text-white whitespace-nowrap align-top"
                              >
                                {r.name}
                              </td>
                            )}
                            {runIdx === 0 && (
                              <td
                                rowSpan={runs.length}
                                className="px-4 py-3 text-white/60 whitespace-nowrap align-top"
                              >
                                {r.bib}
                              </td>
                            )}
                            {runIdx === 0 && (
                              <td
                                rowSpan={runs.length}
                                className="px-4 py-3 text-right whitespace-nowrap align-top"
                              >
                                <span
                                  className={`inline-flex items-center gap-1 font-bold tabular-nums ${
                                    isTop3 ? "text-yellow-300" : "text-white"
                                  }`}
                                >
                                  {r.rank ?? "-"}
                                  {isProvisional && (
                                    <span
                                      className="text-[9px] uppercase tracking-wider font-semibold px-1 py-0.5 rounded-full bg-white/10 text-white/50 border border-white/10"
                                      title="Peringkat sementara berdasarkan hasil saat ini — belum difinalisasi operator"
                                    >
                                      Live
                                    </span>
                                  )}
                                </span>
                              </td>
                            )}
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span
                                className={`inline-flex items-center gap-1.5 ${
                                  isBestRun ? "text-emerald-400 font-semibold" : "text-white/70"
                                }`}
                              >
                                {run.runNo ? `Run ${run.runNo}` : "-"}
                                {isBestRun && (
                                  <span
                                    className="text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30"
                                    title="Waktu terbaik tim ini"
                                  >
                                    Best
                                  </span>
                                )}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right font-mono text-red-400 tabular-nums whitespace-nowrap">
                              {run.penaltyTime || "-"}
                            </td>
                            <td className="px-4 py-3 text-right font-mono text-white/70 tabular-nums whitespace-nowrap">
                              {run.startTime || "-"}
                            </td>
                            <td className="px-4 py-3 text-right font-mono text-white/70 tabular-nums whitespace-nowrap">
                              {run.finishTime || "-"}
                            </td>
                            <td
                              className={`px-4 py-3 text-right font-mono font-bold tabular-nums whitespace-nowrap ${
                                isBestRun ? "text-emerald-400" : "text-white"
                              }`}
                            >
                              {run.totalTime || "-"}
                            </td>
                          </tr>
                          );
                        });
                      })}
                    </tbody>
                  </table>
                </div>
              ) : isH2HDetailed ? (
                <Fragment>
                  <div className="flex items-start gap-2.5 px-4 py-3 border-b border-white/10 bg-sts/10 text-white/70 text-xs sm:text-sm">
                    <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 mt-0.5 text-sts shrink-0">
                      <path
                        fillRule="evenodd"
                        d="M18 10A8 8 0 1 1 2 10a8 8 0 0 1 16 0ZM9 9a1 1 0 0 1 2 0v4a1 1 0 1 1-2 0V9Zm1-4a1 1 0 1 0 0 2 1 1 0 0 0 0-2Z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span>
                      Informasi Overall — hasil akhir Head to Head dari seluruh babak
                      ({results.teams.length} tim tercatat), bukan hasil per-babak.
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="text-[11px] uppercase tracking-wider text-white/40 font-semibold border-b border-white/10">
                          <th className="text-left px-4 py-3 whitespace-nowrap">No</th>
                          <th className="text-left px-4 py-3 whitespace-nowrap">Team Name</th>
                          <th className="text-left px-4 py-3 whitespace-nowrap">BIB</th>
                          <th className="text-right px-4 py-3 whitespace-nowrap">Ranked</th>
                        </tr>
                      </thead>
                    <tbody>
                      {results.teams.map((r, idx) => {
                        const isTop3 = r.rank >= 1 && r.rank <= 3;
                        const isProvisional = r.rank != null && !r.rankIsFinal;
                        return (
                          <tr
                            key={`${r.bib}-${r.name}`}
                            className={`border-b border-white/5 last:border-b-0 ${
                              isTop3 ? "bg-white/[0.04]" : "hover:bg-white/[0.02]"
                            } transition-colors`}
                          >
                            <td className="px-4 py-3 text-white/50 font-medium whitespace-nowrap">
                              {idx + 1}
                            </td>
                            <td className="px-4 py-3 font-bold text-white whitespace-nowrap">
                              {r.name}
                            </td>
                            <td className="px-4 py-3 text-white/60 whitespace-nowrap">{r.bib}</td>
                            <td className="px-4 py-3 text-right whitespace-nowrap">
                              <span
                                className={`inline-flex items-center gap-1 font-bold tabular-nums ${
                                  isTop3 ? "text-yellow-300" : "text-white"
                                }`}
                              >
                                {r.rank ?? "-"}
                                {isProvisional && (
                                  <span
                                    className="text-[9px] uppercase tracking-wider font-semibold px-1 py-0.5 rounded-full bg-white/10 text-white/50 border border-white/10"
                                    title="Peringkat sementara berdasarkan hasil saat ini — belum difinalisasi operator"
                                  >
                                    Live
                                  </span>
                                )}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    </table>
                  </div>
                </Fragment>
              ) : isOverallDetailed ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="text-[11px] uppercase tracking-wider text-white/40 font-semibold border-b border-white/10">
                        <th rowSpan={2} className="text-left px-4 py-3 align-bottom whitespace-nowrap">No</th>
                        <th rowSpan={2} className="text-left px-4 py-3 align-bottom whitespace-nowrap">Team Name</th>
                        <th rowSpan={2} className="text-left px-4 py-3 align-bottom whitespace-nowrap">BIB</th>
                        {overallCategories.map((cat) => (
                          <th
                            key={cat.code}
                            colSpan={2}
                            className="text-center px-4 py-2 whitespace-nowrap border-l border-white/10"
                          >
                            {cat.label}
                          </th>
                        ))}
                        <th rowSpan={2} className="text-right px-4 py-3 align-bottom whitespace-nowrap border-l border-white/10">
                          Total Score
                        </th>
                        <th rowSpan={2} className="text-right px-4 py-3 align-bottom whitespace-nowrap">Rank</th>
                      </tr>
                      <tr className="text-[10px] uppercase tracking-wider text-white/30 font-semibold border-b border-white/10">
                        {overallCategories.map((cat) => (
                          <Fragment key={cat.code}>
                            <th className="text-right px-3 py-2 whitespace-nowrap border-l border-white/10">
                              Score
                            </th>
                            <th className="text-right px-3 py-2 whitespace-nowrap">
                              Rank
                            </th>
                          </Fragment>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {results.teams.map((r, idx) => {
                        const isTop3 = r.rank >= 1 && r.rank <= 3;
                        return (
                          <tr
                            key={`${r.bib}-${r.name}`}
                            className={`border-b border-white/5 last:border-b-0 ${
                              isTop3 ? "bg-white/[0.04]" : "hover:bg-white/[0.02]"
                            } transition-colors`}
                          >
                            <td className="px-4 py-3 text-white/50 font-medium whitespace-nowrap">
                              {idx + 1}
                            </td>
                            <td className="px-4 py-3 font-bold text-white whitespace-nowrap">
                              {r.name}
                            </td>
                            <td className="px-4 py-3 text-white/60 whitespace-nowrap">{r.bib}</td>
                            {overallCategories.map((cat) => (
                              <Fragment key={cat.code}>
                                <td className="px-3 py-3 text-right font-mono text-white/70 tabular-nums whitespace-nowrap border-l border-white/5">
                                  {r[cat.scoreKey] || 0}
                                </td>
                                <td className="px-3 py-3 text-right font-mono text-white/70 tabular-nums whitespace-nowrap">
                                  {r[cat.rankKey] || "-"}
                                </td>
                              </Fragment>
                            ))}
                            <td className="px-4 py-3 text-right font-mono font-bold text-white tabular-nums whitespace-nowrap border-l border-white/10">
                              {r.totalScore ?? 0}
                            </td>
                            <td className="px-4 py-3 text-right whitespace-nowrap">
                              <span
                                className={`font-bold tabular-nums ${
                                  isTop3 ? "text-yellow-300" : "text-white"
                                }`}
                              >
                                {r.rank ?? "-"}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <>
                  {/* Header row (desktop) */}
                  <div className="hidden sm:grid grid-cols-[64px_1fr_100px_repeat(3,110px)] gap-3 px-5 py-3 text-[11px] uppercase tracking-wider text-white/40 font-semibold border-b border-white/10">
                    <span>Rank</span>
                    <span>Tim</span>
                    <span>BIB</span>
                    {columns.includes("time") && <span className="text-right">Waktu</span>}
                    {columns.includes("penalty") && <span className="text-right">Penalti</span>}
                    {columns.includes("score") && <span className="text-right">Skor</span>}
                  </div>

                  <AnimatePresence initial={false}>
                    {results.teams.map((r) => {
                      const rank = r.rank;
                      const isTop3 = rank >= 1 && rank <= 3;
                      const isProvisional = rank != null && !r.rankIsFinal;
                      return (
                        <motion.div
                          key={`${r.bib}-${r.name}`}
                          layout
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ duration: 0.35 }}
                          className={`grid grid-cols-[48px_1fr_auto] sm:grid-cols-[64px_1fr_100px_repeat(3,110px)] items-center gap-3 px-4 sm:px-5 py-3 sm:py-4 border-b border-white/5 last:border-b-0 ${
                            isTop3 ? "bg-white/[0.04]" : "hover:bg-white/[0.02]"
                          } transition-colors`}
                        >
                          <div className="flex items-center">
                            {isTop3 ? (
                              <span
                                className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-extrabold text-sm sm:text-base bg-gradient-to-br ${RANK_BADGE[rank]}`}
                              >
                                {rank}
                              </span>
                            ) : (
                              <span className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-bold text-sm sm:text-base text-white/50 border border-white/10">
                                {rank ?? "-"}
                              </span>
                            )}
                          </div>

                          <div className="min-w-0">
                            <p className="font-bold text-base sm:text-xl text-white truncate flex items-center gap-2">
                              <span className="truncate">{r.name}</span>
                              {isProvisional && (
                                <span
                                  className="shrink-0 text-[9px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded-full bg-white/10 text-white/50 border border-white/10"
                                  title="Peringkat sementara berdasarkan hasil saat ini — belum difinalisasi operator"
                                >
                                  Live
                                </span>
                              )}
                            </p>
                            <p className="sm:hidden text-[11px] text-white/40">BIB {r.bib}</p>
                          </div>

                          <p className="hidden sm:block text-white/50 font-medium">{r.bib}</p>

                          {columns.includes("time") && (
                            <p className="hidden sm:block text-right font-mono text-lg sm:text-xl font-bold text-white tabular-nums">
                              {r.totalTime || "-"}
                            </p>
                          )}
                          {columns.includes("penalty") && (
                            <p className="hidden sm:block text-right text-white/60 tabular-nums">
                              {r.penaltyTime || "-"}
                            </p>
                          )}
                          {columns.includes("score") && (
                            <p className="hidden sm:block text-right font-mono text-lg sm:text-xl font-bold text-white tabular-nums">
                              {r.score ?? "-"}
                            </p>
                          )}

                          {/* Mobile compact value (time atau score) */}
                          <p className="sm:hidden text-right font-mono text-base font-bold text-white tabular-nums">
                            {columns.includes("time") ? r.totalTime || "-" : r.score ?? "-"}
                          </p>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </>
              )}
            </motion.div>

            {/* Sponsor strip */}
            {event.sponsorLogos.length > 0 && (
              <div className="mt-10 text-center">
                <p className="text-[11px] uppercase tracking-[0.2em] text-white/30 font-semibold mb-4">
                  Didukung Oleh
                </p>
                <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
                  {event.sponsorLogos.map((logoUrl, idx) => (
                    <div
                      key={idx}
                      className="h-14 sm:h-16 px-4 rounded-xl bg-white flex items-center justify-center shadow-md"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={logoUrl}
                        alt={`Sponsor ${idx + 1}`}
                        className="h-9 sm:h-11 max-w-[140px] object-contain"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
