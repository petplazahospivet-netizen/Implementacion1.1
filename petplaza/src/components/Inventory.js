// src/components/Inventory.js
import React, { useState, useEffect } from "react";
import {
  Edit,
  Trash2,
  ClipboardList,
  AlertTriangle,
  CalendarDays,
  Stethoscope,
} from "lucide-react";
import "../CSS/Inventory.css";

import {
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  registrarEntrada,
} from "../apis/productsApi";

const Inventory = ({ user }) => {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [closingModal, setClosingModal] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [closingDeleteModal, setClosingDeleteModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);

  // ===============================
  // Toast moderno (igual que Mascotas)
  // ===============================
  const [toast, setToast] = useState({
    show: false,
    type: "success",
    message: "",
  });

  // Campos del formulario
  const [form, setForm] = useState({
    name: "",
    category: "",
    price: "",
    provider: "",
    expiryDate: "",
    quantity: "",
    minStock: "",
    purchaseDate: "",
    nota: "",
  });

  const [addQty, setAddQty] = useState("");
  const [fechaIngreso, setFechaIngreso] = useState("");
  const [compraNota, setCompraNota] = useState("");

  // ===============================
  // Cargar productos al iniciar
  // ===============================
  useEffect(() => {
    loadProducts();
  }, []);

  // ===============================
  // Mostrar toast
  // ===============================
  const showToast = (type, message) => {
    setToast({ show: true, type, message });
    setTimeout(() => {
      setToast((t) => ({ ...t, show: false }));
    }, 3000);
  };

  const loadProducts = async () => {
    try {
      const data = await getProducts();
      setItems(data);
    } catch (err) {
      console.error("❌ Error cargando productos:", err);
    }
  };

  // ===============================
  // Manejo del formulario
  // ===============================
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const openNew = () => {
    setEditingId(null);
    setForm({
      name: "",
      category: "",
      price: "",
      provider: "",
      expiryDate: "",
      quantity: "",
      minStock: "",
      purchaseDate: "",
      nota: "",
    });
    setAddQty("");
    setFechaIngreso("");
    setCompraNota("");
    setShowModal(true);
    setClosingModal(false);
  };

  const handleEdit = (item) => {
    setEditingId(item._id);
    setForm({
      name: item.name,
      category: item.category,
      price: item.price,
      provider: item.provider,
      expiryDate: item.expiryDate?.substring(0, 10),
      quantity: item.quantity,
      minStock: item.minStock,
      purchaseDate: item.purchaseDate?.substring(0, 10) || "",
      nota: item.nota || "",
    });

    setAddQty("");
    setFechaIngreso("");
    setCompraNota("");
    setShowModal(true);
    setClosingModal(false);
  };

  const handleCancel = () => {
    setClosingModal(true);
    setTimeout(() => {
      setShowModal(false);
      setEditingId(null);
      setClosingModal(false);
    }, 250);
  };

  // ===============================
  // Guardar (Crear / Actualizar)
  // ===============================
  const handleSave = async (e) => {
    e.preventDefault();

    try {
      if (editingId) {
        // Actualizar datos del producto
        await updateProduct(editingId, {
          name: form.name,
          category: form.category,
          price: parseFloat(form.price),
          provider: form.provider,
          expiryDate: form.expiryDate,
          minStock: parseInt(form.minStock),
          purchaseDate: form.purchaseDate,
          nota: form.nota,
        });

        // Registrar nueva compra / entrada
        if (addQty && parseInt(addQty) > 0) {
          await registrarEntrada({
            productId: editingId,
            cantidad: parseInt(addQty),
            fecha: fechaIngreso || new Date().toISOString().substring(0, 10),
          });
        }
      } else {
        // Crear producto nuevo
        await createProduct({
          name: form.name,
          category: form.category,
          price: parseFloat(form.price),
          provider: form.provider,
          expiryDate: form.expiryDate,
          quantity: parseInt(form.quantity) || 0,
          minStock: parseInt(form.minStock),
          purchaseDate: form.purchaseDate,
          nota: form.nota,
        });
      }
      await loadProducts();

      if (editingId) {
        showToast("success", "Producto actualizado correctamente");
      } else {
        showToast("success", "Producto registrado correctamente");
      }

      handleCancel();
    } catch (err) {
      console.error("❌ Error guardando:", err);
      alert("Error: " + err.message);
    }
  };

  // ===============================
  // Eliminar producto
  // ===============================
  const confirmDelete = (item) => {
    setItemToDelete(item);
    setShowDeleteModal(true);
    setClosingDeleteModal(false);
  };

  const handleDeleteConfirmed = async () => {
    try {
      await deleteProduct(itemToDelete._id);
      await loadProducts();
      showToast("success", "Producto eliminado correctamente");
      closeDeleteModal();
    } catch (err) {
      console.error("❌ Error eliminando:", err);
      alert("Error al eliminar");
    }
  };

  const closeDeleteModal = () => {
    setClosingDeleteModal(true);
    setTimeout(() => {
      setShowDeleteModal(false);
      setClosingDeleteModal(false);
      setItemToDelete(null);
    }, 250);
  };

  // ===============================
  // Métricas
  // ===============================
  const totalProducts = items.length;
  const stockLow = items.filter((i) => i.quantity <= i.minStock).length;
  const expired = items.filter(
    (i) => i.expiryDate && new Date(i.expiryDate) < new Date()
  ).length;

  const totalValue = items.reduce(
    (sum, i) => sum + i.quantity * parseFloat(i.price || 0),
    0
  );

  // ===============================
  // FILTRO
  // ===============================
  const filteredItems = items.filter((i) =>
    i.name?.toLowerCase().includes(search.toLowerCase())
  );

  /* ==========================================================
     🚀 RENDER PRINCIPAL DEL COMPONENTE
  ========================================================== */
  if (
    !user ||
    (user.role !== "admin" && user.role !== "veterinario" && user.role !== "farmacia")) {
    return (
      <div className="inventory-no-permissions">
        🚫 No tienes permisos para ver la Gestión de Inventario.
      </div>
    );
  }

  return (
    <div className="inventory-container">
      <div className="inventory-content">
        <h2>Inventario</h2>
        <p className="subtitle">Gestión de medicamentos y productos médicos.</p>

        {/* TARJETAS RESUMEN */}
        <div className="summary-cards">
          <div className="card info">
            <div className="icon blue">
              <ClipboardList className="icon-inner" />
            </div>
            <div>
              <h3>{totalProducts}</h3>
              <p>Total de productos</p>
            </div>
          </div>

          <div className="card warning">
            <div className="icon orange">
              <AlertTriangle className="icon-inner" />
            </div>
            <div>
              <h3>{stockLow}</h3>
              <p>Stock Bajo</p>
            </div>
          </div>

          <div className="card danger">
            <div className="icon red">
              <CalendarDays className="icon-inner" />
            </div>
            <div>
              <h3>{expired}</h3>
              <p>Vencidos</p>
            </div>
          </div>

          <div className="card success">
            <div className="icon green">
              <Stethoscope className="icon-inner" />
            </div>
            <div>
              <h3>
                L.{" "}
                {totalValue.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </h3>
              <p>Valor total</p>
            </div>
          </div>
        </div>

        {/* BUSCADOR + NUEVO */}
        <div className="toolbar">
          <input
            type="text"
            placeholder="Buscar productos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button className="inventory-btn add" onClick={openNew}>
            + Nuevo Producto
          </button>
        </div>

        {/* TABLA */}
        <table className="inventory-table">
          <thead>
            <tr>
              <th>Producto</th>
              <th>Categoría</th>
              <th>Cantidad</th>
              <th>Precio Unidad</th>
              <th>Proveedor</th>
              <th>Vencimiento</th>
              <th>Acciones</th>
            </tr>
          </thead>

          <tbody>
            {filteredItems.map((item) => (
              <tr key={item._id}>
                <td data-label="Producto">{item.name}</td>

                <td data-label="Categoría">{item.category}</td>

                <td data-label="Cantidad" className="td-center">
                  {item.quantity}
                </td>

                <td data-label="Precio Unidad">
                  L. {parseFloat(item.price).toFixed(2)}
                </td>

                <td data-label="Proveedor">{item.provider}</td>

                <td
                  data-label="Vencimiento"
                  className={
                    new Date(item.expiryDate) < new Date() ? "expired" : ""
                  }
                >
                  {item.expiryDate?.substring(0, 10)}
                </td>

                <td data-label="Acciones" className="inventory-actions">
                  <button
                    className="action-btn edit"
                    onClick={() => handleEdit(item)}
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    className="action-btn delete"
                    onClick={() => confirmDelete(item)}
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MODAL EDITAR / CREAR */}
      {showModal && (
        <div
          className={`inventory-modal-overlay ${
            closingModal ? "closing" : "active"
          }`}
          onClick={(e) =>
            e.target.classList.contains("inventory-modal-overlay") &&
            handleCancel()
          }
        >
          <div
            className={`inventory-modal ${closingModal ? "closing" : "active"}`}
          >
            <h3>
              {editingId ? "Editar producto" : "Registrar nuevo producto"}
            </h3>

            <form className="modal-form" onSubmit={handleSave}>
              {/* NOMBRE */}
              <div className="form-row">
                <label>Nombre</label>
                <input
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  required
                />
              </div>

              {/* PROVEEDOR - SOLO CREAR */}
              {!editingId && (
                <div className="form-row">
                  <label>Proveedor</label>
                  <input
                    name="provider"
                    value={form.provider}
                    onChange={handleChange}
                  />
                </div>
              )}

              {/* CATEGORÍA - SOLO CREAR */}
              {!editingId && (
                <div className="form-row">
                  <label>Categoría</label>
                  <input
                    name="category"
                    value={form.category}
                    onChange={handleChange}
                    required
                  />
                </div>
              )}

              {/* CANTIDAD INICIAL - SOLO CREAR */}
              {!editingId && (
                <div className="form-row">
                  <label>Cantidad inicial</label>
                  <input
                    name="quantity"
                    type="number"
                    min="0"
                    value={form.quantity}
                    onChange={handleChange}
                    required
                  />
                </div>
              )}

              {/* PRECIO */}
              <div className="form-row">
                <label>Precio (Lps)</label>
                <input
                  name="price"
                  type="number"
                  step="0.01"
                  value={form.price}
                  onChange={handleChange}
                  required
                />
              </div>

              {/* STOCK MÍNIMO */}
              <div className="form-row">
                <label>Stock mínimo</label>
                <input
                  name="minStock"
                  type="number"
                  min="0"
                  value={form.minStock}
                  onChange={handleChange}
                  required
                />
              </div>

              {/* FECHA DE INGRESO - SOLO CREAR */}
              {!editingId && (
                <div className="form-row">
                  <label>Fecha de ingreso</label>
                  <input
                    name="purchaseDate"
                    type="date"
                    value={form.purchaseDate}
                    onChange={handleChange}
                    required
                  />
                </div>
              )}

              {/* FECHA DE VENCIMIENTO */}
              <div className="form-row">
                <label>Fecha de vencimiento</label>
                <input
                  name="expiryDate"
                  type="date"
                  value={form.expiryDate}
                  onChange={handleChange}
                />
              </div>

              {/* NOTA - SOLO CREAR */}
              {!editingId && (
                <div className="form-row">
                  <label>Nota (opcional)</label>
                  <input
                    name="nota"
                    value={form.nota}
                    onChange={handleChange}
                  />
                </div>
              )}

              {/* SOLO EDITAR */}
              {editingId && (
                <>
                  <div className="form-row">
                    <label>Cantidad actual</label>
                    <input value={form.quantity} disabled />
                  </div>

                  <div className="form-row">
                    <label>Cantidad a sumar (compra)</label>
                    <input
                      type="number"
                      min="1"
                      value={addQty}
                      onChange={(e) => setAddQty(e.target.value)}
                    />
                  </div>

                  <div className="form-row">
                    <label>Fecha de ingreso (compra)</label>
                    <input
                      type="date"
                      value={fechaIngreso}
                      onChange={(e) => setFechaIngreso(e.target.value)}
                    />
                  </div>
                </>
              )}

              <div className="modal-actions">
                <button className="inventory-btn add" type="submit">
                  {editingId ? "Actualizar" : "Guardar"}
                </button>
                <button
                  className="inventory-btn cancel"
                  type="button"
                  onClick={handleCancel}
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL ELIMINAR */}
      {showDeleteModal && (
        <div
          className={`inventory-modal-overlay ${
            closingDeleteModal ? "closing" : "active"
          }`}
        >
          <div
            className={`inventory-delete-modal ${
              closingDeleteModal ? "closing" : "active"
            }`}
          >
            <h2>¿Eliminar producto?</h2>
            <p>
              ¿Seguro que deseas eliminar <strong>{itemToDelete?.name}</strong>?
            </p>
            <div className="modal-actions">
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

      {/* ======================= TOAST ======================= */}
      {toast.show && (
        <div
          className={`toast-notify ${
            toast.type === "success" ? "success" : "error"
          }`}
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

          <span className="toast-message">{toast.message}</span>
        </div>
      )}
    </div>
  );
};

export default Inventory;
