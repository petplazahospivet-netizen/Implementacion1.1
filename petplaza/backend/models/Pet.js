// backend/models/Pet.js
const mongoose = require("mongoose");

const petSchema = new mongoose.Schema(
  {
    nombre: {
      type: String,
      required: [true, "El nombre de la mascota es obligatorio"],
      trim: true,
    },
    especie: {
      type: String,
      required: [true, "La especie es obligatoria"],
      enum: [
        "Perro",
        "Gato",
        "Conejo",
        "Hamster",
        "Ave",
        "Tortuga",
        "Pez",
        "Exotico",
        "Otros",
      ],
    },
    raza: {
      type: String,
      trim: true,
      default: "",
    },
    nacimiento: {
      type: Date,
      default: null,
    },
    sexo: {
      type: String,
      enum: ["Macho", "Hembra"],
      required: [true, "El sexo es obligatorio"],
    },
    peso: {
      type: Number,
      min: [0, "El peso no puede ser negativo"],
      default: 0,
    },
    color: {
      type: String,
      trim: true,
      default: "",
    },
    // 🔹 Relación con Dueño
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Owner",
      required: [true, "La mascota debe estar asociada a un dueño"],
    },
  },
  { timestamps: true }
);

// ======================================================
// 🔹 Índices de búsqueda optimizados
// ======================================================
petSchema.index({
  nombre: "text",
  especie: "text",
  raza: "text",
  color: "text",
});

// ======================================================
// 🧩 Eliminación en cascada hacia Citas
// ======================================================
petSchema.post("findOneAndDelete", async function (doc) {
  try {
    if (doc?._id) {
      const Appointment = require("./Appointment");
      await Appointment.deleteMany({ petId: doc._id });
      console.log(`🧹 Citas asociadas a la mascota "${doc.nombre}" eliminadas.`);
    }
  } catch (err) {
    console.error("❌ Error eliminando citas de la mascota:", err.message);
  }
});

module.exports = mongoose.model("Pet", petSchema);