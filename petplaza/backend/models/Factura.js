// backend/models/Factura.js
const mongoose = require("mongoose");

const facturaSchema = new mongoose.Schema(
  {

    //  CLIENTE
    cliente: {
      ownerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Owner",
        required: true,
      },
      nombre: { type: String, required: true, trim: true },
      rtn: { type: String, default: "" },
      email: { type: String, default: "" },
      telefono: { type: String, default: "" },
    },

  
    //  MASCOTA
    mascota: {
      petId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Pet",
        required: true,
      },
      nombre: { type: String, required: true, trim: true },
      especie: { type: String, default: "" },
      raza: { type: String, default: "" },
    },


    //  SERVICIOS
    servicios: [
      {
        servicioId: { type: mongoose.Schema.Types.ObjectId, ref: "Servicio" },
        nombre: { type: String, required: true },
        precio: { type: Number, required: true },
        cantidad: { type: Number, default: 1 },
        subtotal: { type: Number, default: 0 },
      },
    ],

    // PRODUCTOS
    productos: [
      {
        productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
        nombre: { type: String, required: true },
        precio: { type: Number, required: true },
        cantidad: { type: Number, required: true },
        subtotal: { type: Number, default: 0 },
      },
    ],

    //  DESCUENTOS Y BASE IMPONIBLE
    descuentoTipo: {
      type: String,
      enum: ["monto", "porcentaje"],
      default: "monto",
    },
    descuentoValor: { type: Number, default: 0 }, // valor ingresado
    descuentoTotal: { type: Number, default: 0 }, // monto calculado
    baseImponible: { type: Number, default: 0 }, // subtotal - descuentoTotal

    //  TOTALES
    subtotal: { type: Number, required: true },
    impuesto: { type: Number, required: true },
    total: { type: Number, required: true },

    //  INFORMACIÓN GENERAL
    metodoPago: { type: String, default: "Efectivo" },
    estado: {
      type: String,
      enum: ["Pagado", "Pendiente", "Cancelado"],
      default: "Pendiente",
    },
    notas: { type: String, default: "" },

    //  DATOS FISCALES (CAI)

    numero: {
      type: String, // "000-001-01-00000031"
      required: true,
      unique: true,
    },
    cai: { type: String, required: true },
    caiRangoDesde: { type: String, required: true },
    caiRangoHasta: { type: String, required: true },
    caiFechaLimite: { type: Date, required: true },

    // FECHAS Y CONTROL
    fecha: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

//  CÁLCULO AUTOMÁTICO DE DESCUENTOS Y TOTALES
facturaSchema.pre("save", function (next) {
  const subtotal = this.subtotal || 0;
  const valor = this.descuentoValor || 0;
  let descuentoTotal = 0;

  if (this.descuentoTipo === "porcentaje") {
    descuentoTotal = Math.min(subtotal * (valor / 100), subtotal);
  } else {
    descuentoTotal = Math.min(valor, subtotal);
  }

  this.descuentoTotal = +descuentoTotal.toFixed(2);
  this.baseImponible = +(subtotal - descuentoTotal).toFixed(2);
  this.impuesto = +(this.baseImponible * 0.15).toFixed(2);
  this.total = +(this.baseImponible + this.impuesto).toFixed(2);

  next();
});

module.exports = mongoose.model("Factura", facturaSchema);