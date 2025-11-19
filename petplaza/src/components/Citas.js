// src/components/Citas.js
import React, { useState, useEffect } from "react";
import {
  Search,
  CalendarHeart,
  Pencil,
  Trash2,
  AlertTriangle,
  CalendarDays,
  Clock,
  CheckCircle,
} from "lucide-react";
import "../CSS/Citas.css";
import {
  getAppointments,
  createAppointment,
  updateAppointment,
  deleteAppointment,
} from "../apis/appointmentsApi";
import { getOwners } from "../apis/ownersApi";
import { getPets } from "../apis/petsApi";
import { getUsers } from "../apis/usersApi";

const Citas = ({ user }) => {
  const [citas, setCitas] = useState([]);
  const [owners, setOwners] = useState([]);
  const [pets, setPets] = useState([]);
  const [vets, setVets] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);

  const [showConflictModal, setShowConflictModal] = useState(false);
  const [conflictData, setConflictData] = useState(null);

  const [nuevaCita, setNuevaCita] = useState({
    ownerId: "",
    petId: "",
    vetId: "",
    motivo: "",
    fecha: "",
    hora: "",
    estado: "programada",
  });

  const [mensaje, setMensaje] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [citaAEliminar, setCitaAEliminar] = useState(null);

  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const [showCancelarModal, setShowCancelarModal] = useState(false);
  const [citaCancelar, setCitaCancelar] = useState(null);

  const [showAllToday, setShowAllToday] = useState(false);

  /* ============================
     CARGAS INICIALES
  ============================ */
  useEffect(() => {
    loadAppointments();
    loadOwners();
    loadVets();
  }, []);

  const loadAppointments = async () => {
    try {
      const data = await getAppointments();
      setCitas(data);
    } catch (err) {
      console.error("Error cargando citas:", err);
    }
  };

  const loadOwners = async () => {
    try {
      const data = await getOwners();
      setOwners(data);
    } catch (err) {
      console.error("Error cargando dueños:", err);
    }
  };

  const loadVets = async () => {
    try {
      const data = await getUsers();
      setVets(data.filter((u) => u.role === "veterinario"));
    } catch (err) {
      console.error("Error cargando doctores:", err);
    }
  };

  const handleOwnerChange = async (ownerId) => {
    setNuevaCita({ ...nuevaCita, ownerId, petId: "" });
    if (!ownerId) {
      setPets([]);
      return;
    }
    try {
      const data = await getPets();
      const filtered = data.filter((p) => p.ownerId?._id === ownerId);
      setPets(filtered);
    } catch (err) {
      console.error("Error cargando mascotas:", err);
    }
  };

  /* ============================
     GUARDAR / EDITAR CITAS
  ============================ */
  const handleSubmit = async (e) => {
    e.preventDefault();
    const fechaSeleccionada = nuevaCita.fecha;
    const [year, month, day] = fechaSeleccionada.split("-");
    const fechaLocal = `${year}-${month}-${day}`;
    const horaLocal = nuevaCita.hora;

    const conflicto = citas.find((c) => {
      const vetIdCita = c.vetId?._id || c.vetId;
      const vetIdNueva = nuevaCita.vetId;
      return (
        String(vetIdCita) === String(vetIdNueva) &&
        (c.fecha === fechaLocal || c.fecha?.split("T")[0] === fechaLocal) &&
        c.hora === horaLocal &&
        (!editId || c._id !== editId)
      );
    });

    if (conflicto) {
      setConflictData(conflicto);
      setShowConflictModal(true);
      return;
    }

    await guardarCita(fechaLocal, horaLocal);
  };

  const guardarCita = async (fecha, hora) => {
    try {
      const citaAEnviar = { ...nuevaCita, fecha, hora };
      if (editId) {
        await updateAppointment(editId, citaAEnviar);
        setMensaje("Cita editada con éxito");

        // 🔹 Actualiza Navbar en tiempo real si se marca como programada
        if (citaAEnviar.estado === "programada") {
          localStorage.setItem("appointmentUpdate", Date.now().toString());
        }
      } else {
        await createAppointment(citaAEnviar);
        setSuccessMessage("Cita programada con éxito");
        setShowSuccessModal(true);

        // 🔹 Nueva cita programada: actualizar Navbar instantáneamente
        localStorage.setItem("appointmentUpdate", Date.now().toString());
      }

      await loadAppointments();
      cerrarModal();
      setTimeout(() => setMensaje(""), 3000);
      setTimeout(() => setShowSuccessModal(false), 2500);
    } catch (err) {
      console.error("Error guardando cita:", err);
      setMensaje(err.message || "Error al guardar la cita");
      setTimeout(() => setMensaje(""), 4000);
    }
  };

  /* ============================
     EDICIÓN / ELIMINACIÓN
  ============================ */
  const handleEditar = (cita) => {
    const fecha = cita.fecha?.includes("T")
      ? cita.fecha.split("T")[0]
      : cita.fecha;
    setNuevaCita({
      ownerId: cita.ownerId?._id,
      petId: cita.petId?._id,
      vetId: cita.vetId?._id,
      motivo: cita.motivo,
      fecha,
      hora: cita.hora,
      estado: cita.estado,
    });
    setEditId(cita._id);
    setPets(cita.ownerId ? [cita.petId] : []);
    setShowModal(true);
  };

  const confirmarEliminar = (cita) => {
    setCitaAEliminar(cita);
    setShowConfirmModal(true);
  };

  const handleEliminarConfirmado = async () => {
    try {
      await deleteAppointment(citaAEliminar._id);
      setMensaje("Cita eliminada con éxito");
      await loadAppointments();

      // 🔹 Actualiza Navbar en tiempo real
      localStorage.setItem("appointmentUpdate", Date.now().toString());

      cerrarConfirmModal();
      setTimeout(() => setMensaje(""), 3000);
    } catch (err) {
      console.error("Error eliminando cita:", err);
      setMensaje("Error eliminando cita");
    }
  };

  /* ============================
     CAMBIAR ESTADO CON MODALES 
  ============================ */
  const confirmarCancelar = async () => {
    if (!citaCancelar) return;
    try {
      await updateAppointment(citaCancelar._id, { estado: "cancelada" });
      await loadAppointments();

      // 🔹 Actualiza Navbar en tiempo real
      localStorage.setItem("appointmentUpdate", Date.now().toString());

      setShowCancelarModal(false);
      setSuccessMessage(
        `La cita de ${citaCancelar.ownerId?.full_name} para su mascota ${citaCancelar.petId?.nombre} fue cancelada con éxito.`
      );
      setShowSuccessModal(true);
      setTimeout(() => setShowSuccessModal(false), 2500);
      setCitaCancelar(null);
    } catch (err) {
      console.error("Error al cancelar cita:", err);
      setMensaje("Error al cancelar la cita");
      setTimeout(() => setMensaje(""), 4000);
    }
  };

  /* ============================
     MODALES AUXILIARES
  ============================ */
  const cerrarModal = () => {
    setShowModal(false);
    setEditId(null);
    setNuevaCita({
      ownerId: "",
      petId: "",
      vetId: "",
      motivo: "",
      fecha: "",
      hora: "",
      estado: "programada",
    });
    setPets([]);
  };

  const cerrarConfirmModal = () => {
    setShowConfirmModal(false);
    setCitaAEliminar(null);
  };

  const cerrarConflictModal = () => {
    setShowConflictModal(false);
    setConflictData(null);
  };

  const continuarDeTodosModos = async () => {
    setShowConflictModal(false);
    await guardarCita(nuevaCita.fecha, nuevaCita.hora);
  };

  /* ============================
     FORMATO DE DATOS
  ============================ */
  const citasFiltradas = citas.filter((cita) =>
    [
      cita.ownerId?.full_name,
      cita.petId?.nombre,
      cita.vetId?.full_name,
      cita.motivo,
    ]
      .join(" ")
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  const mostrarFecha = (fecha) => {
    if (!fecha) return "";
    if (fecha.includes("T")) return fecha.split("T")[0];
    return fecha;
  };

  const formatearHora = (hora) =>
    hora
      ? new Date(`1970-01-01T${hora}`).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        })
      : "";

  /* ==========================================================
     🚀 RENDER PRINCIPAL DEL COMPONENTE
  ========================================================== */
  if ((!user || user.role !== "admin" && user.role !== "veterinario" && user.role !== "recepcion")) {
    return (
      <div className="citas-no-permissions">
        🚫 No tienes permisos para ver la Gestión de citas.
      </div>
    );
  }

  /* ============================
     INTERFAZ
  ============================ */
  return (
    <div className="citas-container">
      <div className="citas-header">
        <div>
          <h1 className="Citas-title">
            <CalendarHeart
              size={26}
              color="#4CAF50"
              style={{ marginRight: "10px" }}
            />
            Citas Médicas
          </h1>
          <h4 className="Citas-subtitulo">Gestión de Citas Médicas</h4>
        </div>
        <button className="btn-nueva-cita" onClick={() => setShowModal(true)}>
          + Nueva Cita
        </button>
      </div>

      {mensaje && <div className="mensaje-exito">{mensaje}</div>}

      <div className="citas-search">
        <Search className="search-icon" />
        <input
          type="text"
          placeholder="Buscar por dueño, mascota, médico o motivo..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* ===== TABLA PRINCIPAL ===== */}
      <table className="citas-table">
        <thead>
          <tr>
            <th>Fecha y Hora</th>
            <th>Dueño</th>
            <th>Mascota</th>
            <th>Doctor</th>
            <th>Motivo</th>
            <th>Estado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {citasFiltradas.map((cita) => (
            <tr key={cita._id}>
              <td>
                {mostrarFecha(cita.fecha)} {formatearHora(cita.hora)}
              </td>
              <td>{cita.ownerId?.full_name}</td>
              <td>{cita.petId?.nombre}</td>
              <td>{cita.vetId?.full_name}</td>
              <td>{cita.motivo}</td>
              <td>
                <select
                  value={cita.estado}
                  onChange={async (e) => {
                    try {
                      const nuevoEstado = e.target.value;

                      if (nuevoEstado === "cancelada") {
                        setCitaCancelar(cita);
                        setShowCancelarModal(true);
                        return;
                      }

                      await updateAppointment(cita._id, {
                        estado: nuevoEstado,
                      });
                      await loadAppointments();

                      // 🔹 Actualiza el Navbar en tiempo real
                      localStorage.setItem("appointmentInstant", Date.now());

                      if (nuevoEstado === "programada") {
                        setSuccessMessage("Cita programada con éxito");
                        setShowSuccessModal(true);
                      } else if (nuevoEstado === "completada") {
                        setSuccessMessage("Cita completada con éxito");
                        setShowSuccessModal(true);
                      }

                      setTimeout(() => setShowSuccessModal(false), 2500);
                    } catch (err) {
                      setMensaje(err.message || "Error al actualizar estado");
                      setTimeout(() => setMensaje(""), 4000);
                    }
                  }}
                  className={`estado-select ${cita.estado.toLowerCase()}`}
                >
                  <option value="programada">Programada</option>
                  <option value="completada">Completada</option>
                  <option value="cancelada">Cancelada</option>
                </select>
              </td>
              <td className="acciones">
                <button
                  className="btn-editar"
                  onClick={() => handleEditar(cita)}
                >
                  <Pencil size={20} color="#2196F3" />
                </button>
                <button
                  className="btn-eliminar"
                  onClick={() => confirmarEliminar(cita)}
                >
                  <Trash2 size={20} color="#E53935" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* ================= MODALES ================= */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>{editId ? "Editar Cita" : "Nueva Cita"}</h3>
            <form onSubmit={handleSubmit}>
              <label>Dueño</label>
              <select
                name="ownerId"
                value={nuevaCita.ownerId}
                onChange={(e) => handleOwnerChange(e.target.value)}
                required
              >
                <option value="">Seleccionar dueño</option>
                {owners.map((o) => (
                  <option key={o._id} value={o._id}>
                    {o.full_name}
                  </option>
                ))}
              </select>

              <label>Mascota</label>
              <select
                name="petId"
                value={nuevaCita.petId}
                onChange={(e) =>
                  setNuevaCita({ ...nuevaCita, petId: e.target.value })
                }
                disabled={!nuevaCita.ownerId}
                required
              >
                <option value="">Seleccionar mascota</option>
                {pets.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.nombre}
                  </option>
                ))}
              </select>

              <label>Doctor</label>
              <select
                name="vetId"
                value={nuevaCita.vetId}
                onChange={(e) =>
                  setNuevaCita({ ...nuevaCita, vetId: e.target.value })
                }
                required
              >
                <option value="">Seleccionar médico</option>
                {vets.map((v) => (
                  <option key={v._id} value={v._id}>
                    {v.full_name}
                  </option>
                ))}
              </select>

              <label>Motivo</label>
              <input
                type="text"
                name="motivo"
                value={nuevaCita.motivo}
                onChange={(e) =>
                  setNuevaCita({ ...nuevaCita, motivo: e.target.value })
                }
                required
              />

              <label>Fecha</label>
              <div className="input-icon-wrapper">
                <input
                  type="date"
                  name="fecha"
                  value={nuevaCita.fecha}
                  onChange={(e) =>
                    setNuevaCita({ ...nuevaCita, fecha: e.target.value })
                  }
                  required
                />
              </div>

              <label>Hora</label>
              <div className="input-icon-wrapper">
                <input
                  type="time"
                  name="hora"
                  min="08:00"
                  max="18:00"
                  value={nuevaCita.hora}
                  onChange={(e) =>
                    setNuevaCita({ ...nuevaCita, hora: e.target.value })
                  }
                  required
                  onInvalid={(e) =>
                    e.target.setCustomValidity(
                      "La hora debe estar entre 8:00 AM y 6:00 PM."
                    )
                  }
                  onInput={(e) => e.target.setCustomValidity("")}
                  className="input-cita-hora"
                />
              </div>

              <div className="modal-buttons">
                <button type="submit" className="btn-guardar">
                  {editId ? "Guardar Cambios" : "Guardar"}
                </button>
                <button
                  type="button"
                  className="btn-cancelar"
                  onClick={cerrarModal}
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal conflicto */}
      {showConflictModal && (
        <div className="modal-overlay">
          <div className="modal modal-conflicto">
            <AlertTriangle color="#f59e0b" size={42} />
            <h3>Conflicto de horario</h3>
            <p>
              El médico <strong>{conflictData.vetId?.full_name}</strong> ya
              tiene una cita el{" "}
              <strong>{mostrarFecha(conflictData.fecha)}</strong> a las{" "}
              <strong>{formatearHora(conflictData.hora)}</strong>.
            </p>
            <p>¿Deseas reagendar o continuar de todos modos?</p>
            <div className="modal-buttons">
              <button className="btn-guardar" onClick={continuarDeTodosModos}>
                Continuar de todos modos
              </button>
              <button className="btn-cancelar" onClick={cerrarConflictModal}>
                Reagendar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal confirmación eliminación */}
      {showConfirmModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Confirmar Eliminación</h3>
            <p>¿Seguro que deseas eliminar esta cita?</p>
            <div className="modal-buttons">
              <button
                className="btn-guardar"
                onClick={handleEliminarConfirmado}
              >
                Sí, eliminar
              </button>
              <button className="btn-cancelar" onClick={cerrarConfirmModal}>
                No
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal cancelar cita */}
      {showCancelarModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Cancelar cita</h3>
            <p>
              ¿Seguro que desea cancelar la cita de{" "}
              <strong>{citaCancelar?.ownerId?.full_name}</strong> para su
              mascota <strong>{citaCancelar?.petId?.nombre}</strong>?
            </p>
            <div className="modal-buttons">
              <button
                className="btn-cancelar"
                onClick={() => setShowCancelarModal(false)}
              >
                No
              </button>
              <button className="btn-guardar" onClick={confirmarCancelar}>
                Sí, cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal éxito */}
      {showSuccessModal && (
        <div className="modal-overlay">
          <div className="modal modal-success">
            <CheckCircle className="check-icon" size={40} color="#4CAF50" />
            <span>{successMessage}</span>
          </div>
        </div>
      )}
    </div>
  );
}
export default Citas;