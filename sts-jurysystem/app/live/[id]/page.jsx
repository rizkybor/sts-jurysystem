"use client";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useEffect, useState, useRef } from "react";

const DEFAULT_IMG = "/images/logo-dummy.png";

export default function EventDetailPage() {
  const { id } = useParams();               // "/live/[id]"
  const [event, setEvent] = useState(null); // data event by id
  const [loading, setLoading] = useState(true);
  const [errMsg, setErrMsg] = useState(null);
  const abortRef = useRef(null);

  const [activeTab, setActiveTab] = useState("Sprint");
  const tabs = ["Sprint", "Head To Head", "Slalom", "DRR", "Overall"];

  // (sementara) hasil dummy — nanti bisa ganti ke API hasil perlombaan
  const dummyResults = [
    { no: 1, team: "Team A", bib: "101", time: "02:15", rank: 1 },
    { no: 2, team: "Team B", bib: "102", time: "02:45", rank: 2 },
  ];

  useEffect(() => {
    if (!id) return;

    // batalkan request sebelumnya kalau id berubah
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

        // --- normalisasi sesuai payload kamu ---
        // contoh payload di screenshot punya field: id, _id, eventName, levelName, participant (array), startDateEvent, endDateEvent, addressCity, addressProvince
        const normalized = {
          id: String(data.id ?? data._id ?? id),
          name: data.eventName ?? "Untitled",
          levelName: data.levelName ?? "-",
          participantCount: Array.isArray(data.participant) ? data.participant.length : 0,
          startDate: data.startDateEvent ?? null,
          endDate: data.endDateEvent ?? null,
          city: data.addressCity ?? "",
          province: data.addressProvince ?? "",
          image: DEFAULT_IMG, // belum ada foto → pakai default lokal
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

  return (
    <section className="min-h-screen bg-gray-100 py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl sm:text-3xl font-bold">📊 Live Result</h1>
          <Link
            href="/live"
            className="text-sm px-3 py-2 rounded-md bg-gray-200 hover:bg-gray-300"
          >
            ← Back
          </Link>
        </div>

        {/* Loading / Error */}
        {loading && (
          <div className="bg-white shadow rounded-lg p-6 mb-6">Loading…</div>
        )}
        {errMsg && (
          <div className="bg-red-50 border border-red-200 text-red-700 shadow rounded-lg p-4 mb-6">
            {errMsg}
          </div>
        )}

        {/* Event Info */}
        {!loading && !errMsg && event && (
          <div className="bg-white shadow-md rounded-lg p-4 sm:p-6 mb-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <img
                src={event.image}
                alt={event.name}
                className="w-full sm:w-64 h-40 object-contain bg-gray-50 rounded-md"
              />
              <div className="flex-1">
                <h2 className="text-lg sm:text-2xl font-semibold mb-1">
                  {event.name}
                </h2>
                <p className="text-sm sm:text-base">
                  Level: <span className="font-medium">{event.levelName}</span>
                </p>
                <p className="text-sm sm:text-base">
                  Location:{" "}
                  <span className="font-medium">
                    {event.city}
                    {event.city && event.province ? ", " : ""}
                    {event.province}
                  </span>
                </p>
                <p className="text-sm sm:text-base">
                  Dates:{" "}
                  <span className="font-medium">
                    {event.startDate || "-"} — {event.endDate || "-"}
                  </span>
                </p>
                <p className="text-sm sm:text-base">
                  Total Participants:{" "}
                  <span className="font-medium">{event.participantCount}</span>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 sm:gap-4 overflow-x-auto scrollbar-hide mb-6">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-shrink-0 px-3 sm:px-4 py-2 rounded-md text-sm sm:text-base ${
                activeTab === tab
                  ? "bg-blue-500 text-white"
                  : "bg-gray-200 text-gray-700"
              } whitespace-nowrap`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Result Table (masih dummy) */}
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white shadow-md rounded-lg">
            <thead className="bg-gray-200">
              <tr>
                <th className="py-2 px-3 sm:px-4 text-xs sm:text-sm">No</th>
                <th className="py-2 px-3 sm:px-4 text-xs sm:text-sm">Nama Team</th>
                <th className="py-2 px-3 sm:px-4 text-xs sm:text-sm">BIB</th>
                <th className="py-2 px-3 sm:px-4 text-xs sm:text-sm">Total Time</th>
                <th className="py-2 px-3 sm:px-4 text-xs sm:text-sm">Ranked</th>
              </tr>
            </thead>
            <tbody>
              {dummyResults.map((r) => (
                <tr key={r.no} className="text-center">
                  <td className="py-2 px-3 sm:px-4 text-xs sm:text-sm">{r.no}</td>
                  <td className="py-2 px-3 sm:px-4 text-xs sm:text-sm">{r.team}</td>
                  <td className="py-2 px-3 sm:px-4 text-xs sm:text-sm">{r.bib}</td>
                  <td className="py-2 px-3 sm:px-4 text-xs sm:text-sm">{r.time}</td>
                  <td className="py-2 px-3 sm:px-4 text-xs sm:text-sm font-bold">
                    {r.rank}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}