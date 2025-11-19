// backend/routes/servicioRoutes.js
const express = require("express");
const router = express.Router();
const { getServicios, createServicio, deleteServicio } = require("../controllers/servicioController");

router.get("/", getServicios);
router.post("/", createServicio);
router.delete("/:id", deleteServicio);

module.exports = router;
