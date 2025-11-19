const Usuario = require("../models/Usuario");
const bcrypt = require("bcryptjs");
const {
  sendWelcomeEmail,
  sendUserUpdatedEmail,
  sendUserDeletedEmail,
  sendUserStateEmail,
  sendPasswordResetSuccessEmail,
} = require("../util/sendEmail");

/* =====================================================
   📋 OBTENER TODOS LOS USUARIOS
   ===================================================== */
exports.getUsers = async (req, res) => {
  try {
    const users = await Usuario.find().sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    res
      .status(500)
      .json({ mensaje: "Error obteniendo usuarios", error: err.message });
  }
};

/* =====================================================
   🧩 CREAR NUEVO USUARIO
   ===================================================== */
exports.createUser = async (req, res) => {
  try {
    const { username, email, full_name, password, role, phones, status } =
      req.body;

    if (!username || !email || !full_name || !password)
      return res
        .status(400)
        .json({ mensaje: "Todos los campos son requeridos" });

    // Validar duplicados
    const existeUser = await Usuario.findOne({ username });
    if (existeUser)
      return res
        .status(400)
        .json({ mensaje: "El nombre de usuario ya existe" });

    const existeEmail = await Usuario.findOne({ email });
    if (existeEmail)
      return res.status(400).json({ mensaje: "El correo ya está registrado" });

    // Hashear contraseña
    const hash = await bcrypt.hash(password, 10);

    const nuevo = new Usuario({
      username,
      email,
      full_name,
      password: hash,
      role: role || "veterinario",
      phones: phones || [],
      status: status || "active",
      is_active: status === "active",
    });

    await nuevo.save();
    // 📧 Enviar correo de bienvenida
    if (nuevo.email) {
      await sendWelcomeEmail(nuevo.email);
    }
    res.status(201).json({ mensaje: "Usuario registrado correctamente" });
  } catch (err) {
    console.error("❌ Error en createUser:", err);
    res
      .status(500)
      .json({ mensaje: "Error creando usuario", error: err.message });
  }
};

/* =====================================================
   🛠️ ACTUALIZAR USUARIO
   ===================================================== */
exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { email, full_name, role, phones, status } = req.body;

    const user = await Usuario.findById(id);
    if (!user)
      return res.status(404).json({ mensaje: "Usuario no encontrado" });

    user.email = email || user.email;
    user.full_name = full_name || user.full_name;
    user.role = role || user.role;
    user.phones = phones || user.phones;
    user.status = status || user.status;
    user.is_active = status === "active";

    await user.save();
    // 📧 Notificar actualización de usuario
    if (user.email) {
      await sendUserUpdatedEmail(user.email, user.full_name || user.username);
    }
    res.json({ mensaje: "Usuario actualizado correctamente", user });
  } catch (err) {
    console.error("❌ Error en updateUser:", err);
    res
      .status(500)
      .json({ mensaje: "Error actualizando usuario", error: err.message });
  }
};

/* =====================================================
   🔑 RESETEAR CONTRASEÑA
   ===================================================== */
exports.resetPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { nuevaContrasena } = req.body;

    if (!nuevaContrasena)
      return res
        .status(400)
        .json({ mensaje: "Debe ingresar una nueva contraseña" });

    // Buscar usuario para obtener el email
    const user = await Usuario.findById(id);
    if (!user)
      return res.status(404).json({ mensaje: "Usuario no encontrado" });

    // Actualizar contraseña
    const hash = await bcrypt.hash(nuevaContrasena, 10);
    await Usuario.findByIdAndUpdate(id, { password: hash });

    // 📧 Enviar correo de confirmación
    if (user.email) {
      await sendPasswordResetSuccessEmail(
        user.email,
        user.full_name || user.username
      );
    }

    res.json({ mensaje: "Contraseña restablecida correctamente" });
  } catch (err) {
    console.error("❌ Error en resetPassword:", err);
    res
      .status(500)
      .json({ mensaje: "Error reseteando contraseña", error: err.message });
  }
};

/* =====================================================
   🗑️ ELIMINAR USUARIO
   ===================================================== */
exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    // 1️⃣ Buscar el usuario antes de eliminarlo
    const user = await Usuario.findById(id);
    if (!user)
      return res.status(404).json({ mensaje: "Usuario no encontrado" });

    // 2️⃣ Eliminar el usuario
    await Usuario.findByIdAndDelete(id);

    // 3️⃣ Enviar correo de notificación (solo si tenía email)
    if (user.email) {
      await sendUserDeletedEmail(user.email, user.full_name || user.username);
    }

    // 4️⃣ Respuesta al frontend
    res.json({ mensaje: "Usuario eliminado correctamente" });
  } catch (err) {
    console.error("❌ Error en deleteUser:", err);
    res
      .status(500)
      .json({ mensaje: "Error eliminando usuario", error: err.message });
  }
};

/* =====================================================
   🔄 CAMBIAR ESTADO (Activar / Inactivar / Bloquear)
   ===================================================== */
exports.toggleStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { action } = req.body; // "active", "inactive" o "blocked"

    // 1️⃣ Buscar usuario
    const user = await Usuario.findById(id);
    if (!user)
      return res.status(404).json({ mensaje: "Usuario no encontrado" });

    // 2️⃣ Determinar nuevo estado
    let newStatus = user.status;
    if (action === "active") newStatus = "active";
    else if (action === "inactive") newStatus = "inactive";
    else if (action === "blocked") newStatus = "blocked";
    else return res.status(400).json({ mensaje: "Acción no válida" });

    // 3️⃣ Actualizar usuario
    user.status = newStatus;
    user.is_active = newStatus === "active";
    await user.save();

    // 4️⃣ Enviar correo según el nuevo estado (si tiene email)
    if (user.email) {
      await sendUserStateEmail(
        user.email,
        user.full_name || user.username,
        newStatus
      );
    }

    // 5️⃣ Respuesta al frontend
    res.json({
      mensaje: `Usuario ${newStatus}`,
      id: user._id,
      status: user.status,
      is_active: user.is_active,
    });
  } catch (err) {
    console.error("❌ Error en toggleStatus:", err);
    res
      .status(500)
      .json({ mensaje: "Error cambiando estado", error: err.message });
  }
};
