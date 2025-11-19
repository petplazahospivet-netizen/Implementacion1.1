// backend/controllers/facturaController.js
const mongoose = require("mongoose");
const Factura = require("../models/Factura");
const Owner = require("../models/Owner");
const Pet = require("../models/Pet");
const Servicio = require("../models/Servicio");
const Product = require("../models/Product");
const LoteFactura = require("../models/LoteFactura");

// ======================================================
// OBTENER TODAS LAS FACTURAS
// ======================================================
exports.obtenerFacturas = async (req, res) => {
  try {
    const facturas = await Factura.find()
      .populate("cliente.ownerId")
      .populate("mascota.petId")
      .sort({ createdAt: -1 });

    res.status(200).json(facturas);
  } catch (error) {
    console.error("❌ Error obteniendo facturas:", error);
    res.status(500).json({ mensaje: "Error obteniendo facturas" });
  }
};

// ======================================================
//  OBTENER FACTURA POR ID
// ======================================================
exports.obtenerFacturaPorId = async (req, res) => {
  try {
    const factura = await Factura.findById(req.params.id)
      .populate("cliente.ownerId")
      .populate("mascota.petId");

    if (!factura)
      return res.status(404).json({ mensaje: "Factura no encontrada" });

    res.status(200).json(factura);
  } catch (error) {
    console.error("❌ Error obteniendo factura por ID:", error);
    res.status(500).json({ mensaje: "Error obteniendo factura" });
  }
};

// ======================================================
//  FUNCIÓN AUXILIAR PARA OBTENER LOTE ACTIVO Y VALIDAR
// ======================================================
async function obtenerLoteActivoValido(session) {
  const lote = await LoteFactura.findOne({ activo: true })
    .sort({ updatedAt: -1 })
    .session(session);

  if (!lote)
    throw new Error("No existe lote CAI activo. Registre un lote antes de facturar.");

  if (lote.fechaLimite && new Date(lote.fechaLimite) < new Date()) {
    lote.activo = false;
    await lote.save({ session });
    throw new Error("El lote CAI ha vencido. Debe registrar un nuevo lote.");
  }

  return lote;
}

// ======================================================
//  CREAR NUEVA FACTURA
// ======================================================
exports.createFactura = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    const {
      cliente,
      mascota,
      metodoPago,
      estado,
      servicios = [],
      productos = [],
      descuentoTipo = "monto",
      descuentoValor = 0,
      notas,
    } = req.body;

    await session.withTransaction(async () => {
      // 1️ Lote activo válido
      const lote = await obtenerLoteActivoValido(session);

      // 2️ Generar correlativo legal
      let numeroLegal;
      try {
        const { correlativoTexto } = lote.obtenerSiguienteNumero();
        numeroLegal = correlativoTexto;
        await lote.save({ session });
      } catch (err) {
        throw new Error(err.message || "No fue posible asignar el número legal (CAI).");
      }
    // ==================================================
    // 3️ Validar stock de productos antes de crear
    // ==================================================
    for (const item of productos) {
      const prodId = item.productId || item._id;
      const prod = await Product.findById(prodId).session(session);

      if (!prod) throw new Error(`Producto no encontrado: ${item.nombre || prodId}`);
      if (prod.quantity < item.cantidad) {
        throw new Error(
          `Stock insuficiente para "${prod.name || prod.nombre}". Disponible: ${prod.quantity}`
        );
      }
    }

    // ==================================================
    // 4️ Descontar stock real (solo al crear)
    // ==================================================
    for (const item of productos) {
      const prodId = item.productId || item._id;
      const prod = await Product.findById(prodId).session(session);
      if (prod) {
        prod.quantity -= item.cantidad;
        await prod.save({ session });
      }
    }


      // 5️ Calcular totales
      const sumServicios = servicios.reduce(
        (s, x) => s + Number(x.precio) * Number(x.cantidad || 1),
        0
      );
      const sumProductos = productos.reduce(
        (s, x) => s + Number(x.precio) * Number(x.cantidad || 1),
        0
      );
      const subtotal = sumServicios + sumProductos;

      let descuentoTotal = 0;
      if (Number(descuentoValor) > 0) {
        descuentoTotal =
          descuentoTipo === "porcentaje"
            ? (subtotal * Number(descuentoValor)) / 100
            : Number(descuentoValor);
      }

      const baseImponible = Math.max(subtotal - descuentoTotal, 0);
      const impuesto = +(baseImponible * 0.15).toFixed(2);
      const total = +(baseImponible + impuesto).toFixed(2);

      // 6️  Crear factura
      const factura = new Factura({
        numero: numeroLegal,
        cai: lote.cai,
        caiRangoDesde: lote.rangoDesde,
        caiRangoHasta: lote.rangoHasta,
        caiFechaLimite: lote.fechaLimite,

        cliente,
        mascota,
        metodoPago,
        estado: estado || "Pagado",
        servicios,
        productos,
        descuentoTipo,
        descuentoValor,
        descuentoTotal,
        baseImponible,
        subtotal,
        impuesto,
        total,
        notas,
      });

      await factura.save({ session });

      res.status(201).json(factura);
    });
  } catch (err) {
    await session.abortTransaction();
    console.error("❌ Error creando factura:", err);
    res.status(400).json({ mensaje: err.message || "Error creando factura" });
  } finally {
    session.endSession();
  }
};

