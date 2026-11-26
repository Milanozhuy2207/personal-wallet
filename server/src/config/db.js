import mongoose from "mongoose";

export const connectDB = async () => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("Thiếu biến môi trường MONGO_URI trong file .env");
    }
    if (!process.env.JWT_SECRET) {
      throw new Error("Thiếu biến môi trường JWT_SECRET trong file .env");
    }
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected");
  } catch (err) {
    console.error("Startup / MongoDB error:", err.message);
    process.exit(1);
  }
};
