// src/components/Facturacion.js
import React, { useEffect, useMemo, useState, useRef } from "react";
import "../CSS/Facturacion.css";
import {
  FileText,
  CheckCircle,
  Clock,
  Calculator,
  Eye,
  Plus,
  X,
  MoreVertical,
  Edit3,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import jsPDF from "jspdf";
import logo1 from "../assets/logo1.png";

import {
  getFacturas,
  createFactura,
  updateFacturaEstado,
} from "../apis/facturasApi";
import { getOwners } from "../apis/ownersApi";
import { getPets } from "../apis/petsApi";
import { getServicios } from "../apis/serviciosApi";
import { getProducts } from "../apis/productsApi";

// =====================================================
//  CONFIGURACIÓN UNIVERSAL DE BACKEND (Render + Local)
// =====================================================
const isLocal =
  typeof window !== "undefined" &&
  (window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1");

const BACKEND_URL = isLocal
  ? "http://localhost:5000/api"
  : "https://petplaza-backend.onrender.com/api";

export default function Facturacion() {
  const user = JSON.parse(localStorage.getItem("user"));
    const getToken = () => {
    const savedUser = JSON.parse(localStorage.getItem("user") || "null");
    return (
      localStorage.getItem("token") ||
      localStorage.getItem("authToken") ||
      savedUser?.token ||
      ""
    );
  };

  const getAuthHeaders = (includeJson = true) => {
    const token = getToken();
    return {
      ...(includeJson ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  };

  // ==================== ESTADOS BASE ====================
  const [facturas, setFacturas] = useState([]);
  const [owners, setOwners] = useState([]);
  const [pets, setPets] = useState([]);
  const [servicios, setServicios] = useState([]);
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Toasts
  const [toast, setToast] = useState({
    show: false,
    type: "success", // success | warning | error
    message: "",
  });
  const toastTimeoutRef = useRef(null);

  // Modales
  const [showNuevoModal, setShowNuevoModal] = useState(false);
  const [closingNuevoModal, setClosingNuevoModal] = useState(false);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [facturaEditando, setFacturaEditando] = useState(null);

  const [showPreview, setShowPreview] = useState(false);
  const [closingPreview, setClosingPreview] = useState(false);
  const [facturaSeleccionada, setFacturaSeleccionada] = useState(null);

  const [showConfirm, setShowConfirm] = useState(false);
  const [closingConfirm, setClosingConfirm] = useState(false);
  const [facturaAEliminar, setFacturaAEliminar] = useState(null);

  // Lote CAI
  const [showLoteMenu, setShowLoteMenu] = useState(false);
  const [showLoteModal, setShowLoteModal] = useState(false);
  const [closingLoteModal, setClosingLoteModal] = useState(false);
  const [lotes, setLotes] = useState([]);
  const [loadingLotes, setLoadingLotes] = useState(true);
  const [nuevoLote, setNuevoLote] = useState({
    cai: "",
    rangoDesde: "",
    rangoHasta: "",
  });

  // Referencias para el menú y el botón de tres puntos
  const loteMenuRef = useRef(null);
  const loteBtnRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        loteMenuRef.current &&
        !loteMenuRef.current.contains(e.target) &&
        loteBtnRef.current &&
        !loteBtnRef.current.contains(e.target)
      ) {
        setShowLoteMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    };
  }, []);

  // ==================== FORMULARIO NUEVA/EDICIÓN ====================
  const [formData, setFormData] = useState({
    cliente: { ownerId: "", rtn: "" },
    mascota: { petId: "" },
    metodoPago: "",
    servicios: [],
    productos: [],
    descuentoTipo: "monto",
    descuentoValor: 0,
  });

  // ==================== HELPERS ====================
  const notify = (message, type = "success") => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToast({ show: true, type, message });
    toastTimeoutRef.current = setTimeout(() => {
      setToast((prev) => ({ ...prev, show: false }));
    }, 2800);
  };

  const normalizeNumber = (value) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  };

  const currency = (n) =>
    `L ${Number(n || 0).toLocaleString("es-HN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const numFactura = (f) => f?.numero || f?.numeroCorrelativoTexto || "—";
  const safeDate = (d) => new Date(d || Date.now()).toLocaleDateString();

  const resetFormFactura = () => {
    setFormData({
      cliente: { ownerId: "", rtn: "" },
      mascota: { petId: "" },
      metodoPago: "",
      servicios: [],
      productos: [],
      descuentoTipo: "monto",
      descuentoValor: 0,
    });
    setModoEdicion(false);
    setFacturaEditando(null);
  };

  const getFetchErrorMessage = (e, defaultMessage) => {
    const msg = e?.message || "";
    if (
      msg.toLowerCase().includes("failed to fetch") ||
      msg.toLowerCase().includes("network") ||
      msg.toLowerCase().includes("load failed")
    ) {
      return "Error de conexión con el servidor.";
    }
    return msg || defaultMessage;
  };

  // ==================== CARGA INICIAL ====================
  useEffect(() => {
    const cargarTodo = async () => {
      try {
        setLoading(true);
        const [fs, os, ps, ss, prs] = await Promise.all([
          getFacturas(),
          getOwners(),
          getPets(),
          getServicios(),
          getProducts(),
        ]);
        setFacturas(fs || []);
        setOwners(os || []);
        setPets(ps || []);
        setServicios(ss || []);
        setProductos(prs || []);
      } catch (e) {
        console.error(e);
        notify(getFetchErrorMessage(e, "Error cargando datos."), "error");
      } finally {
        setLoading(false);
      }
    };
    cargarTodo();
  }, []);

  // ==================== MASCOTAS POR DUEÑO ====================
  const mascotasDelOwner = useMemo(() => {
    const ownerId = formData.cliente.ownerId;
    if (!ownerId) return [];
    return pets.filter((p) => {
      const pid = p.owner?._id || p.ownerId?._id || p.ownerId || p.owner;
      return pid === ownerId;
    });
  }, [pets, formData.cliente.ownerId]);

  // ==================== TOTALES ====================
  const subtotalServicios = useMemo(
    () =>
      formData.servicios.reduce(
        (a, s) =>
          a + Number(s.precio ?? s.price ?? 0) * Number(s.cantidad || 0),
        0
      ),
    [formData.servicios]
  );

  const subtotalProductos = useMemo(
    () =>
      formData.productos.reduce(
        (a, p) =>
          a + Number(p.precio ?? p.price ?? 0) * Number(p.cantidad || 0),
        0
      ),
    [formData.productos]
  );

  const subtotal = subtotalServicios + subtotalProductos;

  const descuentoTotal = useMemo(() => {
    const v = Math.max(0, normalizeNumber(formData.descuentoValor));

    if (formData.descuentoTipo === "porcentaje") {
      const porcentajeValido = Math.min(v, 100);
      return Math.min(subtotal * (porcentajeValido / 100), subtotal);
    }

    return Math.min(v, subtotal);
  }, [formData.descuentoTipo, formData.descuentoValor, subtotal]);

  const baseImponible = Math.max(subtotal - descuentoTotal, 0);
  const impuesto = +(baseImponible * 0.15).toFixed(2);
  const total = +(baseImponible + impuesto).toFixed(2);

  // ==================== FILTRO FACTURAS ====================
  const facturasFiltradas = useMemo(() => {
    if (!searchTerm.trim()) return facturas;
    const t = searchTerm.toLowerCase();
    return facturas.filter(
      (f) =>
        numFactura(f).toString().toLowerCase().includes(t) ||
        f.cliente?.nombre?.toLowerCase().includes(t) ||
        f.mascota?.nombre?.toLowerCase().includes(t)
    );
  }, [facturas, searchTerm]);

  // ==================== HANDLERS FORM ====================
  const onSelectOwner = (ownerId) =>
    setFormData((s) => ({
      ...s,
      cliente: { ...s.cliente, ownerId },
      mascota: { petId: "" },
    }));

  const addServicio = (servicioId) => {
    const s = servicios.find((x) => x._id === servicioId);
    if (!s) return;

    const precio = Number(s.precio ?? s.price ?? 0);

    setFormData((prev) => ({
      ...prev,
      servicios: [
        ...prev.servicios,
        {
          servicioId: s._id,
          nombre: s.nombre,
          precio,
          cantidad: 1,
          subtotal: precio,
        },
      ],
    }));
  };

  const addProducto = (productId) => {
    if (!productId) return;
    const p = productos.find((x) => x._id === productId);
    if (!p) return;

    const precio = Number(p.price ?? p.precio ?? 0);

    setFormData((prev) => ({
      ...prev,
      productos: [
        ...prev.productos,
        {
          productId: p._id,
          _id: p._id,
          nombre: p.name ?? p.nombre,
          precio,
          cantidad: 1,
          subtotal: precio,
        },
      ],
    }));
  };

  const updListQty = (list, id, delta) =>
    list
      .map((i) =>
        i.servicioId === id || i._id === id || i.productId === id
          ? {
              ...i,
              cantidad: Math.max(0, Number(i.cantidad || 0) + delta),
              subtotal:
                Math.max(
                  0,
                  Number(i.precio || i.price) * (Number(i.cantidad || 0) + delta)
                ),
            }
          : i
      )
      .filter((i) => (i.cantidad || 0) > 0);

  const updServQty = (id, delta) =>
    setFormData((s) => ({ ...s, servicios: updListQty(s.servicios, id, delta) }));

  const updProdQty = (id, delta) =>
    setFormData((s) => ({ ...s, productos: updListQty(s.productos, id, delta) }));

  const delServ = (id) =>
    setFormData((s) => ({
      ...s,
      servicios: s.servicios.filter((x) => x.servicioId !== id && x._id !== id),
    }));

  const delProd = (id) =>
    setFormData((s) => ({
      ...s,
      productos: s.productos.filter((x) => x.productId !== id && x._id !== id),
    }));

  // ==================== NUEVA / EDICIÓN ====================
  const openNuevoModal = () => {
    resetFormFactura();
    setModoEdicion(false);
    setShowNuevoModal(true);
  };

  const openEditModal = (f) => {
    setModoEdicion(true);
    setFacturaEditando(f);
    setFormData({
      cliente: {
        ownerId: f.cliente?.ownerId || f.cliente?.owner?._id || "",
        rtn: f.cliente?.rtn || "",
      },
      mascota: { petId: f.mascota?.petId || f.mascota?._id || "" },
      metodoPago: f.metodoPago || "",
      servicios: (f.servicios || []).map((s) => ({
        servicioId: s.servicioId || s._id,
        nombre: s.nombre,
        precio: Number(s.precio ?? s.price ?? s.unitPrice ?? 0),
        cantidad: Number(s.cantidad || 0),
        _id: s._id,
      })),
      productos: (f.productos || []).map((p) => ({
        productId: p.productId || p._id,
        nombre: p.nombre ?? p.name,
        precio: Number(p.precio ?? p.price ?? 0),
        cantidad: Number(p.cantidad || 0),
        _id: p._id,
      })),
      descuentoTipo: f.descuentoTipo || "monto",
      descuentoValor: Number(f.descuentoValor || 0),
    });
    setShowNuevoModal(true);
  };

  const closeNuevoModal = () => {
    setClosingNuevoModal(true);
    setTimeout(() => {
      setShowNuevoModal(false);
      setClosingNuevoModal(false);
      resetFormFactura();
    }, 180);
  };

  // ==================== CREAR / EDITAR / ESTADO / CANCELA ====================
  const handleGuardarFactura = async () => {
    if (!formData.cliente.ownerId || !formData.mascota.petId) {
      return notify("Selecciona dueño y mascota.", "warning");
    }

    if (formData.cliente.rtn && !/^\d{14}$/.test(formData.cliente.rtn)) {
      return notify("El RTN debe tener exactamente 14 dígitos numéricos.", "warning");
    }

    if (!formData.metodoPago) {
      return notify("Selecciona un método de pago.", "warning");
    }

    if (subtotal <= 0) {
      return notify("Agrega al menos un servicio o producto.", "warning");
    }

    const descuentoIngresado = normalizeNumber(formData.descuentoValor);

    if (descuentoIngresado < 0) {
      return notify("El descuento no puede ser negativo.", "warning");
    }

    if (
      formData.descuentoTipo === "porcentaje" &&
      descuentoIngresado > 100
    ) {
      return notify(
        "El descuento en porcentaje no puede ser mayor a 100.",
        "warning"
      );
    }

    let estadoFactura = "Pagado";
    if (!modoEdicion) {
      if (
        formData.metodoPago === "Tarjeta" ||
        formData.metodoPago === "Transferencia"
      ) {
        estadoFactura = "Pendiente";
      }
    }

    const owner = owners.find((o) => o._id === formData.cliente.ownerId);
    const pet = pets.find((p) => p._id === formData.mascota.petId);

    const payload = {
      cliente: {
        ownerId: formData.cliente.ownerId,
        nombre: owner?.full_name || owner?.nombre || "",
        rtn: formData.cliente.rtn || "",
        email: owner?.email || "",
        telefono: owner?.telefono || owner?.phone || "",
      },
      mascota: {
        petId: formData.mascota.petId,
        nombre: pet?.nombre || "",
        especie: pet?.especie || "",
        raza: pet?.raza || "",
      },
      servicios: formData.servicios.map((s) => ({
        servicioId: s.servicioId || s._id,
        nombre: s.nombre,
        precio: Number(s.precio ?? s.price ?? 0),
        cantidad: Number(s.cantidad || 1),
        subtotal:
          Number(s.precio ?? s.price ?? 0) * Number(s.cantidad || 1),
      })),
      productos: formData.productos.map((p) => ({
        productId: p.productId || p._id,
        nombre: p.nombre ?? p.name,
        precio: Number(p.precio ?? p.price ?? 0),
        cantidad: Number(p.cantidad || 1),
        subtotal:
          Number(p.precio ?? p.price ?? 0) * Number(p.cantidad || 1),
      })),
      descuentoTipo: formData.descuentoTipo,
      descuentoValor: Math.max(0, Number(formData.descuentoValor || 0)),
      metodoPago: formData.metodoPago,
      subtotal,
      descuentoTotal,
      baseImponible,
      impuesto,
      total,
      ...(modoEdicion ? {} : { estado: estadoFactura }),
    };

    try {
      if (modoEdicion && facturaEditando?._id) {
        const res = await fetch(`${BACKEND_URL}/facturas/${facturaEditando._id}`, {
          method: "PUT",
          headers: getAuthHeaders(true),
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.mensaje || "Error actualizando factura");

        const actualizada = data?.factura || data;
        setFacturas((prev) =>
          prev.map((x) => (x._id === actualizada._id ? actualizada : x))
        );
        notify("Factura actualizada correctamente.", "success");
      } else {
        const created = await createFactura(payload);
        const nueva = created?.factura || created;
        if (!nueva?._id) throw new Error("Error creando factura");

        setFacturas((prev) => [nueva, ...prev]);
        notify("Factura creada correctamente.", "success");
      }

      closeNuevoModal();
    } catch (e) {
      console.error(e);
      notify(getFetchErrorMessage(e, "Ocurrió un error guardando la factura."), "error");
    }
  };

  const toggleEstado = async (f) => {
    if (f.estado === "Cancelado") {
      return notify("La factura cancelada no puede cambiar de estado.", "warning");
    }

    if (f.estado === "Pagado") {
      return notify(
        "La factura ya está pagada y no puede volver a pendiente.",
        "warning"
      );
    }

    try {
      const updated = await updateFacturaEstado(f._id, "Pagado");
      const nf = updated?.factura || updated;
      setFacturas((prev) => prev.map((x) => (x._id === f._id ? nf : x)));
      notify("Factura marcada como pagada.", "success");
    } catch (e) {
      console.error(e);
      notify(getFetchErrorMessage(e, "Error actualizando estado."), "error");
    }
  };

  // =====================================================
  //   CANCELACIÓN DE FACTURA
  // =====================================================
  const askCancel = (f) => {
    if (f.estado === "Cancelado") return;
    setFacturaAEliminar(f);
    setShowConfirm(true);
  };

  const closeConfirmModal = () => {
    setClosingConfirm(true);
    setTimeout(() => {
      setShowConfirm(false);
      setClosingConfirm(false);
      setFacturaAEliminar(null);
    }, 180);
  };

  const handleCancelFactura = async () => {
    try {
      const updated = await updateFacturaEstado(facturaAEliminar._id, "Cancelado");
      const nf = updated?.factura || updated;
      setFacturas((prev) =>
        prev.map((x) => (x._id === facturaAEliminar._id ? nf : x))
      );
      closeConfirmModal();
      notify(
        `Factura #${facturaAEliminar.numero || ""} cancelada correctamente.`,
        "success"
      );
    } catch (e) {
      console.error(e);
      notify(getFetchErrorMessage(e, "Error cancelando factura."), "error");
    }
  };

  // ==================== LOTE CAI ====================
  const closeLoteModal = () => {
    setClosingLoteModal(true);
    setTimeout(() => {
      setShowLoteModal(false);
      setShowLoteMenu(false);
      setClosingLoteModal(false);
    }, 180);
  };

    const cargarLotes = async () => {
    try {
      setLoadingLotes(true);
      console.log("[DEBUG] Token being sent:", getToken());
      const res = await fetch(`${BACKEND_URL}/lotes`, {
        method: "GET",
        headers: getAuthHeaders(false),
      });
      console.log("[DEBUG] Response status:", res.status);
      console.log("[DEBUG] Response headers:", res.headers);
      const data = await res.json();
      console.log("[DEBUG] Response data:", data);
      if (!res.ok) {
        throw new Error(data?.mensaje || "No autorizado para consultar lotes");
      }
      setLotes(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Error en cargarLotes:", e);
      notify(e.message || "Error cargando lotes");
    } finally {
      setLoadingLotes(false);
    }
  };

    const crearLote = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${BACKEND_URL}/lotes`, {
        method: "POST",
        headers: getAuthHeaders(true),
        body: JSON.stringify(nuevoLote),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.mensaje || "Error creando lote");
      }
      notify("Lote creado correctamente");
      setNuevoLote({ cai: "", rangoDesde: "", rangoHasta: "" });
      await cargarLotes();
    } catch (e) {
      console.error("Error en crearLote:", e);
      notify(e.message || "Error creando lote");
    }
  };

  const activarLote = async (id) => {
    try {
      const res = await fetch(`${BACKEND_URL}/lotes/${id}/activar`, {
        method: "PUT",
        headers: getAuthHeaders(true),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.mensaje || "Error activando lote");
      }
      notify("Lote activado");
      await cargarLotes();
    } catch (e) {
      console.error("Error en activarLote:", e);
      notify(e.message || "Error activando lote");
    }
  };

  useEffect(() => {
  if (!showLoteModal) return;

  const token = getToken();
  if (!token) {
    console.warn("No hay token disponible todavía para cargar lotes.");
    return;
  }

  setLoadingLotes(true);
  setLotes([]);
  cargarLotes();
}, [showLoteModal]);

  // ==================== PREVIEW / PDF TÉRMICO ====================
  const openPreview = (f) => {
    setFacturaSeleccionada(f);
    setShowPreview(true);
  };

  const closePreview = () => {
    setClosingPreview(true);
    setTimeout(() => {
      setShowPreview(false);
      setClosingPreview(false);
      setFacturaSeleccionada(null);
    }, 180);
  };

  const generarPDF_Termica = (f) => {
    const items = [
      ...(f.servicios || []).map((s) => ({
        nombre: s.nombre ?? "Servicio",
        cantidad: Number(s.cantidad || 0),
        precio: Number(s.precio ?? s.price ?? s.unitPrice ?? 0),
      })),
      ...(f.productos || []).map((p) => ({
        nombre: p.nombre ?? p.name ?? "Producto",
        cantidad: Number(p.cantidad || 0),
        precio: Number(p.precio ?? p.price ?? 0),
      })),
    ];

    const alturaBase = 120;
    const alturaPorItem = 8;
    const alturaFinal = alturaBase + items.length * alturaPorItem + 45;

    const doc = new jsPDF({
      unit: "mm",
      format: [80, alturaFinal],
    });

    const pageWidth = 80;
    const centerX = pageWidth / 2;
    const marginX = 4;
    let y = 8;

    const line = () => {
      doc.setLineWidth(0.2);
      doc.line(marginX, y, pageWidth - marginX, y);
      y += 4;
    };

    try {
      doc.addImage(logo1, "PNG", 25, y, 30, 14);
      y += 16;
    } catch (err) {
      console.warn("Logo térmico no cargado:", err);
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("PETPLAZA HOSPIVET", centerX, y, { align: "center" });
    y += 5;

    doc.setFontSize(9);
    doc.text("ALM INVERSIONES SRL", centerX, y, { align: "center" });
    y += 4;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.text("Ave. La Paz, Tegucigalpa", centerX, y, { align: "center" });
    y += 3.5;
    doc.text("Tel: +504 2242-5850", centerX, y, { align: "center" });
    y += 3.5;
    doc.text("RTN: 0801-9016-859530", centerX, y, { align: "center" });
    y += 4;

    line();

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.text(`FACTURA: ${numFactura(f)}`, marginX, y);
    y += 4.5;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.text(`Fecha: ${safeDate(f.fecha || f.createdAt)}`, marginX, y);
    y += 3.8;
    doc.text(`Estado: ${f.estado}`, marginX, y);
    y += 3.8;
    doc.text(`Metodo: ${f.metodoPago}`, marginX, y);
    y += 4;

    line();

    doc.setFont("helvetica", "bold");
    doc.text("CLIENTE", marginX, y);
    y += 4;

    doc.setFont("helvetica", "normal");
    doc.text(`Nombre: ${f.cliente?.nombre || "-"}`, marginX, y);
    y += 3.8;
    doc.text(`RTN: ${f.cliente?.rtn || "-"}`, marginX, y);
    y += 3.8;
    doc.text(`Tel: ${f.cliente?.telefono || "-"}`, marginX, y);
    y += 4;

    line();

    doc.setFont("helvetica", "bold");
    doc.text("MASCOTA", marginX, y);
    y += 4;

    doc.setFont("helvetica", "normal");
    doc.text(`Nombre: ${f.mascota?.nombre || "-"}`, marginX, y);
    y += 3.8;
    doc.text(`Especie: ${f.mascota?.especie || "-"}`, marginX, y);
    y += 3.8;
    doc.text(`Raza: ${f.mascota?.raza || "-"}`, marginX, y);
    y += 4;

    line();

    doc.setFont("helvetica", "bold");
    doc.text("DETALLE", marginX, y);
    y += 4;

    doc.setFont("helvetica", "normal");
    items.forEach((item) => {
      const totalLinea = item.cantidad * item.precio;
      const nombre =
        item.nombre.length > 24
          ? `${item.nombre.slice(0, 24)}...`
          : item.nombre;

      doc.text(nombre, marginX, y);
      y += 3.6;
      doc.text(
        `${item.cantidad} x L ${item.precio.toFixed(2)} = L ${totalLinea.toFixed(2)}`,
        marginX,
        y
      );
      y += 4.2;
    });

    line();

    doc.setFont("helvetica", "bold");
    doc.text(`Subtotal: L ${Number(f.subtotal || 0).toFixed(2)}`, marginX, y);
    y += 4;
    doc.text(
      `Descuento: L ${Number(f.descuentoTotal || 0).toFixed(2)}`,
      marginX,
      y
    );
    y += 4;
    doc.text(`ISV: L ${Number(f.impuesto || 0).toFixed(2)}`, marginX, y);
    y += 4;
    doc.text(`TOTAL: L ${Number(f.total || 0).toFixed(2)}`, marginX, y);
    y += 5;

    line();

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.text(`CAI: ${f.cai || "-"}`, marginX, y);
    y += 3.5;
    doc.text(
      `Rango: ${f.caiRangoDesde || "-"} a ${f.caiRangoHasta || "-"}`,
      marginX,
      y
    );
    y += 3.5;
    doc.text(`Limite: ${safeDate(f.caiFechaLimite)}`, marginX, y);
    y += 5;

    line();

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text("GRACIAS POR SU VISITA", centerX, y, {
      align: "center",
    });
    y += 4;
    doc.text("LA FACTURA ES BENEFICIO DE TODOS, EXIJALA", centerX, y, {
      align: "center",
    });

    doc.save(`Factura_Termica_${numFactura(f)}.pdf`);
  };

  const toastIcon =
    toast.type === "success" ? (
      <CheckCircle2 size={18} />
    ) : toast.type === "warning" ? (
      <AlertTriangle size={18} />
    ) : (
      <AlertCircle size={18} />
    );

  // ==================== UI ====================
  return (
    <div className="facturacion-container">
      {toast.show && (
        <div className={`facturacion-notification-${toast.type} show`}>
          <div className="facturacion-toast-content">
            {toastIcon}
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      <div className="facturacion-header">
        <div className="facturacion-header-left">
          <h1 className="facturacion-title">Gestión de Facturación</h1>
          <p className="facturacion-subtitle">
            Panel de control y emisión de facturas
          </p>
        </div>

        <div className="facturacion-header-actions">
          <button
            ref={loteBtnRef}
            className="facturacion-menu-btn"
            title="Opciones"
            onClick={() => setShowLoteMenu((v) => !v)}
          >
            <MoreVertical size={18} />
          </button>

          {showLoteMenu && (
            <div ref={loteMenuRef} className="facturacion-menu-dropdown">
              <button
                onClick={() => {
                  setShowLoteMenu(false);
                  setShowLoteModal(true);
                }}
              >
                Gestión de Lote CAI
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="facturacion-stats small">
        <div className="stat-card blue">
          <FileText size={22} />
          <div>
            <h4>{facturas.length}</h4>
            <p>Emitidas</p>
          </div>
        </div>
        <div className="stat-card green">
          <CheckCircle size={22} />
          <div>
            <h4>{facturas.filter((f) => f.estado === "Pagado").length}</h4>
            <p>Pagadas</p>
          </div>
        </div>
        <div className="stat-card orange">
          <Clock size={22} />
          <div>
            <h4>{facturas.filter((f) => f.estado === "Pendiente").length}</h4>
            <p>Pendientes</p>
          </div>
        </div>
        <div className="stat-card teal">
          <Calculator size={22} />
          <div>
            <h4>
              {currency(
                facturas
                  .filter((f) => f.estado === "Pagado")
                  .reduce((a, x) => a + Number(x.total || 0), 0)
              )}
            </h4>
            <p>Recaudado</p>
          </div>
        </div>
      </div>

      <div className="facturacion-search mejorada">
        <input
          type="text"
          placeholder="🔍 Buscar por número, cliente o mascota"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <button className="facturacion-btn-primary" onClick={openNuevoModal}>
          <Plus size={15} /> Nueva Factura
        </button>
      </div>

      <div className="facturacion-table-container">
        <table className="facturacion-table">
          <thead>
            <tr>
              <th>Número</th>
              <th>Fecha</th>
              <th>Cliente</th>
              <th>Mascota</th>
              <th>Total</th>
              <th>Método</th>
              <th>Estado</th>
              <th style={{ textAlign: "right" }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="8" style={{ textAlign: "center", padding: "1rem" }}>
                  Cargando...
                </td>
              </tr>
            ) : facturasFiltradas.length === 0 ? (
              <tr>
                <td colSpan="8" style={{ textAlign: "center", padding: "1rem" }}>
                  No hay facturas registradas
                </td>
              </tr>
            ) : (
              facturasFiltradas.map((f) => (
                <tr key={f._id}>
                  <td>{numFactura(f)}</td>
                  <td>{safeDate(f.fecha || f.createdAt)}</td>
                  <td>{f.cliente?.nombre}</td>
                  <td>{f.mascota?.nombre}</td>
                  <td className="facturacion-total-amount">{currency(f.total)}</td>
                  <td>
                    <span className="facturacion-metodo-pago-badge">
                      {f.metodoPago}
                    </span>
                  </td>
                  <td>
                    <button
                      className={`facturacion-status-btn ${
                        f.estado === "Pagado"
                          ? "pagado"
                          : f.estado === "Cancelado"
                          ? "cancelado"
                          : "pendiente"
                      } ${f.estado !== "Pendiente" ? "disabled" : ""}`}
                      onClick={() => toggleEstado(f)}
                      disabled={f.estado !== "Pendiente"}
                      title={
                        f.estado === "Pendiente"
                          ? "Marcar como pagada"
                          : f.estado === "Pagado"
                          ? "La factura pagada ya no puede cambiar de estado"
                          : "La factura cancelada no puede cambiar de estado"
                      }
                    >
                      {f.estado}
                    </button>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <div className="facturacion-action-buttons">
                      <button
                        className="facturacion-action-btn view"
                        title="Ver"
                        onClick={() => openPreview(f)}
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        className="facturacion-action-btn edit"
                        onClick={() => openEditModal(f)}
                        disabled={f.estado === "Cancelado"}
                        title={
                          f.estado === "Cancelado"
                            ? "Factura cancelada"
                            : "Editar factura"
                        }
                        style={{
                          opacity: f.estado === "Cancelado" ? 0.5 : 1,
                          cursor:
                            f.estado === "Cancelado" ? "not-allowed" : "pointer",
                        }}
                      >
                        <Edit3 size={16} />
                      </button>
                      <button
                        className="facturacion-action-btn cancel"
                        onClick={() => askCancel(f)}
                        disabled={f.estado === "Cancelado"}
                        title={
                          f.estado === "Cancelado"
                            ? "Factura cancelada"
                            : "Cancelar factura"
                        }
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showPreview && facturaSeleccionada && (
        <div
          className={`facturacion-modal-overlay ${
            closingPreview ? "closing" : "active"
          }`}
        >
          <div
            className={`facturacion-modal facturacion-modal-preview ${
              closingPreview ? "closing" : "active"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="facturacion-modal-header">
              <h2>Vista Previa de Factura</h2>
              <div className="facturacion-preview-buttons">
                <button
                  className="facturacion-btn-termica"
                  onClick={() => generarPDF_Termica(facturaSeleccionada)}
                  title="Imprimir en formato térmico"
                >
                  Imprimir ticket
                </button>

                <button className="facturacion-close-btn" onClick={closePreview}>
                  <X size={16} />
                </button>
              </div>
            </div>

            <div className="facturacion-factura-container">
              <div className="facturacion-factura-header">
                <div className="facturacion-factura-empresa">
                  <h2>PetPlaza Hospivet</h2>
                  <div>Tegucigalpa, Ave. La Paz | Tel: +504 2242-5850</div>
                  <div>leovetequi@gmail.com | RTN: 0801-9016-859530</div>
                </div>

                <div className="facturacion-factura-info">
                  <div style={{ fontWeight: 800, fontSize: 18 }}>FACTURA</div>
                  <div>
                    <strong>Número:</strong> {numFactura(facturaSeleccionada)}
                  </div>
                  <div>
                    <strong>Fecha:</strong>{" "}
                    {safeDate(
                      facturaSeleccionada.fecha || facturaSeleccionada.createdAt
                    )}
                  </div>
                  <div>
                    <strong>Estado:</strong> {facturaSeleccionada.estado}
                  </div>
                  <div>
                    <strong>Método:</strong> {facturaSeleccionada.metodoPago}
                  </div>
                </div>
              </div>

              <div className="facturacion-fiscal-box">
                <div>
                  <strong>CAI:</strong> {facturaSeleccionada.cai}
                </div>
                <div>
                  <strong>Rango:</strong> {facturaSeleccionada.caiRangoDesde} a{" "}
                  {facturaSeleccionada.caiRangoHasta}
                  &nbsp;&nbsp;&nbsp;&nbsp;
                  <strong>Fecha límite:</strong>{" "}
                  {safeDate(facturaSeleccionada.caiFechaLimite)}
                </div>
              </div>

              <div className="facturacion-form-row">
                <div className="facturacion-card">
                  <h3>Datos del Cliente</h3>
                  <div>
                    <strong>Nombre:</strong> {facturaSeleccionada.cliente?.nombre}
                  </div>
                  <div>
                    <strong>Mascota:</strong> {facturaSeleccionada.mascota?.nombre}
                  </div>
                  <div>
                    <strong>RTN:</strong>{" "}
                    {facturaSeleccionada.cliente?.rtn || "No especificado"}
                  </div>
                </div>
                <div className="facturacion-card">
                  <h3>Información de Pago</h3>
                  <div>
                    <strong>Método de pago:</strong>{" "}
                    {facturaSeleccionada.metodoPago}
                  </div>
                </div>
              </div>

              <table className="facturacion-detalles-table">
                <thead>
                  <tr>
                    <th>Descripción</th>
                    <th>Cantidad</th>
                    <th>Precio Unitario</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {(facturaSeleccionada.servicios || []).map((s, i) => (
                    <tr key={`s-${i}`}>
                      <td data-label="Descripción">{s.nombre}</td>
                      <td data-label="Cantidad">{s.cantidad}</td>
                      <td data-label="Precio Unitario">
                        {currency(Number(s.precio ?? s.price ?? s.unitPrice ?? 0))}
                      </td>
                      <td data-label="Total">
                        {currency(
                          Number(s.precio ?? s.price ?? s.unitPrice ?? 0) *
                            (s.cantidad || 0)
                        )}
                      </td>
                    </tr>
                  ))}
                  {(facturaSeleccionada.productos || []).map((p, i) => {
                    const nombre = p.nombre ?? p.name ?? "Producto";
                    const precio = Number(p.precio ?? p.price ?? 0);
                    return (
                      <tr key={`p-${i}`}>
                        <td data-label="Descripción">{nombre}</td>
                        <td data-label="Cantidad">{p.cantidad}</td>
                        <td data-label="Precio Unitario">{currency(precio)}</td>
                        <td data-label="Total">
                          {currency(precio * (p.cantidad || 0))}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              <div className="facturacion-factura-totales">
                <div className="facturacion-total-row">
                  <span>Subtotal</span>
                  <strong>{currency(facturaSeleccionada.subtotal)}</strong>
                </div>
                {Number(facturaSeleccionada.descuentoTotal || 0) > 0 && (
                  <>
                    <div className="facturacion-total-row">
                      <span>Descuento</span>
                      <strong>{currency(facturaSeleccionada.descuentoTotal)}</strong>
                    </div>
                    <div className="facturacion-total-row">
                      <span>Base imponible</span>
                      <strong>{currency(facturaSeleccionada.baseImponible)}</strong>
                    </div>
                  </>
                )}
                <div className="facturacion-total-row">
                  <span>ISV (15%)</span>
                  <strong>{currency(facturaSeleccionada.impuesto)}</strong>
                </div>
                <div className="facturacion-total-row facturacion-grand-total">
                  <span>TOTAL</span>
                  <strong>{currency(facturaSeleccionada.total)}</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showNuevoModal && (
        <div
          className={`facturacion-modal-overlay ${
            closingNuevoModal ? "closing" : "active"
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className={`facturacion-modal ${
              closingNuevoModal ? "closing" : "active"
            }`}
          >
            <div className="facturacion-modal-header">
              <h2>{modoEdicion ? "Editar Factura" : "Nueva Factura"}</h2>
              <button className="facturacion-close-btn" onClick={closeNuevoModal}>
                <X size={16} />
              </button>
            </div>

            <div className="facturacion-form-section">
              <div className="facturacion-form-row">
                <div className="facturacion-form-group">
                  <label>Dueño *</label>
                  <select
                    value={formData.cliente.ownerId}
                    onChange={(e) => onSelectOwner(e.target.value)}
                    required
                  >
                    <option value="">Seleccionar dueño</option>
                    {owners.map((o, i) => (
                      <option
                        key={o._id || o.id || `owner-${i}`}
                        value={o._id || o.id}
                      >
                        {o.full_name || o.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="facturacion-form-group">
                  <label>Mascota *</label>
                  <select
                    value={formData.mascota.petId}
                    onChange={(e) =>
                      setFormData((s) => ({
                        ...s,
                        mascota: { petId: e.target.value },
                      }))
                    }
                    disabled={!formData.cliente.ownerId}
                    required
                  >
                    <option value="">Seleccionar mascota</option>
                    {mascotasDelOwner.map((p, i) => (
                      <option
                        key={p._id || p.id || `pet-${i}`}
                        value={p._id || p.id}
                      >
                        {p.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="facturacion-form-row">
                <div className="facturacion-form-group">
                  <label>RTN (14 dígitos)</label>
                  <input
                    value={formData.cliente.rtn}
                    maxLength={14}
                    onChange={(e) =>
                      setFormData((s) => ({
                        ...s,
                        cliente: {
                          ...s.cliente,
                          rtn: e.target.value.replace(/\D/g, ""),
                        },
                      }))
                    }
                    placeholder="08011999001234"
                  />
                </div>

                <div className="facturacion-form-group">
                  <label>Método de pago *</label>
                  <select
                    value={formData.metodoPago}
                    onChange={(e) =>
                      setFormData((s) => ({ ...s, metodoPago: e.target.value }))
                    }
                    required
                  >
                    <option value="">Seleccionar método</option>
                    <option>Efectivo</option>
                    <option>Tarjeta</option>
                    <option>Transferencia</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="facturacion-form-section">
              <h3>Servicios</h3>
              <div className="facturacion-form-group">
                <select onChange={(e) => e.target.value && addServicio(e.target.value)}>
                  <option value="">Seleccionar servicio</option>
                  {servicios.map((s, i) => (
                    <option
                      key={s._id || s.id || `serv-${i}`}
                      value={s._id || s.id}
                    >
                      {s.nombre} — {currency(s.precio || 0)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="facturacion-items-list">
                {formData.servicios.map((it, i) => (
                  <div
                    key={it.servicioId || it._id || `srv-${i}`}
                    className="facturacion-item-card"
                  >
                    <div className="facturacion-item-info">
                      <div className="facturacion-item-name">{it.nombre}</div>
                      <div className="facturacion-item-price">{currency(it.precio)}</div>
                    </div>
                    <div className="facturacion-item-controls">
                      <div className="facturacion-quantity-control">
                        <button
                          type="button"
                          onClick={() => updServQty(it.servicioId || it._id, -1)}
                        >
                          –
                        </button>
                        <span>{it.cantidad || 1}</span>
                        <button
                          type="button"
                          onClick={() => updServQty(it.servicioId || it._id, +1)}
                        >
                          +
                        </button>
                      </div>
                      <div className="facturacion-item-total">
                        {currency((it.precio || 0) * (it.cantidad || 1))}
                      </div>
                      <button
                        type="button"
                        className="facturacion-remove-item-btn"
                        onClick={() => delServ(it.servicioId || it._id)}
                      >
                        🗑
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="facturacion-form-section">
              <h3>Productos</h3>
              <div className="facturacion-form-group">
                <select onChange={(e) => e.target.value && addProducto(e.target.value)}>
                  <option value="">Seleccionar producto</option>
                  {productos
                    .filter((p) => Number(p.quantity ?? 0) > 0)
                    .map((p, i) => (
                      <option
                        key={p._id || p.id || `prod-${i}`}
                        value={p._id || p.id}
                      >
                        {p.name || p.nombre} —{" "}
                        {currency(p.price ?? p.precio ?? 0)} (Stock: {p.quantity})
                      </option>
                    ))}
                </select>
              </div>

              <div className="facturacion-items-list">
                {formData.productos.map((it, i) => {
                  const precio = Number(it.precio ?? it.price ?? 0);
                  return (
                    <div
                      key={it.productId || it._id || `prd-${i}`}
                      className="facturacion-item-card"
                    >
                      <div className="facturacion-item-info">
                        <div className="facturacion-item-name">
                          {it.nombre || it.name}
                        </div>
                        <div className="facturacion-item-price">{currency(precio)}</div>
                      </div>
                      <div className="facturacion-item-controls">
                        <div className="facturacion-quantity-control">
                          <button
                            type="button"
                            onClick={() => updProdQty(it.productId || it._id, -1)}
                          >
                            –
                          </button>
                          <span>{it.cantidad || 1}</span>
                          <button
                            type="button"
                            onClick={() => updProdQty(it.productId || it._id, +1)}
                          >
                            +
                          </button>
                        </div>
                        <div className="facturacion-item-total">
                          {currency(precio * (it.cantidad || 1))}
                        </div>
                        <button
                          type="button"
                          className="facturacion-remove-item-btn"
                          onClick={() => delProd(it.productId || it._id)}
                        >
                          🗑
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="facturacion-form-section">
              <h3>Descuentos</h3>
              <div className="facturacion-form-row">
                <div className="facturacion-form-group">
                  <label>Tipo de descuento</label>
                  <select
                    value={formData.descuentoTipo}
                    onChange={(e) =>
                      setFormData((s) => ({
                        ...s,
                        descuentoTipo: e.target.value,
                      }))
                    }
                  >
                    <option value="monto">Monto (L)</option>
                    <option value="porcentaje">Porcentaje (%)</option>
                  </select>
                </div>

                <div className="facturacion-form-group">
                  <label>Valor</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.descuentoValor}
                    onChange={(e) => {
                      const value = e.target.value;

                      if (value === "") {
                        setFormData((s) => ({ ...s, descuentoValor: "" }));
                        return;
                      }

                      const n = Number(value);

                      if (n < 0) {
                        notify("El descuento no puede ser negativo.", "warning");
                        return;
                      }

                      if (
                        formData.descuentoTipo === "porcentaje" &&
                        n > 100
                      ) {
                        notify(
                          "El descuento en porcentaje no puede ser mayor a 100.",
                          "warning"
                        );
                        setFormData((s) => ({ ...s, descuentoValor: 100 }));
                        return;
                      }

                      setFormData((s) => ({ ...s, descuentoValor: value }));
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="facturacion-form-section">
              <div className="facturacion-form-totals">
                <div className="facturacion-total-row">
                  <span>Subtotal:</span> <strong>{currency(subtotal)}</strong>
                </div>
                <div className="facturacion-total-row">
                  <span>Descuento:</span> <strong>- {currency(descuentoTotal)}</strong>
                </div>
                <div className="facturacion-total-row">
                  <span>Base imponible:</span>{" "}
                  <strong>{currency(baseImponible)}</strong>
                </div>
                <div className="facturacion-total-row">
                  <span>ISV (15%):</span> <strong>{currency(impuesto)}</strong>
                </div>
                <div className="facturacion-total-row facturacion-grand-total">
                  <span>TOTAL:</span> <strong>{currency(total)}</strong>
                </div>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: ".5rem" }}>
              <button className="facturacion-btn-secondary" onClick={closeNuevoModal}>
                Cancelar
              </button>
              <button className="facturacion-btn-primary" onClick={handleGuardarFactura}>
                {modoEdicion ? "Guardar Cambios" : "Generar Factura"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showConfirm && (
        <div
          className={`facturacion-modal-overlay ${
            closingConfirm ? "closing" : "active"
          }`}
        >
          <div
            className={`facturacion-modal facturacion-confirm-modal ${
              closingConfirm ? "closing" : "active"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="facturacion-modal-header">
              <h2>Confirmar Cancelación</h2>
              <button className="facturacion-close-btn" onClick={closeConfirmModal}>
                <X size={16} />
              </button>
            </div>

            <div className="facturacion-confirm-content">
              <p>
                ¿Deseas cancelar la factura{" "}
                <strong>{numFactura(facturaAEliminar)}</strong> de{" "}
                <strong>{facturaAEliminar?.cliente?.nombre}</strong>?
                <br />
                <span style={{ color: "#b91c1c", fontWeight: "600" }}>
                  Esta acción marcará la factura como CANCELADA y no podrá
                  modificarse ni cambiar su estado.
                </span>
              </p>

              <div className="facturacion-confirm-actions">
                <button
                  className="facturacion-btn-secondary"
                  onClick={closeConfirmModal}
                >
                  No, volver
                </button>
                <button
                  className="facturacion-btn-danger"
                  onClick={handleCancelFactura}
                >
                  Sí, cancelar factura
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showLoteModal && (
        <div
          className={`facturacion-modal-overlay ${
            closingLoteModal ? "closing" : "active"
          }`}
        >
          <div
            className={`facturacion-modal ${
              closingLoteModal ? "closing" : "active"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="facturacion-modal-header">
              <h2>Gestión de Lote CAI</h2>
              <button className="facturacion-close-btn" onClick={closeLoteModal}>
                <X size={16} />
              </button>
            </div>

            <div className="facturacion-form-section">
              <h3>Historial de Lotes CAI</h3>
              {loadingLotes ? (
                <p>Cargando lotes...</p>
              ) : lotes.length === 0 ? (
                <p>No hay lotes registrados.</p>
              ) : (
                <table className="facturacion-table">
                  <thead>
                    <tr>
                      <th>CAI</th>
                      <th>Rango</th>
                      <th>Correlativo</th>
                      <th>Vence</th>
                      <th>Estado</th>
                      {user?.role === "admin" && <th>Acción</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {lotes.map((l) => {
                      const dias = Math.ceil(
                        (new Date(l.fechaLimite) - new Date()) /
                          (1000 * 60 * 60 * 24)
                      );
                      const vencido = dias <= 0;
                      return (
                        <tr
                          key={l._id}
                          className={
                            l.activo ? "lote-activo" : vencido ? "lote-vencido" : ""
                          }
                        >
                          <td>{l.cai}</td>
                          <td>
                            {l.rangoDesde} → {l.rangoHasta}
                          </td>
                          <td>{l.correlativoActual}</td>
                          <td>{safeDate(l.fechaLimite)}</td>
                          <td>
                            {l.activo ? (
                              <span className="estado-lote activo">Activo</span>
                            ) : vencido ? (
                              <span className="estado-lote vencido">Vencido</span>
                            ) : (
                              <span className="estado-lote inactivo">Inactivo</span>
                            )}
                          </td>
                          {user?.role === "admin" && (
                            <td>
                              {!l.activo && !vencido && (
                                <button
                                  className="facturacion-btn-primary mini"
                                  onClick={() => activarLote(l._id)}
                                >
                                  Activar
                                </button>
                              )}
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {user?.role === "admin" && (
              <div className="facturacion-form-section">
                <h3>Registrar nuevo lote CAI</h3>
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();

                    const regexCAI = /^[A-Z0-9-]{10,40}$/;
                    const regexRango = /^[0-9-]{17,19}$/;

                    if (!regexCAI.test(nuevoLote.cai)) {
                      notify(
                        "El CAI debe contener solo letras, números y guiones (10 a 40 caracteres).",
                        "warning"
                      );
                      return;
                    }

                    if (
                      !regexRango.test(nuevoLote.rangoDesde) ||
                      !regexRango.test(nuevoLote.rangoHasta)
                    ) {
                      notify(
                        "Formato de rango inválido. Use 000-001-01-00000001.",
                        "warning"
                      );
                      return;
                    }

                    if (nuevoLote.rangoDesde >= nuevoLote.rangoHasta) {
                      notify(
                        "El rango final debe ser mayor que el inicial.",
                        "warning"
                      );
                      return;
                    }

                    await crearLote(e);
                  }}
                >
                  <div className="facturacion-form-group">
                    <label>CAI *</label>
                    <input
                      required
                      placeholder="Ingrese el CAI proporcionado por el SAR"
                      value={nuevoLote.cai}
                      onChange={(e) =>
                        setNuevoLote({
                          ...nuevoLote,
                          cai: e.target.value
                            .toUpperCase()
                            .replace(/[^A-Z0-9-]/g, ""),
                        })
                      }
                      maxLength={40}
                    />
                  </div>

                  <div className="facturacion-form-row">
                    <div className="facturacion-form-group">
                      <label>Rango desde *</label>
                      <input
                        required
                        placeholder="000-001-01-00000001"
                        value={nuevoLote.rangoDesde}
                        onChange={(e) =>
                          setNuevoLote({
                            ...nuevoLote,
                            rangoDesde: e.target.value.replace(/[^0-9-]/g, ""),
                          })
                        }
                        maxLength={19}
                      />
                    </div>
                    <div className="facturacion-form-group">
                      <label>Rango hasta *</label>
                      <input
                        required
                        placeholder="000-001-01-00005000"
                        value={nuevoLote.rangoHasta}
                        onChange={(e) =>
                          setNuevoLote({
                            ...nuevoLote,
                            rangoHasta: e.target.value.replace(/[^0-9-]/g, ""),
                          })
                        }
                        maxLength={19}
                      />
                    </div>
                  </div>

                  <button className="facturacion-btn-primary" type="submit">
                    Crear Lote
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
