// models/SprintTeamStatus.js
//
// Flag ringan "team ini sudah Start" untuk kategori Sprint, diisi lewat
// relay socket dari sts-timingsystem (lihat
// app/api/judges/sprint/team-started/route.js) — BUKAN dibaca langsung
// dari koleksi timing system, karena startTime di sana baru tersimpan
// setelah operator klik "Save Result" (bulk, di akhir race), sementara
// juri menilai justru saat race masih live. Operator mengisi Start Time
// per baris men-trigger broadcast socket `sprint:team-started`; browser
// juri yang online meneruskannya ke endpoint ini supaya tersimpan.
//
// Keterbatasan yang disadari: kalau tidak ada juri yang online tepat saat
// event itu terkirim, tidak ada yang me-relay — flag ini tidak akan
// terisi walau tim sungguhan sudah start. Diterima sebagai trade-off demi
// menghindari perubahan besar di alur simpan timing system.
import mongoose from "mongoose";

const SprintTeamStatusSchema = new mongoose.Schema(
  {
    eventId: { type: String, required: true },
    initialId: { type: String },
    divisionId: { type: String, required: true },
    raceId: { type: String, required: true },
    teamId: { type: String, required: true },
    bibTeam: { type: String },
    startTime: { type: String, required: true },
  },
  { timestamps: true }
);

SprintTeamStatusSchema.index(
  { eventId: 1, raceId: 1, divisionId: 1, teamId: 1 },
  { unique: true }
);

export default mongoose.models.SprintTeamStatus ||
  mongoose.model("SprintTeamStatus", SprintTeamStatusSchema);
