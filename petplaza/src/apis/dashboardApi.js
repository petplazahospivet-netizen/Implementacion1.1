// src/apis/dashboardApi.js
import axios from "axios";

/* ============================================================
   🌐 CONFIGURACIÓN DE ENDPOINT DINÁMICO (Dev / Producción)
============================================================ */
const BASE_URL =
  process.env.NODE_ENV === "production"
    ? "/api/dashboard"                         // Render (mismo dominio)
    : "http://localhost:5000/api/dashboard";   // Local

// Cliente Axios
const api = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
});

/* ============================================================
   🔹 OBTENER DATOS DEL DASHBOARD
============================================================ */
export const getDashboardData = async () => {
  try {
    // Llamamos siempre a la raíz del endpoint
    const res = await api.get("/");

    console.log("📊 Respuesta cruda de /api/dashboard:", res.data);

    // Soportar dos posibles estructuras:
    // 1) { data: { ownersCount, ... } }
    // 2) { ownersCount, petsCount, ... }
    const payload = res.data?.data ?? res.data;

    if (!payload || typeof payload !== "object") {
      throw new Error("Estructura de respuesta inválida del servidor");
    }

    // Devuelve directamente el objeto con { ownersCount, petsCount, appointmentsCount, ... }
    return payload;
  } catch (error) {
    console.error("Error al obtener los datos del dashboard:", error);
    throw new Error("No se pudieron cargar los datos del dashboard");
  }
};
