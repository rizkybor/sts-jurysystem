import mongoose from "mongoose";
import connectDB from "@/config/database";

export const dynamic = "force-dynamic";

const VALID_CATEGORIES = ["SPRINT", "SLALOM", "DRR", "H2H", "RX", "OVERALL"];

// Format waktu timingsystem: "HH:MM:SS.mmm" (string, sortable secara leksikografis
// selama panjangnya konsisten) — dipakai sebagai fallback sort kalau `ranked`
// belum terisi.
function timeToMs(str) {
  if (!str || typeof str !== "string") return Infinity;
  const [h = "0", m = "0", rest = "0.000"] = str.split(":");
  const [s = "0", ms = "0"] = String(rest).split(".");
  const n =
    Number(h) * 3600000 + Number(m) * 60000 + Number(s) * 1000 + Number(ms);
  return Number.isFinite(n) ? n : Infinity;
}

function sortAndNumber(teams, { by = "rank" } = {}) {
  const sorted = [...teams].sort((a, b) => {
    if (by === "time") {
      return timeToMs(a.totalTime) - timeToMs(b.totalTime);
    }
    if (by === "score") {
      return (b.score ?? -Infinity) - (a.score ?? -Infinity);
    }
    const ra = a.rank && a.rank > 0 ? a.rank : Infinity;
    const rb = b.rank && b.rank > 0 ? b.rank : Infinity;
    if (ra !== rb) return ra - rb;
    return timeToMs(a.totalTime) - timeToMs(b.totalTime);
  });
  return sorted.map((t, idx) => ({ ...t, no: idx + 1 }));
}

// --- mapper per kategori: dokumen timingsystem -> bentuk seragam frontend ---

function mapSprintOrDrr(doc) {
  const rows = Array.isArray(doc?.result) ? doc.result : [];
  const teams = rows.map((t) => ({
    name: t?.nameTeam || "-",
    bib: t?.bibTeam || "-",
    totalTime: t?.result?.totalTime || null,
    penaltyTime: t?.result?.totalPenaltyTime || t?.result?.penaltyTime || null,
    score: Number.isFinite(t?.result?.score) ? t.result.score : null,
    rank: Number.isFinite(t?.result?.ranked) ? t.result.ranked : null,
  }));
  const hasRank = teams.some((t) => t.rank > 0);
  return sortAndNumber(teams, { by: hasRank ? "rank" : "time" });
}

function mapSlalom(doc) {
  const rows = Array.isArray(doc?.teams) ? doc.teams : [];
  const teams = rows.map((t) => ({
    name: t?.nameTeam || "-",
    bib: t?.bibTeam || "-",
    totalTime: t?.bestTime || null,
    penaltyTime: null,
    score: Number.isFinite(t?.score) ? t.score : null,
    rank: Number.isFinite(t?.ranked) ? t.ranked : null,
  }));
  const hasRank = teams.some((t) => t.rank > 0);
  return sortAndNumber(teams, { by: hasRank ? "rank" : "time" });
}

// H2H & RX sama-sama disimpan lewat pola "overallRows" (h2h_overall / rx_overall)
function mapOverallRows(doc) {
  const rows = Array.isArray(doc?.overallRows) ? doc.overallRows : [];
  const teams = rows.map((r) => ({
    name: r?.name || r?.nameTeam || r?.teamName || "-",
    bib: r?.bib || r?.bibTeam || "-",
    totalTime: null,
    penaltyTime: null,
    score: Number.isFinite(r?.score) ? r.score : null,
    rank: Number.isFinite(r?.ranked ?? r?.rank) ? r.ranked ?? r.rank : null,
  }));
  const hasRank = teams.some((t) => t.rank > 0);
  return sortAndNumber(teams, { by: hasRank ? "rank" : "score" });
}

function mapOverall(doc) {
  const rows = Array.isArray(doc?.eventResult) ? doc.eventResult : [];
  const teams = rows.map((r) => ({
    name: r?.teamName || "-",
    bib: r?.bib || "-",
    totalTime: null,
    penaltyTime: null,
    score: Number.isFinite(r?.totalScore) ? r.totalScore : null,
    rank: null,
  }));
  return sortAndNumber(teams, { by: "score" });
}

export const GET = async (req, { params }) => {
  try {
    await connectDB();
    const { eventId } = await params;

    const { searchParams } = new URL(req.url);
    const category = (searchParams.get("category") || "").toUpperCase();
    const initialId = searchParams.get("initialId") || "";
    const divisionId = searchParams.get("divisionId") || "";
    const raceId = searchParams.get("raceId") || "";
    const raceName = searchParams.get("raceName") || "";

    if (!eventId || !VALID_CATEGORIES.includes(category)) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "eventId dan category (valid) wajib diisi",
        }),
        { status: 400 }
      );
    }
    if (category !== "OVERALL" && (!initialId || !divisionId || !raceId)) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "initialId, divisionId, raceId wajib diisi untuk kategori ini",
        }),
        { status: 400 }
      );
    }

    const db = mongoose.connection.db;
    let doc = null;
    let teams = [];

    if (category === "SPRINT") {
      doc = await db
        .collection("temporarySprintResult")
        .findOne({ eventId, initialId, divisionId, raceId });
      teams = mapSprintOrDrr(doc);
    } else if (category === "DRR") {
      doc = await db
        .collection("temporaryDrrResult")
        .findOne({ eventId, initialId, divisionId, raceId });
      teams = mapSprintOrDrr(doc);
    } else if (category === "SLALOM") {
      doc = await db
        .collection("temporarySlalomResult")
        .findOne({ eventId, initialId, divisionId, raceId });
      teams = mapSlalom(doc);
    } else if (category === "H2H") {
      const key = [eventId, initialId, raceId, divisionId].join("|");
      doc = await db.collection("h2h_overall").findOne({ key });
      teams = mapOverallRows(doc);
    } else if (category === "RX") {
      const key = [eventId, initialId, raceId, divisionId].join("|");
      doc = await db.collection("rx_overall").findOne({ key });
      teams = mapOverallRows(doc);
    } else if (category === "OVERALL") {
      const filter = { eventId };
      if (initialId) filter.initialId = initialId;
      if (divisionId) filter.divisionId = divisionId;
      if (raceName) filter.raceName = raceName;
      doc = await db
        .collection("temporaryOverallEventResults")
        .findOne(filter, { sort: { updatedAt: -1 } });
      teams = mapOverall(doc);
    }

    return new Response(
      JSON.stringify({
        success: true,
        category,
        updatedAt: doc?.updatedAt || doc?.savedAt || null,
        teams,
      }),
      { status: 200 }
    );
  } catch (err) {
    console.error("❌ [GET /api/events/[eventId]/live-results]", err);
    return new Response(
      JSON.stringify({
        success: false,
        message: "Failed to fetch live results",
        error: err.message,
      }),
      { status: 500 }
    );
  }
};
