const Usuario = require("../models/Usuario");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const {
  sendEmail,
  sendOtpEmail,
  sendResetLinkEmail,
} = require("../util/sendEmail");

/* =====================================================
   🧩 Registrar usuario
   ===================================================== */
const register = async (req, res) => {
  try {
    const { username, email, full_name, password, role, phones } = req.body;
    if (!username || !email || !full_name || !password)
      return res
        .status(400)
        .json({ mensaje: "Todos los campos son requeridos" });

    const existe = await Usuario.findOne({ $or: [{ username }, { email }] });
    if (existe)
      return res.status(400).json({ mensaje: "Usuario o correo ya existen" });

    const hash = await bcrypt.hash(password, 10);
    const nuevoUsuario = new Usuario({
      username,
      email,
      full_name,
      password: hash,
      role,
      // Se guardan limpios; el schema ya normaliza a +504...
      phones: phones?.map((t) => t.replace(/\D/g, "")) || [],
    });

    await nuevoUsuario.save();
    res.status(201).json({ mensaje: "Usuario registrado correctamente" });
  } catch (err) {
    console.error("❌ Error en register:", err);
    res
      .status(500)
      .json({ mensaje: "Error en el servidor", error: err.message });
  }
};

/* =====================================================
   🔐 LOGIN (con bloqueo e intentos) — OPCIÓN A
   ===================================================== */
