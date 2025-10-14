import mongoose from 'mongoose'

const raceSettingSchema = new mongoose.Schema({
  eventId: {
    type: String,
    required: true,
  },
  settings: {
    h2h: {
      R1: { type: Boolean, default: false },
      R2: { type: Boolean, default: false },
      L1: { type: Boolean, default: false },
      L2: { type: Boolean, default: false },
    },
    slalom: {
      totalGate: { type: Number, default: 14 },
    },
    drr: {
      totalSection: { type: Number, default: 6 },
    },
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
})

// Update updatedAt sebelum save
raceSettingSchema.pre('save', function (next) {
  this.updatedAt = Date.now()
  next()
})

export default mongoose.models.RaceSetting ||
  mongoose.model('RaceSetting', raceSettingSchema, 'raceSettings')
