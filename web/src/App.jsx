import { useState } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Layout from "./components/Layout";
import QuickAddModal from "./components/QuickAddModal";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import TransactionsPage from "./pages/TransactionsPage";
import GoalsPage from "./pages/GoalsPage";
import CategoriesPage from "./pages/CategoriesPage";
import { getCurrentMonth } from "./utils/format";

function ProtectedApp() {
  const { user, loading } = useAuth();
  const [month, setMonth] = useState(getCurrentMonth);
  const [showAdd, setShowAdd] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">Đang kiểm tra đăng nhập...</div>;
  }
  if (!user) return <Navigate to="/login" replace />;

  const triggerRefresh = () => setRefreshKey((k) => k + 1);

  return (
    <>
      <Layout month={month} setMonth={setMonth} onOpenAdd={() => setShowAdd(true)}>
        <Routes>
          <Route path="/" element={<DashboardPage month={month} refreshKey={refreshKey} />} />
          <Route
            path="/transactions"
            element={<TransactionsPage month={month} refreshKey={refreshKey} onChanged={triggerRefresh} />}
          />
          <Route
            path="/goals"
            element={<GoalsPage refreshKey={refreshKey} onChanged={triggerRefresh} />}
          />
          <Route path="/categories" element={<CategoriesPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>

      <QuickAddModal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        onCreated={triggerRefresh}
      />
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/*" element={<ProtectedApp />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
