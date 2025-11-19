// backend/controllers/expedienteController.js
const Expediente = require("../models/Expediente");
const Product = require("../models/Product");

/* =========================================================
   📄 CREAR UN NUEVO EXPEDIENTE
========================================================= */
exports.createExpediente = async (req, res) => {
  try {
    const data = req.body;

    // 🧩 Guardar IDs de productos seleccionados (vacunas y medicamentos)
    let productosUsados = [];
    if (Array.isArray(data.selectedTreatments)) {
      productosUsados = data.selectedTreatments
        .filter((t) => t._id)
        .map((t) => t._id);
    }

    // 💉 Vacunas
    const vaccines =
      (data.selectedTreatments || [])
        .filter((t) => t.type?.toLowerCase() === "vacuna")
        .map((t) => ({
          label: t.name || "Vacuna sin nombre",
          when: new Date().toISOString(),
        })) || [];

    // 💊 Medicamentos
    let medications = [];
    let medicationText = "";

    if (data.tipo === "cuidados") {
      medicationText =
        typeof data.medication === "string"
          ? data.medication
          : data.medication?.label || "No especificado";
    } else {
      medications =
        (data.selectedTreatments || [])
          .filter((t) => t.type?.toLowerCase() === "medicamento")
          .map((t) => ({
            label: t.name || "Medicamento sin nombre",
            dosage: t.dosage || data.cc || "No especificado",
            when: new Date().toISOString(),
          })) || [];
    }

    // 🧠 Map de tipo/color
    const tipoMap = {
      general: { label: "Expediente General", color: "#00a884" },
      cirugia: { label: "Expediente Cirugía", color: "#ef4444" },
      cuidados: { label: "Cuidados en Casa", color: "#007bff" },
    };
    const tipo = data.tipo || "general";
    const { label, color } = tipoMap[tipo] || tipoMap.general;

    // 🧱 Crear expediente
    const expediente = new Expediente({
      tipo,
      typeLabel: data.typeLabel || label,
      color: data.color || color,
      ownerId: data.ownerId || null,
      petId: data.petId || null,
      doctorId: data.doctorId || null,
      productosUsados,
      owner: data.owner,
      ownerPhone: data.ownerPhone,
      pet: data.pet,
      species: data.species,
      breed: data.breed,
      gender: data.gender,
      weight: data.weight,
      birthDate: data.birthDate || null,
      colorName: data.colorName,
      bloodDonor: data.bloodDonor,
      doctor: data.doctor,
      branch: data.branch,
      date: data.date || new Date().toISOString().split("T")[0],

      // General
      tests: data.tests,
      surgeryPlanned: data.surgeryPlanned,
      diagnosis: data.diagnosis,
      treatment: data.treatment,
      notes: data.notes,
      cc: data.cc,
      vaccines,
      medications,

      // Cirugía
      identityNumber: data.identityNumber,
      dateTime: data.dateTime,
      caseDescription: data.caseDescription,
      surgeryType: data.surgeryType,
      anesthetic: data.anesthetic,
      risk1: data.risk1,
      risk2: data.risk2,
      risk3: data.risk3,
      risk4: data.risk4,
      risk5: data.risk5,
      risk6: data.risk6,

      // Cuidados
      instructions: data.instructions,
      medication: medicationText,
      medicationDate: data.medicationDate,
      foodWater: data.foodWater,
      foodWaterDate: data.foodWaterDate,
      exercise: data.exercise,
      sutures: data.sutures,
      followupInstructions: data.followupInstructions,
      monitoredAtHome: data.monitoredAtHome,
      emergencyContact: String(data.emergencyContact || "").trim(),

      // Imágenes
      images: Array.isArray(data.images)
        ? data.images.map((img) => ({ id: img.id, url: img.url }))
        : [],
    });

    const saved = await expediente.save();
    res.status(201).json({ mensaje: "Expediente creado correctamente", expediente: saved });
  } catch (error) {
    console.error("❌ Error al crear expediente:", error);
    res.status(500).json({
      mensaje: "Error al crear expediente",
      error: error.message,
    });
  }
};

/* =========================================================
   📄 OBTENER TODOS LOS EXPEDIENTES
========================================================= */
exports.getExpedientes = async (req, res) => {
  try {
    const expedientes = await Expediente.find().sort({ createdAt: -1 });
    res.json(expedientes);
  } catch (error) {
    console.error("Error obteniendo expedientes:", error);
    res.status(500).json({ mensaje: "Error al obtener expedientes" });
  }
};

