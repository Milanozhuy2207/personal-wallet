import AsyncStorage from "@react-native-async-storage/async-storage";

const KEYS = {
  CATEGORIES: "wallet_offline_categories_v1",
  TRANSACTIONS: "wallet_offline_transactions_v1",
  GOALS: "wallet_offline_goals_v1",
};

const DEFAULT_CATEGORIES = [
  { _id: "cat_inc_salary", name: "Lương", type: "income", icon: "briefcase", color: "#10b981" },
  { _id: "cat_inc_side", name: "Thu nhập phụ", type: "income", icon: "sparkles", color: "#06b6d4" },
  { _id: "cat_exp_food", name: "Ăn uống", type: "expense", icon: "utensils", color: "#f97316" },
  { _id: "cat_exp_move", name: "Di chuyển & Xăng xe", type: "expense", icon: "bike", color: "#3b82f6" },
  { _id: "cat_exp_home", name: "Hóa đơn & Nhà ở", type: "expense", icon: "home", color: "#8b5cf6" },
  { _id: "cat_exp_shop", name: "Mua sắm", type: "expense", icon: "shopping-bag", color: "#ec4899" },
  { _id: "cat_exp_fun", name: "Giải trí & Cà phê", type: "expense", icon: "coffee", color: "#eab308" },
  { _id: "cat_exp_health", name: "Sức khỏe & Tập luyện", type: "expense", icon: "dumbbell", color: "#ef4444" },
];

