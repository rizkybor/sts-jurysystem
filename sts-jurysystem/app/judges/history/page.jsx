"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import useEventDetail from "@/hooks/judges/useEventDetail";
import JudgeTopBar from "@/components/judges/JudgeTopBar";
import { penaltyBadgeColor } from "@/components/judges/JudgeHistoryModal";

// Label kategori (eventType) yang enak dibaca — dipakai badge & judul.
const CATEGORY_LABEL = {
  SPRINT: "Sprint",
  SLALOM: "Slalom",
  H2H: "Head to Head",
  DRR: "Down River Race",
  RX: "Rafting Cross",
};

const CATEGORY_BADGE_COLOR = {
  SPRINT: "bg-sts/10 text-stsDark ring-sts/20",
  SLALOM: "bg-cyan-100 text-cyan-700 ring-cyan-200",
  H2H: "bg-indigo-100 text-indigo-700 ring-indigo-200",
  DRR: "bg-amber-100 text-amber-700 ring-amber-200",
  RX: "bg-rose-100 text-rose-700 ring-rose-200",
};

// "Task" tindakan (position/operationType) -> label enak dibaca, sama pola
// humanizer yang dipakai JudgeActionHistoryModal.vue di sts-timingsystem
// (spasi sebelum huruf besar/angka, title-case).
function humanizeTask(raw) {
  if (!raw) return "";
  const spaced = String(raw)
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([a-zA-Z])([0-9])/g, "$1 $2")
    .replace(/_/g, " ")
    .trim();
  return spaced.replace(/\b\w/g, (c) => c.toUpperCase());
}

function actionLabel(item) {
  if (item.activityType === "fouls") {
    return item.positionLabel
      ? `Fouls — ${humanizeTask(item.positionLabel)}`
      : "Fouls Report";
  }
  const task =
    item.position ||
    item.operationType ||
    (item.eventType === "DRR" && item.section ? `Section ${item.section}` : "") ||
    (item.gateNumber ? `Gate ${item.gateNumber}` : "");
  return humanizeTask(task) || "Penalty";
}

