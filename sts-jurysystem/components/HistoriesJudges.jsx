'use client'
import Link from 'next/link'
import React, { useEffect, useMemo, useState } from 'react'

// Format tanggal -> 15 Des 2025
function fmtDate(iso) {
  if (!iso) return '-'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return '-'
  return d.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

// Blok tanggal ringkas (hari besar + bulan/tahun) utk kolom kiri baris.
function DateBlock({ iso }) {
  const d = iso ? new Date(iso) : null
  const valid = d && !isNaN(d.getTime())
  return (
    <div className="w-14 shrink-0 rounded-xl border border-slate-200 bg-slate-50 text-center py-1.5">
      <div className="text-lg font-bold text-slate-900 leading-tight tabular-nums">
        {valid ? d.toLocaleDateString('id-ID', { day: '2-digit' }) : '–'}
      </div>
      <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
        {valid ? d.toLocaleDateString('id-ID', { month: 'short', year: '2-digit' }) : ''}
      </div>
    </div>
  )
}

// Lokasi event — field `location` tidak ada di model Event, yang ada
// riverName/addressCity (sama pola dgn halaman /judges).
function eventLocation(ev) {
  return (
    [ev?.riverName, ev?.addressCity].filter(Boolean).join(', ') ||
    ev?.location ||
    ''
  )
}

function Metric({ value, label, tone }) {
  const tones = {
    sts: 'text-stsDark',
    amber: 'text-amber-600',
    muted: 'text-slate-300',
  }
  return (
    <div className="text-center min-w-[64px]">
      <div className={`text-lg font-bold tabular-nums leading-tight ${tones[tone] || tones.sts}`}>
        {value}
      </div>
      <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </div>
    </div>
  )
}

function StatTile({ value, label }) {
  return (
    <div className="rounded-2xl bg-white border border-slate-200 shadow-sm px-4 py-3">
      <div className="text-2xl font-bold text-slate-900 tabular-nums">{value}</div>
      <div className="text-xs text-slate-500 font-medium">{label}</div>
    </div>
  )
}

const FILTERS = [
  { key: 'All', label: 'Semua' },
  { key: 'hasActivity', label: 'Ada Aktivitas' },
  { key: 'noActivity', label: 'Belum Ada' },
]

export default function HistoriesJudges() {
  const [user, setUser] = useState(null)
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [q, setQ] = useState('')
  // "All" | "hasActivity" | "noActivity"
  const [activityFilter, setActivityFilter] = useState('All')

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        setError(null)
        // 1) Event yang judge ini ikut ditugaskan (sama sumber dgn
        //    halaman /judges) — dari sini kita tahu SEMUA event yang
        //    relevan utk ditampilkan riwayatnya.
        const judgesRes = await fetch('/api/judges', { cache: 'no-store' })
        if (!judgesRes.ok) throw new Error(`Gagal memuat data judges: ${judgesRes.status}`)
        const judgesData = await judgesRes.json()
        if (cancelled) return
        setUser(judgesData.user)
        const events = Array.isArray(judgesData.events) ? judgesData.events : []

        // 2) Untuk TIAP event, tarik ringkasan jumlah penalty+fouls yang
        //    SUDAH dicatat juri ini di event tsb — lewat endpoint yang
        //    sama dipakai halaman detail (/judges/history), cukup
        //    limit=1 (data detailnya tidak dipakai di sini, cuma
        //    meta.totalPenalty/totalFouls yang dihitung dari SELURUH
        //    hasil sebelum di-slice halaman).
        const summaries = await Promise.all(
          events.map(async (ev) => {
            try {
              const res = await fetch(
                `/api/judges/activity-history?eventId=${ev._id}&limit=1`,
                { cache: 'no-store' }
              )
              const json = await res.json()
              const meta = res.ok && json?.success ? json.meta : null
              return {
                event: ev,
                totalPenalty: meta?.totalPenalty || 0,
                totalFouls: meta?.totalFouls || 0,
              }
            } catch {
              return { event: ev, totalPenalty: 0, totalFouls: 0 }
            }
          })
        )
        if (cancelled) return
        setRows(summaries)
      } catch (e) {
        console.error('❌ HistoriesJudges load error:', e)
        if (!cancelled) setError(e.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  const sorted = useMemo(() => {
    const arr = [...rows]
    return arr.sort((a, b) => {
      const da = new Date(a.event?.startDateEvent || 0)
      const db = new Date(b.event?.startDateEvent || 0)
      return db - da
    })
  }, [rows])

  const filtered = useMemo(() => {
    let list = sorted
    if (activityFilter === 'hasActivity') {
      list = list.filter((r) => r.totalPenalty + r.totalFouls > 0)
    } else if (activityFilter === 'noActivity') {
      list = list.filter((r) => r.totalPenalty + r.totalFouls === 0)
    }
    if (!q.trim()) return list
    const k = q.toLowerCase()
    return list.filter(
      (r) =>
        (r.event?.eventName || '').toLowerCase().includes(k) ||
        eventLocation(r.event).toLowerCase().includes(k)
    )
  }, [q, activityFilter, sorted])

  const totals = useMemo(
    () =>
      rows.reduce(
        (acc, r) => {
          acc.penalty += r.totalPenalty
          acc.fouls += r.totalFouls
          if (r.totalPenalty + r.totalFouls > 0) acc.active += 1
          return acc
        },
        { penalty: 0, fouls: 0, active: 0 }
      ),
    [rows]
  )

  return (
    <section className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 md:px-6 lg:px-8 py-6 md:py-8">
          <div className="flex items-center gap-3">
            <Link
              href="/profile"
              aria-label="Kembali ke Profile"
              title="Kembali ke Profile"
              className="shrink-0 inline-flex items-center justify-center h-10 w-10 md:h-11 md:w-11 rounded-xl border border-slate-200 text-stsDark hover:bg-sts/10 hover:border-sts/30 transition"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                <path fillRule="evenodd" d="M17 10a.75.75 0 0 1-.75.75H5.612l4.158 3.96a.75.75 0 1 1-1.04 1.08l-5.5-5.25a.75.75 0 0 1 0-1.08l5.5-5.25a.75.75 0 1 1 1.04 1.08L5.612 9.25H16.25A.75.75 0 0 1 17 10Z" clipRule="evenodd" />
              </svg>
            </Link>
            <div className="min-w-0">
              <h1 className="text-xl md:text-2xl font-bold text-slate-900 truncate">
                Judges Activities History
              </h1>
              <p className="text-sm text-slate-500">
                Ringkasan penalty &amp; Fouls Report yang sudah Anda catat, per event
              </p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatTile value={loading ? '–' : rows.length} label="Event Ditugaskan" />
            <StatTile value={loading ? '–' : totals.active} label="Event dgn Aktivitas" />
            <StatTile value={loading ? '–' : totals.penalty} label="Total Penalty" />
            <StatTile value={loading ? '–' : totals.fouls} label="Total Fouls" />
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 md:px-6 lg:px-8 py-5 md:py-6 space-y-4">
        {/* Toolbar */}
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          <div className="relative flex-1">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Cari nama event atau lokasi..."
              className="w-full h-11 pl-10 pr-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sts/30 focus:border-sts transition"
            />
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
              <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z" clipRule="evenodd" />
            </svg>
          </div>

          <div role="tablist" className="inline-flex p-1 rounded-xl bg-slate-200/60 self-start md:self-auto">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                role="tab"
                aria-selected={activityFilter === f.key}
                onClick={() => setActivityFilter(f.key)}
                className={`px-3.5 h-9 rounded-lg text-sm font-medium whitespace-nowrap transition ${
                  activityFilter === f.key
                    ? 'bg-white text-stsDark shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-[76px] rounded-2xl bg-white border border-slate-200 animate-pulse" />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-2xl bg-red-50 border border-red-200 px-6 py-10 text-center text-red-700">
            {error}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl bg-white border border-dashed border-slate-300 px-6 py-12 text-center">
            <div className="mx-auto mb-3 h-12 w-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400">
              <svg width="22" height="22" viewBox="0 0 24 24">
                <path fill="currentColor" d="M21 21H3V3h9v2H5v14h14v-7h2zM14 3h7v7h-7z" />
              </svg>
            </div>
            <p className="text-slate-800 font-semibold">Tidak ada data yang cocok</p>
            <p className="text-slate-500 text-sm">Coba ganti kata kunci atau filter.</p>
          </div>
        ) : (
          <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
            <div className="hidden md:grid grid-cols-[minmax(0,1fr)_auto_140px] gap-4 px-5 py-2.5 border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              <span>Event</span>
              <span className="w-[144px] text-center">Aktivitas Saya</span>
              <span />
            </div>
            <ul className="divide-y divide-slate-100">
              {filtered.map(({ event, totalPenalty, totalFouls }) => {
                const total = totalPenalty + totalFouls
                const location = eventLocation(event)
                return (
                  <li
                    key={event._id}
                    className="px-4 md:px-5 py-4 flex flex-col md:grid md:grid-cols-[minmax(0,1fr)_auto_140px] md:items-center gap-3 md:gap-4 hover:bg-slate-50/70 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <DateBlock iso={event.startDateEvent} />
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-900 leading-snug line-clamp-2">
                          {event.eventName}
                        </div>
                        <div className="mt-0.5 text-xs text-slate-500 truncate">
                          {fmtDate(event.startDateEvent)}
                          {location ? ` · ${location}` : ''}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between md:justify-center gap-3">
                      {total ? (
                        <div className="flex items-center divide-x divide-slate-200 rounded-xl border border-slate-200 bg-white py-1.5">
                          <Metric value={totalPenalty} label="Penalty" tone="sts" />
                          <Metric value={totalFouls} label="Fouls" tone={totalFouls ? 'amber' : 'muted'} />
                        </div>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-500">
                          Belum Ada Aktivitas
                        </span>
                      )}
                    </div>

                    <Link
                      href={`/judges/history?eventId=${event._id}${
                        user?._id ? `&userId=${user._id}` : ''
                      }`}
                      className="inline-flex items-center justify-center gap-1.5 h-10 px-4 rounded-xl border border-slate-200 text-sm font-semibold text-stsDark hover:bg-sts/5 hover:border-sts/30 transition"
                    >
                      Lihat Detail
                      <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 0 1 0-1.06L11.94 8l-4.73-4.71a.75.75 0 1 1 1.06-1.06l5.25 5.25a.75.75 0 0 1 0 1.06l-5.25 5.25a.75.75 0 0 1-1.06 0Z" clipRule="evenodd" />
                      </svg>
                    </Link>
                  </li>
                )
              })}
            </ul>
            <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 bg-slate-50 text-xs text-slate-500">
              <span>Total: {filtered.length} event</span>
              <span>Terbaru lebih dulu</span>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
