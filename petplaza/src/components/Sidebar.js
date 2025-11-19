// src/components/Sidebar.js
import React, { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import "../CSS/Sidebar.css";
import logo from "../assets/logo.jpeg";

// Importar íconos PNG del menú
import DashboardIcon from "../assets/icons/DashboardIcon.png";
import PeopleIcon from "../assets/icons/PeopleIcon.png";
import PetsIcon from "../assets/icons/PetsIcon.png";
import EventIcon from "../assets/icons/EventIcon.png";
import MedicalIcon from "../assets/icons/MedicalIcon.png";
import InventoryIcon from "../assets/icons/InventoryIcon.png";
import InvoiceDollarIcon from "../assets/icons/InvoiceDollarIcon.png";
import ChartBarIcon from "../assets/icons/ChartBarIcon.png";
import UserTieIcon from "../assets/icons/UserTieIcon.png";

// 🔹 Importar íconos locales de roles
import EscudoIcon from "../assets/icons/escudo-de-seguridad.png";
import EstetoscopioIcon from "../assets/icons/estetoscopio.png";
import QuimicoIcon from "../assets/icons/quimico.png";
import InventarioIconRole from "../assets/icons/inventario.png";
import RecepcionIcon from "../assets/icons/recepcionista.png";

const Sidebar = ({ user }) => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  // Definir roles con color e ícono
  const roles = [
    { value: "admin", label: "Administrador", color: "#ef44444f", icon: EscudoIcon },
    { value: "veterinario", label: "Doctor", color: "#3b83f64d", icon: EstetoscopioIcon },
    { value: "laboratorio", label: "Laboratorio", color: "#8a5cf63b", icon: QuimicoIcon },
    { value: "farmacia", label: "Personal de Inventario", color: "#10b98134", icon: InventarioIconRole },
    { value: "recepcion", label: "Recepción", color: "#f9741631", icon: RecepcionIcon },
  ];

  const roleData = roles.find((r) => r.value === user?.role) || null;

  // 📌 MATRIZ DE PERMISOS EXACTA SEGÚN LA IMAGEN
  const menuItems = [
    {
      icon: DashboardIcon,
      label: "Dashboard",
      path: "/dashboard",
      anim: "bounce",
      roles: ["admin", "veterinario", "laboratorio", "farmacia", "recepcion"],
    },
    {
      icon: PeopleIcon,
      label: "Dueños",
      path: "/owners",
      anim: "pulse",
      roles: ["admin", "veterinario", "recepcion"],
    },
    {
      icon: PetsIcon,
      label: "Mascotas",
      path: "/pets",
      anim: "spin",
      roles: ["admin", "veterinario", "recepcion"],
    },
    {
      icon: EventIcon,
      label: "Citas",
      path: "/appointments",
      anim: "bounce",
      roles: ["admin", "veterinario", "recepcion"],
    },
    {
      icon: MedicalIcon,
      label: "Expedientes",
      path: "/medical-records",
      anim: "pulse",
      roles: ["admin", "veterinario", "laboratorio"],
    },
    {
      icon: InventoryIcon,
      label: "Inventario",
      path: "/Inventory",
      anim: "spin",
      roles: ["admin", "veterinario", "farmacia"],
    },
    {
      icon: InvoiceDollarIcon,
      label: "Facturación",
      path: "/Facturacion",
      anim: "bounce",
      roles: ["admin", "veterinario", "recepcion"],
    },
    {
      icon: ChartBarIcon,
      label: "Reportes",
      path: "/reports",
      anim: "pulse",
      roles: ["admin"],
    },
    {
      icon: UserTieIcon,
      label: "Usuarios",
      path: "/users",
      anim: "spin",
      roles: ["admin"],
    },
  ];

  return (
    <div className="sidebar-wrapper">
      {/* Botón hamburguesa */}
      <button
        className="hamburger-btn"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Abrir menú"
      >
        {isOpen ? "❌" : "☰"}
      </button>

      {/* Overlay */}
      {isOpen && <div className="sidebar-overlay" onClick={() => setIsOpen(false)}></div>}

      <aside className={`sidebar ${isOpen ? "open" : ""}`}>
        {/* Logo */}
        <div className="sidebar-header" onClick={() => navigate("/dashboard")}>
          <div className="logo-container">
            <img src={logo} alt="PetPlaza Logo" className="sidebar-logo" />
            <div className="logo-text">
              <h2 className="sidebar-title">PetPlaza</h2>
              <p className="sidebar-subtitle">HOSPIVET</p>
            </div>
          </div>
        </div>

        {/* Menú */}
        <nav className="sidebar-menu">
          {menuItems
            .filter((item) => item.roles.includes(user?.role)) // 🔥 FILTRO DE PERMISOS
            .map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `sidebar-item ${isActive ? "active" : ""}`
                }
                onClick={() => setIsOpen(false)}
              >
                <img
                  src={item.icon}
                  alt={item.label}
                  className={`sidebar-icon ${item.anim}`}
                />
                <span>{item.label}</span>
              </NavLink>
            ))}
        </nav>

        {/* Usuario */}
        <div className="sidebar-user">
          <div
            className="sidebar-user-avatar"
            style={{ backgroundColor: roleData?.color || "#10b981" }}
          >
            {roleData?.icon ? (
              <img
                src={roleData.icon}
                alt={roleData.label}
                className="sidebar-user-avatar-icon"
              />
            ) : (
              user?.username ? user.username[0].toUpperCase() : "?"
            )}
          </div>
          <div>
            <p className="sidebar-user-name">{user?.full_name || "Usuario"}</p>
            <p
              className="sidebar-user-role"
              style={{ color: roleData?.color || "#9ca3af" }}
            >
              {roleData?.label || "Sin rol"}
            </p>
          </div>
        </div>
      </aside>
    </div>
  );
};

export default Sidebar;