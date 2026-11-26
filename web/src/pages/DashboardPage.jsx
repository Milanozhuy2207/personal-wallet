import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from "recharts";
import { Wallet, TrendingUp, TrendingDown, PiggyBank, ArrowRight, RefreshCw } from "lucide-react";
import api from "../api/client";
import { formatDate, formatShortVND, formatVND } from "../utils/format";

export default function DashboardPage({ month, refreshKey }) {
  const [summary, setSummary] = useState(null);
  const [goals, setGoals] = useState([]);
  const [recentTx, setRecentTx] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchDashboard = useCallback(() => {
    setLoading(true);
    setError("");
    Promise.all([
      api.get(`/summary?month=${month}`),
      api.get("/goals"),
      api.get(`/transactions?month=${month}`),
    ])
      .then(([sumRes, goalRes, txRes]) => {
        setSummary(sumRes.data);
        setGoals(goalRes.data.slice(0, 3));
        setRecentTx(txRes.data.slice(0, 6));
      })
      .catch((err) => {
        setError(err.response?.data?.message || "Không thể kết nối máy chủ để tải dữ liệu ví.");
      })
      .finally(() => setLoading(false));
  }, [month]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard, refreshKey]);

  if (loading) {
    return <div className="py-12 text-center text-sm text-slate-500">Đang tải dữ liệu ví...</div>;
  }

  if (error || !summary) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center">
        <p className="text-sm font-medium text-rose-700">{error || "Không có dữ liệu tổng quan"}</p>
        <button
          onClick={fetchDashboard}
          className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Thử lại
        </button>
      </div>
    );
  }

  const cards = [
    {
      label: "Số dư khả dụng (hiện có)",
      value: summary.totalAvailableBalance,
      icon: Wallet,
      color: "text-indigo-600 bg-indigo-50",
    },
    {
      label: "Thu nhập tháng này",
      value: summary.monthIncome,
      icon: TrendingUp,
      color: "text-emerald-600 bg-emerald-50",
    },
    {
      label: "Chi tiêu tháng này",
      value: summary.monthExpense,
      icon: TrendingDown,
      color: "text-rose-600 bg-rose-50",
    },
    {
      label: "Đã trích mục tiêu tháng này",
      value: summary.monthSaved,
      icon: PiggyBank,
      color: "text-amber-600 bg-amber-50",
    },
  ];

  return (
    <div className="space-y-6">
      {/* 4 KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <div key={c.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">{c.label}</span>
                <div className={`rounded-xl p-2 ${c.color}`}>
                  <Icon className="h-4 w-4" />
                </div>
              </div>
              <p className="text-xl font-bold text-slate-900">{formatVND(c.value)}</p>
            </div>
          );
        })}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Pie Chart */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-bold text-slate-800">Tỷ trọng chi tiêu theo danh mục</h3>
          {summary.expenseByCategory.length === 0 ? (
            <p className="py-16 text-center text-sm text-slate-400">Chưa có khoản chi nào trong tháng này</p>
          ) : (
            <div className="grid grid-cols-1 items-center gap-4 sm:grid-cols-2">
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={summary.expenseByCategory}
                      dataKey="total"
                      nameKey="name"
                      innerRadius={52}
                      outerRadius={85}
                      paddingAngle={2}
                    >
                      {summary.expenseByCategory.map((entry, idx) => (
                        <Cell key={idx} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(val) => formatVND(val)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2.5">
                {summary.expenseByCategory.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="font-medium text-slate-700">{item.name}</span>
                    </div>
                    <span className="font-semibold text-slate-900">{formatVND(item.total)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 6-month Trend Bar Chart */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-bold text-slate-800">Thu - Chi - Tiết kiệm (6 tháng gần nhất)</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={summary.monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={formatShortVND} tick={{ fontSize: 11 }} width={48} />
                <Tooltip formatter={(val) => formatVND(val)} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="income" name="Thu nhập" fill="#10b981" radius={[6, 6, 0, 0]} />
                <Bar dataKey="expense" name="Chi tiêu" fill="#f43f5e" radius={[6, 6, 0, 0]} />
                <Bar dataKey="saved" name="Tiết kiệm" fill="#f59e0b" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Bottom Row: Goals + Recent Transactions */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800">Mục tiêu tiết kiệm sắp tới</h3>
            <Link to="/goals" className="flex items-center gap-1 text-xs font-semibold text-indigo-600">
              Xem tất cả <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          {goals.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">
              Chưa có mục tiêu nào. Hãy tạo mục tiêu đầu tiên!
            </p>
          ) : (
            <div className="space-y-4">
              {goals.map((g) => (
                <div key={g._id} className="rounded-xl bg-slate-50 p-3.5">
                  <div className="mb-1.5 flex items-center justify-between text-sm">
                    <span className="font-semibold text-slate-800">{g.title}</span>
                    <span className="text-xs font-bold text-indigo-600">{g.progress}%</span>
                  </div>
                  <div className="mb-2 h-2 w-full overflow-hidden rounded-full bg-slate-200">
                    <div
                      className="h-full rounded-full bg-indigo-600 transition-all"
                      style={{ width: `${g.progress}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>Đã gom: {formatVND(g.currentAmount)}</span>
                    <span>Mục tiêu: {formatVND(g.targetAmount)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800">Giao dịch gần đây</h3>
            <Link to="/transactions" className="flex items-center gap-1 text-xs font-semibold text-indigo-600">
              Chi tiết <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          {recentTx.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">Chưa có giao dịch nào trong tháng này</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {recentTx.map((tx) => (
                <div key={tx._id} className="flex items-center justify-between py-2.5 text-sm">
                  <div>
                    <p className="font-medium text-slate-800">
                      {tx.type === "goal_deposit"
                        ? `Tiết kiệm: ${tx.goalId?.title || "Mục tiêu"}`
                        : tx.categoryId?.name || "Khác"}
                    </p>
                    <p className="text-xs text-slate-400">
                      {formatDate(tx.date)} {tx.note ? `• ${tx.note}` : ""}
                    </p>
                  </div>
                  <span
                    className={`font-bold ${
                      tx.type === "income"
                        ? "text-emerald-600"
                        : tx.type === "goal_deposit"
                        ? "text-amber-600"
                        : "text-rose-600"
                    }`}
                  >
                    {tx.type === "income" ? "+" : "-"}
                    {formatVND(tx.amount)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
