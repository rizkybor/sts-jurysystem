import mongoose, { Schema, model, models } from 'mongoose';

const StsListDivisionSchema = new Schema({
  value: { type: String, required: true },
  name: { type: String, required: true },
});

export default models.StsListDivision || model('StsListDivision', StsListDivisionSchema);