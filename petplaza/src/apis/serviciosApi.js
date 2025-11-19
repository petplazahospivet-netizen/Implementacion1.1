// src/apis/serviciosApi.js
import axios from "axios";

/* ==========================================================
   🌍 BASE URL dinámica según entorno (Local / Render)
========================================================== */
const BASE_URL =
  process.env.NODE_ENV === "production"
    ? "/api/servicios"                        // Render (mismo dominio)
    : "http://localhost:5000/api/servicios";  // Local

/* ==========================================================
   📌 Cliente Axios
========================================================== */
const api = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
});

/* ==========================================================
   📋 FUNCIONES DE SERVICIOS
========================================================== */

// Obtener servicios
export const getServicios = async () => {
  try {
    const res = await api.get("/");
    return Array.isArray(res.data) ? res.data : [];
  } catch (err) {
    console.error("❌ Error obteniendo servicios:", err);
    return [];
  }
};
