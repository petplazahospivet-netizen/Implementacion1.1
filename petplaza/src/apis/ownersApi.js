// src/apis/ownersApi.js
import axios from "axios";

const isLocal = typeof window !== "undefined" && window.location.hostname === "localhost";
const BASE_URL = isLocal ? "http://localhost:5000/api/owners" : "/api/owners";

const api = axios.create({
  baseURL: BASE_URL.replace("/api/owners", ""),
  headers: { "Content-Type": "application/json" },
});

export const getOwners = async () => {
  try {
    const res = await api.get("/api/owners");
    return Array.isArray(res.data) ? res.data : [];
  } catch (err) {
    console.error("❌ Error obteniendo dueños:", err);
    return [];
  }
};

export const createOwner = async (data) => (await api.post("/api/owners", data)).data;
export const updateOwner = async (id, data) => (await api.put(`/api/owners/${id}`, data)).data;
export const deleteOwner = async (id) => (await api.delete(`/api/owners/${id}`)).data;