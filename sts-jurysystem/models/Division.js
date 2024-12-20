import mongoose, { Schema, model, models } from 'mongoose';

const DivisionSchema = new Schema({
  value: { type: String, required: true },
  name: { type: String, required: true },
});

const Division = models.Division || model('Division', DivisionSchema);
export default Division;