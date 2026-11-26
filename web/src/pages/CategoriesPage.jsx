import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import api from "../api/client";

const PRESET_COLORS = [
  "#10b981", "#06b6d4", "#3b82f6", "#6366f1",
  "#8b5cf6", "#ec4899", "#f43f5e", "#f97316", "#eab308",
];

export default function CategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [name, setName] = useState("");
  const [type, setType] = useState("expense");
  const [color, setColor] = useState("#3b82f6");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const loadCategories = () => {
    setError("");
    api
      .get("/categories")
      .then((res) => setCategories(res.data))
      .catch((err) => setError(err.response?.data?.message || "Không thể tải danh mục"));
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    setError("");
    try {
      await api.post("/categories", { name: name.trim(), type, color });
      setName("");
      loadCategories();
    } catch (err) {
      setError(err.response?.data?.message || "Không thể thêm danh mục");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Xóa danh mục này? Các giao dịch thuộc danh mục này sẽ chuyển về 'Khác'.")) return;
    setError("");
    try {
      await api.delete(`/categories/${id}`);
      loadCategories();
    } catch (err) {
      setError(err.response?.data?.message || "Không thể xóa danh mục");
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-bold text-slate-900">Quản lý danh mục</h2>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-medium text-rose-700">
          {error}
        </div>
      )}

      <form
        onSubmit={handleAdd}
        className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
      >
        <input
          type="text"
          placeholder="Tên danh mục mới..."
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="min-w-[200px] flex-1 rounded-xl border border-slate-200 px-3.5 py-2 text-sm outline-none focus:border-indigo-500"
          required
        />
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none"
        >
          <option value="expense">Chi tiêu</option>
          <option value="income">Thu nhập</option>
        </select>
        <div className="flex items-center gap-1.5">
          {PRESET_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              className={`h-6 w-6 rounded-full border-2 ${
                color === c ? "border-slate-900 scale-110" : "border-transparent"
              }`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          <Plus className="h-4 w-4" /> {submitting ? "Đang thêm..." : "Thêm"}
        </button>
      </form>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {["expense", "income"].map((groupType) => (
          <div key={groupType} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="mb-3 text-sm font-bold text-slate-800">
              {groupType === "expense" ? "Danh mục Chi tiêu" : "Danh mục Thu nhập"}
            </h3>
            <div className="divide-y divide-slate-100">
              {categories
                .filter((c) => c.type === groupType)
                .map((cat) => (
                  <div key={cat._id} className="flex items-center justify-between py-2.5">
                    <div className="flex items-center gap-2.5 text-sm font-medium text-slate-700">
                      <span
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: cat.color }}
                      />
                      {cat.name}
                    </div>
                    <button
                      onClick={() => handleDelete(cat._id)}
                      className="rounded-lg p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
