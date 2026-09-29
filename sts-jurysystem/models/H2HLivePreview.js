// models/H2HLivePreview.js
//
// Pratinjau hasil H2H SATU TIM (di babak/round tertentu) yang genuinely
// sudah selesai (Start & Finish Time terisi di timing system) — MURNI utk
// Live Result, TIDAK PERNAH dianggap resmi. Data resmi tetap di koleksi
// `h2h_overall` (ditulis sts-timingsystem lewat "Save Round"/bracket
// progression). Diisi lewat relay socket `h2h:team-finished` (browser
// juri yang online meneruskan ke app/api/judges/h2h/live-preview/route.js)
// — pola sama persis dgn SprintLivePreview.js, TAPI di-key jg by roundId
// krn satu tim bisa py hasil di beberapa babak (Quarterfinal, Semifinal,
// Final) — Win/Lose & placement akhir TETAP dari mesin bracket
// (buildOverallPackage() di HeadToHead.vue), preview ini cuma nunjukin
// waktu mentah tim itu di babak yang sedang berjalan.
//
// Keterbatasan yang disadari & diterima (sama dgn SprintLivePreview):
// kalau tidak ada juri yang online tepat saat broadcast terkirim, tidak
// ada yang me-relay — baris preview tim itu tidak akan muncul di Live
// Result sampai ada juri online lagi (atau Save Round, yang tetap jalan
// normal via jalur resmi).
import mongoose from "mongoose";

const H2HLivePreviewSchema = new mongoose.Schema(
  {
    eventId: { type: String, required: true },
    initialId: { type: String, required: true },
    divisionId: { type: String, required: true },
    raceId: { type: String, required: true },
    teamId: { type: String, required: true },
    roundId: { type: String, required: true },
    roundName: { type: String },
    bibTeam: { type: String },
    nameTeam: { type: String },
    startTime: { type: String },
    finishTime: { type: String },
    raceTime: { type: String },
  },
  { timestamps: true }
);

H2HLivePreviewSchema.index(
  { eventId: 1, initialId: 1, raceId: 1, divisionId: 1, teamId: 1, roundId: 1 },
  { unique: true }
);

export default mongoose.models.H2HLivePreview ||
  mongoose.model("H2HLivePreview", H2HLivePreviewSchema);
