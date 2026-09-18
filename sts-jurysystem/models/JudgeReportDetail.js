// models/JudgeReportDetail.js
import mongoose from "mongoose";

const JudgeReportDetailSchema = new mongoose.Schema(
  {
    eventId: { type: String, required: true },
    eventType: {
      type: String,
      enum: ["SPRINT", "SLALOM", "H2H", "DRR", "RX"],
      required: true,
    },
    team: { type: String, required: true },

    // Generic fields (existing)
    position: { type: String }, // START / FINISH / GATES / ROUND
    runNumber: { type: Number }, // untuk slalom/h2h
    gateNumber: { type: Number }, // untuk slalom

    // === DRR specific ===
    section: { type: Number }, // untuk DRR (Section 1, 2, ...)
    operationType: {
      type: String,
      enum: ["start", "finish", "section", "gate1", "gate2"],
      // optional: tidak required agar tetap kompatibel dengan existing records
    },

    // Common
    penalty: { type: Number, default: 0 },
    judge: { type: String },
    remarks: { type: String },
    initialId: { type: String },
    divisionId: { type: String },
    raceId: { type: String },
    // Babak H2H (dari H2HActiveRound.roundId di jurysystem) — dipakai
    // validasi "1x per team per round" supaya tim yang sama di RONDE
    // BERBEDA (mis. Round 1 lalu Semifinal) tidak salah ke-blok sbg
    // "sudah pernah dinilai", sama pola dgn raceId di Sprint.
    roundId: { type: String },

    // Status submit — "failed" dipakai utk mencatat percobaan submit yang
    // DITOLAK validasi (mis. team belum Start, atau sudah punya Start+Finish)
    // supaya tetap terlihat di Riwayat lengkap dgn info juri yang mencoba,
    // bukan cuma hilang sbg toast error sesaat.
    status: { type: String, enum: ["success", "failed"], default: "success" },
    failReason: { type: String },

    // timestamp metadata
    createdAt: { type: Date, default: Date.now },
    createdAtLocal: { type: String },
    createdAtTz: { type: String },
  },
  { timestamps: false }
);

// compound index to speed up typical queries (eventId + eventType + team)
JudgeReportDetailSchema.index({ eventId: 1, eventType: 1, team: 1 });

export default mongoose.models.JudgeReportDetail ||
  mongoose.model("JudgeReportDetail", JudgeReportDetailSchema);