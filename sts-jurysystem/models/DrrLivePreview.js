// models/DrrLivePreview.js
//
// Pratinjau hasil DRR SATU TIM yang genuinely sudah selesai (Start &
// Finish Time terisi di timing system) — MURNI utk Live Result, TIDAK
// PERNAH dianggap resmi. Data resmi tetap di koleksi `temporaryDrrResult`
// (ditulis sts-timingsystem lewat "Save Result"). Diisi lewat relay
// socket `drr:team-finished` (browser juri yang online meneruskan ke
// app/api/judges/drr/live-preview/route.js) — pola sama persis dgn
// SprintLivePreview.js.
//
// Keterbatasan yang disadari & diterima (sama dgn SprintLivePreview):
// kalau tidak ada juri yang online tepat saat broadcast terkirim, tidak
// ada yang me-relay — baris preview utk tim itu tidak akan muncul di
// Live Result sampai ada juri online lagi (atau timing operator akhirnya
// klik Save Result, yang tetap jalan normal via jalur resmi).
import mongoose from "mongoose";

const DrrLivePreviewSchema = new mongoose.Schema(
  {
    eventId: { type: String, required: true },
    initialId: { type: String, required: true },
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
    sectionPenaltyTime: { type: [String], default: [] },
    penaltyTime: { type: String },
    totalTime: { type: String },
  },
  { timestamps: true }
);

DrrLivePreviewSchema.index(
  { eventId: 1, initialId: 1, raceId: 1, divisionId: 1, teamId: 1 },
  { unique: true }
);

export default mongoose.models.DrrLivePreview ||
  mongoose.model("DrrLivePreview", DrrLivePreviewSchema);