const login = async (req, res) => {
  try {
    const { identifier, password } = req.body;
    if (!identifier || !password)
      return res.status(400).json({
        mensaje: "Usuario, correo o teléfono y contraseña son requeridos",
      });

    const raw = (identifier || "").trim();
    const cleaned = raw.replace(/\D/g, "");
    const last8 = cleaned.slice(-8);

    // 1️⃣ Intentar primero por username / email
    let user = await Usuario.findOne({
      $or: [{ username: raw }, { email: raw }],
    });

    // 2️⃣ Si no existe, intentamos como teléfono (con control de duplicados)
    if (!user) {
      const phoneCandidates = [];
      if (raw) phoneCandidates.push(raw);           // "+50488586201" o "8858-6201"
      if (cleaned && cleaned !== raw) phoneCandidates.push(cleaned); // "50488586201" o "88586201"
      if (last8 && !phoneCandidates.includes(last8)) {
        phoneCandidates.push(last8);                // "88586201"
      }

      // 🔁 Variantes normalizadas con "+"
      if (cleaned) {
        const plusCleaned = `+${cleaned}`;          // "+50488586201" o "+88586201"
        if (!phoneCandidates.includes(plusCleaned)) {
          phoneCandidates.push(plusCleaned);
        }
      }
      if (last8 && last8.length === 8) {
        const honduras = `+504${last8}`;           // "+50488586201" (caso típico HN)
        if (!phoneCandidates.includes(honduras)) {
          phoneCandidates.push(honduras);
        }
      }

      if (phoneCandidates.length > 0) {
        const usersByPhone = await Usuario.find({
          phones: { $in: phoneCandidates },
        });

        if (usersByPhone.length === 0) {
          return res.status(404).json({ mensaje: "Usuario no encontrado" });
        }

        if (usersByPhone.length > 1) {
          return res.status(400).json({
            mensaje:
              "El número de teléfono está asociado a varias cuentas. Inicia sesión con tu usuario o correo.",
          });
        }

        user = usersByPhone[0];
      }
    }

    if (!user)
      return res.status(404).json({ mensaje: "Usuario no encontrado" });

    // 🧹 Si el usuario fue reactivado manualmente, limpiar bloqueo y contadores
    if (user.is_active && user.status === "active" && user.blocked_until) {
      user.failed_attempts = 0;
      user.blocked_until = null;
      await user.save();
      console.log(
        `🟢 Usuario ${user.username} reactivado manualmente, bloqueo eliminado.`
      );
    }

    // ======================================================
    // 🔒 Verificación de bloqueo o estado del usuario
    // ======================================================
    if (!user.is_active) {
      return res.status(403).json({
        mensaje: "Tu cuenta está inactiva. Contacta con un administrador.",
      });
    }

    if (user.status === "blocked" && !user.blocked_until) {
      return res.status(403).json({
        mensaje:
          "Tu cuenta ha sido bloqueada por un administrador. Comunícate con soporte.",
      });
    }

    // Bloqueo temporal por intentos fallidos
    if (user.blocked_until && user.blocked_until > new Date()) {
      const minutosRestantes = Math.ceil(
        (user.blocked_until - new Date()) / 60000
      );
      const segundosRestantes = Math.ceil(
        (user.blocked_until - new Date()) / 1000
      );

      return res.status(403).json({
        mensaje: `Tu cuenta está bloqueada temporalmente. Intenta nuevamente en ${minutosRestantes} minuto(s).`,
        bloqueado_hasta: user.blocked_until,
        segundos_restantes: segundosRestantes,
      });
    }

    /***********************************************
     * ⚡ REENVÍO DE OTP SIN VALIDAR CONTRASEÑA
     ***********************************************/
    if (password === "__otp_resend__") {
      const quota = ensureOtpQuota(user);
      if (!quota.allowed) {
        await user.save();
        return res
          .status(quota.error.status)
          .json({ mensaje: quota.error.mensaje });
      }

      const otp = Math.floor(1000 + Math.random() * 9000).toString();
      user.otpCode = otp;
      user.otpExpires = new Date(Date.now() + 5 * 60 * 1000);
      await user.save();
      await sendOtpEmail(user.email, otp);

      console.log(`🔁 OTP reenviado a ${user.email}: ${otp}`);

      return res.json({
        step: "2FA_REQUIRED",
        mensaje: "Nuevo OTP reenviado al correo",
        identifier: user.email || user.username || user.phones?.[0] || "",
      });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      user.failed_attempts += 1;

      if (user.failed_attempts >= 7) {
        user.status = "blocked";
        user.is_active = false;
        user.blocked_until = new Date(Date.now() + 60 * 60 * 1000); // 1 hora
        await user.save();
        return res.status(403).json({
          mensaje: "Tu cuenta ha sido bloqueada por seguridad durante 1 hora.",
        });
      }

      const restantes = Math.max(0, 7 - user.failed_attempts);
      await user.save();

      return res.status(400).json({
        mensaje: `Contraseña incorrecta. Te quedan ${restantes} intento(s).`,
      });
    }

    // Reiniciar contador
    user.failed_attempts = 0;
    user.blocked_until = null;

    // ======================================================
    // 🔐 Generar y enviar OTP 2FA (Actualizado)
    // ======================================================
    if (user.is2FAEnabled) {
      const quota = ensureOtpQuota(user);
      if (!quota.allowed) {
        await user.save();
        return res
          .status(quota.error.status)
          .json({ mensaje: quota.error.mensaje });
      }

      // ⚙️ Detectar si es reenvío rápido (para no volver a pedir contraseña)
      if (password === "__otp_resend__") {
        const otp = Math.floor(1000 + Math.random() * 9000).toString();
        user.otpCode = otp;
        user.otpExpires = new Date(Date.now() + 5 * 60 * 1000); // 🕒 5 min exactos
        await user.save();
        await sendOtpEmail(user.email, otp);
        console.log(`🔁 OTP reenviado a ${user.email}: ${otp}`);
        return res.json({
          step: "2FA_REQUIRED",
          mensaje: "Nuevo OTP reenviado al correo",
          identifier: user.email || user.username || user.phones?.[0] || "",
        });
      }

      // 🔢 Generar OTP de 4 dígitos (login normal)
      const otp = Math.floor(1000 + Math.random() * 9000).toString();

      // 🕒 Guardar OTP y expiración exacta (5 minutos)
      user.otpCode = otp;
      user.otpExpires = new Date(Date.now() + 5 * 60 * 1000); // ✅ Date correcto
      await user.save(); // ✅ Guardar ANTES de enviar correo

      // 📧 Enviar el correo con el OTP
      await sendOtpEmail(user.email, otp);

      console.log(`✅ OTP generado y guardado para ${user.email}: ${otp}`);

      return res.json({
        step: "2FA_REQUIRED",
        mensaje: "OTP enviado al correo",
        identifier: user.email || user.username || user.phones?.[0] || "",
      });
    }

    await user.save();
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      {
        expiresIn: "1d",
      }
    );

    res.json({
      token,
      username: user.username,
      full_name: user.full_name,
      role: user.role,
    });
  } catch (err) {
    console.error("❌ Error en login:", err);
    res
      .status(500)
      .json({ mensaje: "Error en el servidor", error: err.message });
  }
};

/* =====================================================
   🔢 Verificar OTP (2FA) — actualizado + OPCIÓN A
   ===================================================== */
