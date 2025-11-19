// backend/controllers/reportController.js
const Report = require("../models/Report");
const Factura = require("../models/Factura");
const Product = require("../models/Product");
const Appointment = require("../models/Appointment");

/* ==========================================================
   📊 GENERAR REPORTE GENERAL (ventas, inventario, citas)
========================================================== */
const generarReporteGeneral = async (req, res) => {
  try {
    const { start, end } = req.query;

    if (!start || !end) {
      return res.status(400).json({
        ok: false,
        message: "Debe especificar las fechas de inicio y fin",
      });
    }

    const startDate = new Date(start);
    const endDate = new Date(end);

    // === 🧾 1. Ventas ===
    const facturas = await Factura.find({
      fecha: { $gte: startDate, $lte: endDate },
    });

    // Total general y promedio
    const totalVentas = facturas.reduce((acc, f) => acc + (f.total || 0), 0);
    const promedioVenta =
      facturas.length > 0 ? totalVentas / facturas.length : 0;

    // 📊 Agrupar facturas por método de pago
    const metodosPago = {
      efectivo: 0,
      tarjeta: 0,
      transferencia: 0,
    };

    facturas.forEach((f) => {
      const metodo = f.metodoPago?.toLowerCase() || "efectivo";
      if (metodo.includes("tarjeta")) metodosPago.tarjeta++;
      else if (metodo.includes("transferencia")) metodosPago.transferencia++;
      else metodosPago.efectivo++;
    });

    // === 💊 2. Inventario ===
    const productos = await Product.find();
    const totalProductos = productos.length;

    const totalInventario = productos.reduce(
      (sum, p) => sum + (Number(p.price) || 0) * (Number(p.quantity) || 0),
      0
    );

    const stockBajo = productos.filter(
      (p) => Number(p.quantity) <= Number(p.minStock)
    );

    const expirados = productos.filter(
      (p) => p.expiryDate && new Date(p.expiryDate) < new Date()
    );

    // Agrupar inventario por categoría
    const inventarioPorCategoria = productos.reduce((acc, p) => {
      const categoria = p.category || "Sin categoría";
      if (!acc[categoria]) acc[categoria] = { total: 0, products: 0 };
      acc[categoria].total +=
        (Number(p.price) || 0) * (Number(p.quantity) || 0);
      acc[categoria].products += 1;
      return acc;
    }, {});

    const inventarioArray = Object.entries(inventarioPorCategoria).map(
      ([category, data]) => ({
        category,
        total: data.total,
        products: data.products,
      })
    );

    // === 🩺 3. Citas ===
    const todasLasCitas = await Appointment.find();

    // 🔄 Convertir string a Date y filtrar manualmente
    const citas = todasLasCitas.filter((cita) => {
      if (!cita.fecha) return false;
      const fechaCita = new Date(cita.fecha); // formato YYYY-MM-DD
      return fechaCita >= startDate && fechaCita <= endDate;
    });

    const citasProgramadas = citas.filter(
      (c) => c.estado === "programada"
    ).length;
    const citasCompletadas = citas.filter(
      (c) => c.estado === "completada"
    ).length;
    const citasCanceladas = citas.filter(
      (c) => c.estado === "cancelada"
    ).length;

    console.log("📅 Citas encontradas en el rango:", citas.length);

    // === 📈 4. Ventas diarias (sin agrupar: 1 entrada por factura) ===
    const formatYMDLocal = (d) => {
      const dt = new Date(d);
      const y = dt.getFullYear();
      const m = String(dt.getMonth() + 1).padStart(2, "0");
      const day = String(dt.getDate()).padStart(2, "0");
      return `${y}-${m}-${day}`; // evita desfases por toISOString() y TZ
    };

    // Si deseas ORDENAR por fecha ascendente, mantenlo; si no, quítalo.
    const facturasOrdenadas = [...facturas]
      .filter(f => f.estado === "Pagado") // ← opcional
      .sort((a, b) => new Date(a.fecha) - new Date(b.fecha)
    );

    // IMPORTANTE: una entrada por factura (mismo día = varias filas)
    const ventasDiarias = facturasOrdenadas.map((f) => ({
      date: f.fecha ? formatYMDLocal(f.fecha) : "",
      total: Number(f.total) || 0,
      // Estos campos extra NO rompen tu frontend; úsalos si luego quieres detalle
      invoiceId: f._id?.toString?.() || null,
      numero: f.numero || null,
      estado: f.estado || null,
    }));

    // === 🗃️ 5. Objeto completo ===
    const reporteData = {
      type: "general",
      dateRange: { start: startDate, end: endDate },
      metrics: {
        totalSales: totalVentas,
        totalInvoices: facturas.length,
        averageSale: promedioVenta,
        totalInventoryValue: totalInventario,
        totalProducts: totalProductos,
        lowStockCount: stockBajo.length,
        expiredCount: expirados.length,
        appointmentsProgramadas: citasProgramadas,
        appointmentsCompletadas: citasCompletadas,
        appointmentsCanceladas: citasCanceladas,
      },
      details: {
        salesByDay: ventasDiarias,
        inventoryByCategory: inventarioArray,
        lowStockProducts: stockBajo.map((p) => ({
          name: p.name,
          quantity: p.quantity,
        })),

        paymentSummary: [
          { metodo: "Efectivo", cantidad: metodosPago.efectivo },
          { metodo: "Tarjeta", cantidad: metodosPago.tarjeta },
          { metodo: "Transferencia", cantidad: metodosPago.transferencia },
        ],
      },
      generatedBy: req.user?._id || null,
    };

    // === 💾 Guardar histórico ===
    const nuevoReporte = await Report.create(reporteData);

    res.status(201).json({
      ok: true,
      message: "Reporte generado correctamente",
      reporte: nuevoReporte,
    });
  } catch (error) {
    console.error("❌ Error al generar reporte:", error);
    res
      .status(500)
      .json({ ok: false, message: "Error generando reporte", error });
  }
};

/* ==========================================================
   📂 OBTENER REPORTES GUARDADOS (historial)
========================================================== */
const obtenerReportes = async (req, res) => {
  try {
    const reportes = await Report.find().sort({ createdAt: -1 });
    res.status(200).json(reportes);
  } catch (error) {
    console.error("❌ Error obteniendo reportes:", error);
    res.status(500).json({ message: "Error al obtener reportes" });
  }
};

/* ==========================================================
   📋 OBTENER UN REPORTE POR ID
========================================================== */
const obtenerReportePorId = async (req, res) => {
  try {
    const reporte = await Report.findById(req.params.id);
    if (!reporte) {
      return res.status(404).json({ message: "Reporte no encontrado" });
    }
    res.json(reporte);
  } catch (error) {
    console.error("❌ Error al obtener reporte:", error);
    res.status(500).json({ message: "Error al obtener reporte" });
  }
};

module.exports = {
  generarReporteGeneral,
  obtenerReportes,
  obtenerReportePorId,
};