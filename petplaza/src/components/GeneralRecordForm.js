import React, { useEffect, useMemo, useState } from "react";
import { X, Brush, Trash2, CheckCircle2, AlertTriangle } from "lucide-react";
import "../CSS/GeneralRecordForm.css";

import { getOwners } from "../apis/ownersApi";
import { getUsers } from "../apis/usersApi";
import { getProducts } from "../apis/productsApi";
import { subirArchivo } from "../utils/uploadFile";

export default function GeneralRecordForm({ onClose, onSave, editData, onLink }) {
  const [form, setForm] = useState({
    typeLabel: "Expediente General",
    tipo: "general",
    color: "#00a884",

    ownerId: "",
    owner: "",
    ownerPhone: "",
    petId: "",
    pet: "",

    species: "",
    gender: "",
    breed: "",
    weight: "",
    colorName: "",
    bloodDonor: "",

    birthDate: "",

    doctorId: "",
    doctor: "",
    date: "",
    branch: "",
    tests: "",
    surgeryPlanned: "",
    diagnosis: "",
    treatment: "",
    notes: "",

    cc: "",
    selectedTreatments: [],
    images: [],
  });

  const [errors, setErrors] = useState({});
  const [notif, setNotif] = useState(null);
  const [viewer, setViewer] = useState(null);
  const [confirmModal, setConfirmModal] = useState(null);
  const [closing, setClosing] = useState(false);

  const [owners, setOwners] = useState([]);
  const [petsByOwner, setPetsByOwner] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [options, setOptions] = useState({ medicamentos: [], vacunas: [] });

  /* =========================================================
     CARGA DE DATOS INICIALES
  ========================================================= */
  useEffect(() => {
    (async () => {
      try {
        const [ownersData, usersData, prods] = await Promise.all([
          getOwners(),
          getUsers(),
          getProducts(),
        ]);

        setOwners(ownersData || []);

        const vets = (usersData || []).filter(
          (u) => u.role === "veterinario" && u.status === "active"
        );
        setDoctors(vets);

        const listado = Array.isArray(prods) ? prods : [];
        const medicamentos = listado.filter((p) =>
          (p.category || "").toLowerCase().includes("medic")
        );
        const vacunas = listado.filter((p) =>
          (p.category || "").toLowerCase().includes("vacun")
        );
        setOptions({ medicamentos, vacunas });
      } catch (e) {
        console.error(e);
        showNotif("delete", "Error al cargar listas iniciales");
      }
    })();
  }, []);

  useEffect(() => {
  if (!editData) return;

  const formattedTreatments = Array.isArray(editData.selectedTreatments)
    ? editData.selectedTreatments.map((t) => ({
        _id: t._id || t.id || `${Date.now()}-${Math.random()}`,
        name: t.name || t.Nombre || "",
        type: t.type || t.Tipo || "",
      }))
    : [];

  setForm((f) => ({
    ...f,
    ...editData,
    selectedTreatments: formattedTreatments,
    images: Array.isArray(editData.images) ? editData.images : [],
  }));
}, [editData]);

  /* =========================================================
     VALIDACIÓN
  ========================================================= */
  function validate() {
    const newErrors = {};
    const required = [
      "ownerId",
      "petId",
      "species",
      "gender",
      "bloodDonor",
      "doctorId",
      "diagnosis",
      "treatment",
    ];
    required.forEach((f) => {
      if (!form[f] || String(form[f]).trim() === "") newErrors[f] = "⚠️ Requerido";
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  /* =========================================================
     CAMBIO DE CAMPOS
  ========================================================= */
  function change(e) {
    const { name, value } = e.target;

    if (name === "ownerId") {
      const ownerSel = owners.find((o) => o._id === value);
      setForm((f) => ({
        ...f,
        ownerId: value,
        owner: ownerSel?.full_name || "",
        ownerPhone: ownerSel?.phone || "",
        petId: "",
        pet: "",
        species: "",
        breed: "",
        gender: "",
        colorName: "",
        weight: "",
      }));
      // Cargar mascotas del dueño seleccionado
      (async () => {
        try {
          const isLocal =
            typeof window !== "undefined" && window.location.hostname === "localhost";
          const base = isLocal ? "http://localhost:5000" : "";
          const res = await fetch(`${base}/api/pets/by-owner/${value}`);
          const data = (await res.json()) || [];
          setPetsByOwner(Array.isArray(data) ? data : []);
        } catch {
          setPetsByOwner([]);
        }
      })();
      return;
    }

if (name === "petId") {
  const petSel = petsByOwner.find((p) => p._id === value);

  let birthDate = "";
  let rawBirthDate = "";

  if (petSel?.nacimiento) {
    const raw = petSel.nacimiento?.$date || petSel.nacimiento;
    rawBirthDate = raw; 
    birthDate = new Date(raw).toISOString().split("T")[0];
  }

  setForm((f) => ({
    ...f,
    petId: value,
    pet: petSel?.nombre || "",
    species: petSel?.especie || "",
    breed: petSel?.raza || "",
    gender: petSel?.sexo || "",
    colorName: petSel?.color || "",
    weight: petSel?.peso ?? "",
    birthDate,     
    rawBirthDate,   
  }));
  return;
}

    if (name === "doctorId") {
      const docSel = doctors.find((d) => d._id === value);
      setForm((f) => ({ ...f, doctorId: value, doctor: docSel?.full_name || "" }));
      return;
    }

    setForm((f) => ({ ...f, [name]: value }));
  }

  /* =========================================================
     TRATAMIENTOS (Medicamentos/Vacunas)
  ========================================================= */
  const allTreatOptions = useMemo(() => {
    const meds = (options.medicamentos || []).map((m) => ({
      _id: m._id,
      name: m.name,
      type: "Medicamento",
    }));
    const vacs = (options.vacunas || []).map((v) => ({
      _id: v._id,
      name: v.name,
      type: "Vacuna",
    }));
    return [...meds, ...vacs];
  }, [options]);

  const [treatSelect, setTreatSelect] = useState("");

  const addTreatment = () => {
    if (!treatSelect) return;
    const opt = allTreatOptions.find((o) => o._id === treatSelect);
    if (!opt) return;
    if (form.selectedTreatments.some((t) => t._id === opt._id)) return;
    setForm((f) => ({ ...f, selectedTreatments: [...f.selectedTreatments, opt] }));
    setTreatSelect("");
  };

  const removeTreatment = (id) => {
    setForm((f) => ({
      ...f,
      selectedTreatments: f.selectedTreatments.filter((t) => t._id !== id),
    }));
  };

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
      console.error("🔥 Error al subir:", error); // 👈 AGREGA ESTA LÍNEA
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
    showNotif("delete", "Imagen eliminada correctamente");
  }

  /* =========================================================
     GUARDAR
  ========================================================= */
  function showNotif(type, text) {
    setNotif({ type, text });
    setTimeout(() => setNotif(null), 2500);
  }

 function submit(e) {
  e.preventDefault();
  if (!validate()) {
    showNotif("delete", "Expediente incompleto");
    return;
  }
  const payload = {
    ...form,
    typeLabel: "Expediente General",
    tipo: "general",
    color: "#00a884",
    birthDate: form.birthDate || "",
  rawBirthDate: form.rawBirthDate || "",

  date: form.date || new Date().toISOString().split("T")[0],
  };
  onSave?.(payload);
  showNotif("success", "✅ Expediente guardado correctamente");
}

  function reset() {
    setForm((f) => ({
      ...f,
      ownerId: "",
      owner: "",
      ownerPhone: "",
      petId: "",
      pet: "",
      species: "",
      gender: "",
      breed: "",
      weight: "",
      colorName: "",
      birthDate: "",
      rawBirthDate: "",
      bloodDonor: "",
      doctorId: "",
      doctor: "",
      date: "",
      branch: "",
      tests: "",
      surgeryPlanned: "",
      diagnosis: "",
      treatment: "",
      notes: "",
      cc: "",
      selectedTreatments: [],
      images: [],
    }));
    setPetsByOwner([]);
    setErrors({});
  }

  const handleClose = () => {
    setClosing(true);
    setTimeout(() => onClose?.(), 250);
  };

  /* =========================================================
     UI
  ========================================================= */
  return (
    <div className={`general-modal-overlay ${closing ? "closing" : ""}`}>
      <div className={`general-modal ${closing ? "closing" : ""}`}>
        <div className="modal-header">
          <h2>Expediente General</h2>
          <button className="clean" onClick={reset}>
            <Brush size={18} />
          </button>
          <button className="close" onClick={handleClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={submit}>
          {/* Dueño */}
          <label className={errors.ownerId ? "error" : ""}>
            <span>Dueño</span>
            <select name="ownerId" value={form.ownerId} onChange={change}>
              <option value="">Seleccione un dueño</option>
              {owners.map((o) => (
                <option key={o._id} value={o._id}>
                  {o.full_name}
                </option>
              ))}
            </select>
            {errors.ownerId && <small>{errors.ownerId}</small>}
          </label>

          {/* Teléfono (autorrelleno) */}
          <label>
            <span>Teléfono</span>
            <input
              name="ownerPhone"
              value={form.ownerPhone || ""}
              onChange={change}
              placeholder="+504 XXXX-XXXX"
            />
          </label>

          {/* Mascota */}
<label className={errors.petId ? "error" : ""}>
  <span>Mascota</span>
  <select
    name="petId"
    value={form.petId || ""}
    onChange={change}
    disabled={!form.ownerId}
  >
    {/*  Si estás editando y el petId actual no está en la lista, muestra la mascota actual */}
    {editData && form.pet && !petsByOwner.some((p) => p._id === form.petId) && (
      <option value={form.petId}>{form.pet}</option>
    )}

    <option value="">Seleccione una mascota</option>

    {petsByOwner.map((p) => (
      <option key={p._id} value={p._id}>
        {p.nombre}
      </option>
    ))}
  </select>
  {errors.petId && <small>{errors.petId}</small>}
</label>

          {/* Donante de Sangre */}
         <label className={errors.bloodDonor ? "error" : ""}>
  <span>Donante de Sangre</span>
  <select
    name="bloodDonor"
    value={form.bloodDonor}
    onChange={change}
    required
  >
    <option value="">Seleccione</option>
    <option value="Sí">Sí</option>
    <option value="No">No</option>
  </select>
  {errors.bloodDonor && <small>{errors.bloodDonor}</small>}
</label>

          {/* Género */}
          <label className={errors.gender ? "error" : ""}>
            <span>Género</span>
            <select name="gender" value={form.gender} onChange={change}>
              <option value="">Seleccione</option>
              <option>Hembra</option>
              <option>Macho</option>
            </select>
            {errors.gender && <small>{errors.gender}</small>}
          </label>

          {/* Fecha */}
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

          {/* Especie */}
          <label>
            <span>Especie</span>
            <input name="species" value={form.species} onChange={change} placeholder="Ej: Perro" />
          </label>

          {/* Raza */}
          <label>
            <span>Raza</span>
            <input name="breed" value={form.breed} onChange={change} placeholder="Ej: Labrador" />
          </label>

          {/* Peso */}
          <label>
            <span>Peso</span>
            <input name="weight" value={form.weight} onChange={change} placeholder="Ej: 4 kg" />
          </label>

          {/* Color */}
          <label>
            <span>Color de Mascota</span>
            <input
              name="colorName"
              value={form.colorName}
              onChange={change}
              placeholder="Ej: Marrón claro"
            />
          </label>

          {/* Sucursal */}
          <label>
            <span>Sucursal</span>
            <input name="branch" value={form.branch} onChange={change} placeholder="Sucursal" />
          </label>

          {/* Exámenes */}
          <label>
            <span>Exámenes a realizar</span>
            <input name="tests" value={form.tests} onChange={change} placeholder="Ej: Hemograma" />
          </label>

          {/* Cirugía */}
          <label>
            <span>Cirugía a realizar</span>
            <input
              name="surgeryPlanned"
              value={form.surgeryPlanned}
              onChange={change}
              placeholder="Ej: Esterilización"
            />
          </label>

          {/* Diagnóstico */}
          <label className={errors.diagnosis ? "error" : ""}>
            <span>Diagnóstico</span>
            <input
              name="diagnosis"
              value={form.diagnosis}
              onChange={change}
              placeholder="Diagnóstico"
            />
            {errors.diagnosis && <small>{errors.diagnosis}</small>}
          </label>

          {/* Tratamiento */}
          <label className={errors.treatment ? "error" : ""}>
            <span>Tratamiento</span>
            <input
              name="treatment"
              value={form.treatment}
              onChange={change}
              placeholder="Tratamiento"
            />
            {errors.treatment && <small>{errors.treatment}</small>}
          </label>

          {/* Doctor */}
          <label className={errors.doctorId ? "error" : ""}>
            <span>Doctor responsable</span>
            <select name="doctorId" value={form.doctorId} onChange={change}>
              <option value="">Seleccione un veterinario</option>
              {doctors.map((d) => (
                <option key={d._id} value={d._id}>
                  {d.full_name}
                </option>
              ))}
            </select>
            {errors.doctorId && <small>{errors.doctorId}</small>}
          </label>

          {/* Notas */}
          <label>
            <span>Notas adicionales</span>
            <textarea
              name="notes"
              value={form.notes}
              onChange={change}
              placeholder="Escribe notas…"
            />
          </label>

       {/* Vacuna o Medicamento */}
          <div className="vaccine-block">
            <label>
              <span>Vacuna o Medicamento</span>
              <select value={treatSelect} onChange={(e) => setTreatSelect(e.target.value)}>
                <option value="">Seleccione una opción</option>
                {allTreatOptions.map((o) => (
                  <option key={o._id} value={o._id}>
                    {o.type} — {o.name}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className="ghost"
              onClick={addTreatment}
              disabled={!treatSelect}
            >
              Añadir
            </button>
            <label>
              <span>CC a aplicar</span>
              <input name="cc" value={form.cc} onChange={change} placeholder="Ej: 10 cc" />
            </label>
          </div>

          {!!form.selectedTreatments.length && (
            <div className="selected-pills">
              {form.selectedTreatments.map((t) => (
                <span key={t._id} className={`pill ${t.type === "Vacuna" ? "pill-v" : "pill-m"}`}>
                  {t.type}: {t.name}
                  <button type="button" onClick={() => removeTreatment(t._id)}>
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}


          {/* Galería */}
          <div className="images">
            {form.images.map((img) => (
              <div className="thumb" key={img.id}>
                <img src={img.url} alt="" onClick={() => setViewer(img.url)} />
                <button type="button" className="trash" onClick={() => askRemoveImage(img)}>
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>

          {/* Botones inferiores originales */}
          <div className="buttons-grid">
            <label className="ghost">
              Importar Imagen
              <input type="file" accept="image/*" onChange={onPickImage} hidden />
            </label>
            <button
              type="button"
              className="ghost"
              onClick={() =>
                onLink?.("surgery", {
                  pet: form.pet,
                  doctor: form.doctor,
                  date: form.date,
                  owner: form.owner,
                  species: form.species,
                  surgeryType: form.surgeryPlanned || "",
                  notes: form.notes || "",
                  images: form.images || [],
                  color: "#d44",
                  typeLabel: "Expediente Cirugía",
                  tipo: "cirugia",
                })
              }
            >
              Expediente Cirugía
            </button>
            <button
              type="button"
              className="ghost"
              onClick={() =>
                onLink?.("care", {
                  pet: form.pet,
                  doctor: form.doctor,
                  date: form.date,
                  owner: form.owner,
                  species: form.species,
                  medication: "",
                  notes: form.notes || "",
                  images: form.images || [],
                  color: "#007bff",
                  typeLabel: "Cuidados en Casa",
                  tipo: "cuidados",
                })
              }
            >
              Cuidados En Casa
            </button>
          </div>

          {/* Footer */}
          <div className="footer">
            <button type="button" className="secondary" onClick={handleClose}>
              Cancelar
            </button>
            <button type="submit" className="primary">
              {editData ? "Actualizar" : "Guardar"}
            </button>
          </div>
        </form>
      </div>

      {/* Imagen ampliada */}
      {viewer && (
        <div
          className="img-overlay"
          onMouseDown={(e) => {
            if (e.target.classList.contains("img-overlay")) setViewer(null);
          }}
        >
          <div className="img-viewer" onMouseDown={(e) => e.stopPropagation()}>
            <img src={viewer} alt="" />
            <button className="img-close" onClick={() => setViewer(null)}>
              <X size={20} />
            </button>
          </div>
        </div>
      )}

      {/* Toast */}
      {notif && (
        <div className={`notif ${notif.type}`}>
          {notif.type === "success" && <CheckCircle2 size={22} />}
          {notif.type === "delete" && <AlertTriangle size={22} />}
          <span>{notif.text}</span>
        </div>
      )}

      {/* Confirmación borrar imagen */}
      {confirmModal && (
        <div
          className="delete-overlay"
          onMouseDown={(e) => {
            if (e.target.classList.contains("delete-overlay")) setConfirmModal(null);
          }}
        >
          <div className="delete-modal" onMouseDown={(e) => e.stopPropagation()}>
            <AlertTriangle size={40} color="#ff4444" />
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