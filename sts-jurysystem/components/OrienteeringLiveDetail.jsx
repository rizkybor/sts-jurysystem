"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import getSocket from "@/utils/socket";
import LoadingSpinner from "@/components/LoadingSpinner";
import CountryFlag from "@/components/CountryFlag";
import { CompassIcon, StatusBadge, orienteeringStatus } from "@/components/OrienteeringLiveList";

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
const RECENT_COUNT = 8;

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
    <span className={`block text-[11px] tabular-nums ${muted} ${className}`}>
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
        <CompassIcon className="w-16 h-16 text-emerald-600/40" />
        <p className="text-gray-600">{error}</p>
        <Link href="/live?sport=orienteering" className="px-5 py-2.5 rounded-xl bg-sts text-white text-sm font-semibold">
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
      className={`min-h-screen transition-colors text-gray-900 ${isFull ? "bg-slate-200 overflow-y-auto" : "bg-gray-50"}`}
    >
      {/* ===== Header ringkas ===== */}
      <div className="bg-gradient-to-br from-emerald-800 via-teal-800 to-stsDarkHiglight">
        <div className={`mx-auto px-4 sm:px-6 lg:px-8 ${isFull ? "max-w-none py-3" : "max-w-7xl py-5 sm:py-6"}`}>
          {!isFull && (
            <Link href="/live?sport=orienteering" className="inline-flex items-center gap-1.5 text-white/80 hover:text-white text-sm font-medium mb-3">
              ← Live Results
            </Link>
          )}
          <div className="flex items-center gap-3 sm:gap-4">
            <span className="flex-none w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-white shadow ring-2 ring-white/50 overflow-hidden flex items-center justify-center">
              {ev.logo || ev.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={ev.logo || ev.image} alt="" className={`w-full h-full ${ev.logo ? "object-contain p-1" : "object-cover"}`} />
              ) : (
                <CompassIcon className="w-7 h-7 text-emerald-700" />
              )}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={status} />
                <span className="text-xs text-white/70 hidden sm:inline">
                  {fmtDate(ev.startDate)}
                  {ev.endDate && ev.endDate !== ev.startDate ? ` – ${fmtDate(ev.endDate)}` : ""}
                </span>
              </div>
              <h1 className="mt-0.5 text-lg sm:text-2xl font-bold text-white tracking-tight truncate">{ev.name}</h1>
            </div>
            {isFull && <div className="hidden md:block text-3xl font-bold tabular-nums text-white">{fmtClock(now)}</div>}
            <button
              type="button"
              onClick={toggleFull}
              title={isFull ? "Exit Full Screen (Esc)" : "Full Screen"}
              className="flex-none inline-flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 ring-1 ring-white/25 text-white text-sm font-semibold transition"
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
                  className={`px-4 py-2 rounded-xl text-sm font-bold transition ring-1 ${
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
            <div className="ml-auto flex items-center gap-3 text-white text-sm">
              <span>
                <b className="text-lg tabular-nums">{totals.finished}</b>
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
        {/* ===== Baru Finish (lintas kategori) ===== */}
        {recent.length > 0 && (
          <div className="mb-5">
            <div className={`flex items-center gap-2 mb-2 text-xs font-bold uppercase tracking-wider text-emerald-700`}>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              Latest Finishers
              {race?.updatedAt && (
                <span className={`ml-auto font-medium normal-case tracking-normal text-gray-400`}>
                  updated {fmtClock(race.updatedAt)} WIB
                </span>
              )}
            </div>
            <div className="flex gap-2.5 overflow-x-auto pb-1 -mx-1 px-1">
              {recent.map(({ row, cls }) => (
                <button
                  key={rowKey(cls, row)}
                  type="button"
                  onClick={() => setDetail({ row, cls })}
                  className={`flex-none w-56 text-left rounded-xl p-3 ring-1 transition ${
                    flashKeys.has(rowKey(cls, row)) ? "ori-flash" : ""
                  } bg-white ring-gray-200 hover:ring-emerald-300 shadow-sm`}
                >
                  <div className="flex items-center gap-2">
                    <CatChip cls={cls} />
                    {row.rank ? (
                      <span className={`text-xs font-bold ${row.rank <= 3 ? "text-amber-500" : "text-gray-600"}`}>
                        #{row.rank}
                      </span>
                    ) : (
                      <StatusPill r={row} small />
                    )}
                    <span className={`ml-auto text-[11px] tabular-nums text-gray-400`}>
                      {fmtClock(row.readAt, false)}
                    </span>
                  </div>
                  <div className="mt-1.5 flex items-center gap-1.5 min-w-0">
                    <CountryFlag nationality={row.nationality} />
                    <span className="font-semibold truncate">{row.name}</span>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <span className={`text-xs truncate text-gray-500`}>{row.club || ""}</span>
                    {row.status === "OK" && <span className="text-lg font-bold tabular-nums">{fmtSec(row.timeSec)}</span>}
                  </div>
                  <StartFinish r={row} className="mt-0.5" />
                </button>
              ))}
            </div>
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
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${
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
            className={`ml-auto w-full sm:w-60 px-3.5 py-2 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 ${
              "bg-white border border-gray-200"
            }`}
          />
        </div>

        {error && <p className="mb-3 text-xs text-red-500">Connection problem — showing the latest data.</p>}

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

        <p className={`mt-5 text-xs text-gray-400`}>
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
      `}</style>
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
        <span className="text-lg font-extrabold tracking-tight">{cls.className}</span>
        <span
          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${
            wre ? "bg-amber-400/20 text-amber-600" : "bg-sky-400/20 text-sky-600"
          }`}
        >
          {wre ? "WRE" : cls.typeName ? cls.typeName.replace(/ Event$/i, "") : "-"}
        </span>
        <span className={`ml-auto text-xs font-semibold tabular-nums text-gray-500`}>
          {cls.finished}/{cls.total} finished
        </span>
      </div>

      {done.length === 0 ? (
        <div className={`px-4 py-6 text-center text-sm text-gray-400`}>No finishers yet</div>
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
                  {r.club && <span className={`block text-xs truncate text-gray-500`}>{r.club}</span>}
                  <StartFinish r={r} />
                </span>
                <span className="text-right flex-none">
                  {r.status === "OK" ? (
                    <>
                      <span className="block font-bold tabular-nums">{fmtSec(r.timeSec)}</span>
                      {r.behindSec ? (
                        <span className={`block text-xs tabular-nums text-gray-400`}>+{fmtSec(r.behindSec)}</span>
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
            className={`w-full flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-gray-500 hover:bg-gray-50`}
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
            <ul className={`px-4 pb-3 space-y-1 text-sm text-gray-500`}>
              {pending.map((r) => (
                <li key={`${r.name}|${r.bib}`} className="flex items-center gap-2">
                  <CountryFlag nationality={r.nationality} />
                  <span className="truncate">{r.name}</span>
                  <span className="ml-auto text-xs tabular-nums">{schedOf(r) ? `Scheduled ${schedOf(r)}` : "—"}</span>
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
  return <span className={`w-7 h-7 flex-none inline-flex items-center justify-center rounded-full text-xs font-bold ${cls}`}>{rank}</span>;
}

function StatusPill({ r, small }) {
  return (
    <span
      title={STATUS_HINT[r.status] || ""}
      className={`inline-block rounded-md bg-red-500/10 text-red-500 ring-1 ring-red-500/20 font-bold ${small ? "px-1.5 text-[10px]" : "px-2 py-0.5 text-xs"}`}
    >
      {STATUS_TEXT[r.status] || r.status}
      {r.status === "MP" && r.missing ? ` ${r.missing}` : ""}
    </span>
  );
}

function CatChip({ cls }) {
  const wre = isWre(cls.typeName);
  return (
    <span
      className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${
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

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div
        className={`relative w-full sm:max-w-lg max-h-[85vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl shadow-xl ${
          "bg-white text-gray-900"
        }`}
      >
        <div className={`sticky top-0 flex items-start gap-3 px-5 py-4 border-b bg-white border-gray-100`}>
          <RankBadge rank={r.rank} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <CountryFlag nationality={r.nationality} size="lg" />
              <span className="font-bold text-lg leading-tight">{r.name}</span>
              <EditedTag r={r} />
            </div>
            <div className={`text-xs text-gray-500`}>
              {cls.className}
              {r.bib ? ` · BIB ${r.bib}` : ""}
              {r.club ? ` · ${r.club}` : ""}
              {r.nationality ? ` · ${r.nationality}` : ""}
            </div>
          </div>
          <div className="text-right">
            {r.status === "OK" ? (
              <>
                <div className="text-2xl font-bold tabular-nums">{fmtSec(r.timeSec)}</div>
                {r.behindSec ? <div className="text-xs text-gray-400 tabular-nums">+{fmtSec(r.behindSec)}</div> : null}
              </>
            ) : (
              <StatusPill r={r} />
            )}
          </div>
          <button type="button" onClick={onClose} className="ml-1 text-xl leading-none text-gray-400 hover:text-gray-600" aria-label="Close">
            ×
          </button>
        </div>

        <div className={`grid grid-cols-2 sm:grid-cols-4 gap-px bg-gray-100`}>
          {[
            ["Scheduled Start", schedOf(r) || "-", "Starting Order (info only, not used)"],
            ["Start (SI Card)", r.cardStart || "none", "Start punch"],
            ["Finish (SI Card)", r.cardFinish || "none", "Finish punch"],
            ["Time", r.status === "OK" ? fmtSec(r.timeSec) : STATUS_TEXT[r.status] || r.status, r.status === "OK" ? "Finish − Start" : STATUS_HINT[r.status] || ""],
          ].map(([label, value, hint]) => (
            <div key={label} className={`px-4 py-3 bg-white`}>
              <div className={`text-[10px] font-bold uppercase tracking-wider text-gray-400`}>{label}</div>
              <div
                className={`mt-0.5 font-bold tabular-nums ${
                  value === "none" ? "text-red-500" : ""
                }`}
              >
                {value}
              </div>
              <div className={`text-[10px] text-gray-400`}>{hint}</div>
            </div>
          ))}
        </div>

        {r.splits?.length ? (
          <table className="w-full text-sm">
            <thead className={`text-xs uppercase tracking-wide text-gray-400`}>
              <tr>
                <th className="px-5 py-2 text-left">#</th>
                <th className="px-3 py-2 text-left">Control</th>
                <th className="px-3 py-2 text-right">Time</th>
                <th className="px-5 py-2 text-right">Leg</th>
              </tr>
            </thead>
            <tbody className={`divide-y divide-gray-100`}>
              {r.splits.map((s) => {
                // snapshot lama tanpa `found`: anggap terlewat kalau tanpa waktu
                const missed = s.found === false || (s.found === undefined && s.cumSec === null);
                return (
                <tr key={s.order} className={missed ? "text-red-500" : ""}>
                  <td className="px-5 py-2 font-semibold">{s.order}</td>
                  <td className="px-3 py-2">{s.code}</td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {missed ? (
                      "missed"
                    ) : s.cumSec !== null ? (
                      fmtSec(s.cumSec)
                    ) : (
                      <span className={"text-gray-500"} title="Punch clock time — cumulative time cannot be calculated without a Start punch">
                        {s.punchTime || "-"}
                      </span>
                    )}
                  </td>
                  <td className={`px-5 py-2 text-right tabular-nums text-gray-500`}>
                    {s.legSec === null ? "" : `+${fmtSec(s.legSec)}`}
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <p className={`px-5 py-8 text-center text-sm text-gray-400`}>No split data yet.</p>
        )}
      </div>
    </div>
  );
}
