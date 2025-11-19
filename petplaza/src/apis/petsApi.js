import axios from "axios";

const isLocal = typeof window !== "undefined" && window.location.hostname === "localhost";
const BASE_URL = isLocal ? "http://localhost:5000/api/pets" : "/api/pets";

const api = axios.create({
  baseURL: BASE_URL.replace("/api/pets", ""),
  headers: { "Content-Type": "application/json" },
});

export const getPets = async (filter = "") => {
  try {
    const url = filter ? `/api/pets?filter=${encodeURIComponent(filter)}` : "/api/pets";
    const res = await api.get(url);
    return Array.isArray(res.data) ? res.data : [];
  } catch (err) {
    console.error("❌ Error obteniendo mascotas:", err);
    return [];
  }
};

export const createPet = async (data) => (await api.post("/api/pets", data)).data;
export const updatePet = async (id, data) => (await api.put(`/api/pets/${id}`, data)).data;
export const deletePet = async (id) => (await api.delete(`/api/pets/${id}`)).data;