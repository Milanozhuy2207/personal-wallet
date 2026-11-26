import mongoose from "mongoose";

const savingsGoalSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    targetAmount: { type: Number, required: true, min: 1 },
    currentAmount: { type: Number, default: 0, min: 0 },
    deadline: { type: Date, default: null },
    status: { type: String, enum: ["active", "completed"], default: "active" },
  },
  { timestamps: true }
);

export default mongoose.model("SavingsGoal", savingsGoalSchema);
