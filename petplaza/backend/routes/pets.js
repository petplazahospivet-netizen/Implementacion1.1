// backend/routes/pets.js
const express = require("express");
const {
  getPets,
  getPetsByOwner,
  createPet,
  updatePet,
  deletePet,
} = require("../controllers/petController");

const router = express.Router();

/* =====================================================
   🐾 RUTAS DE MASCOTAS (PETS)
   Base: /api/pets
===================================================== */

// 📋 Listar todas las mascotas (con filtro opcional ?filter=)
router.get("/", getPets);

// 📋 Listar mascotas de un dueño específico
// Ejemplo: GET /api/pets/by-owner/67157cfb35d3ac3b21e6e78b
router.get("/by-owner/:id", getPetsByOwner);

// ➕ Registrar nueva mascota
router.post("/", createPet);

// ✏️ Actualizar mascota existente
router.put("/:id", updatePet);

// 🗑️ Eliminar mascota
router.delete("/:id", deletePet);

module.exports = router;