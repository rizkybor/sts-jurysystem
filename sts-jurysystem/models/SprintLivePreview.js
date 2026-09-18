// models/SprintLivePreview.js
//
// Pratinjau hasil Sprint SATU TIM yang genuinely sudah selesai (Start &
// Finish Time terisi di timing system) — MURNI utk Live Result, TIDAK
// PERNAH dianggap resmi. Data resmi tetap di koleksi
// `temporarySprintResult` (ditulis sts-timingsystem lewat "Save
// Result"). Diisi lewat relay socket `sprint:team-finished` (browser
// juri yang online meneruskan ke
// app/api/judges/sprint/live-preview/route.js), sama pola dgn
// SprintTeamStatus (flag "belum Start").
//
// Kenapa terpisah dari SprintTeamStatus: SprintTeamStatus cuma flag
// boolean ringan ("sudah Start atau belum"), sedangkan ini menyimpan
// SELURUH hasil terhitung (raceTime, penalty, totalTime) tiap tim utk
// ditampilkan di Live Result SEBELUM operator klik Save Result.
//
// Keterbatasan yang disadari & diterima (sama dgn SprintTeamStatus):
// kalau tidak ada juri yang online tepat saat broadcast terkirim, tidak
// ada yang me-relay — baris preview utk tim itu tidak akan muncul di
// Live Result sampai ada juri online lagi (atau timing operator
// akhirnya klik Save Result, yang tetap jalan normal via jalur resmi).
import mongoose from "mongoose";

const SprintLivePreviewSchema = new mongoose.Schema(
  {
    eventId: { type: String, required: true },
    initialId: { type: String },
    divisionId: { type: String, required: true },
    raceId: { type: String, required: true },
    teamId: { type: String, required: true },
    bibTeam: { type: String },
    nameTeam: { type: String },
    startTime: { type: String },
    finishTime: { type: String },
    raceTime: { type: String },
    startPenalty: { type: Number, default: 0 },
    finishPenalty: { type: Number, default: 0 },
    penaltyTime: { type: String },
    totalTime: { type: String },
  },
  { timestamps: true }
);

SprintLivePreviewSchema.index(
  { eventId: 1, raceId: 1, divisionId: 1, teamId: 1 },
  { unique: true }
);

export default mongoose.models.SprintLivePreview ||
  mongoose.model("SprintLivePreview", SprintLivePreviewSchema);
