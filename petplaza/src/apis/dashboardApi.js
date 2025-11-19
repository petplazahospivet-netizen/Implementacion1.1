// src/apis/dashboardApi.js
import axios from "axios";

/* ============================================================
   🌐 BASE_URL DINÁMICA (Local / Render)
============================================================ */
const BASE_URL =
  process.env.NODE_ENV === "production"
    ? "/api/dashboard"          // Render
    : "http://localhost:5000/api/dashboard"; // Local

/* ============================================================
   🔹 OBTENER DATOS DEL DASHBOARD
============================================================ */
export const getDashboardData = async () => {
  try {
    const res = await axios.get(BASE_URL);

    // Validamos backend
    if (!res.data || !res.data.success) {
      throw new Error(res.data?.message || "Error obteniendo dashboard");
    }

    // Devolvemos el formato REAL del backend
    return {
      ownersCount: res.data.ownersCount,
      petsCount: res.data.petsCount,
      appointmentsCount: res.data.appointmentsCount,
      lowStock: res.data.lowStock,
      lowStockItems: res.data.lowStockItems,
      recentAppointments: res.data.recentAppointments,
    };
  } catch (error) {
    console.error("❌ Error al obtener los datos del dashboard:", error);
    throw new Error("No se pudieron cargar los datos del dashboard");
  }
};
