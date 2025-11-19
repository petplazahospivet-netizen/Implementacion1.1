// backend/models/Expediente.js
const mongoose = require("mongoose");

const ImgSchema = new mongoose.Schema(
  {
    id: { type: String },
    url: { type: String, trim: true },
  },
  { _id: false }
);

const VaccineSchema = new mongoose.Schema(
  {
    label: { type: String, trim: true },
    when: { type: String, trim: true },
  },
  { _id: false }
);

const MedicationSchema = new mongoose.Schema(
  {
    label: { type: String, trim: true },
    dosage: { type: String, trim: true },
    when: { type: String, trim: true },
  },
  { _id: false }
);

const ExpedienteSchema = new mongoose.Schema(
  {
    tipo: {
      type: String,
      enum: ["general", "cirugia", "cuidados"],
      required: true,
    },
    typeLabel: {
      type: String,
      enum: ["Expediente General", "Expediente Cirugía", "Cuidados en Casa"],
      required: true,
    },
    color: { type: String, default: "#00a884" },

    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "Owner" },
    petId: { type: mongoose.Schema.Types.ObjectId, ref: "Pet" },
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: "Usuario" },
    productosUsados: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],

    owner: { type: String, trim: true },
    ownerPhone: { type: String, trim: true },
    pet: { type: String, trim: true },
    species: { type: String, trim: true },
    breed: { type: String, trim: true },
    gender: { type: String, trim: true },
    weight: { type: String, trim: true },
    colorName: { type: String, trim: true },
    doctor: { type: String, trim: true },
    branch: { type: String, trim: true },
    date: { type: String, trim: true },
    images: [ImgSchema],
    birthDate: { type: String, trim: true },
    rawBirthDate: { type: String, trim: true },


    // General
    tests: { type: String, trim: true },
    surgeryPlanned: { type: String, trim: true },
    diagnosis: { type: String, trim: true },
    treatment: { type: String, trim: true },
    notes: { type: String, trim: true },
    // Donante de Sangre
bloodDonor: {
  type: String,
  enum: ["Sí", "No"],
  default: "No",
  trim: true,
},


// Tratamientos (Vacunas / Medicamentos seleccionados)
selectedTreatments: [
  {
    _id: { type: String, required: false },
    name: { type: String, trim: true },
    type: { type: String, trim: true }, 
  },
],
    vaccines: [VaccineSchema],
    medications: [MedicationSchema],
    cc: { type: String, trim: true },

    // Cirugía
    identityNumber: { type: String, trim: true },
    dateTime: { type: String, trim: true },
    caseDescription: { type: String, trim: true },
    risk1: { type: String, trim: true },
    risk2: { type: String, trim: true },
    risk3: { type: String, trim: true },
    risk4: { type: String, trim: true },
    risk5: { type: String, trim: true },
    risk6: { type: String, trim: true },
    surgeryType: { type: String, trim: true },
    anesthetic: { type: String, trim: true },

    // Cuidados
    instructions: { type: String, trim: true },
    medication: { type: String, trim: true },
    medicationDate: { type: String, trim: true },
    foodWater: { type: String, trim: true },
    foodWaterDate: { type: String, trim: true },
    exercise: { type: String, trim: true },
    sutures: { type: String, trim: true },
    followupInstructions: { type: String, trim: true },
    monitoredAtHome: { type: String, trim: true },
    emergencyContact: { type: String, trim: true },

    creadoPor: { type: mongoose.Schema.Types.ObjectId, ref: "Usuario" },
    actualizadoPor: { type: mongoose.Schema.Types.ObjectId, ref: "Usuario" },
  },
  { timestamps: true }
);

ExpedienteSchema.index({ tipo: 1, date: 1, pet: 1 });
ExpedienteSchema.index({
  owner: "text",
  pet: "text",
  doctor: "text",
  diagnosis: "text",
  treatment: "text",
  notes: "text",
  caseDescription: "text",
  instructions: "text",
});

module.exports = mongoose.model("Expediente", ExpedienteSchema);