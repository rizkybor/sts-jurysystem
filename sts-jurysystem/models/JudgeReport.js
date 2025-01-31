import mongoose from "mongoose";

const JudgeReportSchema = new mongoose.Schema({
  eventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Event",
    required: false,
  },
  juryId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  createdBy: { type: String, default: "Judges" },
  reportSprint: [
    { type: mongoose.Schema.Types.ObjectId, ref: "JudgeReportSprintDetail" },
  ],
  reportHeadToHead: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "JudgeReportHeadToHeadDetail",
    },
  ],
  reportSlalom: [
    { type: mongoose.Schema.Types.ObjectId, ref: "JudgeReportSlalomDetail" },
  ],
  reportDrr: [
    { type: mongoose.Schema.Types.ObjectId, ref: "JudgeReportDrrDetail" },
  ],
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.JudgeReport ||
  mongoose.model("JudgeReport", JudgeReportSchema);
