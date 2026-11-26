import { useCallback, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  Share,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  createCategory,
  deleteCategory,
  exportAllDataJSON,
  getCategories,
  importAllDataJSON,
  resetAllData,
} from "../../src/storage/walletStore";

const PRESET_COLORS = [
  "#10b981",
  "#06b6d4",
  "#3b82f6",
  "#6366f1",
  "#8b5cf6",
  "#ec4899",
  "#f43f5e",
  "#f97316",
  "#eab308",
];

export default function CategoriesScreen() {
  const [categories, setCategories] = useState([]);
  const [name, setName] = useState("");
  const [type, setType] = useState("expense");
  const [color, setColor] = useState("#3b82f6");

  // Backup / Restore JSON modal
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState("");

  const loadCategories = async () => {
    const list = await getCategories();
    setCategories(list);
  };

  useFocusEffect(
    useCallback(() => {
      loadCategories();
    }, [])
  );

  const handleAdd = async () => {
    if (!name.trim()) {
      Alert.alert("Thiếu tên", "Vui lòng nhập tên danh mục");
      return;
    }
    try {
      await createCategory({ name: name.trim(), type, color });
      setName("");
      loadCategories();
    } catch (err) {
      Alert.alert("Lỗi", err.message);
    }
  };

  const handleDelete = (cat) => {
    Alert.alert(
      "Xóa danh mục",
      `Xóa danh mục "${cat.name}"? Các giao dịch cũ của danh mục này sẽ chuyển về 'Khác'.`,
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Xóa",
          style: "destructive",
          onPress: async () => {
            await deleteCategory(cat._id);
            loadCategories();
          },
        },
      ]
    );
  };

  const handleExport = async () => {
    try {
      const json = await exportAllDataJSON();
      await Share.share({
        message: json,
        title: "Sao lưu Ví Cá Nhân (JSON)",
      });
    } catch (err) {
      Alert.alert("Lỗi", err.message || "Không thể xuất dữ liệu");
    }
  };

  const handleImport = async () => {
    if (!importText.trim()) return;
    try {
      await importAllDataJSON(importText.trim());
      setImportText("");
      setShowImport(false);
      loadCategories();
      Alert.alert("Thành công", "Đã khôi phục dữ liệu ví!");
    } catch {
      Alert.alert("Lỗi", "Định dạng JSON không hợp lệ");
    }
  };

  const handleReset = () => {
    Alert.alert(
      "Đặt lại toàn bộ dữ liệu",
      "Toàn bộ giao dịch và mục tiêu trên máy sẽ bị xóa và khôi phục 8 danh mục mặc định. Bạn chắc chắn chứ?",
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Xóa hết",
          style: "destructive",
          onPress: async () => {
            await resetAllData();
            loadCategories();
            Alert.alert("Đã đặt lại", "Dữ liệu ví đã về trạng thái ban đầu.");
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {/* Add New Category Card */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Thêm danh mục mới</Text>
          <TextInput
            style={styles.input}
            placeholder="Tên danh mục (VD: Tiền nhà, Thưởng...)"
            value={name}
            onChangeText={setName}
          />

          <View style={styles.typeRow}>
            <TouchableOpacity
              onPress={() => setType("expense")}
              style={[styles.typeBtn, type === "expense" && styles.typeExpenseActive]}
            >
              <Text style={[styles.typeText, type === "expense" && { color: "#fff" }]}>
                Chi tiêu
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setType("income")}
              style={[styles.typeBtn, type === "income" && styles.typeIncomeActive]}
            >
              <Text style={[styles.typeText, type === "income" && { color: "#fff" }]}>
                Thu nhập
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.colorRow}>
            {PRESET_COLORS.map((c) => (
              <TouchableOpacity
                key={c}
                onPress={() => setColor(c)}
                style={[
                  styles.colorCircle,
                  { backgroundColor: c },
                  color === c && styles.colorSelected,
                ]}
              />
            ))}
          </View>

          <TouchableOpacity style={styles.addBtn} onPress={handleAdd}>
            <Text style={styles.addBtnText}>+ Thêm danh mục</Text>
          </TouchableOpacity>
        </View>

        {/* Category Groups */}
        {["expense", "income"].map((group) => (
          <View key={group} style={styles.card}>
            <Text style={styles.sectionTitle}>
              {group === "expense" ? "Danh mục Chi tiêu" : "Danh mục Thu nhập"}
            </Text>
            {categories
              .filter((c) => c.type === group)
              .map((cat) => (
                <View key={cat._id} style={styles.catRow}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                    <View style={[styles.dot, { backgroundColor: cat.color }]} />
                    <Text style={styles.catName}>{cat.name}</Text>
                  </View>
                  <TouchableOpacity onPress={() => handleDelete(cat)}>
                    <Ionicons name="trash-outline" size={18} color="#94a3b8" />
                  </TouchableOpacity>
                </View>
              ))}
          </View>
        ))}

        {/* Offline Backup & Restore */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Dữ liệu Offline trên điện thoại</Text>
          <Text style={styles.subNote}>
            Toàn bộ dữ liệu được lưu trực tiếp trên thiết bị của bạn, không cần kết nối mạng.
          </Text>
          <View style={{ gap: 8, marginTop: 12 }}>
            <TouchableOpacity style={styles.actionBtn} onPress={handleExport}>
              <Ionicons name="share-outline" size={18} color="#4f46e5" />
              <Text style={styles.actionBtnText}>Sao lưu / Chia sẻ dữ liệu (JSON)</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => setShowImport(true)}
            >
              <Ionicons name="download-outline" size={18} color="#4f46e5" />
              <Text style={styles.actionBtnText}>Khôi phục dữ liệu từ bản sao lưu</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, { borderColor: "#fecdd3", backgroundColor: "#fff1f2" }]}
              onPress={handleReset}
            >
              <Ionicons name="refresh-outline" size={18} color="#e11d48" />
              <Text style={[styles.actionBtnText, { color: "#e11d48" }]}>
                Xóa & Đặt lại dữ liệu gốc
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Modal Import JSON */}
      <Modal visible={showImport} transparent animationType="fade">
        <View style={styles.modalBg}>
          <View style={styles.modalBox}>
            <Text style={styles.sectionTitle}>Khôi phục dữ liệu (JSON)</Text>
            <TextInput
              style={[styles.input, { height: 140, textAlignVertical: "top" }]}
              multiline
              placeholder="Dán chuỗi JSON đã sao lưu vào đây..."
              value={importText}
              onChangeText={setImportText}
            />
            <View style={{ flexDirection: "row", gap: 10 }}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setShowImport(false)}
              >
                <Text style={{ color: "#475569", fontWeight: "600" }}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtn} onPress={handleImport}>
                <Text style={{ color: "#fff", fontWeight: "700" }}>Khôi phục</Text>
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
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 10,
  },
  subNote: { fontSize: 12, color: "#64748b", lineHeight: 18 },
  input: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    marginBottom: 12,
  },
  typeRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  typeBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
  },
  typeExpenseActive: { backgroundColor: "#f43f5e" },
  typeIncomeActive: { backgroundColor: "#10b981" },
  typeText: { fontSize: 13, fontWeight: "700", color: "#475569" },
  colorRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  colorCircle: { width: 28, height: 28, borderRadius: 14 },
  colorSelected: { borderWidth: 3, borderColor: "#0f172a" },
  addBtn: {
    backgroundColor: "#4f46e5",
    padding: 13,
    borderRadius: 12,
    alignItems: "center",
  },
  addBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  catRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  dot: { width: 10, height: 10, borderRadius: 5 },
  catName: { fontSize: 14, fontWeight: "500", color: "#334155" },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e0e7ff",
    backgroundColor: "#eef2ff",
  },
  actionBtnText: { fontSize: 13, fontWeight: "600", color: "#4f46e5" },
  modalBg: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.5)",
    justifyContent: "center",
    padding: 20,
  },
  modalBox: { backgroundColor: "#fff", borderRadius: 18, padding: 20 },
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
