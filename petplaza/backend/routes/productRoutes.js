// backend/routes/productRoutes.js
const express = require("express");
const {
  createProduct,
  getProducts,
  updateProduct,
  deleteProduct,
  actualizarStock,
  registrarEntrada,
  getInventoryAlerts,
} = require("../controllers/productController");

const router = express.Router();

// CRUD
router.post("/", createProduct);
router.get("/", getProducts);
router.put("/:id", updateProduct);
router.delete("/:id", deleteProduct);

// Movimientos de inventario
router.post("/entrada", registrarEntrada);        // compra / entrada
router.post("/actualizar-stock", actualizarStock); // genérico

//   ALERTAS DE INVENTARIO
router.get("/alerts", getInventoryAlerts);

module.exports = router;