import "dotenv/config";
import bcrypt from "bcryptjs";
import { connectDB } from "./config/db.js";
import User from "./models/User.js";
import Category from "./models/Category.js";

const DEFAULT_CATEGORIES = [
  { name: "Lương", type: "income", icon: "briefcase", color: "#10b981" },
  { name: "Thu nhập phụ", type: "income", icon: "sparkles", color: "#06b6d4" },
  { name: "Ăn uống", type: "expense", icon: "utensils", color: "#f97316" },
  { name: "Di chuyển & Xăng xe", type: "expense", icon: "bike", color: "#3b82f6" },
  { name: "Hóa đơn & Nhà ở", type: "expense", icon: "home", color: "#8b5cf6" },
  { name: "Mua sắm", type: "expense", icon: "shopping-bag", color: "#ec4899" },
  { name: "Giải trí & Cà phê", type: "expense", icon: "coffee", color: "#eab308" },
  { name: "Sức khỏe & Tập luyện", type: "expense", icon: "dumbbell", color: "#ef4444" },
];

const runSeed = async () => {
  await connectDB();

  const email = (process.env.ADMIN_EMAIL || "wallet@local.dev").toLowerCase();
  const password = process.env.ADMIN_PASSWORD || "123456";

  const existingUser = await User.findOne({ email });
  if (!existingUser) {
    const passwordHash = await bcrypt.hash(password, 10);
    await User.create({ email, passwordHash });
    console.log(`Created user: ${email}`);
  } else {
    console.log("User already exists, skipped.");
  }

  const catCount = await Category.countDocuments();
  if (catCount === 0) {
    await Category.insertMany(DEFAULT_CATEGORIES);
    console.log(`Seeded ${DEFAULT_CATEGORIES.length} default categories.`);
  } else {
    console.log("Categories already exist, skipped.");
  }

  process.exit(0);
};

runSeed().catch((err) => {
  console.error("Seed error:", err.message);
  process.exit(1);
});
