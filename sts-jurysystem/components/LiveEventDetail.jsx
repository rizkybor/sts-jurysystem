"use client";
import { useParams } from "next/navigation";
import Link from "next/link";
import NextDynamic from "next/dynamic";
import { Fragment, useEffect, useMemo, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import getSocket from "@/utils/socket";
import { firstEventFileUrl } from "@/utils/eventMedia";

// Dynamic import, ssr:false — layout bracket (posisi kartu, skala auto-fit,
// mobile vs tablet/desktop) dihitung dari ukuran window, jadi dirender di
// client saja supaya tidak mismatch hydration dgn hasil SSR.
const HeadToHeadBracket = NextDynamic(
  () => import("@/components/HeadToHeadBracket"),
  {
    ssr: false,
    loading: () => (
      <div className="flex flex-col items-center justify-center gap-3 py-12 text-sm text-slate-500" aria-busy="true">
        <span className="w-8 h-8 rounded-full border-[3px] border-sts/20 border-t-sts animate-spin" />
        Memuat bracket…
      </div>
    ),
  }
);

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

// BUG FIX (2026-09-25): status Provisional/Unofficial/Official di
// sts-timingsystem dulu FLAT per tipe kategori (satu status utk SEMUA
// Division/Race/Initial bucket dalam kategori yang sama) — mengubah status
// 1 bucket (mis. SENIOR R4 MEN) ikut mengubah bucket lain (SENIOR R4
// WOMEN). Sekarang key-nya per-bucket, MIRROR persis buildCategoryStatusKey()
// di sts-timingsystem/src/utils/officialStamp.js (diinline di sini krn repo
// terpisah, tanpa shared import).
function buildCategoryStatusKey(categoryType, bucket) {
  const divisionId = String(bucket?.divisionId || "");
  const raceId = String(bucket?.raceId || "");
  const initialId = String(bucket?.initialId || "");
  return `${categoryType}__${divisionId}__${raceId}__${initialId}`;
}

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
  1: "bg-amber-400 text-amber-950",
  2: "bg-slate-300 text-slate-800",
  3: "bg-orange-400 text-white",
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

// Badge DNF/DNS/DSQ — status ditetapkan lewat markFlag() di sts-timingsystem
// (SprintRace.vue/SlalomRace.vue/DownRiverRace.vue), dibaca apa adanya dari
// field `flag` yang dibawa API live-results. Warna mengikuti idiom yang
// sudah dipakai di timingsystem sendiri (merah=DNF, abu=DNS, gelap=DSQ).
const FLAG_LABELS = { DNF: "DNF", DNS: "DNS", DSQ: "DSQ" };
const FLAG_STYLES = {
  DNF: "bg-red-50 text-red-700 border-red-200",
  DNS: "bg-slate-100 text-slate-600 border-slate-300",
  DSQ: "bg-slate-800 text-white border-slate-800",
};
function FlagBadge({ flag }) {
  if (!flag || !FLAG_LABELS[flag]) return null;
  return (
    <span
      className={`inline-flex items-center text-[9px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded-full border ${FLAG_STYLES[flag]}`}
    >
      {FLAG_LABELS[flag]}
    </span>
  );
}

// Kondisi tim Sprint LIVE langkah demi langkah — `condition` dihitung API
// live-results (mapSprint) dari live state per tim yg ditulis timingsystem
// di setiap input operator (Start/PS/PF/Finish/flag/Reset).
const CONDITION_META = {
  NOT_STARTED: { label: "Belum Start", cls: "bg-slate-100 text-slate-500 border-slate-200", dot: "bg-slate-400" },
  ON_COURSE: { label: "On Course", cls: "bg-sky-50 text-sky-700 border-sky-300", dot: "bg-sky-500 animate-pulse" },
  FINISHED: { label: "Finish", cls: "bg-emerald-50 text-emerald-700 border-emerald-300", dot: "bg-emerald-500" },
  FINAL: { label: "Final", cls: "bg-indigo-50 text-indigo-700 border-indigo-200", dot: "bg-indigo-500" },
  // Slalom: Run 1 tuntas, menunggu Run 2
  RUN1_DONE: { label: "Run 1 Selesai", cls: "bg-teal-50 text-teal-700 border-teal-300", dot: "bg-teal-500" },
};
function ConditionBadge({ condition, flag, label }) {
  if (flag && FLAG_LABELS[flag]) return <FlagBadge flag={flag} />;
  if (FLAG_LABELS[condition]) return <FlagBadge flag={condition} />;
  const m = CONDITION_META[condition];
  if (!m) return <span className="text-slate-400">-</span>;
  return (
    <span
      className={`inline-flex items-center gap-1 text-[9px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded-full border whitespace-nowrap ${m.cls}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${m.dot}`} />
      {label || m.label}
    </span>
  );
}

// Bar progres race LIVE (Sprint & DRR) — dari `progress` API live-results
// (sprintProgress()): selesai / On Course / Belum Start / DNS-DNF-DSQ.
function RaceProgressStrip({ progress }) {
  if (!progress) return null;
  const pct = (n) => `${progress.total ? (n / progress.total) * 100 : 0}%`;
  return (
    <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/70">
      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
        <span className="font-semibold text-slate-700">
          {progress.allDone ? (
            <span className="inline-flex items-center gap-1 text-emerald-700">✓ Semua tim selesai</span>
          ) : (
            <>
              Progres race:{" "}
              <span className="tabular-nums">
                {progress.finished}/{progress.total}
              </span>{" "}
              tim selesai
            </>
          )}
        </span>
        <span className="flex flex-wrap items-center gap-3 text-slate-500">
          <span className="inline-flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse" />
            On Course {progress.onCourse}
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            Belum Start {progress.notStarted}
          </span>
          {progress.flagged > 0 && (
            <span className="inline-flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
              DNS/DNF/DSQ {progress.flagged}
            </span>
          )}
        </span>
      </div>
      <div className="mt-1.5 h-1.5 rounded-full bg-slate-200 overflow-hidden flex">
        <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: pct(progress.finished) }} />
        <div className="h-full bg-sky-400 transition-all duration-500" style={{ width: pct(progress.onCourse) }} />
      </div>
    </div>
  );
}

// === Loader / skeleton (murni tampilan) ===
function InlineSpinner({ className = "w-3.5 h-3.5" }) {
  return (
    <span
      className={`inline-block rounded-full border-2 border-sts/25 border-t-sts animate-spin ${className}`}
      aria-hidden="true"
    />
  );
}

function LoadingLabel({ children }) {
  return (
    <div className="flex items-center gap-2 px-4 sm:px-5 py-2.5 border-b border-slate-100 bg-slate-50/70 text-xs font-medium text-slate-500">
      <InlineSpinner />
      {children}
    </div>
  );
}

function LeaderboardSkeleton({ rows = 6, label = "Memuat hasil…" }) {
  return (
    <div aria-busy="true" aria-live="polite">
      <LoadingLabel>{label}</LoadingLabel>
      <div className="divide-y divide-slate-100 animate-pulse">
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="grid grid-cols-[40px_1fr_auto] sm:grid-cols-[56px_1fr_90px_110px] items-center gap-3 px-4 sm:px-5 h-12"
          >
            <span className="w-7 h-7 rounded-full bg-slate-100" />
            <span className="space-y-1.5">
              <span
                className="block h-3 rounded bg-slate-200"
                style={{ width: `${70 - ((i * 13) % 35)}%` }}
              />
              <span className="block h-2 w-16 rounded bg-slate-100 sm:hidden" />
            </span>
            <span className="hidden sm:block h-3 w-12 rounded bg-slate-100" />
            <span className="h-3 w-16 sm:w-20 rounded bg-slate-200 justify-self-end" />
          </div>
        ))}
      </div>
    </div>
  );
}

