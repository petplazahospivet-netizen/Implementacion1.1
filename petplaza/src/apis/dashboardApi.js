import axios from "axios";

/* ============================================================
   🌐 CONFIGURACIÓN DE ENDPOINT
   ============================================================ */
const BASE_URL = "http://localhost:5000/api/dashboard";
//const BASE_URL = "/api/dashboard";

/* ============================================================
   🔹 OBTENER DATOS DEL DASHBOARD
   ============================================================ */
export const getDashboardData = async () => {
  try {
    const res = await axios.get(BASE_URL);

    // Verificamos que la estructura sea la esperada
    if (!res.data || !res.data.data) {
      throw new Error("Estructura de respuesta inválida del servidor");
    }

    return res.data.data; // Devuelve directamente el objeto con { ownersCount, petsCount, appointmentsCount, ... }
  } catch (error) {
    console.error("Error al obtener los datos del dashboard:", error);
    throw new Error("No se pudieron cargar los datos del dashboard");
  }
};