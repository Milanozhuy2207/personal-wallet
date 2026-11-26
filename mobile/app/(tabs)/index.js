import { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  deleteTransaction,
  getCategories,
  getSummary,
  getTransactions,
  updateTransaction,
} from "../../src/storage/walletStore";
import {
  formatDate,
  formatVND,
  getCurrentMonth,
  getTodayDateInput,
  shiftMonth,
} from "../../src/utils/format";

const FILTER_TABS = [
  { value: "", label: "Tất cả" },
  { value: "expense", label: "Chi tiêu" },
  { value: "income", label: "Thu nhập" },
  { value: "goal_deposit", label: "Tiết kiệm" },
];

export default function HomeScreen() {
  const [month, setMonth] = useState(getCurrentMonth);
  const [filterType, setFilterType] = useState("");
  const [summary, setSummary] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  // Edit modal
  const [editingTx, setEditingTx] = useState(null);
  const [editAmount, setEditAmount] = useState("");
  const [editCategoryId, setEditCategoryId] = useState(null);
  const [editNote, setEditNote] = useState("");
  const [editDate, setEditDate] = useState("");

  const loadData = useCallback(async () => {
    setRefreshing(true);
    try {
      const [sumData, txData, catData] = await Promise.all([
        getSummary(month),
        getTransactions({ month, type: filterType || undefined }),
        getCategories(),
      ]);
      setSummary(sumData);
      setTransactions(txData);
      setCategories(catData);
    } catch {
      Alert.alert("Lỗi", "Không tải được dữ liệu ví");
    } finally {
      setRefreshing(false);
    }
  }, [month, filterType]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const openEditTx = (tx) => {
    setEditingTx(tx);
    setEditAmount(String(tx.amount));
    setEditCategoryId(tx.categoryId?._id || null);
    setEditNote(tx.note || "");
    const d = tx.date ? new Date(tx.date) : new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    setEditDate(`${y}-${m}-${day}`);
  };

  const handleSaveEdit = async () => {
    if (!editingTx) return;
    const numAmount = Number(editAmount.replace(/[^0-9]/g, ""));
    if (!numAmount || numAmount <= 0) {
      Alert.alert("Lỗi", "Số tiền phải lớn hơn 0");
      return;
    }
    if (editDate && !/^\d{4}-\d{2}-\d{2}$/.test(editDate.trim())) {
      Alert.alert("Lỗi", "Ngày phải có định dạng YYYY-MM-DD");
      return;
    }
    try {
      await updateTransaction(editingTx._id, {
        amount: numAmount,
        categoryId: editingTx.type === "goal_deposit" ? undefined : editCategoryId,
        note: editNote,
        date: editDate ? new Date(`${editDate.trim()}T12:00:00+07:00`).toISOString() : undefined,
      });
      setEditingTx(null);
      loadData();
    } catch (err) {
      Alert.alert("Lỗi", err.message || "Không thể cập nhật giao dịch");
    }
  };

  const handleDeleteTx = (id) => {
    Alert.alert("Xóa giao dịch", "Bạn chắc chắn muốn xóa giao dịch này?", [
      { text: "Hủy", style: "cancel" },
      {
        text: "Xóa",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteTransaction(id);
            loadData();
          } catch (err) {
            Alert.alert("Lỗi", err.message || "Không thể xóa giao dịch");
          }
        },
      },
    ]);
  };

  const [y, m] = month.split("-");

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadData} />}
      >
        {/* Month selector + Offline badge */}
        <View style={styles.topRow}>
          <View style={styles.monthPicker}>
            <TouchableOpacity onPress={() => setMonth(shiftMonth(month, -1))} style={styles.iconBtn}>
              <Ionicons name="chevron-back" size={18} color="#334155" />
            </TouchableOpacity>
            <Text style={styles.monthText}>
              Tháng {Number(m)}/{y}
            </Text>
            <TouchableOpacity onPress={() => setMonth(shiftMonth(month, 1))} style={styles.iconBtn}>
              <Ionicons name="chevron-forward" size={18} color="#334155" />
            </TouchableOpacity>
          </View>
          <View style={styles.offlineBadge}>
            <Ionicons name="phone-portrait-outline" size={14} color="#059669" />
            <Text style={styles.offlineText}>Offline</Text>
          </View>
        </View>

        {/* Main Balance Card */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Số dư khả dụng hiện có</Text>
          <Text style={styles.balanceValue}>
            {formatVND(summary?.totalAvailableBalance || 0)}
          </Text>
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

        {/* Expense Breakdown by Category */}
        {summary?.expenseByCategory?.length > 0 && (
          <View style={styles.breakdownCard}>
            <Text style={styles.cardHeading}>Chi tiêu theo danh mục (Tháng {Number(m)})</Text>
            {summary.expenseByCategory.map((item) => {
              const pct =
                summary.monthExpense > 0
                  ? Math.round((item.total / summary.monthExpense) * 100)
                  : 0;
              return (
                <View key={item.categoryId} style={{ marginBottom: 10 }}>
                  <View style={styles.catRowBetween}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <View style={[styles.colorDot, { backgroundColor: item.color }]} />
                      <Text style={styles.catName}>{item.name}</Text>
                    </View>
                    <Text style={styles.catAmt}>
                      {formatVND(item.total)} ({pct}%)
                    </Text>
                  </View>
                  <View style={styles.miniBarBg}>
                    <View
                      style={[
                        styles.miniBarFill,
                        { width: `${pct}%`, backgroundColor: item.color },
                      ]}
                    />
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Filter Tabs */}
        <View style={styles.headerFilterRow}>
          <Text style={styles.sectionTitle}>Giao dịch tháng {Number(m)}</Text>
        </View>
        <View style={styles.filterRow}>
          {FILTER_TABS.map((t) => (
            <TouchableOpacity
              key={t.value}
              onPress={() => setFilterType(t.value)}
              style={[
                styles.filterPill,
                filterType === t.value && styles.filterPillActive,
              ]}
            >
              <Text
                style={[
                  styles.filterPillText,
                  filterType === t.value && styles.filterPillTextActive,
                ]}
              >
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Transactions List */}
        {transactions.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>
              Chưa có giao dịch nào. Qua tab "Ghi nhanh" để thêm!
            </Text>
          </View>
        ) : (
          transactions.map((tx) => (
            <TouchableOpacity
              key={tx._id}
              style={styles.txRow}
              onPress={() => openEditTx(tx)}
              onLongPress={() => handleDeleteTx(tx._id)}
            >
              <View
                style={[
                  styles.txDot,
                  {
                    backgroundColor:
                      tx.type === "goal_deposit"
                        ? "#f59e0b"
                        : tx.categoryId?.color || "#94a3b8",
                  },
                ]}
              />
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
          <Text style={styles.hint}>Mẹo: Chạm để sửa • Nhấn giữ để xóa giao dịch</Text>
        )}
      </ScrollView>

      {/* Edit Transaction Modal */}
      <Modal visible={!!editingTx} transparent animationType="fade">
        <View style={styles.modalBg}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Chỉnh sửa giao dịch</Text>
            <Text style={styles.inputLabel}>Số tiền (VNĐ)</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={editAmount}
              onChangeText={(t) => setEditAmount(t.replace(/[^0-9]/g, ""))}
            />

            {editingTx?.type !== "goal_deposit" && (
              <>
                <Text style={styles.inputLabel}>Danh mục</Text>
                <View style={styles.catChipsWrap}>
                  {categories
                    .filter((c) => c.type === editingTx?.type)
                    .map((cat) => (
                      <TouchableOpacity
                        key={cat._id}
                        onPress={() => setEditCategoryId(cat._id)}
                        style={[
                          styles.catChip,
                          editCategoryId === cat._id && styles.catChipSelected,
                        ]}
                      >
                        <Text
                          style={[
                            styles.catChipText,
                            editCategoryId === cat._id && {
                              color: "#4f46e5",
                              fontWeight: "700",
                            },
                          ]}
                        >
                          {cat.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                </View>
              </>
            )}

            <Text style={styles.inputLabel}>Ngày (YYYY-MM-DD)</Text>
            <TextInput
              style={styles.input}
              value={editDate}
              onChangeText={setEditDate}
              placeholder={getTodayDateInput()}
            />

            <Text style={styles.inputLabel}>Ghi chú</Text>
            <TextInput
              style={styles.input}
              value={editNote}
              onChangeText={setEditNote}
              placeholder="Ghi chú..."
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.deleteOutlineBtn}
                onPress={() => {
                  const id = editingTx._id;
                  setEditingTx(null);
                  handleDeleteTx(id);
                }}
              >
                <Ionicons name="trash-outline" size={18} color="#e11d48" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setEditingTx(null)}
              >
                <Text style={{ color: "#475569", fontWeight: "600" }}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtn} onPress={handleSaveEdit}>
                <Text style={{ color: "#fff", fontWeight: "700" }}>Lưu</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  monthPicker: { flexDirection: "row", alignItems: "center", gap: 10 },
  iconBtn: {
    backgroundColor: "#fff",
    padding: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  monthText: { fontSize: 15, fontWeight: "700", color: "#0f172a" },
  offlineBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "#ecfdf5",
    borderRadius: 99,
    borderWidth: 1,
    borderColor: "#a7f3d0",
  },
  offlineText: { fontSize: 11, fontWeight: "700", color: "#059669" },
  balanceCard: {
    backgroundColor: "#4f46e5",
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
  },
  balanceLabel: { color: "#c7d2fe", fontSize: 13 },
  balanceValue: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "800",
    marginTop: 4,
    marginBottom: 16,
  },
  kpiRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.15)",
    paddingTop: 12,
  },
  kpiItem: { flex: 1 },
  kpiLabel: { color: "#c7d2fe", fontSize: 11 },
  kpiNum: { fontSize: 13, fontWeight: "700", marginTop: 2 },
  breakdownCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  cardHeading: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 12,
  },
  catRowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  colorDot: { width: 8, height: 8, borderRadius: 4 },
  catName: { fontSize: 12, fontWeight: "600", color: "#334155" },
  catAmt: { fontSize: 12, fontWeight: "700", color: "#0f172a" },
  miniBarBg: {
    height: 6,
    backgroundColor: "#f1f5f9",
    borderRadius: 99,
    overflow: "hidden",
  },
  miniBarFill: { height: "100%", borderRadius: 99 },
  headerFilterRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: "#1e293b" },
  filterRow: { flexDirection: "row", gap: 6, marginBottom: 12 },
  filterPill: {
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 99,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  filterPillActive: { backgroundColor: "#4f46e5", borderColor: "#4f46e5" },
  filterPillText: { fontSize: 12, fontWeight: "600", color: "#64748b" },
  filterPillTextActive: { color: "#fff" },
  emptyBox: {
    backgroundColor: "#fff",
    padding: 24,
    borderRadius: 16,
    alignItems: "center",
  },
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
    gap: 10,
  },
  txDot: { width: 10, height: 10, borderRadius: 5 },
  txTitle: { fontSize: 14, fontWeight: "600", color: "#0f172a" },
  txSub: { fontSize: 12, color: "#94a3b8", marginTop: 2 },
  txAmount: { fontSize: 14, fontWeight: "700" },
  hint: { textAlign: "center", color: "#94a3b8", fontSize: 11, marginTop: 8 },
  modalBg: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.5)",
    justifyContent: "center",
    padding: 20,
  },
  modalBox: { backgroundColor: "#fff", borderRadius: 18, padding: 20 },
  modalTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748b",
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    padding: 11,
    marginBottom: 12,
    fontSize: 14,
  },
  catChipsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 12,
  },
  catChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  catChipSelected: { borderColor: "#4f46e5", backgroundColor: "#eef2ff" },
  catChipText: { fontSize: 12, color: "#334155" },
  modalActions: { flexDirection: "row", gap: 8, marginTop: 4 },
  deleteOutlineBtn: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#fecdd3",
    backgroundColor: "#fff1f2",
    alignItems: "center",
    justifyContent: "center",
  },
  cancelBtn: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    alignItems: "center",
  },
  confirmBtn: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    backgroundColor: "#4f46e5",
    alignItems: "center",
  },
});
