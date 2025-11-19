// src/components/Reports.js
import React, { useState, useEffect } from "react";
import { X, Loader2 } from "lucide-react";
import * as XLSX from "xlsx-js-style";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import "../CSS/Reports.css";

// 🧾 API real del backend
import { generateReport, getAllReports } from "../apis/reportsApi";

// Logo
import petplazaLogo from "../assets/LogoReports.jpeg";

/* === ICONOS PNG === */
import ExportarPDFIcon from "../assets/icons/Exportarpdf.png";
import ExportarXLSXIcon from "../assets/icons/Exportarxlsx.png";
import LempiraIcon from "../assets/icons/lempira.png";
import FacturaIcon from "../assets/icons/factura.png";
import PrecioMedioIcon from "../assets/icons/precio-de-venta-medio.png";
import VentaProductosIcon from "../assets/icons/venta-de-productos.png";

/**
 * Reports.js — Módulo actualizado con backend real
 * 🔹 Conecta con /api/reports/generate y /api/reports
 * 🔹 Incluye modales y exportaciones reales
 */
const Reports = ({ user }) => {
  /* ==========================================================
     📦 ESTADOS PRINCIPALES
  ========================================================== */
  const [reportData, setReportData] = useState(null); // Datos del reporte actual
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [reportsHistory, setReportsHistory] = useState([]); // Historial
  const [selectedCard, setSelectedCard] = useState(null);
  const [closing, setClosing] = useState(false);

  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setDate(new Date().getDate() - 7))
      .toISOString()
      .split("T")[0],
    end: new Date().toISOString().split("T")[0],
  });

  /* ==========================================================
     🪄 TOAST DE NOTIFICACIÓN (al cargar último reporte)
  ========================================================== */
  const [showToast, setShowToast] = useState(false);
  const [toastType, setToastType] = useState("info"); // 'success', 'error' o 'info'
  const [toastMessage, setToastMessage] = useState("");

  /* ==========================================================
     🧩 CARGA DEL LOGO PARA EXPORTACIÓN PDF
  ========================================================== */
  const [logoDataURL, setLogoDataURL] = useState(null);
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.src = petplazaLogo;
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);
      setLogoDataURL(canvas.toDataURL("image/jpeg"));
    };
  }, []);

  /* ==========================================================
     🚀 FUNCIÓN: GENERAR REPORTE DESDE BACKEND
  ========================================================== */
  const handleGenerateReport = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await generateReport(dateRange.start, dateRange.end);

      if (res.ok) {
        setReportData(res.reporte);
        loadReportsHistory();

        // ✅ Mensaje de éxito
        setToastType("success");
        setToastMessage("✅ Reporte generado correctamente");
        setShowToast(true);
      } else {
        setError("No se pudo generar el reporte");

        // ⚠️ Mensaje de error controlado
        setToastType("error");
        setToastMessage("⚠️ No se pudo generar el reporte");
        setShowToast(true);
      }
    } catch (err) {
      console.error("❌ Error:", err);

      // ❌ Mensaje de error inesperado
      setToastType("error");
      setToastMessage("❌ Ocurrió un error al generar el reporte");
      setShowToast(true);
    } finally {
      setLoading(false);
    }
  };

  /* ==========================================================
     🗃️ FUNCIÓN: CARGAR HISTORIAL DE REPORTES
  ========================================================== */
  const loadReportsHistory = async () => {
    try {
      const data = await getAllReports();
      setReportsHistory(data);
    } catch (err) {
      console.error("❌ Error cargando historial:", err);
    }
  };

  useEffect(() => {
    loadReportsHistory();
  }, []);

  // ==========================================================
  // ♻️ Cargar último reporte generado (persistente entre módulos)
  // ==========================================================
  useEffect(() => {
    const cargarUltimoReporte = async () => {
      try {
        // 1️⃣ Intentar cargar desde localStorage (más rápido)
        const local = localStorage.getItem("ultimoReporte");
        if (local) {
          setReportData(JSON.parse(local));
        }

        // 2️⃣ Luego, sincronizar con backend (si existe historial)
        const data = await getAllReports();
        if (data && data.length > 0) {
          setReportData(data[0]); // el más reciente

          // ✅ Mostrar notificación visual
          setShowToast(true);
          setTimeout(() => setShowToast(false), 4000); // desaparece en 4s
        }
      } catch (err) {
        console.error("❌ Error cargando último reporte:", err);
      }
    };

    cargarUltimoReporte();
  }, []);

  useEffect(() => {
    if (showToast) {
      const timer = setTimeout(() => {
        setShowToast(false);
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [showToast]);

  /* ==========================================================
     ⚙️ FUNCIONES DE FORMATO
  ========================================================== */
  const formatNumber = (num) =>
    new Intl.NumberFormat("es-HN").format(Number(num) || 0);

  const formatCurrency = (num) => {
    const value = new Intl.NumberFormat("es-HN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number(num) || 0);
    return `L ${value}`;
  };

  /* ==========================================================
     📋 FUNCIONES DE EXPORTACIÓN (Excel / PDF)
  ========================================================== */
  const exportToExcel = (data, fileName, sheetName) => {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    XLSX.writeFile(workbook, `${fileName}.xlsx`);
  };

  const exportToPDF = (
    data,
    fileName,
    columns,
    options = { currency: true }
  ) => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(fileName, 14, 15);

    const LOGO_MAX_W_MM = 42;
    const LOGO_WIDTH_FRACTION = 0.3;
    let startY = 25;
    let logoLayout = null;

    if (logoDataURL) {
      const pageWidth = doc.internal.pageSize.getWidth();
      let props;
      try {
        props = doc.getImageProperties(logoDataURL);
      } catch {
        props = { width: 1, height: 1 };
      }
      const aspect = props.height / props.width;
      const targetWmm = Math.min(
        LOGO_MAX_W_MM,
        pageWidth * LOGO_WIDTH_FRACTION
      );
      const targetHmm = targetWmm * aspect;
      logoLayout = { pageWidth, logoW: targetWmm, logoH: targetHmm };
      startY = Math.max(startY, targetHmm + 12);
    }

    const formattedData = data.map((row) =>
      row.map((value) =>
        typeof value === "number" && options.currency
          ? new Intl.NumberFormat("es-HN", {
              style: "currency",
              currency: "HNL",
            }).format(value)
          : value
      )
    );

    autoTable(doc, {
      startY,
      head: [columns],
      body: formattedData,
      styles: { fontSize: 10, cellPadding: 3 },
      headStyles: { fillColor: [20, 40, 60], halign: "center" },
      bodyStyles: { halign: "left" },
      margin: { left: 14, right: 14 },
      theme: "grid",
    });

    if (logoLayout && logoDataURL) {
      const { pageWidth, logoW, logoH } = logoLayout;
      const x = pageWidth - logoW - 10;
      const y = 8;
      const total = doc.getNumberOfPages();
      for (let i = 1; i <= total; i++) {
        doc.setPage(i);
        doc.addImage(logoDataURL, "JPEG", x, y, logoW, logoH);
      }
    }

    doc.save(`${fileName}.pdf`);
  };
  /* ==========================================================
   💳 EXPORTAR DETALLE DE FACTURAS POR MÉTODO DE PAGO (PDF)
   ✅ Versión mejorada con diseño moderno y totales automáticos
========================================================== */
  const exportPaymentSummaryPDF = async () => {
    try {
      // 1️⃣ Obtener todas las facturas
      const { getFacturas } = await import("../apis/facturasApi");
      const facturas = await getFacturas();

      if (!facturas || facturas.length === 0) {
        alert("No hay facturas registradas para generar el reporte.");
        return;
      }

      // 2️⃣ Agrupar por método de pago
      const resumen = {};
      facturas.forEach((f) => {
        const metodo = f.metodoPago || "Desconocido";
        resumen[metodo] = (resumen[metodo] || 0) + 1;
      });

      const total = Object.values(resumen).reduce((a, b) => a + b, 0);
      const data = Object.entries(resumen).map(([metodo, cantidad]) => ({
        metodo,
        cantidad,
        porcentaje: ((cantidad / total) * 100).toFixed(1) + "%",
      }));

      // 3️⃣ Generar el PDF
      const doc = new jsPDF("p", "mm", "a4");
      const fechaActual = new Date().toLocaleDateString("es-HN");

      // === LOGO ===
      if (logoDataURL) {
        const logoWidth = 38;
        const logoHeight = 38;
        const pageWidth = doc.internal.pageSize.getWidth();
        doc.addImage(
          logoDataURL,
          "JPEG",
          pageWidth - logoWidth - 20,
          12,
          logoWidth,
          logoHeight
        );
      }

      // === TÍTULO PRINCIPAL ===
      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.setTextColor(30, 50, 100);
      doc.text("Reporte de Facturas por Método de Pago", 20, 30);

      // === SUBTÍTULO ===
      doc.setFontSize(12);
      doc.setTextColor(80);
      doc.text(`Generado el ${fechaActual}`, 20, 38);

      // === TABLA DE MÉTODOS DE PAGO ===
      const tableData = data.map((item) => [
        item.metodo,
        item.cantidad,
        item.porcentaje,
      ]);

      autoTable(doc, {
        startY: 50,
        head: [["Método de Pago", "Cantidad", "Porcentaje"]],
        body: tableData,
        theme: "grid",
        headStyles: {
          fillColor: [25, 60, 120],
          textColor: [255, 255, 255],
          halign: "center",
          fontStyle: "bold",
        },
        bodyStyles: {
          halign: "center",
          textColor: [30, 30, 30],
        },
        alternateRowStyles: { fillColor: [245, 247, 250] },
        styles: { fontSize: 11, cellPadding: 4 },
        margin: { left: 18, right: 18 },
      });

      // === TOTAL GENERAL ===
      const finalY = doc.lastAutoTable.finalY + 10;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.setTextColor(30, 50, 100);
      doc.text(`Total general: ${total} facturas emitidas`, 20, finalY);

      // === PIE DE PÁGINA ===
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(
        "PetPlaza Hospivet — Sistema de Gestión Veterinaria",
        20,
        finalY + 12
      );
      doc.text("© 2025 - Todos los derechos reservados", 20, finalY + 18);

      // === GUARDAR PDF ===
      doc.save(`Reporte_Facturas_MetodosPago_${fechaActual}.pdf`);
    } catch (err) {
      console.error("❌ Error generando PDF de métodos de pago:", err);
      alert("Error generando el PDF de facturas por método de pago.");
    }
  };

  /* ==========================================================
   📊 EXPORTAR DETALLE DE FACTURAS POR MÉTODO DE PAGO (EXCEL)
   💎 Versión con colores reales y estilos aplicados (xlsx-js-style)
========================================================== */
  const exportPaymentSummaryExcel = async () => {
    try {
      const { getFacturas } = await import("../apis/facturasApi");
      const facturas = await getFacturas();

      if (!facturas || facturas.length === 0) {
        alert("No hay facturas registradas para generar el reporte.");
        return;
      }

      // === Agrupar por método de pago ===
      const resumen = {};
      facturas.forEach((f) => {
        const metodo = f.metodoPago || "Desconocido";
        resumen[metodo] = (resumen[metodo] || 0) + 1;
      });

      const total = Object.values(resumen).reduce((a, b) => a + b, 0);
      const data = Object.entries(resumen).map(([metodo, cantidad]) => ({
        metodo,
        cantidad,
        porcentaje: ((cantidad / total) * 100).toFixed(1) + "%",
      }));

      const fecha = new Date().toLocaleDateString("es-HN");

      // === Construir contenido ===
      const wsData = [
        ["PETPLAZA HOSPIVET"],
        ["Reporte de Facturas por Método de Pago"],
        [`Generado el ${fecha}`],
        [],
        ["Método de Pago", "Cantidad", "Porcentaje"],
        ...data.map((d) => [d.metodo, d.cantidad, d.porcentaje]),
        [],
        ["Total General", total, "100%"],
      ];

      // === Crear hoja ===
      const ws = XLSX.utils.aoa_to_sheet(wsData);

      // === Aplicar estilos reales ===
      const range = XLSX.utils.decode_range(ws["!ref"]);
      for (let R = range.s.r; R <= range.e.r; ++R) {
        for (let C = range.s.c; C <= range.e.c; ++C) {
          const ref = XLSX.utils.encode_cell({ r: R, c: C });
          const cell = ws[ref];
          if (!cell) continue;

          // === Estilo base ===
          cell.s = {
            alignment: { horizontal: "center", vertical: "center" },
            font: { name: "Calibri", sz: 11, color: { rgb: "111827" } },
          };

          // === Título principal ===
          if (R === 0) {
            cell.s = {
              font: { bold: true, sz: 18, color: { rgb: "FFFFFF" } },
              alignment: { horizontal: "center", vertical: "center" },
              fill: { fgColor: { rgb: "2563EB" } },
            };
          }

          // === Subtítulo ===
          if (R === 1) {
            cell.s = {
              font: { bold: true, sz: 13, color: { rgb: "1E3A8A" } },
              alignment: { horizontal: "center" },
            };
          }

          // === Fecha ===
          if (R === 2) {
            cell.s = {
              font: { italic: true, sz: 11, color: { rgb: "6B7280" } },
              alignment: { horizontal: "center" },
            };
          }

          // === Cabecera ===
          if (R === 4) {
            cell.s = {
              font: { bold: true, color: { rgb: "FFFFFF" } },
              alignment: { horizontal: "center" },
              fill: { fgColor: { rgb: "2563EB" } },
            };
          }

          // === Total General ===
          if (R === wsData.length - 1) {
            cell.s = {
              font: { bold: true, color: { rgb: "111827" } },
              fill: { fgColor: { rgb: "E5E7EB" } },
            };
          }
        }
      }

      // === Ajuste de ancho ===
      ws["!cols"] = [{ wch: 25 }, { wch: 12 }, { wch: 15 }];

      // === Fusionar celdas ===
      ws["!merges"] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 2 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: 2 } },
        { s: { r: 2, c: 0 }, e: { r: 2, c: 2 } },
      ];

      // === Crear workbook y guardar ===
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Métodos de Pago");
      XLSX.writeFile(wb, `Reporte_Facturas_MetodosPago_${fecha}.xlsx`);
    } catch (err) {
      console.error("❌ Error exportando Excel:", err);
      alert("Error generando el Excel.");
    }
  };

  // ==========================================================
  // 📄 PDF — Ventas Diarias (tarjeta) con diseño moderno
  // ==========================================================
  const exportDailySalesPDF = () => {
    if (!reportData?.details?.salesByDay?.length) {
      alert("No hay datos de ventas diarias.");
      return;
    }

    const fechaGenerado = new Date().toLocaleDateString("es-HN");
    const rows = reportData.details.salesByDay.map((d) => [
      d.date,
      new Intl.NumberFormat("es-HN", {
        style: "currency",
        currency: "HNL",
        minimumFractionDigits: 2,
      }).format(d.total),
    ]);
    const total = reportData.details.salesByDay.reduce(
      (a, b) => a + (Number(b.total) || 0),
      0
    );

    const doc = new jsPDF("p", "mm", "a4");

    // Encabezado
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(30, 50, 100);
    doc.text("Ventas Diarias", 20, 22);

    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(90);
    doc.text(`Generado el ${fechaGenerado}`, 20, 29);

    // Si hay logo cargado, colócalo
    if (logoDataURL) {
      const pageWidth = doc.internal.pageSize.getWidth();
      const w = 36,
        h = 36;
      doc.addImage(logoDataURL, "JPEG", pageWidth - w - 18, 12, w, h);
    }

    // Tabla
    autoTable(doc, {
      startY: 45,
      head: [["Fecha", "Total (L.)"]],
      body: rows,
      theme: "grid",
      styles: { fontSize: 11, cellPadding: 4, halign: "left" },
      headStyles: {
        fillColor: [25, 60, 120],
        textColor: 255,
        halign: "center",
        fontStyle: "bold",
      },
      bodyStyles: [{}, { halign: "right" }], // 2ª columna alineada a la derecha
      alternateRowStyles: { fillColor: [246, 248, 251] },
      margin: { left: 18, right: 18 },
    });

    // Total final
    const y = doc.lastAutoTable.finalY + 8;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(30, 50, 100);
    doc.text(
      `Total del período: ${new Intl.NumberFormat("es-HN", {
        style: "currency",
        currency: "HNL",
        minimumFractionDigits: 2,
      }).format(total)}`,
      20,
      y
    );

    doc.save(`Ventas_Diarias_${fechaGenerado}.pdf`);
  };

  // ==========================================================
  // 📊 Excel — Ventas Diarias (tarjeta) con estilos (xlsx-js-style)
  // ==========================================================
  const exportDailySalesExcel = () => {
    if (!reportData?.details?.salesByDay?.length) {
      alert("No hay datos de ventas diarias.");
      return;
    }

    const fecha = new Date().toLocaleDateString("es-HN");
    const wsData = [
      ["PETPLAZA HOSPIVET"],
      ["Ventas Diarias"],
      [`Generado el ${fecha}`],
      [],
      ["Fecha", "Total (L.)"],
      ...reportData.details.salesByDay.map((d) => [
        d.date,
        Number(d.total) || 0,
      ]),
      [],
      [
        "Total del período",
        reportData.details.salesByDay.reduce(
          (a, b) => a + (Number(b.total) || 0),
          0
        ),
      ],
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Rango
    const range = XLSX.utils.decode_range(ws["!ref"]);
    for (let R = range.s.r; R <= range.e.r; ++R) {
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const ref = XLSX.utils.encode_cell({ r: R, c: C });
        const cell = ws[ref];
        if (!cell) continue;

        // Base
        cell.s = {
          alignment: { horizontal: "center", vertical: "center" },
          font: { name: "Calibri", sz: 11, color: { rgb: "111827" } },
        };

        if (R === 0) {
          cell.s = {
            font: { bold: true, sz: 18, color: { rgb: "FFFFFF" } },
            alignment: { horizontal: "center" },
            fill: { fgColor: { rgb: "1F2937" } }, // gris azulado header
          };
        } else if (R === 1) {
          cell.s = {
            font: { bold: true, sz: 13, color: { rgb: "1E3A8A" } },
            alignment: { horizontal: "center" },
          };
        } else if (R === 2) {
          cell.s = {
            font: { italic: true, sz: 11, color: { rgb: "6B7280" } },
            alignment: { horizontal: "center" },
          };
        } else if (R === 4) {
          // encabezados tabla
          cell.s = {
            font: { bold: true, color: { rgb: "FFFFFF" } },
            alignment: { horizontal: "center" },
            fill: { fgColor: { rgb: "2563EB" } },
          };
        } else if (R > 4 && R < wsData.length - 2) {
          // Filas de datos
          if (C === 1) {
            cell.z = '"L" #,##0.00'; // formato moneda HNL
            cell.s.alignment = { horizontal: "right", vertical: "center" };
          } else {
            cell.s.alignment = { horizontal: "center", vertical: "center" };
          }
        } else if (R === wsData.length - 1) {
          // Total final
          cell.s = {
            font: { bold: true, color: { rgb: "111827" } },
            fill: { fgColor: { rgb: "E5E7EB" } },
          };
          if (C === 1) {
            cell.z = '"L" #,##0.00';
            cell.s.alignment = { horizontal: "right", vertical: "center" };
          }
        }
      }
    }

    // Anchos
    ws["!cols"] = [{ wch: 16 }, { wch: 16 }];

    // Merges (títulos centrados)
    ws["!merges"] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 1 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 1 } },
      { s: { r: 2, c: 0 }, e: { r: 2, c: 1 } },
    ];

    // Borde suave para la tabla
    const addBorder = (r1, c1, r2, c2) => {
      for (let r = r1; r <= r2; r++) {
        for (let c = c1; c <= c2; c++) {
          const ref = XLSX.utils.encode_cell({ r, c });
          if (!ws[ref]) continue;
          ws[ref].s = ws[ref].s || {};
          ws[ref].s.border = {
            top: { style: "thin", color: { rgb: "D1D5DB" } },
            left: { style: "thin", color: { rgb: "D1D5DB" } },
            bottom: { style: "thin", color: { rgb: "D1D5DB" } },
            right: { style: "thin", color: { rgb: "D1D5DB" } },
          };
        }
      }
    };
    // borde desde encabezado (fila 4) hasta el total (última -1)
    addBorder(4, 0, wsData.length - 2, 1);

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Ventas");
    XLSX.writeFile(wb, `Ventas_Diarias_${fecha}.xlsx`);
  };

  // ==========================================================
  // 📄 PDF — Productos con Stock Bajo (tarjeta)
  // ==========================================================
  const exportLowStockPDF = () => {
    const productos = reportData?.details?.lowStockProducts;
    if (!productos?.length) {
      alert("No hay productos con stock bajo.");
      return;
    }

    const fecha = new Date().toLocaleDateString("es-HN");
    const doc = new jsPDF("p", "mm", "a4");

    // === LOGO ===
    if (logoDataURL) {
      const pageWidth = doc.internal.pageSize.getWidth();
      const logoW = 36,
        logoH = 36;
      doc.addImage(
        logoDataURL,
        "JPEG",
        pageWidth - logoW - 20,
        12,
        logoW,
        logoH
      );
    }

    // === TÍTULO ===
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(30, 50, 100);
    doc.text("Reporte de Productos con Stock Bajo", 20, 30);

    // === SUBTÍTULO ===
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(90);
    doc.text(`Generado el ${fecha}`, 20, 38);

    // === TABLA ===
    const data = productos.map((p) => [p.name, p.quantity]);

    autoTable(doc, {
      startY: 50,
      head: [["Producto", "Cantidad"]],
      body: data,
      theme: "grid",
      styles: { fontSize: 11, cellPadding: 4 },
      headStyles: {
        fillColor: [25, 60, 120],
        textColor: 255,
        halign: "center",
        fontStyle: "bold",
      },
      bodyStyles: { halign: "center" },
      alternateRowStyles: { fillColor: [247, 249, 252] },
      margin: { left: 18, right: 18 },
    });

    // === TOTAL ===
    const totalProductos = productos.length;
    const finalY = doc.lastAutoTable.finalY + 10;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(30, 50, 100);
    doc.text(
      `Total de productos con bajo stock: ${totalProductos}`,
      20,
      finalY
    );

    // === PIE ===
    doc.setFont("helvetica", "italic");
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(
      "PetPlaza Hospivet — Sistema de Gestión Veterinaria",
      20,
      finalY + 10
    );
    doc.text("© 2025 - Todos los derechos reservados", 20, finalY + 16);

    // === GUARDAR ===
    doc.save(`Productos_Stock_Bajo_${fecha}.pdf`);
  };

  // ==========================================================
  // 📊 Excel — Productos con Stock Bajo (tarjeta)
  // ==========================================================
  const exportLowStockExcel = () => {
    const productos = reportData?.details?.lowStockProducts;
    if (!productos?.length) {
      alert("No hay productos con stock bajo.");
      return;
    }

    const fecha = new Date().toLocaleDateString("es-HN");

    const wsData = [
      ["PETPLAZA HOSPIVET"],
      ["Reporte de Productos con Stock Bajo"],
      [`Generado el ${fecha}`],
      [],
      ["Producto", "Cantidad"],
      ...productos.map((p) => [p.name, p.quantity]),
      [],
      ["Total de productos con bajo stock", productos.length],
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // === Estilos ===
    const range = XLSX.utils.decode_range(ws["!ref"]);
    for (let R = range.s.r; R <= range.e.r; ++R) {
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const ref = XLSX.utils.encode_cell({ r: R, c: C });
        const cell = ws[ref];
        if (!cell) continue;

        // Base
        cell.s = {
          alignment: { horizontal: "center", vertical: "center" },
          font: { name: "Calibri", sz: 11, color: { rgb: "111827" } },
        };

        if (R === 0) {
          cell.s = {
            font: { bold: true, sz: 18, color: { rgb: "FFFFFF" } },
            alignment: { horizontal: "center" },
            fill: { fgColor: { rgb: "1F2937" } },
          };
        } else if (R === 1) {
          cell.s = {
            font: { bold: true, sz: 14, color: { rgb: "1E3A8A" } },
            alignment: { horizontal: "center" },
          };
        } else if (R === 2) {
          cell.s = {
            font: { italic: true, sz: 11, color: { rgb: "6B7280" } },
            alignment: { horizontal: "center" },
          };
        } else if (R === 4) {
          // Encabezado
          cell.s = {
            font: { bold: true, color: { rgb: "FFFFFF" } },
            alignment: { horizontal: "center" },
            fill: { fgColor: { rgb: "2563EB" } },
          };
        } else if (R > 4 && R < wsData.length - 2) {
          // Filas
          cell.s = {
            alignment: { horizontal: "center" },
            border: {
              top: { style: "thin", color: { rgb: "D1D5DB" } },
              bottom: { style: "thin", color: { rgb: "D1D5DB" } },
            },
          };
        } else if (R === wsData.length - 1) {
          // Total
          cell.s = {
            font: { bold: true, color: { rgb: "111827" } },
            fill: { fgColor: { rgb: "E5E7EB" } },
          };
        }
      }
    }

    // Fusionar encabezados
    ws["!merges"] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 1 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 1 } },
      { s: { r: 2, c: 0 }, e: { r: 2, c: 1 } },
    ];

    // Anchos de columna
    ws["!cols"] = [{ wch: 35 }, { wch: 15 }];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Stock Bajo");
    XLSX.writeFile(wb, `Productos_Stock_Bajo_${fecha}.xlsx`);
  };

  /* ==========================================================
     🧩 FUNCIÓN PARA CIERRE SUAVE DE MODALES
  ========================================================== */
  const handleClose = () => {
    setClosing(true);
    setTimeout(() => {
      setSelectedCard(null);
      setClosing(false);
    }, 300);
  };

  /* ==========================================================
   🔔 NOTIFICACIÓN VISUAL (TOAST) — CON ANIMACIÓN SUAVE
  ========================================================== */
  const Toast = () => (
    <div className={`reports-toast ${toastType} ${showToast ? "show" : ""}`}>
      {toastMessage || "🔄 Último reporte cargado automáticamente"}
    </div>
  );

  /* ==========================================================
     🚀 RENDER PRINCIPAL DEL COMPONENTE
  ========================================================== */
  if (!user || user.role !== "admin") {
    return (
      <div className="reports-no-permissions">
        🚫 No tienes permisos para ver la Gestión de reportes.
      </div>
    );
  }

  return (
    <div className="reports-container">
      <Toast />
      {/* =====================================================
          HEADER CON GENERADOR DE REPORTES
      ====================================================== */}
      <div className="reports-header">
        <h1>Informes</h1>

        <div className="reports-date-picker">
          <input
            type="date"
            value={dateRange.start}
            onChange={(e) =>
              setDateRange({ ...dateRange, start: e.target.value })
            }
          />
          <span>-</span>
          <input
            type="date"
            value={dateRange.end}
            onChange={(e) =>
              setDateRange({ ...dateRange, end: e.target.value })
            }
          />

          <button
            className="btn-modern generate"
            onClick={handleGenerateReport}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="spin" size={16} /> Generando...
              </>
            ) : (
              "Generar Reporte"
            )}
          </button>
        </div>
      </div>

      {/* =====================================================
          LOADER (pantalla de carga)
      ====================================================== */}
      {loading && (
        <div className="reports-loading">
          <Loader2 className="spin" size={36} />
          <p>Generando reporte...</p>
        </div>
      )}

      {/* =====================================================
          CONTENIDO PRINCIPAL (si hay datos)
      ====================================================== */}
      {!loading && reportData && (
        <>
          {/* TARJETAS DE ESTADÍSTICAS */}
          <div className="reports-stats-grid">
            {/* Ventas Totales */}
            <div
              className={`reports-stats-card ventas ${
                selectedCard === "ventas" ? "active" : ""
              }`}
              onClick={() => setSelectedCard("ventas")}
            >
              <div>
                <h3>
                  {formatCurrency(reportData.metrics.totalSales.toFixed(2))}
                </h3>
                <p>Ventas Totales</p>
              </div>
              <div className="icon-wrapper">
                <img src={LempiraIcon} alt="Ventas Totales" />
              </div>
            </div>

            {/* Facturas Emitidas */}
            <div
              className={`reports-stats-card facturas ${
                selectedCard === "facturas" ? "active" : ""
              }`}
              onClick={() => setSelectedCard("facturas")}
            >
              <div>
                <h3>{formatNumber(reportData.metrics.totalInvoices)}</h3>
                <p>Facturas Emitidas</p>
              </div>
              <div className="icon-wrapper">
                <img src={FacturaIcon} alt="Facturas Emitidas" />
              </div>
            </div>

            {/* Promedio por Venta */}
            <div
              className={`reports-stats-card promedio ${
                selectedCard === "promedio" ? "active" : ""
              }`}
              onClick={() => setSelectedCard("promedio")}
            >
              <div>
                <h3>
                  {formatCurrency(reportData.metrics.averageSale.toFixed(2))}
                </h3>
                <p>Promedio por Venta</p>
              </div>
              <div className="icon-wrapper">
                <img src={PrecioMedioIcon} alt="Promedio por Venta" />
              </div>
            </div>

            {/* Productos con Stock Bajo */}
            <div
              className={`reports-stats-card agotados ${
                selectedCard === "stock" ? "active" : ""
              }`}
              onClick={() => setSelectedCard("stock")}
            >
              <div>
                <h3>{formatNumber(reportData.metrics.lowStockCount)}</h3>
                <p>Productos con Stock Bajo</p>
              </div>
              <div className="icon-wrapper">
                <img src={VentaProductosIcon} alt="Stock Bajo" />
              </div>
            </div>
          </div>

          {/* =====================================================
              SECCIÓN DE DETALLES INFERIORES
          ====================================================== */}
          <div className="reports-grid">
            {/* =================== VENTAS DIARIAS =================== */}
            <div
              className="reports-card"
              onClick={() => setSelectedCard("ventas")}
            >
              <div className="reports-card-header">
                <h2>Ventas Diarias</h2>
                <div className="export-buttons">
                  <button
                    className="btn-modern excel"
                    onClick={(e) => {
                      e.stopPropagation();
                      exportDailySalesExcel(); // ✅ usa la nueva función
                    }}
                  >
                    <img
                      src={ExportarXLSXIcon}
                      alt="Exportar Excel"
                      className="btn-icon"
                    />
                    Excel
                  </button>

                  <button
                    className="btn-modern pdf"
                    onClick={(e) => {
                      e.stopPropagation();
                      exportDailySalesPDF(); // ✅ usa la nueva función
                    }}
                  >
                    <img
                      src={ExportarPDFIcon}
                      alt="Exportar PDF"
                      className="btn-icon"
                    />
                    PDF
                  </button>
                </div>
              </div>

              <div className="reports-sales-list">
                {(() => {
                  // 🧮 Calcular el total más alto
                  const maxVenta = Math.max(
                    ...reportData.details.salesByDay.map((s) => s.total)
                  );

                  // 🧩 Definir el ancho máximo de la barra (para no pasarse)
                  const maxWidth = 100; // porcentaje máximo

                  return reportData.details.salesByDay.map((day, i) => {
                    // 🔹 Calcular proporción real (respetando el máximo)
                    let ancho = (day.total / maxVenta) * maxWidth;

                    // Evitar que barras pequeñas se vean invisibles
                    if (ancho < 10 && day.total > 0) ancho = 10;

                    // Evitar sobrepasar límites
                    if (ancho > 100) ancho = 100;

                    return (
                      <div key={i} className="reports-sales-item">
                        <span className="reports-sales-date">{day.date}</span>
                        <div className="reports-bar-container">
                          <div
                            className="reports-bar"
                            style={{
                              width: `${ancho}%`,
                              background:
                                "linear-gradient(90deg, #16a34a, #22c55e)",
                              borderRadius: "6px",
                              transition: "width 0.6s ease-in-out",
                            }}
                          ></div>
                          <span className="reports-value">
                            {formatCurrency(day.total)}
                          </span>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
            {/* =================== INVENTARIO POR CATEGORÍA =================== */}
            <div
              className="reports-card"
              onClick={() => setSelectedCard("inventario")}
            >
              <div className="reports-card-header">
                <h2>Inventario por Categoría</h2>
                <div className="export-buttons">
                  {/* === NUEVO BOTÓN EXCEL MODERNO === */}
                  <button
                    className="btn-modern excel"
                    onClick={async (e) => {
                      e.stopPropagation();

                      try {
                        const XLSX = await import("xlsx-js-style");
                        const fecha = new Date().toLocaleDateString("es-HN");

                        // === Datos del inventario por categoría ===
                        const inventario =
                          reportData.details.inventoryByCategory.map(
                            (item) => ({
                              Categoría: item.category,
                              Productos: item.products,
                              "Total (L.)": Number(item.total).toFixed(2),
                            })
                          );

                        // === Totales ===
                        const totalCategorias = inventario.length;
                        const totalGeneral = inventario.reduce(
                          (acc, i) => acc + Number(i["Total (L.)"]),
                          0
                        );

                        // === Estructura de la hoja ===
                        const wsData = [
                          ["PETPLAZA HOSPIVET"],
                          ["Reporte de Inventario por Categoría"],
                          [`Generado el ${fecha}`],
                          [],
                          ["Categoría", "Productos", "Total (L.)"],
                          ...inventario.map((i) => [
                            i.Categoría,
                            i.Productos,
                            i["Total (L.)"],
                          ]),
                          [],
                          ["Total de categorías", totalCategorias, ""],
                          [
                            "Total general",
                            "",
                            `L ${totalGeneral.toLocaleString("es-HN", {
                              minimumFractionDigits: 2,
                            })}`,
                          ],
                        ];

                        const ws = XLSX.utils.aoa_to_sheet(wsData);

                        // === Estilos modernos y corporativos ===
                        const range = XLSX.utils.decode_range(ws["!ref"]);
                        for (let R = range.s.r; R <= range.e.r; ++R) {
                          for (let C = range.s.c; C <= range.e.c; ++C) {
                            const ref = XLSX.utils.encode_cell({ r: R, c: C });
                            const cell = ws[ref];
                            if (!cell) continue;

                            // 🎨 Estilo base
                            cell.s = {
                              alignment: {
                                horizontal: "center",
                                vertical: "center",
                              },
                              font: {
                                name: "Calibri",
                                sz: 11,
                                color: { rgb: "111827" },
                              },
                            };

                            // 🟦 Título principal
                            if (R === 0) {
                              cell.s = {
                                font: {
                                  bold: true,
                                  sz: 20,
                                  color: { rgb: "FFFFFF" },
                                },
                                alignment: {
                                  horizontal: "center",
                                  vertical: "center",
                                },
                                fill: { fgColor: { rgb: "1E3A8A" } },
                              };
                            }

                            // 🟣 Subtítulo
                            if (R === 1) {
                              cell.s = {
                                font: {
                                  bold: true,
                                  sz: 14,
                                  color: { rgb: "2563EB" },
                                },
                                alignment: { horizontal: "center" },
                              };
                            }

                            // 🕓 Fecha
                            if (R === 2) {
                              cell.s = {
                                font: {
                                  italic: true,
                                  sz: 11,
                                  color: { rgb: "6B7280" },
                                },
                                alignment: { horizontal: "center" },
                              };
                            }

                            // 📋 Encabezados de tabla
                            if (R === 4) {
                              cell.s = {
                                font: { bold: true, color: { rgb: "FFFFFF" } },
                                alignment: {
                                  horizontal: "center",
                                  vertical: "center",
                                },
                                fill: { fgColor: { rgb: "2563EB" } },
                                border: {
                                  top: {
                                    style: "thin",
                                    color: { rgb: "1E3A8A" },
                                  },
                                  bottom: {
                                    style: "thin",
                                    color: { rgb: "1E3A8A" },
                                  },
                                },
                              };
                            }

                            // 📊 Datos
                            if (R > 4 && R < wsData.length - 2) {
                              cell.s = {
                                alignment: {
                                  horizontal: "center",
                                  vertical: "center",
                                },
                                border: {
                                  top: {
                                    style: "thin",
                                    color: { rgb: "E5E7EB" },
                                  },
                                  bottom: {
                                    style: "thin",
                                    color: { rgb: "E5E7EB" },
                                  },
                                },
                              };
                            }

                            // 🟩 Totales
                            if (R >= wsData.length - 2) {
                              cell.s = {
                                font: { bold: true, color: { rgb: "111827" } },
                                alignment: { horizontal: "center" },
                                fill: { fgColor: { rgb: "E0F2FE" } },
                                border: {
                                  top: {
                                    style: "thin",
                                    color: { rgb: "BFDBFE" },
                                  },
                                  bottom: {
                                    style: "thin",
                                    color: { rgb: "BFDBFE" },
                                  },
                                },
                              };
                            }
                          }
                        }

                        // === Fusionar encabezados ===
                        ws["!merges"] = [
                          { s: { r: 0, c: 0 }, e: { r: 0, c: 2 } },
                          { s: { r: 1, c: 0 }, e: { r: 1, c: 2 } },
                          { s: { r: 2, c: 0 }, e: { r: 2, c: 2 } },
                        ];

                        // === Ancho de columnas ===
                        ws["!cols"] = [{ wch: 30 }, { wch: 15 }, { wch: 20 }];

                        // === Guardar ===
                        const wb = XLSX.utils.book_new();
                        XLSX.utils.book_append_sheet(wb, ws, "Inventario");
                        XLSX.writeFile(
                          wb,
                          `Inventario_Por_Categoria_${fecha}.xlsx`
                        );
                      } catch (err) {
                        console.error("❌ Error generando Excel:", err);
                        alert(
                          "Error generando el archivo Excel del inventario por categoría."
                        );
                      }
                    }}
                  >
                    <img
                      src={ExportarXLSXIcon}
                      alt="Exportar Excel"
                      className="btn-icon"
                    />
                    Excel
                  </button>
                  {/* === NUEVO BOTÓN PDF MODERNO === */}
                  <button
                    className="btn-modern pdf"
                    onClick={async (e) => {
                      e.stopPropagation();

                      try {
                        const jsPDF = (await import("jspdf")).default;
                        const autoTable = (await import("jspdf-autotable"))
                          .default;

                        const doc = new jsPDF("p", "mm", "a4");
                        const fecha = new Date().toLocaleDateString("es-HN");

                        // === Logo superior derecho ===
                        if (logoDataURL) {
                          const logoWidth = 36;
                          const logoHeight = 36;
                          const pageWidth = doc.internal.pageSize.getWidth();
                          doc.addImage(
                            logoDataURL,
                            "JPEG",
                            pageWidth - logoWidth - 20,
                            14,
                            logoWidth,
                            logoHeight
                          );
                        }

                        // === Título principal ===
                        doc.setFont("helvetica", "bold");
                        doc.setFontSize(18);
                        doc.setTextColor(30, 50, 100);
                        doc.text("Reporte de Inventario por Categoría", 20, 30);

                        // === Subtítulo y fecha ===
                        doc.setFontSize(12);
                        doc.setTextColor(90);
                        doc.text(`Generado el ${fecha}`, 20, 38);

                        // === Estructura de datos ===
                        const data = reportData.details.inventoryByCategory.map(
                          (c) => [
                            c.category,
                            c.products, // ✅ Número entero, sin formato monetario
                            new Intl.NumberFormat("es-HN", {
                              style: "currency",
                              currency: "HNL",
                              minimumFractionDigits: 2,
                            }).format(c.total),
                          ]
                        );

                        // === Tabla moderna ===
                        autoTable(doc, {
                          startY: 50,
                          head: [["Categoría", "Productos", "Total (L.)"]],
                          body: data,
                          theme: "grid",
                          headStyles: {
                            fillColor: [25, 60, 120],
                            textColor: [255, 255, 255],
                            halign: "center",
                            fontStyle: "bold",
                          },
                          bodyStyles: {
                            textColor: [30, 30, 30],
                            halign: "center",
                          },
                          alternateRowStyles: { fillColor: [245, 247, 250] },
                          styles: { fontSize: 11, cellPadding: 4 },
                          margin: { left: 18, right: 18 },
                        });

                        // === Totales al final ===
                        const totalCategorias =
                          reportData.details.inventoryByCategory.length;
                        const totalGeneral =
                          reportData.details.inventoryByCategory.reduce(
                            (acc, c) => acc + Number(c.total),
                            0
                          );

                        const finalY = doc.lastAutoTable.finalY + 10;
                        doc.setFont("helvetica", "bold");
                        doc.setFontSize(13);
                        doc.setTextColor(30, 50, 100);
                        doc.text(
                          `Total de categorías: ${totalCategorias}`,
                          20,
                          finalY
                        );
                        doc.text(
                          `Total general: L ${totalGeneral.toLocaleString(
                            "es-HN",
                            {
                              minimumFractionDigits: 2,
                            }
                          )}`,
                          20,
                          finalY + 7
                        );

                        // === Pie de página ===
                        doc.setFont("helvetica", "normal");
                        doc.setFontSize(10);
                        doc.setTextColor(100);
                        doc.text(
                          "PetPlaza Hospivet — Sistema de Gestión Veterinaria",
                          20,
                          finalY + 18
                        );
                        doc.text(
                          "© 2025 - Todos los derechos reservados",
                          20,
                          finalY + 24
                        );

                        // === Guardar archivo ===
                        doc.save(`Inventario_Por_Categoria_${fecha}.pdf`);
                      } catch (err) {
                        console.error(
                          "❌ Error generando PDF del inventario:",
                          err
                        );
                        alert(
                          "Error al generar el PDF del inventario por categoría."
                        );
                      }
                    }}
                  >
                    <img
                      src={ExportarPDFIcon}
                      alt="Exportar PDF"
                      className="btn-icon"
                    />
                    PDF
                  </button>
                </div>
              </div>

              <div className="reports-inventory-list">
                {reportData.details.inventoryByCategory.map((item, i) => (
                  <div key={i} className="reports-inventory-item">
                    <span>
                      {item.category} ({item.products} productos)
                    </span>
                    <strong>{formatCurrency(item.total)}</strong>
                  </div>
                ))}
              </div>
            </div>

            {/* =================== ESTADO DE CITAS =================== */}
            <div
              className="reports-card"
              onClick={() => setSelectedCard("citas")}
            >
              <div className="reports-card-header">
                <h2>Estado de Citas</h2>
                <div className="export-buttons">
                  <button
                    className="btn-modern excel"
                    onClick={(e) => {
                      e.stopPropagation();
                      exportToExcel(
                        [
                          {
                            estado: "Programada",
                            cantidad:
                              reportData.metrics.appointmentsProgramadas,
                          },
                          {
                            estado: "Completada",
                            cantidad:
                              reportData.metrics.appointmentsCompletadas,
                          },
                          {
                            estado: "Cancelada",
                            cantidad: reportData.metrics.appointmentsCanceladas,
                          },
                        ],
                        "Estado_Citas",
                        "Citas"
                      );
                    }}
                  >
                    <img
                      src={ExportarXLSXIcon}
                      alt="Exportar Excel"
                      className="btn-icon"
                    />
                    Excel
                  </button>

                  <button
                    className="btn-modern pdf"
                    onClick={(e) => {
                      e.stopPropagation();
                      exportToPDF(
                        [
                          [
                            "Programada",
                            reportData.metrics.appointmentsProgramadas,
                          ],
                          [
                            "Completada",
                            reportData.metrics.appointmentsCompletadas,
                          ],
                          [
                            "Cancelada",
                            reportData.metrics.appointmentsCanceladas,
                          ],
                        ],
                        "Reporte de Citas",
                        ["Estado", "Cantidad"],
                        { currency: false }
                      );
                    }}
                  >
                    <img
                      src={ExportarPDFIcon}
                      alt="Exportar PDF"
                      className="btn-icon"
                    />
                    PDF
                  </button>
                </div>
              </div>

              <div className="reports-inventory-list">
                {[
                  {
                    estado: "Programada",
                    cantidad: reportData.metrics.appointmentsProgramadas,
                    clase: "programada",
                  },
                  {
                    estado: "Completada",
                    cantidad: reportData.metrics.appointmentsCompletadas,
                    clase: "completada",
                  },
                  {
                    estado: "Cancelada",
                    cantidad: reportData.metrics.appointmentsCanceladas,
                    clase: "cancelada",
                  },
                ].map((item, i) => (
                  <div key={i} className="reports-inventory-item">
                    <span className={`reports-tag ${item.clase}`}>
                      {item.estado}
                    </span>
                    <strong>{formatNumber(item.cantidad)}</strong>
                  </div>
                ))}
              </div>
            </div>

            {/* =================== PRODUCTOS CON STOCK BAJO =================== */}
            <div
              className="reports-card"
              onClick={() => setSelectedCard("stock")}
            >
              <div className="reports-card-header">
                <h2>Productos con Stock Bajo</h2>
                <div className="export-buttons">
                  <button
                    className="btn-modern excel"
                    onClick={(e) => {
                      e.stopPropagation();
                      exportLowStockExcel();
                    }}
                  >
                    <img
                      src={ExportarXLSXIcon}
                      alt="Exportar Excel"
                      className="btn-icon"
                    />
                    Excel
                  </button>

                  <button
                    className="btn-modern pdf"
                    onClick={(e) => {
                      e.stopPropagation();
                      exportLowStockPDF();
                    }}
                  >
                    <img
                      src={ExportarPDFIcon}
                      alt="Exportar PDF"
                      className="btn-icon"
                    />
                    PDF
                  </button>
                </div>
              </div>

              <div className="reports-low-stock-list">
                {reportData.details.lowStockProducts.length === 0 ? (
                  <p className="no-data">
                    ✅ Todo el stock está en buen nivel.
                  </p>
                ) : (
                  reportData.details.lowStockProducts.map((prod, i) => (
                    <div key={i} className="reports-low-stock-item">
                      <span>{prod.name}</span>
                      <strong>{formatNumber(prod.quantity)}</strong>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* =================== SIN DATOS / ESTADO INICIAL =================== */}
      {!loading && !reportData && (
        <div className="reports-empty">
          <p>📊 Aún no se ha generado ningún reporte.</p>
          <p>Selecciona un rango de fechas y presiona “Generar Reporte”.</p>
        </div>
      )}

      {/* =====================================================
          MODALES DETALLADOS (VENTAS, FACTURAS, INVENTARIO, ETC.)
      ====================================================== */}
      {selectedCard && (
        <div
          className={`modal-overlay ${closing ? "closing" : ""}`}
          onClick={handleClose}
        >
          <div
            className="modal-content smooth-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <button className="modal-close" onClick={handleClose}>
              <X size={20} />
            </button>

            {/* ======== MODAL: VENTAS ======== */}
            {selectedCard === "ventas" && (
              <div className="reports-card">
                <h2>Detalle de Ventas</h2>
                <div className="export-buttons">
                  <div className="export-buttons">
                    {/* === NUEVO BOTÓN EXCEL MODERNO PARA MODAL === */}
                    <button
                      className="btn-modern excel"
                      onClick={(e) => {
                        e.stopPropagation();
                        exportDailySalesExcel(); // ✅ Usa la misma función moderna
                      }}
                    >
                      <img
                        src={ExportarXLSXIcon}
                        alt="Exportar Excel"
                        className="btn-icon"
                      />
                      Excel
                    </button>

                    {/* === NUEVO BOTÓN PDF MODERNO PARA MODAL === */}
                    <button
                      className="btn-modern pdf"
                      onClick={(e) => {
                        e.stopPropagation();
                        exportDailySalesPDF(); // ✅ Usa la misma función moderna
                      }}
                    >
                      <img
                        src={ExportarPDFIcon}
                        alt="Exportar PDF"
                        className="btn-icon"
                      />
                      PDF
                    </button>
                  </div>
                </div>

                <div className="reports-sales-list">
                  {reportData.details.salesByDay.map((d, i) => (
                    <div key={i} className="reports-sales-item">
                      <span>{d.date}</span>
                      <div className="reports-bar-container">
                        <div
                          className="reports-bar"
                          style={{
                            width: `${
                              (d.total /
                                Math.max(
                                  ...reportData.details.salesByDay.map(
                                    (s) => s.total
                                  )
                                )) *
                              100
                            }%`,
                          }}
                        />
                        <span className="reports-value">
                          {formatCurrency(d.total)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ======== MODAL: FACTURAS ======== */}
            {selectedCard === "facturas" && (
              <div className="reports-card">
                <h2>Detalle de Facturas Emitidas</h2>
                <div className="export-buttons">
                  <button
                    className="btn-modern excel"
                    onClick={(e) => {
                      e.stopPropagation();
                      exportPaymentSummaryExcel();
                    }}
                  >
                    <img
                      src={ExportarXLSXIcon}
                      alt="Exportar Excel"
                      className="btn-icon"
                    />
                    Excel
                  </button>

                  <button
                    className="btn-modern pdf"
                    onClick={(e) => {
                      e.stopPropagation();
                      exportPaymentSummaryPDF();
                    }}
                  >
                    <img
                      src={ExportarPDFIcon}
                      alt="Exportar PDF"
                      className="btn-icon"
                    />
                    PDF
                  </button>
                </div>
                <p>
                  Total de facturas emitidas:{" "}
                  <strong>
                    {formatNumber(reportData.metrics.totalInvoices)}
                  </strong>
                </p>
              </div>
            )}

            {/* ======== MODAL: PROMEDIO ======== */}
            {selectedCard === "promedio" && (
              <div className="reports-card">
                <h2>Promedio por Venta</h2>
                <div className="export-buttons">
                  <button
                    className="btn-modern excel"
                    onClick={() =>
                      exportToExcel(
                        [
                          {
                            metrica: "Promedio por Venta (L.)",
                            valor: reportData.metrics.averageSale,
                          },
                        ],
                        "Promedio_Ventas",
                        "Promedios"
                      )
                    }
                  >
                    <img
                      src={ExportarXLSXIcon}
                      alt="Exportar Excel"
                      className="btn-icon"
                    />
                    Excel
                  </button>

                  <button
                    className="btn-modern pdf"
                    onClick={() =>
                      exportToPDF(
                        [
                          [
                            "Promedio por Venta (L.)",
                            reportData.metrics.averageSale,
                          ],
                        ],
                        "Promedio por Venta",
                        ["Métrica", "Valor (L.)"]
                      )
                    }
                  >
                    <img
                      src={ExportarPDFIcon}
                      alt="Exportar PDF"
                      className="btn-icon"
                    />
                    PDF
                  </button>
                </div>
                <p>
                  Promedio actual:{" "}
                  <strong>
                    {formatCurrency(reportData.metrics.averageSale)}
                  </strong>
                </p>
              </div>
            )}

            {/* ======== MODAL: INVENTARIO ======== */}
            {selectedCard === "inventario" && (
              <div className="reports-card">
                <h2>Inventario Detallado</h2>
                <div className="export-buttons">
                  {/* === NUEVO BOTÓN EXCEL MODERNO === */}
                  <button
                    className="btn-modern excel"
                    onClick={async (e) => {
                      e.stopPropagation();

                      try {
                        const XLSX = await import("xlsx-js-style");
                        const fecha = new Date().toLocaleDateString("es-HN");

                        // === Datos del inventario ===
                        const inventario =
                          reportData.details.inventoryByCategory.map(
                            (item) => ({
                              Categoría: item.category,
                              Productos: item.products,
                              "Total (L.)": Number(item.total).toFixed(2),
                            })
                          );

                        // === Totales ===
                        const totalCategorias = inventario.length;
                        const totalGeneral = inventario.reduce(
                          (acc, i) => acc + Number(i["Total (L.)"]),
                          0
                        );

                        // === Estructura de datos ===
                        const wsData = [
                          ["PETPLAZA HOSPIVET"],
                          ["Reporte de Inventario Detallado"],
                          [`Generado el ${fecha}`],
                          [],
                          ["Categoría", "Productos", "Total (L.)"],
                          ...inventario.map((i) => [
                            i.Categoría,
                            i.Productos,
                            i["Total (L.)"],
                          ]),
                          [],
                          ["Total de categorías", totalCategorias, ""],
                          [
                            "Total general",
                            "",
                            `L ${totalGeneral.toLocaleString("es-HN", {
                              minimumFractionDigits: 2,
                            })}`,
                          ],
                        ];

                        const ws = XLSX.utils.aoa_to_sheet(wsData);

                        // === Estilos mejorados ===
                        const range = XLSX.utils.decode_range(ws["!ref"]);
                        for (let R = range.s.r; R <= range.e.r; ++R) {
                          for (let C = range.s.c; C <= range.e.c; ++C) {
                            const ref = XLSX.utils.encode_cell({ r: R, c: C });
                            const cell = ws[ref];
                            if (!cell) continue;

                            // 🎨 Estilo base general
                            cell.s = {
                              alignment: {
                                horizontal: "center",
                                vertical: "center",
                              },
                              font: {
                                name: "Calibri",
                                sz: 11,
                                color: { rgb: "111827" },
                              },
                            };

                            // 🟦 Encabezado corporativo
                            if (R === 0) {
                              cell.s = {
                                font: {
                                  bold: true,
                                  sz: 20,
                                  color: { rgb: "FFFFFF" },
                                },
                                alignment: {
                                  horizontal: "center",
                                  vertical: "center",
                                },
                                fill: { fgColor: { rgb: "1E3A8A" } },
                                border: {
                                  top: {
                                    style: "thin",
                                    color: { rgb: "1E3A8A" },
                                  },
                                  bottom: {
                                    style: "thin",
                                    color: { rgb: "1E3A8A" },
                                  },
                                },
                              };
                            }

                            // 🟣 Subtítulo
                            if (R === 1) {
                              cell.s = {
                                font: {
                                  bold: true,
                                  sz: 14,
                                  color: { rgb: "2563EB" },
                                },
                                alignment: { horizontal: "center" },
                              };
                            }

                            // 🔘 Fecha
                            if (R === 2) {
                              cell.s = {
                                font: {
                                  italic: true,
                                  sz: 11,
                                  color: { rgb: "6B7280" },
                                },
                                alignment: { horizontal: "center" },
                              };
                            }

                            // 🧾 Cabecera de tabla
                            if (R === 4) {
                              cell.s = {
                                font: { bold: true, color: { rgb: "FFFFFF" } },
                                alignment: {
                                  horizontal: "center",
                                  vertical: "center",
                                },
                                fill: { fgColor: { rgb: "2563EB" } },
                                border: {
                                  top: {
                                    style: "thin",
                                    color: { rgb: "1E3A8A" },
                                  },
                                  bottom: {
                                    style: "thin",
                                    color: { rgb: "1E3A8A" },
                                  },
                                },
                              };
                            }

                            // 📊 Celdas de datos
                            if (R > 4 && R < wsData.length - 2) {
                              cell.s = {
                                alignment: {
                                  horizontal: "center",
                                  vertical: "center",
                                },
                                border: {
                                  top: {
                                    style: "thin",
                                    color: { rgb: "E5E7EB" },
                                  },
                                  bottom: {
                                    style: "thin",
                                    color: { rgb: "E5E7EB" },
                                  },
                                },
                              };
                            }

                            // 🟩 Totales (categorías y general)
                            if (R >= wsData.length - 2) {
                              cell.s = {
                                font: { bold: true, color: { rgb: "111827" } },
                                alignment: { horizontal: "center" },
                                fill: { fgColor: { rgb: "E0F2FE" } },
                                border: {
                                  top: {
                                    style: "thin",
                                    color: { rgb: "BFDBFE" },
                                  },
                                  bottom: {
                                    style: "thin",
                                    color: { rgb: "BFDBFE" },
                                  },
                                },
                              };
                            }
                          }
                        }

                        // === Fusionar títulos ===
                        ws["!merges"] = [
                          { s: { r: 0, c: 0 }, e: { r: 0, c: 2 } },
                          { s: { r: 1, c: 0 }, e: { r: 1, c: 2 } },
                          { s: { r: 2, c: 0 }, e: { r: 2, c: 2 } },
                        ];

                        // === Ancho de columnas ===
                        ws["!cols"] = [{ wch: 30 }, { wch: 15 }, { wch: 20 }];

                        // === Crear y guardar ===
                        const wb = XLSX.utils.book_new();
                        XLSX.utils.book_append_sheet(wb, ws, "Inventario");
                        XLSX.writeFile(
                          wb,
                          `Inventario_Detallado_${fecha}.xlsx`
                        );
                      } catch (err) {
                        console.error(
                          "❌ Error exportando Excel del inventario:",
                          err
                        );
                        alert(
                          "Error generando el archivo Excel del inventario."
                        );
                      }
                    }}
                  >
                    <img
                      src={ExportarXLSXIcon}
                      alt="Exportar Excel"
                      className="btn-icon"
                    />
                    Excel
                  </button>

                  {/* === NUEVO BOTÓN PDF MEJORADO === */}
                  <button
                    className="btn-modern pdf"
                    onClick={async (e) => {
                      e.stopPropagation();

                      try {
                        const { jsPDF } = await import("jspdf");
                        const autoTable = (await import("jspdf-autotable"))
                          .default;

                        const doc = new jsPDF("p", "mm", "a4");
                        const fecha = new Date().toLocaleDateString("es-HN");

                        // === LOGO ===
                        if (logoDataURL) {
                          const pageWidth = doc.internal.pageSize.getWidth();
                          const logoW = 38;
                          const logoH = 38;
                          doc.addImage(
                            logoDataURL,
                            "JPEG",
                            pageWidth - logoW - 20,
                            12,
                            logoW,
                            logoH
                          );
                        }

                        // === TÍTULO PRINCIPAL ===
                        doc.setFont("helvetica", "bold");
                        doc.setFontSize(18);
                        doc.setTextColor(30, 50, 100);
                        doc.text("Inventario Detallado", 20, 30);

                        // === FECHA ===
                        doc.setFont("helvetica", "normal");
                        doc.setFontSize(11);
                        doc.setTextColor(100);
                        doc.text(`Generado el ${fecha}`, 20, 38);

                        // === TABLA DE DATOS ===
                        const tableData =
                          reportData.details.inventoryByCategory.map((item) => [
                            item.category,
                            item.products, // ✅ cantidad simple, sin formato de moneda
                            new Intl.NumberFormat("es-HN", {
                              style: "currency",
                              currency: "HNL",
                            }).format(item.total),
                          ]);

                        autoTable(doc, {
                          startY: 50,
                          head: [["Categoría", "Productos", "Total (L.)"]],
                          body: tableData,
                          theme: "grid",
                          styles: {
                            fontSize: 11,
                            cellPadding: 4,
                          },
                          headStyles: {
                            fillColor: [30, 50, 100],
                            textColor: [255, 255, 255],
                            fontStyle: "bold",
                            halign: "center",
                          },
                          bodyStyles: {
                            halign: "center",
                            textColor: [40, 40, 40],
                          },
                          alternateRowStyles: { fillColor: [247, 249, 252] },
                          margin: { left: 18, right: 18 },
                        });

                        // === TOTAL GENERAL ===
                        const finalY = doc.lastAutoTable.finalY + 10;
                        doc.setFont("helvetica", "bold");
                        doc.setFontSize(13);
                        doc.setTextColor(30, 50, 100);
                        doc.text(
                          `Total de categorías: ${reportData.details.inventoryByCategory.length}`,
                          20,
                          finalY
                        );

                        // === PIE CORPORATIVO ===
                        doc.setFont("helvetica", "italic");
                        doc.setFontSize(10);
                        doc.setTextColor(120);
                        doc.text(
                          "PetPlaza Hospivet — Sistema de Gestión Veterinaria",
                          20,
                          finalY + 12
                        );
                        doc.text(
                          "© 2025 - Todos los derechos reservados",
                          20,
                          finalY + 18
                        );

                        // === GUARDAR PDF ===
                        doc.save(`Inventario_Detallado_${fecha}.pdf`);
                      } catch (err) {
                        console.error(
                          "❌ Error generando PDF de Inventario:",
                          err
                        );
                        alert("Error al generar el PDF del inventario.");
                      }
                    }}
                  >
                    <img
                      src={ExportarPDFIcon}
                      alt="Exportar PDF"
                      className="btn-icon"
                    />
                    PDF
                  </button>
                </div>

                <div className="reports-inventory-list">
                  {reportData.details.inventoryByCategory.map((item, i) => (
                    <div key={i} className="reports-inventory-item">
                      <span>
                        {item.category} ({item.products} productos)
                      </span>
                      <strong>{formatCurrency(item.total)}</strong>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ======== MODAL: CITAS ======== */}
            {selectedCard === "citas" && (
              <div className="reports-card">
                <h2>Detalle de Estado de Citas</h2>
                <div className="export-buttons">
                  <button
                    className="btn-modern excel"
                    onClick={() =>
                      exportToExcel(
                        [
                          {
                            Estado: "Programada",
                            Cantidad:
                              reportData.metrics.appointmentsProgramadas,
                          },
                          {
                            Estado: "Completada",
                            Cantidad:
                              reportData.metrics.appointmentsCompletadas,
                          },
                          {
                            Estado: "Cancelada",
                            Cantidad: reportData.metrics.appointmentsCanceladas,
                          },
                        ],
                        "Estado_Citas",
                        "Citas"
                      )
                    }
                  >
                    <img
                      src={ExportarXLSXIcon}
                      alt="Exportar Excel"
                      className="btn-icon"
                    />
                    Excel
                  </button>

                  <button
                    className="btn-modern pdf"
                    onClick={() =>
                      exportToPDF(
                        [
                          [
                            "Programada",
                            reportData.metrics.appointmentsProgramadas,
                          ],
                          [
                            "Completada",
                            reportData.metrics.appointmentsCompletadas,
                          ],
                          [
                            "Cancelada",
                            reportData.metrics.appointmentsCanceladas,
                          ],
                        ],
                        "Estado de Citas",
                        ["Estado", "Cantidad"],
                        { currency: false }
                      )
                    }
                  >
                    <img
                      src={ExportarPDFIcon}
                      alt="Exportar PDF"
                      className="btn-icon"
                    />
                    PDF
                  </button>
                </div>

                <div className="reports-inventory-list">
                  {[
                    {
                      estado: "Programada",
                      cantidad: reportData.metrics.appointmentsProgramadas,
                      clase: "programada",
                    },
                    {
                      estado: "Completada",
                      cantidad: reportData.metrics.appointmentsCompletadas,
                      clase: "completada",
                    },
                    {
                      estado: "Cancelada",
                      cantidad: reportData.metrics.appointmentsCanceladas,
                      clase: "cancelada",
                    },
                  ].map((item, i) => (
                    <div key={i} className="reports-inventory-item">
                      <span className={`reports-tag ${item.clase}`}>
                        {item.estado}
                      </span>
                      <strong>{formatNumber(item.cantidad)}</strong>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ======== MODAL: STOCK BAJO ======== */}
            {selectedCard === "stock" && (
              <div className="reports-card">
                <h2>Productos con Stock Bajo</h2>
                <div className="export-buttons">
                  <button
                    className="btn-modern excel"
                    onClick={(e) => {
                      e.stopPropagation();
                      exportLowStockExcel();
                    }}
                  >
                    <img
                      src={ExportarXLSXIcon}
                      alt="Exportar Excel"
                      className="btn-icon"
                    />
                    Excel
                  </button>

                  <button
                    className="btn-modern pdf"
                    onClick={(e) => {
                      e.stopPropagation();
                      exportLowStockPDF();
                    }}
                  >
                    <img
                      src={ExportarPDFIcon}
                      alt="Exportar PDF"
                      className="btn-icon"
                    />
                    PDF
                  </button>
                </div>

                <div className="reports-low-stock-list">
                  {reportData.details.lowStockProducts.length === 0 ? (
                    <p>✅ Todo el stock está en niveles adecuados.</p>
                  ) : (
                    reportData.details.lowStockProducts.map((p, i) => (
                      <div key={i} className="reports-low-stock-item">
                        <span>{p.name}</span>
                        <strong>{formatNumber(p.quantity)}</strong>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;