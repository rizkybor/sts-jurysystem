import mongoose from "mongoose";
import connectDB from "@/config/database";
import SprintLivePreview from "@/models/SprintLivePreview";

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

// Urutkan lalu pastikan SETIAP tim punya nomor rank yang bisa ditampilkan —
// pakai `rank` resmi dari timingsystem kalau operator sudah menetapkannya
// (mis. lewat tombol "Sort Ranked"/simpan hasil), tapi kalau belum (masih
// berjalan live), fallback ke posisi hasil sorting saat ini supaya
// penonton tetap tahu peringkat tim per kelas, bukan cuma tampil "-".
// `rankIsFinal` menandai mana yang resmi vs live-provisional.
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
  return sorted.map((t, idx) => {
    const hasOfficialRank = Number.isFinite(t.rank) && t.rank > 0;
    return {
      ...t,
      rank: hasOfficialRank ? t.rank : idx + 1,
      rankIsFinal: hasOfficialRank,
    };
  });
}

// --- mapper per kategori: dokumen timingsystem -> bentuk seragam frontend ---

// Sprint dapat mapper detail sendiri supaya semua field mentah dari
// insertResultEventByCategories.js normalizeResultObj()
// (startTime/finishTime/startPenalty/finishPenalty/raceTime/penaltyTime/
// totalTime/ranked/score) bisa ditampilkan apa adanya di Live Result,
// bukan cuma ringkasan totalTime/penaltyTime/score/rank generik.
// `previewDocs` = SprintLivePreview (lihat models/SprintLivePreview.js) —
// tim yang GENUINELY sudah selesai (Start+Finish terisi) di timing
// system tapi BELUM ter-"Save Result" ke `temporarySprintResult`. Baris
// hasil resmi (dari `doc`) SELALU diprioritaskan; preview cuma dipakai
// utk tim yang belum punya baris resmi sama sekali, supaya Live Result
// benar-benar reaktif per-tim, tidak menunggu Save Result operator.
function mapSprint(doc, previewDocs) {
  const rows = Array.isArray(doc?.result) ? doc.result : [];
  const officialBibs = new Set(rows.map((t) => String(t?.bibTeam || "")));

  const teams = rows.map((t) => {
    const r = t?.result || {};
    return {
      name: t?.nameTeam || "-",
      bib: t?.bibTeam || "-",
      startTime: r.startTime || null,
      finishTime: r.finishTime || null,
      raceTime: r.raceTime || null,
      startPenalty: Number.isFinite(r.startPenalty) ? r.startPenalty : null,
      finishPenalty: Number.isFinite(r.finishPenalty) ? r.finishPenalty : null,
      penaltyTime: r.totalPenaltyTime || r.penaltyTime || null,
      totalTime: r.totalTime || null, // "Result" (race time + penalty time)
      score: Number.isFinite(r.score) ? r.score : null,
      rank: Number.isFinite(r.ranked) ? r.ranked : null,
      // BUG FIX: dulu tidak ada di whitelist ini — status DNF/DNS/DSQ (di-set
      // via markFlag() di SprintRace.vue, timingsystem) jadi tidak pernah
      // sampai ke Live Result, walau sudah benar tersimpan di DB.
      flag: r.flag || null,
    };
  });

  (previewDocs || []).forEach((p) => {
    const bib = String(p?.bibTeam || "");
    if (bib && officialBibs.has(bib)) return; // hasil resmi menang
    teams.push({
      name: p?.nameTeam || "-",
      bib: p?.bibTeam || "-",
      startTime: p?.startTime || null,
      finishTime: p?.finishTime || null,
      raceTime: p?.raceTime || null,
      startPenalty: Number.isFinite(p?.startPenalty) ? p.startPenalty : null,
      finishPenalty: Number.isFinite(p?.finishPenalty) ? p.finishPenalty : null,
      penaltyTime: p?.penaltyTime || null,
      totalTime: p?.totalTime || null,
      score: null,
      rank: null, // belum resmi -> selalu fallback ke urutan waktu
      isLivePreview: true,
    });
  });

  const hasRank = teams.some((t) => t.rank > 0);
  return sortAndNumber(teams, { by: hasRank ? "rank" : "time" });
}

