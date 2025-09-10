// models/Event.js
import { Schema, model, models } from "mongoose";

// item kategori umum: { value, name, keterangan? } tanpa _id per item
const CategoryItemSchema = new Schema(
  {
    value: { type: String, required: true, trim: true },
    name:  { type: String, required: true, trim: true },
    keterangan: { type: String, trim: true }, // dipakai di categoriesRace (opsional)
  },
  { _id: false }
);

const EventSchema = new Schema(
  {
    levelName:   { type: String, required: true, trim: true },
    eventName:   { type: String, required: true, trim: true },
    riverName:   { type: String, trim: true },

    // alamat (flat sesuai data di DB)
    addressDistrict:    { type: String, trim: true },
    addressSubDistrict: { type: String, trim: true },
    addressVillage:     { type: String, trim: true },
    addressCity:        { type: String, trim: true },
    addressProvince:    { type: String, trim: true },
    addressZipCode:     { type: String, trim: true },
    addressState:       { type: String, trim: true },

    // tanggal event
    startDateEvent: { type: Date, required: true },
    endDateEvent:   { type: Date, required: true },

    // kategori embedded (bukan ObjectId / populate)
    categoriesEvent:    { type: [CategoryItemSchema], default: [] },
    categoriesDivision: { type: [CategoryItemSchema], default: [] },
    categoriesRace:     { type: [CategoryItemSchema], default: [] },
    categoriesInitial:  { type: [CategoryItemSchema], default: [] },

    // penanggung jawab
    chiefJudge:    { type: String, trim: true },
    raceDirector:  { type: String, trim: true },
    safetyDirector:{ type: String, trim: true },
    eventDirector: { type: String, trim: true },

    // peserta fleksibel (sekarang kosong)
    participant: { type: [Schema.Types.Mixed], default: [] },

    statusEvent: {
      type: String,
      enum: ["Activated", "Deactivated"],
      default: "Activated",
      required: true,
    },
  },
  {
    timestamps: true,
    collection: "eventsCollection", // penting: sesuai nama koleksi di MongoDB
  }
);

// Index bantu pencarian (opsional)
EventSchema.index({ eventName: 1, startDateEvent: 1 });

const Event = models.Event || model("Event", EventSchema);
export default Event;