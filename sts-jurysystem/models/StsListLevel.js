import mongoose, { Schema, model, models } from 'mongoose';

const LevelSchema = new Schema({
  value: { type: String, required: true },
  name: { type: String, required: true },
});

export default models.Level || model('Level', LevelSchema);