// ======================================================
// ACTUALIZAR FACTURA (solo si no está cancelada)
// ======================================================
exports.actualizarFactura = async (req, res) => {
  try {
    const { id } = req.params;
    const datos = req.body;

    const factura = await Factura.findById(id);
    if (!factura)
      return res.status(404).json({ mensaje: "Factura no encontrada" });

    if (factura.estado === "Cancelado")
      return res
        .status(400)
        .json({ mensaje: "No se puede modificar una factura cancelada" });

    //  ACTUALIZAR CLIENTE Y MASCOTA
    if (datos.cliente) {
      factura.cliente.ownerId = datos.cliente.ownerId || factura.cliente.ownerId;
      factura.cliente.nombre = datos.cliente.nombre || factura.cliente.nombre;
      factura.cliente.rtn = datos.cliente.rtn || factura.cliente.rtn;
      factura.cliente.email = datos.cliente.email || factura.cliente.email;
      factura.cliente.telefono = datos.cliente.telefono || factura.cliente.telefono;
    }

    if (datos.mascota) {
      factura.mascota.petId = datos.mascota.petId || factura.mascota.petId;
      factura.mascota.nombre = datos.mascota.nombre || factura.mascota.nombre;
      factura.mascota.especie = datos.mascota.especie || factura.mascota.especie;
      factura.mascota.raza = datos.mascota.raza || factura.mascota.raza;
    }

    //  Recalcular stock si cambian productos
    if (datos.productos && datos.productos.length > 0) {
      for (const nuevo of datos.productos) {
        const prodId = nuevo.productId || nuevo._id;
        const anterior = factura.productos.find(
          (p) => String(p.productId) === String(prodId)
        );
        const prod = await Product.findById(prodId);
        if (prod) {
          const diferencia = anterior
            ? nuevo.cantidad - anterior.cantidad
            : nuevo.cantidad;
          prod.quantity -= diferencia;
          await prod.save();
        }
      }
    }

    // Actualizar datos principales
    factura.servicios = datos.servicios || factura.servicios;
    factura.productos = datos.productos || factura.productos;
    factura.descuentoTipo = datos.descuentoTipo || factura.descuentoTipo;
    factura.descuentoValor =
      datos.descuentoValor !== undefined
        ? datos.descuentoValor
        : factura.descuentoValor;
    factura.metodoPago = datos.metodoPago || factura.metodoPago;
    factura.notas = datos.notas || factura.notas;

    // Recalcular totales
    const subtotalServicios = factura.servicios.reduce(
      (s, x) => s + Number(x.precio) * Number(x.cantidad || 1),
      0
    );
    const subtotalProductos = factura.productos.reduce(
      (s, x) => s + Number(x.precio) * Number(x.cantidad || 1),
      0
    );
    const subtotal = subtotalServicios + subtotalProductos;

    let descuentoTotal = 0;
    if (factura.descuentoValor > 0) {
      if (factura.descuentoTipo === "porcentaje")
        descuentoTotal = (subtotal * factura.descuentoValor) / 100;
      else descuentoTotal = factura.descuentoValor;
    }

    const baseImponible = Math.max(subtotal - descuentoTotal, 0);
    const impuesto = +(baseImponible * 0.15).toFixed(2);
    const total = +(baseImponible + impuesto).toFixed(2);

    factura.subtotal = subtotal;
    factura.descuentoTotal = descuentoTotal;
    factura.baseImponible = baseImponible;
    factura.impuesto = impuesto;
    factura.total = total;

    await factura.save();

    res.status(200).json(factura);
  } catch (error) {
    console.error("❌ Error actualizando factura:", error);
    res.status(500).json({ mensaje: "Error actualizando factura" });
  }
};
// ======================================================
// ACTUALIZAR ESTADO (Pagado / Pendiente / Cancelado)
// ======================================================
exports.actualizarEstadoFactura = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;

    const factura = await Factura.findById(id);
    if (!factura)
      return res.status(404).json({ mensaje: "Factura no encontrada" });

    if (factura.estado === "Cancelado")
      return res
        .status(400)
        .json({ mensaje: "No se puede modificar una factura cancelada" });

    factura.estado = estado;
    await factura.save();

    // Revertir stock si se cancela
    if (estado === "Cancelado" && factura.productos?.length) {
      for (const item of factura.productos) {
        const prodId = item.productId || item._id;
        const producto = await Product.findById(prodId);
        if (producto) {
          producto.quantity += item.cantidad;
          await producto.save();
        }
      }
    }

    res.status(200).json(factura);
  } catch (error) {
    console.error("❌ Error actualizando estado de factura:", error);
    res.status(500).json({ mensaje: "Error actualizando estado de factura" });
  }
};

