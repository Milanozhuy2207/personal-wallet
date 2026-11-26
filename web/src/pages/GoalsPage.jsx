import { useCallback, useEffect, useState } from "react";
import { Plus, PiggyBank, Trash2, CheckCircle2, Calendar, Pencil } from "lucide-react";
import api from "../api/client";
import { formatDate, formatVND, toDateInputValue } from "../utils/format";

export default function GoalsPage({ refreshKey, onChanged }) {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [title, setTitle] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [deadline, setDeadline] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  const [activeGoal, setActiveGoal] = useState(null);
  const [depositAmount, setDepositAmount] = useState("");
  const [depositNote, setDepositNote] = useState("");

  const [editingGoal, setEditingGoal] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [editTarget, setEditTarget] = useState("");
  const [editDeadline, setEditDeadline] = useState("");

  const loadGoals = useCallback(() => {
    setLoading(true);
    setError("");
    api
      .get("/goals")
      .then((res) => setGoals(res.data))
      .catch((err) => setError(err.response?.data?.message || "Không thể tải danh sách mục tiêu"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadGoals();
  }, [loadGoals, refreshKey]);

  const handleCreateGoal = async (e) => {
    e.preventDefault();
    if (!title.trim() || !targetAmount || Number(targetAmount) <= 0) return;
    setSubmitting(true);
    setError("");
    try {
      await api.post("/goals", {
        title: title.trim(),
        targetAmount: Number(targetAmount),
        deadline: deadline || null,
      });
      setTitle("");
      setTargetAmount("");
      setDeadline("");
      setShowCreate(false);
      if (onChanged) {
        onChanged();
      } else {
        loadGoals();
      }
    } catch (err) {
      setError(err.response?.data?.message || "Không thể tạo mục tiêu");
    } finally {
      setSubmitting(false);
    }
  };

  const openEditGoal = (g) => {
    setEditingGoal(g);
    setEditTitle(g.title);
    setEditTarget(String(g.targetAmount));
    setEditDeadline(g.deadline ? toDateInputValue(g.deadline) : "");
  };

  const handleSaveEditGoal = async (e) => {
    e.preventDefault();
    if (!editingGoal || !editTitle.trim() || !editTarget || Number(editTarget) <= 0) return;
    setSubmitting(true);
    setError("");
    try {
      await api.patch(`/goals/${editingGoal._id}`, {
        title: editTitle.trim(),
        targetAmount: Number(editTarget),
        deadline: editDeadline || null,
      });
      setEditingGoal(null);
      if (onChanged) {
        onChanged();
      } else {
        loadGoals();
      }
    } catch (err) {
      setError(err.response?.data?.message || "Không thể cập nhật mục tiêu");
    } finally {
      setSubmitting(false);
    }
  };

  const handleContribute = async (e) => {
    e.preventDefault();
    if (!activeGoal || !depositAmount || Number(depositAmount) <= 0) return;
    setSubmitting(true);
    setError("");
    try {
      await api.post(`/goals/${activeGoal._id}/contribute`, {
        amount: Number(depositAmount),
        note: depositNote,
      });
      setActiveGoal(null);
      setDepositAmount("");
      setDepositNote("");
      if (onChanged) {
        onChanged();
      } else {
        loadGoals();
      }
    } catch (err) {
      setError(err.response?.data?.message || "Không thể trích tiền vào mục tiêu");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Xóa mục tiêu này? Tiền đã trích sẽ được hoàn lại số dư khả dụng.")) return;
    setError("");
    try {
      await api.delete(`/goals/${id}`);
      if (onChanged) {
        onChanged();
      } else {
        loadGoals();
      }
    } catch (err) {
      setError(err.response?.data?.message || "Không thể xóa mục tiêu");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Mục tiêu tiết kiệm</h2>
          <p className="text-xs text-slate-500">
            Trích tiền từ ví vào mục tiêu để tách riêng khoản để dành cho kế hoạch sắp tới
          </p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" /> Tạo mục tiêu
        </button>
      </div>

      {showCreate && (
        <form
          onSubmit={handleCreateGoal}
          className="grid grid-cols-1 gap-3 rounded-2xl border border-indigo-100 bg-white p-5 shadow-sm sm:grid-cols-4"
        >
          <input
            type="text"
            placeholder="Tên mục tiêu (VD: Mua màn hình mới)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="rounded-xl border border-slate-200 px-3.5 py-2 text-sm outline-none focus:border-indigo-500 sm:col-span-2"
            required
          />
          <input
            type="number"
            min="1"
            placeholder="Số tiền mục tiêu (VNĐ)"
            value={targetAmount}
            onChange={(e) => setTargetAmount(e.target.value)}
            className="rounded-xl border border-slate-200 px-3.5 py-2 text-sm outline-none focus:border-indigo-500"
            required
          />
          <div className="flex gap-2">
            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-500"
            />
            <button
              type="submit"
              disabled={submitting}
              className="shrink-0 rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              {submitting ? "..." : "Lưu"}
            </button>
          </div>
        </form>
      )}

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-medium text-rose-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="py-12 text-center text-sm text-slate-400">Đang tải mục tiêu...</div>
      ) : goals.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center text-sm text-slate-400">
          Chưa có mục tiêu tiết kiệm nào. Nhấn "Tạo mục tiêu" để bắt đầu.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {goals.map((g) => (
            <div
              key={g._id}
              className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div>
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900">{g.title}</h3>
                    {g.status === "completed" && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Hoàn thành
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditGoal(g)}
                      className="rounded-lg p-1 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600"
                      title="Sửa mục tiêu"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(g._id)}
                      className="rounded-lg p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                      title="Xóa mục tiêu"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="mb-2 flex items-baseline justify-between">
                  <span className="text-lg font-bold text-indigo-600">
                    {formatVND(g.currentAmount)}
                  </span>
                  <span className="text-xs text-slate-500">/ {formatVND(g.targetAmount)}</span>
                </div>

                <div className="mb-3 h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full transition-all ${
                      g.status === "completed" ? "bg-emerald-500" : "bg-indigo-600"
                    }`}
                    style={{ width: `${g.progress}%` }}
                  />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                  <span>Tiến độ: {g.progress}% (còn {formatVND(g.remaining)})</span>
                  {g.deadline && (
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" /> Hạn: {formatDate(g.deadline)}
                    </span>
                  )}
                </div>

                {g.suggestedMonthly && (
                  <p className="mt-2 rounded-lg bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-800">
                    Gợi ý: để dành khoảng <strong>{formatVND(g.suggestedMonthly)}/tháng</strong> để kịp hạn.
                  </p>
                )}
              </div>

              {g.status !== "completed" && (
                <button
                  onClick={() => setActiveGoal(g)}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 py-2.5 text-xs font-semibold text-white hover:bg-slate-800"
                >
                  <PiggyBank className="h-4 w-4" /> Trích tiền vào mục tiêu này
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal nạp tiền vào mục tiêu */}
      {activeGoal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <form
            onSubmit={handleContribute}
            className="w-full max-w-sm space-y-4 rounded-2xl bg-white p-6 shadow-xl"
          >
            <h3 className="text-base font-bold text-slate-900">
              Nạp vào: {activeGoal.title}
            </h3>
            <p className="text-xs text-slate-500">
              Còn thiếu {formatVND(activeGoal.remaining)} để đạt mục tiêu.
            </p>
            <input
              type="number"
              min="1"
              placeholder="Số tiền muốn trích (VNĐ)"
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-lg font-bold outline-none focus:border-indigo-500"
              required
            />
            <input
              type="text"
              placeholder="Ghi chú (tùy chọn)"
              value={depositNote}
              onChange={(e) => setDepositNote(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm outline-none focus:border-indigo-500"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setActiveGoal(null)}
                className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-600"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
              >
                {submitting ? "Đang trích..." : "Xác nhận trích"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal sửa mục tiêu */}
      {editingGoal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <form
            onSubmit={handleSaveEditGoal}
            className="w-full max-w-sm space-y-4 rounded-2xl bg-white p-6 shadow-xl"
          >
            <h3 className="text-base font-bold text-slate-900">Chỉnh sửa mục tiêu</h3>
            <input
              type="text"
              placeholder="Tên mục tiêu"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm outline-none focus:border-indigo-500"
              required
            />
            <input
              type="number"
              min="1"
              placeholder="Số tiền mục tiêu (VNĐ)"
              value={editTarget}
              onChange={(e) => setEditTarget(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm outline-none focus:border-indigo-500"
              required
            />
            <input
              type="date"
              value={editDeadline}
              onChange={(e) => setEditDeadline(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm outline-none focus:border-indigo-500"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setEditingGoal(null)}
                className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-600"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
              >
                {submitting ? "Đang lưu..." : "Lưu thay đổi"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
