// models/TeamsRegistered.js
import mongoose from 'mongoose'

const ResultSchema = new mongoose.Schema({
  startTime: String,
  finishTime: String,
  raceTime: String,
  startPenalty: String,
  finishPenalty: String,
  penalty: String,
  penaltyTime: String,
  totalTime: String,
  ranked: String,
  score: String,
  judgesBy: String,
  judgesTime: String,
})

const TeamSchema = new mongoose.Schema({
  teamId: String,
  nameTeam: String,
  bibTeam: String,
  startOrder: String,
  praStart: String,
  intervalRace: String,
  statusId: Number,
  result: ResultSchema,
  otr: ResultSchema,
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

// Gunakan nama koleksi asli di MongoDB
export default mongoose.models.TeamsRegistered ||
  mongoose.model(
    'TeamsRegistered',
    TeamsRegisteredSchema,
    'teamsRegisteredCollection'
  )
