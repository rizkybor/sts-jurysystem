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

// Badge jumlah aktivitas — "Belum Ada" abu-abu kalau juri belum pernah
// mencatat penalty/fouls apa pun di event ini, biru kalau sudah ada.
function ActivityPill({ total }) {
  if (!total) {
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-500 ring-1 ring-gray-200">
        Belum Ada Aktivitas
      </span>
    )
  }
  return (
    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-sts/10 text-stsDark ring-1 ring-sts/20">
      <svg width="12" height="12" viewBox="0 0 24 24" className="mr-1.5">
        <path fill="currentColor" d="M12 22a10 10 0 1 1 10-10a10 10 0 0 1-10 10m-.5-16h2v6h-2zm0 8h2v2h-2z" />
      </svg>
      {total} Tindakan
    </span>
  )
}

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
        (r.event?.location || '').toLowerCase().includes(k)
    )
  }, [q, activityFilter, sorted])

  return (
    <section className="px-6 py-10">
      <div className="container m-auto max-w-6xl">
        <div className="mb-6 flex items-start md:items-center justify-between gap-4 flex-col md:flex-row">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Judges Activities History</h2>
            <p className="text-sm text-gray-500">
              Ringkasan penalty &amp; Fouls Report yang sudah Anda catat, per event
            </p>
          </div>

          {/* Toolbar */}
          <div className="flex w-full md:w-auto items-center gap-2">
            <div className="relative flex-1 md:flex-none">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Cari nama event atau lokasi..."
                className="w-full md:w-72 pl-9 pr-3 py-2 rounded-lg ring-1 ring-gray-300 focus:ring-2 focus:ring-stsHighlight outline-none bg-white"
              />
              <svg width="18" height="18" viewBox="0 0 24 24" className="absolute left-3 top-2.5 text-gray-400">
                <path fill="currentColor" d="m21 21l-4.35-4.35M10 18a8 8 0 1 1 0-16a8 8 0 0 1 0 16m0-2a6 6 0 1 0 0-12a6 6 0 0 0 0 12" />
              </svg>
            </div>

            <select
              value={activityFilter}
              onChange={(e) => setActivityFilter(e.target.value)}
              className="px-3 py-2 rounded-lg ring-1 ring-gray-300 bg-white text-gray-700 focus:ring-2 focus:ring-stsHighlight outline-none cursor-pointer"
            >
              <option value="All">Semua</option>
              <option value="hasActivity">Sudah Ada Aktivitas</option>
              <option value="noActivity">Belum Ada Aktivitas</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="rounded-2xl bg-white ring-1 ring-gray-200 shadow-sm px-6 py-12 text-center text-gray-500">
            Memuat riwayat…
          </div>
        ) : error ? (
          <div className="rounded-2xl bg-white ring-1 ring-gray-200 shadow-sm px-6 py-12 text-center text-red-600">
            {error}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl bg-white ring-1 ring-gray-200 shadow-sm px-6 py-12 text-center">
            <div className="mx-auto mb-3 h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center">
              <svg width="22" height="22" viewBox="0 0 24 24" className="text-gray-400">
                <path fill="currentColor" d="M21 21H3V3h9v2H5v14h14v-7h2zM14 3h7v7h-7z" />
              </svg>
            </div>
            <p className="text-gray-700 font-semibold">Tidak ada data yang cocok</p>
            <p className="text-gray-500 text-sm">Coba ganti kata kunci atau filter.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl ring-1 ring-gray-200 shadow-sm bg-white">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm text-gray-800">
                <thead className="bg-gray-50 text-gray-600 uppercase text-xs font-semibold sticky top-0 z-10">
                  <tr className="border-b border-gray-200">
                    <th className="px-6 py-3 text-left">Tanggal</th>
                    <th className="px-6 py-3 text-left">Event</th>
                    <th className="px-6 py-3 text-left hidden md:table-cell">Lokasi</th>
                    <th className="px-6 py-3 text-left">Aktivitas Saya</th>
                    <th className="px-6 py-3 text-left">&nbsp;</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map(({ event, totalPenalty, totalFouls }, idx) => (
                    <tr
                      key={event._id}
                      className={`
                        group transition-colors
                        ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/60'}
                        hover:bg-sts/5
                      `}
                    >
                      <td className="px-6 py-3 font-medium text-gray-900 whitespace-nowrap">
                        {fmtDate(event.startDateEvent)}
                      </td>
                      <td className="px-6 py-3">
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 h-2 w-2 rounded-full bg-sts/70 group-hover:scale-110 transition-transform" />
                          <div>
                            <div className="font-semibold text-gray-900 leading-tight">
                              {event.eventName}
                            </div>
                            <div className="text-xs text-gray-500 md:hidden">
                              {event.location}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-3 hidden md:table-cell">{event.location || '-'}</td>
                      <td className="px-6 py-3">
                        <ActivityPill total={totalPenalty + totalFouls} />
                      </td>
                      <td className="px-6 py-3 text-right">
                        <Link
                          href={`/judges/history?eventId=${event._id}${
                            user?._id ? `&userId=${user._id}` : ''
                          }`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-stsDark bg-sts/10 hover:bg-sts/20 transition"
                        >
                          Lihat Detail
                          <svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 0 1 0-1.06L11.94 8l-4.73-4.71a.75.75 0 1 1 1.06-1.06l5.25 5.25a.75.75 0 0 1 0 1.06l-5.25 5.25a.75.75 0 0 1-1.06 0Z" clipRule="evenodd" />
                          </svg>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-white">
                  <tr>
                    <td colSpan={5} className="px-6 py-4">
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>Total: {filtered.length} event</span>
                        <span className="inline-flex items-center gap-1">
                          <span className="h-2 w-2 rounded-full bg-sts/70" /> terbaru dulu
                        </span>
                      </div>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
