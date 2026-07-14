"use client";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useEffect, useMemo, useState, useRef } from "react";
import { motion } from "framer-motion";
import getSocket from "@/utils/socket";

const DEFAULT_IMG = "/images/logo-dummy.png";

const CATEGORY_TABS = [
  { label: "Sprint", code: "SPRINT" },
  { label: "Head To Head", code: "H2H" },
  { label: "Slalom", code: "SLALOM" },
  { label: "DRR", code: "DRR" },
  { label: "Rafting Cross", code: "RX" },
  { label: "Overall", code: "OVERALL" },
];

// Kolom yang relevan per kategori — H2H/RX/Overall hanya punya score+rank
// (waktu resmi per-heat/round bukan domain "hasil akhir"), Sprint/DRR/Slalom
// berbasis waktu.
const CATEGORY_COLUMNS = {
  SPRINT: ["time", "penalty", "rank"],
  DRR: ["time", "penalty", "rank"],
  SLALOM: ["time", "rank"],
  H2H: ["score", "rank"],
  RX: ["score", "rank"],
  OVERALL: ["score", "rank"],
};

const POLL_INTERVAL_MS = 20000;

export default function EventDetailPage() {
  const { id } = useParams(); // "/live/[id]"

  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errMsg, setErrMsg] = useState(null);
  const abortRef = useRef(null);

  const [activeCategory, setActiveCategory] = useState("SPRINT");
  const [selectedBucket, setSelectedBucket] = useState("");

  const [results, setResults] = useState({ teams: [], updatedAt: null });
  const [loadingResults, setLoadingResults] = useState(false);
  const [resultsError, setResultsError] = useState(null);

  const [toasts, setToasts] = useState([]);
  const toastId = useRef(1);
  const socketRef = useRef(null);

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
          categoriesInitial: data.categoriesInitial || [],
          categoriesDivision: data.categoriesDivision || [],
          categoriesRace: data.categoriesRace || [],
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

  // Auto-pilih bucket pertama begitu tersedia
  useEffect(() => {
    if (!selectedBucket && bucketOptions.length) {
      setSelectedBucket(bucketOptions[0].value);
    }
  }, [bucketOptions, selectedBucket]);

  const activeBucket = useMemo(
    () => bucketOptions.find((b) => b.value === selectedBucket) || null,
    [bucketOptions, selectedBucket]
  );

  const fetchResults = async () => {
    if (!id || !activeCategory) return;
    if (activeCategory !== "OVERALL" && !activeBucket) return;

    setLoadingResults(true);
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
        setResults({ teams: data.teams || [], updatedAt: data.updatedAt });
      } else {
        setResultsError(data.message || "Gagal memuat hasil");
      }
    } catch (err) {
      setResultsError(err.message || "Gagal memuat hasil");
    } finally {
      setLoadingResults(false);
    }
  };

  // Fetch ulang tiap kali kategori/bucket berubah
  useEffect(() => {
    fetchResults();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, activeCategory, activeBucket?.value]);

  // Polling ringan (jaga-jaga di luar event socket)
  useEffect(() => {
    const timer = setInterval(() => {
      fetchResults();
    }, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, activeCategory, activeBucket?.value]);

  // Realtime socket: refetch instan begitu timingsystem menyimpan hasil
  useEffect(() => {
    const socket = getSocket();
    socketRef.current = socket;

    const handler = (msg) => {
      if (!msg || msg.type !== "results:updated") return;
      if (String(msg.eventId || "") !== String(id)) return;
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

  return (
    <section className="min-h-screen bg-gray-100 py-6 px-4 sm:px-6 lg:px-8">
      {/* Toasts */}
      <div className="fixed top-6 right-6 z-50 flex flex-col gap-3">
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ x: 200, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 200, opacity: 0 }}
            className="p-3 rounded-xl shadow-lg border border-green-300 bg-white/90 backdrop-blur-xl text-green-800"
          >
            <p className="font-semibold text-sm">{toast.title}</p>
            <p className="text-xs opacity-90">{toast.text}</p>
          </motion.div>
        ))}
      </div>

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

        {/* Bucket selector: Initial - Division - Race */}
        {!loading && !errMsg && event && (
          <div className="bg-white shadow-md rounded-lg p-4 mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Kategori Lomba (Initial - Division - Race)
            </label>
            {bucketOptions.length ? (
              <select
                value={selectedBucket}
                onChange={(e) => setSelectedBucket(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-sts/40 focus:border-sts transition"
              >
                {bucketOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            ) : (
              <p className="text-gray-500 text-sm">
                Belum ada kategori lomba untuk event ini.
              </p>
            )}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 sm:gap-4 overflow-x-auto scrollbar-hide mb-6">
          {CATEGORY_TABS.map((tab) => (
            <button
              key={tab.code}
              onClick={() => setActiveCategory(tab.code)}
              className={`flex-shrink-0 min-h-[44px] px-3 sm:px-4 py-2 rounded-md text-sm sm:text-base ${
                activeCategory === tab.code
                  ? "bg-blue-500 text-white"
                  : "bg-gray-200 text-gray-700"
              } whitespace-nowrap`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Updated-at info */}
        {results.updatedAt && (
          <p className="text-xs text-gray-500 mb-2">
            Terakhir diperbarui:{" "}
            {new Date(results.updatedAt).toLocaleString("id-ID")}
          </p>
        )}

        {/* Result Table */}
        <div className="overflow-x-auto">
          {loadingResults ? (
            <div className="bg-white shadow rounded-lg p-10 text-center text-gray-500">
              Memuat hasil…
            </div>
          ) : resultsError ? (
            <div className="bg-red-50 border border-red-200 text-red-700 shadow rounded-lg p-4">
              {resultsError}
            </div>
          ) : results.teams.length === 0 ? (
            <div className="bg-white shadow rounded-lg p-10 text-center text-gray-500">
              Belum ada hasil untuk kategori/bucket ini.
            </div>
          ) : (
            <table className="min-w-full bg-white shadow-md rounded-lg">
              <thead className="bg-gray-200">
                <tr>
                  <th className="py-2 px-3 sm:px-4 text-xs sm:text-sm">No</th>
                  <th className="py-2 px-3 sm:px-4 text-xs sm:text-sm">
                    Nama Team
                  </th>
                  <th className="py-2 px-3 sm:px-4 text-xs sm:text-sm">BIB</th>
                  {columns.includes("time") && (
                    <th className="py-2 px-3 sm:px-4 text-xs sm:text-sm">
                      Total Time
                    </th>
                  )}
                  {columns.includes("penalty") && (
                    <th className="py-2 px-3 sm:px-4 text-xs sm:text-sm">
                      Penalty
                    </th>
                  )}
                  {columns.includes("score") && (
                    <th className="py-2 px-3 sm:px-4 text-xs sm:text-sm">
                      Score
                    </th>
                  )}
                  {columns.includes("rank") && (
                    <th className="py-2 px-3 sm:px-4 text-xs sm:text-sm">
                      Ranked
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {results.teams.map((r) => (
                  <tr key={`${r.bib}-${r.no}`} className="text-center">
                    <td className="py-2 px-3 sm:px-4 text-xs sm:text-sm">
                      {r.no}
                    </td>
                    <td className="py-2 px-3 sm:px-4 text-xs sm:text-sm">
                      {r.name}
                    </td>
                    <td className="py-2 px-3 sm:px-4 text-xs sm:text-sm">
                      {r.bib}
                    </td>
                    {columns.includes("time") && (
                      <td className="py-2 px-3 sm:px-4 text-xs sm:text-sm">
                        {r.totalTime || "-"}
                      </td>
                    )}
                    {columns.includes("penalty") && (
                      <td className="py-2 px-3 sm:px-4 text-xs sm:text-sm">
                        {r.penaltyTime || "-"}
                      </td>
                    )}
                    {columns.includes("score") && (
                      <td className="py-2 px-3 sm:px-4 text-xs sm:text-sm">
                        {r.score ?? "-"}
                      </td>
                    )}
                    {columns.includes("rank") && (
                      <td className="py-2 px-3 sm:px-4 text-xs sm:text-sm font-bold">
                        {r.rank ?? "-"}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </section>
  );
}
