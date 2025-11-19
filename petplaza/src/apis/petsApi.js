// src/apis/petsApi.js
import axios from "axios";

/* ==========================================================
   🌍 BASE URL dinámica según entorno (Local / Render)
========================================================== */
const BASE_URL =
  process.env.NODE_ENV === "production"
    ? "/api/pets"                        // Render (mismo dominio)
    : "http://localhost:5000/api/pets";  // Local

/* ==========================================================
   📌 Cliente Axios
========================================================== */
const api = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
});

/* ==========================================================
   📋 FUNCIONES DE LA API DE MASCOTAS
========================================================== */

// 🔹 Obtener mascotas (con filtro opcional)
export const getPets = async (filter = "") => {
  try {
    const url = filter
      ? `/?filter=${encodeURIComponent(filter)}`
      : "/";

    const res = await api.get(url);
    return Array.isArray(res.data) ? res.data : [];
  } catch (err) {
    console.error("❌ Error obteniendo mascotas:", err);
    return [];
  }
};

// 🔹 Crear mascota
export const createPet = async (data) => {
  const res = await api.post("/", data);
  return res.data;
};

// 🔹 Actualizar mascota
export const updatePet = async (id, data) => {
  const res = await api.put(`/${id}`, data);
  return res.data;
};

// 🔹 Eliminar mascota
export const deletePet = async (id) => {
  const res = await api.delete(`/${id}`);
  return res.data;
};
