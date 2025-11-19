// backend/routes/loteFacturaRoutes.js
const express = require("express");
const router = express.Router();
const LoteFactura = require("../models/LoteFactura");

// 📄 Obtener todos los lotes
router.get("/", async (req, res) => {
  try {
    const lotes = await LoteFactura.find().sort({ createdAt: -1 });
    res.json(lotes);
  } catch (error) {
    console.error("Error obteniendo lotes:", error);
    res.status(500).json({ mensaje: "Error obteniendo lotes" });
  }
});

// ➕ Crear nuevo lote CAI
router.post("/", async (req, res) => {
  try {
    const { cai, rangoDesde, rangoHasta } = req.body;
    if (!cai || !rangoDesde || !rangoHasta) {
      return res.status(400).json({ mensaje: "Campos requeridos faltantes." });
    }

    const fechaAutorizacion = new Date();
    const fechaLimite = new Date();
    fechaLimite.setMonth(fechaAutorizacion.getMonth() + 10);

    const nuevoLote = new LoteFactura({
      cai,
      rangoDesde,
      rangoHasta,
      correlativoActual: 0,
      fechaAutorizacion,
      fechaLimite,
      activo: true,
    });

    // Desactivar otros lotes
    await LoteFactura.updateMany({}, { $set: { activo: false } });

    await nuevoLote.save();
    res.status(201).json({ mensaje: "Lote creado correctamente", lote: nuevoLote });
  } catch (error) {
    console.error("Error creando lote:", error);
    res.status(500).json({ mensaje: "Error creando lote" });
  }
});

// 🔄 Activar un lote existente
router.put("/:id/activar", async (req, res) => {
  try {
    const { id } = req.params;
    await LoteFactura.updateMany({}, { $set: { activo: false } });
    const lote = await LoteFactura.findByIdAndUpdate(
      id,
      { activo: true },
      { new: true }
    );
    if (!lote) return res.status(404).json({ mensaje: "Lote no encontrado" });
    res.json({ mensaje: "Lote activado correctamente", lote });
  } catch (error) {
    console.error("Error activando lote:", error);
    res.status(500).json({ mensaje: "Error activando lote" });
  }
});

// 🔍 Obtener lote CAI activo
router.get("/activo", async (req, res) => {
  try {
    const loteActivo = await LoteFactura.findOne({ activo: true }).sort({
      createdAt: -1,
    });

    if (!loteActivo) {
      return res.status(404).json({ mensaje: "No hay lote activo" });
    }

    res.json(loteActivo);
  } catch (error) {
    console.error("Error obteniendo lote activo:", error);
    res.status(500).json({ mensaje: "Error obteniendo lote activo" });
  }
});

module.exports = router;