// DRR versi detail — field mentah dari normalizeResult() di
// insertResultEventByCategories.js (startPenalty/sectionPenalty/
// finishPenalty/totalPenalty/totalPenaltyTime/startTime/finishTime/
// raceTime/totalTime/ranked/score), bukan cuma ringkasan totalTime/score.
function mapDrrDetailed(doc) {
  const rows = Array.isArray(doc?.result) ? doc.result : [];
  const teams = rows.map((t) => {
    const r = t?.result || {};
    return {
      name: t?.nameTeam || "-",
      bib: t?.bibTeam || "-",
      startPenalty: Number.isFinite(r.startPenalty) ? r.startPenalty : null,
      sectionPenalty: Number.isFinite(r.sectionPenalty) ? r.sectionPenalty : null,
      finishPenalty: Number.isFinite(r.finishPenalty) ? r.finishPenalty : null,
      totalPenalty: Number.isFinite(r.totalPenalty) ? r.totalPenalty : null,
      penaltyTime: r.totalPenaltyTime || r.penaltyTime || null,
      startTime: r.startTime || null,
      finishTime: r.finishTime || null,
      raceTime: r.raceTime || null,
      totalTime: r.totalTime || null, // "Result"
      score: Number.isFinite(r.score) ? r.score : null,
      rank: Number.isFinite(r.ranked) ? r.ranked : null,
      // BUG FIX: sama pola dgn mapSprint() — dulu tidak dibawa, status
      // DNF/DNS/DSQ (markFlag() di DownRiverRace.vue) tidak pernah tampil.
      flag: r.flag || null,
    };
  });
  const hasRank = teams.some((t) => t.rank > 0);
  return sortAndNumber(teams, { by: hasRank ? "rank" : "time" });
}

