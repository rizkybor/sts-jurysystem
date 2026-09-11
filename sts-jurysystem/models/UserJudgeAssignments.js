import mongoose from 'mongoose'
const { Schema } = mongoose

// Schema untuk role/judge details
const JudgeRoleSchema = new Schema(
  {
    sprint: {
      start: { type: Boolean, default: false },
      finish: { type: Boolean, default: false },
    },
    h2h: {
      start: { type: Boolean, default: false },
      // Cut Line (CL) & Others (PO) — dulu tidak ada field sama sekali di
      // sini, padahal timing system (applyPenaltyFromSocketH2H) sudah
      // mendukung keduanya sbg kategori penalty independen (CL malah baru
      // saja dibuatkan validasi ALLOWED-list-nya sendiri di timing system).
      // Tanpa field ini, admin tidak pernah bisa meng-assign juri ke tugas
      // CL/Others sama sekali.
      cl: { type: Boolean, default: false },
      finish: { type: Boolean, default: false },
      other: { type: Boolean, default: false },
      R1: { type: Boolean, default: false },
      R2: { type: Boolean, default: false },
      L1: { type: Boolean, default: false },
      L2: { type: Boolean, default: false },
    },
    slalom: {
      start: { type: Boolean, default: false },
      finish: { type: Boolean, default: false },
      gates: { type: [Number], default: [] },
    },
    drr: {
      start: { type: Boolean, default: false },
      finish: { type: Boolean, default: false },
      sections: { type: [Number], default: [] },
    },
    rx: {
      gates: { type: [Number], default: [] },
    },
  },
  { _id: false }
)

// Schema utama untuk userJudgeAssignments
const UserJudgeAssignmentSchema = new Schema(
  {
    email: { type: String, required: true, index: true },
    username: { type: String, required: true },
    judges: { type: [JudgeRoleSchema], default: [] },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true, collection: 'userJudgeAssignments' }
)

// Pastikan model hanya dibuat sekali
export default mongoose.models.userJudgeAssignments ||
  mongoose.model('userJudgeAssignments', UserJudgeAssignmentSchema)
