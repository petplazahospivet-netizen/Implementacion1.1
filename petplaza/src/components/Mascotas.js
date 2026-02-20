// src/components/Mascotas.js
import React, { useEffect, useMemo, useState } from "react";
import {
  FaEdit,
  FaTrash,
  FaPaw,
  FaUser,
  FaCalendarAlt,
  FaWeight,
  FaPalette,
  FaSearch,
} from "react-icons/fa";
import { getPets, createPet, updatePet, deletePet } from "../apis/petsApi";
import { getOwners } from "../apis/ownersApi";
import "../CSS/Mascotas.css";

const Mascotas = ({ user }) => {
  // ---- Datos desde API ----
  const [mascotas, setMascotas] = useState([]);
  const [dueños, setDueños] = useState([]);

  // ---- Buscador ----
  const [search, setSearch] = useState("");

  const filteredMascotas = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return mascotas;
    return mascotas.filter((m) =>
      [m.nombre, m.especie, m.raza, m.color, m?.ownerId?.full_name]
        .filter(Boolean)
        .some((f) => f.toLowerCase().includes(q))
    );
  }, [search, mascotas]);

  // ---- Modal Crear/Editar ----
  const [showModal, setShowModal] = useState(false);
  const [closingMain, setClosingMain] = useState(false);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [mascotaEditando, setMascotaEditando] = useState(null);

  // ---- Modal Eliminar ----
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [closingDelete, setClosingDelete] = useState(false);
  const [mascotaAEliminar, setMascotaAEliminar] = useState(null);

  // ---- Toast moderno ----
  const [toast, setToast] = useState({
    show: false,
    type: "success",
    message: "",
  });

  // ---- Form ----
  const [nuevaMascota, setNuevaMascota] = useState({
    nombre: "",
    especie: "",
    raza: "",
    nacimiento: "",
    sexo: "",
    peso: "",
    color: "",
    ownerId: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setNuevaMascota((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // ================================
    // 🚨 VALIDACIÓN ESTRICTA
    // ================================
    const camposRequeridos = [
      "nombre",
      "especie",
      "raza",
      "nacimiento",
      "sexo",
      "peso",
      "color",
      "ownerId",
    ];

    const faltantes = camposRequeridos.filter(
      (campo) => !nuevaMascota[campo] || nuevaMascota[campo].toString().trim() === ""
    );

    if (faltantes.length > 0) {
      showToast("error", "Debes completar todos los campos antes de guardar");
      return;
    }

    try {
      if (modoEdicion) {
        const resp = await updatePet(mascotaEditando._id, nuevaMascota);
        setMascotas((prev) =>
          prev.map((m) => (m._id === resp.pet._id ? resp.pet : m))
        );
        showToast("success", "Mascota actualizada correctamente");
      } else {
        const resp = await createPet(nuevaMascota);
        setMascotas((prev) => [...prev, resp.mascota]);
        showToast("success", "Mascota registrada correctamente");
      }
      cerrarModalPrincipal();
    } catch (err) {
      showToast("error", err.message || "Error guardando mascota");
    }
  };

  // ---- Abrir/Cerrar modales ----
  const abrirModalNueva = () => {
    setModoEdicion(false);
    setMascotaEditando(null);
    setNuevaMascota({
      nombre: "",
      especie: "",
      raza: "",
      nacimiento: "",
      sexo: "",
      peso: "",
      color: "",
      ownerId: "",
    });
    setClosingMain(false);
    setShowModal(true);
  };

  const abrirModalEditar = (mascota) => {
    setModoEdicion(true);
    setMascotaEditando(mascota);
    setNuevaMascota({
      nombre: mascota.nombre,
      especie: mascota.especie,
      raza: mascota.raza,
      nacimiento: mascota.nacimiento ? mascota.nacimiento.substring(0, 10) : "",
      sexo: mascota.sexo || "",
      peso: mascota.peso ?? "",
      color: mascota.color || "",
      ownerId: mascota?.ownerId?._id || "",
    });
    setClosingMain(false);
    setShowModal(true);
  };

  const cerrarModalPrincipal = () => {
    setClosingMain(true);
    setTimeout(() => {
      setShowModal(false);
      setClosingMain(false);
    }, 250);
  };

  const abrirModalEliminar = (mascota) => {
    setMascotaAEliminar(mascota);
    setClosingDelete(false);
    setShowDeleteModal(true);
  };

  const closeDeleteModal = () => {
    setClosingDelete(true);
    setTimeout(() => {
      setShowDeleteModal(false);
      setClosingDelete(false);
      setMascotaAEliminar(null);
    }, 250);
  };

  const confirmarEliminar = async () => {
    try {
      await deletePet(mascotaAEliminar._id);
      setMascotas((prev) => prev.filter((m) => m._id !== mascotaAEliminar._id));
      showToast("success", "Mascota eliminada correctamente");
      closeDeleteModal();
    } catch (err) {
      showToast("error", err.message || "Error eliminando mascota");
    }
  };

  // ---- Cargar datos ----
  useEffect(() => {
    (async () => {
      try {
        const [mascotasData, ownersData] = await Promise.all([
          getPets(),
          getOwners(),
        ]);
        setMascotas(mascotasData);
        setDueños(ownersData);
      } catch (err) {
        showToast("error", "Error cargando datos iniciales");
      }
    })();
  }, []);

  // ---- Toast ----
  const showToast = (type, message) => {
    setToast({ show: true, type, message });
    setTimeout(() => setToast((t) => ({ ...t, show: false })), 3000);
  };

  /* ======= PERMISOS ======= */
  if ((!user || user.role !== "admin" && user.role !== "veterinario" && user.role !== "recepcion")) {
    return (
      <div className="mascotas-no-permissions">
        🚫 No tienes permisos para ver la Gestión de Mascotas.
      </div>
    );
  }

  return (
    <div className="mascotas-container">

      {/* Header */}
      <div className="mascotas-header">
        <div
          className="mascotas-title-wrapper"
          style={{ display: "flex", alignItems: "center", gap: "8px" }}
        >
          <FaPaw size={24} color="#00a884" aria-hidden="true" />
          <div>
            <h2 className="mascotas-title">Mascotas</h2>
            <p className="mascotas-subtitle">Gestión de mascotas registradas</p>
          </div>
        </div>
        <button className="btn-nueva-mascota" onClick={abrirModalNueva}>
          + Nueva Mascota
        </button>
      </div>

      {/* Buscador */}
      <div className="mascotas-search">
        <input
          type="text"
          placeholder="Buscar por nombre, especie, raza o dueño..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Buscar mascotas"
        />
        <FaSearch className="search-icon" aria-hidden="true" />
      </div>

      {/* Grid */}
      <div className="mascotas-grid">
        {filteredMascotas.map((mascota) => (
          <div className="mascota-card" key={mascota._id}>
            <div className="card-actions">
              <FaEdit
                className="icon edit"
                onClick={() => abrirModalEditar(mascota)}
              />
              <FaTrash
                className="icon delete"
                onClick={() => abrirModalEliminar(mascota)}
              />
            </div>

            <div className="mascota-header">
              <div className="mascota-icon">
                <FaPaw aria-hidden="true" />
              </div>
              <div className="mascota-titles">
                <h3 className="mascota-nombre">{mascota.nombre}</h3>
                <div className="mascota-raza">
                  {mascota.especie} - {mascota.raza}
                </div>
              </div>
            </div>

            <p>
              <FaUser /> Dueño: {mascota?.ownerId?.full_name || "Sin dueño"}
            </p>
            <p>
              <FaCalendarAlt /> Nacimiento:{" "}
              {mascota.nacimiento
                ? mascota.nacimiento.substring(0, 10).split("-").reverse().join("/")
                : "No registrado"}
            </p>
            <p>
              <FaWeight /> Peso: {mascota.peso ?? 0} kg
            </p>
            <p>
              <FaPalette className="palette-icon" /> Color:{" "}
              {mascota.color || "-"}
            </p>
          </div>
        ))}

        {filteredMascotas.length === 0 && (
          <div className="empty-state">
            No se encontraron mascotas con ese criterio.
          </div>
        )}
      </div>

      {/* Modal Crear/Editar */}
      {showModal && (
        <div
          className={`modal-overlay ${closingMain ? "closing" : "active"}`}
          onMouseDown={(e) => {
            if (e.target.classList.contains("modal-overlay"))
              cerrarModalPrincipal();
          }}
        >
          <div
            className={`modal ${closingMain ? "closing" : "active"}`}
            role="dialog"
            aria-modal="true"
          >
            <h3>{modoEdicion ? "Editar Mascota" : "Nueva Mascota"}</h3>

            <form className="modal-form" onSubmit={handleSubmit}>
              <label>
                Nombre
                <input
                  type="text"
                  name="nombre"
                  value={nuevaMascota.nombre}
                  onChange={handleChange}
                  required
                />
              </label>

              <label>
                Dueño
                <select
                  name="ownerId"
                  value={nuevaMascota.ownerId}
                  onChange={handleChange}
                  required
                >
                  <option value="">Seleccionar dueño</option>
                  {dueños.map((d) => (
                    <option key={d._id} value={d._id}>
                      {d.full_name}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Especie
                <select
                  name="especie"
                  value={nuevaMascota.especie}
                  onChange={handleChange}
                  required
                >
                  <option value="">Seleccionar especie</option>
                  <option value="Perro">Perro</option>
                  <option value="Gato">Gato</option>
                  <option value="Conejo">Conejo</option>
                  <option value="Hamster">Hamster</option>
                  <option value="Ave">Ave</option>
                  <option value="Tortuga">Tortuga</option>
                  <option value="Pez">Pez</option>
                  <option value="Exotico">Exótico</option>
                  <option value="Otros">Otros</option>
                </select>
              </label>

              <label>
                Raza
                <input
                  type="text"
                  name="raza"
                  value={nuevaMascota.raza}
                  onChange={handleChange}
                  required
                />
              </label>

              <label>
                Fecha de Nacimiento
                <input
                  type="date"
                  name="nacimiento"
                  value={nuevaMascota.nacimiento}
                  onChange={handleChange}
                  required
                />
              </label>

              <label>
                Sexo
                <select
                  name="sexo"
                  value={nuevaMascota.sexo}
                  onChange={handleChange}
                  required
                >
                  <option value="">Seleccionar sexo</option>
                  <option value="Macho">Macho</option>
                  <option value="Hembra">Hembra</option>
                </select>
              </label>

              <label>
                Peso (kg)
                <input
                  type="number"
                  name="peso"
                  value={nuevaMascota.peso}
                  onChange={handleChange}
                  step="0.1"
                  required
                />
              </label>

              <label>
                Color
                <input
                  type="text"
                  name="color"
                  value={nuevaMascota.color}
                  onChange={handleChange}
                  required
                />
              </label>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-cancelar"
                  onClick={cerrarModalPrincipal}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn-guardar">
                  {modoEdicion ? "Actualizar" : "Guardar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Confirmar Eliminación */}
      {showDeleteModal && (
        <div
          className={`modal-overlay ${closingDelete ? "closing" : "active"}`}
          onMouseDown={(e) => {
            if (e.target.classList.contains("modal-overlay"))
              closeDeleteModal();
          }}
        >
          <div
            className={`modal ${closingDelete ? "closing" : "active"}`}
            role="dialog"
            aria-modal="true"
          >
            <h3>¿Eliminar mascota?</h3>
            <p>
              ¿Deseas eliminar a <strong>{mascotaAEliminar?.nombre}</strong>?
            </p>
            <div className="modal-actions">
              <button className="btn-cancelar" onClick={closeDeleteModal}>
                No
              </button>
              <button className="btn-guardar" onClick={confirmarEliminar}>
                Sí, eliminar
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
          className={`toast ${toast.type === "success" ? "success" : "error"}`}
        >
          {toast.type === "success" ? (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="feather feather-check-circle"
            >
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="feather feather-alert-circle"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          )}
          <div style={{ fontSize: 14 }}>{toast.message}</div>
        </div>
      )}

      <style>
        {`
    @keyframes slideIn {
      from { opacity: 0; transform: translateY(-10px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `}
      </style>
    </div>
  );
};

export default Mascotas;
