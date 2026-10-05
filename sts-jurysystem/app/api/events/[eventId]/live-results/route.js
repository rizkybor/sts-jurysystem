import mongoose from "mongoose";
import connectDB from "@/config/database";
import SprintLivePreview from "@/models/SprintLivePreview";
import DrrLivePreview from "@/models/DrrLivePreview";
import SlalomLivePreview from "@/models/SlalomLivePreview";
import H2HLivePreview from "@/models/H2HLivePreview";

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
function mapSprint(doc, previewDocs, rosterTeams) {
  // LIVE langkah demi langkah (bukan cuma saat Save Result):
  //  - rosterTeams  = semua tim terdaftar di bucket ini
  //                   (teamsRegisteredCollection) -> tim yg belum turun
  //                   tetap tampil "Belum Start".
  //  - doc          = hasil resmi (temporarySprintResult, ditulis saat
  //                   operator klik Save Result — fitur itu TETAP ada).
  //  - previewDocs  = live state per tim (sprintlivepreviews), ditulis
  //                   sts-timingsystem di SETIAP langkah input operator
  //                   (Start Time / PS / PF / Finish Time / flag / Reset —
  //                   lihat upsertSprintLiveState.js di timingsystem).
  // Live state yang LEBIH BARU dari hasil resmi menang (operator mengedit
  // lagi setelah Save Result); sebaliknya hasil resmi menang & ditandai
  // "Final".
  const rows = Array.isArray(doc?.result) ? doc.result : [];
  const officialAt = doc?.updatedAt || doc?.savedAt || null;
  const officialMs = officialAt ? new Date(officialAt).getTime() : 0;

  const byKey = new Map();
  const keyOf = (teamId, bib, name) =>
    teamId ? `id:${teamId}` : bib ? `bib:${bib}` : `name:${String(name || "").toUpperCase()}`;
  // Cari baris yg sudah ada via teamId ATAU bib (dokumen lama kadang tanpa teamId)
  const findKey = (teamId, bib) => {
    if (teamId && byKey.has(`id:${teamId}`)) return `id:${teamId}`;
    if (bib) {
      for (const [k, v] of byKey) if (v.bib === bib) return k;
    }
    return null;
  };

  const empty = {
    startTime: null,
    finishTime: null,
    raceTime: null,
    startPenalty: null,
    finishPenalty: null,
    penaltyTime: null,
    totalTime: null,
    score: null,
    officialRank: null,
    flag: null,
    isOfficial: false,
    isLivePreview: false,
  };

  (rosterTeams || []).forEach((t, idx) => {
    const teamId = String(t?.teamId || "");
    const bib = String(t?.bibTeam || "");
    byKey.set(keyOf(teamId, bib, t?.nameTeam), {
      ...empty,
      teamId,
      name: t?.nameTeam || "-",
      bib: bib || "-",
      order: Number(t?.startOrder) || idx + 1,
    });
  });

  rows.forEach((t, idx) => {
    const r = t?.result || {};
    const teamId = String(t?.teamId || "");
    const bib = String(t?.bibTeam || "");
    const k = findKey(teamId, bib) || keyOf(teamId, bib, t?.nameTeam);
    const base = byKey.get(k) || { ...empty, teamId, order: 1000 + idx };
    byKey.set(k, {
      ...base,
      name: t?.nameTeam || base.name || "-",
      bib: bib || base.bib || "-",
      startTime: r.startTime || null,
      finishTime: r.finishTime || null,
      raceTime: r.raceTime || null,
      startPenalty: Number.isFinite(r.startPenalty) ? r.startPenalty : null,
      finishPenalty: Number.isFinite(r.finishPenalty) ? r.finishPenalty : null,
      penaltyTime: r.totalPenaltyTime || r.penaltyTime || null,
      totalTime: r.totalTime || null,
      score: Number.isFinite(r.score) ? r.score : null,
      officialRank: Number.isFinite(r.ranked) ? r.ranked : null,
      // status DNF/DNS/DSQ (markFlag() di SprintRace.vue)
      flag: r.flag || null,
      isOfficial: true,
    });
  });

  (previewDocs || []).forEach((p, idx) => {
    const teamId = String(p?.teamId || "");
    const bib = String(p?.bibTeam || "");
    const k = findKey(teamId, bib) || keyOf(teamId, bib, p?.nameTeam);
    const base = byKey.get(k) || { ...empty, teamId, order: 2000 + idx };
    const previewMs = p?.updatedAt ? new Date(p.updatedAt).getTime() : 0;
    const officialHasData =
      base.isOfficial && (base.startTime || base.finishTime || base.flag);
    if (officialHasData && previewMs <= officialMs) return; // resmi lebih baru
    byKey.set(k, {
      ...base,
      name: p?.nameTeam || base.name || "-",
      bib: bib || base.bib || "-",
      startTime: p?.startTime || null,
      finishTime: p?.finishTime || null,
      raceTime: p?.raceTime || null,
      startPenalty: Number.isFinite(p?.startPenalty) ? p.startPenalty : null,
      finishPenalty: Number.isFinite(p?.finishPenalty) ? p.finishPenalty : null,
      penaltyTime: p?.penaltyTime || null,
      totalTime: p?.totalTime || null,
      score: null,
      officialRank: null,
      flag: p?.flag || null,
      isOfficial: false,
      isLivePreview: true,
    });
  });

  // Kondisi tim -> urutan tampil: Finish (by Result) -> On Course (by
  // start) -> Belum Start (urutan start) -> DNS/DNF/DSQ.
  const teams = [...byKey.values()].map((t) => {
    let condition = "NOT_STARTED";
    if (t.flag) condition = String(t.flag).toUpperCase();
    else if (t.startTime && t.finishTime && t.totalTime)
      condition = t.isOfficial ? "FINAL" : "FINISHED";
    else if (t.startTime) condition = "ON_COURSE";
    return { ...t, condition };
  });

  const groupOf = (c) =>
    c === "FINAL" || c === "FINISHED" ? 0 : c === "ON_COURSE" ? 1 : c === "NOT_STARTED" ? 2 : 3;
  teams.sort((a, b) => {
    const ga = groupOf(a.condition);
    const gb = groupOf(b.condition);
    if (ga !== gb) return ga - gb;
    if (ga === 0) {
      const d = timeToMs(a.totalTime) - timeToMs(b.totalTime);
      if (d !== 0) return d;
      return (a.officialRank || Infinity) - (b.officialRank || Infinity);
    }
    if (ga === 1) return timeToMs(a.startTime) - timeToMs(b.startTime);
    return (a.order || 0) - (b.order || 0);
  });

  // Peringkat LIVE: dihitung ulang dari Result (totalTime) setiap ada tim
  // finish — pemimpin sementara selalu di atas sampai semua tim selesai.
  let pos = 0;
  return teams.map((t) => {
    const finished = t.condition === "FINAL" || t.condition === "FINISHED";
    if (finished) pos += 1;
    return {
      ...t,
      rank: finished ? pos : null,
      rankIsFinal: finished && t.isOfficial,
    };
  });
}

