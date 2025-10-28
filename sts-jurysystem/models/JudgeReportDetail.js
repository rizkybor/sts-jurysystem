// models/JudgeReportDetail.js
import mongoose from 'mongoose';

const JudgeReportDetailSchema = new mongoose.Schema({
  eventId: { type: String, required: true },
  eventType: { type: String, enum: ['SPRINT', 'SLALOM', 'H2H', 'DRR'], required: true },
  team: { type: String, required: true },
  position: { type: String }, // START / FINISH / GATES / ROUND
  runNumber: { type: Number }, // untuk slalom/h2h
  gateNumber: { type: Number }, // untuk slalom
  penalty: { type: Number, default: 0 },
  judge: { type: String },
  remarks: { type: String },
  divisionId: { type: String },
  raceId: { type: String },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.JudgeReportDetail ||
  mongoose.model('JudgeReportDetail', JudgeReportDetailSchema);