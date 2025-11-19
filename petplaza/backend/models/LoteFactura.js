// backend/models/LoteFactura.js
const mongoose = require("mongoose");

/**
 * 📦 Modelo: LoteFactura
 * Representa un rango autorizado de facturas (CAI) del SAR Honduras.
 * Cada factura emitida dentro de este rango incrementa el correlativoActual.
 */
const loteFacturaSchema = new mongoose.Schema(
  {
    cai: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 20,
      maxlength: 40, // formato alfanumérico largo (ejemplo: 36 caracteres SAR)
    },

    rangoDesde: {
      type: String,
      required: true,
      match: /^\d{3}-\d{3}-\d{2}-\d{8}$/, // formato 000-001-01-00000001
    },
    rangoHasta: {
      type: String,
      required: true,
      match: /^\d{3}-\d{3}-\d{2}-\d{8}$/,
    },

    correlativoActual: {
      type: Number,
      default: 0,
      min: 0,
    },

    fechaAutorizacion: {
      type: Date,
      default: Date.now,
    },

    fechaLimite: {
      type: Date,
      required: true,
      /**
       * Por norma, el SAR otorga una vigencia aproximada de 10 meses al lote.
       * Este valor se calcula automáticamente en el controlador.
       */
    },

    activo: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

/**
 * 🔢 Método para obtener el siguiente número correlativo de factura.
 * Lanza error si se supera el rango autorizado.
 */
loteFacturaSchema.methods.obtenerSiguienteNumero = function () {
  const inicio = parseInt(this.rangoDesde.split("-")[3]);
  const fin = parseInt(this.rangoHasta.split("-")[3]);
  const actual = inicio + this.correlativoActual;

  if (actual > fin) {
    throw new Error("❌ Se alcanzó el límite del rango autorizado del CAI activo.");
  }

  this.correlativoActual += 1;
  return {
    numero: this.correlativoActual,
    correlativoTexto: `000-001-01-${String(actual).padStart(8, "0")}`,
  };
};

module.exports = mongoose.model("LoteFactura", loteFacturaSchema);