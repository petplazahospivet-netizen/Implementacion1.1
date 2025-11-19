// src/components/Users.js
import React, { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  User,
  Mail,
  Shield,
  Eye,
  EyeOff,
  Users as UsersIcon,
  CheckCircle,
  XCircle,
  MoreVertical,
  CheckSquare, // Añadido para Activar/Desactivar
  XSquare, // Añadido para Inactivar
  UserX, // Añadido para Bloquear
} from "lucide-react";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";
import "../CSS/Users.css";
import {
  getUsers,
  createUser,
  updateUser,
  deleteUser,
  toggleUserStatus, // (id, nextStatus) => { is_active, status }
  resetPassword,
} from "../apis/usersApi";

// Íconos locales (tarjetas)
import EscudoIcon from "../assets/icons/escudo-de-seguridad.png";
import EstetoscopioIcon from "../assets/icons/estetoscopio.png";
import QuimicoIcon from "../assets/icons/quimico.png";
import InventarioIcon from "../assets/icons/inventario.png";
import RecepcionIcon from "../assets/icons/recepcionista.png";

const PASSWORD_RULE =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[ !"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~]).{8,}$/;
// Solo letras (incluye acentos) y espacios
const NAME_RULE = /^[A-Za-zÁÉÍÓÚáéíóúÑñ\s]+$/;

/* ========= Helpers de teléfono ============ */
const digitsOnly = (s) => (s || "").replace(/\D/g, "");

/** Formato visual Honduras: +504 8858-6201 (mientras escribe) */
const formatHNDisplay = (raw) => {
  const d = digitsOnly(raw);
  // Forzamos que empiece con 504 y tomamos solo 8 dígitos locales
  const rest = d.startsWith("504") ? d.slice(3, 11) : d.slice(0, 8);
  const first4 = rest.slice(0, 4);
  const last4 = rest.slice(4, 8);
  if (!first4) return "+504 ";
  return last4 ? `+504 ${first4}-${last4}` : `+504 ${first4}`;
};

/** VISTA en tabla: si es Honduras -> +504 ####-####; si no, lo devolvemos tal cual con + */
const formatForView = (val) => {
  const d = digitsOnly(val);
  if (!d) return "";
  if (d.startsWith("504") && (d.length === 11 || d.length === 8)) {
    // 504 + 8 o solo 8
    const local = d.length === 11 ? d.slice(3) : d;
    const first4 = local.slice(0, 4);
    const last4 = local.slice(4, 8);
    if (!first4) return "+504 ";
    return last4 ? `+504 ${first4}-${last4}` : `+504 ${first4}`;
  }
  // Otros países: nos aseguramos que empiece con +
  return val?.trim()?.startsWith("+") ? val : `+${d}`;
};

/** Normaliza para guardar: E.164 (ej: +50488586201) */
const toE164 = (display) => {
  const d = digitsOnly(display);
  if (!d) return "";
  if (d.startsWith("504")) {
    const local8 = d.slice(3, 11);
    if (local8.length < 8) return ""; // incompleto
    return `+504${local8}`;
  }
  // Si el texto original ya tenía +, respetamos el país; de lo contrario solo anteponemos +
  return `+${d}`;
};

/* ====== Mapeo para textos de estado ======= */
const ACTION_TEXT = {
  active: { ask: "Activar", yes: "Sí, Activar", no: "No Activar" },
  inactive: { ask: "Desactivar", yes: "Sí, Desactivar", no: "No Desactivar" },
  blocked: { ask: "Bloquear", yes: "Sí, Bloquear", no: "No Bloquear" },
};

const Users = ({ user }) => {
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showPassword2, setShowPassword2] = useState(false);
  const [toast, setToast] = useState(null);

  // Confirmación para eliminar
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isClosingConfirm, setIsClosingConfirm] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);

  // Confirmación para cambiar estado
  const [confirmStatus, setConfirmStatus] = useState({
    open: false,
    action: null, // "active" | "inactive" | "blocked"
    user: null, // objeto usuario
  });

  const [previewRole, setPreviewRole] = useState(null);

  // Para el menú de estado por fila
  const [openStatusMenuId, setOpenStatusMenuId] = useState(null);

  // Confirmación de contraseña (solo para crear)
  const [confirmPassword, setConfirmPassword] = useState("");

  // ====== FORM DATA ======
  const [formData, setFormData] = useState({
    username: "",
    nombres: "",
    apellidos: "",
    full_name: "",
    email: "",
    role: "",
    password: "",
    phones: [{ value: "" }], // guardamos visual (e.g. "+504 8858-6201" o "+1 415 555 1234")
    status: "active", // active | inactive | blocked
  });

  // Errores de validación del form
  const [errors, setErrors] = useState({});

  const roles = [
    {
      value: "admin",
      label: "Administradores",
      color: "#ef4444",
      icon: EscudoIcon,
    },
    {
      value: "veterinario",
      label: "Doctores",
      color: "#3b82f6",
      icon: EstetoscopioIcon,
    },
    {
      value: "laboratorio",
      label: "Laboratorio",
      color: "#8b5cf6",
      icon: QuimicoIcon,
    },
    {
      value: "farmacia",
      label: "Personal de Inventario",
      color: "#10b981",
      icon: InventarioIcon,
    },
    {
      value: "recepcion",
      label: "Recepción",
      color: "#f97316",
      icon: RecepcionIcon,
    },
  ];

  // === TOAST ===
  const showToast = useCallback((message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  // === CARGAR USUARIOS ===
  const loadUsers = useCallback(async () => {
    try {
      const data = await getUsers();
      setUsers(data);
    } catch (err) {
      console.error("Error cargando usuarios:", err);
      showToast("Error al cargar usuarios", "error");
    }
  }, [showToast]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // ====== HELPERS ======
  const statusToPill = (s) => {
    switch (s) {
      case "active":
        return { text: "Activo", cls: "active" };
      case "inactive":
        return { text: "Inactivo", cls: "inactive" };
      case "blocked":
        return { text: "Bloqueado", cls: "blocked" };
      default:
        return { text: "Desconocido", cls: "inactive" };
    }
  };

  const computeFullName = (nombres, apellidos) =>
    [nombres?.trim(), apellidos?.trim()].filter(Boolean).join(" ");

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;

  // ====== VALIDACIONES ======
  const validateForm = (isEditing = false) => {
    const newErrors = {};

    const username = formData.username?.trim();
    const nombres = formData.nombres?.trim();
    const apellidos = formData.apellidos?.trim();
    const full_name = computeFullName(nombres, apellidos);
    const email = formData.email?.trim();
    const role = formData.role;
    const password = formData.password;
    const phoneValues = formData.phones
      .map((p) => p.value?.trim())
      .filter(Boolean);

    // Campos obligatorios
    if (!username) newErrors.username = "El nombre de usuario es requerido.";
    if (!nombres) newErrors.nombres = "Los nombres son requeridos.";
    else if (!NAME_RULE.test(nombres))
      newErrors.nombres = "Solo letras, espacios y tildes son permitidos.";
    if (!apellidos) newErrors.apellidos = "Los apellidos son requeridos.";
    else if (!NAME_RULE.test(apellidos))
      newErrors.apellidos = "Solo letras, espacios y tildes son permitidos.";
    if (!email) newErrors.email = "El correo es requerido.";
    if (email && !emailRegex.test(email)) newErrors.email = "Correo no válido.";
    if (!role) newErrors.role = "El rol es requerido.";

    // Teléfonos (al menos 1 válido)
    if (phoneValues.length === 0) {
      newErrors.phones = "Agrega al menos un teléfono.";
    } else {
      const invalidPhone = phoneValues.some((p) => {
        const d = digitsOnly(p);
        if (!d) return true;

        // Regla específica Honduras: 504 + 8
        if (p.includes("+504") || d.startsWith("504")) {
          return d.length !== 11; // 504 + 8
        }

        // Resto de países: aceptamos >= 10 dígitos (E.164 comunes)
        return d.length < 10;
      });
      if (invalidPhone) newErrors.phones = "Teléfono(s) inválido(s).";
    }

    // Contraseña (solo exigir en crear o si se modificará)
    if (!isEditing || (isEditing && password?.trim() !== "")) {
      if (!PASSWORD_RULE.test(password || "")) {
        newErrors.password =
          "Mín. 8 caracteres, incluye mayúscula, minúscula, número y símbolo.";
      }
      // Confirmación solo cuando se crea
      if (!isEditing && password !== confirmPassword) {
        newErrors.confirmPassword = "Las contraseñas no coinciden.";
      }
    }

    // Duplicados
    const normalizedFull = full_name.toLowerCase();
    const normalizedUser = (username || "").toLowerCase();
    const normalizedMail = (email || "").toLowerCase();
    const isDuplicate = users.some((u) => {
      const uUser = (u.username || "").toLowerCase();
      const uMail = (u.email || "").toLowerCase();
      const uFull = (u.full_name || "").toLowerCase();
      if (editingUser && u._id === editingUser._id) return false;
      return (
        uUser === normalizedUser ||
        uMail === normalizedMail ||
        uFull === normalizedFull
      );
    });
    if (isDuplicate) {
      newErrors.duplicates =
        "Ya existe un usuario con ese nombre, correo o nombre completo.";
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      showToast("Revisa los campos marcados.", "error");
    }
    return Object.keys(newErrors).length === 0;
  };

  // ====== SUBMIT ======
  const handleSubmit = async (e) => {
    e.preventDefault();
    const isEditing = !!editingUser;

    if (!validateForm(isEditing)) return;

    try {
      const payload = {
        username: formData.username.trim(),
        full_name: computeFullName(formData.nombres, formData.apellidos),
        nombres: formData.nombres.trim(),
        apellidos: formData.apellidos.trim(),
        email: formData.email.trim(),
        role: formData.role,
        // Normalizamos a E.164 para guardar (sirve para login por teléfono)
        phones: formData.phones.map((p) => toE164(p.value)).filter(Boolean),
        status: formData.status,
      };

      if (isEditing) {
        if (formData.password && formData.password.trim() !== "") {
          await resetPassword(editingUser._id, formData.password);
          showToast("Contraseña actualizada correctamente ✅", "success");
        }
        await updateUser(editingUser._id, payload);
        showToast("Usuario actualizado correctamente ✅", "success");
      } else {
        await createUser({ ...payload, password: formData.password });
        showToast("Usuario creado exitosamente ✅", "success");
      }

      handleCloseModal();
      loadUsers();
    } catch (err) {
      console.error("Error guardando usuario:", err);
      showToast("Error al guardar usuario ❌", "error");
    }
  };

  // === EDITAR ===
  const handleEdit = (userToEdit) => {
    setEditingUser(userToEdit);
    setConfirmPassword("");

    const [firstPart = "", ...rest] = (userToEdit.full_name || "").split(" ");
    const guessedNombres =
      userToEdit.nombres ||
      (rest.length ? [firstPart, rest[0]].join(" ") : firstPart);
    const guessedApellidos =
      userToEdit.apellidos || (rest.length > 1 ? rest.slice(1).join(" ") : "");

    setFormData({
      username: userToEdit.username || "",
      nombres: userToEdit.nombres || guessedNombres || "",
      apellidos: userToEdit.apellidos || guessedApellidos || "",
      full_name: userToEdit.full_name || "",
      email: userToEdit.email || "",
      role: userToEdit.role || "",
      password: "",
      phones: (userToEdit.phones && userToEdit.phones.length
        ? userToEdit.phones.map((p) => {
            // p puede venir en E.164; si es Honduras lo mostramos con guion
            const d = digitsOnly(p);
            if (d.startsWith("504")) return { value: formatHNDisplay(p) };
            // resto países: mostramos como +XXXXXXXX...
            const shown = p?.startsWith("+") ? p : `+${d}`;
            return { value: shown };
          })
        : [{ value: "" }]) || [{ value: "" }],
      status:
        userToEdit.status || (userToEdit.is_active ? "active" : "inactive"),
    });
    setErrors({});
    setShowModal(true);
  };

  // === ELIMINAR ===
  const handleDeleteClick = (user) => {
    setUserToDelete(user);
    setShowConfirmModal(true);
  };

  const confirmDelete = async () => {
    try {
      await deleteUser(userToDelete._id);
      closeConfirmModal();
      showToast("Usuario eliminado correctamente ✅", "success");
      loadUsers();
    } catch (err) {
      console.error("Error eliminando usuario:", err);
      showToast("Error al eliminar usuario ❌", "error");
    }
  };

  const closeConfirmModal = () => {
    setIsClosingConfirm(true);
    setTimeout(() => {
      setShowConfirmModal(false);
      setIsClosingConfirm(false);
      setUserToDelete(null);
    }, 300);
  };

  // === CAMBIAR ESTADO (con confirmación) ===
  const openStatusConfirm = (user, action) => {
    setConfirmStatus({ open: true, action, user });
    setOpenStatusMenuId(null); // Cierra el menú desplegable al abrir el modal de confirmación
  };

  const cancelStatusConfirm = () =>
    setConfirmStatus({ open: false, action: null, user: null });

  const confirmStatusChange = async () => {
    const { user, action } = confirmStatus;
    if (!user || !action) return;
    try {
      const updated = await toggleUserStatus(user._id, action);
      const inferredStatus =
        updated?.status ||
        (updated?.is_active === false
          ? "inactive"
          : updated?.is_active
          ? "active"
          : "blocked");

      setUsers((prev) =>
        prev.map((u) =>
          u._id === user._id
            ? {
                ...u,
                status: inferredStatus,
                is_active: inferredStatus === "active",
              }
            : u
        )
      );

      const txt =
        inferredStatus === "active"
          ? "Activado"
          : inferredStatus === "inactive"
          ? "Desactivado"
          : "Bloqueado";
      showToast(`Usuario ${txt} correctamente ✅`, "success");
    } catch (err) {
      console.error("Error cambiando estado:", err);
      showToast("Error al cambiar estado ❌", "error");
    } finally {
      cancelStatusConfirm();
    }
  };

  // === CERRAR MODAL ===
  const handleCloseModal = () => {
    setIsClosing(true);
    setTimeout(() => {
      setShowModal(false);
      setIsClosing(false);
      setEditingUser(null);
      setFormData({
        username: "",
        nombres: "",
        apellidos: "",
        full_name: "",
        email: "",
        role: "",
        password: "",
        phones: [{ value: "" }],
        status: "active",
      });
      setConfirmPassword("");
      setErrors({});
      setShowPassword(false);
      setShowPassword2(false);
    }, 300);
  };

  // === FILTRO ===
  const filteredUsers = users.filter((u) => {
    const st = searchTerm.toLowerCase();
    return (
      u.username?.toLowerCase().includes(st) ||
      u.full_name?.toLowerCase().includes(st) ||
      u.email?.toLowerCase().includes(st) ||
      u.role?.toLowerCase().includes(st)
    );
  });

  const getRoleStyle = (role) => {
    const foundRole = roles.find((r) => r.value === role);
    return foundRole
      ? { backgroundColor: `${foundRole.color}20`, color: foundRole.color }
      : {};
  };

  // === Handlers de teléfonos ===
  const addPhone = () =>
    setFormData((p) => ({ ...p, phones: [...p.phones, { value: "" }] }));
  const removePhone = (idx) =>
    setFormData((p) => ({
      ...p,
      phones: p.phones.filter((_, i) => i !== idx),
    }));
  const updatePhone = (idx, _value, country, formattedValue) => {
    // _value: string numérica sin + (lib)
    // formattedValue: con + y espacios (lib)
    // country: info del país seleccionado
    const isHN = country?.countryCode === "hn" || country?.dialCode === "504";
    const incoming = formattedValue || _value || "";

    const display = isHN
      ? formatHNDisplay(incoming)
      : incoming?.trim()?.startsWith("+")
      ? incoming
      : `+${digitsOnly(incoming)}`;

    setFormData((p) => {
      const next = [...p.phones];
      next[idx] = { value: display };
      return { ...p, phones: next };
    });
  };

  // Sincroniza full_name cuando cambian nombres/apellidos
  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      full_name: computeFullName(prev.nombres, prev.apellidos),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.nombres, formData.apellidos]);

  /* ==========================================================
   🚀 RENDER PRINCIPAL DEL COMPONENTE
========================================================== */
  if (!user || user.role !== "admin") {
    return (
      <div className="users-no-permissions">
        🚫 No tienes permisos para ver la gestión de usuarios.
      </div>
    );
  }

  return (
    <div className="users-container">
      {/* Toast */}
      {toast && (
        <div className={`toast ${toast.type}`}>
          {toast.type === "success" ? (
            <CheckCircle size={18} />
          ) : (
            <XCircle size={18} />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="users-header">
        <div>
          <h1 className="users-title">
            <UsersIcon size={22} /> Gestión de Usuarios
          </h1>
          <p className="users-subtitle">
            Administrar roles y permisos del personal
          </p>
        </div>
        <button
          className="btn-primary"
          onClick={() => {
            // ✅ Limpiamos el formulario y abrimos el modal sin llamar handleCloseModal()
            setEditingUser(null);
            setFormData({
              username: "",
              nombres: "",
              apellidos: "",
              full_name: "",
              email: "",
              role: "",
              password: "",
              phones: [{ value: "" }],
              status: "active",
            });
            setConfirmPassword("");
            setErrors({});
            setShowPassword(false);
            setShowPassword2(false);
            setShowModal(true);
          }}
        >
          <Plus size={18} /> Nuevo Usuario
        </button>
      </div>

      {/* Tarjetas estadísticas */}
      <div className="stats-grid">
        {roles.map((r) => (
          <div
            className="stats-card"
            key={r.value}
            onClick={() => setPreviewRole(r)}
            style={{ cursor: "pointer" }}
          >
            <div
              className="stats-icon-circle"
              style={{
                background: `linear-gradient(135deg, ${r.color}33, ${r.color}99)`,
              }}
            >
              <img src={r.icon} alt={r.label} className="stats-img" />
            </div>
            <p className="stats-number">
              {users.filter((u) => u.role === r.value).length}
            </p>
            <p className="stats-label">{r.label}</p>
          </div>
        ))}
      </div>

      {/* Buscador */}
      <div className="search-box">
        <Search className="search-icon" />
        <input
          type="text"
          placeholder="Buscar por nombre, usuario, email o rol"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Tabla */}
      <div className="table-wrapper">
        <table className="users-table">
          <thead>
            <tr>
              <th>Usuario</th>
              <th>Nombre Completo</th>
              <th>Email</th>
              <th>Teléfonos</th>
              <th>Rol</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((u) => {
              const s = statusToPill(
                u.status || (u.is_active ? "active" : "inactive")
              );
              // Determinar si el menú desplegable debe abrirse hacia arriba
              // Esta es una estimación simple: si la fila está en las últimas 3
              const isLastThree =
                filteredUsers.length > 3 &&
                filteredUsers.indexOf(u) >= filteredUsers.length - 3;

              return (
                <tr key={u._id}>
                  <td data-label="Usuario">
                    <User size={16} style={{ marginRight: 6 }} /> @{u.username}
                  </td>
                  <td data-label="Nombre">{u.full_name}</td>
                  <td data-label="Email">
                    <Mail size={16} style={{ marginRight: 6 }} /> {u.email}
                  </td>
                  <td data-label="Teléfonos" className="phones-cell">
                    {(u.phones || []).length ? (
                      (u.phones || []).map((p, i) => (
                        <span className="phone-chip" key={i}>
                          {formatForView(p)}
                        </span>
                      ))
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </td>
                  <td data-label="Rol">
                    <span className="role-badge" style={getRoleStyle(u.role)}>
                      <Shield size={14} style={{ marginRight: 4 }} />{" "}
                      {roles.find((r) => r.value === u.role)?.label}
                    </span>
                  </td>
                  <td data-label="Estado">
                    <div className={`status-pill ${s.cls}`}>{s.text}</div>
                  </td>
                  <td data-label="Acciones">
                    <div className="action-buttons">
                      {/* === MENÚ DE ESTADO CORREGIDO === */}
                      <div
                        className={`status-menu ${
                          openStatusMenuId === u._id ? "open" : ""
                        } ${isLastThree ? "upward" : ""}`}
                        // Manejador para cerrar otros menús y abrir/cerrar el actual
                        // Nota: La clase 'upward' es una estimación, puedes usar useRef y getBoundingClientRect para precisión.
                      >
                        <button
                          className="action-btn status"
                          onClick={(e) => {
                            e.stopPropagation(); // Evita que el clic se propague y cierre el menú de inmediato
                            setOpenStatusMenuId((prev) =>
                              prev === u._id ? null : u._id
                            );
                          }}
                          title="Cambiar estado"
                        >
                          <MoreVertical size={16} />
                        </button>

                        {/* El menú desplegable AHORA está SIEMPRE en el DOM */}
                        <div className="status-dropdown">
                          <button
                            className="action-active"
                            onClick={() => openStatusConfirm(u, "active")}
                            disabled={u.status === "active"}
                          >
                            <CheckSquare size={14} /> Activar
                          </button>
                          <button
                            className="action-inactive"
                            onClick={() => openStatusConfirm(u, "inactive")}
                            disabled={u.status === "inactive"}
                          >
                            <XSquare size={14} /> Desactivar
                          </button>
                          <button
                            className="action-blocked"
                            onClick={() => openStatusConfirm(u, "blocked")}
                            disabled={u.status === "blocked"}
                          >
                            <UserX size={14} /> Bloquear
                          </button>
                        </div>
                      </div>
                      {/* === FIN MENÚ DE ESTADO CORREGIDO === */}

                      <button
                        className="action-btn edit"
                        onClick={() => handleEdit(u)}
                        title="Editar"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        className="action-btn delete"
                        onClick={() => handleDeleteClick(u)}
                        title="Eliminar"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* === CERRAR MENÚ AL HACER CLIC FUERA === */}
      {/* Este efecto usa un evento global para cerrar el menú si se hace clic fuera del mismo */}
      <GlobalClickListener
        openStatusMenuId={openStatusMenuId}
        setOpenStatusMenuId={setOpenStatusMenuId}
      />

      {/* Modal de roles (vista rápida) */}
      {previewRole && (
        <div className="modal-overlay open">
          <div className="modal open" style={{ maxWidth: "600px" }}>
            <h2>Usuarios en {previewRole.label}</h2>
            <div
              className="table-wrapper"
              style={{ maxHeight: "300px", overflowY: "auto" }}
            >
              <table className="users-table">
                <thead>
                  <tr>
                    <th>Usuario</th>
                    <th>Nombre</th>
                    <th>Email</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {users
                    .filter((u) => u.role === previewRole.value)
                    .map((u) => {
                      const s = statusToPill(
                        u.status || (u.is_active ? "active" : "inactive")
                      );
                      return (
                        <tr key={u._id}>
                          <td>@{u.username}</td>
                          <td>{u.full_name}</td>
                          <td>{u.email}</td>
                          <td>
                            <div className={`status-pill ${s.cls}`}>
                              {s.text}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
            <div className="modal-actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setPreviewRole(null)}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Nuevo/Editar (compacto) */}
      {showModal && (
        <div className={`modal-overlay ${isClosing ? "closing" : "open"}`}>
          <div className={`modal ${isClosing ? "closing" : "open"} modal-sm`}>
            <h2>{editingUser ? "Editar Usuario" : "Nuevo Usuario"}</h2>
            <form onSubmit={handleSubmit}>
              {/* Grid compacto */}
              <div className="form-grid">
                <div className="form-group">
                  <label>Nombres</label>
                  <input
                    className="input-sm"
                    type="text"
                    value={formData.nombres}
                    onChange={(e) =>
                      setFormData({ ...formData, nombres: e.target.value })
                    }
                    required
                    placeholder="María"
                  />
                  {errors.nombres && (
                    <span className="error">{errors.nombres}</span>
                  )}
                </div>

                <div className="form-group">
                  <label>Apellidos</label>
                  <input
                    className="input-sm"
                    type="text"
                    value={formData.apellidos}
                    onChange={(e) =>
                      setFormData({ ...formData, apellidos: e.target.value })
                    }
                    required
                    placeholder="Ramos"
                  />
                  {errors.apellidos && (
                    <span className="error">{errors.apellidos}</span>
                  )}
                </div>

                <div className="form-group">
                  <label>Usuario</label>
                  <input
                    className="input-sm"
                    type="text"
                    value={formData.username}
                    onChange={(e) =>
                      setFormData({ ...formData, username: e.target.value })
                    }
                    required
                    disabled={!!editingUser}
                    placeholder="mramos"
                  />
                  {errors.username && (
                    <span className="error">{errors.username}</span>
                  )}
                </div>

                <div className="form-group">
                  <label>Email</label>
                  <input
                    className="input-sm"
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    required
                    placeholder="maria@dominio.com"
                  />
                  {errors.email && (
                    <span className="error">{errors.email}</span>
                  )}
                </div>

                <div className="form-group">
                  <label>Rol</label>
                  <select
                    className="input-sm"
                    value={formData.role}
                    onChange={(e) =>
                      setFormData({ ...formData, role: e.target.value })
                    }
                    required
                  >
                    <option value="">Seleccionar rol</option>
                    {roles.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                  {errors.role && <span className="error">{errors.role}</span>}
                </div>

                <div className="form-group">
                  <label>Estado</label>
                  <select
                    className="input-sm"
                    value={formData.status}
                    onChange={(e) =>
                      setFormData({ ...formData, status: e.target.value })
                    }
                  >
                    <option value="active">Activo</option>
                    <option value="inactive">Inactivo</option>
                    <option value="blocked">Bloqueado</option>
                  </select>
                </div>

                {/* Teléfonos (múltiples) */}
                <div className="form-group phones-group form-col-span">
                  <label>Teléfonos</label>
                  <div className="phones-list">
                    {formData.phones.map((p, idx) => (
                      <div className="phone-row" key={idx}>
                        <PhoneInput
                          country="hn"
                          value={p.value}
                          onChange={(val, countryData) => {
                            const dial = countryData?.dialCode || "504";
                            const allDigits = val.replace(/\D/g, "");
                            let local = allDigits.startsWith(dial)
                              ? allDigits.slice(dial.length)
                              : allDigits;

                            if (countryData?.countryCode === "hn") {
                              local = local.slice(0, 8); // máx 8 dígitos locales
                            } else {
                              local = local.slice(0, 14);
                            }

                            const prettyLocal =
                              countryData?.countryCode === "hn" &&
                              local.length > 4
                                ? `${local.slice(0, 4)}-${local.slice(4)}`
                                : local;

                            const formatted = prettyLocal
                              ? `+${dial} ${prettyLocal}`
                              : `+${dial}`;
                            setFormData((prev) => {
                              const next = [...prev.phones];
                              next[idx] = { value: formatted };
                              return { ...prev, phones: next };
                            });
                          }}
                          masks={{ hn: "....-...." }}
                          alwaysDefaultMask={false}
                          enableSearch
                          disableDropdown={false}
                          countryCodeEditable={false}
                          inputProps={{ required: idx === 0 }}
                          specialLabel=""
                          inputStyle={{
                            width: "100%",
                            height: 40,
                            fontSize: 15,
                            paddingLeft: 48,
                          }}
                        />

                        {formData.phones.length > 1 && (
                          <button
                            type="button"
                            className="btn-icon danger"
                            onClick={() => removePhone(idx)}
                            title="Eliminar teléfono"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      className="btn-link"
                      onClick={addPhone}
                    >
                      + Agregar otro teléfono
                    </button>
                  </div>
                  {errors.phones && (
                    <span className="error">{errors.phones}</span>
                  )}
                </div>

                {/* Password */}
                <div className="form-group password-field form-col-span">
                  <label>
                    {editingUser ? "Nueva contraseña" : "Contraseña"}
                  </label>
                  <div className="password-wrapper">
                    <input
                      className="input-sm"
                      type={showPassword ? "text" : "password"}
                      value={formData.password}
                      onChange={(e) =>
                        setFormData({ ...formData, password: e.target.value })
                      }
                      placeholder={
                        editingUser
                          ? "Dejar vacío para no cambiar"
                          : "@Dmin123!"
                      }
                      required={!editingUser}
                    />
                    <button
                      type="button"
                      className="btn-icon ghost pw-eye"
                      onClick={() => setShowPassword(!showPassword)}
                      title={showPassword ? "Ocultar" : "Mostrar"}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  <small className="hint">
                    Mín. 8 caracteres e incluir mayúscula, minúscula, número y
                    símbolo.
                  </small>
                  {errors.password && (
                    <span className="error">{errors.password}</span>
                  )}
                </div>

                {/* Confirmar contraseña (solo al crear) */}
                {!editingUser && (
                  <div className="form-group password-field form-col-span">
                    <label>Confirmar contraseña</label>
                    <div className="password-wrapper">
                      <input
                        className="input-sm"
                        type={showPassword2 ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Repite la contraseña"
                        required
                      />
                      <button
                        type="button"
                        className="btn-icon ghost pw-eye"
                        onClick={() => setShowPassword2(!showPassword2)}
                        title={showPassword2 ? "Ocultar" : "Mostrar"}
                      >
                        {showPassword2 ? (
                          <EyeOff size={16} />
                        ) : (
                          <Eye size={16} />
                        )}
                      </button>
                    </div>
                    <small className="hint">
                      Ambas contraseñas deben coincidir.
                    </small>
                    {errors.confirmPassword && (
                      <span className="error">{errors.confirmPassword}</span>
                    )}
                  </div>
                )}

                {/* Duplicados */}
                {errors.duplicates && (
                  <div className="form-col-span">
                    <span className="error">{errors.duplicates}</span>
                  </div>
                )}
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={handleCloseModal}
                >
                  Cancelar
                </button>
                <button type="submit" className="create-btn">
                  {editingUser ? "Guardar Cambios" : "Crear Usuario"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Confirmación para Eliminar */}
      {showConfirmModal && userToDelete && (
        <div
          className={`confirm-modal-overlay ${
            isClosingConfirm ? "closing" : "open"
          }`}
        >
          <div
            className={`confirm-modal ${isClosingConfirm ? "closing" : "open"}`}
          >
            <Trash2 size={40} color={ACTION_TEXT.inactive.color || "#dc2626"} />
            <h3>Confirmar Eliminación</h3>
            <p>
              Estás a punto de eliminar al usuario **@{userToDelete.username}**.
              Esta acción es irreversible. ¿Estás seguro de que quieres
              continuar?
            </p>
            <div className="confirm-actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={closeConfirmModal}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="confirm-btn"
                onClick={confirmDelete}
              >
                Sí, Eliminar Usuario
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmación para Cambio de Estado */}
      {confirmStatus.open && confirmStatus.user && (
        <div className={`confirm-modal-overlay open`}>
          <div
            className={`confirm-modal open`}
            style={{
              borderTopColor:
                confirmStatus.action === "active"
                  ? "#10b981"
                  : confirmStatus.action === "blocked"
                  ? "#f59e0b"
                  : "#dc2626",
            }}
          >
            {confirmStatus.action === "active" ? (
              <CheckSquare size={40} color="#10b981" />
            ) : confirmStatus.action === "blocked" ? (
              <UserX size={40} color="#f59e0b" />
            ) : (
              <XSquare size={40} color="#dc2626" />
            )}
            <h3>
              Confirmar{" "}
              {ACTION_TEXT[confirmStatus.action]?.ask || "Cambio de Estado"}
            </h3>
            <p>
              Estás a punto de **
              {ACTION_TEXT[confirmStatus.action]?.ask?.toLowerCase()}** al
              usuario **@{confirmStatus.user.username}**. ¿Deseas continuar?
            </p>
            <div className="confirm-actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={cancelStatusConfirm}
              >
                {ACTION_TEXT[confirmStatus.action]?.no || "Cancelar"}
              </button>
              <button
                type="button"
                className="confirm-btn"
                onClick={confirmStatusChange}
                style={{
                  background: `linear-gradient(135deg, ${
                    confirmStatus.action === "active"
                      ? "#10b981"
                      : confirmStatus.action === "blocked"
                      ? "#f59e0b"
                      : "#ef4444"
                  }, ${
                    confirmStatus.action === "active"
                      ? "#059669"
                      : confirmStatus.action === "blocked"
                      ? "#d97706"
                      : "#dc2626"
                  })`,
                }}
              >
                {ACTION_TEXT[confirmStatus.action]?.yes || "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Componente para manejar el clic global fuera del menú
const GlobalClickListener = ({ openStatusMenuId, setOpenStatusMenuId }) => {
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        openStatusMenuId &&
        !event.target.closest(".status-menu") &&
        !event.target.closest(".status-dropdown") &&
        !event.target.closest(".confirm-modal-overlay")
      ) {
        setOpenStatusMenuId(null);
      }
    };

    // Añadir el listener al hacer clic
    document.addEventListener("mousedown", handleClickOutside);

    // Limpiar el listener al desmontar o al cambiar el ID
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [openStatusMenuId, setOpenStatusMenuId]);

  return null; // Este componente no renderiza nada visible
};

export default Users;