const mongoose = require("mongoose");

const usuarioSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    full_name: { type: String, required: true },
    password: { type: String, required: true },

    role: {
      type: String,
      enum: ["admin", "veterinario", "laboratorio", "farmacia", "recepcion"],
      default: "veterinario",
    },

    // Estado del usuario
    is_active: { type: Boolean, default: true },
    status: {
      type: String,
      enum: ["active", "inactive", "blocked"],
      default: "active",
    },

    // Teléfonos
    phones: {
      type: [String],
      default: [],
      set: (arr) =>
        Array.isArray(arr)
          ? arr.map((t) => (t.startsWith("+") ? t : `+${t.replace(/\D/g, "")}`))
          : [],
    },

    // 2FA
    is2FAEnabled: { type: Boolean, default: true },
    otpCode: { type: String, default: null },
    otpExpires: { type: Date, default: null },

    // Intentos fallidos y bloqueo
    failed_attempts: { type: Number, default: 0 },
    blocked_until: { type: Date, default: null },

    // 🔐 Recuperación de contraseña por enlace
    resetToken: { type: String, default: null },
    resetTokenExpires: { type: Date, default: null },

    // Límite diario de envíos de OTP (envíos y reenvíos)
    otpSendCount: { type: Number, default: 0 },
    otpSendDate: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Usuario", usuarioSchema);