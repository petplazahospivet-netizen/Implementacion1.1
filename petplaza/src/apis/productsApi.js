// src/apis/productsApi.js
import axios from "axios";

// Detectar si estamos en localhost
const isLocal = typeof window !== "undefined" && window.location.hostname === "localhost";

// Base para compatibilidad con Render
const BASE_URL = isLocal
  ? "http://localhost:5000/api/products"
  : "/api/products";

const api = axios.create({
  baseURL: BASE_URL.replace("/api/products", ""),
  headers: { "Content-Type": "application/json" },
});

// =======================
// Obtener productos
// =======================
export const getProducts = async () => {
  const res = await api.get("/api/products");
  return Array.isArray(res.data) ? res.data : [];
};

// =======================
// Crear producto
// =======================
export const createProduct = async (data) => {
  const res = await api.post("/api/products", data);
  return res.data;
};

// =======================
// Actualizar producto
// =======================
export const updateProduct = async (id, data) => {
  const res = await api.put(`/api/products/${id}`, data);
  return res.data;
};

// =======================
// Eliminar producto
// =======================
export const deleteProduct = async (id) => {
  const res = await api.delete(`/api/products/${id}`);
  return res.data;
};

// =======================
// Registrar compra (entrada stock)
// =======================
export const registrarEntrada = async (data) => {
  const res = await api.post("/api/products/entrada", data);
  return res.data;
};

// =======================
// Actualizar stock generico
// =======================
export const actualizarStock = async (data) => {
  const res = await api.post("/api/products/actualizar-stock", data);
  return res.data;
};

// =======================
// Obtener alertas de inventario
// =======================
export const getInventoryAlerts = async () => {
  const res = await api.get("/api/products/alerts");
  return res.data;
};