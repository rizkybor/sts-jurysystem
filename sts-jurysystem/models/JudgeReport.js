import mongoose from 'mongoose';

const { Schema } = mongoose;
const ObjectId = Schema.Types.ObjectId;

const JudgeReportSchema = new Schema(
  {
    eventId: { type: ObjectId, ref: 'Event', required: true, index: true },
    juryId:  { type: ObjectId, ref: 'User', required: true, index: true },
    createdBy: { type: String, default: 'Judges' },

    // ⬇️ semua refer ke model tunggal: JudgeReportDetail
    reportSprint:     [{ type: ObjectId, ref: 'JudgeReportDetail' }],
    reportHeadToHead: [{ type: ObjectId, ref: 'JudgeReportDetail' }],
    reportSlalom:     [{ type: ObjectId, ref: 'JudgeReportDetail' }],
    reportDrr:        [{ type: ObjectId, ref: 'JudgeReportDetail' }],
  },
  {
    timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' },
  }
);

// Komposit index mempermudah lookup laporan per event & juri
JudgeReportSchema.index({ eventId: 1, juryId: 1 });

export default mongoose.models.JudgeReport ||
  mongoose.model('JudgeReport', JudgeReportSchema);