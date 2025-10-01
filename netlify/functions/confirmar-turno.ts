// netlify/functions/confirmar-turno.ts
import type { Handler } from "@netlify/functions";
import * as admin from "firebase-admin";
import nodemailer from "nodemailer";

/* ========= FIX: normalizar PRIVATE KEY (PEM o Base64) ========= */
function normalizePrivateKey(src?: string | null): string | undefined {
  if (!src) return undefined;
  let key = src.trim();

  // Quitar comillas envolventes si las hubiera
  if (
    (key.startsWith('"') && key.endsWith('"')) ||
    (key.startsWith("'") && key.endsWith("'"))
  ) {
    key = key.slice(1, -1);
  }

  // Convertir "\n" escapados a saltos reales
  if (key.includes("\\n")) key = key.replace(/\\n/g, "\n");

  // Si no parece PEM, intentar decodificar Base64
  if (!key.includes("BEGIN PRIVATE KEY") && !key.includes("BEGIN RSA PRIVATE KEY")) {
    try {
      const decoded = Buffer.from(key, "base64").toString("utf8");
      if (
        decoded.includes("BEGIN PRIVATE KEY") ||
        decoded.includes("BEGIN RSA PRIVATE KEY")
      ) {
        key = decoded;
      }
    } catch {
      // no era base64, seguimos igual
    }
  }
  return key;
}

/* ========= Firebase Admin ========= */
if (!admin.apps.length) {
  const privateKey = normalizePrivateKey(process.env.FIREBASE_PRIVATE_KEY);
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey,
    }),
  });
}
const db = admin.firestore();

/* ========= Mailer ========= */
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS, // App Password si 2FA
  },
});

export const handler: Handler = async (event) => {
  try {
    // GET de prueba: ?docPath=...
    if (event.httpMethod === "GET") {
      const url = new URL(event.rawUrl);
      const docPath = url.searchParams.get("docPath");
      if (!docPath) return { statusCode: 400, body: "Falta docPath" };
      event.httpMethod = "POST";
      event.body = JSON.stringify({ docPath });
    }

    if (event.httpMethod !== "POST") {
      return { statusCode: 405, body: "Use POST" };
    }

    const { docPath } = JSON.parse(event.body || "{}");
    console.log("📩 confirmar-turno: docPath =", docPath);

    // ENV check sin exponer secretos
    console.log("ENV check:", {
      FIREBASE_PROJECT_ID: !!process.env.FIREBASE_PROJECT_ID,
      FIREBASE_CLIENT_EMAIL: !!process.env.FIREBASE_CLIENT_EMAIL,
      FIREBASE_PRIVATE_KEY: !!process.env.FIREBASE_PRIVATE_KEY,
      GMAIL_USER: !!process.env.GMAIL_USER,
      GMAIL_PASS: !!process.env.GMAIL_PASS,
    });

    if (!docPath) return { statusCode: 400, body: "Falta docPath" };

    // Forzar que Firestore esté OK (si la key está mal, explota acá)
    try {
      await db.listCollections();
      console.log("✅ Firestore listo");
    } catch (e) {
      console.error("❌ Firestore no inicializó:", (e as any)?.message || e);
      return { statusCode: 500, body: "Firestore no inicializó" };
    }

    // 1) Traer turno
    const ref = db.doc(docPath);
    const snap = await ref.get();
    if (!snap.exists) return { statusCode: 404, body: "Turno no encontrado" };

    const t = snap.data() || {};
    console.log("🧾 Turno:", {
      negocioNombre: t.negocioNombre,
      servicioNombre: t.servicioNombre,
      empleadoNombre: t.empleadoNombre,
      fecha: t.fecha,
      hora: t.hora,
      clienteEmail: t.clienteEmail ?? null,
      clienteUid: t.clienteUid ?? null,
    });

    // 2) Resolver email del cliente
    let clienteEmail: string | undefined = t.clienteEmail;
    const clienteUid: string | undefined = t.clienteUid;

    if (!clienteEmail && clienteUid) {
      try {
        const uSnap = await db.collection("Usuarios").doc(clienteUid).get();
        const uData = uSnap.exists ? (uSnap.data() || {}) : {};
        clienteEmail = uData.email || uData.correo;
        console.log("📬 email resuelto desde Usuarios:", clienteEmail ?? null);
      } catch (e) {
        console.warn("⚠️ No pude leer Usuarios/{uid}:", (e as any)?.message || e);
      }
    }

    if (!clienteEmail) {
      console.warn("⚠️ Sin email de cliente → no se envía.");
      await ref.update({
        emailConfirmacionEnviado: false,
        emailConfirmacionError: "Sin email de cliente",
        emailConfirmacionIntentadoAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      return { statusCode: 200, body: "Sin email. No se envió." };
    }

    // 3) Verificar mailer
    try {
      await transporter.verify();
      console.log("✅ Gmail transporter OK");
    } catch (e) {
      console.error("❌ transporter.verify:", (e as any)?.message || e);
      await ref.update({
        emailConfirmacionEnviado: false,
        emailConfirmacionError: "Mailer no verificado",
        emailConfirmacionIntentadoAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      return { statusCode: 500, body: "Mailer no verificado" };
    }

    // 4) Preparar y enviar
    const negocioNombre = t.negocioNombre || "Tu negocio";
    const servicioNombre = t.servicioNombre || "Servicio";
    const empleadoNombre = t.empleadoNombre || "Empleado";
    const fecha = t.fecha || "";
    const hora = t.hora || "";

    const subject = `✅ Confirmación de turno – ${negocioNombre} (${fecha} ${hora})`;
    const text = `
Hola! Tu turno fue confirmado.

• Negocio: ${negocioNombre}
• Servicio: ${servicioNombre}
• Empleado: ${empleadoNombre}
• Fecha: ${fecha}
• Hora: ${hora}

Si necesitás reprogramar, respondé a este correo.
`.trim();

    const html = `
<div style="font-family: Arial, sans-serif; line-height:1.5;">
  <h2>✅ Tu turno fue confirmado</h2>
  <p><b>Negocio:</b> ${negocioNombre}</p>
  <p><b>Servicio:</b> ${servicioNombre}</p>
  <p><b>Empleado:</b> ${empleadoNombre}</p>
  <p><b>Fecha:</b> ${fecha} &nbsp;&nbsp; <b>Hora:</b> ${hora}</p>
  <p style="margin-top:16px;">Si necesitás reprogramar, respondé a este correo.</p>
</div>
`.trim();

    try {
      console.log("🚀 Enviando a:", clienteEmail, "asunto:", subject);
      await transporter.sendMail({
        from: `"${negocioNombre}" <${process.env.GMAIL_USER}>`,
        to: clienteEmail,
        subject,
        text,
        html,
      });
      console.log("📤 Email ENVIADO a:", clienteEmail);

      await ref.update({
        emailConfirmacionEnviado: true,
        emailConfirmacionEnviadoAt: admin.firestore.FieldValue.serverTimestamp(),
        emailConfirmacionError: admin.firestore.FieldValue.delete(),
      });
      return { statusCode: 200, body: "OK: email enviado" };
    } catch (e) {
      console.error("❌ sendMail:", (e as any)?.message || e);
      await ref.update({
        emailConfirmacionEnviado: false,
        emailConfirmacionError: String((e as any)?.message || e),
        emailConfirmacionIntentadoAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      return { statusCode: 500, body: "Error enviando confirmación" };
    }
  } catch (err) {
    console.error("❌ Error general confirmar-turno:", (err as any)?.message || err);
    return { statusCode: 500, body: "Error interno" };
  }
};
