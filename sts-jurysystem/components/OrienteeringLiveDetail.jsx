"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import getSocket from "@/utils/socket";
import LoadingSpinner from "@/components/LoadingSpinner";
import CountryFlag from "@/components/CountryFlag";
import { ControlFlagIcon, StatusBadge, orienteeringStatus } from "@/components/OrienteeringLiveList";

// Live Result Orienteering (read-only — Orienteering tidak punya juri).
//
// SATU tampilan per jenis (Sprint / Middle): semua kategori (M21E, W21E,
// M20, …) bertanding bersamaan, jadi ditampilkan berdampingan sbg papan
// skor + strip "Baru Finish" lintas kategori. Split per pos dibuka lewat
// pop-up (klik nama) supaya papan tetap ringkas. Ada mode Full Screen
// (tema gelap, cocok utk layar besar di arena).
//
// Data: snapshot per jenis yang ditulis sts-timingsystem ke
// orienteeringLiveResults tiap kartu SI dibaca -> refetch saat socket
// "orienteering:updated" masuk, plus polling cadangan.

const POLL_MS = 20000;
const RECENT_COUNT = 10;

const STATUS_TEXT = { OK: "OK", MP: "MP", DNF: "DNF", NO_START: "No Start", DSQ: "DSQ", DNS: "DNS" };
const STATUS_HINT = {
  MP: "Missing Punch — control missed / wrong order",
  DNF: "Did not finish",
  NO_START: "No Start punch on the SI Card",
  DSQ: "Disqualified",
  DNS: "Did not start",
};

