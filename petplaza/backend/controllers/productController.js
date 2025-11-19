// backend/controllers/productController.js
const Product = require("../models/Product");

/* ============================
   CREAR PRODUCTO
============================ */
const createProduct = async (req, res) => {
  try {
    const { name, category, quantity, price, minStock, provider, purchaseDate, expiryDate } = req.body;

    const product = new Product({
      name,
      category,
      quantity,
      price,
      minStock,
      provider,
      purchaseDate,
      expiryDate,
    });

    await product.save();
    res.status(201).json(product);
  } catch (err) {
    res.status(500).json({ mensaje: "Error creando producto", error: err.message });
  }
};

/* ============================
   OBTENER PRODUCTOS
============================ */
const getProducts = async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    res.json(products);
  } catch (err) {
    res.status(500).json({ mensaje: "Error obteniendo productos", error: err.message });
  }
};

/* ============================
   ACTUALIZAR PRODUCTO
============================ */
const updateProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    if (!product) {
      return res.status(404).json({ mensaje: "Producto no encontrado" });
    }

    res.json(product);
  } catch (err) {
    res.status(500).json({ mensaje: "Error actualizando producto", error: err.message });
  }
};

/* ============================
   ELIMINAR PRODUCTO
============================ */
const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);

    if (!product) {
      return res.status(404).json({ mensaje: "Producto no encontrado" });
    }

    res.json({ mensaje: "Producto eliminado correctamente" });
  } catch (err) {
    res.status(500).json({ mensaje: "Error eliminando producto", error: err.message });
  }
};

/* ============================
   ACTUALIZAR STOCK
============================ */
const actualizarStock = async (req, res) => {
  try {
    const { productId, cantidad, tipo } = req.body;
    const qty = Number(cantidad);

    if (!productId || !qty) {
      return res.status(400).json({ mensaje: "productId y cantidad son requeridos" });
    }

    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ mensaje: "Producto no encontrado" });

    if (tipo === "entrada") {
      product.quantity += qty;
    } else if (tipo === "salida") {
      if (product.quantity < qty) {
        return res.status(400).json({ mensaje: "Stock insuficiente" });
      }
      product.quantity -= qty;
    }

    await product.save();
    res.json({ mensaje: "Stock actualizado", product });

  } catch (err) {
    res.status(500).json({ mensaje: "Error actualizando stock", error: err.message });
  }
};

/* ============================
   REGISTRAR ENTRADA
============================ */
const registrarEntrada = async (req, res) => {
  try {
    const { productId, cantidad, fecha, nota } = req.body;

    if (!productId || !cantidad) {
      return res.status(400).json({ mensaje: "productId y cantidad son requeridos" });
    }

    const qty = Number(cantidad);
    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({ mensaje: "Producto no encontrado" });
    }

    product.quantity += qty;
    if (fecha) product.purchaseDate = new Date(fecha);
    if (nota) product.nota = nota;

    await product.save();

    res.json({
      mensaje: "Entrada registrada correctamente",
      product
    });

  } catch (err) {
    res.status(500).json({ mensaje: "Error registrando entrada", error: err.message });
  }
};

/* ============================
   ALERTAS DE INVENTARIO
============================ */
const getInventoryAlerts = async (req, res) => {
  try {
    const products = await Product.find();

    const today = new Date();
    const next30 = new Date();
    next30.setDate(today.getDate() + 30);

    const expired = [];
    const expiringSoon = [];
    const lowStock = [];
    const notRestocked = [];

    products.forEach(p => {

      if (p.expiryDate && new Date(p.expiryDate) < today) {
        expired.push(p);
      }

      if (
        p.expiryDate &&
        new Date(p.expiryDate) >= today &&
        new Date(p.expiryDate) <= next30
      ) {
        expiringSoon.push(p);
      }

      if (p.quantity <= p.minStock) {
        lowStock.push(p);
      }

      if (p.purchaseDate) {
        const diff = (today - new Date(p.purchaseDate)) / (1000 * 60 * 60 * 24);
        if (diff >= 60) notRestocked.push(p);
      }
    });

    res.json({
      expired,
      expiringSoon,
      lowStock,
      notRestocked,
      total:
        expired.length +
        expiringSoon.length +
        lowStock.length +
        notRestocked.length,
    });

  } catch (err) {
    res.status(500).json({ mensaje: "Error generando alertas", error: err.message });
  }
};

module.exports = {
  createProduct,
  getProducts,
  updateProduct,
  deleteProduct,
  actualizarStock,
  registrarEntrada,
  getInventoryAlerts,
};