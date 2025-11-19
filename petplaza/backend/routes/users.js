// backend/routes/users.js
const express = require("express");
const {
  getUsers,
  createUser,
  updateUser,
  resetPassword,
  deleteUser,
  toggleStatus,
} = require("../controllers/userController");

const router = express.Router();

// Rutas
router.get("/", getUsers);
router.post("/", createUser);
router.put("/:id", updateUser);
router.patch("/:id/reset-password", resetPassword);
router.patch("/:id/toggle-status", toggleStatus);
router.delete("/:id", deleteUser);

module.exports = router;