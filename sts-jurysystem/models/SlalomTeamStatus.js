// models/SlalomTeamStatus.js
//
// Flag ringan "team ini sudah Start" untuk kategori Slalom, PER RUN
// (Run 1 & Run 2 independen, beda dari Sprint yang cuma 1 Start per
// team). Diisi lewat relay socket `slalom:team-started` (browser juri
// yang online meneruskan ke app/api/judges/slalom/team-started/route.js)
// — bukan dibaca langsung dari koleksi timing system, karena startTime
// di sana baru tersimpan setelah operator klik "Save" (bulk, di akhir
// run), sementara juri menilai justru saat run masih live. Pola sama
// persis dgn models/SprintTeamStatus.js.
//
// Keterbatasan yang disadari & diterima (sama dgn Sprint): kalau tidak
// ada juri yang online tepat saat event itu terkirim, tidak ada yang
// me-relay — flag ini tidak akan terisi walau tim sungguhan sudah start.
import mongoose from "mongoose";

const SlalomTeamStatusSchema = new mongoose.Schema(
  {
    eventId: { type: String, required: true },
    raceId: { type: String, required: true },
    divisionId: { type: String, required: true },
    teamId: { type: String, required: true },
    runNumber: { type: Number, required: true },
    bibTeam: { type: String },
    startTime: { type: String, required: true },
  },
  { timestamps: true }
);

SlalomTeamStatusSchema.index(
  { eventId: 1, raceId: 1, divisionId: 1, teamId: 1, runNumber: 1 },
  { unique: true }
);

export default mongoose.models.SlalomTeamStatus ||
  mongoose.model("SlalomTeamStatus", SlalomTeamStatusSchema);
