// backend/controllers/citaController.js
const mongoose = require("mongoose");
const Appointment = require("../models/Appointment");
const Owner = require("../models/Owner");
const Pet = require("../models/Pet");
const Usuario = require("../models/Usuario");

const WORKDAY_START = "08:00";
const WORKDAY_END = "18:00";

/* =====================================================
   Funciones auxiliares
===================================================== */
function hmToMinutes(hm) {
  const [h, m] = (hm || "").split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

function isWithinWorkingHours(hora) {
  const t = hmToMinutes(hora);
  const start = hmToMinutes(WORKDAY_START);
  const end = hmToMinutes(WORKDAY_END);
  if (t == null) return false;
  return t >= start && t < end;
}

async function hasVetConflict({ vetId, fecha, hora, excludeId = null }) {
  if (!vetId || !fecha || !hora) return false;

  const vetObjectId = new mongoose.Types.ObjectId(vetId);

  const citas = await Appointment.find({
    vetId: vetObjectId,
    fecha,
    estado: { $ne: "cancelada" },
    ...(excludeId && { _id: { $ne: excludeId } }),
  });

  return citas.some((c) => c.hora === hora);
}

/* =====================================================
   Obtener citas (filtrado por estado si se pasa)
===================================================== */
exports.getAppointments = async (req, res) => {
  try {
    const { estado } = req.query;
    const filter = estado ? { estado } : {};

    const citas = await Appointment.find(filter)
      .populate("ownerId", "full_name")
      .populate("petId", "nombre")
      .populate("vetId", "full_name role")
      .sort({ fecha: 1, hora: 1 });

    res.status(200).json(citas);
  } catch (err) {
    console.error("Error obteniendo citas:", err);
    res.status(500).json({ mensaje: "Error al obtener citas" });
  }
};

/* =====================================================
   Crear cita
===================================================== */
exports.createAppointment = async (req, res) => {
  try {
    let { ownerId, petId, vetId, motivo, fecha, hora } = req.body;

    if (!ownerId || !petId || !vetId || !motivo || !fecha || !hora)
      return res.status(400).json({ mensaje: "Todos los campos son obligatorios" });

    if (!isWithinWorkingHours(hora))
      return res.status(400).json({
        mensaje: `La hora seleccionada (${hora}) está fuera del horario laboral (${WORKDAY_START}–${WORKDAY_END}).`,
      });

    vetId = vetId._id || vetId;

    const conflictVet = await hasVetConflict({ vetId, fecha, hora });
    if (conflictVet)
      return res.status(409).json({ mensaje: "El veterinario ya tiene una cita en ese horario." });

    const nuevaCita = new Appointment({
      ownerId,
      petId,
      vetId,
      motivo,
      fecha,
      hora,
      estado: "programada",
    });

    const citaGuardada = await nuevaCita.save();

    const citaCompleta = await Appointment.findById(citaGuardada._id)
      .populate("ownerId", "full_name")
      .populate("petId", "nombre")
      .populate("vetId", "full_name role");

    res.status(201).json(citaCompleta);
  } catch (err) {
    console.error("Error creando cita:", err);
    if (err.code === 11000)
      return res.status(409).json({ mensaje: "El veterinario ya tiene una cita en ese horario." });

    res.status(500).json({ mensaje: "Error al crear cita" });
  }
};

/* =====================================================
   Actualizar cita
===================================================== */
exports.updateAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const datos = req.body;

    const citaExistente = await Appointment.findById(id);
    if (!citaExistente)
      return res.status(404).json({ mensaje: "Cita no encontrada" });

    const nuevaFecha = datos.fecha || citaExistente.fecha;
    const nuevaHora = datos.hora || citaExistente.hora;
    const nuevoVetId = datos.vetId?._id || datos.vetId || citaExistente.vetId;

    if (datos.hora && !isWithinWorkingHours(nuevaHora)) {
      return res.status(400).json({
        mensaje: `La hora seleccionada (${nuevaHora}) está fuera del horario laboral (${WORKDAY_START}–${WORKDAY_END}).`,
      });
    }

    const seCambioHorario = datos.fecha || datos.hora || datos.vetId;
    if (seCambioHorario) {
      const conflictVet = await hasVetConflict({
        vetId: nuevoVetId,
        fecha: nuevaFecha,
        hora: nuevaHora,
        excludeId: id,
      });
      if (conflictVet)
        return res.status(409).json({ mensaje: "El veterinario ya tiene una cita en ese horario." });
    }

    const citaActualizada = await Appointment.findByIdAndUpdate(
      id,
      { ...datos, fecha: nuevaFecha, hora: nuevaHora, vetId: nuevoVetId },
      { new: true }
    )
      .populate("ownerId", "full_name")
      .populate("petId", "nombre")
      .populate("vetId", "full_name role");

    res.status(200).json(citaActualizada);
  } catch (err) {
    console.error("Error actualizando cita:", err);
    if (err.code === 11000)
      return res.status(409).json({ mensaje: "El veterinario ya tiene una cita en ese horario." });

    res.status(500).json({ mensaje: "Error actualizando cita" });
  }
};

/* =====================================================
   Eliminar cita
===================================================== */
exports.deleteAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    await Appointment.findByIdAndDelete(id);
    res.status(200).json({ mensaje: "Cita eliminada correctamente" });
  } catch (err) {
    console.error("Error eliminando cita:", err);
    res.status(500).json({ mensaje: "Error al eliminar cita" });
  }
};

/* =====================================================
   Verificar disponibilidad
===================================================== */
exports.checkAvailability = async (req, res) => {
  try {
    const { vetId, date, hora } = req.query;
    if (!vetId || !date || !hora)
      return res.status(400).json({ disponible: false, mensaje: "Datos incompletos" });

    const conflictVet = await hasVetConflict({ vetId, fecha: date, hora });
    res.status(200).json({
      disponible: !conflictVet,
      mensaje: conflictVet
        ? "El veterinario ya tiene una cita en ese horario."
        : "Horario disponible.",
    });
  } catch (err) {
    console.error("Error en checkAvailability:", err);
    res.status(500).json({ mensaje: "Error verificando disponibilidad" });
  }
};