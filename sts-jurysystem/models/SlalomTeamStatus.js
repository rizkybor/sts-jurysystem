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
    initialId: { type: String },
    raceId: { type: String, required: true },
    divisionId: { type: String, required: true },
    teamId: { type: String, required: true },
    runNumber: { type: Number, required: true },
    bibTeam: { type: String },
    startTime: { type: String, required: true },
  },
  { timestamps: true }
);

// BUG FIX (2026-09-23): index unik sebelumnya TIDAK ikutkan initialId —
// padahal raceId+divisionId+teamId yang KEBETULAN sama bisa muncul di
// Initial berbeda (mis. tim "FAJI DKI JAKARTA" di Initial "SENIOR" R4
// BIB 100 vs Initial "U23" BIB 200) — tanpa initialId, flag "sudah
// Start" bisa salah nyasar antar-Initial. Lihat MEMORY-SLALOM.md.
SlalomTeamStatusSchema.index(
  { eventId: 1, initialId: 1, raceId: 1, divisionId: 1, teamId: 1, runNumber: 1 },
  { unique: true }
);

export default mongoose.models.SlalomTeamStatus ||
  mongoose.model("SlalomTeamStatus", SlalomTeamStatusSchema);
