// models/DRRTeamStatus.js
//
// Flag ringan "team ini sudah Start" untuk kategori DRR — SATU startTime
// per team (bukan per-run spt Slalom), sama strukturnya dgn
// models/SprintTeamStatus.js. Beda dari Sprint/Slalom: diisi lewat TULISAN
// LANGSUNG dari proses Electron sts-timingsystem (lihat
// upsertDRRTeamStatus.js) saat operator mengisi Start Time, BUKAN lewat
// relay browser juri — pelajaran dari bug Sprint/Slalom (MEMORY-SPRINT.md
// bug "juri belum Start" 2026-09-23): kalau flag ini cuma bergantung pada
// ada/tidaknya tab juri yang online, sinyalnya bisa hilang tanpa jejak
// walau tim sungguhan sudah start di timing system. DRR sengaja dibangun
// LANGSUNG dgn arsitektur yang benar sejak awal, tidak mengulang pola
// relay-only yang sudah terbukti rapuh.
import mongoose from "mongoose";

const DRRTeamStatusSchema = new mongoose.Schema(
  {
    eventId: { type: String, required: true },
    initialId: { type: String },
    raceId: { type: String, required: true },
    divisionId: { type: String, required: true },
    teamId: { type: String, required: true },
    bibTeam: { type: String },
    startTime: { type: String, required: true },
  },
  { timestamps: true }
);

DRRTeamStatusSchema.index(
  { eventId: 1, initialId: 1, raceId: 1, divisionId: 1, teamId: 1 },
  { unique: true }
);

export default mongoose.models.DRRTeamStatus ||
  mongoose.model("DRRTeamStatus", DRRTeamStatusSchema);