// 📄 Controlador definitivo de actualización de expediente
exports.updateExpediente = async (req, res) => {
  try {
    const mongoose = require("mongoose");
    const { id } = req.params;

    // 1️⃣ Validar ID principal
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ mensaje: "ID de expediente inválido" });
    }

    // 2️⃣ Clonar y limpiar body
    const data = JSON.parse(JSON.stringify(req.body || {})); // 🔒 fuerza a objeto limpio
    delete data._id;
    delete data.__v;
    delete data.createdAt;
    delete data.updatedAt;

    // 3️⃣ Normalizar campos de texto
    const normalize = (v) =>
      typeof v === "string" ? v.trim() : v ?? "";

    if (data.emergencyContact) data.emergencyContact = normalize(data.emergencyContact);
    if (data.ownerPhone) data.ownerPhone = normalize(data.ownerPhone);
    if (data.instructions) data.instructions = normalize(data.instructions);
    if (data.medication) data.medication = normalize(data.medication);

    // 4️⃣ Limpiar posibles IDs inválidos
    const idFields = ["ownerId", "petId", "doctorId"];
    for (const f of idFields) {
      if (data[f] && !mongoose.isValidObjectId(data[f])) {
        delete data[f];
      }
    }

    // 5️⃣ Blindar productos usados
    if (Array.isArray(data.productosUsados)) {
      data.productosUsados = data.productosUsados.filter((x) =>
        mongoose.isValidObjectId(x)
      );
    }

    // 6️⃣ ⚠️ PREVENIR ERRORES en medications (clave)
    if (!data.medications) {
      // si no existe, dejamos array vacío
      data.medications = [];
    } else if (typeof data.medications === "string") {
      // si llega texto plano
      data.medications = [
        {
          label: data.medications,
          dosage: "No especificado",
          when: new Date().toISOString(),
        },
      ];
    } else if (Array.isArray(data.medications)) {
      // si llega array, aseguramos que todos sean objetos válidos
      data.medications = data.medications.map((m) => {
        if (typeof m === "string") {
          return {
            label: m,
            dosage: "No especificado",
            when: new Date().toISOString(),
          };
        }
        return {
          label: normalize(m.label),
          dosage: normalize(m.dosage),
          when: m.when || new Date().toISOString(),
        };
      });
    } else if (typeof data.medications === "object") {
      // si llega como objeto suelto
      data.medications = [
        {
          label: normalize(data.medications.label || "No especificado"),
          dosage: normalize(data.medications.dosage || "No especificado"),
          when: data.medications.when || new Date().toISOString(),
        },
      ];
    } else {
      // en cualquier otro caso, limpiar
      data.medications = [];
    }

    // 7️⃣ Limpieza de selectedTreatments si llega corrupto
    if (typeof data.selectedTreatments === "string") {
      data.selectedTreatments = [];
    }

    // 8️⃣ Limpieza general
    for (const [k, v] of Object.entries(data)) {
      if (
        v === "" ||
        v === null ||
        (Array.isArray(v) && v.length === 0)
      ) {
        delete data[k];
      }
    }

    // 9️⃣ Forzar tipo si falta
    if (!["general", "cirugia", "cuidados"].includes(data.tipo)) {
      data.tipo = "cuidados";
      data.typeLabel = "Cuidados en Casa";
      data.color = "#007bff";
    }

    // 🔟 Ejecutar actualización sin errores de casteo
    const updated = await Expediente.findByIdAndUpdate(
      id,
      { $set: data },
      {
        new: true,
        strict: false,
        overwrite: false,
      }
    );

    if (!updated) {
      return res.status(404).json({ mensaje: "Expediente no encontrado" });
    }

    return res.json({
      mensaje: "Expediente actualizado correctamente",
      expediente: updated,
    });
  } catch (error) {
    console.error("❌ Error al actualizar expediente (definitivo):", error);
    return res.status(500).json({
      mensaje: "Error al actualizar expediente",
      error: error.message || "Error interno del servidor",
    });
  }
};

/* =========================================================
   🗑️ ELIMINAR EXPEDIENTE
========================================================= */
exports.deleteExpediente = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Expediente.findByIdAndDelete(id);

    if (!deleted)
      return res.status(404).json({ mensaje: "Expediente no encontrado" });

    res.json({ mensaje: "Expediente eliminado correctamente", expediente: deleted });
  } catch (error) {
    console.error("Error eliminando expediente:", error);
    res.status(500).json({ mensaje: "Error al eliminar expediente" });
  }
};