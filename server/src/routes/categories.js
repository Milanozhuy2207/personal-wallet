import { Router } from "express";
import Category from "../models/Category.js";
import Transaction from "../models/Transaction.js";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const filter = {};
    if (typeof req.query.type === "string" && ["income", "expense"].includes(req.query.type)) {
      filter.type = req.query.type;
    }
    const categories = await Category.find(filter).sort({ type: 1, createdAt: 1 });
    res.json(categories);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const { name, type, icon, color } = req.body || {};
    if (typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ message: "Tên danh mục không được để trống" });
    }
    if (!["income", "expense"].includes(type)) {
      return res.status(400).json({ message: "Loại danh mục không hợp lệ" });
    }
    const category = await Category.create({
      name: name.trim(),
      type,
      icon: typeof icon === "string" && icon.trim() ? icon.trim() : "tag",
      color: typeof color === "string" && color.trim() ? color.trim() : "#64748b",
    });
    res.status(201).json(category);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const deleted = await Category.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: "Không tìm thấy danh mục" });
    }
    await Transaction.updateMany(
      { categoryId: deleted._id },
      { $set: { categoryId: null } }
    );
    res.json({ deleted: true });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

export default router;
