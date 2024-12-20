import mongoose, { Schema, model, models } from "mongoose";

const DivisionSchema = new Schema(
  {
    value: { type: String, required: true },
    name: { type: String, required: true },
  },
  { collection: "divisions" }
);

const Division = models.Division || model("Division", DivisionSchema);
export default Division;
