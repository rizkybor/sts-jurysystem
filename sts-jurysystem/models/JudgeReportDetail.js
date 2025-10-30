// models/JudgeReportDetail.js
import mongoose from "mongoose";

const JudgeReportDetailSchema = new mongoose.Schema(
  {
    eventId: { type: String, required: true },
    eventType: {
      type: String,
      enum: ["SPRINT", "SLALOM", "H2H", "DRR"],
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
      enum: ["start", "finish", "section"],
      // optional: tidak required agar tetap kompatibel dengan existing records
    },

    // Common
    penalty: { type: Number, default: 0 },
    judge: { type: String },
    remarks: { type: String },
    divisionId: { type: String },
    raceId: { type: String },

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