import mongoose, { Schema, model, models } from 'mongoose';

const StsListGenderSchema = new Schema({
  value: { type: String, required: true },
  name: { type: String, required: true },
  keterangan: { type: String },
});

export default models.StsListGender || model('StsListGender', StsListGenderSchema);