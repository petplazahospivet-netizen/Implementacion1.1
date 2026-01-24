// backend/util/sendEmail.js
const nodemailer = require("nodemailer");
const fs = require("fs");
const path = require("path");

/* ==========================================================
   ⚙️ TRANSPORTE GMAIL (usa las credenciales de tu .env)
   ========================================================== */
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,      // SSL
  secure: true,   // true = SSL
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  logger: true,   // muestra logs de SMTP en consola
  debug: true,    // muestra la comunicación con Gmail
});

/* ==========================================================
   🖼️ LOGO (desde backend/assets/logo.jpeg o ruta personalizada)
   ========================================================== */
function getLogoAttachment() {
  // Detecta automáticamente la ruta correcta en local o Render
  const possiblePaths = [
    path.join(__dirname, "../assets/logo.jpeg"), // desarrollo local
    path.join(process.cwd(), "backend/assets/logo.jpeg"), // Render build
    process.env.BRAND_LOGO_PATH, // si lo defines en .env
  ].filter(Boolean);

  for (const p of possiblePaths) {
    if (p && fs.existsSync(p)) {
      console.log(`✅ Logo detectado en: ${p}`);
      return {
        filename: "logo.jpeg",
        path: p,
        cid: "petplaza_logo", // se usa como referencia en el HTML
      };
    }
  }

  console.warn("⚠️ Logo no encontrado, se usará versión sin imagen.");
  return null;
}

/* ==========================================================
   🎨 PLANTILLA HTML GENERAL
   ========================================================== */
function buildBaseTemplate({ title, message, actionUrl, actionText, footerText }) {
  const logo = getLogoAttachment();
  const logoTag = logo
    ? `<img src="cid:petplaza_logo" alt="PetPlaza Hospivet" 
           style="height:60px;width:auto;border-radius:10px;">`
    : `<div style="background:#2563eb;color:white;font-weight:bold;
                  padding:10px 15px;border-radius:8px;">
         PetPlaza Hospivet
       </div>`;

  return `
  <div style="background:#f8fafc;padding:20px;font-family:'Segoe UI',Tahoma,sans-serif;">
    <div style="max-width:600px;margin:auto;background:white;border-radius:12px;
                box-shadow:0 4px 10px rgba(0,0,0,0.1);overflow:hidden;">
      <div style="background:#2563eb;padding:20px;text-align:center;color:#fff;">
        ${logoTag}
        <h2 style="margin:10px 0 0;">PetPlaza Hospivet 🐾</h2>
      </div>
      <div style="padding:25px 30px;">
        <h3 style="color:#111827;">${title}</h3>
        <p style="font-size:15px;color:#374151;line-height:1.6;">${message}</p>
        ${
          actionUrl
            ? `<div style="text-align:center;margin:20px 0;">
                 <a href="${actionUrl}"
                    style="display:inline-block;background:#2563eb;color:#fff;
                           text-decoration:none;font-weight:600;padding:12px 18px;
                           border-radius:10px;">
                    ${actionText}
                 </a>
               </div>`
            : ""
        }
        <p style="margin-top:25px;color:#6b7280;font-size:13px;">${footerText}</p>
      </div>
      <div style="background:#f1f5f9;padding:10px;text-align:center;font-size:12px;color:#94a3b8;">
        © ${new Date().getFullYear()} PetPlaza Hospivet — Todos los derechos reservados
      </div>
    </div>
  </div>`;
}

/* ==========================================================
   📤 FUNCIÓN GENÉRICA DE ENVÍO
   ========================================================== */
