// backend/controllers/servicioController.js
const Servicio = require("../models/Servicio");

// Obtener todos los servicios activos
exports.getServicios = async (req, res) => {
  try {
    const servicios = await Servicio.find({ activo: true }).sort({ nombre: 1 });
    res.json(servicios);
  } catch (error) {
    res.status(500).json({ mensaje: "Error obteniendo servicios", error: error.message });
  }
};

// Crear nuevo servicio
exports.createServicio = async (req, res) => {
  try {
    const { nombre, descripcion, precio, categoria } = req.body;
    const nuevo = new Servicio({ nombre, descripcion, precio, categoria });
    await nuevo.save();
    res.status(201).json({ mensaje: "Servicio creado correctamente", servicio: nuevo });
  } catch (error) {
    res.status(500).json({ mensaje: "Error creando servicio", error: error.message });
  }
};

// Eliminar servicio
exports.deleteServicio = async (req, res) => {
  try {
    await Servicio.findByIdAndDelete(req.params.id);
    res.json({ mensaje: "Servicio eliminado correctamente" });
  } catch (error) {
    res.status(500).json({ mensaje: "Error eliminando servicio", error: error.message });
  }
};