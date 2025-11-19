// src/components/Navbar.js
import React, { useState, useEffect, useRef } from "react";
import { Bell, LogOut, X } from "lucide-react";
import "../CSS/Navbar.css";
import { useNavigate, useLocation } from "react-router-dom";

import { getAppointments } from "../apis/appointmentsApi";
import { getInventoryAlerts } from "../apis/productsApi";

import EscudoIcon from "../assets/icons/escudo-de-seguridad.png";
import EstetoscopioIcon from "../assets/icons/estetoscopio.png";
import QuimicoIcon from "../assets/icons/quimico.png";
import InventarioIcon from "../assets/icons/inventario.png";
import RecepcionIcon from "../assets/icons/recepcionista.png";

const Navbar = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const dropdownRef = useRef(null);

  const [showModal, setShowModal] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const [appointments, setAppointments] = useState([]);
  const [alertaCAI, setAlertaCAI] = useState(null);
  const [invAlerts, setInvAlerts] = useState(null);

  // Roles
  const roles = [
    { value: "admin", label: "Administrador", color: "#ef44444d", icon: EscudoIcon },
    { value: "veterinario", label: "Doctor", color: "#227ed45b", icon: EstetoscopioIcon },
    { value: "laboratorio", label: "Laboratorio", color: "#8a5cf64f", icon: QuimicoIcon },
    { value: "farmacia", label: "Inventario", color: "#10b98165", icon: InventarioIcon },
    { value: "recepcion", label: "Recepción", color: "#f9741660", icon: RecepcionIcon },
  ];
  const roleData = roles.find((r) => r.value === user?.role) || null;

  const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5000";

  // ==================== CITAS ====================
  const fetchAppointments = async () => {
    try {
      const data = await getAppointments();
      const programadas = data
        .filter((a) => a.estado?.toLowerCase() === "programada")
        .sort((a, b) => new Date(`${a.fecha}T${a.hora}`) - new Date(`${b.fecha}T${b.hora}`))
        .slice(0, 3);
      setAppointments(programadas);
    } catch (err) {
      console.error("Error obteniendo citas:", err);
    }
  };

  // ==================== CAI ====================
  const fetchCAIStatus = async () => {
    try {
      if (location.pathname === "/Facturacion") {
        const res = await fetch(`${API_BASE}/api/facturas/loteActivo`);
        if (!res.ok) throw new Error("Error al obtener CAI");
        const data = await res.json();
        setAlertaCAI(data.alerta ? data : null);
      } else {
        setAlertaCAI(null);
      }
    } catch (err) {
      console.error("Error verificando CAI:", err);
    }
  };

  // ==================== INVENTARIO ====================
  const fetchInventoryAlerts = async () => {
    try {
      const data = await getInventoryAlerts();
      return data;
    } catch (err) {
      console.error("Error obteniendo alertas de inventario:", err);
      return null;
    }
  };

  // ==================== REFRESCO ====================
  useEffect(() => {
    fetchAppointments();
    fetchCAIStatus();
  }, [location.pathname]);

  // ==================== INVENTARIO: actualización automática ====================
  useEffect(() => {
    let interval;
    if (location.pathname === "/Inventory") {
      setInvAlerts(null); // fuerza "Cargando..."

      const lastDataRef = { current: null };

      const checkInventory = async () => {
        const data = await fetchInventoryAlerts();
        if (!data) return;

        // Compara cambios reales
        const hasChanges =
          JSON.stringify(data.expired) !== JSON.stringify(lastDataRef.current?.expired) ||
          JSON.stringify(data.expiringSoon) !== JSON.stringify(lastDataRef.current?.expiringSoon) ||
          JSON.stringify(data.lowStock) !== JSON.stringify(lastDataRef.current?.lowStock);

        if (hasChanges) {
          setInvAlerts(data);
          lastDataRef.current = data;
        }
      };

      // Llamada inicial
      checkInventory();

      // Intervalo cada 5 segundos
      interval = setInterval(checkInventory, 5000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [location.pathname]);

  // ==================== CERRAR DROPDOWN AL CLIC FUERA ====================
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ==================== FUNCIONES ====================
  const openModal = () => { setShowModal(true); setIsClosing(false); };
  const closeModal = () => { setIsClosing(true); setTimeout(() => setShowModal(false), 300); };
  const handleLogout = () => { if (onLogout) onLogout(); navigate("/"); };

  const formatDate = (fecha, hora) => {
    const date = new Date(`${fecha}T${hora}`);
    return date.toLocaleString("es-ES", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  };

  // ==================== COLOR CAMPANA ====================
  let bellColor = "";
  if (alertaCAI?.alerta === "expired") bellColor = "text-red-500";
  else if (alertaCAI?.alerta === "warning") bellColor = "text-yellow-500";
  else if (location.pathname === "/Inventory" && invAlerts?.total > 0) bellColor = "text-red-500";
  else if (appointments.length > 0) bellColor = "text-green-500";

  // ==================== RENDER ====================
  return (
    <div className="navbar-wrapper">
      <header className="navbar">
        {/* CAMPANA */}
        <div className="navbar-icon-wrapper" ref={dropdownRef}>
          <button
            className={`navbar-icon navbar-bell ${bellColor}`}
            onClick={() => setShowDropdown(!showDropdown)}
            title="Notificaciones"
          >
            <Bell size={20} />
            {(appointments.length > 0 || alertaCAI || (location.pathname === "/Inventory" && invAlerts?.total > 0)) && <span className="alert-badge"></span>}
          </button>

          {showDropdown && (
            <div className="notifications-dropdown">
              <h4>Centro de Notificaciones</h4>

              {/* CITAS */}
              <div className="notif-section">
                <h5>🗓️ Próximas Citas</h5>
                {appointments.length === 0 ? (
                  <p className="notif-empty">No hay citas programadas.</p>
                ) : (
                  appointments.map((a) => (
                    <div key={a._id} className="notification-item fade-in">
                      <strong>{a.ownerId?.full_name || "Desconocido"}</strong> – {a.petId?.nombre || "Mascota"}<br />
                      {formatDate(a.fecha, a.hora)}
                    </div>
                  ))
                )}
              </div>

              {/* INVENTARIO: Solo en /Inventory */}
              {location.pathname === "/Inventory" && (
                <div className="notif-section">
                  <h5>📦 Inventario</h5>
                  {!invAlerts ? (
                    <p className="notif-empty">Cargando...</p>
                  ) : invAlerts.total === 0 ? (
                    <p className="notif-empty">Todo en orden</p>
                  ) : (
                    <>
                      {invAlerts.expired.length > 0 && <p className="text-red-500 font-semibold">🔴 {invAlerts.expired.length} productos vencidos</p>}
                      {invAlerts.expiringSoon.length > 0 && <p className="text-yellow-500 font-semibold">🟡 {invAlerts.expiringSoon.length} por vencer en 30 días</p>}
                      {invAlerts.lowStock.length > 0 && <p className="text-orange-500 font-semibold">🟠 {invAlerts.lowStock.length} con stock bajo</p>}
                    </>
                  )}
                </div>
              )}

              {/* CAI */}
              {alertaCAI && (
                <div className="notif-section">
                  <h5>📄 Estado del Lote CAI</h5>
                  {alertaCAI.alerta === "expired" && <p className="text-red-500 font-semibold">⚠️ Lote vencido</p>}
                  {alertaCAI.alerta === "warning" && <p className="text-yellow-500 font-semibold">⚠️ Lote próximo a vencer</p>}
                  {alertaCAI.alerta === "ok" && <p className="text-green-600 font-semibold">🟢 Lote activo</p>}
                  <p>Restantes: <strong>{alertaCAI.restantes}</strong></p>
                  <p>Días restantes: <strong>{alertaCAI.diasRestantes}</strong></p>
                  <p>CAI: {alertaCAI.cai}</p>
                  <p>Rango: {alertaCAI.rangoDesde} → {alertaCAI.rangoHasta}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Usuario */}
        <div className="navbar-user">
          <p className="navbar-username">{user?.full_name || "Usuario"}</p>
          <span className="navbar-role">{roleData?.label || "Sin rol"}</span>
        </div>

        <div className="navbar-avatar" style={{ backgroundColor: roleData?.color || "#00b073" }}>
          {roleData?.icon ? <img src={roleData.icon} alt={roleData.label} className="navbar-avatar-icon" /> : user?.username ? user.username[0].toUpperCase() : "?"}
        </div>

        {/* Logout */}
        <button className="navbar-icon" onClick={openModal} title="Cerrar sesión"><LogOut size={20} /></button>
      </header>

      {/* MODAL LOGOUT */}
      {showModal && (
        <div className={`navbar-logout-modal-overlay ${isClosing ? "fade-out" : ""}`} onClick={closeModal}>
          <div className={`navbar-logout-modal-content ${isClosing ? "fade-out" : ""}`} onClick={(e) => e.stopPropagation()}>
            <button className="navbar-logout-modal-close" onClick={closeModal}><X size={18} /></button>
            <h3 className="navbar-logout-modal-title">¿Deseas cerrar sesión?</h3>
            <div className="navbar-logout-modal-actions">
              <button className="btn-logout-confirm" onClick={() => { closeModal(); setTimeout(() => handleLogout(), 300); }}>Sí</button>
              <button className="btn-logout-cancel" onClick={closeModal}>No</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Navbar;