async function sendEmail(to, subject, text, html = null) {
  const logoAttachment = getLogoAttachment();

  const mailOptions = {
    from: `"PetPlaza Hospivet 🐾" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    text,
    html:
      html ||
      buildBaseTemplate({
        title: subject,
        message: text,
        footerText: "Gracias por confiar en PetPlaza Hospivet 🐶🐱",
      }),
    attachments: logoAttachment ? [logoAttachment] : [],
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`📨 Correo enviado correctamente a ${to} — Asunto: ${subject}`);
  } catch (err) {
    console.error("❌ Error al enviar correo:", err.message);
  }
}

/* ==========================================================
   🔐 OTP — Código visual con estilo
   ========================================================== */
async function sendOtpEmail(to, code) {
  const subject = "Código de verificación (OTP)";
  const html = buildBaseTemplate({
    title: subject,
    message: `
      Usa el siguiente código para completar tu inicio de sesión:
      <div style="margin:16px 0 8px;text-align:center;">
        <div style="display:inline-block;font-family:monospace;
                    font-size:28px;font-weight:800;letter-spacing:.2em;
                    background:#0ea5e9;color:#fff;padding:12px 16px;
                    border-radius:12px;">
          ${String(code).replace(/\s+/g, "")}
        </div>
      </div>
      <div style="color:#64748b;font-size:12px;">Este código caduca en 5 minutos.</div>
    `,
    footerText: "No compartas este código con nadie por motivos de seguridad.",
  });

  return sendEmail(to, subject, `Tu código es: ${code}`, html);
}

/* ==========================================================
   🔗 RECUPERACIÓN — Con botón y link
   ========================================================== */
async function sendResetLinkEmail(to, link, expiresMinutes = 60) {
  const subject = "Restablece tu contraseña";
  const html = buildBaseTemplate({
    title: subject,
    message: `
      Has solicitado restablecer tu contraseña en <b>PetPlaza Hospivet</b>.<br>
      Haz clic en el botón de abajo para continuar.
      <br><br><i>Este enlace caduca en ${expiresMinutes} minutos.</i>
    `,
    actionUrl: link,
    actionText: "Restablecer contraseña",
    footerText:
      "Si no realizaste esta solicitud, puedes ignorar este correo. Tu cuenta permanecerá segura.",
  });

  return sendEmail(
    to,
    subject,
    `Haz clic aquí para restablecer tu contraseña: ${link}`,
    html
  );
}

/* ==========================================================
   📬 ENVIAR CORREO DE BIENVENIDA (CREACIÓN DE USUARIO)
   ========================================================== */
async function sendWelcomeEmail(to) {
  const subject = "Bienvenido a PetPlaza Hospivet 🐾";
  const html = buildBaseTemplate({
    title: subject,
    message: `
      Gracias por registrarte en <b>PetPlaza Hospivet</b>.<br>
      Estamos muy contentos de tenerte en nuestra familia. Tu cuenta ha sido creada exitosamente.
      <br><br>Si tienes alguna duda, no dudes en contactarnos.
    `,
    footerText:
      "¡Gracias por elegirnos! Estamos aquí para cuidar de tus mascotas.",
  });

  return sendEmail(to, subject, "Bienvenido a PetPlaza Hospivet 🐾", html);
}

/* ==========================================================
   ✏️ USUARIO ACTUALIZADO
   ========================================================== */
async function sendUserUpdatedEmail(to, name) {
  const subject = "Actualización de tu cuenta";
  const html = buildBaseTemplate({
    title: subject,
    message: `
      Hola ${name || ""},<br>
      Tu cuenta ha sido actualizada correctamente.<br><br>
      Si tú no realizaste este cambio, por favor contáctanos de inmediato.
    `,
    footerText: "Equipo PetPlaza Hospivet 🐾",
  });

  return sendEmail(to, subject, "Tu cuenta fue actualizada", html);
}

/* ==========================================================
   🗑️ USUARIO ELIMINADO
   ========================================================== */
async function sendUserDeletedEmail(to, name) {
  const subject = "Tu cuenta ha sido eliminada";
  const html = buildBaseTemplate({
    title: subject,
    message: `
      Hola ${name || ""},<br>
      Tu cuenta en <b>PetPlaza Hospivet</b> ha sido eliminada.<br>
      Si consideras que esto fue un error, contáctanos para ayudarte.
    `,
    footerText: "PetPlaza Hospivet — Siempre a tu servicio 🐶🐱",
  });

  return sendEmail(to, subject, "Tu cuenta ha sido eliminada", html);
}

/* ==========================================================
   🔄 ESTADO DEL USUARIO (ACTIVAR / DESACTIVAR / BLOQUEAR)
   ========================================================== */
async function sendUserStateEmail(to, name, status) {
  let subject = "";
  let message = "";

  switch (status) {
    case "active":
      subject = "Tu cuenta ha sido activada ✅";
      message = `Hola ${name || ""},<br>
                 ¡Tu cuenta ha sido reactivada con éxito! 🎉<br>
                 Ya puedes volver a acceder a <b>PetPlaza Hospivet</b>.`;
      break;
    case "inactive":
      subject = "Tu cuenta ha sido desactivada temporalmente ⏸️";
      message = `Hola ${name || ""},<br>
                 Tu cuenta ha sido desactivada temporalmente.<br>
                 Si esto fue un error, por favor contáctanos.`;
      break;
    case "blocked":
      subject = "Tu cuenta ha sido bloqueada 🔒";
      message = `Hola ${name || ""},<br>
                 Tu cuenta ha sido bloqueada por motivos de seguridad.<br>
                 Ponte en contacto con soporte para más información.`;
      break;
    default:
      subject = "Actualización de tu cuenta";
      message = `Hola ${name || ""},<br>
                 El estado de tu cuenta ha sido actualizado.`;
  }

  const html = buildBaseTemplate({
    title: subject,
    message,
    footerText: "Gracias por ser parte de PetPlaza Hospivet 🐾",
  });

  return sendEmail(to, subject, message, html);
}

/* ==========================================================
   🔑 CONTRASEÑA RESTABLECIDA CORRECTAMENTE
   ========================================================== */
async function sendPasswordResetSuccessEmail(to, name) {
  const subject = "Tu contraseña ha sido actualizada 🔐";
  const html = buildBaseTemplate({
    title: subject,
    message: `
      Hola ${name || ""},<br>
      Tu contraseña ha sido restablecida exitosamente.<br><br>
      Si tú no realizaste este cambio, por favor contacta de inmediato a nuestro equipo de soporte.
    `,
    footerText: "PetPlaza Hospivet — Seguridad ante todo 🐾",
  });

  return sendEmail(to, subject, "Tu contraseña ha sido actualizada", html);
}

/* ==========================================================
   📧 ENVIAR CORREO DE CAMBIO DE ESTADO (GENÉRICO)
   ========================================================== */
async function sendStatusChangeEmail(to, subject, body) {
  const html = buildBaseTemplate({
    title: subject,
    message: body,
    footerText: "Gracias por ser parte de PetPlaza Hospivet 🐾",
  });

  return sendEmail(to, subject, body, html);
}

module.exports = {
  sendEmail,
  sendOtpEmail,
  sendResetLinkEmail,
  sendWelcomeEmail,
  sendStatusChangeEmail, // ✅ ya no genera error
  sendUserUpdatedEmail,
  sendUserDeletedEmail,
  sendUserStateEmail,
  sendPasswordResetSuccessEmail,
};
