// src/apis/appointmentsApi.js

// 🌍 BASE URL dinámica según entorno
const BASE_URL =
  process.env.NODE_ENV === "production"
    ? "/api/appointments"
    : "http://localhost:5000/api/appointments";

export async function getAppointments(estado) {
  const params = estado ? `?estado=${estado}` : "";
  const res = await fetch(`${BASE_URL}${params}`);
  if (!res.ok) throw new Error("Error obteniendo citas");
  return res.json();
}

export async function createAppointment(cita) {
  const res = await fetch(BASE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(cita),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.mensaje || "Error creando cita");
  return data;
}

export async function updateAppointment(id, cita) {
  const res = await fetch(`${BASE_URL}/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(cita),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.mensaje || "Error actualizando cita");
  return data;
}

export async function deleteAppointment(id) {
  const res = await fetch(`${BASE_URL}/${id}`, { method: "DELETE" });
  const data = await res.json();
  if (!res.ok) throw new Error(data.mensaje || "Error eliminando cita");
  return data;
}

export async function checkAvailability({ vetId, date, hora }) {
  const params = new URLSearchParams({ vetId, date, hora });
  const res = await fetch(`${BASE_URL}/check-availability?${params}`);
  const data = await res.json();
  return data;
}
