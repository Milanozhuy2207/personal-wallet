import { Router } from "express";
import SavingsGoal from "../models/SavingsGoal.js";
import Transaction from "../models/Transaction.js";

const router = Router();

const VN_OFFSET_MS = 7 * 60 * 60 * 1000;

const getVnYearMonth = (dateObj = new Date()) => {
  const vnTime = new Date(dateObj.getTime() + VN_OFFSET_MS);
  return {
    year: vnTime.getUTCFullYear(),
    month: vnTime.getUTCMonth() + 1,
  };
};

const parseValidDate = (val) => {
  if (!val) return null;
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) {
    throw new Error("Ngày hạn mục tiêu không hợp lệ");
  }
  return d;
};

const enrichGoal = (goalDoc) => {
  const g = goalDoc.toObject();
  const remaining = Math.max(0, g.targetAmount - g.currentAmount);
  const progress =
    g.targetAmount > 0
      ? Math.min(100, Math.round((g.currentAmount / g.targetAmount) * 100))
      : 0;

  let suggestedMonthly = null;
  if (g.deadline && remaining > 0) {
    const nowYM = getVnYearMonth(new Date());
    const dlYM = getVnYearMonth(new Date(g.deadline));
    const monthsLeft = Math.max(
      1,
      (dlYM.year - nowYM.year) * 12 + (dlYM.month - nowYM.month) + 1
    );
    suggestedMonthly = Math.ceil(remaining / monthsLeft);
  }

  return { ...g, remaining, progress, suggestedMonthly };
};

router.get("/", async (_req, res) => {
  try {
    const goals = await SavingsGoal.find().sort({ status: 1, deadline: 1, createdAt: -1 });
    res.json(goals.map(enrichGoal));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const { title, targetAmount, deadline } = req.body || {};
    if (typeof title !== "string" || !title.trim()) {
      return res.status(400).json({ message: "Tên mục tiêu không được để trống" });
    }
    const numTarget = Number(targetAmount);
    if (!Number.isFinite(numTarget) || numTarget <= 0) {
      return res.status(400).json({ message: "Số tiền mục tiêu phải lớn hơn 0" });
    }
    const goal = await SavingsGoal.create({
      title: title.trim(),
      targetAmount: Math.round(numTarget),
      deadline: parseValidDate(deadline),
    });
    res.status(201).json(enrichGoal(goal));
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.patch("/:id", async (req, res) => {
  try {
    const goal = await SavingsGoal.findById(req.params.id);
    if (!goal) return res.status(404).json({ message: "Không tìm thấy mục tiêu" });

    if (req.body.title !== undefined) {
      if (typeof req.body.title !== "string" || !req.body.title.trim()) {
        return res.status(400).json({ message: "Tên mục tiêu không được để trống" });
      }
      goal.title = req.body.title.trim();
    }
    if (req.body.targetAmount !== undefined) {
      const numTarget = Number(req.body.targetAmount);
      if (!Number.isFinite(numTarget) || numTarget <= 0) {
        return res.status(400).json({ message: "Số tiền mục tiêu phải lớn hơn 0" });
      }
      goal.targetAmount = Math.round(numTarget);
    }
    if (req.body.deadline !== undefined) {
      goal.deadline = parseValidDate(req.body.deadline);
    }
    goal.status = goal.currentAmount >= goal.targetAmount ? "completed" : "active";

    await goal.save();
    res.json(enrichGoal(goal));
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.post("/:id/contribute", async (req, res) => {
  try {
    const rawAmount = Number(req.body?.amount);
    if (!Number.isFinite(rawAmount) || rawAmount <= 0) {
      return res.status(400).json({ message: "Số tiền nạp phải lớn hơn 0" });
    }
    const amount = Math.round(rawAmount);

    const txDate = req.body?.date ? parseValidDate(req.body.date) : new Date();

    const goal = await SavingsGoal.findById(req.params.id);
    if (!goal) return res.status(404).json({ message: "Không tìm thấy mục tiêu" });

    const tx = await Transaction.create({
      type: "goal_deposit",
      amount,
      goalId: goal._id,
      note:
        typeof req.body?.note === "string" && req.body.note.trim()
          ? req.body.note.trim()
          : `Trích vào mục tiêu: ${goal.title}`,
      date: txDate,
    });

    try {
      const updatedGoal = await SavingsGoal.findByIdAndUpdate(
        goal._id,
        { $inc: { currentAmount: amount } },
        { new: true }
      );
      if (!updatedGoal) {
        await Transaction.findByIdAndDelete(tx._id);
        return res.status(404).json({ message: "Không tìm thấy mục tiêu" });
      }
      const nextStatus =
        updatedGoal.currentAmount >= updatedGoal.targetAmount ? "completed" : "active";
      if (updatedGoal.status !== nextStatus) {
        updatedGoal.status = nextStatus;
        await updatedGoal.save();
      }
      res.status(201).json({ goal: enrichGoal(updatedGoal), transaction: tx });
    } catch (updateErr) {
      await Transaction.findByIdAndDelete(tx._id);
      throw updateErr;
    }
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const goal = await SavingsGoal.findByIdAndDelete(req.params.id);
    if (!goal) return res.status(404).json({ message: "Không tìm thấy mục tiêu" });

    // Mặc định hoàn lại tiền đã trích vào số dư khả dụng khi xóa mục tiêu
    if (req.query.keepTransactions !== "true") {
      await Transaction.deleteMany({ goalId: req.params.id, type: "goal_deposit" });
    }
    res.json({ deleted: true });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

export default router;
