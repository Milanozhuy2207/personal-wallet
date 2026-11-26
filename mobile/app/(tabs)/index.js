import { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import api from "../../src/api/client";
import { useAuth } from "../../src/context/AuthContext";
import { formatDate, formatVND, getCurrentMonth, shiftMonth } from "../../src/utils/format";

export default function HomeScreen() {
  const [month, setMonth] = useState(getCurrentMonth);
  const [summary, setSummary] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const { logout } = useAuth();

  const loadData = async () => {
    setRefreshing(true);
    try {
      const [sumRes, txRes] = await Promise.all([
        api.get(`/summary?month=${month}`),
        api.get(`/transactions?month=${month}`),
      ]);
      setSummary(sumRes.data);
      setTransactions(txRes.data);
    } catch {
      Alert.alert("Lỗi", "Không tải được dữ liệu ví");
    } finally {
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [month])
  );

  const handleDeleteTx = (id) => {
    Alert.alert("Xóa giao dịch", "Bạn chắc chắn muốn xóa giao dịch này?", [
      { text: "Hủy", style: "cancel" },
      {
        text: "Xóa",
        style: "destructive",
        onPress: async () => {
          try {
            await api.delete(`/transactions/${id}`);
            loadData();
          } catch (err) {
            Alert.alert("Lỗi", err.response?.data?.message || "Không thể xóa giao dịch");
          }
        },
      },
    ]);
  };

  const [y, m] = month.split("-");

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadData} />}
    >
      {/* Month selector + Logout */}
      <View style={styles.topRow}>
        <View style={styles.monthPicker}>
          <TouchableOpacity onPress={() => setMonth(shiftMonth(month, -1))} style={styles.iconBtn}>
            <Ionicons name="chevron-back" size={18} color="#334155" />
          </TouchableOpacity>
          <Text style={styles.monthText}>Tháng {Number(m)}/{y}</Text>
          <TouchableOpacity onPress={() => setMonth(shiftMonth(month, 1))} style={styles.iconBtn}>
            <Ionicons name="chevron-forward" size={18} color="#334155" />
          </TouchableOpacity>
        </View>
        <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
          <Ionicons name="log-out-outline" size={20} color="#e11d48" />
        </TouchableOpacity>
      </View>

      {/* Main Balance Card */}
      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>Số dư khả dụng hiện có</Text>
        <Text style={styles.balanceValue}>{formatVND(summary?.totalAvailableBalance || 0)}</Text>
        <View style={styles.kpiRow}>
          <View style={styles.kpiItem}>
            <Text style={styles.kpiLabel}>Thu tháng</Text>
            <Text style={[styles.kpiNum, { color: "#6ee7b7" }]}>
              +{formatVND(summary?.monthIncome || 0)}
            </Text>
          </View>
          <View style={styles.kpiItem}>
            <Text style={styles.kpiLabel}>Chi tháng</Text>
            <Text style={[styles.kpiNum, { color: "#fda4af" }]}>
              -{formatVND(summary?.monthExpense || 0)}
            </Text>
          </View>
          <View style={styles.kpiItem}>
            <Text style={styles.kpiLabel}>Tiết kiệm</Text>
            <Text style={[styles.kpiNum, { color: "#fcd34d" }]}>
              {formatVND(summary?.monthSaved || 0)}
            </Text>
          </View>
        </View>
      </View>

      {/* Recent Transactions */}
      <Text style={styles.sectionTitle}>Giao dịch tháng {Number(m)}</Text>
      {transactions.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>Chưa có giao dịch nào. Qua tab "Ghi nhanh" để thêm!</Text>
        </View>
      ) : (
        transactions.map((tx) => (
          <TouchableOpacity
            key={tx._id}
            style={styles.txRow}
            onLongPress={() => handleDeleteTx(tx._id)}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.txTitle}>
                {tx.type === "goal_deposit"
                  ? `Tiết kiệm: ${tx.goalId?.title || "Mục tiêu"}`
                  : tx.categoryId?.name || "Khác"}
              </Text>
              <Text style={styles.txSub}>
                {formatDate(tx.date)} {tx.note ? `• ${tx.note}` : ""}
              </Text>
            </View>
            <Text
              style={[
                styles.txAmount,
                tx.type === "income"
                  ? { color: "#059669" }
                  : tx.type === "goal_deposit"
                  ? { color: "#d97706" }
                  : { color: "#e11d48" },
              ]}
            >
              {tx.type === "income" ? "+" : "-"}
              {formatVND(tx.amount)}
            </Text>
          </TouchableOpacity>
        ))
      )}
      {transactions.length > 0 && (
        <Text style={styles.hint}>Mẹo: Nhấn giữ vào giao dịch để xóa</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  monthPicker: { flexDirection: "row", alignItems: "center", gap: 10 },
  iconBtn: { backgroundColor: "#fff", padding: 8, borderRadius: 10, borderWidth: 1, borderColor: "#e2e8f0" },
  monthText: { fontSize: 15, fontWeight: "700", color: "#0f172a" },
  logoutBtn: { padding: 8, backgroundColor: "#fff1f2", borderRadius: 10 },
  balanceCard: { backgroundColor: "#4f46e5", borderRadius: 20, padding: 20, marginBottom: 20 },
  balanceLabel: { color: "#c7d2fe", fontSize: 13 },
  balanceValue: { color: "#fff", fontSize: 28, fontWeight: "800", marginTop: 4, marginBottom: 16 },
  kpiRow: { flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.15)", paddingTop: 12 },
  kpiItem: { flex: 1 },
  kpiLabel: { color: "#c7d2fe", fontSize: 11 },
  kpiNum: { fontSize: 13, fontWeight: "700", marginTop: 2 },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: "#1e293b", marginBottom: 10 },
  emptyBox: { backgroundColor: "#fff", padding: 24, borderRadius: 16, alignItems: "center" },
  emptyText: { color: "#94a3b8", fontSize: 13, textAlign: "center" },
  txRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  txTitle: { fontSize: 14, fontWeight: "600", color: "#0f172a" },
  txSub: { fontSize: 12, color: "#94a3b8", marginTop: 2 },
  txAmount: { fontSize: 14, fontWeight: "700" },
  hint: { textAlign: "center", color: "#94a3b8", fontSize: 11, marginTop: 8 },
});
