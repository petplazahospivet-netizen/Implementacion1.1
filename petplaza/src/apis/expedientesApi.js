// src/apis/expedientesApi.js
import axios from "axios";

/* =====================================================
   🌐 CONFIGURACIÓN BASE
   Detecta entorno local o producción automáticamente
===================================================== */
const isLocal =
  typeof window !== "undefined" && window.location.hostname === "localhost";

const BASE_URL = isLocal
  ? "http://localhost:5000/api/expedientes"
  : "/api/expedientes";

const api = axios.create({
  baseURL: BASE_URL.replace("/api/expedientes", ""),
  headers: { "Content-Type": "application/json" },
});

/* =====================================================
   📋 FUNCIONES DE LA API DE EXPEDIENTES
===================================================== */

// 🔹 Obtener todos los expedientes
export const getExpedientes = async () => {
  try {
    const res = await api.get("/api/expedientes");
    return Array.isArray(res.data) ? res.data : [];
  } catch (err) {
    console.error("❌ Error obteniendo expedientes:", err);
    return [];
  }
};

// 🔹 Obtener expediente por ID
export const getExpedienteById = async (id) => {
  try {
    const res = await api.get(`/api/expedientes/${id}`);
    return res.data;
  } catch (err) {
    console.error("❌ Error obteniendo expediente:", err);
    throw err;
  }
};

// 🔹 Buscar expedientes (por filtros: tipo, dueño, mascota, doctor)
export const searchExpedientes = async (params) => {
  try {
    const query = new URLSearchParams(params).toString();
    const res = await api.get(`/api/expedientes/buscar/filtros?${query}`);
    return Array.isArray(res.data) ? res.data : [];
  } catch (err) {
    console.error("❌ Error buscando expedientes:", err);
    return [];
  }
};

// 🔹 Crear nuevo expediente
export const createExpediente = async (data) => {
  try {
    const res = await api.post("/api/expedientes", data);
    return res.data;
  } catch (err) {
    console.error("❌ Error creando expediente:", err);
    throw err;
  }
};

// 🔹 Actualizar expediente existente
export const updateExpediente = async (id, data) => {
  try {
    const res = await api.put(`/api/expedientes/${id}`, data);
    return res.data;
  } catch (err) {
    console.error("❌ Error actualizando expediente:", err);
    throw err;
  }
};

// 🔹 Eliminar expediente
export const deleteExpediente = async (id) => {
  try {
    const res = await api.delete(`/api/expedientes/${id}`);
    return res.data;
  } catch (err) {
    console.error("❌ Error eliminando expediente:", err);
    throw err;
  }
};