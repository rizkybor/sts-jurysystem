"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import Spinner from "@/components/Spinner";
import { CompassIcon } from "@/components/OrienteeringLiveList";
import CountryFlag from "@/components/CountryFlag";

// Detail event modul Orienteering (/matches/orienteering/[id]) — padanan
// MatchDetail.jsx (Rafting) yang disesuaikan: jenis lomba (Sprint/Middle)
// + lokasi, Type Event & kategori, dan daftar peserta perorangan (bukan
// tim). Peserta yang ikut beberapa jenis tampil 1 baris dgn chip jenisnya.

function wib(s, endOfDay = false) {
  if (!s) return null;
  const d = new Date(`${s}T${endOfDay ? "23:59:59" : "00:00:00"}+07:00`);
  return isNaN(d) ? null : d;
}
function fmtDate(s) {
  const d = wib(s);
  return d
    ? d.toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric", timeZone: "Asia/Jakarta" })
    : "-";
}
function statusOf(ev) {
  const now = new Date();
  const start = wib(ev.startDate);
  const end = wib(ev.endDate || ev.startDate, true);
  if (start && now < start) return { label: "Upcoming", cls: "bg-white/90 text-stsDark" };
  if (end && now > end) return { label: "Already passed", cls: "bg-rose-100 text-rose-700" };
  return { label: "LIVE", cls: "bg-red-600 text-white", live: true };
}
const isWre = (name) => /world ranking/i.test(String(name || ""));

function initials(name) {
  return String(name || "?")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}
function avatarColor(name) {
  let h = 0;
  for (const ch of String(name || "")) h = (h * 31 + ch.charCodeAt(0)) % 360;
  return `hsl(${h}, 55%, 45%)`;
}

