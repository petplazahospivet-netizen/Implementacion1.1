// src/components/RecordPreviewModal.js
import React, { useEffect, useState } from "react";
import { X, FileText, User, Dog, ClipboardList, Pill } from "lucide-react";
import "../CSS/RecordPreviewModal.css";

export default function RecordPreviewModal({ record, onClose }) {
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") handleClose();
    };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, []);

  const handleClose = () => {
    setClosing(true);
    setTimeout(() => onClose?.(), 250);
  };

  if (!record) return null;

const recordType =
  record.typeLabel?.toLowerCase().includes("cirugía") ||
  record.tipo === "cirugia"
    ? "surgery"
    : record.typeLabel?.toLowerCase().includes("cuidados") ||
      record.tipo === "cuidados"
    ? "care"
    : "general";

  const themeColor =
    recordType === "surgery"
      ? "#ef4444"
      : recordType === "care"
      ? "#007bff"
      : "#00a884";

  return (
    <div className="record-preview-modal" key={record.id}>
      <div
        className={`preview-overlay ${closing ? "closing" : ""}`}
        onMouseDown={(e) => {
          if (e.target.classList.contains("preview-overlay")) handleClose();
        }}
      >
        <div className={`preview-modal ${recordType} ${closing ? "closing" : ""}`}>
          {/* ENCABEZADO */}
          <header className="preview-header">
            <div className="icon-title">
              <FileText size={26} color={themeColor} />
              <h2>{record.type || "Expediente"}</h2>
            </div>
            <button className="btn-close" onClick={handleClose}>
              <X size={22} />
            </button>
          </header>

          {/* CUERPO */}
          <div className="preview-body">
            <h3 className="pet-title" style={{ color: themeColor }}>
              <Dog size={18} /> {record.pet || "Mascota desconocida"}{" "}
              {record.species && `(${record.species})`}
            </h3>

            <p className="owner-info">
              <User size={16} /> Dueño: {record.owner || "Sin registro"}{" "}
              {record.ownerPhone && `• Tel: ${record.ownerPhone}`}
            </p>

            <hr />

            {/* GRID DE DATOS */}
            <div className="record-grid">

              {/* 🟢 GENERAL */}
              {recordType === "general" && (
                <>
                  <Info label="Doctor" value={record.doctor} />
                    {/* ✅ Fecha (reinsertada) */}
      <Info
  label="Fecha"
  value={
    record.createdAt
      ? new Date(record.createdAt).toLocaleString("es-HN", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : record.date
      ? new Date(record.date).toLocaleString("es-HN", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "No definida"
  }
/>
                  <Info label="Sucursal" value={record.branch} />
                  <Info label="Peso" value={record.weight} />
                  <Info label="Raza" value={record.breed} />
                  <Info label="Color Mascota" value={record.colorName} />
                  <Info label="Donante de Sangre" value={record.bloodDonor} />
                  <Info label="Exámenes" value={record.tests} />
                  <Info label="Diagnóstico" value={record.diagnosis} />
                  <Info label="Tratamiento" value={record.treatment} />
                </>
              )}

              {/* 🔴 CIRUGÍA */}
              {recordType === "surgery" && (
                <>
                  <Info label="Doctor Responsable" value={record.doctor} />
                  <Info label="Fecha de Cirugía" value={record.date} />
                  <Info label="Sucursal" value={record.branch} />
                {/* <Info label="Número de Identidad / Pasaporte" value={record.identityNumber} /> */}
                  <Info label="Tipo de Cirugía" value={record.surgeryType} />
                  <Info label="Anestésico Utilizado" value={record.anesthetic} />
                  <Info label="Descripción del Caso" value={record.caseDescription} />
                  <Info label="Riesgo 1" value={record.risk1} />
                  <Info label="Riesgo 2" value={record.risk2} />
                  <Info label="Riesgo 3" value={record.risk3} />
                  <Info label="Riesgo 4" value={record.risk4} />
                  <Info label="Riesgo 5" value={record.risk5} />
                  <Info label="Riesgo 6" value={record.risk6} />
                </>
              )}
               
               {/* 🔵 CUIDADOS EN CASA */}
{recordType === "care" && (
  <>
    <Info label="Fecha" value={record.date} />
    <Info label="Sucursal" value={record.branch} />

    {/* Solo nombre del medicamento */}
    <Info
      label="Medicamento"
      value={
        Array.isArray(record.medications) && record.medications.length > 0
          ? record.medications.map((m) => m.label).join(", ")
          : record.medication || "No especificado"
      }
    />

    <Info
      label="Fecha de Inicio de Medicamento"
      value={record.medicationDate || "No definida"}
    />
    <Info
      label="Fecha de Inicio de Alimentación"
      value={record.foodWaterDate || "No definida"}
    />
    <Info
      label="Monitoreo en Casa"
      value={record.monitoredAtHome || "No especificado"}
    />
    <Info
      label="Contacto de Emergencia"
      value={record.emergencyContact || "No especificado"}
    />
  </>
)}

              

            </div>

            {/* NOTAS */}
            {record.notes && (
              <div className={`notes-box ${recordType}`}>
                <ClipboardList size={18} color={themeColor} />{" "}
                <b>Notas adicionales:</b>
                <p>{record.notes}</p>
              </div>
            )}

  {/* 💉 VACUNAS ADMINISTRADAS */}
{record.vaccines?.length > 0 && (
  <div className={`vaccines-box ${recordType}`}>
    <h4>
      <Pill size={18} style={{ marginRight: "6px" }} />
      Vacunas administradas
    </h4>
    <ul>
      {record.vaccines.map((v, i) => (
        <li key={i}>
          {v.label}{" "}
          {v.when && (
            <span>
              (
              {new Date(v.when).toLocaleString("es-HN", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
              })}
              )
            </span>
          )}
        </li>
      ))}
    </ul>
  </div>
)}

            {/* MEDICAMENTOS */}
            {record.medications?.length > 0 && recordType === "general" && (
              <div className={`vaccines-box ${recordType}`}>
                <h4 style={{ color: themeColor }}>
                  <Pill size={18} style={{ marginRight: "6px" }} />
                  Medicamentos administrados
                </h4>
                <ul>
                  {record.medications.map((m, i) => (
                    <li key={i}>
     {m.label}
    {m.dosage && <span> — Dosis: {m.dosage}</span>}{" "}
    {m.when && (
      <span>
        (
        {new Date(m.when).toLocaleString("es-HN", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        })}
        )
      </span>
    )}
  </li>
                  ))}
                </ul>
              </div>
            )}

            {/* IMÁGENES */}
            {record.images?.length > 0 && (
              <div className="images-section">
                <h4>Imágenes asociadas</h4>
                <div className="images-grid">
                  {record.images.map((img) => (
                    <img key={img.id} src={img.url} alt="Evidencia" />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}



/* COMPONENTE REUTILIZABLE DE INFO */
function Info({ label, value }) {
  if (!value) return null;

  let displayValue = value;
  if (Array.isArray(value)) {
    if (value.length > 0 && typeof value[0] === "object" && value[0].label) {
      displayValue = value.map((v) => v.label).join(", ");
    } else {
      displayValue = value.join(", ");
    }
  } else if (typeof value === "object") {
    if (value.label) displayValue = value.label;
    else displayValue = JSON.stringify(value);
  }

  return (
    <div className="info-item">
      <span className="label">{label}</span>
      <span className="value">{displayValue}</span>
    </div>
  );
}