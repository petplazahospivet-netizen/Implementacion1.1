// backend/server.js
require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 5000;

/* =====================================================
   🌐 MIDDLEWARE GLOBAL
===================================================== */
app.use(cors());
app.use(express.json());

/* =====================================================
   💾 CONEXIÓN A MONGODB (con reintento automático)
===================================================== */
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("✅ MongoDB conectado correctamente");
  } catch (err) {
    console.error("❌ Error conectando a MongoDB:", err.message);
    // Render puede tardar en conectar, reintentamos cada 5s
    setTimeout(connectDB, 5000);
  }
};
connectDB();

/* =====================================================
   📦 RUTAS API
===================================================== */
const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/users");
const ownerRoutes = require("./routes/owners");
const petRoutes = require("./routes/pets");
const appointmentRoutes = require("./routes/appointments");
const dashboardRoutes = require("./routes/dashboard");
const servicioRoutes = require("./routes/servicioRoutes");
const facturaRoutes = require("./routes/facturaRoutes");
const productRoutes = require("./routes/productRoutes");
const loteFacturaRoutes = require("./routes/loteFacturaRoutes");
const expedienteRoutes = require("./routes/expedientes");
const reportRoutes = require("./routes/reportRoutes");

/* =====================================================
   🚦 RUTAS PRINCIPALES (deben ir antes del frontend)
===================================================== */
app.get("/api", (req, res) => {
  res.json({ ok: true, msg: "Backend funcionando correctamente" });
});

// 🔹 Rutas API
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/owners", ownerRoutes);
app.use("/api/pets", petRoutes);
app.use("/api/appointments", appointmentRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/servicios", servicioRoutes);
app.use("/api/facturas", facturaRoutes);
app.use("/api/products", productRoutes);
app.use("/api/lotes", loteFacturaRoutes);
app.use("/api/expedientes", expedienteRoutes);
app.use("/api/reports", reportRoutes);


/* =====================================================
   🧱 SERVIR FRONTEND (para Render o Producción)
===================================================== */
if (process.env.NODE_ENV === "production") {
  const FE_DIR = path.join(__dirname, "../frontend/build");
  app.use(express.static(FE_DIR));

  // Fallback SPA (solo si no es una ruta API)
  app.get("*", (req, res) => {
    if (req.path.startsWith("/api")) {
      return res.status(404).json({ mensaje: "Ruta API no encontrada" });
    }
    res.sendFile(path.join(FE_DIR, "index.html"));
  });
}

/* =====================================================
   🚀 INICIAR SERVIDOR
===================================================== */
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
  console.log("🌍 FRONTEND_URL:", process.env.FRONTEND_URL || "no definido");
});