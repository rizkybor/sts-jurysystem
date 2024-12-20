import mongoose, { Schema, model, models } from "mongoose";

const TypeSchema = new Schema(
  {
    value: { type: String, required: true },
    name: { type: String, required: true },
    keterangan: { type: String },
  },
  { collection: "types" }
);

const Type = models.Type || model("Type", TypeSchema);
export default Type;