function PageContentSkeleton() {
  return (
    <div className="space-y-5" aria-busy="true">
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-2.5 flex gap-1.5 animate-pulse">
        {[96, 80, 112, 72].map((w, i) => (
          <span key={i} className="h-10 rounded-xl bg-slate-100 shrink-0" style={{ width: w }} />
        ))}
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="px-4 sm:px-5 py-3.5 border-b border-slate-200 animate-pulse">
          <span className="block h-5 w-40 rounded bg-slate-200" />
        </div>
        <LeaderboardSkeleton label="Memuat data event…" />
      </div>
    </div>
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
  // Toggle "Bracket" vs "Tabel" khusus tab H2H — ditambahkan krn bracket
  // (SVG pan/zoom) susah digeser-geser di mobile; Tabel jadi alternatif
  // yang scroll-nya native (vertical biasa), tidak butuh pinch/pan.
  const [h2hView, setH2hView] = useState("bracket");

  const [results, setResults] = useState({
    teams: [],
    updatedAt: null,
    bracket: null,
    progress: null,
  });
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
          // Status 3-pilihan (Provisional/Unofficial/Official) BARU per
          // kategori — field TERPISAH dari boolean officialByCategory di
          // atas (lihat setResultsStatus() di insertNewEvent.js
          // sts-timingsystem). Event lama yang belum pernah disentuh lewat
          // UI baru tidak akan punya field ini sama sekali — fallback ke
          // officialByCategory boolean tetap dipakai di badge (lihat
          // isActiveCategoryOfficial/activeCategoryStatus di bawah).
          statusByCategory: data.resultsStatusByCategory || {},
          // Kapan status Official/Unofficial di-set (otomatis = waktu
          // submit, atau override manual operator) — field TERPISAH dari
          // boolean di atas (lihat setResultsOfficial() di
          // insertNewEvent.js sts-timingsystem), supaya badge boolean yang
          // sudah ada di sini tidak berubah bentuk.
          officialSetAtByCategory: data.resultsOfficialSetAt || {},
          // Zona waktu event (WIB/WITA/WIT), diatur lewat Event Settings
          // sisi sts-timingsystem — dipakai format tampilan waktu
          // Provisional/Unofficial/Official di bawah (dulu HARDCODE WIB).
          resultTimezone: ["WIB", "WITA", "WIT"].includes(data.resultTimezone)
            ? data.resultTimezone
            : "WIB",
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
          ? {
              ...prev,
              officialByCategory: data.resultsOfficialByCategory || {},
              statusByCategory: data.resultsStatusByCategory || {},
              officialSetAtByCategory: data.resultsOfficialSetAt || {},
            }
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
          return {
            teams: data.teams || [],
            updatedAt: data.updatedAt,
            bracket: data.bracket || null,
            // Sprint: ringkasan X/Y tim selesai (lihat sprintProgress()
            // di live-results/route.js)
            progress: data.progress || null,
          };
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
        // BUG FIX: sebelumnya cuma baca `msg.value` (boolean lama,
        // true HANYA kalau status === "official") — begitu operator
        // set status jadi "provisional", `value` tetap `false` dan
        // toast ini SALAH bilang "UNOFFICIAL" walau badge (yang
        // di-refresh terpisah lewat refreshOfficialStatus() di atas)
        // sudah benar menampilkan "Provisional Result". Timing system
        // sudah mengirim `status` 3-tingkat di payload broadcast ini
        // (lihat notifyOfficialStatusChanged() di socketBroadcast.js)
        // — pakai itu dulu, fallback ke `value` boolean cuma kalau
        // `status` tidak ada (mis. versi timingsystem lama).
        const statusLabel =
          msg.status === "provisional"
            ? "PROVISIONAL"
            : msg.status === "official" || (!msg.status && msg.value)
            ? "OFFICIAL"
            : "UNOFFICIAL";
        // msg.category sekarang key KOMPOSIT per-bucket (mis.
        // "sprint__1__1__12", lihat buildCategoryStatusKey() di atas) —
        // ambil cuma tipe kategorinya (sebelum "__") utk teks toast,
        // supaya tidak menampilkan string mentah composite key ke user.
        const baseCategoryLabel = String(msg.category || "-").split("__")[0].toUpperCase();
        pushToast({
          title: "Status Resmi Diperbarui",
          text: `Kategori ${baseCategoryLabel} sekarang ${statusLabel}.`,
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
  // Status Official/Unofficial utk TAB + BUCKET YANG SEDANG AKTIF — key
  // mapping dasar lihat CATEGORY_CODE_TO_OFFICIAL_KEY (mis. RX ->
  // "raftingcross"), lalu dijadikan key KOMPOSIT per-bucket lewat
  // buildCategoryStatusKey() (lihat catatan BUG FIX di atasnya) supaya
  // badge ini menunjuk ke Division/Race/Initial yang sama persis dgn yang
  // sedang dilihat operator di sts-timingsystem.
  const activeCategoryOfficialKey = CATEGORY_CODE_TO_OFFICIAL_KEY[activeCategory];
  const activeCategoryBucketKey =
    activeCategoryOfficialKey && activeBucket
      ? buildCategoryStatusKey(activeCategoryOfficialKey, activeBucket)
      : null;
  // Fallback ke key FLAT lama (activeCategoryOfficialKey) kalau key
  // komposit belum ada datanya sama sekali — event LAMA yang statusnya
  // di-set SEBELUM migrasi per-bucket ini cuma punya key flat, jadi
  // jangan sampai badge-nya "mundur" ke Provisional gara-gara migrasi.
  const isActiveCategoryOfficial =
    !!event?.officialByCategory?.[activeCategoryBucketKey] ||
    (activeCategoryOfficialKey
      ? !!event?.officialByCategory?.[activeCategoryOfficialKey]
      : false);
  // Status 3-pilihan (mirror deriveResultStatus() di
  // sts-timingsystem/src/utils/officialStamp.js, diinline di sini krn
  // repo terpisah, tanpa shared import): field statusByCategory eksplisit
  // (komposit dulu, lalu flat) menang kalau ada; event LAMA yang belum
  // pernah disentuh lewat UI baru (statusByCategory kosong) fallback ke
  // boolean officialByCategory yang sudah ada, supaya badge tidak berubah
  // utk event lama.
  const activeCategoryExplicitStatus =
    event?.statusByCategory?.[activeCategoryBucketKey] ||
    (activeCategoryOfficialKey ? event?.statusByCategory?.[activeCategoryOfficialKey] : null);
  const activeCategoryStatus =
    activeCategoryExplicitStatus &&
    ["provisional", "unofficial", "official"].includes(activeCategoryExplicitStatus)
      ? activeCategoryExplicitStatus
      : isActiveCategoryOfficial
      ? "official"
      // BUG FIX: dulu fallback ke "unofficial" di sini, TIDAK cocok dgn
      // deriveResultStatus() di sts-timingsystem yg fallback ke
      // "provisional" — akibatnya event lama (statusByCategory belum
      // pernah di-set, boolean lama = false) tampil "Provisional" di
      // timingsystem tapi "Unofficial" di Live Result. Samakan jadi
      // "provisional" persis spt sumber aslinya.
      : "provisional";
  const isActiveCategoryProvisional = activeCategoryStatus === "provisional";
  const activeCategoryOfficialSetAt =
    event?.officialSetAtByCategory?.[activeCategoryBucketKey] ||
    (activeCategoryOfficialKey
      ? event?.officialSetAtByCategory?.[activeCategoryOfficialKey]
      : null);
  // BUG FIX (2026-09-28): dulu HARDCODE "Asia/Jakarta" + suffix " WIB" —
  // event di luar Jawa/Sumatra (WITA/WIT) tampil salah ~1-2 jam. Sekarang
  // ikuti `event.resultTimezone` (1 pengaturan per-Event dari Event
  // Settings sisi sts-timingsystem, lihat utils/officialStamp.js repo
  // itu), supaya waktu yang dilihat juri/penonton Live Result konsisten
  // dgn yang dicetak operator di PDF Print Result.
  const RESULT_TZ_IANA = {
    WIB: "Asia/Jakarta",
    WITA: "Asia/Makassar",
    WIT: "Asia/Jayapura",
  };
  const activeResultTimezone = ["WIB", "WITA", "WIT"].includes(
    event?.resultTimezone
  )
    ? event.resultTimezone
    : "WIB";
  const formattedOfficialSetAt = activeCategoryOfficialSetAt
    ? (() => {
        const d = new Date(activeCategoryOfficialSetAt);
        if (isNaN(d.getTime())) return null;
        return (
          d.toLocaleString("id-ID", {
            timeZone: RESULT_TZ_IANA[activeResultTimezone],
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          }) +
          " " +
          activeResultTimezone
        );
      })()
    : null;
  // FITUR (2026-10-06): status Provisional/Unofficial/Official H2H PER
  // BABAK — di sts-timingsystem (views/Result/HeadToHeadResult.vue) toggle
  // status mengikuti tab babak yg dibuka, disimpan dgn key bucket +
  // "__round__<roundId>". Babak yg belum pernah di-set = Provisional (sama
  // spt refreshTabStatus() di sana, TANPA fallback ke status bucket).
  const formatStatusSetAt = (iso) => {
    if (!iso) return null;
    const d = new Date(iso);
    if (isNaN(d.getTime())) return null;
    return (
      d.toLocaleString("id-ID", {
        timeZone: RESULT_TZ_IANA[activeResultTimezone],
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      }) +
      " " +
      activeResultTimezone
    );
  };
  const h2hRoundStatus = {};
  if (activeCategory === "H2H" && activeCategoryBucketKey) {
    (results?.bracket?.rounds || []).forEach((r) => {
      const k = `${activeCategoryBucketKey}__round__${r.id}`;
      const st = event?.statusByCategory?.[k];
      h2hRoundStatus[r.id] = {
        status: ["provisional", "unofficial", "official"].includes(st)
          ? st
          : event?.officialByCategory?.[k]
          ? "official"
          : "provisional",
        setAt: formatStatusSetAt(event?.officialSetAtByCategory?.[k]),
      };
    });
  }
  const isSprintDetailed = activeCategory === "SPRINT";
  const isDrrDetailed = activeCategory === "DRR";
  const isSlalomDetailed = activeCategory === "SLALOM";
  const isH2HDetailed = activeCategory === "H2H";
  const isOverallDetailed = activeCategory === "OVERALL";
  // Jumlah gate terbanyak di antara semua run tim (bervariasi per event,
  // lihat SLALOM_GATES di SlalomRace.vue/Race Settings) — dipakai bikin
  // kolom G1..GN dinamis supaya rincian tiap gate tampil, bukan cuma sum.
  const maxGates = isSlalomDetailed
    ? (results.teams || []).reduce((max, t) => {
        (t.runs || []).forEach((run) => {
          const n = Array.isArray(run.gates) ? run.gates.length : 0;
          if (n > max) max = n;
        });
        return max;
      }, 0)
    : 0;
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
      className="min-h-screen bg-slate-100 text-slate-900 relative overflow-x-hidden overflow-y-auto"
    >
      {/* Toasts */}
      <div className="fixed top-6 right-6 z-50 flex flex-col gap-3">
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ x: 200, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 200, opacity: 0 }}
            className="p-3 rounded-xl border border-emerald-200 bg-white text-emerald-700 shadow-lg"
          >
            <p className="font-semibold text-sm">{toast.title}</p>
            <p className="text-xs opacity-90">{toast.text}</p>
          </motion.div>
        ))}
      </div>

      {/* Header band: toolbar + info event */}
      <header className="relative bg-white border-b border-slate-200">
        <div className="h-1 bg-sts" />
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          {/* Toolbar */}
          <div className="flex items-center justify-between gap-3 py-3 border-b border-slate-100">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <Link
                href="/live"
                className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-white text-slate-700 text-xs sm:text-sm font-medium hover:bg-slate-50 border border-slate-200 transition-colors"
              >
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                  <path fillRule="evenodd" d="M17 10a.75.75 0 0 1-.75.75H5.612l4.158 3.96a.75.75 0 1 1-1.04 1.08l-5.5-5.25a.75.75 0 0 1 0-1.08l5.5-5.25a.75.75 0 1 1 1.04 1.08L5.612 9.25H16.25A.75.75 0 0 1 17 10Z" clipRule="evenodd" />
                </svg>
                <span className="hidden xs:inline">Kembali</span>
              </Link>
              <span className="inline-flex items-center gap-2 h-9 px-3 rounded-lg bg-red-50 border border-red-100">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                </span>
                <span className="uppercase tracking-[0.2em] text-[11px] font-bold text-red-600">
                  Live
                </span>
              </span>
              <span className="hidden sm:inline-flex items-center h-9 px-3 rounded-lg bg-slate-50 border border-slate-200 text-xs sm:text-sm text-slate-600 font-semibold tabular-nums">
                <LiveClock />
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* Share */}
              <div className="relative" ref={shareMenuRef}>
                <button
                  type="button"
                  onClick={handleNativeShare}
                  className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-white text-slate-700 text-xs sm:text-sm font-medium hover:bg-slate-50 border border-slate-200 transition-colors"
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
                      className="absolute right-0 mt-2 w-52 rounded-xl border border-slate-200 bg-white shadow-xl overflow-hidden z-20"
                    >
                      <button
                        type="button"
                        onClick={handleShareWhatsApp}
                        className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                      >
                        <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-emerald-500 flex-shrink-0">
                          <path d="M12 2a10 10 0 0 0-8.6 15L2 22l5.14-1.35A10 10 0 1 0 12 2Zm0 18.2a8.17 8.17 0 0 1-4.17-1.14l-.3-.18-3.05.8.81-2.97-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.14c-.25-.12-1.45-.72-1.68-.8-.22-.08-.39-.12-.55.12-.16.25-.63.8-.78.96-.14.16-.28.18-.53.06-.25-.12-1.06-.39-2.01-1.24-.75-.66-1.25-1.48-1.4-1.73-.14-.25-.02-.38.11-.5.11-.11.25-.28.37-.42.12-.14.16-.25.25-.41.08-.16.04-.31-.02-.43-.06-.12-.55-1.32-.75-1.81-.2-.48-.4-.41-.55-.42h-.47c-.16 0-.43.06-.65.31-.22.25-.86.84-.86 2.04 0 1.2.88 2.36 1 2.53.12.16 1.73 2.64 4.2 3.7.59.25 1.05.4 1.4.51.59.19 1.13.16 1.55.1.47-.07 1.45-.59 1.66-1.16.2-.57.2-1.06.14-1.16-.06-.11-.22-.17-.47-.29Z" />
                        </svg>
                        WhatsApp
                      </button>
                      <button
                        type="button"
                        onClick={handleCopyLink}
                        className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition-colors border-t border-slate-100"
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
                className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-white text-slate-700 text-xs sm:text-sm font-medium hover:bg-slate-50 border border-slate-200 transition-colors"
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
            </div>
          </div>

          {/* Event Info */}
          {loading && (
            <div className="py-5 sm:py-6 flex items-center gap-4 sm:gap-5 animate-pulse" aria-busy="true">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-slate-100 shrink-0" />
              <div className="flex-1 min-w-0 space-y-3">
                <div className="h-6 sm:h-8 bg-slate-200 rounded-lg w-3/4 sm:w-1/2" />
                <div className="flex flex-wrap gap-2">
                  <div className="h-6 w-20 bg-slate-100 rounded-md" />
                  <div className="h-6 w-28 bg-slate-100 rounded-md" />
                  <div className="h-6 w-36 bg-slate-100 rounded-md" />
                </div>
              </div>
            </div>
          )}
          {!loading && !errMsg && event && (
            <div className="py-5 sm:py-6 flex items-center gap-4 sm:gap-5">
              {event.logoUrl ? (
                <img
                  src={event.logoUrl}
                  alt={`${event.name} logo`}
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-contain border border-slate-200 flex-shrink-0 bg-white p-1.5"
                  onError={(e) => {
                    if (!e.currentTarget.src.endsWith(DEFAULT_IMG)) {
                      e.currentTarget.src = DEFAULT_IMG;
                      e.currentTarget.className =
                        "w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border border-slate-200 flex-shrink-0 bg-white";
                    }
                  }}
                />
              ) : (
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl border border-slate-200 bg-slate-50 flex-shrink-0 flex items-center justify-center text-2xl sm:text-3xl font-extrabold text-sts">
                  {event.name?.charAt(0)?.toUpperCase() || "E"}
                </div>
              )}

              <div className="min-w-0">
                <h1 className="text-xl sm:text-3xl lg:text-4xl font-bold tracking-tight leading-tight text-slate-900">
                  {event.name}
                </h1>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs sm:text-sm text-slate-600">
                  {event.levelName && (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-sts/10 text-stsDark font-semibold">
                      {event.levelName}
                    </span>
                  )}
                  {(event.city || event.province) && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100">
                      <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5 text-slate-400">
                        <path d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7Zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5Z" />
                      </svg>
                      {event.city}
                      {event.city && event.province ? ", " : ""}
                      {event.province}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100">
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5 text-slate-400">
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
        </div>
      </header>

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-5 sm:py-8">
        {loading && <PageContentSkeleton />}
        {errMsg && (
          <div className="rounded-2xl border border-red-200 bg-red-50 text-red-700 p-4 mb-6 flex items-start gap-2.5">
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 shrink-0 mt-px text-red-500" aria-hidden="true">
              <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-8-5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 5Zm0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
            </svg>
            <span>{errMsg}</span>
          </div>
        )}

        {!loading && !errMsg && event && (
          <>
            {/* Panel kontrol: tab kategori + kelas/divisi + auto-play */}
            <div className="mb-5 rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex gap-1.5 overflow-x-auto p-2 sm:p-2.5">
                {availableTabs.map((tab) => (
                  <button
                    key={tab.code}
                    onClick={() => {
                      setActiveCategory(tab.code);
                      stopAutoPlay();
                    }}
                    className={`shrink-0 px-4 sm:px-5 h-10 rounded-xl text-sm sm:text-base font-semibold whitespace-nowrap transition-colors ${
                      activeCategory === tab.code
                        ? "bg-sts text-white shadow-sm"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
                {availableTabs.length === 0 && (
                  <p className="text-slate-500 text-sm px-2 py-2">
                    Belum ada kategori yang dikonfigurasi untuk event ini.
                  </p>
                )}
              </div>

              {(bucketOptions.length > 0 || rotationSlides.length > 1) && (
                <div className="flex flex-col lg:flex-row lg:items-end gap-3 px-3 sm:px-4 py-3 border-t border-slate-100">
                  {/* Bucket selector */}
                  {bucketOptions.length > 0 && (
                    <div className="flex flex-col gap-2 flex-1 min-w-0">
                      <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
                        Kelas / Divisi
                      </span>
                      <div
                        role="tablist"
                        aria-label="Kelas / Divisi"
                        className="flex gap-1.5 overflow-x-auto -mx-3 px-3 pb-1 sm:mx-0 sm:px-0 sm:pb-0 md:flex-wrap md:overflow-visible"
                      >
                        {bucketOptions.map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            role="tab"
                            aria-selected={selectedBucket === opt.value}
                            onClick={() => {
                              setSelectedBucket(opt.value);
                              stopAutoPlay();
                            }}
                            className={`shrink-0 inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl border text-xs sm:text-sm font-semibold whitespace-nowrap transition-colors ${
                              selectedBucket === opt.value
                                ? "bg-sts/10 text-stsDark border-sts ring-1 ring-sts/30"
                                : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-white hover:border-sts/40 hover:text-stsDark"
                            }`}
                          >
                            {selectedBucket === opt.value && (
                              <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 shrink-0" aria-hidden="true">
                                <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
                              </svg>
                            )}
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Auto-play */}
                  {rotationSlides.length > 1 && (
                    <div className="flex items-center gap-2 lg:ml-auto rounded-xl border border-slate-200 bg-slate-50 pl-1.5 pr-3 h-10 self-start lg:self-auto shrink-0">
                      <button
                        type="button"
                        onClick={toggleAutoPlay}
                        className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${
                          autoPlay
                            ? "bg-red-500 text-white hover:bg-red-600"
                            : "bg-sts text-white hover:bg-stsDark"
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

                      <span className="text-xs text-slate-500 font-medium">Auto-play</span>
                      <select
                        value={rotateSeconds}
                        onChange={(e) => setRotateSeconds(Number(e.target.value))}
                        className="bg-transparent text-slate-700 text-xs sm:text-sm font-semibold border-none outline-none focus:ring-0"
                      >
                        {ROTATE_DURATION_OPTIONS.map((s) => (
                          <option key={s} value={s}>
                            {s}s
                          </option>
                        ))}
                      </select>

                      {autoPlay && (
                        <span className="relative flex h-1.5 w-10 rounded-full bg-slate-200 overflow-hidden">
                          <motion.span
                            key={slideKey}
                            initial={{ width: "0%" }}
                            animate={{ width: "100%" }}
                            transition={{ duration: rotateSeconds, ease: "linear" }}
                            className="absolute inset-y-0 left-0 bg-sts rounded-full"
                          />
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Leaderboard */}
            <motion.div
              animate={justUpdated ? { boxShadow: "0 0 0 2px rgba(74,222,128,0.5)" } : { boxShadow: "0 0 0 0px rgba(74,222,128,0)" }}
              transition={{ duration: 0.6 }}
              className="rounded-2xl overflow-hidden border border-slate-200 bg-white shadow-sm"
            >
              {/* Judul hasil + status + waktu update */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-4 sm:px-5 py-3.5 border-b border-slate-200">
                <div className="flex flex-wrap items-center gap-2.5 min-w-0">
                  <h2 className="text-base sm:text-xl font-bold text-slate-900">{activeTabLabel}</h2>
                  {/* H2H tidak pakai badge status kategori di sini — statusnya
                      per babak, tampil di bracket (lihat h2hRoundStatus). */}
                  {activeCategory !== "OVERALL" && activeCategory !== "H2H" && results.teams.length > 0 && (
                    <span className="inline-flex flex-wrap items-center gap-1.5">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] sm:text-[11px] font-bold uppercase tracking-wider border ${
                          isActiveCategoryOfficial
                            ? "border-emerald-200 text-emerald-700 bg-emerald-50"
                            : isActiveCategoryProvisional
                            ? "border-amber-200 text-amber-700 bg-amber-50"
                            : "border-red-200 text-red-700 bg-red-50"
                        }`}
                        title="Status hasil ditetapkan operator di timing system, per kategori"
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            isActiveCategoryOfficial
                              ? "bg-emerald-500"
                              : isActiveCategoryProvisional
                              ? "bg-amber-500"
                              : "bg-red-500"
                          }`}
                        />
                        {isActiveCategoryOfficial
                          ? "Official Result"
                          : isActiveCategoryProvisional
                          ? "Provisional Result"
                          : "Unofficial Result"}
                      </span>
                      {formattedOfficialSetAt && (
                        <span className="text-[10px] sm:text-[11px] text-slate-500">
                          {formattedOfficialSetAt}
                        </span>
                      )}
                    </span>
                  )}
                </div>
                {results.updatedAt && (
                  <p className="text-[11px] sm:text-xs text-slate-500 tabular-nums shrink-0">
                    Diperbarui {new Date(results.updatedAt).toLocaleTimeString("id-ID")}
                  </p>
                )}
              </div>

              {loadingResults && !results.teams.length ? (
                <LeaderboardSkeleton />
              ) : resultsError ? (
                <div className="p-6 text-center text-red-600">{resultsError}</div>
              ) : results.teams.length === 0 ? (
                <div className="p-12 text-center">
                  <p className="text-slate-500">Belum ada hasil untuk kategori/kelas ini.</p>
                </div>
              ) : isSprintDetailed ? (
                <div>
                  {/* Progres race LIVE (langkah demi langkah sampai semua tim selesai) */}
                  <RaceProgressStrip progress={results.progress} />
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead className="bg-slate-50">
                      <tr className="text-[10px] sm:text-[11px] uppercase tracking-wider text-slate-500 font-semibold border-b border-slate-200">
                        <th className="text-left px-3 py-2 whitespace-nowrap">No</th>
                        <th className="text-left px-3 py-2 whitespace-nowrap">Team Name</th>
                        <th className="text-left px-3 py-2 whitespace-nowrap">BIB</th>
                        <th className="text-left px-3 py-2 whitespace-nowrap">Status</th>
                        <th className="text-right px-3 py-2 whitespace-nowrap">Ranked</th>
                        <th className="text-right px-3 py-2 whitespace-nowrap">Start Time</th>
                        <th className="text-right px-3 py-2 whitespace-nowrap">PS</th>
                        <th className="text-right px-3 py-2 whitespace-nowrap">PF</th>
                        <th className="text-right px-3 py-2 whitespace-nowrap">Finish Time</th>
                        <th className="text-right px-3 py-2 whitespace-nowrap">Penalty Time</th>
                        <th className="text-right px-3 py-2 whitespace-nowrap">Result</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.teams.map((r, idx) => {
                        const finished = r.condition === "FINISHED" || r.condition === "FINAL";
                        const isTop3 = finished && r.rank >= 1 && r.rank <= 3;
                        const isProvisional = finished && r.rank != null && !r.rankIsFinal;
                        const notStarted = r.condition === "NOT_STARTED";
                        const started = !!r.startTime;
                        const rowTone = isTop3
                          ? "bg-amber-50"
                          : r.condition === "ON_COURSE"
                          ? "bg-sky-50/60"
                          : notStarted || r.flag
                          ? "bg-white text-slate-400"
                          : "hover:bg-slate-50";
                        return (
                          <tr
                            key={`${r.teamId || r.bib}-${r.name}`}
                            className={`border-b border-slate-100 last:border-b-0 ${rowTone} transition-colors h-12`}
                          >
                            <td className="px-3 py-2 text-slate-500 font-medium whitespace-nowrap">
                              {idx + 1}
                            </td>
                            <td
                              className={`px-3 py-2 font-bold whitespace-nowrap ${
                                notStarted || r.flag ? "text-slate-500" : "text-slate-900"
                              }`}
                            >
                              {r.name}
                            </td>
                            <td className="px-3 py-2 text-slate-600 whitespace-nowrap">{r.bib}</td>
                            <td className="px-3 py-2 whitespace-nowrap">
                              <ConditionBadge condition={r.condition} flag={r.flag} />
                            </td>
                            <td className="px-3 py-2 text-right whitespace-nowrap">
                              <span
                                className={`inline-flex items-center gap-1 font-bold tabular-nums ${
                                  isTop3 ? "text-amber-600" : "text-slate-900"
                                }`}
                              >
                                {r.rank ?? "-"}
                                {isProvisional && (
                                  <span
                                    className="text-[9px] uppercase tracking-wider font-semibold px-1 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200"
                                    title="Peringkat sementara (live) dari Result tim yang sudah finish — final setelah operator Save Result"
                                  >
                                    Live
                                  </span>
                                )}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-right font-mono text-slate-600 tabular-nums whitespace-nowrap">
                              {r.startTime || "-"}
                            </td>
                            <td className="px-3 py-2 text-right font-mono tabular-nums whitespace-nowrap">
                              {started && r.startPenalty != null ? (
                                <span className={r.startPenalty > 0 ? "text-red-600 font-semibold" : "text-slate-500"}>
                                  {r.startPenalty}
                                </span>
                              ) : (
                                "-"
                              )}
                            </td>
                            <td className="px-3 py-2 text-right font-mono tabular-nums whitespace-nowrap">
                              {started && r.finishPenalty != null ? (
                                <span className={r.finishPenalty > 0 ? "text-red-600 font-semibold" : "text-slate-500"}>
                                  {r.finishPenalty}
                                </span>
                              ) : (
                                "-"
                              )}
                            </td>
                            <td className="px-3 py-2 text-right font-mono text-slate-600 tabular-nums whitespace-nowrap">
                              {r.finishTime || "-"}
                            </td>
                            <td className="px-3 py-2 text-right font-mono text-red-600 tabular-nums whitespace-nowrap">
                              {r.penaltyTime || "-"}
                            </td>
                            <td className="px-3 py-2 text-right font-mono font-bold text-slate-900 tabular-nums whitespace-nowrap">
                              {r.totalTime || "-"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                </div>
              ) : isDrrDetailed ? (
                <div>
                  {/* Progres race LIVE DRR (langkah demi langkah sampai semua tim selesai) */}
                  <RaceProgressStrip progress={results.progress} />
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead className="bg-slate-50">
                      <tr className="text-[10px] sm:text-[11px] uppercase tracking-wider text-slate-500 font-semibold border-b border-slate-200">
                        <th className="text-left px-3 py-2 whitespace-nowrap">No</th>
                        <th className="text-left px-3 py-2 whitespace-nowrap">Team Name</th>
                        <th className="text-left px-3 py-2 whitespace-nowrap">BIB</th>
                        <th className="text-left px-3 py-2 whitespace-nowrap">Status</th>
                        <th className="text-right px-3 py-2 whitespace-nowrap">Ranked</th>
                        <th className="text-right px-3 py-2 whitespace-nowrap">Start Time</th>
                        <th className="text-right px-3 py-2 whitespace-nowrap">PS</th>
                        <th className="text-left px-3 py-2 whitespace-nowrap">Section</th>
                        <th className="text-right px-3 py-2 whitespace-nowrap">PF</th>
                        <th className="text-right px-3 py-2 whitespace-nowrap">Finish Time</th>
                        <th className="text-right px-3 py-2 whitespace-nowrap">Penalty Time</th>
                        <th className="text-right px-3 py-2 whitespace-nowrap">Result</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.teams.map((r, idx) => {
                        const finished = r.condition === "FINISHED" || r.condition === "FINAL";
                        const isTop3 = finished && r.rank >= 1 && r.rank <= 3;
                        const isProvisional = finished && r.rank != null && !r.rankIsFinal;
                        const notStarted = r.condition === "NOT_STARTED";
                        const started = !!r.startTime;
                        const sections = Array.isArray(r.sectionPenalties)
                          ? r.sectionPenalties
                              .map((v, i) => ({ no: i + 1, v: Number(v) || 0 }))
                              .filter((x) => x.v !== 0)
                          : [];
                        const rowTone = isTop3
                          ? "bg-amber-50"
                          : r.condition === "ON_COURSE"
                          ? "bg-sky-50/60"
                          : notStarted || r.flag
                          ? "bg-white text-slate-400"
                          : "hover:bg-slate-50";
                        const penCell = (v) =>
                          started && v != null ? (
                            <span className={v > 0 ? "text-red-600 font-semibold" : v < 0 ? "text-emerald-600 font-semibold" : "text-slate-500"}>
                              {v}
                            </span>
                          ) : (
                            "-"
                          );
                        return (
                          <tr
                            key={`${r.teamId || r.bib}-${r.name}`}
                            className={`border-b border-slate-100 last:border-b-0 ${rowTone} transition-colors h-12`}
                          >
                            <td className="px-3 py-2 text-slate-500 font-medium whitespace-nowrap">
                              {idx + 1}
                            </td>
                            <td
                              className={`px-3 py-2 font-bold whitespace-nowrap ${
                                notStarted || r.flag ? "text-slate-500" : "text-slate-900"
                              }`}
                            >
                              {r.name}
                            </td>
                            <td className="px-3 py-2 text-slate-600 whitespace-nowrap">{r.bib}</td>
                            <td className="px-3 py-2 whitespace-nowrap">
                              <ConditionBadge condition={r.condition} flag={r.flag} />
                            </td>
                            <td className="px-3 py-2 text-right whitespace-nowrap">
                              <span
                                className={`inline-flex items-center gap-1 font-bold tabular-nums ${
                                  isTop3 ? "text-amber-600" : "text-slate-900"
                                }`}
                              >
                                {r.rank ?? "-"}
                                {isProvisional && (
                                  <span
                                    className="text-[9px] uppercase tracking-wider font-semibold px-1 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200"
                                    title="Peringkat sementara (live) dari Result tim yang sudah finish — final setelah operator Save Result"
                                  >
                                    Live
                                  </span>
                                )}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-right font-mono text-slate-600 tabular-nums whitespace-nowrap">
                              {r.startTime || "-"}
                            </td>
                            <td className="px-3 py-2 text-right font-mono tabular-nums whitespace-nowrap">
                              {penCell(r.startPenalty)}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap">
                              {started && sections.length ? (
                                <span className="inline-flex flex-wrap items-center gap-1">
                                  {sections.map((x) => (
                                    <span
                                      key={`sec-${x.no}`}
                                      className={`text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded border ${
                                        x.v > 0
                                          ? "bg-amber-50 text-amber-700 border-amber-200"
                                          : "bg-emerald-50 text-emerald-700 border-emerald-200"
                                      }`}
                                      title={`Section ${x.no}`}
                                    >
                                      S{x.no} {x.v > 0 ? `+${x.v}` : x.v}
                                    </span>
                                  ))}
                                </span>
                              ) : started && r.sectionPenalty ? (
                                <span className="font-mono text-slate-600">{r.sectionPenalty}</span>
                              ) : (
                                <span className="text-slate-400">-</span>
                              )}
                            </td>
                            <td className="px-3 py-2 text-right font-mono tabular-nums whitespace-nowrap">
                              {penCell(r.finishPenalty)}
                            </td>
                            <td className="px-3 py-2 text-right font-mono text-slate-600 tabular-nums whitespace-nowrap">
                              {r.finishTime || "-"}
                            </td>
                            <td className="px-3 py-2 text-right font-mono text-red-600 tabular-nums whitespace-nowrap">
                              {r.penaltyTime || "-"}
                            </td>
                            <td className="px-3 py-2 text-right font-mono font-bold text-slate-900 tabular-nums whitespace-nowrap">
                              {r.totalTime || "-"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                </div>
              ) : isSlalomDetailed ? (
                <div>
                  {/* Progres race LIVE per Run (langkah demi langkah sampai semua tim selesai Run 2) */}
                  {results.progress && (
                    <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/70">
                      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                        <span className="font-semibold text-slate-700">
                          {results.progress.allDone ? (
                            <span className="inline-flex items-center gap-1 text-emerald-700">
                              ✓ Semua tim selesai (Run 1 &amp; Run 2)
                            </span>
                          ) : (
                            <>
                              Run 1:{" "}
                              <span className="tabular-nums">
                                {results.progress.run1Done}/{results.progress.total}
                              </span>
                              <span className="mx-2 text-slate-300">|</span>
                              Run 2:{" "}
                              <span className="tabular-nums">
                                {results.progress.run2Done}/{results.progress.total}
                              </span>
                            </>
                          )}
                        </span>
                        <span className="flex flex-wrap items-center gap-3 text-slate-500">
                          <span className="inline-flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse" />
                            On Course {results.progress.onCourse}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                            Belum Start {results.progress.notStarted}
                          </span>
                        </span>
                      </div>
                      <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                        {[
                          ["Run 1", results.progress.run1Done],
                          ["Run 2", results.progress.run2Done],
                        ].map(([label, done]) => (
                          <div key={label} className="h-1.5 rounded-full bg-slate-200 overflow-hidden" title={label}>
                            <div
                              className="h-full bg-emerald-500 transition-all duration-500"
                              style={{
                                width: `${results.progress.total ? (done / results.progress.total) * 100 : 0}%`,
                              }}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead className="bg-slate-50">
                      <tr className="text-[10px] sm:text-[11px] uppercase tracking-wider text-slate-500 font-semibold border-b border-slate-200">
                        <th className="text-left px-3 py-2 whitespace-nowrap">No</th>
                        <th className="text-left px-3 py-2 whitespace-nowrap">Team Name</th>
                        <th className="text-left px-3 py-2 whitespace-nowrap">BIB</th>
                        <th className="text-left px-3 py-2 whitespace-nowrap">Status</th>
                        <th className="text-right px-3 py-2 whitespace-nowrap">Ranked</th>
                        <th className="text-left px-3 py-2 whitespace-nowrap">Run</th>
                        <th className="text-right px-3 py-2 whitespace-nowrap">Pen. Start</th>
                        {Array.from({ length: maxGates }, (_, gi) => (
                          <th
                            key={`gate-head-${gi}`}
                            className="text-right px-3 py-2 whitespace-nowrap"
                          >
                            G{gi + 1}
                          </th>
                        ))}
                        <th className="text-right px-3 py-2 whitespace-nowrap">Pen. Finish</th>
                        <th className="text-right px-3 py-2 whitespace-nowrap">Pen. Total</th>
                        <th className="text-right px-3 py-2 whitespace-nowrap">Penalty Time</th>
                        <th className="text-right px-3 py-2 whitespace-nowrap">Start Time</th>
                        <th className="text-right px-3 py-2 whitespace-nowrap">Finish Time</th>
                        <th className="text-right px-3 py-2 whitespace-nowrap">Result</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.teams.map((r, idx) => {
                        const isTop3 = r.rank >= 1 && r.rank <= 3;
                        const isProvisional = r.rank != null && !r.rankIsFinal;
                        const runs = r.runs && r.runs.length ? r.runs : [{}];
                        const notStarted = r.condition === "NOT_STARTED";
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
                          const runOnCourse = run.condition === "ON_COURSE";
                          return (
                          <tr
                            key={`${r.teamId || r.bib}-${r.name}-run${runIdx}`}
                            className={`border-b border-slate-100 last:border-b-0 ${
                              runOnCourse
                                ? "bg-sky-50/70"
                                : isBestRun
                                ? "bg-emerald-50"
                                : isTop3
                                ? "bg-amber-50"
                                : notStarted
                                ? "bg-white text-slate-400"
                                : "hover:bg-slate-50"
                            } transition-colors h-12`}
                          >
                            {runIdx === 0 && (
                              <td
                                rowSpan={runs.length}
                                className="px-3 py-2 text-slate-500 font-medium whitespace-nowrap align-top"
                              >
                                {idx + 1}
                              </td>
                            )}
                            {runIdx === 0 && (
                              <td
                                rowSpan={runs.length}
                                className="px-3 py-2 font-bold text-slate-900 whitespace-nowrap align-top"
                              >
                                {r.name}
                              </td>
                            )}
                            {runIdx === 0 && (
                              <td
                                rowSpan={runs.length}
                                className="px-3 py-2 text-slate-600 whitespace-nowrap align-top"
                              >
                                {r.bib}
                              </td>
                            )}
                            {runIdx === 0 && (
                              <td
                                rowSpan={runs.length}
                                className="px-3 py-2 whitespace-nowrap align-top"
                              >
                                <ConditionBadge
                                  condition={r.condition}
                                  label={
                                    r.condition === "ON_COURSE" && r.activeRun
                                      ? `Run ${r.activeRun} On Course`
                                      : undefined
                                  }
                                />
                              </td>
                            )}
                            {runIdx === 0 && (
                              <td
                                rowSpan={runs.length}
                                className="px-3 py-2 text-right whitespace-nowrap align-top"
                              >
                                <span
                                  className={`inline-flex items-center gap-1 font-bold tabular-nums ${
                                    isTop3 ? "text-amber-600" : "text-slate-900"
                                  }`}
                                >
                                  {r.rank ?? "-"}
                                  {isProvisional && (
                                    <span
                                      className="text-[9px] uppercase tracking-wider font-semibold px-1 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200"
                                      title="Peringkat sementara berdasarkan hasil saat ini — belum difinalisasi operator"
                                    >
                                      Live
                                    </span>
                                  )}
                                </span>
                              </td>
                            )}
                            <td className="px-3 py-2 whitespace-nowrap">
                              <span
                                className={`inline-flex items-center gap-1.5 ${
                                  isBestRun ? "text-emerald-600 font-semibold" : "text-slate-600"
                                }`}
                              >
                                {run.runNo ? `Run ${run.runNo}` : "-"}
                                {run.flag && <FlagBadge flag={run.flag} />}
                                {runOnCourse && (
                                  <span className="inline-flex items-center gap-1 text-[9px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded-full bg-sky-100 text-sky-700 border border-sky-300">
                                    <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse" />
                                    On Course
                                  </span>
                                )}
                                {isBestRun && (
                                  <span
                                    className="text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-300"
                                    title="Waktu terbaik tim ini"
                                  >
                                    Best
                                  </span>
                                )}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-right font-mono text-slate-600 tabular-nums whitespace-nowrap">
                              {Number.isFinite(run.startPenalty) ? run.startPenalty : "-"}
                            </td>
                            {Array.from({ length: maxGates }, (_, gi) => {
                              const g = Array.isArray(run.gates) ? run.gates[gi] : undefined;
                              return (
                                <td
                                  key={`gate-${runIdx}-${gi}`}
                                  className="px-3 py-2 text-right font-mono text-slate-600 tabular-nums whitespace-nowrap"
                                >
                                  {Number.isFinite(g) ? g : "-"}
                                </td>
                              );
                            })}
                            <td className="px-3 py-2 text-right font-mono text-slate-600 tabular-nums whitespace-nowrap">
                              {Number.isFinite(run.finishPenalty) ? run.finishPenalty : "-"}
                            </td>
                            <td className="px-3 py-2 text-right font-mono text-red-600 font-semibold tabular-nums whitespace-nowrap">
                              {Number.isFinite(run.totalPenalty) ? run.totalPenalty : "-"}
                            </td>
                            <td className="px-3 py-2 text-right font-mono text-red-600 tabular-nums whitespace-nowrap">
                              {run.penaltyTime || "-"}
                            </td>
                            <td className="px-3 py-2 text-right font-mono text-slate-600 tabular-nums whitespace-nowrap">
                              {run.startTime || "-"}
                            </td>
                            <td className="px-3 py-2 text-right font-mono text-slate-600 tabular-nums whitespace-nowrap">
                              {run.finishTime || "-"}
                            </td>
                            <td
                              className={`px-3 py-2 text-right font-mono font-bold tabular-nums whitespace-nowrap ${
                                isBestRun ? "text-emerald-600" : "text-slate-900"
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
                </div>
              ) : isH2HDetailed ? (
                <div className="bg-white">
                  {/* Header seksi H2H: judul + ringkasan, toggle Bracket/Tabel, Live */}
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-3 sm:px-5 lg:px-6 pt-3 sm:pt-4 lg:pt-5 pb-3 sm:pb-4 border-b border-slate-100">
                    <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                      <span className="flex w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-sts text-white items-center justify-center shrink-0">
                        <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
                          <path
                            d="M4 5h4v4H4V5Zm0 10h4v4H4v-4Zm12-10h4v4h-4V5Zm0 10h4v4h-4v-4M8 7h6M8 17h6M18 7v10"
                            stroke="currentColor"
                            strokeWidth="1.7"
                            strokeLinecap="round"
                          />
                        </svg>
                      </span>
                      <div className="min-w-0">
                        <h3 className="text-sm sm:text-base lg:text-lg font-bold text-slate-900 leading-tight truncate">
                          {h2hView === "bracket" ? "Bracket Pertandingan" : "Klasemen Head to Head"}
                        </h3>
                        <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5 truncate">
                          {results.teams.length} tim
                          {results.bracket?.rounds?.length
                            ? ` · ${results.bracket.rounds.length} babak`
                            : ""}
                          {" · "}update otomatis dari operator timing
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {/* Toggle Bracket/Tabel — tersedia di semua ukuran layar. */}
                      <div
                        role="tablist"
                        aria-label="Tampilan Head to Head"
                        className="flex flex-1 sm:flex-none rounded-xl bg-slate-100 p-1 text-[11px] sm:text-xs font-semibold"
                      >
                        {[
                          { key: "bracket", label: "Bracket" },
                          { key: "table", label: "Klasemen" },
                        ].map((opt) => (
                          <button
                            key={opt.key}
                            type="button"
                            role="tab"
                            aria-selected={h2hView === opt.key}
                            onClick={() => setH2hView(opt.key)}
                            className={`flex-1 sm:flex-none px-3 sm:px-4 py-1.5 rounded-lg transition-all ${
                              h2hView === opt.key
                                ? "bg-white text-sts shadow-sm"
                                : "text-slate-500 hover:text-slate-700"
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                      <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 ring-1 ring-emerald-200 rounded-full px-2.5 py-1 flex items-center gap-1.5 shrink-0">
                        <span className="relative flex w-2 h-2">
                          <span className="absolute inline-flex w-full h-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
                          <span className="relative inline-flex w-2 h-2 rounded-full bg-emerald-500" />
                        </span>
                        Live
                      </span>
                    </div>
                  </div>

                  <div className="p-3 sm:p-5 lg:p-6">
                    {h2hView === "bracket" ? (
                      <HeadToHeadBracket bracket={results.bracket} roundStatus={h2hRoundStatus} />
                    ) : results.teams.length ? (
                      <div className="overflow-hidden rounded-2xl border border-slate-200">
                        <table className="w-full text-xs sm:text-sm border-collapse">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-[10px] sm:text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
                              <th className="text-center px-2 sm:px-3 py-2.5 w-14 sm:w-20">Rank</th>
                              <th className="text-left px-2 sm:px-3 py-2.5">Tim</th>
                              <th className="hidden sm:table-cell text-left px-3 py-2.5 w-24">BIB</th>
                              <th className="text-right px-2 sm:px-3 py-2.5 w-24 sm:w-32">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {results.teams.map((r) => {
                              // state/stage/rankLabel dari buildH2HStandings()
                              // (route live-results) — klasemen diturunkan dari
                              // bracket terkini; "1–2"/"3–4" = finalis yang
                              // finalnya belum selesai.
                              const isPlaced = r.state === "final" || r.rankIsFinal;
                              const medal =
                                isPlaced && r.rank >= 1 && r.rank <= 3
                                  ? ["bg-amber-400", "bg-slate-400", "bg-orange-400"][r.rank - 1]
                                  : null;
                              const STATE = {
                                final: { label: "Final", cls: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
                                playing: { label: "Bertanding", cls: "bg-sky-50 text-sky-700 ring-sky-200", dot: true },
                                advanced: { label: "Lanjut", cls: "bg-sky-50 text-sky-700 ring-sky-200" },
                                waiting: { label: "Menunggu", cls: "bg-slate-50 text-slate-500 ring-slate-200" },
                                eliminated: { label: "Tersingkir", cls: "bg-rose-50 text-rose-600 ring-rose-200" },
                              };
                              const st = r.rankIsFinal
                                ? STATE.final
                                : STATE[r.state] || STATE.waiting;
                              const rankText = r.rankLabel || (r.rank ?? "-");
                              return (
                                <tr
                                  key={`${r.bib}-${r.name}`}
                                  className={`transition-colors ${
                                    medal ? "bg-amber-50/40" : "bg-white"
                                  } hover:bg-slate-50`}
                                >
                                  <td className="px-2 sm:px-3 py-2.5 sm:py-3 text-center">
                                    <span
                                      className={`inline-flex min-w-[1.75rem] sm:min-w-[2rem] h-7 sm:h-8 px-1.5 items-center justify-center rounded-full text-xs sm:text-sm font-bold tabular-nums whitespace-nowrap ${
                                        medal
                                          ? `${medal} text-white shadow-sm`
                                          : isPlaced
                                          ? "bg-slate-100 text-slate-700"
                                          : "bg-white text-slate-500 ring-1 ring-slate-200"
                                      }`}
                                      title={
                                        rankText === "-"
                                          ? "Belum ada peringkat — final belum dipertandingkan"
                                          : isPlaced
                                          ? "Peringkat sudah pasti"
                                          : "Peringkat sementara — turnamen masih berjalan"
                                      }
                                    >
                                      {rankText}
                                    </span>
                                  </td>
                                  <td className="px-2 sm:px-3 py-2.5 sm:py-3 min-w-0">
                                    <p className="font-bold text-slate-900 leading-tight">{r.name}</p>
                                    <p className="text-[11px] text-slate-400 mt-0.5">
                                      <span className="sm:hidden">BIB {r.bib}</span>
                                      {r.stage ? (
                                        <>
                                          <span className="sm:hidden"> · </span>
                                          {r.stage}
                                        </>
                                      ) : null}
                                      {r.totalTime ? (
                                        <span className="tabular-nums"> · {String(r.totalTime).replace(/^00:/, "")}</span>
                                      ) : null}
                                    </p>
                                  </td>
                                  <td className="hidden sm:table-cell px-3 py-3 text-slate-600 font-semibold tabular-nums">
                                    {r.bib}
                                  </td>
                                  <td className="px-2 sm:px-3 py-2.5 sm:py-3 text-right">
                                    <span
                                      className={`inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-semibold px-2 py-0.5 rounded-full ring-1 whitespace-nowrap ${st.cls}`}
                                    >
                                      {st.dot ? <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse" /> : null}
                                      {st.label}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-slate-400 text-sm text-center py-10">
                        Belum ada tim tercatat di kategori ini.
                      </p>
                    )}
                  </div>
                </div>
              ) : isOverallDetailed ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead className="bg-slate-50">
                      <tr className="text-[10px] sm:text-[11px] uppercase tracking-wider text-slate-500 font-semibold border-b border-slate-200">
                        <th rowSpan={2} className="text-left px-3 py-2 align-bottom whitespace-nowrap">No</th>
                        <th rowSpan={2} className="text-left px-3 py-2 align-bottom whitespace-nowrap">Team Name</th>
                        <th rowSpan={2} className="text-left px-3 py-2 align-bottom whitespace-nowrap">BIB</th>
                        {overallCategories.map((cat) => (
                          <th
                            key={cat.code}
                            colSpan={2}
                            className="text-center px-4 py-2 whitespace-nowrap border-l border-slate-200"
                          >
                            {cat.label}
                          </th>
                        ))}
                        <th rowSpan={2} className="text-right px-3 py-2 align-bottom whitespace-nowrap border-l border-slate-200">
                          Total Score
                        </th>
                        <th rowSpan={2} className="text-right px-3 py-2 align-bottom whitespace-nowrap">Rank</th>
                      </tr>
                      <tr className="text-[10px] sm:text-[11px] uppercase tracking-wider text-slate-500 font-semibold border-b border-slate-200">
                        {overallCategories.map((cat) => (
                          <Fragment key={cat.code}>
                            <th className="text-right px-3 py-2 whitespace-nowrap border-l border-slate-200">
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
                            className={`border-b border-slate-100 last:border-b-0 ${
                              isTop3 ? "bg-amber-50" : "hover:bg-slate-50"
                            } transition-colors h-12`}
                          >
                            <td className="px-3 py-2 text-slate-500 font-medium whitespace-nowrap">
                              {idx + 1}
                            </td>
                            <td className="px-3 py-2 font-bold text-slate-900 whitespace-nowrap">
                              {r.name}
                            </td>
                            <td className="px-3 py-2 text-slate-600 whitespace-nowrap">{r.bib}</td>
                            {overallCategories.map((cat) => (
                              <Fragment key={cat.code}>
                                <td className="px-3 py-3 text-right font-mono text-slate-600 tabular-nums whitespace-nowrap border-l border-slate-100">
                                  {r[cat.scoreKey] || 0}
                                </td>
                                <td className="px-3 py-3 text-right font-mono text-slate-600 tabular-nums whitespace-nowrap">
                                  {r[cat.rankKey] || "-"}
                                </td>
                              </Fragment>
                            ))}
                            <td className="px-3 py-2 text-right font-mono font-bold text-slate-900 tabular-nums whitespace-nowrap border-l border-slate-200">
                              {r.totalScore ?? 0}
                            </td>
                            <td className="px-3 py-2 text-right whitespace-nowrap">
                              <span
                                className={`font-bold tabular-nums ${
                                  isTop3 ? "text-amber-600" : "text-slate-900"
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
                  <div className="hidden sm:grid grid-cols-[64px_1fr_100px_repeat(3,110px)] gap-3 px-4 py-2.5 bg-slate-50 text-[10px] sm:text-[11px] uppercase tracking-wider text-slate-500 font-semibold border-b border-slate-200">
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
                          className={`grid grid-cols-[48px_1fr_auto] sm:grid-cols-[64px_1fr_100px_repeat(3,110px)] items-center gap-3 px-3 sm:px-4 py-2 sm:py-2.5 border-b border-slate-100 last:border-b-0 ${
                            isTop3 ? "bg-amber-50" : "hover:bg-slate-50"
                          } transition-colors`}
                        >
                          <div className="flex items-center">
                            {isTop3 ? (
                              <span
                                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-extrabold text-xs sm:text-sm ${RANK_BADGE[rank]}`}
                              >
                                {rank}
                              </span>
                            ) : (
                              <span className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-bold text-xs sm:text-sm text-slate-500 border border-slate-300">
                                {rank ?? "-"}
                              </span>
                            )}
                          </div>

                          <div className="min-w-0">
                            <p className="font-bold text-sm sm:text-base text-slate-900 truncate flex items-center gap-2">
                              <span className="truncate">{r.name}</span>
                              {isProvisional && (
                                <span
                                  className="shrink-0 text-[9px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200"
                                  title="Peringkat sementara berdasarkan hasil saat ini — belum difinalisasi operator"
                                >
                                  Live
                                </span>
                              )}
                            </p>
                            <p className="sm:hidden text-[10px] text-slate-400">BIB {r.bib}</p>
                          </div>

                          <p className="hidden sm:block text-slate-500 font-medium text-sm">{r.bib}</p>

                          {columns.includes("time") && (
                            <p className="hidden sm:block text-right font-mono text-sm sm:text-base font-bold text-slate-900 tabular-nums">
                              {r.totalTime || "-"}
                            </p>
                          )}
                          {columns.includes("penalty") && (
                            <p className="hidden sm:block text-right text-sm text-slate-600 tabular-nums">
                              {r.penaltyTime || "-"}
                            </p>
                          )}
                          {columns.includes("score") && (
                            <p className="hidden sm:block text-right font-mono text-sm sm:text-base font-bold text-slate-900 tabular-nums">
                              {r.score ?? "-"}
                            </p>
                          )}

                          {/* Mobile compact value (time atau score) */}
                          <p className="sm:hidden text-right font-mono text-sm font-bold text-slate-900 tabular-nums">
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
                <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400 font-semibold mb-4">
                  Didukung Oleh
                </p>
                <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
                  {event.sponsorLogos.map((logoUrl, idx) => (
                    <div
                      key={idx}
                      className="h-14 sm:h-16 px-4 rounded-xl bg-white border border-slate-200 flex items-center justify-center shadow-sm"
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