function formatTime(v) {
  if (!v) return "-";
  const d = new Date(v);
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const ActivityIcon = ({ isFouls }) =>
  isFouls ? (
    <svg viewBox="0 0 24 24" className="h-6 w-6">
      <path
        fill="currentColor"
        d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm1 15h-2v-2h2Zm0-4h-2V7h2Z"
      />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" className="h-6 w-6">
      <path
        fill="currentColor"
        d="M6 2a1 1 0 0 0-1 1v18h2v-6h9l-1-4 1-4H7V3a1 1 0 0 0-1-1Z"
      />
    </svg>
  );

const JudgeActivityHistoryPage = () => {
  const searchParams = useSearchParams();
  const eventId = searchParams.get("eventId");
  const userId = searchParams.get("userId");

  const { eventDetail, loadingEvent } = useEventDetail(eventId);

  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // Filter kategori — "ALL" atau salah satu key CATEGORY_LABEL. Fouls
  // Report cuma ada di H2H, jadi filter "ALL" tetap menampilkan keduanya.
  const [categoryFilter, setCategoryFilter] = useState("ALL");

  const backHref = eventId
    ? `/judges?eventId=${eventId}${userId ? `&userId=${userId}` : ""}`
    : "/judges";

  const fetchHistory = useCallback(async () => {
    if (!eventId) return;
    setLoading(true);
    setError(null);
    try {
      const url = new URL("/api/judges/activity-history", window.location.origin);
      url.searchParams.set("eventId", eventId);
      url.searchParams.set("page", String(page));
      url.searchParams.set("limit", "30");
      const res = await fetch(url.toString(), { cache: "no-store" });
      const json = await res.json();
      if (res.ok && json?.success) {
        setItems(Array.isArray(json.data) ? json.data : []);
        setMeta(json.meta || null);
      } else {
        setItems([]);
        setError(json?.message || "Gagal memuat riwayat aktivitas");
      }
    } catch (err) {
      console.error("❌ Fetch activity history error:", err);
      setItems([]);
      setError("Gagal memuat riwayat aktivitas");
    } finally {
      setLoading(false);
    }
  }, [eventId, page]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const filteredItems = useMemo(() => {
    if (categoryFilter === "ALL") return items;
    return items.filter((it) => it.eventType === categoryFilter);
  }, [items, categoryFilter]);

  const availableCategories = useMemo(() => {
    const set = new Set(items.map((it) => it.eventType).filter(Boolean));
    return Object.keys(CATEGORY_LABEL).filter((k) => set.has(k));
  }, [items]);

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      <JudgeTopBar
        backHref={backHref}
        raceLabel="Riwayat Aktivitas Saya"
        eventDetail={eventDetail}
        loadingEvent={loadingEvent}
      />

      <div className="max-w-2xl mx-auto px-4 pt-4 space-y-4">
        {/* Ringkasan */}
        {meta && (
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-4">
              <div className="text-2xl font-extrabold text-gray-900">
                {meta.totalPenalty}
              </div>
              <div className="text-xs text-gray-500 mt-1">Penalty Diberikan</div>
            </div>
            <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-4">
              <div className="text-2xl font-extrabold text-gray-900">
                {meta.totalFouls}
              </div>
              <div className="text-xs text-gray-500 mt-1">Fouls Dilaporkan</div>
            </div>
          </div>
        )}

        {/* Filter kategori */}
        {availableCategories.length > 1 && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setCategoryFilter("ALL")}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${
                categoryFilter === "ALL"
                  ? "bg-sts text-white"
                  : "bg-white border border-gray-200 text-gray-600"
              }`}
            >
              Semua
            </button>
            {availableCategories.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${
                  categoryFilter === cat
                    ? "bg-sts text-white"
                    : "bg-white border border-gray-200 text-gray-600"
                }`}
              >
                {CATEGORY_LABEL[cat] || cat}
              </button>
            ))}
          </div>
        )}

        {/* Daftar aktivitas */}
        <div className="rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden">
          {loading ? (
            <p className="text-center text-gray-500 py-10">Memuat riwayat…</p>
          ) : error ? (
            <p className="text-center text-red-600 py-10">{error}</p>
          ) : !filteredItems.length ? (
            <p className="text-center text-gray-500 py-10">
              Belum ada aktivitas (penalty/fouls) yang Anda catat di event ini.
            </p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {filteredItems.map((item) => {
                const isFouls = item.activityType === "fouls";
                const penaltyVal = isFouls
                  ? item.penaltySecondsLabel
                  : item.penalty;
                const isDQ =
                  typeof penaltyVal === "string" &&
                  penaltyVal.toUpperCase() === "DQ";
                return (
                  <li key={item._id} className="flex items-start gap-3 p-4">
                    <div
                      className={`grid place-items-center h-11 w-11 rounded-xl ring shrink-0 ${
                        isFouls
                          ? "bg-amber-50 text-amber-600 ring-amber-200"
                          : penaltyBadgeColor(isDQ ? 999 : penaltyVal)
                      }`}
                    >
                      <ActivityIcon isFouls={isFouls} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ring-1 ${
                            CATEGORY_BADGE_COLOR[item.eventType] ||
                            "bg-gray-100 text-gray-600 ring-gray-200"
                          }`}
                        >
                          {CATEGORY_LABEL[item.eventType] || item.eventType}
                        </span>
                        <span className="font-semibold text-gray-900">
                          {actionLabel(item)}
                        </span>
                        {!isFouls && (
                          <span className="text-xs font-bold text-gray-500">
                            {Number(penaltyVal ?? 0)} pts
                          </span>
                        )}
                        {isFouls && penaltyVal !== null && penaltyVal !== undefined && (
                          <span className="text-xs font-bold text-gray-500">
                            {isDQ ? "DQ" : `${penaltyVal}s`}
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-600 mt-0.5">
                        {item.teamInfo?.nameTeam || "Team"}
                        {item.teamInfo?.bibTeam
                          ? ` (BIB ${item.teamInfo.bibTeam})`
                          : ""}
                        {isFouls && item.unfoulTeamInfo?.nameTeam
                          ? ` vs ${item.unfoulTeamInfo.nameTeam}`
                          : ""}
                      </div>
                      {(item.roundName || item.runNumber) && (
                        <div className="text-xs text-gray-400 mt-0.5">
                          {item.roundName
                            ? `Babak: ${item.roundName}`
                            : item.runNumber
                            ? `Run ${item.runNumber}`
                            : ""}
                        </div>
                      )}
                      {item.remarks && (
                        <div className="text-xs text-gray-500 mt-1 italic">
                          "{item.remarks}"
                        </div>
                      )}
                    </div>
                    <div className="text-xs text-gray-400 whitespace-nowrap shrink-0">
                      {formatTime(item.createdAt)}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Pagination sederhana */}
        {meta && meta.totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 disabled:opacity-40"
            >
              Sebelumnya
            </button>
            <span className="text-xs text-gray-500">
              Halaman {meta.page} / {meta.totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
              disabled={page >= meta.totalPages}
              className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 disabled:opacity-40"
            >
              Berikutnya
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default JudgeActivityHistoryPage;
