import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import "../CSS/Login.css";
import logo from "../assets/logo.jpeg";
import {
  loginApi,
  verifyOtpApi,
  sendRecoveryLinkApi,
  resetPasswordByLinkApi,
} from "../apis/authApi";
import {
  Eye,
  EyeOff,
  CheckCircle2,
  MailCheck,
  ShieldCheck,
} from "lucide-react";

/* ==========================================================
   🔍 VALIDACIONES DE USUARIO / CORREO / TELÉFONO
   ========================================================== */
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const phoneRegex = /^\+?\d{8,15}$/;
const usernameRegex = /^[a-zA-Z0-9_.-]{3,}$/;

const Login = ({ onSubmit }) => {
  /* ==========================
     ESTADOS GLOBALES
     ========================== */
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [step, setStep] = useState("LOGIN"); // LOGIN | OTP | RECOVER | SENT | RESET | SUCCESS
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [blockedUntil, setBlockedUntil] = useState(null);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [countdown, setCountdown] = useState(0);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  // ==========================================================
  // 🔄 LIMPIAR TODOS LOS CAMPOS
  // ==========================================================
  const resetAllFields = () => {
    setIdentifier("");
    setPassword("");
    setOtpCode("");
    setNewPassword("");
    setConfirmPassword("");
    setError("");
    setInfo("");
    setLoading(false);
  };

  /* ==========================================================
     🎯 DETECTAR TOKEN DE RECUPERACIÓN
     ========================================================== */
  useEffect(() => {
    if (token) setStep("RESET"); // Cambia el paso a "RESET" si hay un token
  }, [token]);

  /* ==========================================================
     🧼 Limpiar campos al cargar o volver al login
     ========================================================== */
  useEffect(() => {
    resetAllFields();
  }, []);

  /* ==========================================================
   🧹 Limpiar estado al cambiar de usuario (nuevo intento)
   ========================================================== */
  useEffect(() => {
    // Cada vez que cambia el identificador, limpiamos errores, bloqueos e intentos
    setError("");
    setInfo("");
    setFailedAttempts(0);
    setBlockedUntil(null);
    setCountdown(0);
  }, [identifier]);

  /* ==========================================================
   ✅ VALIDACIONES
   ========================================================== */
  const validateIdentifier = () => {
    const value = identifier.trim();
    if (!value) {
      setError("Debes ingresar tu usuario, correo o teléfono.");
      return false;
    }

    const isEmail = emailRegex.test(value);
    const isPhone = phoneRegex.test(value);
    const isUsername = usernameRegex.test(value);

    if (!isEmail && !isPhone && !isUsername) {
      setError("Formato inválido. Usa usuario, correo o teléfono válido.");
      return false;
    }

    return true;
  };

  /* ==========================================================
     🔒 BLOQUEO AUTOMÁTICO (7 intentos)
     ========================================================== */
  useEffect(() => {
    if (blockedUntil) {
      const interval = setInterval(() => {
        const remaining = Math.max(
          0,
          Math.floor((blockedUntil - Date.now()) / 1000)
        );
        setCountdown(remaining);
        if (remaining <= 0) {
          setBlockedUntil(null);
          setFailedAttempts(0);
        }
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [blockedUntil]);

  const handleFailedLogin = () => {
    const next = failedAttempts + 1;
    setFailedAttempts(next);
    if (next >= 7) {
      const blockTime = Date.now() + 60 * 60 * 1000;
      setBlockedUntil(blockTime);
      setError("Demasiados intentos fallidos. Intenta de nuevo en 1 hora.");
    } else {
      setError(`Credenciales incorrectas. Intento ${next}/7.`);
    }
  };

  /* ==========================================================
     🚪 LOGIN PRINCIPAL
     ========================================================== */
  const handleLogin = async (e) => {
    e.preventDefault();
    if (blockedUntil && Date.now() < blockedUntil) {
      setError("Cuenta bloqueada temporalmente. Espera unos minutos.");
      return;
    }

    // Limpia cualquier sesión anterior
    localStorage.removeItem("identifier");
    localStorage.removeItem("token");
    localStorage.removeItem("role");

    setError("");
    setInfo("");
    if (!validateIdentifier() || !password.trim()) {
      setError("Campos incompletos.");
      return;
    }

    try {
      setLoading(true);
      const data = await loginApi({ identifier, password });

      // Si backend devuelve bloqueo activo
      if (data.bloqueado_hasta) {
        setBlockedUntil(new Date(data.bloqueado_hasta).getTime());
        setError(data.mensaje || "Cuenta bloqueada temporalmente.");
        return;
      }

      if (data.step === "2FA_REQUIRED") {
        // ✅ Usar exactamente el identificador con el que el usuario inició sesión
        const realIdentifier = identifier.trim();
        localStorage.setItem("identifier", realIdentifier);
        console.log("✅ Guardando identifier para OTP:", realIdentifier);

        setStep("OTP");
        setInfo(
          data.mensaje?.includes("reenviado")
            ? "Nuevo código OTP reenviado a tu correo."
            : "Se ha enviado un código OTP a tu correo."
        );
      } else {
        localStorage.setItem("token", data.token);
        localStorage.setItem("role", data.role);

        // 🔧 Formateamos los datos que espera App.js
        const formattedData = {
          username: data.username,
          full_name: data.full_name,
          role: data.role,
          token: data.token,
          email: data.email || "",
        };

        // 🔥 Llamamos a onSubmit con el formato correcto
        if (onSubmit) onSubmit(formattedData);
      }
    } catch (err) {
      handleFailedLogin();
      setError(err.message || "Error en las credenciales.");
    } finally {
      setLoading(false);
    }
  };

  /* ==========================================================
   🔢 VERIFICAR OTP (ACTUALIZADA)
   ========================================================== */
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError("");
    setInfo("");

    if (!otpCode.trim() || otpCode.length !== 4) {
      setError("Ingresa el código de 4 dígitos.");
      return;
    }

    try {
      setLoading(true);
      const storedIdentifier = localStorage.getItem("identifier") || identifier;

      console.log(
        "➡️ Verificando OTP para:",
        storedIdentifier,
        "Código:",
        otpCode
      );
      const data = await verifyOtpApi({
        identifier: storedIdentifier,
        otpCode,
      });

      console.log("✅ Respuesta backend OTP:", data);

      // ✅ Guardar datos importantes en localStorage
      localStorage.setItem("token", data.token);
      localStorage.setItem("role", data.role);

      // 🔧 Estructura que App.js espera
      const formattedData = {
        username: data.username || storedIdentifier,
        full_name: data.full_name || "",
        email: data.email || "",
        role: data.role || "",
        token: data.token || "",
      };

      console.log("🚀 Enviando datos a App.js:", formattedData);

      // 🔥 Enviamos datos al padre (App.js)
      if (onSubmit) onSubmit(formattedData);
    } catch (err) {
      console.error("❌ Error verificando OTP:", err);
      setError(
        err.message ||
          "El código OTP no es válido o ya expiró. Intenta reenviar uno nuevo."
      );
    } finally {
      setLoading(false);
    }
  };

  /* ==========================================================
   🔁 REENVIAR OTP (seguro)
   ========================================================== */
  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    try {
      setResendCooldown(60);
      setInfo("Nuevo código enviado a tu correo.");

      // ✅ Reenvía OTP usando el identifier almacenado, sin reenviar contraseña real
      const storedIdentifier = localStorage.getItem("identifier") || identifier;
      await loginApi({
        identifier: storedIdentifier,
        password: "__otp_resend__",
      });
    } catch {
      setError("No se pudo reenviar el código. Intenta más tarde.");
    }
  };

  useEffect(() => {
    if (resendCooldown > 0) {
      const t = setInterval(
        () => setResendCooldown((prev) => Math.max(prev - 1, 0)),
        1000
      );
      return () => clearInterval(t);
    }
  }, [resendCooldown]);

  /* ==========================================================
     📧 ENVIAR ENLACE DE RECUPERACIÓN
     ========================================================== */
  const handleSendRecoveryLink = async (e) => {
    e.preventDefault();
    if (!validateIdentifier()) return;
    setError("");
    setInfo("");

    try {
      setLoading(true);
      const data = await sendRecoveryLinkApi({ identifier });
      setInfo(data.mensaje || "Hemos enviado un enlace a tu correo.");
      setStep("SENT");
    } catch (err) {
      setError(err.message || "No se pudo enviar el enlace.");
    } finally {
      setLoading(false);
    }
  };

  /* ==========================================================
   🔐 RESTABLECER CONTRASEÑA (ACTUALIZADA Y SIN FLUJO ROTO)
   ========================================================== */
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError("");
    setInfo("");

    if (!newPassword || !confirmPassword)
      return setError("Todos los campos son obligatorios.");
    if (newPassword !== confirmPassword)
      return setError("Las contraseñas no coinciden.");
    if (newPassword.length < 8)
      return setError("Debe tener al menos 8 caracteres.");

    try {
      setLoading(true);
      const data = await resetPasswordByLinkApi({ token, newPassword });

      console.log("🧩 Resultado reset:", data);

      // 1️⃣ Siempre redirige primero al LOGIN
      if (data.step === "LOGIN_REQUIRED") {
        resetAllFields();

        // Si requiere 2FA, guardamos el identificador para el login posterior
        if (data.requiresOtp && data.identifier) {
          localStorage.setItem("identifier", data.identifier);
        }

        setInfo(
          data.mensaje ||
            "Contraseña restablecida correctamente. Inicia sesión con tus nuevos datos."
        );
        setStep("LOGIN");
        // ✅ Limpia la URL para evitar que vuelva a RESET
        window.history.replaceState({}, document.title, "/");
        return;
      }

      // 2️⃣ Solo si backend explícitamente pide OTP (caso muy raro)
      if (data.step === "2FA_REQUIRED") {
        localStorage.setItem("identifier", data.identifier || identifier);
        setInfo(
          "Contraseña restablecida. Verifica el código enviado a tu correo."
        );
        setStep("OTP");
        return;
      }

      // 3️⃣ Fallback de éxito (por compatibilidad)
      setStep("SUCCESS");
    } catch (err) {
      setError(err.message || "Error al restablecer contraseña.");
    } finally {
      setLoading(false);
    }
  };

  /* ==========================================================
     🖼️ INTERFAZ
     ========================================================== */
  return (
    <div className="login-wrapper">
      <div className="login-bg">
        <div className="login-card">
          <div className="login-logo-wrapper">
            <img
              src={logo}
              alt="Logo PetPlaza"
              className={`login-logo ${
                step === "SUCCESS" || step === "OTP" ? "spin-logo" : ""
              }`}
            />
          </div>

          <h1 className="login-title">PETPLAZA</h1>
          <p className="login-subtitle">HOSPIVET</p>

          {/* BLOQUEO VISUAL */}
          {countdown > 0 &&
            (() => {
              const minutes = Math.floor(countdown / 60);
              const seconds = countdown % 60;
              const msg =
                minutes > 0
                  ? `🕒 Cuenta bloqueada temporalmente. Te quedan ${minutes} minuto(s) y ${seconds} segundo(s).`
                  : `⏳ Espera ${minutes} minuto(s) y ${seconds} segundo(s) antes de volver a intentar.`;

              return (
                <p
                  style={{
                    color: "#dc2626",
                    fontWeight: 600,
                    textAlign: "center",
                  }}
                >
                  {msg}
                </p>
              );
            })()}

          {/* === LOGIN === */}
          {step === "LOGIN" && (
            <form onSubmit={handleLogin} className="login-form">
              <label className="login-label">
                Usuario
                <input
                  type="text"
                  className="login-input"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder=""
                  required
                />
              </label>

              <label className="login-label">
                Contraseña
                <div className="password-wrapper">
                  <input
                    type={showPassword ? "text" : "password"}
                    className="login-input"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder=""
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="pw-toggle-btn"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </label>

              {error && <div className="login-error">{error}</div>}
              {info && <div className="login-success">{info}</div>}

              <button type="submit" className="login-button" disabled={loading}>
                {loading ? "Iniciando..." : "Iniciar Sesión"}
              </button>

              <div className="login-footer">
                <button
                  type="button"
                  className="btn-link elegant-link"
                  onClick={() => setStep("RECOVER")}
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
            </form>
          )}

          {/* === OTP === */}
          {step === "OTP" && (
            <form onSubmit={handleVerifyOtp} className="login-form">
              <div style={{ textAlign: "center" }}>
                <ShieldCheck
                  size={58}
                  color="#2563eb"
                  style={{ margin: "0 auto 1rem" }}
                />
                <p style={{ fontWeight: 600, marginBottom: "0.5rem" }}>
                  Verificación en dos pasos
                </p>
                <p style={{ color: "#475569", marginBottom: "1rem" }}>
                  Ingresa el código de <strong>4 dígitos</strong> enviado a tu
                  correo.
                </p>
              </div>

              <input
                type="text"
                className="login-input"
                value={otpCode}
                onChange={(e) =>
                  setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 4))
                }
                placeholder="Código OTP (4 dígitos)"
                maxLength={4}
                required
              />

              {error && <div className="login-error">{error}</div>}
              {info && <div className="login-success">{info}</div>}

              <button type="submit" className="login-button" disabled={loading}>
                {loading ? "Verificando..." : "Verificar Código"}
              </button>

              <button
                type="button"
                onClick={handleResendOtp}
                className={`btn-link elegant-link ${
                  resendCooldown > 0 ? "disabled" : ""
                }`}
                disabled={resendCooldown > 0 || loading}
              >
                {resendCooldown > 0
                  ? `Reenviar código en ${resendCooldown}s`
                  : "Reenviar código"}
              </button>

              <button
                type="button"
                className="btn-link elegant-link"
                onClick={() => {
                  resetAllFields();
                  setStep("LOGIN");
                }}
              >
                ← Volver al inicio
              </button>
            </form>
          )}

          {/* === RECOVER === */}
          {step === "RECOVER" && (
            <form onSubmit={handleSendRecoveryLink} className="login-form">
              <p className="login-desc">
                Restablece tu contraseña por correo electrónico.
              </p>
              <label className="login-label">
                Usuario
                <input
                  type="text"
                  className="login-input"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder=""
                  required
                />
              </label>
              {error && <div className="login-error">{error}</div>}
              {info && <div className="login-success">{info}</div>}
              <button type="submit" className="login-button" disabled={loading}>
                {loading ? "Enviando..." : "Enviar enlace"}
              </button>
              <button
                type="button"
                className="btn-link elegant-link"
                onClick={() => {
                  resetAllFields();
                  setStep("LOGIN");
                }}
              >
                ← Volver al inicio
              </button>
            </form>
          )}

          {/* === SENT === */}
          {step === "SENT" && (
            <div className="login-form" style={{ textAlign: "center" }}>
              <MailCheck
                size={56}
                color="#10b981"
                style={{ margin: "0 auto 1rem" }}
              />
              <p style={{ color: "#16a34a", fontWeight: 600 }}>
                Hemos enviado un enlace seguro a tu correo.
              </p>
              <p style={{ color: "#334155", fontSize: "0.95rem" }}>
                Revisa tu bandeja de entrada y sigue las instrucciones para
                restablecer tu contraseña.
              </p>
              <button
                type="button"
                className="login-button"
                onClick={() => {
                  resetAllFields();
                  setStep("LOGIN");
                }}
              >
                Volver al inicio
              </button>
            </div>
          )}

          {/* === RESET === */}
          {step === "RESET" && (
            <form onSubmit={handleResetPassword} className="login-form">
              <p className="login-desc">Ingresa tu nueva contraseña:</p>

              <label className="login-label">
                Nueva Contraseña
                <div className="password-wrapper">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    className="login-input"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder=""
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="pw-toggle-btn"
                  >
                    {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </label>

              <label className="login-label">
                Confirmar Contraseña
                <div className="password-wrapper">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    className="login-input"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder=""
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="pw-toggle-btn"
                  >
                    {showConfirmPassword ? (
                      <EyeOff size={18} />
                    ) : (
                      <Eye size={18} />
                    )}
                  </button>
                </div>
              </label>

              {error && <div className="login-error">{error}</div>}
              {info && <div className="login-success">{info}</div>}

              <button type="submit" className="login-button" disabled={loading}>
                {loading ? "Guardando..." : "Guardar Contraseña"}
              </button>
              <button
                type="button"
                className="btn-link elegant-link"
                onClick={() => setStep("LOGIN")}
              >
                ← Volver al inicio
              </button>
            </form>
          )}

          {/* === SUCCESS === */}
          {step === "SUCCESS" && (
            <div className="login-form" style={{ textAlign: "center" }}>
              <CheckCircle2
                size={64}
                color="#10b981"
                style={{ margin: "0 auto 1rem" }}
              />
              <p className="login-success-text">
                ¡Contraseña restablecida correctamente!
              </p>
              <p style={{ color: "#475569" }}>Puedes iniciar sesión ahora.</p>
              <button className="login-button" onClick={() => setStep("LOGIN")}>
                Volver al inicio
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;