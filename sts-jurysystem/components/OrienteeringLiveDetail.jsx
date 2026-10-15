"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import getSocket from "@/utils/socket";
import LoadingSpinner from "@/components/LoadingSpinner";
import { CompassIcon, StatusBadge, orienteeringStatus } from "@/components/OrienteeringLiveList";

// Live Result Orienteering (read-only — Orienteering tidak punya juri).
// Snapshot hasil per jenis ditulis sts-timingsystem ke orienteeringLiveResults
// tiap kartu SI dibaca; di sini di-refetch saat socket "orienteering:updated"
// masuk, plus polling cadangan.

const POLL_MS = 20000;

const STATUS_TEXT = {
  OK: "OK",
  MP: "MP",
  DNF: "DNF",
  NO_START: "Tanpa Start",
  DSQ: "DSQ",
  DNS: "DNS",
};
const STATUS_HINT = {
  MP: "Missing Punch — pos terlewat / salah urutan",
  DNF: "Tidak finish",
  NO_START: "Tidak ada punch Start",
  DSQ: "Didiskualifikasi",
  DNS: "Tidak start",
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
  if (isNaN(d)) return s;
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric", timeZone: "Asia/Jakarta" });
}

function fmtClock(d) {
  if (!d) return "";
  const x = new Date(d);
  if (isNaN(x)) return "";
  return x.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: "Asia/Jakarta" });
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