export default function OrienteeringMatchDetail() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errMsg, setErrMsg] = useState("");
  const [raceId, setRaceId] = useState("");
  const [typeId, setTypeId] = useState("");
  const [classId, setClassId] = useState("");
  const [nationality, setNationality] = useState("");
  const [q, setQ] = useState("");

  useEffect(() => {
    let aborted = false;
    (async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/orienteering/events/${id}/participants`, { cache: "no-store" });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || "Gagal memuat detail event");
        if (!aborted) setData(json);
      } catch (e) {
        if (!aborted) setErrMsg(e.message || "Gagal memuat detail event");
      } finally {
        if (!aborted) setLoading(false);
      }
    })();
    return () => {
      aborted = true;
    };
  }, [id]);

  const ev = data?.event;
  const races = data?.races || [];
  const types = data?.types || [];
  const participants = data?.participants || [];

  // kategori pilihan mengikuti Type terpilih
  const classOptions = useMemo(
    () => types.filter((t) => !typeId || t.id === typeId).flatMap((t) => t.categories.map((c) => ({ ...c, typeName: t.name }))),
    [types, typeId]
  );
  useEffect(() => {
    if (classId && !classOptions.some((c) => c.id === classId)) setClassId("");
  }, [classOptions, classId]);

  const nationalityOptions = useMemo(
    () => Array.from(new Set(participants.map((p) => p.nationality).filter(Boolean))).sort((a, b) => a.localeCompare(b)),
    [participants]
  );

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return participants.filter((p) => {
      if (raceId && !p.races.some((r) => r.raceId === raceId)) return false;
      if (typeId && !p.categories.some((c) => c.typeId === typeId)) return false;
      if (classId && !p.categories.some((c) => c.id === classId)) return false;
      if (nationality && p.nationality !== nationality) return false;
      if (s && !`${p.name} ${p.club} ${p.bib} ${p.nationality}`.toLowerCase().includes(s)) return false;
      return true;
    });
  }, [participants, raceId, typeId, classId, nationality, q]);

  const activeFilterCount = [raceId, typeId, classId, nationality, q.trim()].filter(Boolean).length;
  const resetFilters = () => {
    setRaceId("");
    setTypeId("");
    setClassId("");
    setNationality("");
    setQ("");
  };

  const selectClass =
    "w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-700 font-medium " +
    "focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-colors";
  const status = ev ? statusOf(ev) : null;

  return (
    <section className="min-h-screen bg-gray-50 py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Link
            href="/matches?sport=orienteering"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-sts hover:text-stsHighlight transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path fillRule="evenodd" d="M17 10a.75.75 0 0 1-.75.75H5.612l4.158 3.96a.75.75 0 1 1-1.04 1.08l-5.5-5.25a.75.75 0 0 1 0-1.08l5.5-5.25a.75.75 0 1 1 1.04 1.08L5.612 9.25H16.25A.75.75 0 0 1 17 10Z" clipRule="evenodd" />
            </svg>
            Kembali ke Events
          </Link>
        </div>

        {loading && (
          <div className="bg-white shadow-sm ring-1 ring-gray-200/70 rounded-2xl p-10 text-center">
            <Spinner loading={true} />
            <p className="mt-2 text-sm text-gray-500">Memuat detail event…</p>
          </div>
        )}
        {errMsg && (
          <div className="bg-red-50 border border-red-200 text-red-700 shadow-sm rounded-2xl p-4">{errMsg}</div>
        )}

        {/* Hero */}
        {!loading && !errMsg && ev && (
          <div className="relative overflow-hidden rounded-2xl bg-white shadow-md ring-1 ring-gray-200/70">
            <div className="relative h-52 sm:h-64 w-full bg-gradient-to-br from-emerald-700 via-teal-700 to-sts">
              {ev.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={ev.image} alt={ev.name} className="w-full h-full object-cover" />
              ) : (
                <CompassIcon className="absolute inset-0 m-auto w-24 h-24 text-white/25" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
              <div className="absolute top-4 left-4 flex flex-wrap gap-2">
                <span className="px-3 py-1 rounded-full text-xs font-semibold shadow-md bg-gradient-to-r from-emerald-500 to-teal-600 text-white">
                  Orienteering
                </span>
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold shadow-md ${status.cls}`}>
                  {status.live && <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
                  {status.label}
                </span>
              </div>
              <div className="absolute bottom-4 left-4 right-4 flex items-end gap-3">
                <span className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-white shadow-md ring-2 ring-white/80 flex-shrink-0 overflow-hidden flex items-center justify-center">
                  {ev.logo || ev.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={ev.logo || ev.image} alt="" className={`w-full h-full ${ev.logo ? "object-contain p-1" : "object-cover"}`} />
                  ) : (
                    <CompassIcon className="w-8 h-8 text-emerald-700" />
                  )}
                </span>
                <h1 className="text-xl sm:text-3xl font-bold text-white drop-shadow-sm">{ev.name}</h1>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-x-8 gap-y-3 px-5 sm:px-6 py-5">
              {ev.location && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <svg width="18" height="18" viewBox="0 0 24 24" className="text-emerald-600 flex-shrink-0">
                    <path fill="currentColor" d="M12 2C8.14 2 5 5.14 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.86-3.14-7-7-7m0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5Z" />
                  </svg>
                  <span>{ev.location}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <svg width="18" height="18" viewBox="0 0 24 24" className="text-emerald-600 flex-shrink-0">
                  <path fill="currentColor" d="M7 2v2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2V2h-2v2H9V2H7Zm-2 8h14v10H5V10Z" />
                </svg>
                <span>
                  {fmtDate(ev.startDate)}
                  {ev.endDate && ev.endDate !== ev.startDate ? ` — ${fmtDate(ev.endDate)}` : ""}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <svg width="18" height="18" viewBox="0 0 24 24" className="text-emerald-600 flex-shrink-0">
                  <path fill="currentColor" d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3Zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3Zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5Zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5Z" />
                </svg>
                <span>
                  {data.participantCount} peserta terdaftar di {races.length || 1} jenis ·{" "}
                  {types.reduce((n, t) => n + t.categories.length, 0)} kategori
                </span>
              </div>
              <Link
                href={`/live/orienteering/${ev.id}`}
                className="sm:ml-auto inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-sm font-semibold shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all"
              >
                {status.live && <span className="w-2 h-2 rounded-full bg-white animate-pulse" />}
                Lihat Live Result →
              </Link>
            </div>
          </div>
        )}

        {/* Jenis + Type Event */}
        {!loading && !errMsg && ev && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm ring-1 ring-gray-200/70">
              <h3 className="text-base font-semibold text-gray-900 mb-4">Jenis Orienteering</h3>
              <div className="space-y-2.5">
                {races.map((r) => (
                  <div key={r.id} className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50/60 ring-1 ring-emerald-100">
                    <span className="w-9 h-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center flex-none">
                      <CompassIcon className="w-5 h-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-gray-900">{r.name}</div>
                      <div className="text-xs text-gray-500 truncate">📍 {r.location || "-"}</div>
                    </div>
                    <span className="text-sm text-gray-600 flex-none">
                      <b className="text-gray-900">{r.participantCount}</b> peserta
                    </span>
                  </div>
                ))}
                {!races.length && <p className="text-sm text-gray-500">Belum ada jenis.</p>}
              </div>
            </div>

            <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm ring-1 ring-gray-200/70">
              <h3 className="text-base font-semibold text-gray-900 mb-4">Type Event &amp; Kategori</h3>
              <div className="space-y-2.5">
                {types.map((t) => (
                  <div
                    key={t.id}
                    className={`p-3 rounded-xl ring-1 ${isWre(t.name) ? "bg-amber-50/60 ring-amber-100" : "bg-sky-50/60 ring-sky-100"}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          isWre(t.name) ? "bg-amber-100 text-amber-800" : "bg-sky-100 text-sky-800"
                        }`}
                      >
                        {t.name}
                      </span>
                      <span className="text-xs text-gray-500">
                        <b className="text-gray-900 text-sm">{t.participants}</b> peserta · {t.categories.length} kategori
                      </span>
                    </div>
                    {/* Rincian per jenis — 1 blok per "Dipertandingkan di". Fallback
                        ke tampilan gabungan kalau API lama belum kirim raceBreakdown. */}
                    {Array.isArray(t.raceBreakdown) && t.raceBreakdown.length ? (
                      <div className="mt-2 space-y-2">
                        {t.raceBreakdown.map((rb) => (
                          <div key={rb.raceId} className="rounded-lg bg-white/70 ring-1 ring-black/5 px-2.5 py-2">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[11px] text-gray-500">
                                Dipertandingkan di: <b className="font-semibold text-gray-800">{rb.raceName}</b>
                              </span>
                              <span className="text-[11px] text-gray-500 whitespace-nowrap">
                                <b className="text-gray-900">{rb.participants}</b> peserta
                              </span>
                            </div>
                            {rb.categories.length > 0 && (
                              <div className="mt-1.5 flex flex-wrap gap-1.5">
                                {rb.categories.map((c) => (
                                  <button
                                    key={c.id}
                                    type="button"
                                    onClick={() => {
                                      setRaceId(rb.raceId);
                                      setTypeId(t.id);
                                      setClassId(c.id);
                                    }}
                                    title={`Tampilkan peserta ${c.name} di ${rb.raceName}`}
                                    className="px-2 py-0.5 rounded-md text-xs font-semibold bg-white ring-1 ring-gray-200 text-gray-700 hover:ring-emerald-400 transition"
                                  >
                                    {c.name} <b className="text-emerald-700">{c.participants}</b>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <>
                        <div className="mt-1 text-[11px] text-gray-500">Dipertandingkan di: {t.raceNames.join(" & ") || "-"}</div>
                        {t.categories.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {t.categories.map((c) => (
                              <button
                                key={c.id}
                                type="button"
                                onClick={() => {
                                  setTypeId(t.id);
                                  setClassId(c.id);
                                }}
                                title="Tampilkan peserta kategori ini"
                                className="px-2 py-0.5 rounded-md text-xs font-semibold bg-white ring-1 ring-gray-200 text-gray-700 hover:ring-emerald-400 transition"
                              >
                                {c.name} <b className="text-emerald-700">{c.participants}</b>
                              </button>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ))}
                {!types.length && <p className="text-sm text-gray-500">Belum ada Type Event.</p>}
              </div>
            </div>
          </div>
        )}

        {/* Filter */}
        {!loading && !errMsg && ev && (
          <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm ring-1 ring-gray-200/70">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <svg width="18" height="18" viewBox="0 0 24 24" className="text-emerald-600">
                  <path fill="currentColor" d="M4 4h16v2.17a2 2 0 0 1-.59 1.42L14 13v7l-4-2v-5L4.59 7.59A2 2 0 0 1 4 6.17V4Z" />
                </svg>
                Filter Peserta
                {activeFilterCount > 0 && (
                  <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-emerald-600 text-white text-[11px] font-bold">
                    {activeFilterCount}
                  </span>
                )}
              </h3>
              {activeFilterCount > 0 && (
                <button type="button" onClick={resetFilters} className="text-xs font-medium text-gray-500 hover:text-red-500 transition-colors">
                  Reset Filter
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="lg:col-span-1">
                <label className="block text-[11px] uppercase tracking-wider text-gray-400 font-semibold mb-1.5">Cari</label>
                <input
                  type="search"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Nama, club, BIB…"
                  className={selectClass}
                />
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-wider text-gray-400 font-semibold mb-1.5">Jenis</label>
                <select value={raceId} onChange={(e) => setRaceId(e.target.value)} className={selectClass}>
                  <option value="">Semua Jenis</option>
                  {races.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-wider text-gray-400 font-semibold mb-1.5">Type Event</label>
                <select value={typeId} onChange={(e) => setTypeId(e.target.value)} className={selectClass}>
                  <option value="">Semua Type Event</option>
                  {types.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-wider text-gray-400 font-semibold mb-1.5">Kategori</label>
                <select value={classId} onChange={(e) => setClassId(e.target.value)} className={selectClass}>
                  <option value="">Semua Kategori</option>
                  {classOptions.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-wider text-gray-400 font-semibold mb-1.5">Negara</label>
                <select value={nationality} onChange={(e) => setNationality(e.target.value)} className={selectClass}>
                  <option value="">Semua Negara</option>
                  {nationalityOptions.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Daftar Peserta */}
        {!loading && !errMsg && ev && (
          <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-200/70 overflow-hidden">
            <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-gray-100">
              <h3 className="text-base font-semibold text-gray-900">Daftar Peserta</h3>
              <span className="text-xs text-gray-400">
                Menampilkan {filtered.length} dari {participants.length} peserta
              </span>
            </div>

            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center py-16 px-4">
                <p className="text-sm font-medium text-gray-600">
                  {participants.length ? "Tidak ada peserta yang cocok" : "Belum ada peserta terdaftar"}
                </p>
                {activeFilterCount > 0 && (
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="mt-4 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors"
                  >
                    Reset Filter
                  </button>
                )}
              </div>
            ) : (
              <>
                {/* Desktop / tablet */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="bg-gradient-to-r from-emerald-700 to-teal-700">
                        {["No", "Nama", "BIB", "Kategori", "Jenis & Jadwal Start", "Club", "Negara"].map((h) => (
                          <th key={h} className="px-5 py-3 text-left font-semibold text-white/90 text-xs uppercase tracking-wider">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filtered.map((p, idx) => (
                        <tr key={p.key} className="hover:bg-emerald-50/50 transition-colors">
                          <td className="px-5 py-3.5 text-gray-500 font-medium">{idx + 1}</td>
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-2.5">
                              <span
                                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0"
                                style={{ background: avatarColor(p.name) }}
                              >
                                {initials(p.name)}
                              </span>
                              <span className="font-semibold text-gray-800">{p.name}</span>
                            </div>
                          </td>
                          <td className="px-5 py-3.5">
                            {p.bib ? (
                              <span className="inline-flex px-2 py-0.5 rounded-md bg-gray-100 text-gray-600 text-xs tabular-nums">{p.bib}</span>
                            ) : (
                              <span className="text-gray-300">-</span>
                            )}
                          </td>
                          <td className="px-5 py-3.5">
                            <div className="flex flex-wrap gap-1">
                              {p.categories.map((c) => (
                                <span
                                  key={c.id}
                                  title={c.typeName}
                                  className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                    isWre(c.typeName) ? "bg-amber-100 text-amber-800" : "bg-sky-100 text-sky-800"
                                  }`}
                                >
                                  {c.name}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="px-5 py-3.5">
                            <div className="flex flex-wrap gap-1">
                              {p.races.map((r) => (
                                <span key={r.raceId} className="inline-flex px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100 text-xs font-medium">
                                  {r.raceName}
                                  {r.start && <span className="ml-1 text-emerald-600/70 tabular-nums">{r.start}</span>}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="px-5 py-3.5 text-gray-600">{p.club || "-"}</td>
                          <td className="px-5 py-3.5 text-gray-600">
                            {p.nationality ? (
                              <span className="inline-flex items-center gap-2">
                                <CountryFlag nationality={p.nationality} size="md" />
                                {p.nationality}
                              </span>
                            ) : (
                              "-"
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile */}
                <ul className="md:hidden divide-y divide-gray-100">
                  {filtered.map((p) => (
                    <li key={p.key} className="px-4 py-3">
                      <div className="flex items-start gap-3">
                        <span
                          className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                          style={{ background: avatarColor(p.name) }}
                        >
                          {initials(p.name)}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold text-gray-900 flex items-center gap-1.5">
                            <CountryFlag nationality={p.nationality} />
                            {p.name}
                            {p.bib && <span className="ml-1.5 text-xs text-gray-400 font-normal">#{p.bib}</span>}
                          </div>
                          <div className="text-xs text-gray-500 truncate">{[p.club, p.nationality].filter(Boolean).join(" · ") || "-"}</div>
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            {p.categories.map((c) => (
                              <span
                                key={c.id}
                                className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                                  isWre(c.typeName) ? "bg-amber-100 text-amber-800" : "bg-sky-100 text-sky-800"
                                }`}
                              >
                                {c.name}
                              </span>
                            ))}
                            {p.races.map((r) => (
                              <span key={r.raceId} className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[11px] font-medium">
                                {r.raceName}
                                {r.start ? ` ${r.start}` : ""}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
