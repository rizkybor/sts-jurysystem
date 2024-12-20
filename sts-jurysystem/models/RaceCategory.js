import mongoose, { Schema, model, models } from 'mongoose';

const RaceCategorySchema = new Schema({
  value: { type: String, required: true },
  name: { type: String, required: true },
  keterangan: { type: String },
});

const RaceCategory = models.RaceCategory || model('RaceCategory', RaceCategorySchema);
export default RaceCategory;