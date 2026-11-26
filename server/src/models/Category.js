import mongoose from "mongoose";

const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    type: { type: String, enum: ["income", "expense"], required: true },
    icon: { type: String, default: "tag" },
    color: { type: String, default: "#64748b" },
  },
  { timestamps: true }
);

export default mongoose.model("Category", categorySchema);
