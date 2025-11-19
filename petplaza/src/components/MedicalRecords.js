// =========================================================
// 📄 MedicalRecords.js (Actualizado)
// Gestión de expedientes con conexión real al backend
// =========================================================
// src/components/MedicalRecords.js
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  FileDown,
  Edit,
  Trash2,
  Plus,
  Search,
  AlertTriangle,
  CheckCircle2,
  Pencil,
} from "lucide-react";
import jsPDF from "jspdf";
import "../CSS/MedicalRecords.css";
import GeneralRecordForm from "./GeneralRecordForm";
import SurgeryRecordForm from "./SurgeryRecordForm";
import HomeCareRecordForm from "./HomeCareRecordForm";
import RecordPreviewModal from "./RecordPreviewModal";
import logo from "../assets/petigato_logo.jpeg";

// Importar API del backend
import {
  getExpedientes,
  createExpediente,
  updateExpediente,
  deleteExpediente,
} from "../apis/expedientesApi";

const MedicalRecords = ({ user }) => {
  const [records, setRecords] = useState([]);
  const [activeModal, setActiveModal] = useState(null);
  const [editData, setEditData] = useState(null);
  const [tempRecord, setTempRecord] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [toast, setToast] = useState(null);
  const [filterPet, setFilterPet] = useState("");
  const [filterType, setFilterType] = useState("Todos");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const menuRef = useRef(null);

  /* =========================================================
      🔹 CARGA INICIAL DESDE BACKEND
  ========================================================= */
  useEffect(() => {
    async function fetchExpedientes() {
      try {
        setLoading(true);
        const data = await getExpedientes();
        setRecords(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Error cargando expedientes:", err);
        setToast({ type: "delete", message: "❌ Error al cargar expedientes" });
      } finally {
        setLoading(false);
      }
    }
    fetchExpedientes();
  }, []);

  /* =========================================================
      🔹 CERRAR MENÚ CUANDO SE CLICA FUERA
  ========================================================= */
  useEffect(() => {
    const handle = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target))
        setMenuOpen(false);
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  const pets = useMemo(
    () => Array.from(new Set(records.map((r) => r.pet).filter(Boolean))),
    [records]
  );

  const filtered = useMemo(() => {
    return records.filter((r) => {
      const okPet = !filterPet || r.pet === filterPet;
      const okType = filterType === "Todos" || r.typeLabel === filterType;
      const q = query.trim().toLowerCase();
      const okQ =
        !q ||
        [r.pet, r.owner, r.doctor, r.typeLabel, r.species, r.breed, r.diagnosis]
          .filter(Boolean)
          .some((v) => v.toLowerCase().includes(q));
      return okPet && okType && okQ;
    });
  }, [records, filterPet, filterType, query]);

  /* =========================================================
      🔹 CREAR / EDITAR EXPEDIENTE
  ========================================================= */
  function onCreate(type) {
    setEditData(null);
    setTempRecord(null);
    setActiveModal(type);
    setMenuOpen(false);
  }

  function onEdit(record) {
    setEditData(record);
    if (record.typeLabel === "Expediente General") setActiveModal("general");
    if (record.typeLabel === "Expediente Cirugía") setActiveModal("surgery");
    if (record.typeLabel === "Cuidados en Casa") setActiveModal("care");
  }

  function handleLinkRecord(type, data) {
    const baseData = {
      pet: data.pet || editData?.pet || "",
      species: data.species || editData?.species || "",
      gender: data.gender || editData?.gender || "",
      owner: data.owner || editData?.owner || "",
      ownerPhone: data.ownerPhone || editData?.ownerPhone || "",
      breed: data.breed || editData?.breed || "",
      doctor: data.doctor || editData?.doctor || "",
      branch: data.branch || editData?.branch || "",
      date: data.date || editData?.date || "",
    };
    setTempRecord(baseData);
    setEditData(baseData);
    setActiveModal(type);
  }

  function showToast(type, message) {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  }

  /* =========================================================
      💾 GUARDAR (CREAR o EDITAR)
  ========================================================= */
  async function onSave(formData) {
    try {
      const tipoActivo =
        activeModal === "general"
          ? "general"
          : activeModal === "surgery"
          ? "cirugia"
          : activeModal === "care" || formData.tipo === "care"
          ? "cuidados"
          : "general";

      const tipoInfo = {
        tipo: tipoActivo,
        typeLabel:
          tipoActivo === "general"
            ? "Expediente General"
            : tipoActivo === "cirugia"
            ? "Expediente Cirugía"
            : "Cuidados en Casa",
        color:
          tipoActivo === "general"
            ? "#00a884"
            : tipoActivo === "cirugia"
            ? "#ef4444"
            : "#007bff",
      };

      const data = { ...formData, ...tipoInfo };

      if (editData && editData._id) {
        // 🧹 Limpieza de campos vacíos o nulos antes de enviar al backend
        const cleanData = Object.fromEntries(
          Object.entries(data).filter(
            ([, v]) => v !== undefined && v !== null && v !== ""
          )
        );

        // 🔹 Asegurar que el campo de contacto sea texto limpio
        if (cleanData.emergencyContact)
          cleanData.emergencyContact = String(
            cleanData.emergencyContact
          ).trim();

        const updated = await updateExpediente(editData._id, cleanData);

        if (updated?.expediente) {
          setRecords((prev) =>
            prev.map((r) =>
              r._id === updated.expediente._id ? updated.expediente : r
            )
          );
        }

        showToast("edit", "✏️ Expediente actualizado correctamente");
      } else {
        const created = await createExpediente(data);
        setRecords((prev) => [...prev, created.expediente]);
        showToast("success", "📁 Expediente creado correctamente");
      }
    } catch (err) {
      console.error("Error guardando expediente:", err.response?.data || err);
      alert(
        "⚠️ Error al guardar expediente:\n" +
          (err.response?.data?.mensaje || err.message)
      );
      showToast("delete", "❌ Error al guardar expediente");
    } finally {
      setActiveModal(null);
      setEditData(null);
      setTempRecord(null);
    }
  }

  /* =========================================================
      🗑️ ELIMINAR EXPEDIENTE
  ========================================================= */
  async function confirmDelete() {
    if (!deleteTarget) return;
    try {
      await deleteExpediente(deleteTarget._id);
      setRecords((prev) => prev.filter((r) => r._id !== deleteTarget._id));
      showToast("delete", "🗑️ Expediente eliminado correctamente");
    } catch (err) {
      console.error("Error eliminando expediente:", err);
      showToast("delete", "❌ No se pudo eliminar expediente");
    } finally {
      setDeleteTarget(null);
    }
  }

  /* =========================================================
      🧾 EXPORTAR A PDF 
  ========================================================= */
  const toDataURL = async (url) => {
    if (typeof url === "string" && url.startsWith("data:")) return url;
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const reader = new FileReader();
      return await new Promise((resolve) => {
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(blob);
      });
    } catch {
      return null;
    }
  };

  // 🔸 Renderiza las imágenes en el PDF
  async function renderImagesSection({
    pdf,
    record,
    y,
    themeColorRGB,
    drawHeader,
  }) {
    const marginX = 15;
    const maxY = 260;
    const title = "Imágenes asociadas";

    if (!record.images?.length) {
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(...themeColorRGB);
      pdf.text(title, marginX, y);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(80);
      pdf.text("No se adjuntaron imágenes.", marginX, y + 6);
      return y + 14;
    }

    if (y + 10 > maxY) {
      pdf.addPage();
      await drawHeader();
      y = 35;
    }

    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(...themeColorRGB);
    pdf.text(title, marginX, y);
    y += 6;

    let imgW = 90;
    let imgH = 60;
    const gap = 10;
    let x = marginX;

    for (const imgObj of record.images) {
      if (y + imgH > maxY) {
        pdf.addPage();
        await drawHeader();
        y = 35;
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(...themeColorRGB);
        pdf.text(`${title} (continuación)`, marginX, y);
        y += 6;
      }
      try {
        const data = await toDataURL(imgObj.url);
        if (data) pdf.addImage(data, "JPEG", x, y, imgW, imgH);
        x += imgW + gap;
        if (x + imgW > 210 - marginX) {
          x = marginX;
          y += imgH + gap;
        }
      } catch {}
    }

    y += 4;
    return y;
  }

  // 🔸 Genera el PDF con diseño en dos columnas
  async function exportPDF(record) {
    if (!record) return;

    const pdf = new jsPDF("p", "mm", "a4");
    const marginX = 15;
    let y = 40;

    // 🎨 Tema según tipo
    let theme = {
      color: [0, 168, 132],
      title: "Expediente General",
      fileName: `expediente-${record.pet || "mascota"}.pdf`,
    };
    if (record.typeLabel === "Expediente Cirugía") {
      theme = {
        color: [239, 68, 68],
        title: "Expediente Quirúrgico",
        fileName: `cirugia-${record.pet || "mascota"}.pdf`,
      };
    } else if (record.typeLabel === "Cuidados en Casa") {
      theme = {
        color: [0, 123, 255],
        title: "Expediente de Cuidados en Casa",
        fileName: `cuidados-${record.pet || "mascota"}.pdf`,
      };
    }

    // 🧠 Encabezado con logo y fecha dentro del recuadro verde (corregido)
    const drawHeader = async () => {
      pdf.setFillColor(...theme.color);
      pdf.rect(0, 0, 210, 30, "F");

      // Título principal (ahora más abajo para que se vea)
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(13);
      pdf.text(theme.title, marginX, 14); // 📍Y ajustado (antes era 12)

      // Fecha de creación (justo debajo del título)
      pdf.setFont("helvetica", "italic");
      pdf.setFontSize(9);
      pdf.setTextColor(240);
      const createdDate = record.createdAt
        ? new Date(record.createdAt).toLocaleString("es-HN", {
            dateStyle: "medium",
            timeStyle: "short",
          })
        : "Fecha no disponible";
      pdf.text(`Creado: ${createdDate}`, marginX, 21);

      //  Mostrar fecha de actualización solo si existe
      if (record.updatedAt && record.updatedAt !== record.createdAt) {
        const updatedDate = new Date(record.updatedAt).toLocaleString("es-HN", {
          dateStyle: "medium",
          timeStyle: "short",
        });
        pdf.text(`Actualizado: ${updatedDate}`, marginX + 90, 21);
      }

      // Logo
      try {
        const img = await toDataURL(logo);
        pdf.addImage(img, "JPEG", 165, 6, 35, 18);
      } catch {}
    };

    await drawHeader();
    y = 42;

    // Información general
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(11);
    pdf.setTextColor(...theme.color);
    pdf.text("Informacion General", marginX, y);
    y += 8;

    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(0);

    const info = [
      ["Dueño:", record.owner],
      ...(record.typeLabel === "Expediente Cirugía"
        ? [["Número de Identidad:", record.identityNumber || "No indicado"]]
        : []),
      ["Mascota:", record.pet],
      ["Teléfono:", record.ownerPhone],
      ["Especie:", record.species],
      [
        "Fecha de Nacimiento",
        record.birthDate
          ? new Date(record.birthDate).toLocaleDateString("es-HN", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
            })
          : "No registrada",
      ],
      ["Doctor Responsable:", record.doctor],
      ["Sucursal:", record.branch],
    ];

    // 🔹 Ajuste inteligente de texto largo y espaciado
    info.forEach(([label, val]) => {
      if (val) {
        pdf.setFont("helvetica", "bold");
        pdf.text(`${label}`, marginX, y);
        pdf.setFont("helvetica", "normal");

        // 💡 Usa splitTextToSize para nombres o textos largos
        const availableWidth = 120;
        const splitValue = pdf.splitTextToSize(String(val), availableWidth);

        // ⚙️ Ajuste dinámico de posición horizontal
        let offsetX = 43;
        if (label === "Número de Identidad:") offsetX = 43;
        if (label === "Doctor Responsable:") offsetX = 43;
        pdf.text(splitValue, marginX + offsetX, y);

        // Calcula la altura según el número de líneas
        y += splitValue.length * 6 + 2;
      }
    });

    // 🩺 Mostrar toda la información si es Expediente General
    if (record.typeLabel === "Expediente General") {
      y += 5;
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(13);
      pdf.setTextColor(...theme.color);
      pdf.text("Informacion Detallada Del Paciente", marginX, y);
      y += 8;

      // 🔙 Volver a negro para etiquetas y valores
      pdf.setTextColor(0, 0, 0);
      const labelFontSize = 12;
      const valueFontSize = 12;

      const general = [
        ["Raza", record.breed || "No especificada"],
        ["Género", record.gender || "No especificado"],
        ["Peso", record.weight || "No especificado"],
        ["Color", record.colorName || "No especificado"],
        [
          "Donante de Sangre",
          record.bloodDonor?.toLowerCase() === "sí"
            ? "Sí"
            : record.bloodDonor?.toLowerCase() === "no"
            ? "No"
            : "No especificado",
        ],
        ["Exámenes a Realizar", record.tests || "No especificado"],
        ["Cirugía Planificada", record.surgeryPlanned || "No especificada"],
        ["Diagnóstico", record.diagnosis || "No especificado"],
        ["Tratamiento", record.treatment || "No especificado"],
        ["Notas Adicionales", record.notes || "Sin observaciones"],
        ["CC a aplicar", record.cc || "No especificado"],
      ];

      // 🔹 Impresión con espaciado dinámico para Información Detallada del Paciente
      for (const [label, value] of general) {
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(11);
        pdf.setTextColor(0);
        pdf.text(`${label}:`, marginX, y);

        pdf.setFont("helvetica", "normal");

        // Ancho máximo para el valor
        const maxWidth = 120;
        const splitValue = pdf.splitTextToSize(String(value), maxWidth);

        // Alinear valores a misma columna (50mm a la derecha del label)
        pdf.text(splitValue, marginX + 50, y);

        // 🟣 Espaciado dinámico según cantidad de líneas del valor
        const lineHeight = 6;
        y += splitValue.length * lineHeight + 3;

        // Evitar desbordar la página
        if (y > 260) {
          pdf.addPage();
          await drawHeader();
          y = 40;
        }
      }

      // ===============================
      // 💉 VACUNAS ADMINISTRADAS
      // ===============================
      if (record.vaccines?.length > 0) {
        y += 10;
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(...theme.color);
        pdf.text("Vacunas administradas", marginX, y);
        y += 6;

        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(0);

        record.vaccines.forEach((v) => {
          const name = v.label || v.name || "Vacuna sin nombre";
          const date = v.when
            ? new Date(v.when).toLocaleString("es-HN", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
              })
            : "Sin fecha";
          pdf.text(`• ${name} (${date})`, marginX + 5, y);
          y += 6;
        });
      } else {
        y += 10;
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(...theme.color);
        pdf.text("Vacunas administradas", marginX, y);
        y += 6;
        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(0);
        pdf.text("No registradas", marginX + 5, y);
        y += 6;
      }

      // ===============================
      // 💊 MEDICAMENTOS ADMINISTRADOS
      // ===============================
      if (record.medications?.length > 0) {
        y += 8;
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(...theme.color);
        pdf.text("Medicamentos administrados", marginX, y);
        y += 6;

        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(0);

        record.medications.forEach((m) => {
          const name = m.label || m.name || "Medicamento sin nombre";
          const dose = m.dose ? ` — Dosis: ${m.dose}` : "";
          const date = m.when
            ? new Date(m.when).toLocaleString("es-HN", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
              })
            : "Sin fecha";
          pdf.text(`• ${name}${dose} (${date})`, marginX + 5, y);
          y += 6;
        });
      } else {
        y += 8;
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(...theme.color);
        pdf.text("Medicamentos administrados", marginX, y);
        y += 6;
        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(0);
        pdf.text("No registrados", marginX + 5, y);
        y += 6;
      }

      /* for (const [label, value] of general) {
  if (y > 260) {
    pdf.addPage();
    await drawHeader();
    y = 65;
  }

  // Etiqueta
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(labelFontSize);
  pdf.setTextColor(0, 0, 0);
  pdf.text(`${label}:`, marginX, y);

  // 🔹 Medir el ancho real de la etiqueta
  const labelWidth = pdf.getTextWidth(`${label}:`);

  // Valor (se ajusta dinámicamente según el largo del label)
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(valueFontSize);
  pdf.setTextColor(0, 0, 0);
  const splitValue = pdf.splitTextToSize(String(value), 120);
  pdf.text(splitValue, marginX + labelWidth + 6, y);

  y += splitValue.length * 6 + 2;
}*/
    }

    // 🔴 Información de Expediente Quirúrgico
    if (record.typeLabel === "Expediente Cirugía") {
      y += 5;
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(...theme.color);
      pdf.text("Expediente Quirúrgico", marginX, y);
      y += 8;

      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(0);

      const cirugia = [
        [
          "Fecha de Cirugía:",
          record.dateTime
            ? new Date(record.dateTime).toLocaleString("es-HN", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
              })
            : "No especificada",
        ],
        ["Sucursal", record.branch || "No especificada"],
        ["Tipo de Cirugía", record.surgeryType || "No especificada"],
        ["Descripción del Caso", record.caseDescription || "No especificada"],
        ["Riesgo 1", record.risk1 || "No especificado"],
        ["Riesgo 2", record.risk2 || "No especificado"],
        ["Riesgo 3", record.risk3 || "No especificado"],
        ["Riesgo 4", record.risk4 || "No especificado"],
        ["Riesgo 5", record.risk5 || "No especificado"],
        ["Riesgo 6", record.risk6 || "No especificado"],
      ];

      for (const [label, value] of cirugia) {
        if (y > 260) {
          pdf.addPage();
          await drawHeader();
          y = 40;
        }

        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(11);
        pdf.text(`${label}:`, marginX, y);

        pdf.setFont("helvetica", "normal");
        const splitValue = pdf.splitTextToSize(String(value), 120);

        if (label === "Número de Identidad") {
          pdf.text(splitValue, marginX + 100, y);
        } else {
          pdf.text(splitValue, marginX + 50, y);
        }

        y += splitValue.length * 6 + 2;
      }
      // 📝 Notas adicionales
      if (record.notes) {
        if (y > 250) {
          pdf.addPage();
          await drawHeader();
          y = 40;
        }

        y += 8;
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(...theme.color);
        pdf.text("Notas Adicionales", marginX, y);
        y += 6;

        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(0);
        const notas = pdf.splitTextToSize(record.notes, 160);
        pdf.text(notas, marginX, y);
        y += notas.length * 6 + 2;
      }

      y += 5;
    }

    //  Solo mostrar medicamentos si es Cuidados en Casa
    if (record.typeLabel === "Cuidados en Casa") {
      y += 5;
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(...theme.color);
      pdf.text("Expediente de Cuidados en Casa", marginX, y);
      y += 8;

      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(0);

      const cuidados = [
        ["Instrucciones Generales", record.instructions || "No especificadas"],
        ["Medicamento", record.medication || "No especificado"],
        [
          "Fecha de inicio de Medicamento",
          record.medicationDate || "No definida",
        ],
        ["Alimentación e Hidratación", record.foodWater || "No especificadas"],
        [
          "Fecha de inicio de Alimentación",
          record.foodWaterDate || "No definida",
        ],
        [
          "Instrucciones de Seguimiento",
          record.followupInstructions || "No especificadas",
        ],
        ["Monitoreo en Casa", record.monitoredAtHome || "No especificado"],
        ["Contacto de Emergencia", record.emergencyContact || "No indicado"],
      ];

      for (const [label, value] of cuidados) {
        // Si se acerca al límite de página, crear nueva
        if (y > 260) {
          pdf.addPage();
          drawHeader();
          y = 70;
        }

        // Label (columna izquierda)
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(11);
        pdf.text(`${label}:`, marginX, y);

        // Valor (columna derecha con salto automático)
        pdf.setFont("helvetica", "normal");
        const splitValue = pdf.splitTextToSize(String(value), 120);
        pdf.text(splitValue, marginX + 65, y);

        // Calcular altura según cantidad de líneas
        y += splitValue.length * 6 + 2;
      }

      y += 5;
    }

    // 🖼️ Imágenes
    y = await renderImagesSection({
      pdf,
      record,
      y,
      themeColorRGB: theme.color,
      drawHeader,
    });

    // 🩶 Marca de agua textual en el pie de cada página
    const pageCount = pdf.internal.getNumberOfPages();

    for (let i = 1; i <= pageCount; i++) {
      pdf.setPage(i);

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      // Configurar estilo del texto
      pdf.setFont("helvetica", "italic");
      pdf.setFontSize(9);
      pdf.setTextColor(150); // gris suave
      pdf.setGState(new pdf.GState({ opacity: 0.5 }));

      // Centrar el texto en la parte inferior
      const text = "Generado por el Sistema PETPLAZA HOSPIVET";
      const textWidth = pdf.getTextWidth(text);
      const x = (pageWidth - textWidth) / 2;
      const y = pageHeight - 10;

      pdf.text(text, x, y);

      // Restaurar opacidad normal
      pdf.setGState(new pdf.GState({ opacity: 1 }));
    }

    pdf.save(theme.fileName);
  }

  /* ==========================================================
     🚀 RENDER PRINCIPAL DEL COMPONENTE
  ========================================================== */
  if ((!user || user.role !== "admin" && user.role !== "veterinario" && user.role !== "laboratorio")) {
    return (
      <div className="medical-section-no-permissions">
        🚫 No tienes permisos para ver Expedientes.
      </div>
    );
  }

  /* =========================================================
      🧱 INTERFAZ PRINCIPAL
  ========================================================= */
  return (
    <div className="medical-section">
      <div className="header-bar">
        <h1>Expedientes</h1>
        <div className="new-record" ref={menuRef}>
          <button className="btn-new" onClick={() => setMenuOpen((s) => !s)}>
            <Plus size={18} /> Nuevo Expediente
          </button>
          {menuOpen && (
            <div className="menu">
              <button onClick={() => onCreate("general")}>
                Expediente General
              </button>
              <button onClick={() => onCreate("surgery")}>Quirúrgico</button>
              <button onClick={() => onCreate("care")}>Cuidados en Casa</button>
            </div>
          )}
        </div>
      </div>

      <div className="filters">
        <select
          className="ctl"
          value={filterPet}
          onChange={(e) => setFilterPet(e.target.value)}
        >
          <option value="">Seleccionar mascota</option>
          {pets.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>

        <select
          className="ctl"
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
        >
          <option value="Todos">Todos</option>
          <option value="Expediente General">Expediente General</option>
          <option value="Expediente Cirugía">Expediente Cirugía</option>
          <option value="Cuidados en Casa">Cuidados en Casa</option>
        </select>

        <div className="search ctl">
          <Search className="ico" size={18} />
          <input
            placeholder="Buscar en expedientes..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="loading">Cargando expedientes...</div>
      ) : (
        <div className="cards">
          {filtered.map((r) => (
            <article
              key={r._id}
              className="card"
              style={{ borderLeftColor: r.color || "#00a884" }}
              onClick={() => setPreviewData(r)}
            >
              <header className="card-head">
                <h3>{r.typeLabel}</h3>
                <p>
                  {r.pet} ({r.species}) • {r.owner}
                </p>
                <p className="sub">
                  Doctor: {r.doctor || "-"} • Fecha: {r.date}
                </p>
              </header>
              <div className="actions" onClick={(e) => e.stopPropagation()}>
                <button className="btn edit" onClick={() => onEdit(r)}>
                  <Edit size={16} /> Editar
                </button>
                <button className="btn del" onClick={() => setDeleteTarget(r)}>
                  <Trash2 size={16} /> Borrar
                </button>
                <button className="btn pdf" onClick={() => exportPDF(r)}>
                  <FileDown size={16} /> Exportar PDF
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Formularios según tipo */}
      {activeModal === "general" && (
        <GeneralRecordForm
          editData={editData || tempRecord}
          onClose={() => {
            setActiveModal(null);
            setEditData(null);
          }}
          onSave={onSave}
          onLink={handleLinkRecord}
        />
      )}
      {activeModal === "surgery" && (
        <SurgeryRecordForm
          editData={editData || tempRecord}
          onClose={() => {
            setActiveModal(null);
            setEditData(null);
          }}
          onSave={onSave}
          onLink={handleLinkRecord}
        />
      )}
      {activeModal === "care" && (
        <HomeCareRecordForm
          editData={editData || tempRecord}
          onClose={() => {
            setActiveModal(null);
            setEditData(null);
          }}
          onSave={onSave}
          onLink={handleLinkRecord}
        />
      )}

      {/* Confirmación de eliminación */}
      {deleteTarget && (
        <div className="overlay">
          <div className="confirm neon-zoom">
            <AlertTriangle size={42} color="#d44" />
            <h3>¿Eliminar expediente?</h3>
            <p>
              Se eliminará <b>{deleteTarget.typeLabel}</b> de{" "}
              <b>{deleteTarget.pet}</b>.
            </p>
            <div className="row">
              <button className="yes" onClick={confirmDelete}>
                Sí, eliminar
              </button>
              <button className="no" onClick={() => setDeleteTarget(null)}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Vista previa */}
      {previewData && (
        <RecordPreviewModal
          record={previewData}
          onClose={() => setPreviewData(null)}
        />
      )}

      {/* Notificaciones */}
      {toast && (
        <div className={`toast ${toast.type}`}>
          {toast.type === "success" && <CheckCircle2 size={20} />}
          {toast.type === "delete" && <AlertTriangle size={20} />}
          {toast.type === "edit" && <Pencil size={20} />}
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
};
export default MedicalRecords;
