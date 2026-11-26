import { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import api, { setUnauthorizedHandler } from "../api/client";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setUnauthorizedHandler(() => setUser(null));
    const bootstrap = async () => {
      try {
        const token = await AsyncStorage.getItem("wallet_token");
        if (token) {
          const res = await api.get("/auth/me");
          setUser(res.data.user);
        }
      } catch {
        await AsyncStorage.removeItem("wallet_token");
      } finally {
        setLoading(false);
      }
    };
    bootstrap();
  }, []);

  const login = async (email, password) => {
    const res = await api.post("/auth/login", { email, password });
    await AsyncStorage.setItem("wallet_token", res.data.token);
    setUser(res.data.user);
  };

  const logout = async () => {
    await AsyncStorage.removeItem("wallet_token");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
