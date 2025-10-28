'use client'
import React, { useMemo, useState } from 'react'

const dummyHistories = [
  {
    id: 3,
    eventName: 'Sprint Kayak Cup 2024',
    level: 'Classification - A',
    date: '2024-12-15',
    location: 'Palembang, Sumatera Selatan',
    role: 'Timekeeper',
    result: 'Completed',
  },
  {
    id: 2,
    eventName: 'Down River Race National 2025',
    level: 'Classification - C',
    date: '2025-06-20',
    location: 'Citarum, Jawa Barat',
    role: 'Judge R1',
    result: 'Ongoing',
  },
  {
    id: 1,
    eventName: 'Slalom River Championship 2025',
    level: 'Classification - B',
    date: '2025-05-12',
    location: 'Bandung, Jawa Barat',
    role: 'Head Judge',
    result: 'Completed',
  },
]

// Format tanggal -> 15 Des 2025
function fmtDate(iso) {
  if (!iso) return '-'
  const d = new Date(iso)
  return d.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

// Badge status
function StatusPill({ value }) {
  const map = {
    Completed: 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200',
    Ongoing: 'bg-amber-100 text-amber-700 ring-1 ring-amber-200',
    Canceled: 'bg-rose-100 text-rose-700 ring-1 ring-rose-200',
  }
  const icon = {
    Completed: (
      <svg width="12" height="12" viewBox="0 0 24 24" className="mr-1.5">
        <path fill="currentColor" d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z" />
      </svg>
    ),
    Ongoing: (
      <svg width="12" height="12" viewBox="0 0 24 24" className="mr-1.5">
        <path fill="currentColor" d="M12 22a10 10 0 1 1 10-10a10 10 0 0 1-10 10m-.5-16h2v6h-2zm0 8h2v2h-2z" />
      </svg>
    ),
    Canceled: (
      <svg width="12" height="12" viewBox="0 0 24 24" className="mr-1.5">
        <path fill="currentColor" d="m12 10.585l4.95-4.95l1.415 1.414L13.415 12l4.95 4.95l-1.414 1.415L12 13.415l-4.95 4.95l-1.415-1.414L10.585 12l-4.95-4.95L7.05 5.636z" />
      </svg>
    ),
  }
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${map[value] || 'bg-gray-100 text-gray-700 ring-1 ring-gray-200'}`}>
      {icon[value] || null}
      {value}
    </span>
  )
}

// Badge role
function RolePill({ value }) {
  return (
    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-sts/10 text-stsDark ring-1 ring-sts/20">
      <svg width="12" height="12" viewBox="0 0 24 24" className="mr-1.5">
        <path fill="currentColor" d="M12 12a5 5 0 1 0-5-5a5 5 0 0 0 5 5m0 2c-4 0-8 2-8 6v1h16v-1c0-4-4-6-8-6" />
      </svg>
      {value}
    </span>
  )
}

export default function HistoriesJudges() {
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('All')

  const sorted = useMemo(
    () => [...dummyHistories].sort((a, b) => new Date(b.date) - new Date(a.date)),
    []
  )

  const filtered = useMemo(() => {
    const byStatus = status === 'All' ? sorted : sorted.filter(h => h.result === status)
    if (!q.trim()) return byStatus
    const k = q.toLowerCase()
    return byStatus.filter(h =>
      h.eventName.toLowerCase().includes(k) ||
      h.level.toLowerCase().includes(k) ||
      h.location.toLowerCase().includes(k) ||
      h.role.toLowerCase().includes(k)
    )
  }, [q, status, sorted])

  return (
    <section className="px-6 py-10">
      <div className="container m-auto max-w-6xl">
        <div className="mb-6 flex items-start md:items-center justify-between gap-4 flex-col md:flex-row">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Judges Activities History</h2>
            <p className="text-sm text-gray-500">Judges activity log from newest to oldest</p>
          </div>

          {/* Toolbar */}
          <div className="flex w-full md:w-auto items-center gap-2">
            <div className="relative flex-1 md:flex-none">
              <input
                value={q}
                onChange={e => setQ(e.target.value)}
                placeholder="Search by event, lokasi, role..."
                className="w-full md:w-72 pl-9 pr-3 py-2 rounded-lg ring-1 ring-gray-300 focus:ring-2 focus:ring-stsHighlight outline-none bg-white"
              />
              <svg width="18" height="18" viewBox="0 0 24 24" className="absolute left-3 top-2.5 text-gray-400">
                <path fill="currentColor" d="m21 21l-4.35-4.35M10 18a8 8 0 1 1 0-16a8 8 0 0 1 0 16m0-2a6 6 0 1 0 0-12a6 6 0 0 0 0 12" />
              </svg>
            </div>

            <select
              value={status}
              onChange={e => setStatus(e.target.value)}
              className="px-3 py-2 rounded-lg ring-1 ring-gray-300 bg-white text-gray-700 focus:ring-2 focus:ring-stsHighlight outline-none cursor-pointer"
            >
              <option>All</option>
              <option>Completed</option>
              <option>Ongoing</option>
              <option>Canceled</option>
            </select>
          </div>
        </div>

        {/* Table */}
        {filtered.length === 0 ? (
          <div className="rounded-2xl bg-white ring-1 ring-gray-200 shadow-sm px-6 py-12 text-center">
            <div className="mx-auto mb-3 h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center">
              <svg width="22" height="22" viewBox="0 0 24 24" className="text-gray-400">
                <path fill="currentColor" d="M21 21H3V3h9v2H5v14h14v-7h2zM14 3h7v7h-7z" />
              </svg>
            </div>
            <p className="text-gray-700 font-semibold">Tidak ada data yang cocok</p>
            <p className="text-gray-500 text-sm">Coba ganti kata kunci atau filter status.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl ring-1 ring-gray-200 shadow-sm bg-white">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm text-gray-800">
                <thead className="bg-gray-50 text-gray-600 uppercase text-xs font-semibold sticky top-0 z-10">
                  <tr className="border-b border-gray-200">
                    <th className="px-6 py-3 text-left">Date</th>
                    <th className="px-6 py-3 text-left">Event</th>
                    <th className="px-6 py-3 text-left hidden lg:table-cell">Level</th>
                    <th className="px-6 py-3 text-left hidden md:table-cell">Location</th>
                    <th className="px-6 py-3 text-left">Role</th>
                    <th className="px-6 py-3 text-left">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map((item, idx) => (
                    <tr
                      key={item.id}
                      className={`
                        group transition-colors
                        ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/60'}
                        hover:bg-sts/5
                      `}
                    >
                      <td className="px-6 py-3 font-medium text-gray-900 whitespace-nowrap">{fmtDate(item.date)}</td>
                      <td className="px-6 py-3">
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 h-2 w-2 rounded-full bg-sts/70 group-hover:scale-110 transition-transform" />
                          <div>
                            <div className="font-semibold text-gray-900 leading-tight">{item.eventName}</div>
                            <div className="text-xs text-gray-500 md:hidden">{item.level}</div>
                            <div className="text-xs text-gray-500 md:hidden">{item.location}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-3 hidden lg:table-cell">{item.level}</td>
                      <td className="px-6 py-3 hidden md:table-cell">{item.location}</td>
                      <td className="px-6 py-3"><RolePill value={item.role} /></td>
                      <td className="px-6 py-3"><StatusPill value={item.result} /></td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-white">
                  <tr>
                    <td colSpan={6} className="px-6 py-4">
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>Total: {filtered.length} activities</span>
                        <span className="inline-flex items-center gap-1">
                          <span className="h-2 w-2 rounded-full bg-sts/70" /> recent first
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