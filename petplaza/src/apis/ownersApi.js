// src/apis/ownersApi.js
import axios from "axios";

/* ==========================================================
   🌍 BASE URL dinámica según entorno (Local / Render)
========================================================== */
const BASE_URL =
  process.env.NODE_ENV === "production"
    ? "/api/owners"                     // Render (mismo dominio)
    : "http://localhost:5000/api/owners"; // Local

/* ==========================================================
   📌 Cliente Axios
========================================================== */
const api = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
});

/* ==========================================================
   📋 FUNCIONES DE OWNERS
========================================================== */

// Obtener todos
export const getOwners = async () => {
  try {
    const res = await api.get("/");
    return Array.isArray(res.data) ? res.data : [];
  } catch (err) {
    console.error("❌ Error obteniendo dueños:", err);
    return [];
  }
};

// Crear
export const createOwner = async (data) => {
  const res = await api.post("/", data);
  return res.data;
};

// Actualizar
export const updateOwner = async (id, data) => {
  const res = await api.put(`/${id}`, data);
  return res.data;
};

// Eliminar
export const deleteOwner = async (id) => {
  const res = await api.delete(`/${id}`);
  return res.data;
};
