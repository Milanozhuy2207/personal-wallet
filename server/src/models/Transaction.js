import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["income", "expense", "goal_deposit"], required: true },
    amount: { type: Number, required: true, min: 1 },
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: "Category", default: null },
    goalId: { type: mongoose.Schema.Types.ObjectId, ref: "SavingsGoal", default: null },
    note: { type: String, default: "", trim: true },
    date: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
);

export default mongoose.model("Transaction", transactionSchema);
