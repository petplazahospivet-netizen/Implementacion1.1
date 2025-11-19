const express = require("express");
const {
  register,
  login,
  verify2FA,
  sendRecoveryLink,
  resetPasswordByLink,
} = require("../controllers/authController");

const router = express.Router();

// Registro y login
router.post("/register", register);
router.post("/login", login);

// Verificación de 2FA
router.post("/verify-2fa", verify2FA);

// Recuperación de contraseña por enlace
router.post("/send-recovery-link", sendRecoveryLink);
router.post("/reset-password-link", resetPasswordByLink);

module.exports = router;