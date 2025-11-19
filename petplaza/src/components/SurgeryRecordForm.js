// src/components/SurgeryRecordForm.js
import React, { useEffect, useState } from "react";
import { X, Brush, Trash2, CheckCircle2, AlertTriangle } from "lucide-react";
import "../CSS/SurgeryRecordForm.css";

import { getOwners } from "../apis/ownersApi";
import { getPets } from "../apis/petsApi";
import { getUsers } from "../apis/usersApi";
import { subirArchivo } from "../utils/uploadFile";

export default function SurgeryRecordForm({ onClose, onSave, editData, onLink }) {
  const [form, setForm] = useState({
    id: undefined,
    tipo: "cirugia",
    typeLabel: "Expediente Cirugía",
    color: "#ef4444",

    ownerId: "",
    owner: "",
    ownerPhone: "",
    identityNumber: "",

    petId: "",
    pet: "",
    branch: "",
    dateTime: "",
    species: "",
    breed: "",
    gender: "",
    birthDate: "",

    caseDescription: "",
    surgeryType: "",
    anesthetic: "",
    doctor: "",
    notes: "",

    risk1: "",
    risk2: "",
    risk3: "",
    risk4: "",
    risk5: "",
    risk6: "",

    images: [],
  });

  const [owners, setOwners] = useState([]);
  const [pets, setPets] = useState([]);
  const [filteredPets, setFilteredPets] = useState([]);
  const [doctors, setDoctors] = useState([]);

  const [errors, setErrors] = useState({});
  const [viewer, setViewer] = useState(null);
  const [notif, setNotif] = useState(null);
  const [confirmModal, setConfirmModal] = useState(null);
  const [closing, setClosing] = useState(false);

  // ============================================================
  // 🔰 Cargar datos iniciales
  // ============================================================
  useEffect(() => {
    const nowISO = new Date().toISOString().slice(0, 16);
    setForm((f) => ({
      ...f,
      dateTime: editData?.dateTime || nowISO,
      ...(editData || {}),
    }));

    async function load() {
      try {
        const [ownersData, petsData, usersData] = await Promise.all([
          getOwners(),
          getPets(),
          getUsers(),
        ]);

        const vets = usersData.filter((u) => u.role === "veterinario");

        setOwners(ownersData);
        setPets(petsData);
        setDoctors(vets);
      } catch (e) {
        console.error("Error cargando datos:", e);
      }
    }
    load();
  }, [editData]);

  // ============================================================
  // 🔍 Normalizar IDs
  // ============================================================
  const normId = (v) => {
    if (!v) return "";
    if (typeof v === "string") return v;
    if (v._id) return String(v._id);
    if (v.$oid) return String(v.$oid);
    return "";
  };

  // ============================================================
  // 🐶 Filtrar mascotas de un dueño
  // ============================================================
  useEffect(() => {
    if (!form.ownerId) return setFilteredPets([]);
    const id = normId(form.ownerId);
    setFilteredPets(pets.filter((p) => normId(p.ownerId) === id));
  }, [form.ownerId, pets]);

  // ============================================================
  // ✏ Cambios de inputs
  // ============================================================
  const change = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  // ============================================================
  // ♻ Resetear formulario
  // ============================================================
  const reset = () => {
    setForm({
      id: undefined,
      tipo: "cirugia",
      typeLabel: "Expediente Cirugía",
      color: "#ef4444",
      ownerId: "",
      owner: "",
      ownerPhone: "",
      identityNumber: "",
      petId: "",
      pet: "",
      branch: "",
      dateTime: new Date().toISOString().slice(0, 16),
      species: "",
      breed: "",
      gender: "",
      birthDate: "",
      caseDescription: "",
      surgeryType: "",
      anesthetic: "",
      doctor: "",
      notes: "",
      risk1: "",
      risk2: "",
      risk3: "",
      risk4: "",
      risk5: "",
      risk6: "",
      images: [],
    });

    setErrors({});
    showNotif("success", "Formulario reiniciado correctamente");
  };

  // ============================================================
  // 🛑 Validación
  // ============================================================
  const validate = () => {
    const required = [
      "ownerId",
      "ownerPhone",
      "identityNumber",
      "petId",
      "branch",
      "dateTime",
      "species",
      "breed",
      "gender",
      "birthDate",
      "caseDescription",
      "doctor",
      "surgeryType",
      "risk1",
      "risk2",
      "risk3",
      "risk4",
      "risk5",
      "risk6",
      "notes",
    ];

    const errs = {};
    required.forEach((k) => {
      if (!form[k] || form[k].toString().trim() === "") {
        errs[k] = "⚠️ Requerido";
      }
    });

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // ============================================================
  // ❌ Cerrar modal
  // ============================================================
  const handleClose = () => {
    setClosing(true);
    setTimeout(() => onClose?.(), 250);
  };

  // ============================================================
  // 🔔 Notificaciones
  // ============================================================
  const showNotif = (type, text) => {
    setNotif({ type, text });
    setTimeout(() => setNotif(null), 2500);
  };

  // ============================================================
  // 📸 Imágenes → Firebase
  // ============================================================
  async function onPickImage(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const url = await subirArchivo(file, "expedientes");

      setForm((f) => ({
        ...f,
        images: [...f.images, { id: `${Date.now()}`, url }],
      }));

      showNotif("success", "📸 Imagen subida a Firebase");
    } catch (error) {
      console.error("Error:", error);
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

  // ============================================================
  // 💾 Guardar
  // ============================================================
  const submit = (e) => {
    e.preventDefault();

    if (!validate()) {
      showNotif("delete", "Expediente quirúrgico incompleto");
      return;
    }

    const payload = {
      ...form,
      tipo: "cirugia",
      typeLabel: "Expediente Cirugía",
      color: "#ef4444",
      date: form.dateTime.slice(0, 10),
    };

    onSave(payload);
    showNotif("success", "💾 Expediente quirúrgico guardado correctamente");
  };

  // ============================================================
  // 🧱 Render
  // ============================================================
  return (
    <div className={`surgery-modal-overlay ${closing ? "closing" : ""}`}>
      <div className={`surgery-modal ${closing ? "closing" : ""}`}>
        <div className="modal-header">
          <h2>Expediente Quirúrgico</h2>
          <button className="close" onClick={handleClose}><X size={20} /></button>
          <button className="clean" onClick={reset}><Brush size={18} /></button>
        </div>

        <form onSubmit={submit}>
          {/* ============================
              DUEÑO
          ============================ */}
          <div className="row-3">
            <label className={errors.ownerId ? "error" : ""}>
              <span>Dueño</span>
              <select
                name="ownerId"
                value={form.ownerId}
                onChange={(e) => {
                  const ownerId = e.target.value;
                  const owner = owners.find((o) => normId(o._id) === ownerId);

                  setForm((f) => ({
                    ...f,
                    ownerId,
                    owner: owner?.full_name || "",
                    ownerPhone: owner?.phone || "",
                    identityNumber: owner?.dni || "",
                    petId: "",
                    pet: "",
                    species: "",
                    breed: "",
                    gender: "",
                  }));
                }}
              >
                <option value="">Seleccione un dueño</option>
                {owners.map((o) => (
                  <option key={normId(o._id)} value={normId(o._id)}>
                    {o.full_name}
                  </option>
                ))}
              </select>
              {errors.ownerId && <small>{errors.ownerId}</small>}
            </label>

            <label className={errors.ownerPhone ? "error" : ""}>
              <span>Teléfono</span>
              <input value={form.ownerPhone} readOnly />
              {errors.ownerPhone && <small>{errors.ownerPhone}</small>}
            </label>

            <label className={errors.identityNumber ? "error" : ""}>
              <span>Identificación</span>
              <input value={form.identityNumber} readOnly />
              {errors.identityNumber && <small>{errors.identityNumber}</small>}
            </label>
          </div>

          {/* ============================
              MASCOTA / SUCURSAL / FECHA
          ============================ */}
          <div className="row-3">
            <label className={errors.petId ? "error" : ""}>
              <span>Mascota</span>
              <select
                name="petId"
                value={form.petId}
                onChange={(e) => {
                  const petId = e.target.value;
                  const p = pets.find((x) => normId(x._id) === petId);

                  setForm((f) => ({
                    ...f,
                    petId,
                    pet: p?.nombre || "",
                    species: p?.especie || "",
                    breed: p?.raza || "",
                    gender: p?.sexo || "",
                    birthDate: p?.nacimiento
                      ? new Date(p.nacimiento).toISOString().split("T")[0]
                      : "",
                  }));
                }}
              >
                <option value="">Seleccione una mascota</option>
                {filteredPets.map((p) => (
                  <option key={normId(p._id)} value={normId(p._id)}>
                    {p.nombre}
                  </option>
                ))}
              </select>
              {errors.petId && <small>{errors.petId}</small>}
            </label>

            <label className={errors.branch ? "error" : ""}>
              <span>Sucursal</span>
              <input name="branch" value={form.branch} onChange={change} />
              {errors.branch && <small>{errors.branch}</small>}
            </label>

            <label className={errors.dateTime ? "error" : ""}>
              <span>Fecha y hora</span>
              <input type="datetime-local" name="dateTime" value={form.dateTime} onChange={change} />
              {errors.dateTime && <small>{errors.dateTime}</small>}
            </label>
          </div>

          {/* ============================
              ESPECIE / RAZA / SEXO
          ============================ */}
          <div className="row-3">
            <label className={errors.species ? "error" : ""}>
              <span>Especie</span>
              <input value={form.species} readOnly />
              {errors.species && <small>{errors.species}</small>}
            </label>

            <label className={errors.breed ? "error" : ""}>
              <span>Raza</span>
              <input value={form.breed} readOnly />
              {errors.breed && <small>{errors.breed}</small>}
            </label>

            <label className={errors.gender ? "error" : ""}>
              <span>Sexo</span>
              <input value={form.gender} readOnly />
              {errors.gender && <small>{errors.gender}</small>}
            </label>
          </div>

          {/* ============================
              NACIMIENTO / DOCTOR / CIRUGÍA
          ============================ */}
          <div className="row-3">
           <label className={errors.birthDate ? "error" : ""}>
  <span>Fecha de nacimiento</span>
  <input
    type="date"
    name="birthDate"
    value={form.birthDate}
    readOnly
  />
  {errors.birthDate && <small>{errors.birthDate}</small>}
</label>

            <label className={errors.doctor ? "error" : ""}>
              <span>Doctor</span>
              <select name="doctor" value={form.doctor} onChange={change}>
                <option value="">Seleccione</option>
                {doctors.map((d) => (
                  <option key={d._id} value={d.full_name}>
                    {d.full_name}
                  </option>
                ))}
              </select>
              {errors.doctor && <small>{errors.doctor}</small>}
            </label>

            <label className={errors.surgeryType ? "error" : ""}>
              <span>Tipo de cirugía</span>
              <input name="surgeryType" value={form.surgeryType} onChange={change} />
              {errors.surgeryType && <small>{errors.surgeryType}</small>}
            </label>
          </div>

          {/* ============================
              DESCRIPCIÓN DEL CASO
          ============================ */}
          <label className={errors.caseDescription ? "error" : ""}>
            <span>Descripción del caso</span>
            <textarea name="caseDescription" value={form.caseDescription} onChange={change} />
            {errors.caseDescription && <small>{errors.caseDescription}</small>}
          </label>

          {/* ============================
              RIESGOS
          ============================ */}
          <div className="risk-section">
            <div className="row-3">
              {[1, 2, 3].map((n) => (
                <label key={n} className={errors[`risk${n}`] ? "error" : ""}>
                  <span>Riesgo {n}</span>
                  <input name={`risk${n}`} value={form[`risk${n}`]} onChange={change} />
                  {errors[`risk${n}`] && <small>{errors[`risk${n}`]}</small>}
                </label>
              ))}
            </div>

            <div className="row-3">
              {[4, 5, 6].map((n) => (
                <label key={n} className={errors[`risk${n}`] ? "error" : ""}>
                  <span>Riesgo {n}</span>
                  <input name={`risk${n}`} value={form[`risk${n}`]} onChange={change} />
                  {errors[`risk${n}`] && <small>{errors[`risk${n}`]}</small>}
                </label>
              ))}
            </div>
          </div>

          {/* ============================
              NOTAS
          ============================ */}
          <label className={errors.notes ? "error" : ""}>
            <span>Notas</span>
            <textarea name="notes" value={form.notes} onChange={change} />
            {errors.notes && <small>{errors.notes}</small>}
          </label>

          {/* ============================
              IMÁGENES
          ============================ */}
          <div className="images">
            {form.images.map((img) => (
              <div className="thumb" key={img.id}>
                <img src={img.url} onClick={() => setViewer(img.url)} />
                <button type="button" className="trash" onClick={() => askRemoveImage(img)}>
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>

          <div className="buttons-grid">
            <label className="ghost">
              Importar Imagen
              <input type="file" accept="image/*" onChange={onPickImage} hidden />
            </label>
            <button type="button" className="ghost" onClick={() => onLink("general", form)}>
              Expediente General
            </button>
            <button type="button" className="ghost" onClick={() => onLink("care", form)}>
              Cuidados en Casa
            </button>
          </div>

          <div className="footer">
            <button type="button" className="secondary" onClick={handleClose}>Cancelar</button>
            <button type="submit" className="primary">{form.id ? "Actualizar" : "Guardar"}</button>
          </div>
        </form>
      </div>

      {viewer && (
        <div className="img-overlay" onMouseDown={(e) => e.target.classList.contains("img-overlay") && setViewer(null)}>
          <div className="img-viewer" onMouseDown={(e) => e.stopPropagation()}>
            <img src={viewer} />
            <button className="img-close" onClick={() => setViewer(null)}>
              <X size={20} />
            </button>
          </div>
        </div>
      )}

      {notif && (
        <div className={`notif ${notif.type}`}>
          {notif.type === "success" && <CheckCircle2 size={22} />}
          {notif.type === "delete" && <AlertTriangle size={22} />}
          <span>{notif.text}</span>
        </div>
      )}

      {confirmModal && (
        <div className="delete-overlay" onMouseDown={(e) => e.target.classList.contains("delete-overlay") && setConfirmModal(null)}>
          <div className="delete-modal" onMouseDown={(e) => e.stopPropagation()}>
            <AlertTriangle size={40} color="#ef4444" />
            <h3>¿Eliminar esta imagen?</h3>
            <p>Esta acción no se puede deshacer.</p>
            <div className="confirm-btns">
              <button className="btn-yes" onClick={confirmRemoveImage}>Sí, eliminar</button>
              <button className="btn-no" onClick={() => setConfirmModal(null)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