// Ringkasan progres Sprint utk Live Result (X/Y tim selesai).
function sprintProgress(teams) {
  const out = { total: teams.length, finished: 0, onCourse: 0, notStarted: 0, flagged: 0 };
  teams.forEach((t) => {
    if (t.condition === "FINAL" || t.condition === "FINISHED") out.finished += 1;
    else if (t.condition === "ON_COURSE") out.onCourse += 1;
    else if (t.condition === "NOT_STARTED") out.notStarted += 1;
    else out.flagged += 1;
  });
  out.allDone = out.total > 0 && out.onCourse === 0 && out.notStarted === 0;
  return out;
}

// DRR versi detail — field mentah dari normalizeResult() di
// insertResultEventByCategories.js (startPenalty/sectionPenalty/
// finishPenalty/totalPenalty/totalPenaltyTime/startTime/finishTime/
// raceTime/totalTime/ranked/score), bukan cuma ringkasan totalTime/score.
// `previewDocs` = DrrLivePreview (lihat models/DrrLivePreview.js) — pola
// sama persis dgn mapSprint()'s previewDocs (SprintLivePreview).
function mapDrrDetailed(doc, previewDocs) {
  const rows = Array.isArray(doc?.result) ? doc.result : [];
  const officialBibs = new Set(rows.map((t) => String(t?.bibTeam || "")));

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

  (previewDocs || []).forEach((p) => {
    const bib = String(p?.bibTeam || "");
    if (bib && officialBibs.has(bib)) return; // hasil resmi menang
    teams.push({
      name: p?.nameTeam || "-",
      bib: p?.bibTeam || "-",
      startPenalty: Number.isFinite(p?.startPenalty) ? p.startPenalty : null,
      sectionPenalty: null,
      finishPenalty: Number.isFinite(p?.finishPenalty) ? p.finishPenalty : null,
      totalPenalty: null,
      penaltyTime: p?.penaltyTime || null,
      startTime: p?.startTime || null,
      finishTime: p?.finishTime || null,
      raceTime: p?.raceTime || null,
      totalTime: p?.totalTime || null,
      score: null,
      rank: null, // belum resmi -> selalu fallback ke urutan waktu
      isLivePreview: true,
    });
  });

  const hasRank = teams.some((t) => t.rank > 0);
  return sortAndNumber(teams, { by: hasRank ? "rank" : "time" });
}

