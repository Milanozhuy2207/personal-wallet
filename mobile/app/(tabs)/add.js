import { useCallback, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { createTransaction, getCategories } from "../../src/storage/walletStore";
import { getTodayDateInput } from "../../src/utils/format";

const QUICK_CHIPS = [20000, 50000, 100000, 200000, 500000, 1000000];

export default function QuickAddScreen() {
  const [type, setType] = useState("expense");
  const [amount, setAmount] = useState("");
  const [categories, setCategories] = useState([]);
  const [categoryId, setCategoryId] = useState(null);
  const [note, setNote] = useState("");
  const [date, setDate] = useState(getTodayDateInput);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  useFocusEffect(
    useCallback(() => {
      getCategories()
        .then((list) => {
          setCategories(list);
          setCategoryId((prevId) => {
            const matching = list.filter((c) => c.type === type);
            if (matching.some((c) => c._id === prevId)) return prevId;
            return matching[0]?._id || null;
          });
        })
        .catch(() => {
          Alert.alert("Lỗi", "Không tải được danh sách danh mục");
        });
    }, [type])
  );

  const filtered = categories.filter((c) => c.type === type);

  const switchType = (newType) => {
    setType(newType);
    const first = categories.find((c) => c.type === newType);
    setCategoryId(first ? first._id : null);
  };

  const handleAmountChange = (text) => {
    setAmount(text.replace(/[^0-9]/g, ""));
  };

  const handleSave = async () => {
    const numAmount = Number(amount);
    if (!Number.isFinite(numAmount) || numAmount <= 0) {
      Alert.alert("Thiếu số tiền", "Vui lòng nhập số tiền lớn hơn 0");
      return;
    }
    if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date.trim())) {
      Alert.alert("Ngày không hợp lệ", "Vui lòng nhập ngày theo định dạng YYYY-MM-DD");
      return;
    }
    setSaving(true);
    try {
      await createTransaction({
        type,
        amount: numAmount,
        categoryId,
        note,
        date: date ? new Date(`${date.trim()}T12:00:00+07:00`).toISOString() : undefined,
      });
      setAmount("");
      setNote("");
      setDate(getTodayDateInput());
      Alert.alert("Đã lưu!", "Giao dịch đã được lưu trên máy", [
        { text: "Xem tổng quan", onPress: () => router.navigate("/(tabs)") },
        { text: "Ghi tiếp" },
      ]);
    } catch (err) {
      Alert.alert("Lỗi", err.message || "Không thể lưu giao dịch");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      {/* Toggle */}
      <View style={styles.toggleRow}>
        <TouchableOpacity
          style={[styles.toggleBtn, type === "expense" && styles.expenseActive]}
          onPress={() => switchType("expense")}
        >
          <Text style={[styles.toggleText, type === "expense" && { color: "#fff" }]}>
            Chi tiêu
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleBtn, type === "income" && styles.incomeActive]}
          onPress={() => switchType("income")}
        >
          <Text style={[styles.toggleText, type === "income" && { color: "#fff" }]}>
            Thu nhập
          </Text>
        </TouchableOpacity>
      </View>

      {/* Amount Input */}
      <View style={styles.card}>
        <Text style={styles.label}>Số tiền (VNĐ)</Text>
        <TextInput
          style={styles.amountInput}
          keyboardType="numeric"
          placeholder="0"
          value={amount}
          onChangeText={handleAmountChange}
        />
        <View style={styles.chipRow}>
          {QUICK_CHIPS.map((val) => (
            <TouchableOpacity
              key={val}
              style={styles.chip}
              onPress={() => setAmount(String((Number(amount) || 0) + val))}
            >
              <Text style={styles.chipText}>
                +{val >= 1000000 ? `${val / 1000000}tr` : `${val / 1000}k`}
              </Text>
            </TouchableOpacity>
          ))}
          {amount ? (
            <TouchableOpacity
              style={[styles.chip, { backgroundColor: "#fee2e2" }]}
              onPress={() => setAmount("")}
            >
              <Text style={[styles.chipText, { color: "#e11d48" }]}>Xóa</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Categories */}
      <Text style={styles.label}>Chọn nhanh danh mục</Text>
      <View style={styles.catGrid}>
        {filtered.map((cat) => {
          const selected = categoryId === cat._id;
          return (
            <TouchableOpacity
              key={cat._id}
              onPress={() => setCategoryId(cat._id)}
              style={[styles.catPill, selected && styles.catPillSelected]}
            >
              <View style={[styles.dot, { backgroundColor: cat.color }]} />
              <Text
                style={[
                  styles.catText,
                  selected && { color: "#4f46e5", fontWeight: "700" },
                ]}
              >
                {cat.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Date & Note */}
      <Text style={styles.label}>Ngày (YYYY-MM-DD)</Text>
      <TextInput
        style={styles.noteInput}
        placeholder="YYYY-MM-DD"
        value={date}
        onChangeText={setDate}
      />

      <Text style={styles.label}>Ghi chú</Text>
      <TextInput
        style={styles.noteInput}
        placeholder="VD: Cà phê sáng, ăn trưa..."
        value={note}
        onChangeText={setNote}
      />

      <TouchableOpacity
        style={[styles.saveBtn, saving && { opacity: 0.6 }]}
        onPress={handleSave}
        disabled={saving}
      >
        <Text style={styles.saveText}>
          {saving ? "Đang lưu..." : "Lưu giao dịch"}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  toggleRow: {
    flexDirection: "row",
    backgroundColor: "#e2e8f0",
    borderRadius: 14,
    padding: 4,
    marginBottom: 16,
  },
  toggleBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: "center" },
  expenseActive: { backgroundColor: "#f43f5e" },
  incomeActive: { backgroundColor: "#10b981" },
  toggleText: { fontWeight: "700", color: "#475569" },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  label: { fontSize: 12, fontWeight: "600", color: "#64748b", marginBottom: 8 },
  amountInput: {
    fontSize: 30,
    fontWeight: "800",
    color: "#0f172a",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    paddingBottom: 8,
  },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
  chip: {
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  chipText: { fontSize: 12, fontWeight: "600", color: "#334155" },
  catGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  catPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  catPillSelected: { borderColor: "#4f46e5", backgroundColor: "#eef2ff" },
  dot: { width: 8, height: 8, borderRadius: 4 },
  catText: { fontSize: 13, color: "#334155" },
  noteInput: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 18,
  },
  saveBtn: {
    backgroundColor: "#4f46e5",
    padding: 16,
    borderRadius: 14,
    alignItems: "center",
    marginBottom: 24,
  },
  saveText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
