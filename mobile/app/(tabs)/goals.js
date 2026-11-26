import { useCallback, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  StyleSheet,
  Alert,
  RefreshControl,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import api from "../../src/api/client";
import { formatDate, formatVND } from "../../src/utils/format";

export default function GoalsScreen() {
  const [goals, setGoals] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Create modal
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [deadline, setDeadline] = useState("");

  // Deposit modal
  const [selectedGoal, setSelectedGoal] = useState(null);
  const [depositAmount, setDepositAmount] = useState("");
  const [depositNote, setDepositNote] = useState("");

  const loadGoals = async () => {
    setRefreshing(true);
    try {
      const res = await api.get("/goals");
      setGoals(res.data);
    } catch {
      Alert.alert("Lỗi", "Không tải được danh sách mục tiêu");
    } finally {
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadGoals();
    }, [])
  );

  const handleCreate = async () => {
    const numTarget = Number(targetAmount.replace(/[^0-9]/g, ""));
    if (!title.trim() || !numTarget || numTarget <= 0) {
      Alert.alert("Thiếu thông tin", "Vui lòng nhập tên và số tiền mục tiêu lớn hơn 0");
      return;
    }
    if (deadline.trim() && !/^\d{4}-\d{2}-\d{2}$/.test(deadline.trim())) {
      Alert.alert("Ngày hạn không hợp lệ", "Vui lòng nhập theo định dạng YYYY-MM-DD");
      return;
    }
    setSubmitting(true);
    try {
      await api.post("/goals", {
        title: title.trim(),
        targetAmount: numTarget,
        deadline: deadline.trim() || null,
      });
      setTitle("");
      setTargetAmount("");
      setDeadline("");
      setShowCreate(false);
      loadGoals();
    } catch (err) {
      Alert.alert("Lỗi", err.response?.data?.message || "Không thể tạo mục tiêu");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeposit = async () => {
    const numDeposit = Number(depositAmount.replace(/[^0-9]/g, ""));
    if (!selectedGoal || !numDeposit || numDeposit <= 0) {
      Alert.alert("Số tiền không hợp lệ", "Vui lòng nhập số tiền lớn hơn 0");
      return;
    }
    setSubmitting(true);
    try {
      await api.post(`/goals/${selectedGoal._id}/contribute`, {
        amount: numDeposit,
        note: depositNote.trim() || undefined,
      });
      setSelectedGoal(null);
      setDepositAmount("");
      setDepositNote("");
      loadGoals();
      Alert.alert("Thành công", "Đã trích tiền vào mục tiêu tiết kiệm!");
    } catch (err) {
      Alert.alert("Lỗi", err.response?.data?.message || "Không thể nạp tiền");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteGoal = (goal) => {
    Alert.alert(
      "Xóa mục tiêu",
      `Xóa "${goal.title}"? Tiền đã trích sẽ được hoàn lại số dư khả dụng.`,
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Xóa",
          style: "destructive",
          onPress: async () => {
            try {
              await api.delete(`/goals/${goal._id}`);
              loadGoals();
            } catch (err) {
              Alert.alert("Lỗi", err.response?.data?.message || "Không thể xóa mục tiêu");
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadGoals} />}
      >
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowCreate(true)}>
          <Text style={styles.addBtnText}>+ Tạo mục tiêu tiết kiệm mới</Text>
        </TouchableOpacity>

        {goals.length === 0 ? (
          <Text style={styles.empty}>Chưa có mục tiêu nào. Tạo mục tiêu đầu tiên của bạn nhé!</Text>
        ) : (
          goals.map((g) => (
            <View key={g._id} style={styles.card}>
              <View style={styles.rowBetween}>
                <Text style={styles.goalTitle}>{g.title}</Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <Text style={styles.percent}>{g.progress}%</Text>
                  <TouchableOpacity onPress={() => handleDeleteGoal(g)}>
                    <Ionicons name="trash-outline" size={18} color="#94a3b8" />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.barBg}>
                <View style={[styles.barFill, { width: `${g.progress}%` }]} />
              </View>

              <View style={styles.rowBetween}>
                <Text style={styles.subText}>Đã có: {formatVND(g.currentAmount)}</Text>
                <Text style={styles.subText}>Đích: {formatVND(g.targetAmount)}</Text>
              </View>

              {g.deadline ? (
                <Text style={[styles.subText, { marginTop: 4 }]}>
                  Hạn: {formatDate(g.deadline)}
                </Text>
              ) : null}

              {g.suggestedMonthly ? (
                <Text style={styles.suggest}>
                  Gợi ý tiết kiệm: {formatVND(g.suggestedMonthly)}/tháng
                </Text>
              ) : null}

              {g.status !== "completed" && (
                <TouchableOpacity
                  style={styles.depositBtn}
                  onPress={() => setSelectedGoal(g)}
                >
                  <Text style={styles.depositBtnText}>Trích tiền vào mục tiêu</Text>
                </TouchableOpacity>
              )}
            </View>
          ))
        )}
      </ScrollView>

      {/* Modal tạo mục tiêu */}
      <Modal visible={showCreate} transparent animationType="fade">
        <View style={styles.modalBg}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Tạo mục tiêu mới</Text>
            <TextInput
              style={styles.input}
              placeholder="Tên mục tiêu (VD: Mua laptop, du lịch)"
              value={title}
              onChangeText={setTitle}
            />
            <TextInput
              style={styles.input}
              placeholder="Số tiền mục tiêu (VNĐ)"
              keyboardType="numeric"
              value={targetAmount}
              onChangeText={(t) => setTargetAmount(t.replace(/[^0-9]/g, ""))}
            />
            <TextInput
              style={styles.input}
              placeholder="Hạn hoàn thành YYYY-MM-DD (tùy chọn)"
              value={deadline}
              onChangeText={setDeadline}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setShowCreate(false)}
                disabled={submitting}
              >
                <Text style={{ color: "#475569", fontWeight: "600" }}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmBtn, submitting && { opacity: 0.6 }]}
                onPress={handleCreate}
                disabled={submitting}
              >
                <Text style={{ color: "#fff", fontWeight: "700" }}>
                  {submitting ? "Đang tạo..." : "Tạo"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal nạp tiền */}
      <Modal visible={!!selectedGoal} transparent animationType="fade">
        <View style={styles.modalBg}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Trích vào: {selectedGoal?.title}</Text>
            <Text style={styles.subText}>
              Còn thiếu: {formatVND(selectedGoal?.remaining || 0)}
            </Text>
            <TextInput
              style={[styles.input, { marginTop: 12 }]}
              placeholder="Nhập số tiền muốn trích (VNĐ)"
              keyboardType="numeric"
              value={depositAmount}
              onChangeText={(t) => setDepositAmount(t.replace(/[^0-9]/g, ""))}
            />
            <TextInput
              style={styles.input}
              placeholder="Ghi chú (tùy chọn)"
              value={depositNote}
              onChangeText={setDepositNote}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setSelectedGoal(null)}
                disabled={submitting}
              >
                <Text style={{ color: "#475569", fontWeight: "600" }}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmBtn, submitting && { opacity: 0.6 }]}
                onPress={handleDeposit}
                disabled={submitting}
              >
                <Text style={{ color: "#fff", fontWeight: "700" }}>
                  {submitting ? "Đang trích..." : "Xác nhận"}
                </Text>
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
  addBtn: { backgroundColor: "#4f46e5", padding: 14, borderRadius: 14, alignItems: "center", marginBottom: 16 },
  addBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  empty: { textAlign: "center", color: "#94a3b8", marginTop: 32 },
  card: { backgroundColor: "#fff", borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: "#e2e8f0" },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  goalTitle: { fontSize: 16, fontWeight: "700", color: "#0f172a" },
  percent: { fontSize: 13, fontWeight: "700", color: "#4f46e5" },
  barBg: { height: 10, backgroundColor: "#e2e8f0", borderRadius: 99, marginVertical: 10, overflow: "hidden" },
  barFill: { height: "100%", backgroundColor: "#4f46e5", borderRadius: 99 },
  subText: { fontSize: 12, color: "#64748b" },
  suggest: { marginTop: 8, fontSize: 12, color: "#b45309", backgroundColor: "#fef3c7", padding: 8, borderRadius: 8 },
  depositBtn: { marginTop: 12, backgroundColor: "#0f172a", padding: 11, borderRadius: 10, alignItems: "center" },
  depositBtnText: { color: "#fff", fontSize: 13, fontWeight: "600" },
  modalBg: { flex: 1, backgroundColor: "rgba(15,23,42,0.5)", justifyContent: "center", padding: 20 },
  modalBox: { backgroundColor: "#fff", borderRadius: 18, padding: 20 },
  modalTitle: { fontSize: 17, fontWeight: "700", color: "#0f172a", marginBottom: 10 },
  input: { borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 12, padding: 12, marginBottom: 12, fontSize: 15 },
  modalActions: { flexDirection: "row", gap: 10, marginTop: 4 },
  cancelBtn: { flex: 1, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: "#e2e8f0", alignItems: "center" },
  confirmBtn: { flex: 1, padding: 12, borderRadius: 10, backgroundColor: "#4f46e5", alignItems: "center" },
});
