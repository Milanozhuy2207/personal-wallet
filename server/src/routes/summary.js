import { Router } from "express";
import Transaction from "../models/Transaction.js";

const router = Router();

const MONTH_REGEX = /^\d{4}-(0[1-9]|1[0-2])$/;
const VN_OFFSET_MS = 7 * 60 * 60 * 1000;

const getDefaultVnMonth = () => {
  const vnNow = new Date(Date.now() + VN_OFFSET_MS);
  return `${vnNow.getUTCFullYear()}-${String(vnNow.getUTCMonth() + 1).padStart(2, "0")}`;
};

const getMonthBounds = (year, month) => {
  const start = new Date(`${year}-${String(month).padStart(2, "0")}-01T00:00:00+07:00`);
  const nextYear = month === 12 ? year + 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;
  const end = new Date(`${nextYear}-${String(nextMonth).padStart(2, "0")}-01T00:00:00+07:00`);
  return { start, end };
};

router.get("/", async (req, res) => {
  try {
    const defaultMonth = getDefaultVnMonth();
    const monthStr = typeof req.query.month === "string" && req.query.month ? req.query.month : defaultMonth;
    if (!MONTH_REGEX.test(monthStr)) {
      return res.status(400).json({ message: "Định dạng tháng không hợp lệ (YYYY-MM)" });
    }
    const [year, month] = monthStr.split("-").map(Number);

    const { start, end } = getMonthBounds(year, month);

    // 1. Tổng thu / chi / tiết kiệm trong tháng
    const monthlyAgg = await Transaction.aggregate([
      { $match: { date: { $gte: start, $lt: end } } },
      { $group: { _id: "$type", total: { $sum: "$amount" } } },
    ]);

    const monthlyMap = Object.fromEntries(monthlyAgg.map((i) => [i._id, i.total]));
    const monthIncome = monthlyMap.income || 0;
    const monthExpense = monthlyMap.expense || 0;
    const monthSaved = monthlyMap.goal_deposit || 0;

    // 2. Số dư khả dụng toàn thời gian
    const allTimeAgg = await Transaction.aggregate([
      { $group: { _id: "$type", total: { $sum: "$amount" } } },
    ]);
    const allTimeMap = Object.fromEntries(allTimeAgg.map((i) => [i._id, i.total]));
    const totalAvailableBalance =
      (allTimeMap.income || 0) - (allTimeMap.expense || 0) - (allTimeMap.goal_deposit || 0);
    const totalSavedAllTime = allTimeMap.goal_deposit || 0;

    // 3. Chi tiêu theo danh mục trong tháng
    const expenseByCategory = await Transaction.aggregate([
      { $match: { type: "expense", date: { $gte: start, $lt: end } } },
      { $group: { _id: "$categoryId", total: { $sum: "$amount" } } },
      {
        $lookup: {
          from: "categories",
          localField: "_id",
          foreignField: "_id",
          as: "category",
        },
      },
      { $unwind: { path: "$category", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 0,
          categoryId: "$_id",
          name: { $ifNull: ["$category.name", "Khác"] },
          color: { $ifNull: ["$category.color", "#94a3b8"] },
          icon: { $ifNull: ["$category.icon", "tag"] },
          total: 1,
        },
      },
      { $sort: { total: -1 } },
    ]);

    // 4. Biểu đồ xu hướng 6 tháng gần nhất tính tới tháng đang xem
    const trendMonths = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(year, month - 1 - i, 1);
      const y = d.getFullYear();
      const m = d.getMonth() + 1;
      trendMonths.push({
        key: `${y}-${String(m).padStart(2, "0")}`,
        label: `T${m}/${String(y).slice(-2)}`,
        year: y,
        month: m,
      });
    }

    const trendStart = getMonthBounds(trendMonths[0].year, trendMonths[0].month).start;
    const trendAgg = await Transaction.aggregate([
      { $match: { date: { $gte: trendStart, $lt: end } } },
      {
        $group: {
          _id: {
            ym: { $dateToString: { format: "%Y-%m", date: "$date", timezone: "+07:00" } },
            type: "$type",
          },
          total: { $sum: "$amount" },
        },
      },
    ]);

    const trendLookup = {};
    for (const row of trendAgg) {
      const ym = row._id.ym;
      if (!trendLookup[ym]) trendLookup[ym] = { income: 0, expense: 0, saved: 0 };
      if (row._id.type === "income") trendLookup[ym].income = row.total;
      if (row._id.type === "expense") trendLookup[ym].expense = row.total;
      if (row._id.type === "goal_deposit") trendLookup[ym].saved = row.total;
    }

    const monthlyTrend = trendMonths.map((item) => ({
      month: item.key,
      label: item.label,
      income: trendLookup[item.key]?.income || 0,
      expense: trendLookup[item.key]?.expense || 0,
      saved: trendLookup[item.key]?.saved || 0,
    }));

    res.json({
      month: monthStr,
      monthIncome,
      monthExpense,
      monthSaved,
      monthNet: monthIncome - monthExpense - monthSaved,
      totalAvailableBalance,
      totalSavedAllTime,
      expenseByCategory,
      monthlyTrend,
    });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

export default router;
