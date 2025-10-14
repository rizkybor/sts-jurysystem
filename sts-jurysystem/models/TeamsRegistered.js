// models/TeamsRegistered.js
import mongoose from 'mongoose'

const PenaltyTotalSchema = new mongoose.Schema({
  start: { type: Number, default: null },
  finish: { type: Number, default: null },
  gates: { type: [Number], default: [] },
})

const ResultSchema = new mongoose.Schema({
  session: { type: String, default: '' },
  startTime: { type: String, default: '' },
  finishTime: { type: String, default: '' },
  raceTime: { type: String, default: '' },
  penaltyTime: { type: String, default: '' },
  penaltyTotal: { type: PenaltyTotalSchema, default: () => ({}) }, // 🆕 sesuai struktur real
  totalTime: { type: String, default: '' },
  ranked: { type: String, default: '' },
  score: { type: String, default: '' },
  judgesBy: { type: String, default: '' },
  judgesTime: { type: String, default: '' },
  sectionPenalty: { type: [Number], default: [] },
  sectionPenaltyTime: { type: [String], default: [] },
})

const TeamSchema = new mongoose.Schema({
  teamId: String,
  nameTeam: String,
  bibTeam: String,
  startOrder: String,
  praStart: String,
  intervalRace: String,
  statusId: Number,
  result: { type: [ResultSchema], default: [] },
})

const TeamsRegisteredSchema = new mongoose.Schema({
  eventId: String,
  initialId: String,
  raceId: String,
  divisionId: String,
  eventName: String,
  initialName: String,
  raceName: String,
  divisionName: String,
  teams: [TeamSchema],
})

export default mongoose.models.TeamsRegistered ||
  mongoose.model(
    'TeamsRegistered',
    TeamsRegisteredSchema,
    'teamsRegisteredCollection'
  )
