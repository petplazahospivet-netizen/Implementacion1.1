import React, { useState, useEffect } from "react";
import "../CSS/Dashboard.css";

import duenoDeUnaMascota from "../assets/icons/dueno-de-una-mascota.png";
import huellasDeGarras from "../assets/icons/huellas-de-garras.png";
import veterinario from "../assets/icons/veterinario22.png";
import advertencia from "../assets/icons/advertencia.png";

/* ============================================================
   🌐 BASE_URL DINÁMICA (Local / Render)
============================================================ */
const BASE_URL =
  process.env.NODE_ENV === "production"
    ? "/api/dashboard" // Render: mismo dominio
    : "http://localhost:5000/api/dashboard"; // Local

const Dashboard = ({ user }) => {
  const [stats, setStats] = useState({
    owners: 0,
    pets: 0,
    appointments: 0,
    lowStock: 0,
  });

  const [recentAppointments, setRecentAppointments] = useState([]);
  const [lowStockItems, setLowStockItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pulse, setPulse] = useState(false);
  const [userRole, setUserRole] = useState("");

  useEffect(() => {
    const role = localStorage.getItem("role");
    if (role) {
      setUserRole(role.charAt(0).toUpperCase() + role.slice(1));
    }
  }, []);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        setLoading(true);

        // ⬇️ Aquí usamos BASE_URL dinámico
        const res = await fetch(BASE_URL);
        const data = await res.json();

        if (!res.ok || !data.success)
          throw new Error(data.message || "Error obteniendo dashboard");

        setStats({
          owners: data.ownersCount,
          pets: data.petsCount,
          appointments: data.appointmentsCount,
          lowStock: data.lowStock,
        });

        setRecentAppointments(data.recentAppointments || []);
        setLowStockItems(data.lowStockItems || []);

        setPulse(true);
        setTimeout(() => setPulse(false), 1000);
      } catch (error) {
        console.error("Error cargando dashboard:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
    const interval = setInterval(fetchDashboard, 180000);
    return () => clearInterval(interval);
  }, []);

  const Spinner = () => <div className="spinner"></div>;

  const formatLocalDateTime = (fecha, hora) => {
    try {
      if (!fecha) return "Sin fecha";
      const fullDate = hora
        ? `${fecha}T${hora}:00-06:00`
        : `${fecha}T00:00:00-06:00`;
      const date = new Date(fullDate);

      const dateStr = date.toLocaleDateString("es-HN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });

      const timeStr = date.toLocaleTimeString("es-HN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });

      return `${dateStr} — ${timeStr}`;
    } catch (error) {
      console.error("Error formateando fecha:", error);
      return "Formato inválido";
    }
  };

  /* ==========================================================
     🚀 RENDER PRINCIPAL DEL COMPONENTE
  ========================================================== */
  if (
    !user ||
    (user.role !== "admin" &&
      user.role !== "veterinario" &&
      user.role !== "laboratorio" &&
      user.role !== "farmacia" &&
      user.role !== "recepcion")
  ) {
    return (
      <div className="dashboard-no-permissions">
        🚫 No tienes permisos para ver Dashboard Panel pricipal.
      </div>
    );
  }

  return (
    <div className="dashboard-module">
      <div className="dashboard-header fade-in">
        <h1>
          Bienvenido, {userRole ? `${userRole} PetPlaza` : "Usuario PetPlaza"}
        </h1>
        <p>Resumen del sistema de gestión veterinaria</p>
      </div>

      <div className={`stats-grid ${pulse ? "pulse" : ""}`}>
        <div className="stats-card card-hover fade-in">
          <div>
            <p className="stats-number">
              {loading ? <Spinner /> : stats.owners}
            </p>
            <p className="stats-label">Dueños Registrados</p>
          </div>
          <div className="icon bg-blue">
            <img
              src={duenoDeUnaMascota}
              alt="Dueños"
              style={{ width: 32, height: 32 }}
            />
          </div>
        </div>

        <div className="stats-card card-hover fade-in">
          <div>
            <p className="stats-number">{loading ? <Spinner /> : stats.pets}</p>
            <p className="stats-label">Mascotas Registradas</p>
          </div>
          <div className="icon bg-green">
            <img
              src={huellasDeGarras}
              alt="Mascotas"
              style={{ width: 32, height: 32 }}
            />
          </div>
        </div>

        <div className="stats-card card-hover fade-in">
          <div>
            <p className="stats-number">
              {loading ? <Spinner /> : stats.appointments}
            </p>
            <p className="stats-label">Citas Programadas</p>
          </div>
          <div className="icon bg-purple">
            <img
              src={veterinario}
              alt="Citas"
              style={{ width: 32, height: 32 }}
            />
          </div>
        </div>

        <div className="stats-card card-hover fade-in">
          <div>
            <p className="stats-number">
              {loading ? <Spinner /> : stats.lowStock}
            </p>
            <p className="stats-label">Stock Bajo</p>
          </div>
          <div className="icon bg-red">
            <img
              src={advertencia}
              alt="Stock Bajo"
              style={{ width: 32, height: 32 }}
            />
          </div>
        </div>
      </div>

      <div className="lists-grid fade-in">
        {/* Citas Recientes */}
        <div className="card card-hover">
          <h2>Citas Recientes</h2>
          <ul className="scroll-list">
            {loading ? (
              <li className="list-spinner">
                <Spinner /> Cargando citas...
              </li>
            ) : recentAppointments.length > 0 ? (
              recentAppointments.map((appointment) => (
                <li key={appointment._id} className="list-item list-hover">
                  <img
                    src={veterinario}
                    alt="Cita"
                    className="list-icon"
                    style={{ width: 16, height: 16 }}
                  />
                  <div>
                    <p className="font-medium">
                      {appointment.ownerId?.full_name || "Dueño desconocido"}
                    </p>
                    <p className="text-sm">
                      {appointment.petId?.nombre || "Mascota desconocida"} —{" "}
                      {formatLocalDateTime(appointment.fecha, appointment.hora)}
                    </p>
                  </div>
                </li>
              ))
            ) : (
              <li>No hay citas recientes</li>
            )}
          </ul>
        </div>

        {/* Artículos con Stock Bajo */}
        <div className="card card-hover">
          <h2>Artículos con Stock Bajo</h2>
          <ul className="scroll-list">
            {loading ? (
              <li className="list-spinner">
                <Spinner /> Cargando productos...
              </li>
            ) : lowStockItems.length > 0 ? (
              lowStockItems.map((item) => (
                <li key={item._id} className="list-item list-hover">
                  <img
                    src={advertencia}
                    alt="Producto"
                    className="list-icon"
                    style={{ width: 16, height: 16 }}
                  />
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="text-sm text-gray">
                      Categoría: {item.category || "Sin categoría"}
                    </p>
                    <p className="text-sm text-red">
                      Stock actual: {item.quantity} / Mínimo: {item.minStock}
                    </p>
                    <p className="text-sm">
                      Precio: L. {item.price?.toFixed(2) || "0.00"}
                    </p>
                  </div>
                </li>
              ))
            ) : (
              <li>No hay productos con stock bajo</li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