// Slalom versi detail ("result: All") — satu tim bisa punya beberapa Run
// (result[] di insertResultEventByCategories.js normRun()), jadi tiap tim
// bawa sub-array `runs` lengkap dengan rincian penalty per run; ranked/
// score tetap level tim (dipakai buat urutan lewat sortAndNumber).
// `previewDocs` = SlalomLivePreview (lihat models/SlalomLivePreview.js) —
// pola sama dgn mapSprint(), TAPI cuma dipakai utk tim yang BELUM py baris
// resmi SAMA SEKALI (bukan per-run) — begitu tim itu ke-Save (bahkan
// Save Session 1 saja), baris resminya menang & preview run berikutnya
// menunggu Save lagi, sama spt kategori lain.
function mapSlalomDetailed(doc, previewDocs) {
  const rows = Array.isArray(doc?.teams) ? doc.teams : [];
  const officialBibs = new Set(rows.map((t) => String(t?.bibTeam || "")));
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

  // Kelompokkan preview per tim (teamId) — satu tim bisa punya sampai 2
  // baris preview (Run 1 & Run 2) yang perlu digabung jadi satu `runs[]`
  // sebelum dipush sbg 1 baris tim, sama bentuk dgn baris resmi di atas.
  const previewByTeam = new Map();
  (previewDocs || []).forEach((p) => {
    const bib = String(p?.bibTeam || "");
    if (bib && officialBibs.has(bib)) return; // tim ini sudah py baris resmi, preview diabaikan
    const key = String(p?.teamId || bib);
    if (!previewByTeam.has(key)) {
      previewByTeam.set(key, {
        name: p?.nameTeam || "-",
        bib: p?.bibTeam || "-",
        runs: [],
      });
    }
    previewByTeam.get(key).runs.push({
      runNo: Number(p?.runNumber) || previewByTeam.get(key).runs.length + 1,
      startPenalty: Number.isFinite(p?.startPenalty) ? p.startPenalty : 0,
      finishPenalty: Number.isFinite(p?.finishPenalty) ? p.finishPenalty : 0,
      gatePenalty: Array.isArray(p?.gatePenalties)
        ? p.gatePenalties.reduce((s, g) => s + (Number(g) || 0), 0)
        : 0,
      gates: Array.isArray(p?.gatePenalties) ? p.gatePenalties : [],
      totalPenalty: null,
      penaltyTime: p?.penaltyTime || null,
      startTime: p?.startTime || null,
      finishTime: p?.finishTime || null,
      raceTime: p?.raceTime || null,
      totalTime: p?.totalTime || null,
      flag: null,
    });
  });
  previewByTeam.forEach((t) => {
    t.runs.sort((a, b) => a.runNo - b.runNo);
    const bestRun = t.runs
      .filter((r) => r.totalTime)
      .sort((a, b) => timeToMs(a.totalTime) - timeToMs(b.totalTime))[0];
    teams.push({
      name: t.name,
      bib: t.bib,
      totalTime: bestRun ? bestRun.totalTime : null,
      score: null,
      rank: null, // belum resmi -> selalu fallback ke urutan waktu
      runs: t.runs,
      isLivePreview: true,
    });
  });

  const hasRank = teams.some((t) => t.rank > 0);
  return sortAndNumber(teams, { by: hasRank ? "rank" : "time" });
}