export default function OrienteeringLiveDetail() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [raceId, setRaceId] = useState(null);
  const [typeId, setTypeId] = useState("all");
  const [classId, setClassId] = useState(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState({});
  const [flash, setFlash] = useState(false);
  const flashTimer = useRef(null);

  const load = useCallback(
    async (fromSocket = false) => {
      try {
        const res = await fetch(`/api/orienteering/events/${id}`, { cache: "no-store" });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || "Gagal memuat hasil");
        setData(json);
        setError("");
        if (fromSocket) {
          setFlash(true);
          clearTimeout(flashTimer.current);
          flashTimer.current = setTimeout(() => setFlash(false), 2500);
        }
      } catch (e) {
        setError(e.message || "Gagal memuat hasil");
      }
    },
    [id]
  );

  useEffect(() => {
    load();
    const t = setInterval(() => load(), POLL_MS);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => {
    const socket = getSocket();
    const handler = (msg) => {
      if (!msg || msg.type !== "orienteering:updated" || String(msg.eventId || "") !== String(id)) return;
      load(true);
    };
    socket.on("custom:event", handler);
    return () => socket.off("custom:event", handler);
  }, [id, load]);

  // jenis aktif: pilihan terakhir (localStorage) -> jenis pertama
  useEffect(() => {
    if (!data || raceId !== null) return;
    const saved = storageGet(`ori-live:race:${id}`);
    const races = data.races || [];
    setRaceId(races.some((r) => r.id === saved) ? saved : races[0]?.id ?? "");
  }, [data, raceId, id]);

  const race = useMemo(() => (data?.races || []).find((r) => r.id === raceId) || null, [data, raceId]);
  // hanya Type yang dipertandingkan di jenis aktif (mis. World Ranking
  // Event hanya Middle) — snapshot jenis tsb hanya berisi kategorinya
  const types = useMemo(() => {
    const ids = new Set((race?.classes || []).map((c) => c.typeId));
    return (data?.event?.types || []).filter((t) => ids.has(t.id));
  }, [data, race]);
  const classes = useMemo(() => {
    let all = race?.classes || [];
    // kategori tanpa peserta di jenis ini disembunyikan (kecuali semuanya kosong)
    if (all.some((c) => c.total > 0)) all = all.filter((c) => c.total > 0);
    return typeId === "all" ? all : all.filter((c) => c.typeId === typeId);
  }, [race, typeId]);

  // type terpilih tidak ada di jenis baru -> kembali ke "Semua Type"
  useEffect(() => {
    if (typeId !== "all" && !types.some((t) => t.id === typeId)) setTypeId("all");
  }, [types, typeId]);

  // kategori aktif tetap valid saat jenis/type berganti
  useEffect(() => {
    if (!classes.length) return;
    if (!classes.some((c) => c.classId === classId)) setClassId(classes[0].classId);
  }, [classes, classId]);

  const cls = classes.find((c) => c.classId === classId) || null;
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = cls?.rows || [];
    return q ? list.filter((r) => `${r.name} ${r.club} ${r.nationality} ${r.bib}`.toLowerCase().includes(q)) : list;
  }, [cls, query]);

  const pickRace = (rid) => {
    setRaceId(rid);
    setOpen({});
    storageSet(`ori-live:race:${id}`, rid);
  };

  if (!data && !error) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center gap-3 text-gray-500">
        <LoadingSpinner size={20} /> Memuat hasil…
      </div>
    );
  }
  if (!data) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 text-center px-4">
        <CompassIcon className="w-16 h-16 text-emerald-600/40" />
        <p className="text-gray-600">{error}</p>
        <Link href="/live?sport=orienteering" className="px-5 py-2.5 rounded-xl bg-sts text-white text-sm font-semibold">
          Kembali ke Live Results
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

  return (
    <section className="min-h-screen bg-gray-50">
      {/* Hero */}
      <div className="relative overflow-hidden bg-gradient-to-br from-emerald-800 via-teal-800 to-stsDarkHiglight">
        {ev.image && (
          <img src={ev.image} alt="" className="absolute inset-0 w-full h-full object-cover opacity-25 blur-[2px] scale-105" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
          <Link
            href="/live?sport=orienteering"
            className="inline-flex items-center gap-1.5 text-white/80 hover:text-white text-sm font-medium mb-5"
          >
            ← Live Results
          </Link>
          <div className="flex items-center gap-4 sm:gap-5">
            <span className="flex-none w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white shadow-lg ring-2 ring-white/60 overflow-hidden flex items-center justify-center">
              {ev.logo || ev.image ? (
                <img src={ev.logo || ev.image} alt="" className={`w-full h-full ${ev.logo ? "object-contain p-1.5" : "object-cover"}`} />
              ) : (
                <CompassIcon className="w-10 h-10 text-emerald-700" />
              )}
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <StatusBadge status={status} />
                <span className="px-2.5 py-1 rounded-full bg-white/15 text-white text-xs font-semibold ring-1 ring-white/25">
                  Orienteering
                </span>
              </div>
              <h1 className="text-xl sm:text-3xl font-bold text-white tracking-tight leading-tight">{ev.name}</h1>
              <p className="mt-1 text-sm text-white/80">
                {fmtDate(ev.startDate)}
                {ev.endDate && ev.endDate !== ev.startDate ? ` – ${fmtDate(ev.endDate)}` : ""}
                {ev.location ? ` · ${ev.location}` : ""}
              </p>
            </div>
          </div>

          {/* Jenis (Sprint / Middle Distance ...) */}
          <div className="mt-6 flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
            {data.races.map((r) => {
              const active = r.id === raceId;
              return (
                <button
                  key={r.id || "default"}
                  type="button"
                  onClick={() => pickRace(r.id)}
                  className={`flex-none text-left px-4 py-2.5 rounded-xl transition ring-1 ${
                    active
                      ? "bg-white text-emerald-800 ring-white shadow-md"
                      : "bg-white/10 text-white ring-white/25 hover:bg-white/20"
                  }`}
                >
                  <span className="block text-sm font-bold">{r.name}</span>
                  {r.location && (
                    <span className={`block text-xs ${active ? "text-emerald-700/80" : "text-white/70"}`}>📍 {r.location}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Ringkasan + update */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-600 mb-4">
          <span>
            <b className="text-gray-900">{totals.finished}</b> / {totals.total} peserta sudah finish
          </span>
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${
              flash ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${flash ? "bg-emerald-500 animate-pulse" : "bg-gray-400"}`} />
            {race?.updatedAt ? `Diperbarui ${fmtClock(race.updatedAt)} WIB` : "Belum ada hasil"}
          </span>
          {error && <span className="text-red-600 text-xs">Koneksi bermasalah — menampilkan data terakhir</span>}
        </div>

        {/* Type Event */}
        {types.length > 1 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {[{ id: "all", name: "Semua Type" }, ...types].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTypeId(t.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${
                  typeId === t.id ? "bg-sts text-white shadow-sm" : "bg-white text-gray-600 ring-1 ring-gray-200 hover:bg-gray-100"
                }`}
              >
                {t.name}
              </button>
            ))}
          </div>
        )}

        {/* Kategori */}
        {classes.length === 0 ? (
          <div className="py-16 text-center text-gray-500 bg-white rounded-2xl ring-1 ring-gray-200/70">
            Belum ada kategori / hasil untuk {race?.name || "jenis ini"}.
          </div>
        ) : (
          <>
            <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 mb-4">
              {classes.map((c) => {
                const active = c.classId === classId;
                const wre = /world ranking/i.test(c.typeName);
                return (
                  <button
                    key={c.classId}
                    type="button"
                    onClick={() => {
                      setClassId(c.classId);
                      setOpen({});
                    }}
                    className={`flex-none flex items-center gap-2 pl-3 pr-2 py-2 rounded-xl text-sm font-bold transition ring-1 ${
                      active
                        ? "bg-emerald-600 text-white ring-emerald-600 shadow"
                        : "bg-white text-gray-800 ring-gray-200 hover:ring-emerald-300"
                    }`}
                  >
                    {c.className}
                    {wre && !active && <span className="w-1.5 h-1.5 rounded-full bg-amber-500" title="World Ranking Event" />}
                    <span
                      className={`px-1.5 py-0.5 rounded-md text-[11px] font-semibold ${
                        active ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {c.finished}/{c.total}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="bg-white rounded-2xl ring-1 ring-gray-200/70 shadow-sm overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between px-4 sm:px-5 py-4 border-b border-gray-100">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">{cls?.className}</h2>
                  <p className="text-xs text-gray-500">
                    {cls?.typeName || "—"} · {cls?.controls ? `${cls.controls} pos` : "course belum diatur"}
                  </p>
                </div>
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Cari nama / klub / negara…"
                  className="w-full sm:w-64 px-3.5 py-2 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
              </div>

              {rows.length === 0 ? (
                <div className="py-12 text-center text-gray-500 text-sm">Tidak ada peserta.</div>
              ) : (
                <>
                  {/* Desktop / tablet */}
                  <table className="hidden md:table w-full text-sm">
                    <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                      <tr>
                        <th className="px-4 py-3 text-left w-16">Rank</th>
                        <th className="px-4 py-3 text-left">Nama</th>
                        <th className="px-4 py-3 text-left">Klub</th>
                        <th className="px-4 py-3 text-left w-24">Negara</th>
                        <th className="px-4 py-3 text-right w-28">Waktu</th>
                        <th className="px-4 py-3 text-right w-28">Selisih</th>
                        <th className="px-4 py-3 w-10" />
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r, i) => {
                        const key = `${r.name}-${r.bib}-${i}`;
                        const canOpen = r.splits.length > 0 && !r.pending;
                        return (
                          <Fragment key={key}>
                            <tr
                              onClick={() => canOpen && setOpen((o) => ({ ...o, [key]: !o[key] }))}
                              className={`border-t border-gray-100 ${canOpen ? "cursor-pointer hover:bg-emerald-50/40" : ""} ${
                                r.pending ? "text-gray-400" : ""
                              }`}
                            >
                              <td className="px-4 py-3">
                                <RankCell r={r} />
                              </td>
                              <td className="px-4 py-3">
                                <span className={`font-semibold ${r.pending ? "" : "text-gray-900"}`}>{r.name}</span>
                                {r.bib && <span className="ml-2 text-xs text-gray-400">#{r.bib}</span>}
                              </td>
                              <td className="px-4 py-3 text-gray-600">{r.club || "-"}</td>
                              <td className="px-4 py-3 text-gray-600">{r.nationality || "-"}</td>
                              <td className="px-4 py-3 text-right font-semibold tabular-nums">
                                <TimeCell r={r} />
                              </td>
                              <td className="px-4 py-3 text-right text-gray-500 tabular-nums">
                                {r.status === "OK" && r.behindSec ? `+${fmtSec(r.behindSec)}` : ""}
                              </td>
                              <td className="px-4 py-3 text-gray-400 text-xs">{canOpen ? (open[key] ? "▲" : "▼") : ""}</td>
                            </tr>
                            {open[key] && (
                              <tr className="bg-gray-50/70">
                                <td colSpan={7} className="px-4 pb-4 pt-1">
                                  <Splits splits={r.splits} />
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        );
                      })}
                    </tbody>
                  </table>

                  {/* Mobile */}
                  <ul className="md:hidden divide-y divide-gray-100">
                    {rows.map((r, i) => {
                      const key = `${r.name}-${r.bib}-${i}`;
                      const canOpen = r.splits.length > 0 && !r.pending;
                      return (
                        <li key={key} className={r.pending ? "text-gray-400" : ""}>
                          <button
                            type="button"
                            onClick={() => canOpen && setOpen((o) => ({ ...o, [key]: !o[key] }))}
                            className="w-full flex items-center gap-3 px-4 py-3 text-left"
                          >
                            <span className="w-10 flex-none">
                              <RankCell r={r} />
                            </span>
                            <span className="flex-1 min-w-0">
                              <span className={`block font-semibold truncate ${r.pending ? "" : "text-gray-900"}`}>{r.name}</span>
                              <span className="block text-xs text-gray-500 truncate">
                                {[r.club, r.nationality].filter(Boolean).join(" · ") || "-"}
                              </span>
                            </span>
                            <span className="text-right flex-none">
                              <span className="block font-semibold tabular-nums text-sm">
                                <TimeCell r={r} />
                              </span>
                              {r.status === "OK" && r.behindSec ? (
                                <span className="block text-xs text-gray-500">+{fmtSec(r.behindSec)}</span>
                              ) : null}
                            </span>
                          </button>
                          {open[key] && (
                            <div className="px-4 pb-4">
                              <Splits splits={r.splits} />
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </>
              )}
            </div>
            <p className="mt-3 text-xs text-gray-400">
              Klik peserta untuk melihat split per pos. MP = Missing Punch (pos terlewat / salah urutan), DNF = tidak finish,
              DSQ = diskualifikasi, DNS = tidak start.
            </p>
          </>
        )}
      </div>
    </section>
  );
}

function RankCell({ r }) {
  if (r.rank) {
    const medal =
      r.rank === 1
        ? "bg-amber-400 text-white"
        : r.rank === 2
        ? "bg-gray-300 text-gray-800"
        : r.rank === 3
        ? "bg-orange-300 text-white"
        : "bg-gray-100 text-gray-700";
    return <span className={`inline-flex w-8 h-8 items-center justify-center rounded-full text-sm font-bold ${medal}`}>{r.rank}</span>;
  }
  return <span className="text-gray-300">–</span>;
}

function TimeCell({ r }) {
  if (r.pending) {
    return (
      <span className="text-xs font-medium text-gray-400">
        {r.start ? (
          <>
            <span className="block">Belum finish</span>
            <span className="block tabular-nums">Start {r.start}</span>
          </>
        ) : (
          "Belum finish"
        )}
      </span>
    );
  }
  if (r.status === "OK") return fmtSec(r.timeSec);
  return (
    <span
      title={STATUS_HINT[r.status] || ""}
      className="inline-block px-2 py-0.5 rounded-md bg-red-50 text-red-600 ring-1 ring-red-100 text-xs font-bold"
    >
      {STATUS_TEXT[r.status] || r.status}
      {r.status === "MP" && r.missing ? ` (${r.missing})` : ""}
    </span>
  );
}

function Splits({ splits }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {splits.map((s) => (
        <span
          key={s.order}
          className={`px-2 py-1 rounded-lg text-xs ring-1 ${
            s.cumSec === null ? "bg-red-50 text-red-600 ring-red-100" : "bg-white text-gray-700 ring-gray-200"
          }`}
        >
          <b className="mr-1">
            {s.order}. ({s.code})
          </b>
          {s.cumSec === null ? (
            "tidak ada"
          ) : (
            <span className="tabular-nums">
              {fmtSec(s.cumSec)}
              {s.legSec !== null && <span className="text-gray-400"> · +{fmtSec(s.legSec)}</span>}
            </span>
          )}
        </span>
      ))}
    </div>
  );
}