const verify2FA = async (req, res) => {
  try {
    const { identifier, otpCode } = req.body;

    // 🧹 Limpiar y normalizar datos
    const idTrim = (identifier || "").trim();
    const cleaned = idTrim.replace(/\D/g, "");
    const last8 = cleaned.slice(-8);
    const code = String(otpCode || "").trim();

    // 1️⃣ Intentar username / email
    let user = await Usuario.findOne({
      $or: [{ username: idTrim }, { email: idTrim }],
    });

    // 2️⃣ Si no existe, intentamos por teléfono con control de duplicados
    if (!user) {
      const phoneCandidates = [];
      if (idTrim) phoneCandidates.push(idTrim);
      if (cleaned && cleaned !== idTrim) phoneCandidates.push(cleaned);
      if (last8 && !phoneCandidates.includes(last8)) {
        phoneCandidates.push(last8);
      }

      if (cleaned) {
        const plusCleaned = `+${cleaned}`;
        if (!phoneCandidates.includes(plusCleaned)) {
          phoneCandidates.push(plusCleaned);
        }
      }
      if (last8 && last8.length === 8) {
        const honduras = `+504${last8}`;
        if (!phoneCandidates.includes(honduras)) {
          phoneCandidates.push(honduras);
        }
      }

      if (phoneCandidates.length > 0) {
        const usersByPhone = await Usuario.find({
          phones: { $in: phoneCandidates },
        });

        if (usersByPhone.length === 0) {
          return res.status(404).json({ mensaje: "Usuario no encontrado" });
        }

        if (usersByPhone.length > 1) {
          return res.status(400).json({
            mensaje:
              "El número de teléfono está asociado a varias cuentas. Inicia sesión con tu usuario o correo.",
          });
        }

        user = usersByPhone[0];
      }
    }

    if (!user)
      return res.status(404).json({ mensaje: "Usuario no encontrado" });

    // ⚠️ Validar existencia y vigencia del OTP
    if (
      !user.otpCode ||
      !user.otpExpires ||
      new Date(user.otpExpires).getTime() < Date.now()
    ) {
      return res.status(400).json({ mensaje: "OTP inválido o expirado" });
    }

    // 🧩 DEBUG PARA DIAGNÓSTICO DE OTP
    console.log("🧾 OTP recibido:", code);
    console.log("🧾 OTP esperado:", user.otpCode);
    console.log("🕒 Expira en:", user.otpExpires);
    console.log("🕒 Fecha actual:", new Date());

    // 🔐 Comparar códigos (asegurando igualdad real sin importar tipo)
    if (String(user.otpCode).trim() !== String(code).trim()) {
      console.log(
        "❌ Los códigos no coinciden (comparación ajustada por tipo)."
      );
      console.log("🧾 Esperado:", user.otpCode, "| Recibido:", code);
      return res.status(400).json({ mensaje: "Código incorrecto" });
    }
    console.log("🟢 OTP verificado correctamente. Coinciden los códigos.");
    // ✅ Limpiar OTP al verificar correctamente
    user.otpCode = null;
    user.otpExpires = null;
    await user.save();

    // 🎫 Generar token JWT
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      {
        expiresIn: "1d",
      }
    );

    // 📤 Responder con datos del usuario y token
    return res.json({
      token,
      username: user.username,
      full_name: user.full_name,
      role: user.role,
    });
  } catch (err) {
    console.error("❌ Error en verify2FA:", err);
    res
      .status(500)
      .json({ mensaje: "Error en verificación", error: err.message });
  }
};

/* =====================================================
   🔢 Control de cuota diaria de OTP (máx. 100 por día)
   ===================================================== */
function ensureOtpQuota(user) {
  const now = new Date();

  // 🕒 Si nunca se ha enviado OTP o es un nuevo día, reiniciamos el contador
  if (
    !user.otpSendDate ||
    user.otpSendDate.toDateString() !== now.toDateString()
  ) {
    user.otpSendCount = 0;
    user.otpSendDate = now;
  }

  // 🚫 Límite diario: máximo 100 códigos por día
  if (user.otpSendCount >= 100) {
    return {
      allowed: false,
      error: {
        status: 429,
        mensaje:
          "Has alcanzado el límite diario de 100 códigos. Intenta nuevamente mañana.",
      },
    };
  }

  // ✅ Aumentar contador y registrar nueva fecha
  user.otpSendCount += 1;
  user.otpSendDate = now;
  return { allowed: true };
}

