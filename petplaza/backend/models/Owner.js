// backend/models/Owner.js
const mongoose = require("mongoose");
const Pet = require("./Pet");

const ownerSchema = new mongoose.Schema(
  {
    full_name: {
      type: String,
      required: [true, "El nombre completo es obligatorio"],
      trim: true,
    },
    phone: {
      type: String,
      required: [true, "El teléfono es obligatorio"],
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Correo inválido"],
      unique: true,
      sparse: true,
    },
    dni: {
      type: String,
      required: [true, "El DNI es obligatorio"],
      unique: true,
      trim: true,
    },
    address: {
      type: String,
      required: [true, "La dirección es obligatoria"],
      trim: true,
    },
  },
  { timestamps: true }
);

// ======================================================
// 📚 Índices optimizados para búsqueda
// ======================================================
ownerSchema.index({
  full_name: "text",
  email: "text",
  phone: "text",
  dni: "text",
});

// ======================================================
// 🐾 Middleware: eliminar mascotas asociadas al dueño
// ======================================================
ownerSchema.pre("findOneAndDelete", async function (next) {
  try {
    const owner = await this.model.findOne(this.getFilter());
    if (owner) {
      await Pet.deleteMany({ ownerId: owner._id });
      console.log(`🐾 Mascotas de ${owner.full_name} eliminadas.`);
    }
    next();
  } catch (err) {
    console.error("❌ Error eliminando mascotas asociadas:", err);
    next(err);
  }
});

// ======================================================
// 🧩 Eliminación en cascada hacia Citas
// ======================================================
ownerSchema.post("findOneAndDelete", async function (doc) {
  try {
    if (doc?._id) {
      const Appointment = require("./Appointment");
      await Appointment.deleteMany({ ownerId: doc._id });
      console.log(`🧹 Citas asociadas al dueño "${doc.full_name}" eliminadas.`);
    }
  } catch (err) {
    console.error("❌ Error eliminando citas del dueño:", err.message);
  }
});

module.exports = mongoose.model("Owner", ownerSchema);