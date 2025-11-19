// backend/routes/reportRoutes.js
const express = require("express");
const {
  generarReporteGeneral,
  obtenerReportes,
  obtenerReportePorId,
} = require("../controllers/reportController");

const router = express.Router();

/* ==========================================================
   📊 RUTAS DE REPORTES
   Prefijo: /api/reports
========================================================== */

// 🧾 Generar reporte general (ventas + inventario + citas)
router.get("/generate", generarReporteGeneral);

// 📂 Obtener todos los reportes guardados
router.get("/", obtenerReportes);

// 📋 Obtener un reporte específico por ID
router.get("/:id", obtenerReportePorId);

module.exports = router;