// H2H & RX sama-sama disimpan lewat pola "overallRows" (h2h_overall / rx_overall)
// `previewDocs` = H2HLivePreview (lihat models/H2HLivePreview.js) — cuma
// dipakai jalur H2H (RX belum py live-preview writer sendiri, jadi selalu
// dilewatkan array kosong dari situ). Tim yang belum py placement resmi
// sama sekali di overallRows (turnamen masih berjalan) tetap tampil
// dgn waktu mentah babak berjalan, tanpa score/rank (belum final).
function mapOverallRows(doc, previewDocs) {
  const rows = Array.isArray(doc?.overallRows) ? doc.overallRows : [];
  const officialBibs = new Set(
    rows.map((r) => String(r?.bib || r?.bibTeam || ""))
  );
  const teams = rows.map((r) => ({
    name: r?.name || r?.nameTeam || r?.teamName || "-",
    bib: r?.bib || r?.bibTeam || "-",
    totalTime: null,
    penaltyTime: null,
    score: Number.isFinite(r?.score) ? r.score : null,
    rank: Number.isFinite(r?.ranked ?? r?.rank) ? r.ranked ?? r.rank : null,
  }));

  (previewDocs || []).forEach((p) => {
    const bib = String(p?.bibTeam || "");
    if (bib && officialBibs.has(bib)) return; // sudah py placement resmi
    teams.push({
      name: p?.nameTeam || "-",
      bib: p?.bibTeam || "-",
      totalTime: p?.raceTime || null,
      penaltyTime: null,
      score: null,
      rank: null, // belum resmi (turnamen masih berjalan) -> tanpa rank
      roundName: p?.roundName || null,
      isLivePreview: true,
    });
  });

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
    let progress = null;

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
      // Semua tim terdaftar di bucket ini — supaya tim yg belum turun tetap
      // tampil "Belum Start" (koleksi milik sts-timingsystem, cluster sama).
      const rosterDoc = await db.collection("teamsRegisteredCollection").findOne({
        eventName: "SPRINT",
        eventId,
        initialId,
        divisionId,
        raceId,
      });
      teams = mapSprint(doc, previewDocs, rosterDoc?.teams || []);
      progress = sprintProgress(teams);
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
      // Gabungkan dgn pratinjau tim yang genuinely selesai tapi belum
      // ter-Save Result (lihat models/DrrLivePreview.js) — pola sama
      // persis dgn SPRINT di atas, supaya Live Result DRR jadi reaktif
      // per-tim, bukan cuma saat bulk Save Result.
      const drrPreviewDocs = await DrrLivePreview.find({
        eventId,
        initialId,
        raceId,
        divisionId,
      }).lean();
      teams = mapDrrDetailed(doc, drrPreviewDocs);
      if (drrPreviewDocs.length) {
        latestPreviewAt = drrPreviewDocs.reduce((max, p) => {
          const t = p?.updatedAt ? new Date(p.updatedAt).getTime() : 0;
          return t > max ? t : max;
        }, 0);
      }
    } else if (category === "SLALOM") {
      doc = await db
        .collection("temporarySlalomResult")
        .findOne({ eventId, initialId, divisionId, raceId });
      // Gabungkan dgn pratinjau Run yang genuinely selesai tapi belum
      // ter-Save Result (lihat models/SlalomLivePreview.js) — pola sama
      // persis dgn SPRINT/DRR di atas.
      const slalomPreviewDocs = await SlalomLivePreview.find({
        eventId,
        initialId,
        raceId,
        divisionId,
      }).lean();
      teams = mapSlalomDetailed(doc, slalomPreviewDocs);
      if (slalomPreviewDocs.length) {
        latestPreviewAt = slalomPreviewDocs.reduce((max, p) => {
          const t = p?.updatedAt ? new Date(p.updatedAt).getTime() : 0;
          return t > max ? t : max;
        }, 0);
      }
    } else if (category === "H2H") {
      const key = [eventId, initialId, raceId, divisionId].join("|");
      doc = await db.collection("h2h_overall").findOne({ key });
      // Gabungkan dgn pratinjau tim yang genuinely selesai di babak
      // berjalan tapi belum ter-Save Round / belum py placement resmi
      // (lihat models/H2HLivePreview.js) — pola sama dgn kategori lain.
      const h2hPreviewDocs = await H2HLivePreview.find({
        eventId,
        initialId,
        raceId,
        divisionId,
      }).lean();
      teams = mapOverallRows(doc, h2hPreviewDocs);
      if (h2hPreviewDocs.length) {
        latestPreviewAt = h2hPreviewDocs.reduce((max, p) => {
          const t = p?.updatedAt ? new Date(p.updatedAt).getTime() : 0;
          return t > max ? t : max;
        }, 0);
      }
      bracket = await buildH2HBracket(db, key);
    } else if (category === "RX") {
      const key = [eventId, initialId, raceId, divisionId].join("|");
      doc = await db.collection("rx_overall").findOne({ key });
      teams = mapOverallRows(doc);
    } else if (category === "OVERALL") {
      // BUG FIX (2026-09-28): dulu filter di sini pakai `raceName` (string
      // "MEN"/"WOMEN") — padahal identitas dokumen `temporaryOverallEventResults`
      // yang SEBENARNYA adalah raceId (lihat komentar tegas di
      // insertResultOverall.js upsertEventResultsDoc() sisi sts-timingsystem:
      // "filter identitas dokumen HARUS sama persis... yaitu raceId, BUKAN
      // raceName"). `raceId` SUDAH dikirim client (LiveEventDetail.jsx) tapi
      // tidak pernah dipakai di sini. Kalau `raceName` kosong/tidak match
      // persis (beda kapitalisasi dll), filter jatuh cuma ke eventId+
      // initialId+divisionId — 1 Division bisa dipakai bareng oleh 2 Race
      // (MEN & WOMEN, `raceId` beda tapi `divisionId` sama), jadi tab
      // Overall utk MEN bisa salah menampilkan dokumen overall milik WOMEN
      // (siapa pun yang ke-update paling akhir, krn cuma `sort:{updatedAt:-1}`
      // yang membedakan). Sekarang match by `raceId`, konsisten dgn sisi tulis.
      const filter = { eventId };
      if (initialId) filter.initialId = initialId;
      if (divisionId) filter.divisionId = divisionId;
      if (raceId) filter.raceId = raceId;
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
        ...(progress ? { progress } : {}),
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
