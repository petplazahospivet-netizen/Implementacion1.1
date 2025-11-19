// src/apis/expedientesApi.js
import axios from "axios";

/* =====================================================
   🌐 BASE URL DINÁMICA (Local / Render)
===================================================== */
const BASE_URL =
  process.env.NODE_ENV === "production"
    ? "/api/expedientes"
    : "http://localhost:5000/api/expedientes";

// Cliente Axios directo
const api = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
});

/* =====================================================
   📋 FUNCIONES DE LA API DE EXPEDIENTES
===================================================== */

// 🔹 Obtener todos los expedientes
export const getExpedientes = async () => {
  try {
    const res = await api.get("/");
    return Array.isArray(res.data) ? res.data : [];
  } catch (err) {
    console.error("❌ Error obteniendo expedientes:", err);
    return [];
  }
};

// 🔹 Obtener expediente por ID
export const getExpedienteById = async (id) => {
  try {
    const res = await api.get(`/${id}`);
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
    const res = await api.get(`/buscar/filtros?${query}`);
    return Array.isArray(res.data) ? res.data : [];
  } catch (err) {
    console.error("❌ Error buscando expedientes:", err);
    return [];
  }
};

// 🔹 Crear nuevo expediente
export const createExpediente = async (data) => {
  try {
    const res = await api.post("/", data);
    return res.data;
  } catch (err) {
    console.error("❌ Error creando expediente:", err);
    throw err;
  }
};

// 🔹 Actualizar expediente existente
export const updateExpediente = async (id, data) => {
  try {
    const res = await api.put(`/${id}`, data);
    return res.data;
  } catch (err) {
    console.error("❌ Error actualizando expediente:", err);
    throw err;
  }
};

// 🔹 Eliminar expediente
export const deleteExpediente = async (id) => {
  try {
    const res = await api.delete(`/${id}`);
    return res.data;
  } catch (err) {
    console.error("❌ Error eliminando expediente:", err);
    throw err;
  }
};
