// backend/routes/expedientes.js
const express = require("express");
const router = express.Router();
const expedienteController = require("../controllers/expedienteController");

// 📄 Crear un nuevo expediente
router.post("/", expedienteController.createExpediente);

// 📄 Obtener todos los expedientes
router.get("/", expedienteController.getExpedientes);

// 📄 Actualizar expediente por ID
router.put("/:id", expedienteController.updateExpediente);

// 📄 Eliminar expediente por ID
router.delete("/:id", expedienteController.deleteExpediente);

module.exports = router;