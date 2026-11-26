import { useCallback, useEffect, useState } from "react";
import { Pencil, Trash2, X } from "lucide-react";
import api from "../api/client";
import { formatDate, formatVND, toDateInputValue } from "../utils/format";

export default function TransactionsPage({ month, refreshKey, onChanged }) {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [filterType, setFilterType] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [editingTx, setEditingTx] = useState(null);
  const [editAmount, setEditAmount] = useState("");
  const [editCategoryId, setEditCategoryId] = useState("");
  const [editNote, setEditNote] = useState("");
  const [editDate, setEditDate] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const loadData = useCallback(() => {
    setLoading(true);
    setError("");
    const params = new URLSearchParams({ month });
    if (filterType) params.set("type", filterType);
    api
      .get(`/transactions?${params.toString()}`)
      .then((res) => setItems(res.data))
      .catch((err) => setError(err.response?.data?.message || "Không thể tải lịch sử giao dịch"))
      .finally(() => setLoading(false));
  }, [month, filterType]);

  useEffect(() => {
    loadData();
  }, [loadData, refreshKey]);

  useEffect(() => {
    api
      .get("/categories")
      .then((res) => setCategories(res.data))
      .catch(() => {});
  }, []);

  const openEdit = (tx) => {
    setEditingTx(tx);
    setEditAmount(String(tx.amount));
    setEditCategoryId(tx.categoryId?._id || "");
    setEditNote(tx.note || "");
    setEditDate(toDateInputValue(tx.date));
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingTx || !editAmount || Number(editAmount) <= 0) return;
    setSavingEdit(true);
    setError("");
    try {
      await api.patch(`/transactions/${editingTx._id}`, {
        amount: Number(editAmount),
        categoryId: editingTx.type === "goal_deposit" ? undefined : editCategoryId || null,
        note: editNote,
        date: new Date(`${editDate}T12:00:00+07:00`).toISOString(),
      });
      setEditingTx(null);
      if (onChanged) {
        onChanged();
      } else {
        loadData();
      }
    } catch (err) {
      setError(err.response?.data?.message || "Không thể cập nhật giao dịch");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Xóa giao dịch này?")) return;
    setError("");
    try {
      await api.delete(`/transactions/${id}`);
      if (onChanged) {
        onChanged();
      } else {
        loadData();
      }
    } catch (err) {
      setError(err.response?.data?.message || "Không thể xóa giao dịch");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-slate-900">Lịch sử giao dịch</h2>
        <div className="flex gap-2">
          {[
            { value: "", label: "Tất cả" },
            { value: "income", label: "Thu nhập" },
            { value: "expense", label: "Chi tiêu" },
            { value: "goal_deposit", label: "Trích tiết kiệm" },
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => setFilterType(tab.value)}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition ${
                filterType === tab.value
                  ? "bg-indigo-600 text-white"
                  : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-medium text-rose-700">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <p className="py-12 text-center text-sm text-slate-400">Đang tải...</p>
        ) : items.length === 0 ? (
          <p className="py-12 text-center text-sm text-slate-400">Không có giao dịch nào</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-100 bg-slate-50 text-xs text-slate-500">
                <tr>
                  <th className="px-4 py-3">Ngày</th>
                  <th className="px-4 py-3">Danh mục / Mục tiêu</th>
                  <th className="px-4 py-3">Ghi chú</th>
                  <th className="px-4 py-3 text-right">Số tiền</th>
                  <th className="px-4 py-3 text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((tx) => (
                  <tr key={tx._id} className="hover:bg-slate-50">
                    <td className="whitespace-nowrap px-4 py-3 text-slate-500">
                      {formatDate(tx.date)}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-800">
                      <span className="inline-flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{
                            backgroundColor:
                              tx.type === "goal_deposit"
                                ? "#f59e0b"
                                : tx.categoryId?.color || "#94a3b8",
                          }}
                        />
                        {tx.type === "goal_deposit"
                          ? `Mục tiêu: ${tx.goalId?.title || "Đã xóa"}`
                          : tx.categoryId?.name || "Khác"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{tx.note || "—"}</td>
                    <td
                      className={`whitespace-nowrap px-4 py-3 text-right font-bold ${
                        tx.type === "income"
                          ? "text-emerald-600"
                          : tx.type === "goal_deposit"
                          ? "text-amber-600"
                          : "text-rose-600"
                      }`}
                    >
                      {tx.type === "income" ? "+" : "-"}
                      {formatVND(tx.amount)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <button
                        onClick={() => openEdit(tx)}
                        className="mr-1 rounded-lg p-1.5 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600"
                        title="Sửa"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(tx._id)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                        title="Xóa"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editingTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <form
            onSubmit={handleSaveEdit}
            className="w-full max-w-md space-y-4 rounded-2xl bg-white p-6 shadow-xl"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">Chỉnh sửa giao dịch</h3>
              <button
                type="button"
                onClick={() => setEditingTx(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Số tiền (VNĐ)</label>
              <input
                type="number"
                min="1"
                value={editAmount}
                onChange={(e) => setEditAmount(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-lg font-bold outline-none focus:border-indigo-500"
                required
              />
            </div>

            {editingTx.type !== "goal_deposit" && (
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">Danh mục</label>
                <select
                  value={editCategoryId}
                  onChange={(e) => setEditCategoryId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                >
                  <option value="">Khác</option>
                  {categories
                    .filter((c) => c.type === editingTx.type)
                    .map((cat) => (
                      <option key={cat._id} value={cat._id}>
                        {cat.name}
                      </option>
                    ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">Ngày</label>
                <input
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">Ghi chú</label>
                <input
                  type="text"
                  value={editNote}
                  onChange={(e) => setEditNote(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setEditingTx(null)}
                className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-600"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={savingEdit}
                className="flex-1 rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
              >
                {savingEdit ? "Đang lưu..." : "Lưu thay đổi"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
