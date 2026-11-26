import "dotenv/config";
import express from "express";
import cors from "cors";
import { connectDB } from "./config/db.js";
import { requireAuth } from "./middleware/auth.js";

import authRoutes from "./routes/auth.js";
import categoryRoutes from "./routes/categories.js";
import transactionRoutes from "./routes/transactions.js";
import goalRoutes from "./routes/goals.js";
import summaryRoutes from "./routes/summary.js";

const app = express();
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",").map((o) => o.trim()).filter(Boolean)
  : "*";
app.use(cors({ origin: allowedOrigins }));
app.use(express.json({ limit: "100kb" }));

app.get("/api/health", (_req, res) => res.json({ status: "ok" }));
app.use("/api/auth", authRoutes);

app.use("/api/categories", requireAuth, categoryRoutes);
app.use("/api/transactions", requireAuth, transactionRoutes);
app.use("/api/goals", requireAuth, goalRoutes);
app.use("/api/summary", requireAuth, summaryRoutes);

app.use((_req, res) => {
  res.status(404).json({ message: "Không tìm thấy endpoint" });
});

app.use((err, _req, res, _next) => {
  console.error("Unhandled API error:", err);
  res.status(err.status || 500).json({
    message: err.message || "Lỗi máy chủ nội bộ",
  });
});

const PORT = process.env.PORT || 5000;
connectDB().then(() => {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`API running at http://localhost:${PORT}`);
  });
});
