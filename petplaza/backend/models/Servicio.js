// backend/models/Servicio.js
const mongoose = require("mongoose");

const servicioSchema = new mongoose.Schema(
  {
    nombre: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    descripcion: {
      type: String,
      trim: true,
      default: "",
    },
    precio: {
      type: Number,
      required: true,
      min: 0,
    },
    categoria: {
      type: String,
      enum: ["Consulta", "Vacunación", "Cirugía", "Desparasitación", "Estética", "Otro"],
      default: "Otro",
    },
    activo: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Servicio", servicioSchema);