// ======================================================
// OBTENER LOTE CAI ACTIVO (con alerta y métricas)
// ======================================================
exports.obtenerLoteActivo = async (req, res) => {
  try {
    const lote = await LoteFactura.findOne({
      activo: true,
      fechaLimite: { $gte: new Date() },
    });

    if (!lote) {
      // Devuelve formato compatible con Navbar, pero sin crashear
      return res.status(200).json({
        alerta: "expired",
        mensaje: "No existe lote CAI activo o el actual está vencido.",
        cai: null,
        rangoDesde: null,
        rangoHasta: null,
        diasRestantes: 0,
        restantes: 0,
        activo: false,
      });
    }

    // Calcular métricas
    const hoy = new Date();
    const diasRestantes = Math.ceil(
      (new Date(lote.fechaLimite) - hoy) / (1000 * 60 * 60 * 24)
    );

    const inicio = parseInt(lote.rangoDesde.split("-").pop());
    const fin = parseInt(lote.rangoHasta.split("-").pop());
    const restantes = fin - (inicio + lote.correlativoActual);

    let alerta = "ok";
    if (diasRestantes <= 0 || restantes <= 0) alerta = "expired";
    else if (diasRestantes <= 10 || restantes <= 10) alerta = "warning";

    res.status(200).json({
      alerta,
      diasRestantes,
      restantes,
      cai: lote.cai,
      rangoDesde: lote.rangoDesde,
      rangoHasta: lote.rangoHasta,
      correlativoActual: lote.correlativoActual,
      fechaLimite: lote.fechaLimite,
      activo: lote.activo,
    });
  } catch (error) {
    console.error("❌ Error obteniendo lote CAI activo:", error);
    res.status(500).json({
      alerta: "error",
      mensaje: "Error interno al obtener el lote CAI activo.",
    });
  }
};