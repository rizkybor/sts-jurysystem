import mongoose, { Schema, model, models } from 'mongoose';

const InitialSchema = new Schema({
  value: { type: String, required: true },
  name: { type: String, required: true },
});

export default models.Initial || model('Initial', InitialSchema);