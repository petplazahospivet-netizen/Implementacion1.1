// src/components/Dueños.js
import React, { useMemo, useState, useEffect } from "react";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  User as UserIcon,
  Mail,
  Phone,
  Home,
  IdCard,
  X as XIcon,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import "react-phone-input-2/lib/style.css";
import PhoneInput from "react-phone-input-2";
import "../CSS/Duenos.css";
import {
  getOwners,
  createOwner,
  updateOwner,
  deleteOwner,
} from "../apis/ownersApi";

const NAME_REGEX = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ\s.'’-]{1,120}$/;

const Dueños = ({ user }) => {
  const [owners, setOwners] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [showModal, setShowModal] = useState(false);
  const [closingModal, setClosingModal] = useState(false);
  const [editingOwner, setEditingOwner] = useState(null);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [closingDeleteModal, setClosingDeleteModal] = useState(false);
  const [ownerToDelete, setOwnerToDelete] = useState(null);

  const [errorModal, setErrorModal] = useState({ show: false, message: "" });

  // Toast moderno (arriba derecha)
  const [toast, setToast] = useState({
    show: false,
    type: "success",
    message: "",
  });

  // ====== Form ======
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    dni: "",
    address: "",
  });

  // Teléfono controlado por partes
  const [phoneDial, setPhoneDial] = useState("504"); // código país sin +
  const [phoneLocal, setPhoneLocal] = useState(""); // solo dígitos locales (sin espacios, sin guiones)
  const [phoneCountryCode, setPhoneCountryCode] = useState("hn"); // 'hn', 'us', etc.

  const [errorsForm, setErrorsForm] = useState({
    full_name: "",
    phone: "",
    email: "",
    dni: "",
    address: "",
  });

  // ======================= Fetch Owners =======================
  useEffect(() => {
    const fetchOwners = async () => {
      try {
        setLoading(true);
        const data = await getOwners(searchTerm);
        setOwners(data);
        setError(null);
      } catch (err) {
        setError(err.message || "Error al cargar dueños");
      } finally {
        setLoading(false);
      }
    };
    fetchOwners();
  }, [searchTerm]);

  // ======================= Utilidades =======================
  const initialsOf = (name) =>
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() || "")
      .join("");

  const onlyDigits = (s) => (s ? s.replace(/\D/g, "") : "");

  // Honduras => XXXX-XXXX; otros => espacios cada 3/4 (lo deja la lib)
  const formatLocalForDisplay = (localDigits, countryCode) => {
    if (countryCode === "hn") {
      const d = (localDigits || "").slice(0, 8);
      return d.length > 4 ? `${d.slice(0, 4)}-${d.slice(4)}` : d;
    }
    return localDigits; // la lib lo presentará con espacios
  };

  const composePhoneForPayload = (dial, local, countryCode) => {
    if (!dial) return "";
    const prettyLocal = formatLocalForDisplay(local, countryCode);
    return prettyLocal ? `+${dial} ${prettyLocal}` : `+${dial}`;
  };

  // ======================= Abrir / Cerrar Modal =======================
  const openCreate = () => {
    setEditingOwner(null);
    setFormData({ full_name: "", email: "", dni: "", address: "" });
    setPhoneDial("504");
    setPhoneLocal(""); // vacío: usuario escribe 8 dígitos
    setPhoneCountryCode("hn");
    setErrorsForm({
      full_name: "",
      phone: "",
      email: "",
      dni: "",
      address: "",
    });
    setShowModal(true);
    setClosingModal(false);
  };

  const openEdit = (owner) => {
    // extraer dial/local del valor guardado (p.ej. "+504 9734-5678")
    const raw = (owner.phone || "").trim();
    const dialMatch = raw.match(/^\+?(\d{1,4})/);
    const dial = dialMatch ? dialMatch[1] : "504";
    // quedarnos con dígitos locales del resto
    const local = onlyDigits(raw.replace(/^\+?\d{1,4}/, ""));

    setEditingOwner(owner);
    setFormData({
      full_name: owner.full_name || "",
      email: owner.email || "",
      dni: owner.dni || "",
      address: owner.address || "",
    });

    setPhoneDial(dial);
    setPhoneLocal(local);
    setPhoneCountryCode("hn"); // si quieres detectar el país real, necesitarías mapear dial->ISO
    setErrorsForm({
      full_name: "",
      phone: "",
      email: "",
      dni: "",
      address: "",
    });
    setShowModal(true);
    setClosingModal(false);
  };

  const closeModal = () => {
    setClosingModal(true);
    setTimeout(() => {
      setShowModal(false);
      setEditingOwner(null);
      setClosingModal(false);
    }, 250);
  };

  // ======================= Validaciones =======================
  const validateName = (value) => {
    if (!value || !value.trim()) return "El nombre es obligatorio.";
    if (!NAME_REGEX.test(value.trim()))
      return "El nombre solo puede contener letras y algunos signos.";
    return "";
  };

  const validatePhone = (dial, local, ccode) => {
    if (!dial || !local) return "El teléfono es obligatorio.";
    if (ccode === "hn" && local.length !== 8)
      return "El número hondureño debe tener 8 dígitos.";
    if (local.length < 6) return "Número telefónico incompleto.";
    return "";
  };

  const validateEmail = (value) => {
    if (!value) return "";
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!re.test(value)) return "Correo inválido.";
    const exists = owners.some(
      (o) =>
        o.email &&
        o.email.toLowerCase() === value.toLowerCase() &&
        o._id !== editingOwner?._id
    );
    if (exists) return "Este correo ya está registrado.";
    return "";
  };

  const validateDNI = (value) => {
    if (!value || !value.trim()) return "El DNI es obligatorio.";
    const norm = onlyDigits(value);
    const exists = owners.some(
      (o) => onlyDigits(o.dni) === norm && o._id !== editingOwner?._id
    );
    if (exists) return "Este DNI ya está registrado.";
    return "";
  };

  const validateAddress = (value) =>
    !value || !value.trim() ? "La dirección es obligatoria." : "";

  // ======================= Inputs de texto =======================
  const onChangeField = (field, value) => {
    if (field === "email") {
      setFormData((p) => ({ ...p, email: value }));
      setErrorsForm((p) => ({ ...p, email: validateEmail(value) }));
    } else if (field === "dni") {
      const digits = onlyDigits(value).slice(0, 13);
      let formatted = digits;
      if (digits.length > 8)
        formatted = `${digits.slice(0, 4)}-${digits.slice(4, 8)}-${digits.slice(
          8
        )}`;
      else if (digits.length > 4)
        formatted = `${digits.slice(0, 4)}-${digits.slice(4)}`;
      setFormData((p) => ({ ...p, dni: formatted }));
      setErrorsForm((p) => ({ ...p, dni: validateDNI(formatted) }));
    } else if (field === "full_name") {
      setFormData((p) => ({ ...p, full_name: value }));
      setErrorsForm((p) => ({ ...p, full_name: validateName(value) }));
    } else if (field === "address") {
      setFormData((p) => ({ ...p, address: value }));
      setErrorsForm((p) => ({ ...p, address: validateAddress(value) }));
    }
  };

  // ======================= Guardar =======================
  const handleSubmit = async (e) => {
    e.preventDefault();

    const vName = validateName(formData.full_name);
    const vPhone = validatePhone(phoneDial, phoneLocal, phoneCountryCode);
    const vEmail = validateEmail(formData.email);
    const vDni = validateDNI(formData.dni);
    const vAddress = validateAddress(formData.address);

    setErrorsForm({
      full_name: vName,
      phone: vPhone,
      email: vEmail,
      dni: vDni,
      address: vAddress,
    });

    if (vName || vPhone || vEmail || vDni || vAddress) return;

    const payload = {
      full_name: formData.full_name.trim(),
      phone: composePhoneForPayload(phoneDial, phoneLocal, phoneCountryCode), // 👉 "+504 9734-5678"
      email: formData.email.trim() || null,
      dni: formData.dni.trim(),
      address: formData.address.trim(),
    };

    try {
      if (editingOwner) {
        const updated = await updateOwner(editingOwner._id, payload);
        const newOwner = updated?.owner || updated;
        setOwners((prev) =>
          prev.map((o) => (o._id === editingOwner._id ? newOwner : o))
        );
        closeModal();
        showToast("success", "Dueño actualizado correctamente.");
      } else {
        const created = await createOwner(payload);
        const newOwner = created?.owner || created;
        setOwners((prev) => [...prev, newOwner]);
        closeModal();
        showToast("success", "Dueño creado correctamente.");
      }
    } catch (err) {
      setErrorModal({
        show: true,
        message: err.message || "Error al guardar dueño.",
      });
    }
  };
  // ======================= Eliminar =======================
  const confirmDelete = (owner) => {
    setOwnerToDelete(owner);
    setShowDeleteModal(true);
    setClosingDeleteModal(false);
  };

  const handleDeleteConfirmed = async () => {
    try {
      await deleteOwner(ownerToDelete._id);
      setOwners((prev) => prev.filter((o) => o._id !== ownerToDelete._id));
      closeDeleteModal();
      showToast("success", "Dueño eliminado correctamente.");
    } catch (err) {
      setErrorModal({
        show: true,
        message: err.message || "Error al eliminar.",
      });
    }
  };

  const closeDeleteModal = () => {
    setClosingDeleteModal(true);
    setTimeout(() => {
      setShowDeleteModal(false);
      setOwnerToDelete(null);
      setClosingDeleteModal(false);
    }, 250);
  };

  // ======================= Filtro =======================
  const filteredOwners = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return owners;
    return owners.filter((o) =>
      [o.full_name, o.phone, o.email, o.dni, o.address]
        .filter(Boolean)
        .some((f) => f.toLowerCase().includes(q))
    );
  }, [owners, searchTerm]);

  // ======================= Toast =======================
  const showToast = (type, message) => {
    setToast({ show: true, type, message });
    setTimeout(() => setToast((t) => ({ ...t, show: false })), 3000);
  };

  /* ==========================================================
     🚀 RENDER PRINCIPAL DEL COMPONENTE
  ========================================================== */
  if (
    !user ||
    (user.role !== "admin" &&
      user.role !== "veterinario" &&
      user.role !== "recepcion")
  ) {
    return (
      <div className="owners-no-permissions">
        🚫 No tienes permisos para ver la Gestión de Dueños.
      </div>
    );
  }

  // ======================= Render =======================
  return (
    <div className="owners-container">
      {/* Header */}
      <div className="owners-header">
        <div>
          <h1 className="owners-title">
            <UserIcon size={20} /> Dueños de Mascotas
          </h1>
          <p className="owners-subtitle">Gestión de propietarios registrados</p>
        </div>
        <button className="btn-primary" onClick={openCreate}>
          <Plus size={18} /> Nuevo Dueño
        </button>
      </div>

      {/* Buscador */}
      <div className="search-box">
        <Search className="search-icon" aria-hidden />
        <input
          type="text"
          placeholder="Buscar por nombre, teléfono, email, DNI o dirección…"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          aria-label="Buscar dueños"
        />
      </div>

      {/* ======================= TABLA + TARJETAS RESPONSIVAS ======================= */}
      <div className="owners-display">
        {loading ? (
          <p className="empty-state">Cargando dueños...</p>
        ) : error ? (
          <p className="empty-state">❌ {error}</p>
        ) : filteredOwners.length ? (
          <>
            {/* 💻 MODO TABLA (pantallas grandes) */}
            <div className="table-wrapper desktop-view">
              <table className="owners-table">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Teléfono</th>
                    <th>Correo Electrónico</th>
                    <th>DNI</th>
                    <th>Dirección</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOwners.map((o) => (
                    <tr key={o._id}>
                      <td data-label="Nombre">
                        <div className="owner-info">
                          <div className="owner-avatar">
                            {initialsOf(o.full_name)}
                          </div>
                          <span>{o.full_name}</span>
                        </div>
                      </td>
                      <td className="cell-with-icon" data-label="Teléfono">
                        <Phone size={16} /> {o.phone}
                      </td>
                      <td
                        className="cell-with-icon"
                        data-label="Correo Electrónico"
                      >
                        <Mail size={16} /> {o.email || "—"}
                      </td>
                      <td className="cell-with-icon" data-label="DNI">
                        <IdCard size={16} /> {o.dni}
                      </td>
                      <td className="cell-with-icon" data-label="Dirección">
                        <Home size={16} /> {o.address}
                      </td>
                      <td data-label="Acciones">
                        <div className="action-buttons">
                          <button
                            className="action-btn edit"
                            onClick={() => openEdit(o)}
                            title="Editar"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            className="action-btn delete"
                            onClick={() => confirmDelete(o)}
                            title="Eliminar"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 📱 MODO TARJETAS (solo visible en móviles) */}
            <div className="mobile-view owners-cards">
              {filteredOwners.map((o) => (
                <div className="owner-card" key={o._id}>
                  <div className="owner-card-header">
                    <div className="owner-avatar">
                      {initialsOf(o.full_name)}
                    </div>
                    <div className="owner-name">{o.full_name}</div>
                  </div>

                  <div className="owner-details">
                    <div className="detail-item">
                      <span className="detail-label">Teléfono:</span>
                      <span className="detail-value">
                        <Phone size={15} /> {o.phone}
                      </span>
                    </div>

                    <div className="detail-item">
                      <span className="detail-label">Correo:</span>
                      <span className="detail-value">
                        <Mail size={15} /> {o.email || "—"}
                      </span>
                    </div>

                    <div className="detail-item">
                      <span className="detail-label">DNI:</span>
                      <span className="detail-value">
                        <IdCard size={15} /> {o.dni}
                      </span>
                    </div>

                    <div className="detail-item">
                      <span className="detail-label">Dirección:</span>
                      <span className="detail-value">
                        <Home size={15} /> {o.address}
                      </span>
                    </div>
                  </div>
                  
                  <div className="owner-actions">
                    <button
                      className="action-btn edit"
                      onClick={() => openEdit(o)}
                      title="Editar"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      className="action-btn delete"
                      onClick={() => confirmDelete(o)}
                      title="Eliminar"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="empty-state">
            No se encontraron dueños con ese criterio.
          </p>
        )}
      </div>

      {/* ======================= Modal Crear/Editar ======================= */}
      {showModal && (
        <div
          className={`modal-overlay ${closingModal ? "closing" : "active"}`}
          role="dialog"
          aria-modal="true"
        >
          <div
            className={`modal ${closingModal ? "closing" : "active"}`}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="close-btn"
              aria-label="Cerrar"
              onClick={closeModal}
              title="Cerrar"
            >
              <XIcon size={16} />
            </button>

            <h2>{editingOwner ? "Editar Dueño" : "Nuevo Dueño"}</h2>

            <form onSubmit={handleSubmit}>
              {/* Nombre */}
              <label>
                Nombre Completo
                <input
                  type="text"
                  placeholder="Ej. Juan Pérez"
                  value={formData.full_name}
                  onChange={(e) => onChangeField("full_name", e.target.value)}
                  className={errorsForm.full_name ? "error" : ""}
                  required
                />
                {errorsForm.full_name && (
                  <small className="error-text">{errorsForm.full_name}</small>
                )}
              </label>

              {/* Teléfono */}
              <label>
                Teléfono
                <PhoneInput
                  country="hn"
                  // valor controlado: DIAL + LOCAL (solo dígitos)
                  value={`${phoneDial}${phoneLocal}`}
                  onChange={(val, countryData) => {
                    const dial = countryData?.dialCode || phoneDial || "504";
                    const allDigits = onlyDigits(val);
                    // extraer local del string que entrega el componente
                    let local = allDigits.startsWith(dial)
                      ? allDigits.slice(dial.length)
                      : allDigits;

                    // Limitar por país
                    if (countryData?.countryCode === "hn") {
                      local = onlyDigits(local).slice(0, 8);
                    } else {
                      local = onlyDigits(local).slice(0, 14); // genérico
                    }

                    setPhoneDial(dial);
                    setPhoneLocal(local);
                    setPhoneCountryCode(countryData?.countryCode || "hn");

                    // Validación en caliente
                    setErrorsForm((p) => ({
                      ...p,
                      phone: validatePhone(
                        dial,
                        local,
                        countryData?.countryCode || "hn"
                      ),
                    }));
                  }}
                  // 👉 máscara para Honduras: XXXX-XXXX
                  masks={{ hn: "....-...." }}
                  alwaysDefaultMask={false}
                  enableSearch
                  disableDropdown={false}
                  countryCodeEditable={false}
                  inputProps={{ required: true }}
                  specialLabel=""
                  inputStyle={{
                    width: "100%",
                    height: 40,
                    fontSize: 15,
                    paddingLeft: 48,
                  }}
                />
                {/* Nota: el componente renderiza con el formato de mask + código visible.
                    Como limitamos phoneLocal a 8 para HN, NO podrás escribir más de 8. */}
                {errorsForm.phone && (
                  <small className="error-text">{errorsForm.phone}</small>
                )}
              </label>

              {/* Correo */}
              <label>
                Correo electrónico (opcional)
                <input
                  type="email"
                  placeholder="correo@dominio.com"
                  value={formData.email}
                  onChange={(e) => onChangeField("email", e.target.value)}
                  className={errorsForm.email ? "error" : ""}
                />
                {errorsForm.email && (
                  <small className="error-text">{errorsForm.email}</small>
                )}
                <div
                  style={{
                    fontSize: "0.75rem",
                    color: "#6b7280",
                    marginTop: 6,
                  }}
                >
                  Nota: se aceptan mayúsculas, se guardará tal como se escribe.
                </div>
              </label>

              {/* DNI */}
              <label>
                DNI
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="0801-1990-12345"
                  value={formData.dni}
                  onChange={(e) => onChangeField("dni", e.target.value)}
                  maxLength={15}
                  className={errorsForm.dni ? "error" : ""}
                  required
                />
                {errorsForm.dni && (
                  <small className="error-text">{errorsForm.dni}</small>
                )}
              </label>

              {/* Dirección */}
              <label>
                Dirección
                <textarea
                  placeholder="Colonia Palmira, Tegucigalpa"
                  value={formData.address}
                  onChange={(e) => onChangeField("address", e.target.value)}
                  rows={3}
                  className={errorsForm.address ? "error" : ""}
                  required
                />
                {errorsForm.address && (
                  <small className="error-text">{errorsForm.address}</small>
                )}
              </label>

              <div
                className="modal-actions"
                style={{ justifyContent: "center" }}
              >
                <button
                  type="button"
                  className="btn-secondary cancel"
                  onClick={closeModal}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn-primary">
                  {editingOwner ? "Actualizar" : "Guardar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal eliminar */}
      {showDeleteModal && (
        <div
          className={`modal-overlay ${
            closingDeleteModal ? "closing" : "active"
          }`}
          role="dialog"
          aria-modal="true"
        >
          <div
            className={`modal delete-modal ${
              closingDeleteModal ? "closing" : "active"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <h2>¿Eliminar dueño?</h2>
            <p>
              ¿Estás seguro de que deseas eliminar a{" "}
              <strong>{ownerToDelete?.full_name}</strong>? Esta acción no se
              puede deshacer.
            </p>
            <div className="modal-actions" style={{ justifyContent: "center" }}>
              <button className="btn-danger" onClick={handleDeleteConfirmed}>
                Sí, eliminar
              </button>
              <button className="btn-cancel-alt" onClick={closeDeleteModal}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de error */}
      {errorModal.show && (
        <div className="modal-overlay active" role="dialog" aria-modal="true">
          <div className="modal delete-modal active">
            <h2>Error</h2>
            <p>{errorModal.message}</p>
            <div className="modal-actions" style={{ justifyContent: "center" }}>
              <button
                className="btn-danger"
                onClick={() => setErrorModal({ show: false, message: "" })}
              >
                Aceptar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast.show && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: "fixed",
            right: 20,
            top: 20,
            zIndex: 9999,
            background: toast.type === "success" ? "#00a884e6" : "#1f2937e6",
            color: "#fff",
            padding: "12px 18px",
            borderRadius: 10,
            boxShadow: "0 8px 20px rgba(0,0,0,0.25)",
            display: "flex",
            alignItems: "center",
            gap: 10,
            minWidth: 230,
            animation: "slideIn 0.4s ease",
          }}
        >
          {toast.type === "success" ? (
            <CheckCircle size={18} />
          ) : (
            <AlertCircle size={18} />
          )}
          <div style={{ fontSize: 14 }}>{toast.message}</div>
        </div>
      )}

      <style>
        {`
          .error-text { color: #dc2626 !important; margin-top: 4px; display: block; }
          @keyframes slideIn { from { opacity:0; transform: translateY(-10px);} to { opacity:1; transform: translateY(0);} }
        `}
      </style>
    </div>
  );
};

export default Dueños;