// Slalom versi detail ("result: All") — satu tim bisa punya beberapa Run
// (result[] di insertResultEventByCategories.js normRun()), jadi tiap tim
// bawa sub-array `runs` lengkap dengan rincian penalty per run; ranked/
// score tetap level tim (dipakai buat urutan lewat sortAndNumber).
function mapSlalomDetailed(doc) {
  const rows = Array.isArray(doc?.teams) ? doc.teams : [];
  const teams = rows.map((t) => {
    const runsRaw = Array.isArray(t?.result) ? t.result : [];
    const runs = runsRaw.map((r, idx) => {
      const pt = r?.penaltyTotal || {};
      // Array mentah per-gate (bukan cuma sum) — supaya Live Result bisa
      // menampilkan rincian tiap gate, sama seperti tabel S/1..N/F di
      // Result page timingsystem (SlalomResult.vue), bukan cuma total.
      const gates = Array.isArray(pt.gates)
        ? pt.gates.map((g) => Number(g) || 0)
        : [];
      const gatePenalty = gates.reduce((sum, g) => sum + g, 0);
      const startPenalty = Number.isFinite(pt.start) ? pt.start : 0;
      const finishPenalty = Number.isFinite(pt.finish) ? pt.finish : 0;
      return {
        runNo: idx + 1,
        startPenalty,
        finishPenalty,
        gatePenalty,
        gates,
        totalPenalty: Number.isFinite(r?.penalty)
          ? r.penalty
          : startPenalty + finishPenalty + gatePenalty,
        penaltyTime: r?.penaltyTime || null,
        startTime: r?.startTime || null,
        finishTime: r?.finishTime || null,
        raceTime: r?.raceTime || null,
        totalTime: r?.totalTime || null, // "Result" per run
        // BUG FIX: sama pola dgn mapSprint()/mapDrrDetailed() — dulu tidak
        // dibawa, status DNF/DNS/DSQ PER RUN (markFlag() di SlalomRace.vue,
        // independen per Run 1/Run 2) tidak pernah tampil.
        flag: r?.flag || null,
      };
    });
    return {
      name: t?.nameTeam || "-",
      bib: t?.bibTeam || "-",
      totalTime: t?.bestTime || null, // dipakai sortAndNumber fallback-by-time
      score: Number.isFinite(t?.score) ? t.score : null,
      rank: Number.isFinite(t?.ranked) ? t.ranked : null,
      runs,
    };
  });
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

// Overall versi detail — reproduksi persis buildBucketRows() di
// sts-timingsystem (views/Result/EventOverallResult.vue), yang jadi
// sumber tabel "Print Result Overall": tiap tim punya `categories[]`
// mentah ({name, scored, rankedByCats}), dipecah jadi kolom Score/Rank
// per kategori, Total Score dihitung ulang dari situ (bukan percaya
// t.totalScore mentah), tim yang semua kategorinya nol (rank<=0 di semua)
// dibuang, lalu di-rank ulang: total desc -> best individual rank asc ->
// nama. Sengaja TIDAK mereplikasi cross-check "masih terdaftar di
// TeamsRegistered" milik timingsystem (perlu 5 query registrasi tambahan
// per bucket) — hasilnya identik selama data overall belum basi karena
// tim baru saja dihapus dari suatu kategori.
function pickCategory(byName, keys) {
  for (const k of keys) {
    if (byName[k]) return byName[k];
  }
  return { score: 0, rank: 0 };
}

function mapOverallDetailed(doc) {
  const rows = Array.isArray(doc?.eventResult) ? doc.eventResult : [];

  const built = rows.map((t) => {
    const cats = Array.isArray(t?.categories) ? t.categories : [];
    const byName = {};
    cats.forEach((c) => {
      const nm = String(c?.name || "").toUpperCase();
      byName[nm] = {
        score: Number(c?.scored) || 0,
        rank: Number(c?.rankedByCats) || 0,
      };
    });

    const sprint = pickCategory(byName, ["SPRINT"]);
    const h2h = pickCategory(byName, ["HEADTOHEAD", "HEAD TO HEAD", "H2H"]);
    const slalom = pickCategory(byName, ["SLALOM"]);
    const drr = pickCategory(byName, ["DRR", "DOWN RIVER RACE"]);
    const rx = pickCategory(byName, ["RX", "RAFTING CROSS"]);

    const totalScore =
      sprint.score + h2h.score + slalom.score + drr.score + rx.score;
    const hasAnyValidDiscipline =
      sprint.rank > 0 || h2h.rank > 0 || slalom.rank > 0 || drr.rank > 0 || rx.rank > 0;

    return {
      name: t?.teamName || "-",
      bib: t?.bib || "-",
      sprintScore: sprint.score,
      sprintRank: sprint.rank,
      h2hScore: h2h.score,
      h2hRank: h2h.rank,
      slalomScore: slalom.score,
      slalomRank: slalom.rank,
      drrScore: drr.score,
      drrRank: drr.rank,
      rxScore: rx.score,
      rxRank: rx.rank,
      totalScore,
      hasAnyValidDiscipline,
    };
  });

  const visible = built.filter((r) => r.hasAnyValidDiscipline);

  visible.sort((a, b) => {
    if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
    const bestOf = (r) =>
      Math.min(
        r.sprintRank || Infinity,
        r.h2hRank || Infinity,
        r.slalomRank || Infinity,
        r.drrRank || Infinity,
        r.rxRank || Infinity
      );
    const aBest = bestOf(a);
    const bBest = bestOf(b);
    if (aBest !== bBest) return aBest - bBest;
    return String(a.name || "").localeCompare(String(b.name || ""));
  });

  return visible.map((r, idx) => ({
    ...r,
    rank: idx + 1,
    rankIsFinal: true,
  }));
}

// Bracket H2H (pohon Round -> Match) utk tampilan publik Live Result,
// mirror data yang sudah tersimpan di `h2h_brackets` (ditulis
// upsertBracket() di sts-timingsystem) — DIGABUNG dgn `h2h_results`
// (waktu/penalty/Win-Lose per babak per tim, ditulis upsertRoundRows()/
// upsertAllRounds()) supaya tiap kotak match di bracket bisa menampilkan
// hasil pertandingannya, bukan cuma nama tim & pemenang.
//
// Kedua koleksi di-scope oleh key yang SAMA persis:
// `[eventId, initialId, raceId, divisionId].join("|")` — lihat
// makeKey() di app/src/controllers/INSERT/upsertHeadToHead.js
// (sts-timingsystem). Join hasil ke match dilakukan via roundId+nama
// tim+BIB (h2h_results TIDAK punya teamId, cuma nameTeam/bibTeam —
// sama seperti bracket.rounds[].matches[].team1/team2).
async function buildH2HBracket(db, key) {
  const [bracketDoc, resultRows] = await Promise.all([
    db.collection("h2h_brackets").findOne({ key }),
    db.collection("h2h_results").find({ key }).toArray(),
  ]);

  if (!bracketDoc) return null;

  const resultByRoundTeam = new Map();
  resultRows.forEach((r) => {
    const rk = `${String(r.roundId || "")}|${String(
      r.nameTeam || ""
    ).toUpperCase()}|${String(r.bibTeam || "")}`;
    resultByRoundTeam.set(rk, r.result || null);
  });

  const attachResult = (roundId, team) => {
    if (!team || !team.name) return team;
    const rk = `${String(roundId || "")}|${String(
      team.name || ""
    ).toUpperCase()}|${String(team.bibTeam || "")}`;
    return { ...team, result: resultByRoundTeam.get(rk) || null };
  };

  const rounds = (bracketDoc.rounds || []).map((r) => ({
    id: r.id,
    name: r.name,
    bronze: !!r.bronze,
    size: r.size,
    matches: (r.matches || []).map((m) => ({
      heat: m.heat != null ? m.heat : null,
      bye: !!m.bye,
      team1: attachResult(r.id, m.team1),
      team2: attachResult(r.id, m.team2),
      winner: m.winner || null,
    })),
  }));

  return { rounds, showBronze: !!bracketDoc.showBronze };
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
    let latestPreviewAt = null;
    let bracket = null;

    if (category === "SPRINT") {
      doc = await db
        .collection("temporarySprintResult")
        .findOne({ eventId, initialId, divisionId, raceId });
      // Gabungkan dgn pratinjau tim yang genuinely selesai tapi belum
      // ter-Save Result (lihat models/SprintLivePreview.js) — Live Result
      // jadi reaktif per-tim, bukan cuma saat bulk Save Result.
      // BUG FIX: initialId sebelumnya tidak ikut filter — SENIOR/U23/
      // JUNIOR berbagi raceId+divisionId yang sama (cuma beda initialId),
      // jadi preview tim dari initial lain ikut ke-merge ke tab ini.
      const previewDocs = await SprintLivePreview.find({
        eventId,
        initialId,
        raceId,
        divisionId,
      }).lean();
      teams = mapSprint(doc, previewDocs);
      if (previewDocs.length) {
        latestPreviewAt = previewDocs.reduce((max, p) => {
          const t = p?.updatedAt ? new Date(p.updatedAt).getTime() : 0;
          return t > max ? t : max;
        }, 0);
      }
    } else if (category === "DRR") {
      doc = await db
        .collection("temporaryDrrResult")
        .findOne({ eventId, initialId, divisionId, raceId });
      teams = mapDrrDetailed(doc);
    } else if (category === "SLALOM") {
      doc = await db
        .collection("temporarySlalomResult")
        .findOne({ eventId, initialId, divisionId, raceId });
      teams = mapSlalomDetailed(doc);
    } else if (category === "H2H") {
      const key = [eventId, initialId, raceId, divisionId].join("|");
      doc = await db.collection("h2h_overall").findOne({ key });
      teams = mapOverallRows(doc);
      bracket = await buildH2HBracket(db, key);
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
      teams = mapOverallDetailed(doc);
    }

    // BUG FIX: `updatedAt` dipakai client (LiveEventDetail.jsx) buat
    // deteksi "ada perubahan -> animasikan" — kalau cuma preview yang
    // berubah (tim baru finish, belum di-Save), timestamp official doc
    // tidak berubah sama sekali. Bandingkan keduanya, pakai yang
    // terbaru.
    const officialAt = doc?.updatedAt || doc?.savedAt || null;
    const officialMs = officialAt ? new Date(officialAt).getTime() : 0;
    const combinedUpdatedAt =
      latestPreviewAt && latestPreviewAt > officialMs
        ? new Date(latestPreviewAt).toISOString()
        : officialAt;

    return new Response(
      JSON.stringify({
        success: true,
        category,
        updatedAt: combinedUpdatedAt,
        teams,
        ...(category === "H2H" ? { bracket } : {}),
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
