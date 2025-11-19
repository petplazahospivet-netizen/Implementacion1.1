// backend/routes/facturaRoutes.js
const express = require("express");
const router = express.Router();
const facturaController = require("../controllers/facturaController");

router.get("/loteActivo", facturaController.obtenerLoteActivo);
router.get("/", facturaController.obtenerFacturas);
router.get("/:id", facturaController.obtenerFacturaPorId);
router.post("/", facturaController.createFactura);
router.put("/:id", facturaController.actualizarFactura);
router.put("/:id/estado", facturaController.actualizarEstadoFactura);
//  (Opcional) ELIMINAR FACTURA - Generalmente NO se usa en SAR Honduras
// router.delete("/:id", facturaController.eliminarFactura);

module.exports = router;