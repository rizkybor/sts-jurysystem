import mongoose, { Schema, model, models } from "mongoose";

const CategoriesSchema = new Schema(
  {
    value: { type: String, required: true },
    name: { type: String, required: true },
  },
  { collection: "categories" }
);

const Category = models.Category || model("Category", CategoriesSchema);
export default Category;