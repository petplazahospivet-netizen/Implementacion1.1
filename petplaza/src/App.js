import React, { useState, useEffect, useCallback } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Outlet,
  useNavigate,
} from "react-router-dom";
import ReactDOM from "react-dom";

import Login from "./components/Login";
import Sidebar from "./components/Sidebar";
import Navbar from "./components/Navbar";
import Dashboard from "./components/Dashboard";
import Users from "./components/Users";
import Dueños from "./components/Dueños";
import Mascotas from "./components/Mascotas";
import Citas from "./components/Citas";
import MedicalRecords from "./components/MedicalRecords";
import Facturacion from "./components/Facturacion";
import Inventory from "./components/Inventory";
import Reports from "./components/Reports";

import "./App.css";

function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}

function AppRoutes() {
  const [user, setUser] = useState(null);

  const [showWarning, setShowWarning] = useState(false);
  const [showSessionClosed, setShowSessionClosed] = useState(false);
  const [countdown, setCountdown] = useState(60);

  const navigate = useNavigate();

  // ================= RESTAURAR LOGIN ===================
  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    if (savedUser) setUser(JSON.parse(savedUser));
  }, []);

  const handleLogin = (data) => {
    const userData = {
      usuario: data.username,
      full_name: data.full_name,
      email: data.email,
      role: data.role,
      token: data.token,
    };

    setUser(userData);
    localStorage.setItem("user", JSON.stringify(userData));
    navigate("/dashboard");
  };

  // ================ LOGOUT ====================
  const handleLogout = useCallback(() => {
    setShowWarning(false);
    setShowSessionClosed(false);
    setCountdown(60);

    setUser(null);
    localStorage.removeItem("user");
    navigate("/");
  }, [navigate]);

  // =====================================================
  // 🔥 LÓGICA DE INACTIVIDAD (MEJORADA)
  // =====================================================
  useEffect(() => {
    if (!user) return;

    let inactivityTimer;
    let warningTimer;
    let countdownInterval;

    const INACTIVITY_LIMIT = 7 * 60 * 1000;
    const WARNING_TIME = 6 * 60 * 1000;

    const resetTimer = () => {
      clearTimeout(inactivityTimer);
      clearTimeout(warningTimer);
      clearInterval(countdownInterval);

      setShowWarning(false);
      setShowSessionClosed(false);
      setCountdown(60);

      // Mostrar advertencia
      warningTimer = setTimeout(() => {
        setShowWarning(true);

        setCountdown(60);

        countdownInterval = setInterval(() => {
          setCountdown((prev) => {
            // Vibración REAL (solo últimos 5 segundos)
            if (prev <= 5 && prev > 0) {
              if (navigator.vibrate) {
                navigator.vibrate(200);
              }
            }

            if (prev <= 1) {
              clearInterval(countdownInterval);
            }

            return prev - 1;
          });
        }, 1000);
      }, WARNING_TIME);

      // Cierre total por inactividad
      inactivityTimer = setTimeout(() => {
        clearInterval(countdownInterval);
        setShowWarning(false);
        setShowSessionClosed(true);

        setTimeout(() => {
          handleLogout();
        }, 3500);
      }, INACTIVITY_LIMIT);
    };

    const events = ["mousemove", "keydown", "click"];
    events.forEach((ev) => window.addEventListener(ev, resetTimer));

    resetTimer();

    return () => {
      clearTimeout(inactivityTimer);
      clearTimeout(warningTimer);
      clearInterval(countdownInterval);
      events.forEach((ev) => window.removeEventListener(ev, resetTimer));
    };
  }, [user, handleLogout]);

  // =====================================================
  // ⚠️ WARNING MODAL
  // =====================================================
  const WarningModal = () =>
    ReactDOM.createPortal(
      <div className="inactivity-overlay blur-bg disable-all">
        <div
          className={`inactivity-modal ${countdown <= 5 ? "shake-modal" : ""}`}
        >
          <h2
            className={`countdown-title ${
              countdown > 40 ? "green" : countdown > 15 ? "yellow" : "red"
            }`}
          >
            ⚠️ Inactividad detectada
          </h2>

          <p className="warning-text">Tu sesión se cerrará en:</p>

          {/* Círculo progresivo */}
          <div className="countdown-progress">
            <svg className="progress-ring" width="120" height="120">
              <circle
                className={`progress-ring-circle ${
                  countdown > 40
                    ? "stroke-green"
                    : countdown > 15
                    ? "stroke-yellow"
                    : "stroke-red"
                }`}
                strokeWidth="6"
                fill="transparent"
                r="52"
                cx="60"
                cy="60"
                style={{
                  strokeDashoffset: 326.72 - (326.72 * (60 - countdown)) / 60,
                }}
              />
            </svg>

            <span
              className={`countdown-text ${
                countdown > 40 ? "green" : countdown > 15 ? "yellow" : "red"
              }`}
            >
              {countdown}s
            </span>
          </div>

          {/* Barra lineal */}
          <div className="progress-line-wrapper">
            <div
              className={`progress-line ${
                countdown > 40
                  ? "green-line"
                  : countdown > 15
                  ? "yellow-line"
                  : "red-line"
              }`}
              style={{
                width: `${(countdown / 60) * 100}%`,
              }}
            ></div>
          </div>
        </div>
      </div>,
      document.body
    );

  // =====================================================
  // 🔒 MODAL DE CIERRE
  // =====================================================
  const SessionClosedModal = () =>
    ReactDOM.createPortal(
      <div className="inactivity-overlay blur-bg disable-all">
        <div className="inactivity-modal session-closed">
          <h2>🔒 Sesión cerrada</h2>
          <p>Tu sesión fue cerrada por inactividad.</p>
        </div>
      </div>,
      document.body
    );

  const Layout = () => (
    <div className="app-layout">
      <Sidebar user={user} />
      <div className="app-content">
        <Navbar user={user} onLogout={handleLogout} />
        <main className="app-main">
          <Outlet />
        </main>
      </div>
    </div>
  );

  return (
    <>
      <Routes>
        <Route path="/" element={<Login onSubmit={handleLogin} />} />
        <Route
          path="/reset-password"
          element={<Login onSubmit={handleLogin} />}
        />

        {user && (
          <Route path="/" element={<Layout user={user}/>}>
            <Route index element={<Dashboard user={user}/>} />
            <Route path="dashboard" element={<Dashboard user={user}/>} />
            <Route path="users" element={<Users user={user} />} />
            <Route path="owners" element={<Dueños user={user}/>} />
            <Route path="pets" element={<Mascotas user={user}/>} />
            <Route path="inventory" element={<Inventory user={user}/>} />
            <Route path="appointments" element={<Citas user={user}/>} />
            <Route path="medical-records" element={<MedicalRecords user={user}/>} />
            <Route path="facturacion" element={<Facturacion user={user}/>} />
            <Route path="reports" element={<Reports user={user} />} />
          </Route>
        )}

        {!user && <Route path="*" element={<Login onSubmit={handleLogin} />} />}
      </Routes>

      {showWarning && <WarningModal />}
      {showSessionClosed && <SessionClosedModal />}
    </>
  );
}
export default App;