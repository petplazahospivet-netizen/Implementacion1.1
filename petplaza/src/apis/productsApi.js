// src/apis/productsApi.js
import axios from "axios";

/* ==========================================================
   🌍 BASE URL dinámica según entorno (Local / Render)
========================================================== */
const BASE_URL =
  process.env.NODE_ENV === "production"
    ? "/api/products"                        // Render (mismo dominio)
    : "http://localhost:5000/api/products";  // Local

/* ==========================================================
   📌 Cliente Axios
========================================================== */
const api = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
});

/* ==========================================================
   📋 FUNCIONES DE PRODUCTOS
========================================================== */

// Obtener productos
export const getProducts = async () => {
  const res = await api.get("/");
  return Array.isArray(res.data) ? res.data : [];
};

// Crear producto
export const createProduct = async (data) => {
  const res = await api.post("/", data);
  return res.data;
};

// Actualizar producto
export const updateProduct = async (id, data) => {
  const res = await api.put(`/${id}`, data);
  return res.data;
};

// Eliminar producto
export const deleteProduct = async (id) => {
  const res = await api.delete(`/${id}`);
  return res.data;
};

// Registrar compra (entrada de stock)
export const registrarEntrada = async (data) => {
  const res = await api.post("/entrada", data);
  return res.data;
};

// Actualizar stock genérico
export const actualizarStock = async (data) => {
  const res = await api.post("/actualizar-stock", data);
  return res.data;
};

// Obtener alertas de inventario
export const getInventoryAlerts = async () => {
  const res = await api.get("/alerts");
  return res.data;
};
