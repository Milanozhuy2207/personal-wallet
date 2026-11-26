import { useEffect, useState } from "react";
import { X } from "lucide-react";
import api from "../api/client";
import { getTodayDateInput } from "../utils/format";

const QUICK_AMOUNTS = [20000, 50000, 100000, 200000, 500000, 1000000];

export default function QuickAddModal({ open, onClose, onCreated }) {
  const [type, setType] = useState("expense");
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(getTodayDateInput);
  const [categories, setCategories] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setError("");
    setDate(getTodayDateInput());
    api
      .get("/categories")
      .then((res) => setCategories(res.data))
      .catch(() => setError("Không tải được danh sách danh mục"));
  }, [open]);

  const filteredCategories = categories.filter((c) => c.type === type);

  useEffect(() => {
    if (filteredCategories.length === 0) {
      setCategoryId("");
    } else if (!filteredCategories.some((c) => c._id === categoryId)) {
      setCategoryId(filteredCategories[0]._id);
    }
  }, [type, categories, categoryId]);

  if (!open) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) {
      setError("Vui lòng nhập số tiền lớn hơn 0");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await api.post("/transactions", {
        type,
        amount: Number(amount),
        categoryId: categoryId || null,
        note,
        date: new Date(`${date}T12:00:00+07:00`).toISOString(),
      });
      setAmount("");
      setNote("");
      onCreated?.();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || "Không thể lưu giao dịch");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">Ghi giao dịch mới</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => setType("expense")}
            className={`rounded-lg py-2 text-sm font-semibold transition ${
              type === "expense" ? "bg-rose-500 text-white shadow-sm" : "text-slate-600"
            }`}
          >
            Chi tiêu
          </button>
          <button
            type="button"
            onClick={() => setType("income")}
            className={`rounded-lg py-2 text-sm font-semibold transition ${
              type === "income" ? "bg-emerald-500 text-white shadow-sm" : "text-slate-600"
            }`}
          >
            Thu nhập
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Số tiền (VNĐ)</label>
            <input
              type="number"
              min="1"
              placeholder="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-xl font-bold text-slate-900 outline-none focus:border-indigo-500"
              required
            />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {QUICK_AMOUNTS.map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setAmount(String((Number(amount) || 0) + val))}
                  className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-indigo-50 hover:text-indigo-600"
                >
                  +{val >= 1000000 ? `${val / 1000000}tr` : `${val / 1000}k`}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-500">Danh mục</label>
            <div className="flex flex-wrap gap-2">
              {filteredCategories.map((cat) => (
                <button
                  key={cat._id}
                  type="button"
                  onClick={() => setCategoryId(cat._id)}
                  className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                    categoryId === cat._id
                      ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: cat.color }}
                  />
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Ngày</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Ghi chú</label>
              <input
                type="text"
                placeholder="VD: Ăn trưa, đổ xăng..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {error && <p className="text-sm text-rose-600">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
          >
            {submitting ? "Đang lưu..." : "Lưu giao dịch"}
          </button>
        </form>
      </div>
    </div>
  );
}
