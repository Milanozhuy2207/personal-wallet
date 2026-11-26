import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useAuth } from "../src/context/AuthContext";

export default function LoginScreen() {
  const [email, setEmail] = useState(() => (__DEV__ ? "wallet@local.dev" : ""));
  const [password, setPassword] = useState(() => (__DEV__ ? "123456" : ""));
  const [submitting, setSubmitting] = useState(false);
  const { login } = useAuth();

  const handleLogin = async () => {
    setSubmitting(true);
    try {
      await login(email, password);
    } catch (err) {
      Alert.alert("Lỗi đăng nhập", err.response?.data?.message || "Kiểm tra lại server & IP LAN");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <View style={styles.card}>
        <Text style={styles.title}>Ví Cá Nhân</Text>
        <Text style={styles.subtitle}>Ghi nhanh thu chi & theo dõi tiết kiệm</Text>

        <TextInput
          style={styles.input}
          placeholder="Email"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={styles.input}
          placeholder="Mật khẩu"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <TouchableOpacity
          style={[styles.btn, submitting && { opacity: 0.6 }]}
          onPress={handleLogin}
          disabled={submitting}
        >
          <Text style={styles.btnText}>{submitting ? "Đang vào ví..." : "Đăng nhập"}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 20, backgroundColor: "#f1f5f9" },
  card: { backgroundColor: "#fff", borderRadius: 20, padding: 24, elevation: 3 },
  title: { fontSize: 24, fontWeight: "700", color: "#0f172a", textAlign: "center" },
  subtitle: { fontSize: 13, color: "#64748b", textAlign: "center", marginBottom: 24, marginTop: 4 },
  input: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    fontSize: 15,
  },
  btn: {
    backgroundColor: "#4f46e5",
    borderRadius: 12,
    padding: 15,
    alignItems: "center",
    marginTop: 6,
  },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
