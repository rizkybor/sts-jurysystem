import mongoose, { Schema, model, models } from 'mongoose';

const StsListCategoriesSchema = new Schema({
  value: { type: String, required: true },
  name: { type: String, required: true },
});

export default models.StsListCategories || model('StsListCategories', StsListCategoriesSchema);