import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  ArrowLeftRight,
  Target,
  Tags,
  Plus,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Wallet,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { formatMonthLabel, shiftMonth } from "../utils/format";

const NAV_ITEMS = [
  { to: "/", label: "Tổng quan", shortLabel: "Tổng quan", icon: LayoutDashboard },
  { to: "/transactions", label: "Giao dịch", shortLabel: "Giao dịch", icon: ArrowLeftRight },
  { to: "/goals", label: "Mục tiêu tiết kiệm", shortLabel: "Mục tiêu", icon: Target },
  { to: "/categories", label: "Danh mục", shortLabel: "Danh mục", icon: Tags },
];

export default function Layout({ month, setMonth, onOpenAdd, children }) {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50 md:flex">
      {/* Sidebar Desktop */}
      <aside className="hidden w-64 flex-col border-r border-slate-200 bg-white p-5 md:flex">
        <div className="mb-8 flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white">
            <Wallet className="h-5 w-5" />
          </div>
          <div>
            <p className="text-base font-bold text-slate-900">Ví Cá Nhân</p>
            <p className="text-xs text-slate-500">Thu chi & Tiết kiệm</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition ${
                  isActive
                    ? "bg-indigo-50 text-indigo-700"
                    : "text-slate-600 hover:bg-slate-100"
                }`
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="mt-6 border-t border-slate-100 pt-4">
          <p className="truncate text-xs text-slate-500">{user?.email}</p>
          <button
            onClick={logout}
            className="mt-2 flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50"
          >
            <LogOut className="h-4 w-4" /> Đăng xuất
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex flex-1 flex-col">
        <header className="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur md:px-8">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMonth(shiftMonth(month, -1))}
              className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-100"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="min-w-[115px] text-center text-sm font-bold text-slate-800">
              {formatMonthLabel(month)}
            </span>
            <button
              onClick={() => setMonth(shiftMonth(month, 1))}
              className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-100"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onOpenAdd}
              className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
            >
              <Plus className="h-4 w-4" /> Ghi thu / chi
            </button>
            <button
              onClick={logout}
              title="Đăng xuất"
              className="rounded-xl border border-rose-100 bg-rose-50 p-2 text-rose-600 hover:bg-rose-100 md:hidden"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </header>

        {/* Mobile Bottom Nav */}
        <nav className="fixed bottom-0 left-0 right-0 z-30 flex justify-around border-t border-slate-200 bg-white py-2 md:hidden">
          {NAV_ITEMS.map(({ to, shortLabel, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 text-[11px] font-medium ${
                  isActive ? "text-indigo-600" : "text-slate-500"
                }`
              }
            >
              <Icon className="h-5 w-5" />
              {shortLabel}
            </NavLink>
          ))}
        </nav>

        <main className="mx-auto w-full max-w-6xl flex-1 p-4 pb-20 md:p-8 md:pb-8">
          {children}
        </main>
      </div>
    </div>
  );
}
