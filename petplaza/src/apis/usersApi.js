// src/apis/usersApi.js

// 🌍 BASE URL dinámica (dev vs producción)
const BASE_URL =
  process.env.NODE_ENV === "production"
    ? "/api/users"
    : "http://localhost:5000/api/users";

export async function getUsers() {
  const res = await fetch(BASE_URL);
  if (!res.ok) throw new Error("Error obteniendo usuarios");
  return res.json();
}

export async function createUser(userData) {
  const res = await fetch(BASE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(userData),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.mensaje || "Error creando usuario");
  return data;
}

export async function updateUser(id, userData) {
  const res = await fetch(`${BASE_URL}/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(userData),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.mensaje || "Error actualizando usuario");
  return data;
}

export async function resetPassword(id, nuevaContrasena) {
  const res = await fetch(`${BASE_URL}/${id}/reset-password`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nuevaContrasena }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.mensaje || "Error reseteando contraseña");
  return data;
}

export async function deleteUser(id) {
  const res = await fetch(`${BASE_URL}/${id}`, { method: "DELETE" });
  const data = await res.json();
  if (!res.ok) throw new Error(data.mensaje || "Error eliminando usuario");
  return data;
}

// 🔄 Ahora acepta "action": "active" | "inactive" | "blocked"
export async function toggleUserStatus(id, action) {
  const res = await fetch(`${BASE_URL}/${id}/toggle-status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.mensaje || "Error cambiando estado");
  return data;
}
