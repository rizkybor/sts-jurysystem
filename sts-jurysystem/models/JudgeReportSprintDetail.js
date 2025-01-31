import mongoose from 'mongoose';

const JudgeReportSprintDetailSchema = new mongoose.Schema({
  position: { type: String, required: true },
  team: { type: String, required: true },
  penalty: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.JudgeReportSprintDetail ||
  mongoose.model('JudgeReportSprintDetail', JudgeReportSprintDetailSchema);