/* =====================================================
   🔁 Recuperación de contraseña (por link seguro) — OPCIÓN A
   ===================================================== */
const sendRecoveryLink = async (req, res) => {
  try {
    const { identifier } = req.body;
    if (!identifier)
      return res
        .status(400)
        .json({ mensaje: "Debe ingresar usuario, correo o teléfono" });

    const raw = (identifier || "").trim();
    const cleaned = raw.replace(/\D/g, "");
    const last8 = cleaned.slice(-8);

    // 1️⃣ Intentar username / email
    let user = await Usuario.findOne({
      $or: [{ username: raw }, { email: raw }],
    });

    // 2️⃣ Si no existe, intentamos por teléfono con control de duplicados
    if (!user) {
      const phoneCandidates = [];
      if (raw) phoneCandidates.push(raw);
      if (cleaned && cleaned !== raw) phoneCandidates.push(cleaned);
      if (last8 && !phoneCandidates.includes(last8)) {
        phoneCandidates.push(last8);
      }

      if (cleaned) {
        const plusCleaned = `+${cleaned}`;
        if (!phoneCandidates.includes(plusCleaned)) {
          phoneCandidates.push(plusCleaned);
        }
      }
      if (last8 && last8.length === 8) {
        const honduras = `+504${last8}`;
        if (!phoneCandidates.includes(honduras)) {
          phoneCandidates.push(honduras);
        }
      }

      if (phoneCandidates.length > 0) {
        const usersByPhone = await Usuario.find({
          phones: { $in: phoneCandidates },
        });

        if (usersByPhone.length === 0) {
          return res.status(404).json({ mensaje: "Usuario no encontrado" });
        }

        if (usersByPhone.length > 1) {
          return res.status(400).json({
            mensaje:
              "El número de teléfono está asociado a varias cuentas. Recupera tu acceso usando tu correo.",
          });
        }

        user = usersByPhone[0];
      }
    }

    if (!user)
      return res.status(404).json({ mensaje: "Usuario no encontrado" });

    const token = crypto.randomBytes(32).toString("hex");
    user.resetToken = token;
    user.resetTokenExpires = Date.now() + 60 * 60 * 1000; // 1 hora
    await user.save();

    const link = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
    await sendResetLinkEmail(user.email, link);

    res.json({ mensaje: "Enlace de recuperación enviado al correo." });
  } catch (err) {
    console.error("❌ Error en sendRecoveryLink:", err);
    res
      .status(500)
      .json({ mensaje: "Error al enviar enlace", error: err.message });
  }
};

/* =====================================================
   🔄 Restablecer contraseña por link (corregido y optimizado)
   ===================================================== */
const resetPasswordByLink = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    // 🔍 Verificar que el token es válido y no ha expirado
    const user = await Usuario.findOne({
      resetToken: token,
      resetTokenExpires: { $gt: Date.now() },
    });

    if (!user)
      return res.status(400).json({ mensaje: "Token inválido o expirado." });

    // 🔐 Actualizar la contraseña del usuario
    user.password = await bcrypt.hash(newPassword, 10);
    user.resetToken = undefined;
    user.resetTokenExpires = undefined;

    // 🧹 Si el usuario tiene 2FA habilitado, limpiamos cualquier OTP anterior
    // y reiniciamos su cuota de envío para evitar errores al reenviar
    let step = "LOGIN_REQUIRED"; // Siempre debe volver al login

    if (user.is2FAEnabled) {
      user.otpCode = null;
      user.otpExpires = null;
      user.otpSendCount = 0; // 🔥 Reinicia contador diario de OTP
      user.otpSendDate = null; // 🔥 Evita bloqueos falsos al intentar reenviar
    }

    await user.save();

    // 📤 Responder al frontend con paso claro: LOGIN_REQUIRED
    return res.json({
      mensaje:
        "Contraseña restablecida correctamente. Inicia sesión con tus nuevos datos.",
      step: "LOGIN_REQUIRED", // ✅ siempre vuelve al login
      requiresOtp: user.is2FAEnabled || false, // el front sabrá si luego pedirá OTP
      identifier: user.email || user.username || user.phones?.[0] || "", // para referencia
    });
  } catch (err) {
    console.error("❌ Error en resetPasswordByLink:", err);
    return res.status(500).json({ mensaje: "Error en el servidor" });
  }
};

module.exports = {
  register,
  login,
  verify2FA,
  sendRecoveryLink,
  resetPasswordByLink,
};