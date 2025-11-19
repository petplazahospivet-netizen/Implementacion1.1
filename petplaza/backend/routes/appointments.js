// backend/routes/appointment.js
const express = require("express");
const router = express.Router();
const {
  getAppointments,
  createAppointment,
  updateAppointment,
  deleteAppointment,
  checkAvailability,
} = require("../controllers/citaController");

router.get("/", getAppointments);
router.post("/", createAppointment);
router.put("/:id", updateAppointment);
router.delete("/:id", deleteAppointment);
router.get("/check-availability", checkAvailability);

module.exports = router;
