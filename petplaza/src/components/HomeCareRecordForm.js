// src/components/HomeCareRecordForm.js
import React, { useEffect, useMemo, useState } from "react";
import { X, Brush, Trash2, CheckCircle2, AlertTriangle } from "lucide-react";
import "../CSS/HomeCareRecordForm.css";

// 🔗 APIs reales
import { getOwners } from "../apis/ownersApi";
import { getPets } from "../apis/petsApi";
import { getProducts } from "../apis/productsApi";
import { getUsers } from "../apis/usersApi";
import { subirArchivo } from "../utils/uploadFile";

export default function HomeCareRecordForm({
  onClose,
  onSave,
  editData,
  onLink,
}) {
  /* =========================================================
     🎯 ESTADO INICIAL DEL FORMULARIO
  ========================================================= */
  const [form, setForm] = useState({
    id: undefined,

    // Claves de tipo (para que NO caiga en "general")
    tipo: "cuidados",
    typeLabel: "Cuidados en Casa",
    color: "#007bff",

    // Identificadores reales
    ownerId: "",
    petId: "",

    // Datos visibles
    owner: "",
    ownerPhone: "",
    pet: "",
    species: "",
    breed: "",
    gender: "",
    weight: "",
    colorName: "",
    birthDate: "",
    branch: "",
    instructions: "",

    // sección cuidados en casa
    medication: "",
    medicationDate: "",
    foodWater: "",
    foodWaterDate: "",
    exercise: "",
    sutures: "",
    followupInstructions: "",
    monitoredAtHome: "",
    emergencyContact: "",

    date: "",
    doctor: "",
    images: [],
  });

  const [errors, setErrors] = useState({});
  const [viewer, setViewer] = useState(null);
  const [notif, setNotif] = useState(null);
  const [confirmModal, setConfirmModal] = useState(null);
  const [closing, setClosing] = useState(false);

  // catálogos
  const [owners, setOwners] = useState([]);
  const [pets, setPets] = useState([]);
  const [filteredPets, setFilteredPets] = useState([]);
  const [vets, setVets] = useState([]);

  // --- Inventario de productos disponibles ----- //
  const [products, setProducts] = useState([]);

  // Cargar medicamentos del inventario
  useEffect(() => {
    async function fetchProducts() {
      try {
        const all = await getProducts();
        // Solo mostrar medicamentos o vacunas disponibles
        const filtered = all.filter(
          (p) =>
            p.category?.toLowerCase().includes("medicamento") ||
            p.category?.toLowerCase().includes("vacuna")
        );
        setProducts(filtered);
      } catch (err) {
        console.error("❌ Error obteniendo productos:", err);
      }
    }
    fetchProducts();
  }, []);

  /* =========================================================
   🚚 CARGA INICIAL (dueños, mascotas y doctores)
========================================================= */
  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        // Cargar dueños, mascotas y usuarios (doctores)
        const [own, pt, us] = await Promise.all([
          getOwners(),
          getPets(),
          getUsers(),
        ]);

        if (!mounted) return;

        setOwners(Array.isArray(own) ? own : []);
        setPets(Array.isArray(pt) ? pt : []);

        // Filtrar solo veterinarios
        const vetsFiltered = us.filter((u) =>
          ["veterinario", "doctor", "medico"].includes(u.role?.toLowerCase())
        );

        setVets(vetsFiltered);
      } catch (e) {
        console.error("Error cargando dueños/mascotas/doctores:", e);
      }
    })();

    return () => (mounted = false);
  }, []);

  /* =========================================================
     🧩 CARGAR DATOS EN MODO EDICIÓN
  ========================================================= */
  useEffect(() => {
    if (!editData) return;

    // Mapeo defensivo en edición por si vienen campos en otro idioma
    const patched = {
      ...editData,
      tipo: editData.tipo || "cuidados",
      typeLabel: editData.typeLabel || "Cuidados en Casa",
      color: editData.color || "#007bff",
      ownerId: editData.ownerId || "",
      petId: editData.petId || "",
      owner: editData.owner || "",
      ownerPhone: editData.ownerPhone || "",
      pet: editData.pet || editData.nombre || "",
      species: editData.species || editData.especie || "",
      breed: editData.breed || editData.raza || "",
      gender: editData.gender || editData.sexo || "",
      weight: editData.weight || editData.peso || "",
      colorName: editData.colorName || editData.color || "",
    };

    setForm((f) => ({ ...f, ...patched }));
  }, [editData]);

  /* =========================================================
     🔎 HELPERS
  ========================================================= */
  const normId = (v) => {
    if (!v) return "";
    if (typeof v === "string") return v;
    if (typeof v === "object") {
      if (v._id) return String(v._id);
      if (v.$oid) return String(v.$oid);
    }
    try {
      return String(v);
    } catch {
      return "";
    }
  };

  /* =========================================================
     📌 FILTRAR MASCOTAS DEL DUEÑO SELECCIONADO
  ========================================================= */
  useEffect(() => {
    if (!form.ownerId) {
      setFilteredPets([]);
      return;
    }
    const ownerIdStr = normId(form.ownerId);
    const list = pets.filter((p) => normId(p.ownerId) === ownerIdStr);
    setFilteredPets(list);
  }, [form.ownerId, pets]);

  const ownerSelected = useMemo(
    () => owners.find((o) => normId(o._id) === normId(form.ownerId)),
    [owners, form.ownerId]
  );

  const petSelected = useMemo(
    () => pets.find((p) => normId(p._id) === normId(form.petId)),
    [pets, form.petId]
  );

  /* =========================================================
    VALIDACIÓN DE CAMPOS 
========================================================= */
  function validate() {
    const required = [
      "ownerId",
      "petId",
      "branch",
      "doctor",
      "instructions",
      "medication",
      "medicationDate",
      "foodWater",
      "foodWaterDate",
      "followupInstructions",
      "monitoredAtHome",
      "emergencyContact",
    ];

    const newErrors = {};

    // Detectar campos vacíos
    required.forEach((key) => {
      const val = form[key];
      if (!val || (typeof val === "string" && val.trim() === "")) {
        newErrors[key] = "⚠️ Requerido";
      }
    });

    // ✅ Validar formato de teléfono hondureño solo si existe
    if (form.ownerPhone && !/^\+504\s?\d{4}-?\d{4}$/.test(form.ownerPhone)) {
      newErrors.ownerPhone = "⚠️ Formato +504 XXXX-XXXX";
    }

    // ✅ Permitir letras, números y símbolos comunes (+ - ( ) .)
    if (
      form.emergencyContact &&
      !/^[A-Za-zÁÉÍÓÚáéíóúÑñ0-9\s+().-]{6,60}$/.test(form.emergencyContact)
    ) {
      newErrors.emergencyContact =
        "⚠️ Ingrese entre 6 y 60 caracteres válidos (letras, números y signos + - ( ) .)";
    }

    // ⚡️ Estas dos líneas finales son esenciales:
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  /* =========================================================
     ✏️ CAMBIOS EN CAMPOS
  ========================================================= */
  function change(e) {
    const { name, value } = e.target;

    // Formatear teléfono automáticamente
    if (name === "ownerPhone") {
      let digits = value.replace(/\D/g, "");
      if (digits.startsWith("504")) digits = digits.slice(3);
      digits = digits.slice(0, 8);
      let formatted = "+504";
      if (digits.length > 0) {
        formatted +=
          " " +
          digits.slice(0, 4) +
          (digits.length > 4 ? "-" + digits.slice(4) : "");
      }
      setForm((f) => ({ ...f, [name]: formatted }));
      return;
    }

    setForm((f) => ({ ...f, [name]: value }));
  }

  /* =========================================================
     👤 CAMBIO DE DUEÑO (auto-relleno y filtro de mascotas)
  ========================================================= */
  function handleOwnerChange(e) {
    const ownerId = e.target.value;
    const found = owners.find((o) => normId(o._id) === normId(ownerId));

    setForm((f) => ({
      ...f,
      ownerId,
      owner: found?.full_name || found?.full_name || "",
      ownerPhone: found?.phone || found?.telefono || "",
      petId: "",
      pet: "",
      species: "",
      breed: "",
      gender: "",
      weight: "",
      colorName: "",
    }));
  }

  /* =========================================================
     CAMBIO DE MASCOTA (auto-relleno de especie/raza/etc.)
  ========================================================= */
  function handlePetChange(e) {
    const petId = e.target.value;
    const p = pets.find((x) => normId(x._id) === normId(petId));

    let birthDate = "";
    if (p?.nacimiento) {
      const raw = p.nacimiento?.$date || p.nacimiento;
      birthDate = new Date(raw).toISOString().split("T")[0];
    }

    setForm((f) => ({
      ...f,
      petId,
      pet: p?.nombre || "",
      species: p?.especie || "",
      breed: p?.raza || "",
      gender: p?.sexo || "",
      weight: p?.peso != null ? String(p.peso) : "",
      colorName: p?.color || "",
      birthDate,
    }));
  }

  /* =========================================================
     REINICIAR FORMULARIO
  ========================================================= */
  function reset() {
    setForm({
      id: undefined,
      tipo: "cuidados",
      typeLabel: "Cuidados en Casa",
      color: "#007bff",

      ownerId: "",
      petId: "",

      owner: "",
      ownerPhone: "",
      pet: "",
      species: "",
      breed: "",
      gender: "",
      weight: "",
      colorName: "",

      branch: "",
      instructions: "",

      medication: "",
      medicationDate: "",
      foodWater: "",
      foodWaterDate: "",
      exercise: "",
      sutures: "",
      followupInstructions: "",
      monitoredAtHome: "",
      emergencyContact: "",

      date: "",
      doctor: "",
      images: [],
    });
    setErrors({});
    showNotif("success", "Formulario reiniciado correctamente");
  }

  /* =========================================================
   ENVIAR FORMULARIO (ACTUALIZADO)
========================================================= */
  function submit(e) {
    e.preventDefault();

    if (!validate()) {
      showNotif("delete", "Expediente incompleto");
      return;
    }

    // 🔹 Construir el objeto final a enviar al backend
    const data = {
      ...form,
      tipo: "cuidados",
      typeLabel: "Cuidados en Casa",
      color: "#007bff",
      date: form.date || new Date().toISOString().split("T")[0],
      birthDate: form.birthDate || "",

      // ✅ Campos específicos de Cuidados en Casa
      medication: form.medication,
      medications: form.medication ? [form.medication] : [],
      medicationDate: form.medicationDate,
      foodWater: form.foodWater,
      foodWaterDate: form.foodWaterDate,
      monitoredAtHome: form.monitoredAtHome,
      emergencyContact: form.emergencyContact,

      // Normalizar datos del dueño y mascota
      owner: ownerSelected?.full_name || form.owner,
      ownerPhone: ownerSelected?.phone || form.ownerPhone,
      pet: petSelected?.nombre || form.pet,
      species: petSelected?.especie || form.species,
      breed: petSelected?.raza || form.breed,
      gender: petSelected?.sexo || form.gender,
      weight: petSelected?.peso || form.weight,
      colorName: petSelected?.color || form.colorName,
    };

    // 🔸 Enviar al backend
    data.emergencyContact = String(form.emergencyContact || "").trim();
    onSave?.(data);
    showNotif("success", "✅ Cuidados en Casa guardado correctamente");
  }

  /* =========================================================
      CERRAR CON ANIMACIÓN
  ========================================================= */
  const handleClose = () => {
    setClosing(true);
    setTimeout(() => onClose?.(), 250);
  };

  /* =========================================================
      NOTIFICACIONES
  ========================================================= */
  function showNotif(type, text) {
    setNotif({ type, text });
    setTimeout(() => setNotif(null), 2500);
  }

  /* =========================================================
     IMÁGENES en Firebase
========================================================= */
  async function onPickImage(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const uploadedUrl = await subirArchivo(file, "expedientes");

      setForm((f) => ({
        ...f,
        images: [...f.images, { id: `${Date.now()}`, url: uploadedUrl }],
      }));

      showNotif("success", "📸 Imagen subida exitosamente a Firebase");
    } catch (error) {
      console.error("🔥 Error al subir:", error);
      showNotif("delete", "⚠️ Error al subir la imagen");
    }

    e.target.value = "";
  }

  function askRemoveImage(img) {
    setConfirmModal(img);
  }

  function confirmRemoveImage() {
    if (!confirmModal) return;
    setForm((f) => ({
      ...f,
      images: f.images.filter((i) => i.id !== confirmModal.id),
    }));
    setConfirmModal(null);
    showNotif("delete", " Imagen eliminada correctamente");
  }

  /* =========================================================
     🔄 ENLACES ENTRE EXPEDIENTES
  ========================================================= */
  function gotoGeneral() {
    onLink?.("general", {
      pet: form.pet,
      owner: form.owner,
      ownerPhone: form.ownerPhone,
      species: form.species,
      doctor: form.doctor,
      branch: form.branch,
      notes: form.instructions,
      images: form.images,
      type: "Expediente General",
      color: "#00a884",
    });
  }

  function gotoSurgery() {
    onLink?.("surgery", {
      pet: form.pet,
      owner: form.owner,
      doctor: form.doctor,
      date: form.date,
      notes: form.instructions,
      images: form.images,
      type: "Expediente Cirugía",
      color: "#ef4444",
    });
  }

  /* =========================================================
     🧱 RENDERIZADO PRINCIPAL DEL FORMULARIO
  ========================================================= */
  return (
    <div className={`care-overlay ${closing ? "closing" : ""}`}>
      <div className={`care-modal ${closing ? "closing" : ""}`}>
        <div className="modal-header">
          <h2>Cuidados en Casa</h2>
          <button className="close-btn" onClick={handleClose}>
            <X size={20} />
          </button>
          <button className="clear-btn" onClick={reset}>
            <Brush size={18} />
          </button>
        </div>

        <form onSubmit={submit}>
          {/* Dueño / Teléfono (cargados desde BD) */}
          <div className="row-2">
            <label className={errors.ownerId || errors.owner ? "error" : ""}>
              <span>Dueño</span>
              <select
                name="ownerId"
                value={form.ownerId}
                onChange={handleOwnerChange}
              >
                <option value="">Seleccione un dueño</option>
                {owners.map((o) => (
                  <option key={normId(o._id)} value={normId(o._id)}>
                    {o.full_name}
                  </option>
                ))}
              </select>
              {(errors.ownerId || errors.owner) && (
                <small>{errors.ownerId || errors.owner}</small>
              )}
            </label>

            <label className={errors.ownerPhone ? "error" : ""}>
              <span>Teléfono</span>
              <input
                name="ownerPhone"
                value={form.ownerPhone}
                onChange={change}
                placeholder="+504 XXXX-XXXX"
              />
              {errors.ownerPhone && <small>{errors.ownerPhone}</small>}
            </label>
          </div>

          {/* Mascota / Especie (mascotas filtradas por dueño) */}
          <div className="row-2">
            <label className={errors.petId || errors.pet ? "error" : ""}>
              <span>Mascota</span>
              <select
                name="petId"
                value={form.petId}
                onChange={handlePetChange}
              >
                <option value="">Seleccione una mascota</option>
                {filteredPets.map((p) => (
                  <option key={normId(p._id)} value={normId(p._id)}>
                    {p.nombre}
                  </option>
                ))}
              </select>
              {(errors.petId || errors.pet) && (
                <small>{errors.petId || errors.pet}</small>
              )}
            </label>

            <label className={errors.species ? "error" : ""}>
              <span>Especie</span>
              <input
                name="species"
                value={form.species}
                onChange={change}
                placeholder="Perro, Gato…"
              />
              {errors.species && <small>{errors.species}</small>}
            </label>
          </div>

          {/* Raza / Sexo */}
          <div className="row-2">
            <label>
              <span>Raza</span>
              <input
                name="breed"
                value={form.breed}
                onChange={change}
                placeholder="Labrador, Angora…"
              />
            </label>

            <label>
              <span>Sexo</span>
              <input
                name="gender"
                value={form.gender}
                onChange={change}
                placeholder="Macho / Hembra"
              />
            </label>
          </div>

          {/* Peso / Color */}
          <div className="row-2">
            <label>
              <span>Peso</span>
              <input
                name="weight"
                value={form.weight}
                onChange={change}
                placeholder="Ej. 5"
              />
            </label>

            <label>
              <span>Color</span>
              <input
                name="colorName"
                value={form.colorName}
                onChange={change}
                placeholder="Negro, Marrón…"
              />
            </label>
          </div>

          {/* Fecha de Nacimiento */}
          <label>
            <span>Fecha de nacimiento</span>
            <input
              type="date"
              name="birthDate"
              value={form.birthDate}
              onChange={change}
              disabled
            />
          </label>

          {/* Sucursal / Instrucciones */}
          <label className={errors.branch ? "error" : ""}>
            <span>Sucursal</span>
            <input
              name="branch"
              value={form.branch}
              onChange={change}
              placeholder="Sucursal Central"
            />
            {errors.branch && <small>{errors.branch}</small>}
          </label>

          <label className={errors.instructions ? "error" : ""}>
            <span>Instrucciones</span>
            <input
              name="instructions"
              value={form.instructions}
              onChange={change}
              placeholder="Indicaciones generales para el cuidado"
            />
            {errors.instructions && <small>{errors.instructions}</small>}
          </label>

          {/* Doctor responsable */}
          <label className={errors.doctor ? "error" : ""}>
            <span>Doctor responsable</span>
            <select
              name="doctor"
              value={form.doctor}
              onChange={(e) => {
                const doctorId = e.target.value;
                const vet = vets.find((v) => v.full_name === doctorId);

                setForm((f) => ({
                  ...f,
                  doctor: doctorId,
                  doctorId: vet?._id || "",
                }));
              }}
            >
              <option value="">Seleccione un doctor</option>
              {vets.map((v) => (
                <option key={v._id} value={v.full_name}>
                  {v.full_name}
                </option>
              ))}
            </select>
            {errors.doctor && <small>{errors.doctor}</small>}
          </label>

          {/* Medicamentos / Comida y Agua */}
          <div className="row-2">
            <label className={errors.medication ? "error" : ""}>
              <span>Vacuna o Medicamento</span>
              <select
                name="medication"
                value={form.medication}
                onChange={change}
              >
                <option value="">Seleccione una opción</option>
                {products.map((p) => (
                  <option key={p._id} value={p.name}>
                    {p.category} — {p.name}
                  </option>
                ))}
              </select>
              {errors.medication && <small>{errors.medication}</small>}
            </label>
            <label className={errors.medicationDate ? "error" : ""}>
              <span>Fecha de inicio de medicamento</span>
              <input
                type="date"
                name="medicationDate"
                value={form.medicationDate}
                onChange={change}
              />
              {errors.medicationDate && <small>{errors.medicationDate}</small>}
            </label>
          </div>

          <div className="row-2">
            <label className={errors.foodWater ? "error" : ""}>
              <span>Comida y Agua</span>
              <input
                name="foodWater"
                value={form.foodWater}
                onChange={change}
                placeholder="Indicaciones sobre alimentación e hidratación"
              />
              {errors.foodWater && <small>{errors.foodWater}</small>}
            </label>

            <label className={errors.foodWaterDate ? "error" : ""}>
              <span>Fecha de inicio de alimentación</span>
              <input
                type="date"
                name="foodWaterDate"
                value={form.foodWaterDate}
                onChange={change}
              />
              {errors.foodWaterDate && <small>{errors.foodWaterDate}</small>}
            </label>
          </div>

          {/* Instrucciones de seguimiento */}
          <label className={errors.followupInstructions ? "error" : ""}>
            <span>Instrucciones de Seguimiento</span>
            <input
              name="followupInstructions"
              value={form.followupInstructions}
              onChange={change}
              placeholder="Recomendaciones posteriores"
            />
            {errors.followupInstructions && (
              <small>{errors.followupInstructions}</small>
            )}
          </label>

          {/* Monitoreó en casa */}
          <label className={errors.monitoredAtHome ? "error" : ""}>
            <span>Monitoreó en Casa</span>
            <textarea
              name="monitoredAtHome"
              value={form.monitoredAtHome}
              onChange={change}
              placeholder="Observaciones o comportamientos detectados"
              rows={4}
            />
            {errors.monitoredAtHome && <small>{errors.monitoredAtHome}</small>}
          </label>

          {/* Contacto de emergencia */}
          <label className={errors.emergencyContact ? "error" : ""}>
            <span>Contacto de Emergencia</span>
            <input
              name="emergencyContact"
              value={form.emergencyContact}
              onChange={change}
              placeholder="Ej: +504 8888-8888 / Dr. Luis Castillo"
            />
            {errors.emergencyContact && (
              <small>{errors.emergencyContact}</small>
            )}
          </label>

          {/* Sección de imágenes */}
          <div className="images">
            {form.images.map((img) => (
              <div className="thumb" key={img.id}>
                <img
                  src={img.url}
                  alt="Evidencia"
                  onClick={() => setViewer(img.url)}
                />
                <button
                  type="button"
                  className="trash"
                  onClick={() => askRemoveImage(img)}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>

          {/* Botones inferiores */}
          <div className="buttons-grid">
            <label className="ghost">
              Importar Imagen
              <input
                type="file"
                accept="image/*"
                onChange={onPickImage}
                hidden
              />
            </label>
            <button type="button" className="ghost" onClick={gotoGeneral}>
              Expediente General
            </button>
            <button type="button" className="ghost" onClick={gotoSurgery}>
              Expediente Cirugía
            </button>
          </div>

          <div className="footer">
            <button type="button" className="secondary" onClick={handleClose}>
              Cancelar
            </button>
            <button type="submit" className="primary">
              Guardar
            </button>
          </div>
        </form>
      </div>

      {/* Visor de imagen */}
      {viewer && (
        <div
          className="img-overlay"
          onMouseDown={(e) => {
            if (e.target.classList.contains("img-overlay")) setViewer(null);
          }}
        >
          <div className="img-viewer" onMouseDown={(e) => e.stopPropagation()}>
            <img src={viewer} alt="Vista ampliada" />
            <button
              className="img-close"
              onClick={(e) => {
                e.stopPropagation();
                setViewer(null);
              }}
            >
              <X size={20} />
            </button>
          </div>
        </div>
      )}

      {/* Notificación */}
      {notif && (
        <div className={`notif ${notif.type}`}>
          {notif.type === "success" && <CheckCircle2 size={22} />}
          {notif.type === "delete" && <AlertTriangle size={22} />}
          <span>{notif.text}</span>
        </div>
      )}

      {/* Confirmar eliminación */}
      {confirmModal && (
        <div
          className="delete-overlay"
          onMouseDown={(e) => {
            if (e.target.classList.contains("delete-overlay"))
              setConfirmModal(null);
          }}
        >
          <div
            className="delete-modal"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <AlertTriangle size={40} color="#ef4444" />
            <h3>¿Eliminar esta imagen?</h3>
            <p>Esta acción no se puede deshacer.</p>
            <div className="confirm-btns">
              <button className="btn-yes" onClick={confirmRemoveImage}>
                Sí, eliminar
              </button>
              <button className="btn-no" onClick={() => setConfirmModal(null)}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}