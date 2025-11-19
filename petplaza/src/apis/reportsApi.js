// src/apis/reportsApi.js
import axios from "axios";

/* ==========================================================
   🌎 CONFIGURACIÓN BASE_URL DINÁMICA
   Se ajusta automáticamente entre local y producción
========================================================== */
const isLocal =
  typeof window !== "undefined" && window.location.hostname === "localhost";

const BASE_URL = isLocal
  ? "http://localhost:5000/api/reports"
  : "/api/reports";

/* ==========================================================
   🚀 CLIENTE AXIOS BASE
========================================================== */
const api = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
});

/* ==========================================================
   📊 GENERAR REPORTE GENERAL (ventas + inventario + citas)
========================================================== */
export const generateReport = async (start, end) => {
  try {
    const res = await api.get("/generate", {
      params: { start, end },
    });
    return res.data;
  } catch (error) {
    console.error("❌ Error generando reporte:", error);
    throw new Error(
      error.response?.data?.message || "Error generando reporte general"
    );
  }
};

/* ==========================================================
   📂 OBTENER TODOS LOS REPORTES GUARDADOS
========================================================== */
export const getAllReports = async () => {
  try {
    const res = await api.get("/");
    return Array.isArray(res.data) ? res.data : [];
  } catch (error) {
    console.error("❌ Error obteniendo reportes:", error);
    return [];
  }
};

/* ==========================================================
   📋 OBTENER REPORTE POR ID
========================================================== */
export const getReportById = async (id) => {
  try {
    const res = await api.get(`/${id}`);
    return res.data;
  } catch (error) {
    console.error("❌ Error obteniendo reporte por ID:", error);
    throw new Error(
      error.response?.data?.message || "Error obteniendo reporte"
    );
  }
};