const genId = (prefix = "id") =>
  `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

const readJSON = async (key, fallback) => {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
};

const writeJSON = async (key, data) => {
  await AsyncStorage.setItem(key, JSON.stringify(data));
};

const toMonthKey = (isoDate) => {
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

export const enrichGoal = (g) => {
  const targetAmount = Number(g.targetAmount) || 0;
  const currentAmount = Number(g.currentAmount) || 0;
  const remaining = Math.max(0, targetAmount - currentAmount);
  const progress =
    targetAmount > 0 ? Math.min(100, Math.round((currentAmount / targetAmount) * 100)) : 0;

  let suggestedMonthly = null;
  if (g.deadline && remaining > 0) {
    const now = new Date();
    const dl = new Date(g.deadline);
    if (!Number.isNaN(dl.getTime())) {
      const monthsLeft = Math.max(
        1,
        (dl.getFullYear() - now.getFullYear()) * 12 + (dl.getMonth() - now.getMonth()) + 1
      );
      suggestedMonthly = Math.ceil(remaining / monthsLeft);
    }
  }

  return {
    ...g,
    targetAmount,
    currentAmount,
    remaining,
    progress,
    status: currentAmount >= targetAmount ? "completed" : "active",
    suggestedMonthly,
  };
};

// ─── CATEGORIES ───────────────────────────────────────────────
export const getCategories = async (typeFilter) => {
  let categories = await readJSON(KEYS.CATEGORIES, null);
  if (!Array.isArray(categories) || categories.length === 0) {
    categories = DEFAULT_CATEGORIES;
    await writeJSON(KEYS.CATEGORIES, categories);
  }
  if (typeFilter && ["income", "expense"].includes(typeFilter)) {
    return categories.filter((c) => c.type === typeFilter);
  }
  return categories;
};

export const createCategory = async ({ name, type, color = "#3b82f6", icon = "tag" }) => {
  if (!name?.trim()) throw new Error("Tên danh mục không được để trống");
  if (!["income", "expense"].includes(type)) throw new Error("Loại danh mục không hợp lệ");
  const categories = await getCategories();
  const newCat = {
    _id: genId("cat"),
    name: name.trim(),
    type,
    color,
    icon,
    createdAt: new Date().toISOString(),
  };
  categories.push(newCat);
  await writeJSON(KEYS.CATEGORIES, categories);
  return newCat;
};

export const deleteCategory = async (id) => {
  const categories = await getCategories();
  const next = categories.filter((c) => c._id !== id);
  await writeJSON(KEYS.CATEGORIES, next);

  const txs = await readJSON(KEYS.TRANSACTIONS, []);
  let changed = false;
  const updatedTxs = txs.map((tx) => {
    if (tx.categoryId === id) {
      changed = true;
      return { ...tx, categoryId: null };
    }
    return tx;
  });
  if (changed) {
    await writeJSON(KEYS.TRANSACTIONS, updatedTxs);
  }
  return { deleted: true };
};

// ─── TRANSACTIONS ─────────────────────────────────────────────
export const getTransactions = async ({ month, type } = {}) => {
  const [txs, categories, goals] = await Promise.all([
    readJSON(KEYS.TRANSACTIONS, []),
    getCategories(),
    readJSON(KEYS.GOALS, []),
  ]);

  const catMap = Object.fromEntries(categories.map((c) => [c._id, c]));
  const goalMap = Object.fromEntries(goals.map((g) => [g._id, g]));

  return txs
    .filter((tx) => {
      if (month && toMonthKey(tx.date) !== month) return false;
      if (type && tx.type !== type) return false;
      return true;
    })
    .sort((a, b) => {
      const diff = new Date(b.date).getTime() - new Date(a.date).getTime();
      if (diff !== 0) return diff;
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    })
    .map((tx) => ({
      ...tx,
      categoryId: tx.categoryId ? catMap[tx.categoryId] || null : null,
      goalId: tx.goalId ? goalMap[tx.goalId] || null : null,
    }));
};

export const createTransaction = async ({ type, amount, categoryId, note, date }) => {
  if (!["income", "expense"].includes(type)) {
    throw new Error("Loại giao dịch không hợp lệ");
  }
  const numAmount = Math.round(Number(amount));
  if (!Number.isFinite(numAmount) || numAmount <= 0) {
    throw new Error("Số tiền phải lớn hơn 0");
  }
  const parsedDate = date ? new Date(date) : new Date();
  if (Number.isNaN(parsedDate.getTime())) {
    throw new Error("Ngày giao dịch không hợp lệ");
  }

  const txs = await readJSON(KEYS.TRANSACTIONS, []);
  const newTx = {
    _id: genId("tx"),
    type,
    amount: numAmount,
    categoryId: categoryId || null,
    goalId: null,
    note: typeof note === "string" ? note.trim() : "",
    date: parsedDate.toISOString(),
    createdAt: new Date().toISOString(),
  };
  txs.push(newTx);
  await writeJSON(KEYS.TRANSACTIONS, txs);
  return newTx;
};

export const updateTransaction = async (id, { amount, categoryId, note, date }) => {
  const txs = await readJSON(KEYS.TRANSACTIONS, []);
  const idx = txs.findIndex((t) => t._id === id);
  if (idx === -1) throw new Error("Không tìm thấy giao dịch");

  const existing = txs[idx];
  const oldAmount = existing.amount;
  let nextAmount = oldAmount;

  if (amount !== undefined) {
    const num = Math.round(Number(amount));
    if (!Number.isFinite(num) || num <= 0) throw new Error("Số tiền phải lớn hơn 0");
    nextAmount = num;
  }

  let nextDate = existing.date;
  if (date !== undefined) {
    const d = new Date(date);
    if (Number.isNaN(d.getTime())) throw new Error("Ngày không hợp lệ");
    nextDate = d.toISOString();
  }

  const updated = {
    ...existing,
    amount: nextAmount,
    categoryId:
      existing.type !== "goal_deposit" && categoryId !== undefined
        ? categoryId || null
        : existing.categoryId,
    note: note !== undefined ? String(note).trim() : existing.note,
    date: nextDate,
  };

  txs[idx] = updated;
  await writeJSON(KEYS.TRANSACTIONS, txs);

  if (existing.type === "goal_deposit" && existing.goalId && oldAmount !== nextAmount) {
    const diff = nextAmount - oldAmount;
    const goals = await readJSON(KEYS.GOALS, []);
    const gIdx = goals.findIndex((g) => g._id === existing.goalId);
    if (gIdx !== -1) {
      const nextCurrent = Math.max(0, (Number(goals[gIdx].currentAmount) || 0) + diff);
      goals[gIdx].currentAmount = nextCurrent;
      goals[gIdx].status = nextCurrent >= goals[gIdx].targetAmount ? "completed" : "active";
      await writeJSON(KEYS.GOALS, goals);
    }
  }

  return updated;
};

export const deleteTransaction = async (id) => {
  const txs = await readJSON(KEYS.TRANSACTIONS, []);
  const target = txs.find((t) => t._id === id);
  if (!target) throw new Error("Không tìm thấy giao dịch");

  const nextTxs = txs.filter((t) => t._id !== id);
  await writeJSON(KEYS.TRANSACTIONS, nextTxs);

  if (target.type === "goal_deposit" && target.goalId) {
    const goals = await readJSON(KEYS.GOALS, []);
    const gIdx = goals.findIndex((g) => g._id === target.goalId);
    if (gIdx !== -1) {
      const nextCurrent = Math.max(0, (Number(goals[gIdx].currentAmount) || 0) - target.amount);
      goals[gIdx].currentAmount = nextCurrent;
      goals[gIdx].status = nextCurrent >= goals[gIdx].targetAmount ? "completed" : "active";
      await writeJSON(KEYS.GOALS, goals);
    }
  }
  return { deleted: true };
};

// ─── SAVINGS GOALS ────────────────────────────────────────────
export const getGoals = async () => {
  const goals = await readJSON(KEYS.GOALS, []);
  return goals
    .map(enrichGoal)
    .sort((a, b) => {
      if (a.status !== b.status) return a.status === "active" ? -1 : 1;
      if (a.deadline && b.deadline) {
        return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
      }
      if (a.deadline) return -1;
      if (b.deadline) return 1;
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    });
};

export const createGoal = async ({ title, targetAmount, deadline }) => {
  if (!title?.trim()) throw new Error("Tên mục tiêu không được để trống");
  const numTarget = Math.round(Number(targetAmount));
  if (!Number.isFinite(numTarget) || numTarget <= 0) {
    throw new Error("Số tiền mục tiêu phải lớn hơn 0");
  }
  let isoDeadline = null;
  if (deadline) {
    const d = new Date(deadline);
    if (Number.isNaN(d.getTime())) throw new Error("Ngày hạn không hợp lệ");
    isoDeadline = d.toISOString();
  }

  const goals = await readJSON(KEYS.GOALS, []);
  const newGoal = {
    _id: genId("goal"),
    title: title.trim(),
    targetAmount: numTarget,
    currentAmount: 0,
    deadline: isoDeadline,
    status: "active",
    createdAt: new Date().toISOString(),
  };
  goals.push(newGoal);
  await writeJSON(KEYS.GOALS, goals);
  return enrichGoal(newGoal);
};

export const updateGoal = async (id, { title, targetAmount, deadline }) => {
  const goals = await readJSON(KEYS.GOALS, []);
  const idx = goals.findIndex((g) => g._id === id);
  if (idx === -1) throw new Error("Không tìm thấy mục tiêu");

  const g = { ...goals[idx] };
  if (title !== undefined) {
    if (!title.trim()) throw new Error("Tên mục tiêu không được để trống");
    g.title = title.trim();
  }
  if (targetAmount !== undefined) {
    const numTarget = Math.round(Number(targetAmount));
    if (!Number.isFinite(numTarget) || numTarget <= 0) {
      throw new Error("Số tiền mục tiêu phải lớn hơn 0");
    }
    g.targetAmount = numTarget;
  }
  if (deadline !== undefined) {
    if (!deadline) {
      g.deadline = null;
    } else {
      const d = new Date(deadline);
      if (Number.isNaN(d.getTime())) throw new Error("Ngày hạn không hợp lệ");
      g.deadline = d.toISOString();
    }
  }
  g.status = g.currentAmount >= g.targetAmount ? "completed" : "active";

  goals[idx] = g;
  await writeJSON(KEYS.GOALS, goals);
  return enrichGoal(g);
};

export const contributeToGoal = async (id, { amount, note, date }) => {
  const numAmount = Math.round(Number(amount));
  if (!Number.isFinite(numAmount) || numAmount <= 0) {
    throw new Error("Số tiền trích phải lớn hơn 0");
  }

  const goals = await readJSON(KEYS.GOALS, []);
  const idx = goals.findIndex((g) => g._id === id);
  if (idx === -1) throw new Error("Không tìm thấy mục tiêu");

  const goal = goals[idx];
  const txDate = date ? new Date(date) : new Date();
  if (Number.isNaN(txDate.getTime())) throw new Error("Ngày không hợp lệ");

  const txs = await readJSON(KEYS.TRANSACTIONS, []);
  const newTx = {
    _id: genId("tx"),
    type: "goal_deposit",
    amount: numAmount,
    categoryId: null,
    goalId: goal._id,
    note: note?.trim() ? note.trim() : `Trích vào mục tiêu: ${goal.title}`,
    date: txDate.toISOString(),
    createdAt: new Date().toISOString(),
  };
  txs.push(newTx);

  goal.currentAmount = (Number(goal.currentAmount) || 0) + numAmount;
  goal.status = goal.currentAmount >= goal.targetAmount ? "completed" : "active";
  goals[idx] = goal;

  await Promise.all([writeJSON(KEYS.TRANSACTIONS, txs), writeJSON(KEYS.GOALS, goals)]);
  return { goal: enrichGoal(goal), transaction: newTx };
};

export const deleteGoal = async (id, { keepTransactions = false } = {}) => {
  const goals = await readJSON(KEYS.GOALS, []);
  const exists = goals.some((g) => g._id === id);
  if (!exists) throw new Error("Không tìm thấy mục tiêu");

  await writeJSON(
    KEYS.GOALS,
    goals.filter((g) => g._id !== id)
  );

  if (!keepTransactions) {
    const txs = await readJSON(KEYS.TRANSACTIONS, []);
    await writeJSON(
      KEYS.TRANSACTIONS,
      txs.filter((t) => !(t.type === "goal_deposit" && t.goalId === id))
    );
  }
  return { deleted: true };
};

// ─── SUMMARY ──────────────────────────────────────────────────
export const getSummary = async (monthStr) => {
  const [txs, categories] = await Promise.all([
    readJSON(KEYS.TRANSACTIONS, []),
    getCategories(),
  ]);
  const catMap = Object.fromEntries(categories.map((c) => [c._id, c]));

  let totalIncomeAll = 0;
  let totalExpenseAll = 0;
  let totalSavedAll = 0;

  let monthIncome = 0;
  let monthExpense = 0;
  let monthSaved = 0;

  const catTotals = {};

  for (const tx of txs) {
    const amt = Number(tx.amount) || 0;
    if (tx.type === "income") totalIncomeAll += amt;
    if (tx.type === "expense") totalExpenseAll += amt;
    if (tx.type === "goal_deposit") totalSavedAll += amt;

    if (toMonthKey(tx.date) === monthStr) {
      if (tx.type === "income") monthIncome += amt;
      if (tx.type === "expense") {
        monthExpense += amt;
        const cId = tx.categoryId || "other";
        catTotals[cId] = (catTotals[cId] || 0) + amt;
      }
      if (tx.type === "goal_deposit") monthSaved += amt;
    }
  }

  const expenseByCategory = Object.entries(catTotals)
    .map(([cId, total]) => {
      const cat = catMap[cId];
      return {
        categoryId: cId,
        name: cat?.name || "Khác",
        color: cat?.color || "#94a3b8",
        icon: cat?.icon || "tag",
        total,
      };
    })
    .sort((a, b) => b.total - a.total);

  return {
    month: monthStr,
    monthIncome,
    monthExpense,
    monthSaved,
    monthNet: monthIncome - monthExpense - monthSaved,
    totalAvailableBalance: totalIncomeAll - totalExpenseAll - totalSavedAll,
    totalSavedAllTime: totalSavedAll,
    expenseByCategory,
  };
};

// ─── BACKUP & RESTORE ─────────────────────────────────────────
export const exportAllDataJSON = async () => {
  const [categories, transactions, goals] = await Promise.all([
    getCategories(),
    readJSON(KEYS.TRANSACTIONS, []),
    readJSON(KEYS.GOALS, []),
  ]);
  return JSON.stringify(
    {
      version: 1,
      exportedAt: new Date().toISOString(),
      categories,
      transactions,
      goals,
    },
    null,
    2
  );
};

export const importAllDataJSON = async (jsonString) => {
  const parsed = JSON.parse(jsonString);
  if (!parsed || typeof parsed !== "object") {
    throw new Error("Dữ liệu sao lưu không hợp lệ");
  }
  if (Array.isArray(parsed.categories) && parsed.categories.length > 0) {
    await writeJSON(KEYS.CATEGORIES, parsed.categories);
  }
  if (Array.isArray(parsed.transactions)) {
    await writeJSON(KEYS.TRANSACTIONS, parsed.transactions);
  }
  if (Array.isArray(parsed.goals)) {
    await writeJSON(KEYS.GOALS, parsed.goals);
  }
  return true;
};

export const resetAllData = async () => {
  await Promise.all([
    writeJSON(KEYS.CATEGORIES, DEFAULT_CATEGORIES),
    writeJSON(KEYS.TRANSACTIONS, []),
    writeJSON(KEYS.GOALS, []),
  ]);
  return true;
};
