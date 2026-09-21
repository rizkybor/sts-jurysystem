// models/H2HFoulsReport.js
//
// Model BACA SAJA untuk koleksi `h2hFoulsReports` — koleksi ini ditulis
// LANGSUNG oleh sts-timingsystem (lihat insertH2HFoulsReport.js di repo
// itu) lewat relay socket "custom:event" (type: "FoulsReport") yang
// diterima HeadToHead.vue::receiveFoulsReport(). sts-jurysystem sendiri
// TIDAK PERNAH menulis ke koleksi ini — model ini ada murni supaya juri
// bisa melihat balik laporan Fouls yang sudah mereka kirim sendiri di
// halaman Riwayat Aktivitas (lihat app/api/judges/activity-history).
import mongoose from "mongoose";

const TeamRefSchema = new mongoose.Schema(
  {
    teamId: { type: String, default: "" },
    bibTeam: { type: String, default: "" },
    nameTeam: { type: String, default: "" },
  },
  { _id: false }
);

const H2HFoulsReportSchema = new mongoose.Schema(
  {
    eventId: { type: String, required: true },
    initialId: { type: String, default: "" },
    divisionId: { type: String, default: "" },
    raceId: { type: String, default: "" },
    roundId: { type: String, default: "" },
    roundName: { type: String, default: "" },
    foulTeam: { type: TeamRefSchema, default: () => ({}) },
    unfoulTeam: { type: TeamRefSchema, default: () => ({}) },
    position: { type: String, default: "" },
    positionLabel: { type: String, default: "" },
    detail: { type: String, default: "" },
    detailLabel: { type: String, default: "" },
    penaltySecondsLabel: { type: mongoose.Schema.Types.Mixed, default: null },
    remarks: { type: String, default: "" },
    judge: { type: String, default: "" },
    sourceTs: { type: String, default: "" },
    receivedAt: { type: Date, default: Date.now },
  },
  { collection: "h2hFoulsReports", timestamps: false }
);

export default mongoose.models.H2HFoulsReport ||
  mongoose.model("H2HFoulsReport", H2HFoulsReportSchema);
