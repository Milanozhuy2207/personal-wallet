import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const MAX_LOGIN_ATTEMPTS = 15;
const loginAttempts = new Map();

const checkRateLimit = (ip) => {
  const now = Date.now();
  const record = loginAttempts.get(ip);
  if (!record || now - record.firstAttempt > LOGIN_WINDOW_MS) {
    loginAttempts.set(ip, { count: 1, firstAttempt: now });
    return true;
  }
  if (record.count >= MAX_LOGIN_ATTEMPTS) {
    return false;
  }
  record.count += 1;
  return true;
};

router.post("/login", async (req, res) => {
  try {
    const clientIp = req.ip || req.socket?.remoteAddress || "unknown";
    if (!checkRateLimit(clientIp)) {
      return res.status(429).json({
        message: "Thử đăng nhập quá nhiều lần. Vui lòng thử lại sau 15 phút.",
      });
    }

    const { email, password } = req.body || {};
    if (typeof email !== "string" || typeof password !== "string" || !email.trim() || !password) {
      return res.status(400).json({ message: "Vui lòng nhập đầy đủ email và mật khẩu" });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) return res.status(401).json({ message: "Sai email hoặc mật khẩu" });

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(401).json({ message: "Sai email hoặc mật khẩu" });

    loginAttempts.delete(clientIp);

    const token = jwt.sign({ id: user._id, email: user.email }, process.env.JWT_SECRET, {
      expiresIn: "30d",
    });

    res.json({ token, user: { email: user.email, currency: user.currency } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/me", requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("email currency");
    if (!user) return res.status(404).json({ message: "Không tìm thấy người dùng" });
    res.json({ user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