function fmtSec(sec) {
  if (sec === null || sec === undefined || !Number.isFinite(sec)) return "-";
  const t = Math.max(0, Math.round(sec));
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = String(t % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${s}` : `${m}:${s}`;
}
function fmtDate(s) {
  if (!s) return "";
  const d = new Date(`${s}T00:00:00+07:00`);
  return isNaN(d) ? s : d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Jakarta" });
}
function fmtClock(d, withSec = true) {
  const x = d ? new Date(d) : null;
  if (!x || isNaN(x)) return "";
  return x.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    ...(withSec ? { second: "2-digit" } : {}),
    timeZone: "Asia/Jakarta",
  });
}
function storageGet(key) {
  try {
    return localStorage.getItem(key) || "";
  } catch {
    return "";
  }
}
function storageSet(key, v) {
  try {
    localStorage.setItem(key, v);
  } catch {
    /* abaikan */
  }
}
const isWre = (name) => /world ranking/i.test(String(name || ""));
// Jadwal start (Starting Order) — field lama `start` utk snapshot versi sebelumnya
const schedOf = (r) => r.scheduledStart || r.start || "";

// Start/finish dari punch SI Card. Hasil & Live Result Orienteering HANYA
// dihitung dari SI Card — jadwal start (Starting Order) tidak pernah dipakai
// menghitung; kartu tanpa punch Start = No Start (tanpa waktu).
// Hasil yang dikoreksi operator di timing system (Edit Hasil)
function EditedTag({ r }) {
  if (!r.edited) return null;
  return (
    <span
      title={`Corrected by the timing operator${r.editNote ? `: ${r.editNote}` : ""}`}
      className="ml-1 inline-block px-1.5 rounded bg-orange-100 text-orange-700 text-[10px] font-bold align-middle"
    >
      Edited
    </span>
  );
}

function StartFinish({ r, className = "" }) {
  const muted = "text-gray-400";
  if (!r.cardStart && !r.cardFinish) return null;
  return (
    <span className={`block text-[10px] tabular-nums ${muted} ${className}`}>
      {r.cardStart ? <>Start {r.cardStart}</> : <span className="text-red-500">no Start punch</span>}
      {r.cardFinish ? <> · Finish {r.cardFinish}</> : <span className="text-red-500"> · no Finish punch</span>}
    </span>
  );
}

export default function OrienteeringLiveDetail() {
  const { id } = useParams();
  const rootRef = useRef(null);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [raceId, setRaceId] = useState(null);
  const [typeId, setTypeId] = useState("all");
  const [query, setQuery] = useState("");
  const [detail, setDetail] = useState(null); // { row, cls } utk pop-up split
  const [flashKeys, setFlashKeys] = useState(new Set());
  const [isFull, setIsFull] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const seenRef = useRef(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/orienteering/events/${id}`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to load results");
      setData(json);
      setError("");
    } catch (e) {
      setError(e.message || "Failed to load results");
    }
  }, [id]);

  useEffect(() => {
    load();
    const t = setInterval(load, POLL_MS);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => {
    const socket = getSocket();
    const handler = (msg) => {
      if (msg?.type === "orienteering:updated" && String(msg.eventId || "") === String(id)) load();
    };
    socket.on("custom:event", handler);
    return () => socket.off("custom:event", handler);
  }, [id, load]);

  // jam (header full screen)
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Full Screen API
  useEffect(() => {
    const onChange = () => setIsFull(document.fullscreenElement === rootRef.current);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);
  const toggleFull = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await rootRef.current?.requestFullscreen?.();
    } catch {
      /* browser menolak (mis. iOS Safari) — abaikan */
    }
  };

  // jenis aktif: pilihan terakhir (localStorage) -> jenis pertama
  useEffect(() => {
    if (!data || raceId !== null) return;
    const saved = storageGet(`ori-live:race:${id}`);
    const races = data.races || [];
    setRaceId(races.some((r) => r.id === saved) ? saved : races[0]?.id ?? "");
  }, [data, raceId, id]);

  const race = useMemo(() => (data?.races || []).find((r) => r.id === raceId) || null, [data, raceId]);

  const types = useMemo(() => {
    const ids = new Set((race?.classes || []).map((c) => c.typeId));
    return (data?.event?.types || []).filter((t) => ids.has(t.id));
  }, [data, race]);
  useEffect(() => {
    if (typeId !== "all" && !types.some((t) => t.id === typeId)) setTypeId("all");
  }, [types, typeId]);

  // kategori yang tampil (yang punya peserta; kecuali semuanya kosong)
  const classes = useMemo(() => {
    let all = race?.classes || [];
    if (all.some((c) => c.total > 0)) all = all.filter((c) => c.total > 0);
    return typeId === "all" ? all : all.filter((c) => c.typeId === typeId);
  }, [race, typeId]);

  const q = query.trim().toLowerCase();
  const match = useCallback(
    (r) => !q || `${r.name} ${r.club} ${r.nationality} ${r.bib}`.toLowerCase().includes(q),
    [q]
  );

  // "Baru Finish" lintas kategori: urut readAt terbaru
  const recent = useMemo(() => {
    const list = [];
    classes.forEach((c) =>
      c.rows.forEach((r) => {
        if (!r.pending && r.readAt) list.push({ row: r, cls: c });
      })
    );
    return list.sort((a, b) => new Date(b.row.readAt) - new Date(a.row.readAt)).slice(0, RECENT_COUNT);
  }, [classes]);

  // sorot baris yang baru masuk sejak refresh sebelumnya
  useEffect(() => {
    if (!race) return;
    const keys = new Set();
    (race.classes || []).forEach((c) => c.rows.forEach((r) => !r.pending && keys.add(`${c.classId}|${r.name}|${r.bib}|${r.readAt}`)));
    if (seenRef.current && seenRef.current.race === race.id) {
      const fresh = new Set([...keys].filter((k) => !seenRef.current.keys.has(k)));
      if (fresh.size) {
        setFlashKeys(fresh);
        setTimeout(() => setFlashKeys(new Set()), 6000);
      }
    }
    seenRef.current = { race: race.id, keys };
  }, [race]);
  const rowKey = (c, r) => `${c.classId}|${r.name}|${r.bib}|${r.readAt}`;

  const pickRace = (rid) => {
    setRaceId(rid);
    storageSet(`ori-live:race:${id}`, rid);
  };

  if (!data && !error) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center gap-3 text-gray-500">
        <LoadingSpinner size={20} /> Loading results…
      </div>
    );
  }
  if (!data) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 text-center px-4">
        <ControlFlagIcon className="w-16 h-16 opacity-70" />
        <p className="text-gray-600">{error}</p>
        <Link href="/live?sport=orienteering" className="px-5 py-2.5 rounded-xl bg-sts text-white text-xs font-semibold">
          Back to Live Results
        </Link>
      </div>
    );
  }

  const ev = data.event;
  const status = orienteeringStatus(ev);
  const totals = (race?.classes || []).reduce(
    (a, c) => ({ total: a.total + c.total, finished: a.finished + c.finished }),
    { total: 0, finished: 0 }
  );
  const pct = totals.total ? Math.round((totals.finished / totals.total) * 100) : 0;

  return (
    <section
      ref={rootRef}
      className={`min-h-screen transition-colors text-gray-900 text-sm ${isFull ? "bg-slate-200 overflow-y-auto" : "bg-gray-50"}`}
    >
      {/* ===== Header ringkas ===== */}
      <div className="bg-gradient-to-br from-emerald-800 via-teal-800 to-stsDarkHiglight">
        <div className={`mx-auto px-4 sm:px-6 lg:px-8 ${isFull ? "max-w-none py-3" : "max-w-7xl py-5 sm:py-6"}`}>
          {!isFull && (
            <Link href="/live?sport=orienteering" className="inline-flex items-center gap-1.5 text-white/80 hover:text-white text-xs font-medium mb-3">
              ← Live Results
            </Link>
          )}
          <div className="flex items-center gap-3 sm:gap-4">
            <span className="flex-none w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-white shadow ring-2 ring-white/50 overflow-hidden flex items-center justify-center">
              {ev.logo || ev.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={ev.logo || ev.image} alt="" className={`w-full h-full ${ev.logo ? "object-contain p-1" : "object-cover"}`} />
              ) : (
                <ControlFlagIcon className="w-7 h-7" />
              )}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={status} />
                <span className="text-[11px] text-white/70 hidden sm:inline">
                  {fmtDate(ev.startDate)}
                  {ev.endDate && ev.endDate !== ev.startDate ? ` – ${fmtDate(ev.endDate)}` : ""}
                </span>
              </div>
              <h1 className="mt-0.5 text-base sm:text-xl font-bold text-white tracking-tight truncate">{ev.name}</h1>
            </div>
            {isFull && <div className="hidden md:block text-2xl font-bold tabular-nums text-white">{fmtClock(now)}</div>}
            <button
              type="button"
              onClick={toggleFull}
              title={isFull ? "Exit Full Screen (Esc)" : "Full Screen"}
              className="flex-none inline-flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 ring-1 ring-white/25 text-white text-xs font-semibold transition"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                {isFull ? (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
                )}
              </svg>
              <span className="hidden sm:inline">{isFull ? "Exit" : "Full Screen"}</span>
            </button>
          </div>

          {/* jenis + progres */}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {data.races.map((r) => {
              const active = r.id === raceId;
              return (
                <button
                  key={r.id || "default"}
                  type="button"
                  onClick={() => pickRace(r.id)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition ring-1 ${
                    active ? "bg-white text-emerald-800 ring-white shadow" : "bg-white/10 text-white ring-white/25 hover:bg-white/20"
                  }`}
                >
                  {r.name}
                  {r.location && (
                    <span className={`ml-1.5 font-medium ${active ? "text-emerald-700/70" : "text-white/60"}`}>· {r.location}</span>
                  )}
                </button>
              );
            })}
            <div className="ml-auto flex items-center gap-3 text-white text-xs">
              <span>
                <b className="text-base tabular-nums">{totals.finished}</b>
                <span className="text-white/70"> / {totals.total} finished</span>
              </span>
              <span className="hidden sm:block w-28 h-2 rounded-full bg-white/20 overflow-hidden">
                <span className="block h-full bg-emerald-300 rounded-full transition-all" style={{ width: `${pct}%` }} />
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className={`mx-auto px-4 sm:px-6 lg:px-8 py-5 ${isFull ? "max-w-none" : "max-w-7xl"}`}>
        {/* ===== Latest Finishers (lintas kategori): 1 sorotan + daftar sebelumnya ===== */}
        {recent.length > 0 && (
          <div className="mb-5">
          <LatestFinishers
            recent={recent}
            now={now}
            updatedAt={race?.updatedAt}
            flashKeys={flashKeys}
            rowKey={rowKey}
            onOpen={(row, cls) => setDetail({ row, cls })}
          />
          </div>
        )}

        {/* ===== Filter ringkas ===== */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {types.length > 1 &&
            [{ id: "all", name: "All" }, ...types].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTypeId(t.id)}
                className={`px-3 py-1.5 rounded-full text-[11px] font-semibold transition ${
                  typeId === t.id
                    ? "bg-emerald-600 text-white"
                    : "bg-white text-gray-600 ring-1 ring-gray-200 hover:bg-gray-100"
                }`}
              >
                {t.name}
              </button>
            ))}
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search runner…"
            className={`ml-auto w-full sm:w-60 px-3.5 py-2 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-400 ${
              "bg-white border border-gray-200"
            }`}
          />
        </div>

        {error && <p className="mb-3 text-[11px] text-red-500">Connection problem — showing the latest data.</p>}

        {/* ===== Papan semua kategori ===== */}
        {classes.length === 0 ? (
          <div className={`py-16 text-center rounded-2xl bg-white text-gray-500 ring-1 ring-gray-200/70`}>
            No categories / results yet for {race?.name || "this race"}.
          </div>
        ) : (
          <div className={`grid gap-4 ${isFull ? "grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4" : "grid-cols-1 md:grid-cols-2 xl:grid-cols-3"}`}>
            {classes.map((c) => (
              <ClassBoard
                key={c.classId}
                cls={c}
               
                match={match}
                filtering={!!q}
                flashKeys={flashKeys}
                rowKey={rowKey}
                onOpen={(row) => setDetail({ row, cls: c })}
              />
            ))}
          </div>
        )}

        <p className={`mt-5 text-[11px] text-gray-400`}>
          Click a runner to see split times per control. MP = Missing Punch · DNF = did not finish · DSQ = disqualified · DNS = did not start.
        </p>
      </div>

      {detail && <SplitModal detail={detail} onClose={() => setDetail(null)} />}

      <style jsx global>{`
        @keyframes ori-flash-kf {
          0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); background-color: rgba(16, 185, 129, 0.18); }
          100% { box-shadow: 0 0 0 12px rgba(16, 185, 129, 0); }
        }
        .ori-flash { animation: ori-flash-kf 1.4s ease-out 3; }
        @keyframes ori-marquee-kf {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        .ori-marquee-track { animation: ori-marquee-kf var(--ori-marquee-duration, 30s) linear infinite; }
        .ori-marquee:hover .ori-marquee-track,
        .ori-marquee:focus-within .ori-marquee-track { animation-play-state: paused; }
        @media (prefers-reduced-motion: reduce) {
          .ori-marquee { overflow-x: auto; }
          .ori-marquee-track { animation: none; }
          .ori-marquee-dup { display: none; }
        }
      `}</style>
    </section>
  );
}

/* --------------------------- Latest Finishers --------------------------- */

function agoText(readAt, now) {
  const t = new Date(readAt).getTime();
  if (!Number.isFinite(t)) return "";
  const sec = Math.max(0, Math.round((now.getTime() - t) / 1000));
  if (sec < 45) return "just now";
  if (sec < 3600) return `${Math.round(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  return fmtClock(readAt, false);
}

// Marquee satu baris: finisher terbaru lintas kategori berjalan berulang
// (terbaru paling depan) supaya hemat tempat. Berhenti saat di-hover/fokus;
// kalau user minta reduced-motion → jadi strip yang bisa digeser manual.
const STATUS_LONG = { MP: "MP", DNF: "Did Not Finish", NO_START: "No Start Punch", DSQ: "Disqualified", DNS: "Did Not Start" };
function ordinal(n) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

const MARQUEE_SEC_PER_ITEM = 6;

function FinisherChip({ row, cls, isLatest, now, flash, onOpen, hidden }) {
  const ok = row.status === "OK";
  return (
    <button
      type="button"
      onClick={() => onOpen(row, cls)}
      tabIndex={hidden ? -1 : undefined}
      className={`flex-none inline-flex items-center gap-2 h-9 pl-2 pr-3 rounded-lg ring-1 text-left whitespace-nowrap transition hover:ring-emerald-300 ${
        isLatest ? "bg-emerald-50 ring-emerald-200" : "bg-white ring-gray-200"
      } ${flash ? "ori-flash" : ""}`}
    >
      <span className="text-[10px] font-semibold tabular-nums text-gray-500">
        {isLatest ? "latest" : agoText(row.readAt, now)}
      </span>
      <span className="w-px h-4 bg-gray-200" />
      <CountryFlag nationality={row.nationality} />
      <span className="font-semibold text-gray-900 max-w-[12rem] truncate">{row.name}</span>
      <CatChip cls={cls} size="xs" />
      {ok ? (
        <>
          {row.rank ? (
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                row.rank === 1
                  ? "bg-amber-100 text-amber-700"
                  : row.rank <= 3
                  ? "bg-orange-50 text-orange-600"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              {ordinal(row.rank)}
            </span>
          ) : null}
          <span className="font-bold tabular-nums text-gray-900">{fmtSec(row.timeSec)}</span>
        </>
      ) : (
        <span className="text-[11px] font-bold text-red-600">{STATUS_LONG[row.status] || row.status}</span>
      )}
    </button>
  );
}

function LatestFinishers({ recent, now, updatedAt, flashKeys, rowKey, onOpen }) {
  // Isi diulang secukupnya sampai 1 "set" >= lebar kontainer, supaya ticker
  // tidak menyisakan bagian kosong saat finisher masih sedikit.
  const viewRef = useRef(null);
  const oneRef = useRef(null);
  const [reps, setReps] = useState(1);
  useEffect(() => {
    const view = viewRef.current;
    const one = oneRef.current;
    if (!view || !one) return undefined;
    const measure = () => {
      const w1 = one.scrollWidth;
      const vw = view.clientWidth;
      if (w1 > 0 && vw > 0) setReps(Math.max(1, Math.ceil(vw / w1)));
    };
    measure();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    if (ro) {
      ro.observe(view);
      ro.observe(one);
    }
    return () => ro && ro.disconnect();
  }, [recent.length]);

  const duration = `${Math.max(20, recent.length * reps * MARQUEE_SEC_PER_ITEM)}s`;
  const renderSet = (prefix, hidden) =>
    recent.map(({ row, cls }, i) => (
      <FinisherChip
        key={`${prefix}${rowKey(cls, row)}`}
        row={row}
        cls={cls}
        isLatest={i === 0 && prefix === "ar0-"}
        now={now}
        flash={flashKeys.has(rowKey(cls, row))}
        onOpen={onOpen}
        hidden={hidden}
      />
    ));
  // satu "set" = isi diulang `reps` kali (salinan ke-2 dst. tersembunyi dari pembaca layar)
  const renderFill = (half) =>
    Array.from({ length: reps }, (_, k) => renderSet(`${half}r${k}-`, half === "b" || k > 0)).flat();

  return (
    <section className="flex items-stretch rounded-xl bg-white ring-1 ring-gray-200/70 shadow-sm overflow-hidden">
      {/* label tetap (tidak ikut berjalan) */}
      <div className="flex-none flex flex-col justify-center gap-0.5 px-3 sm:px-4 border-r border-gray-100 bg-emerald-50/50">
        <span className="flex items-center gap-1.5">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
          </span>
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 whitespace-nowrap">
            <span className="sm:hidden">Latest</span>
            <span className="hidden sm:inline">Latest Finishers</span>
          </span>
        </span>
        {updatedAt && (
          <span className="hidden sm:block text-[10px] text-gray-400 whitespace-nowrap tabular-nums">
            {fmtClock(updatedAt)} WIB
          </span>
        )}
      </div>

      {/* track berjalan: 2 salinan isi, geser -50% → loop mulus */}
      <div ref={viewRef} className="ori-marquee relative flex-1 min-w-0 overflow-hidden py-1.5" aria-label="Latest finishers">
        {/* pengukur lebar 1 set (tak terlihat) */}
        <div ref={oneRef} className="absolute invisible pointer-events-none flex gap-2 pl-2" aria-hidden="true">
          {renderSet("m-", true)}
        </div>
        <div className="ori-marquee-track flex w-max" style={{ "--ori-marquee-duration": duration }}>
          <div className="flex shrink-0 gap-2 pl-2">{renderFill("a")}</div>
          <div className="ori-marquee-dup flex shrink-0 gap-2 pl-2" aria-hidden="true">
            {renderFill("b")}
          </div>
        </div>
        <span className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-white to-transparent" />
      </div>
    </section>
  );
}

/* ---------------------------- papan kategori ---------------------------- */

function ClassBoard({ cls, match, filtering, flashKeys, rowKey, onOpen }) {
  const [showPending, setShowPending] = useState(false);
  const done = cls.rows.filter((r) => !r.pending && match(r));
  const pending = cls.rows.filter((r) => r.pending && match(r));
  if (filtering && !done.length && !pending.length) return null;
  const wre = isWre(cls.typeName);

  return (
    <div className={`rounded-2xl overflow-hidden flex flex-col bg-white ring-1 ring-gray-200/70 shadow-sm`}>
      <div className={`flex items-center gap-2 px-4 py-3 ${wre ? "bg-amber-50" : "bg-sky-50/70"}`}>
        <span className="text-base font-extrabold tracking-tight">{cls.className}</span>
        <span
          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${
            wre ? "bg-amber-400/20 text-amber-600" : "bg-sky-400/20 text-sky-600"
          }`}
        >
          {wre ? "WRE" : cls.typeName ? cls.typeName.replace(/ Event$/i, "") : "-"}
        </span>
        <span className={`ml-auto text-[11px] font-semibold tabular-nums text-gray-500`}>
          {cls.finished}/{cls.total} finished
        </span>
      </div>

      {done.length === 0 ? (
        <div className={`px-4 py-6 text-center text-xs text-gray-400`}>No finishers yet</div>
      ) : (
        <ol className={`divide-y divide-gray-100`}>
          {done.map((r) => (
            <li key={rowKey(cls, r)}>
              <button
                type="button"
                onClick={() => onOpen(r)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition ${
                  flashKeys.has(rowKey(cls, r)) ? "ori-flash" : ""
                } hover:bg-emerald-50/50`}
              >
                <RankBadge rank={r.rank} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5 min-w-0">
                    <CountryFlag nationality={r.nationality} />
                    <span className="font-semibold truncate">{r.name}</span>
                    <EditedTag r={r} />
                  </span>
                  {/* negara cukup lewat bendera (nama negara = tooltip) */}
                  {r.club && <span className={`block text-[11px] truncate text-gray-500`}>{r.club}</span>}
                  <StartFinish r={r} />
                </span>
                <span className="text-right flex-none">
                  {r.status === "OK" ? (
                    <>
                      <span className="block font-bold tabular-nums">{fmtSec(r.timeSec)}</span>
                      {r.behindSec ? (
                        <span className={`block text-[11px] tabular-nums text-gray-400`}>+{fmtSec(r.behindSec)}</span>
                      ) : r.rank === 1 ? (
                        <span className="block text-[10px] font-bold uppercase text-amber-500">Leader</span>
                      ) : null}
                    </>
                  ) : (
                    <StatusPill r={r} />
                  )}
                </span>
              </button>
            </li>
          ))}
        </ol>
      )}

      {pending.length > 0 && (
        <div className={`mt-auto border-t border-gray-100`}>
          <button
            type="button"
            onClick={() => setShowPending((v) => !v)}
            className={`w-full flex items-center gap-2 px-4 py-2.5 text-[11px] font-semibold text-gray-500 hover:bg-gray-50`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            {/* kartu belum dibaca = belum mulai; jamnya hanya JADWAL Starting Order */}
            {pending.length} not started
            {!showPending && schedOf(pending[0]) && (
              <span className="font-normal">
                · next scheduled start: {pending[0].name.split(" ")[0]} {schedOf(pending[0])}
              </span>
            )}
            <span className="ml-auto">{showPending ? "▲" : "▼"}</span>
          </button>
          {showPending && (
            <ul className={`px-4 pb-3 space-y-1 text-xs text-gray-500`}>
              {pending.map((r) => (
                <li key={`${r.name}|${r.bib}`} className="flex items-center gap-2">
                  <CountryFlag nationality={r.nationality} />
                  <span className="truncate">{r.name}</span>
                  <span className="ml-auto text-[11px] tabular-nums">{schedOf(r) ? `Scheduled ${schedOf(r)}` : "—"}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function RankBadge({ rank }) {
  if (!rank) return <span className={`w-7 text-center flex-none text-gray-300`}>–</span>;
  const cls =
    rank === 1
      ? "bg-amber-400 text-white"
      : rank === 2
      ? "bg-slate-300 text-slate-800"
      : rank === 3
      ? "bg-orange-400 text-white"
      : "bg-gray-100 text-gray-700";
  return <span className={`w-7 h-7 flex-none inline-flex items-center justify-center rounded-full text-[11px] font-bold ${cls}`}>{rank}</span>;
}

function StatusPill({ r, small }) {
  return (
    <span
      title={STATUS_HINT[r.status] || ""}
      className={`inline-block rounded-md bg-red-500/10 text-red-500 ring-1 ring-red-500/20 font-bold ${small ? "px-1.5 text-[10px]" : "px-2 py-0.5 text-[11px]"}`}
    >
      {STATUS_TEXT[r.status] || r.status}
      {r.status === "MP" && r.missing ? ` ${r.missing}` : ""}
    </span>
  );
}

function CatChip({ cls, size }) {
  const wre = isWre(cls.typeName);
  return (
    <span
      className={`flex-none rounded font-bold leading-none ${size === "xs" ? "px-1 py-[2px] text-[9px]" : "px-2 py-0.5 text-[10px]"} ${
        wre ? "bg-amber-400/20 text-amber-600" : "bg-sky-100 text-sky-700"
      }`}
    >
      {cls.className}
    </span>
  );
}

/* ----------------------------- pop-up split ----------------------------- */

function SplitModal({ detail, onClose }) {
  const { row: r, cls } = detail;
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const ok = r.status === "OK";
  const splits = r.splits || [];
  const missedOf = (s) => s.found === false || (s.found === undefined && s.cumSec === null);
  const legs = splits.map((s) => s.legSec).filter((v) => v !== null && v !== undefined);
  // sorot leg tercepat hanya bila memang ada yg lebih cepat (bukan semua sama)
  const minLeg = legs.length ? Math.min(...legs) : null;
  const bestLeg = legs.length > 1 && legs.some((v) => v !== minLeg) ? minLeg : null;
  const missedCount = splits.filter(missedOf).length;

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full sm:max-w-md max-h-[85vh] flex flex-col rounded-t-2xl sm:rounded-2xl bg-white text-gray-900 text-xs shadow-xl overflow-hidden">
        {/* header */}
        <div className="flex items-start gap-2.5 px-4 pt-3.5 pb-3 border-b border-gray-100">
          <RankBadge rank={r.rank} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 min-w-0">
              <CountryFlag nationality={r.nationality} />
              <span className="font-bold text-sm leading-tight truncate">{r.name}</span>
              <CatChip cls={cls} size="xs" />
              <EditedTag r={r} />
            </div>
            <div className="mt-0.5 text-[11px] text-gray-500 truncate">
              {[r.club, r.nationality, r.bib ? `BIB ${r.bib}` : ""].filter(Boolean).join(" · ") || "-"}
            </div>
          </div>
          <div className="text-right flex-none">
            {ok ? (
              <>
                <div className="text-base font-extrabold tabular-nums leading-tight">{fmtSec(r.timeSec)}</div>
                <div className={`text-[10px] tabular-nums ${r.rank === 1 ? "text-amber-600 font-semibold" : "text-gray-400"}`}>
                  {r.rank === 1 ? "leading" : r.behindSec ? `+${fmtSec(r.behindSec)} behind` : ""}
                </div>
              </>
            ) : (
              <StatusPill r={r} />
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="-mr-1 -mt-0.5 w-6 h-6 inline-flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* ringkasan waktu */}
        <dl className="grid grid-cols-4 divide-x divide-gray-100 border-b border-gray-100 bg-gray-50/60 text-center">
          {[
            ["Scheduled", schedOf(r) || "-", "info only"],
            ["Start", r.cardStart || "none", "SI Card"],
            ["Finish", r.cardFinish || "none", "SI Card"],
            ["Time", ok ? fmtSec(r.timeSec) : STATUS_TEXT[r.status] || r.status, ok ? "finish − start" : "not ranked"],
          ].map(([label, value, hint]) => (
            <div key={label} className="px-1.5 py-2">
              <dt className="text-[9px] font-bold uppercase tracking-wider text-gray-400">{label}</dt>
              <dd className={`mt-0.5 font-semibold tabular-nums ${value === "none" ? "text-red-500" : "text-gray-800"}`}>{value}</dd>
              <dd className="text-[9px] text-gray-400">{hint}</dd>
            </div>
          ))}
        </dl>

        {/* split per pos */}
        <div className="flex items-center justify-between px-4 pt-2.5 pb-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Splits · {splits.length} controls</span>
          {missedCount > 0 && <span className="text-[10px] font-semibold text-red-500">{missedCount} missed</span>}
        </div>
        <div className="overflow-y-auto">
          {splits.length ? (
            <table className="w-full">
              <thead className="sticky top-0 bg-white text-[9px] uppercase tracking-wider text-gray-400">
                <tr className="border-b border-gray-100">
                  <th className="pl-4 pr-2 py-1.5 text-left font-bold w-10">#</th>
                  <th className="px-2 py-1.5 text-left font-bold">Control</th>
                  <th className="px-2 py-1.5 text-right font-bold">Split</th>
                  <th className="pl-2 pr-4 py-1.5 text-right font-bold">Leg</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                <tr className="text-gray-400">
                  <td className="pl-4 pr-2 py-1.5">S</td>
                  <td className="px-2 py-1.5">Start</td>
                  <td className="px-2 py-1.5 text-right tabular-nums">{r.cardStart || "-"}</td>
                  <td className="pl-2 pr-4 py-1.5" />
                </tr>
                {splits.map((sp) => {
                  const missed = missedOf(sp);
                  const best = !missed && bestLeg !== null && sp.legSec === bestLeg;
                  return (
                    <tr key={sp.order} className={missed ? "bg-red-50/60 text-red-500" : ""}>
                      <td className="pl-4 pr-2 py-1.5 font-semibold text-gray-500">{sp.order}</td>
                      <td className="px-2 py-1.5 font-semibold">{sp.code}</td>
                      <td className="px-2 py-1.5 text-right tabular-nums">
                        {missed ? (
                          <span className="font-semibold">missed</span>
                        ) : sp.cumSec !== null && sp.cumSec !== undefined ? (
                          fmtSec(sp.cumSec)
                        ) : (
                          <span className="text-gray-400" title="Punch clock time — no Start punch">
                            {sp.punchTime || "-"}
                          </span>
                        )}
                      </td>
                      <td className="pl-2 pr-4 py-1.5 text-right tabular-nums">
                        {sp.legSec === null || sp.legSec === undefined ? (
                          ""
                        ) : (
                          <span className={best ? "px-1 rounded bg-emerald-100 text-emerald-700 font-semibold" : "text-gray-500"}>
                            +{fmtSec(sp.legSec)}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                <tr className="font-semibold">
                  <td className="pl-4 pr-2 py-1.5 text-gray-500">F</td>
                  <td className="px-2 py-1.5">Finish</td>
                  <td className="px-2 py-1.5 text-right tabular-nums">{ok ? fmtSec(r.timeSec) : r.cardFinish || "-"}</td>
                  <td className="pl-2 pr-4 py-1.5" />
                </tr>
              </tbody>
            </table>
          ) : (
            <p className="px-4 py-6 text-center text-gray-400">No split data yet.</p>
          )}
          <p className="px-4 py-2 text-[10px] text-gray-400 border-t border-gray-50">
            {bestLeg !== null && (
              <>
                <span className="inline-block px-1 rounded bg-emerald-100 text-emerald-700 font-semibold">+{fmtSec(bestLeg)}</span> fastest leg ·{" "}
              </>
            )}
            Times from the SI Card only
          </p>
        </div>
      </div>
    </div>
  );
}
