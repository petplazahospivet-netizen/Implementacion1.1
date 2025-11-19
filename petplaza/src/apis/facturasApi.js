// src/apis/facturasApi.js
import axios from "axios";

/* ==========================================================
    🌍 BASE URL dinámica según entorno (Local + Render)
========================================================== */

//  Detectar si está en entorno local
const isLocal =
  typeof window !== "undefined" &&
  (window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1");

//  En local → usa puerto del backend
//  En Render → usa el mismo dominio del frontend
const BASE_URL = isLocal
  ? "http://localhost:5000/api/facturas"
  : "/api/facturas";

/* ==========================================================
    CLIENTE AXIOS BASE
========================================================== */
const api = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
  withCredentials: false,
});

/* ==========================================================
    OBTENER TODAS LAS FACTURAS
========================================================== */
export const getFacturas = async () => {
  try {
    const res = await api.get("/");
    return Array.isArray(res.data) ? res.data : [];
  } catch (error) {
    console.error("❌ Error en getFacturas:", error);
    return [];
  }
};

/* ==========================================================
    CREAR NUEVA FACTURA
========================================================== */
export const createFactura = async (data) => {
  try {
    const res = await api.post("/", data);
    return res.data;
  } catch (error) {
    console.error("❌ Error en createFactura:", error);
    const mensaje =
      error.response?.data?.mensaje ||
      (error.message.includes("Network")
        ? "Error de conexión con el servidor"
        : "Error creando factura");
    throw new Error(mensaje);
  }
};

/* ==========================================================
    ACTUALIZAR FACTURA
========================================================== */
export const updateFactura = async (id, data) => {
  try {
    const res = await api.put(`/${id}`, data);
    return res.data;
  } catch (error) {
    console.error("❌ Error en updateFactura:", error);
    throw new Error(
      error.response?.data?.mensaje || "Error actualizando factura"
    );
  }
};

/* ==========================================================
    ACTUALIZAR ESTADO (Pagado / Pendiente / Cancelado)
========================================================== */
export const updateFacturaEstado = async (id, estado) => {
  try {
    const res = await api.put(`/${id}/estado`, { estado });
    return res.data;
  } catch (error) {
    console.error("❌ Error en updateFacturaEstado:", error);
    throw new Error(
      error.response?.data?.mensaje ||
        "Error actualizando el estado de la factura"
    );
  }
};

/* ==========================================================
    OBTENER FACTURA POR ID
========================================================== */
export const getFacturaById = async (id) => {
  try {
    const res = await api.get(`/${id}`);
    return res.data;
  } catch (error) {
    console.error("❌ Error en getFacturaById:", error);
    throw new Error(
      error.response?.data?.mensaje || "Error obteniendo factura"
    );
  }
};

/* ==========================================================
    OBTENER LOTE CAI ACTIVO (Navbar.js)
========================================================== */
export const getLoteActivo = async () => {
  try {
    const res = await api.get("/loteActivo");
    return res.data;
  } catch (error) {
    console.error("❌ Error en getLoteActivo:", error);
    throw new Error(
      error.response?.data?.mensaje || "Error obteniendo lote activo"
    );
  }
};
