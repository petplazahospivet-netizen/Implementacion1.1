const mongoose = require("mongoose");

const reportSchema = new mongoose.Schema(
  {
    // Tipo de reporte: "ventas", "inventario", "citas", "stock", etc.
    type: {
      type: String,
      required: true,
      enum: ["ventas", "inventario", "citas", "stock", "general"],
    },

    // Fecha de inicio y fin del rango analizado
    dateRange: {
      start: { type: Date, required: true },
      end: { type: Date, required: true },
    },

    // Resumen de métricas principales (ventas totales, promedio, facturas, etc.)
    metrics: {
      totalSales: { type: Number, default: 0 },
      totalInvoices: { type: Number, default: 0 },
      averageSale: { type: Number, default: 0 },
      totalInventoryValue: { type: Number, default: 0 },
      totalProducts: { type: Number, default: 0 },
      lowStockCount: { type: Number, default: 0 },
      expiredCount: { type: Number, default: 0 },
      appointmentsProgramadas: { type: Number, default: 0 },
      appointmentsCompletadas: { type: Number, default: 0 },
      appointmentsCanceladas: { type: Number, default: 0 },
    },

    // Detalles específicos según el tipo de reporte
    details: {
      salesByDay: [
        {
          date: { type: String },
          total: { type: Number },
        },
      ],
      inventoryByCategory: [
        {
          category: { type: String },
          total: { type: Number },
          products: { type: Number },
        },
      ],
      lowStockProducts: [
        {
          name: { type: String },
          quantity: { type: Number },
        },
      ],
    },

    // Usuario que generó el reporte (opcional)
    generatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true, // crea createdAt y updatedAt
  }
);

module.exports = mongoose.model("Report", reportSchema);