// src/apis/serviciosApi.js
//const BASE_URL = "http://localhost:5000/api/servicios";

import axios from "axios";

const isLocal = typeof window !== "undefined" && window.location.hostname === "localhost";
const BASE_URL = isLocal ? "http://localhost:5000/api/servicios" : "/api/servicios";

const api = axios.create({
  baseURL: BASE_URL.replace("/api/servicios", ""),
  headers: { "Content-Type": "application/json" },
});

export const getServicios = async () => {
  try {
    const res = await api.get("/api/servicios");
    return Array.isArray(res.data) ? res.data : [];
  } catch (err) {
    console.error("❌ Error obteniendo servicios:", err);
    return [];
  }
};
