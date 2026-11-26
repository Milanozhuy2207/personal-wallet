import { Router } from "express";
import mongoose from "mongoose";
import Transaction from "../models/Transaction.js";
import SavingsGoal from "../models/SavingsGoal.js";
import Category from "../models/Category.js";

const router = Router();
const MONTH_REGEX = /^\d{4}-(0[1-9]|1[0-2])$/;

const getMonthRange = (monthStr) => {
  if (typeof monthStr !== "string" || !MONTH_REGEX.test(monthStr)) {
    throw new Error("Định dạng tháng không hợp lệ (YYYY-MM)");
  }
  const [year, month] = monthStr.split("-").map(Number);
  const start = new Date(`${year}-${String(month).padStart(2, "0")}-01T00:00:00+07:00`);
  const nextYear = month === 12 ? year + 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;
  const end = new Date(`${nextYear}-${String(nextMonth).padStart(2, "0")}-01T00:00:00+07:00`);
  return { start, end };
};

const parseValidDate = (val) => {
  if (!val) return new Date();
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) {
    throw new Error("Ngày giao dịch không hợp lệ");
  }
  return d;
};

const validateCategoryForType = async (categoryId, type) => {
  if (!categoryId) return null;
  if (typeof categoryId !== "string" || !mongoose.Types.ObjectId.isValid(categoryId)) {
    throw new Error("Danh mục không hợp lệ");
  }
  const category = await Category.findById(categoryId);
  if (!category) {
    throw new Error("Không tìm thấy danh mục đã chọn");
  }
  if (category.type !== type) {
    throw new Error("Danh mục không khớp với loại giao dịch (Thu / Chi)");
  }
  return category._id;
};

router.get("/", async (req, res) => {
  try {
    const { month, type, categoryId } = req.query;
    const filter = {};

    if (month !== undefined && month !== "") {
      const { start, end } = getMonthRange(month);
      filter.date = { $gte: start, $lt: end };
    }
    if (typeof type === "string" && ["income", "expense", "goal_deposit"].includes(type)) {
      filter.type = type;
    }
    if (typeof categoryId === "string" && mongoose.Types.ObjectId.isValid(categoryId)) {
      filter.categoryId = categoryId;
    }

    const items = await Transaction.find(filter)
      .populate("categoryId", "name icon color type")
      .populate("goalId", "title")
      .sort({ date: -1, createdAt: -1 });

    res.json(items);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const { type, amount, categoryId, note, date } = req.body || {};
    if (!["income", "expense"].includes(type)) {
      return res.status(400).json({ message: "Dùng endpoint /goals/:id/contribute để nạp mục tiêu" });
    }
    const numAmount = Number(amount);
    if (!Number.isFinite(numAmount) || numAmount <= 0) {
      return res.status(400).json({ message: "Số tiền giao dịch phải lớn hơn 0" });
    }

    const validCategoryId = await validateCategoryForType(categoryId, type);

    const tx = await Transaction.create({
      type,
      amount: Math.round(numAmount),
      categoryId: validCategoryId,
      note: typeof note === "string" ? note.trim() : "",
      date: parseValidDate(date),
    });
    const populated = await tx.populate("categoryId", "name icon color type");
    res.status(201).json(populated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.patch("/:id", async (req, res) => {
  try {
    const existing = await Transaction.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: "Không tìm thấy giao dịch" });

    const oldAmount = existing.amount;
    if (req.body.amount !== undefined) {
      const numAmount = Number(req.body.amount);
      if (!Number.isFinite(numAmount) || numAmount <= 0) {
        return res.status(400).json({ message: "Số tiền giao dịch phải lớn hơn 0" });
      }
      existing.amount = Math.round(numAmount);
    }
    if (req.body.categoryId !== undefined && existing.type !== "goal_deposit") {
      existing.categoryId = await validateCategoryForType(req.body.categoryId, existing.type);
    }
    if (req.body.note !== undefined) {
      existing.note = typeof req.body.note === "string" ? req.body.note.trim() : "";
    }
    if (req.body.date !== undefined) {
      existing.date = parseValidDate(req.body.date);
    }

    await existing.save();

    if (existing.type === "goal_deposit" && existing.goalId && oldAmount !== existing.amount) {
      const diff = existing.amount - oldAmount;
      const goal = await SavingsGoal.findById(existing.goalId);
      if (goal) {
        goal.currentAmount = Math.max(0, goal.currentAmount + diff);
        goal.status = goal.currentAmount >= goal.targetAmount ? "completed" : "active";
        await goal.save();
      }
    }

    const populated = await existing.populate([
      { path: "categoryId", select: "name icon color type" },
      { path: "goalId", select: "title" },
    ]);
    res.json(populated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const tx = await Transaction.findByIdAndDelete(req.params.id);
    if (!tx) return res.status(404).json({ message: "Không tìm thấy giao dịch" });

    if (tx.type === "goal_deposit" && tx.goalId) {
      const goal = await SavingsGoal.findById(tx.goalId);
      if (goal) {
        goal.currentAmount = Math.max(0, goal.currentAmount - tx.amount);
        goal.status = goal.currentAmount >= goal.targetAmount ? "completed" : "active";
        await goal.save();
      }
    }

    res.json({ deleted: true });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

export default router;
