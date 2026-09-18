// models/H2HActiveRound.js
//
// Babak (round) H2H yang SEDANG dibuka/dinilai operator di sts-timingsystem
// — H2H tidak punya "Start Time" per tim seperti Sprint (lihat
// MEMORY-H2H.md), jadi ini pengganti sinyal live "tim mana yang sekarang
// aktif/boleh dinilai juri". Diisi lewat relay socket `h2h:round-active`
// (browser juri yang online meneruskan ke
// app/api/judges/h2h/round-active/route.js) — bukan dibaca langsung dari
// koleksi timing system.
//
// Satu dokumen per (eventId, raceId, divisionId) — di-upsert (replace)
// setiap kali operator pindah babak, karena cuma SATU babak yang aktif
// pada satu waktu per kategori.
import mongoose from "mongoose";

const H2HRoundTeamSchema = new mongoose.Schema(
  {
    teamId: { type: String },
    bibTeam: { type: String },
    nameTeam: { type: String },
  },
  { _id: false }
);

const H2HMatchSchema = new mongoose.Schema(
  {
    // Nomor Heat yang sudah ditentukan operator (openHeatEditor di
    // HeadToHead.vue) — dipakai jurysystem utk filter dropdown Team per
    // Heat, bukan cuma per babak. null kalau belum ditentukan.
    heat: { type: Number, default: null },
    team1: { type: H2HRoundTeamSchema, default: () => ({}) },
    team2: { type: H2HRoundTeamSchema, default: () => ({}) },
  },
  { _id: false }
);

const H2HActiveRoundSchema = new mongoose.Schema(
  {
    eventId: { type: String, required: true },
    initialId: { type: String },
    divisionId: { type: String, required: true },
    raceId: { type: String, required: true },
    roundId: { type: String },
    roundName: { type: String },
    teams: { type: [H2HRoundTeamSchema], default: [] },
    // Pasangan match (team1 vs team2) di babak ini — dipakai fitur Fouls
    // Report utk otomatis menentukan "Unfouls Team" (lawan dari team yang
    // dipilih juri sbg pelaku foul), tanpa juri perlu pilih manual.
    matches: { type: [H2HMatchSchema], default: [] },
  },
  { timestamps: true }
);

H2HActiveRoundSchema.index(
  { eventId: 1, raceId: 1, divisionId: 1 },
  { unique: true }
);

export default mongoose.models.H2HActiveRound ||
  mongoose.model("H2HActiveRound", H2HActiveRoundSchema);
