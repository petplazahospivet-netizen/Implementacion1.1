// src/apis/authApi.js
// ===============================
// 🌍 BASE URL
// ===============================
const BASE_URL = "http://localhost:5000/api/auth";
// const BASE_URL = "https://petplazahospivet.onrender.com/api/auth"; // 🔹 Producción

/* ==========================================================
   🔐 LOGIN (acepta usuario / correo / teléfono)
   ========================================================== */
export async function loginApi({ identifier, password }) {
  try {
    const res = await fetch(`${BASE_URL}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier, password }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.mensaje || "Error al iniciar sesión");

    console.log("📩 Login response:", data);
    return data; // puede devolver step: "2FA_REQUIRED"
  } catch (err) {
    throw new Error(err.message || "Error en login");
  }
}

/* ==========================================================
   🔢 VERIFICAR OTP (2FA)
   ========================================================== */
export async function verifyOtpApi({ identifier, otpCode }) {
  try {
    const res = await fetch(`${BASE_URL}/verify-2fa`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier, otpCode }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.mensaje || "Error en verificación OTP");
    return data;
  } catch (err) {
    throw new Error(err.message || "Error en verificación OTP");
  }
}

/* ==========================================================
   🧾 REGISTRO DE USUARIO (opcional)
   ========================================================== */
export async function registerApi(formData) {
  try {
    const res = await fetch(`${BASE_URL}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.mensaje || "Error en registro");
    return data;
  } catch (err) {
    throw new Error(err.message || "Error en registro");
  }
}

/* ==========================================================
   📩 ENVIAR ENLACE DE RECUPERACIÓN DE CONTRASEÑA
   ========================================================== */
export async function sendRecoveryLinkApi({ identifier }) {
  try {
    const res = await fetch(`${BASE_URL}/send-recovery-link`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.mensaje || "Error al enviar enlace");
    return data;
  } catch (err) {
    throw new Error(err.message || "Error al enviar enlace");
  }
}

/* ==========================================================
   🔁 RESTABLECER CONTRASEÑA DESDE ENLACE SEGURO
   ========================================================== */
export async function resetPasswordByLinkApi({ token, newPassword }) {
  try {
    const res = await fetch(`${BASE_URL}/reset-password-link`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, newPassword }),
    });

    const data = await res.json();
    console.log("🔁 Reset password response:", data);

    if (!res.ok)
      throw new Error(data.mensaje || "Error al restablecer la contraseña");

    // 🔁 Retorno limpio y fiel al backend
    return {
      step: data.step || "LOGIN_REQUIRED",
      mensaje:
        data.mensaje ||
        "Contraseña restablecida correctamente. Inicia sesión con tus nuevos datos.",
      requiresOtp: data.requiresOtp || false,
      identifier: data.identifier || "",
    };
  } catch (err) {
    throw new Error(err.message || "Error al restablecer contraseña");
  }
}