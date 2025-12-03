// netlify/functions/confirmar-turno.ts
import type { Handler } from "@netlify/functions";
import * as admin from "firebase-admin";
import nodemailer from "nodemailer";

/* ------------------------- Helpers credenciales ------------------------- */
type SA = {
  project_id: string;
  client_email: string;
  private_key: string;
};

function normalizePrivateKey(src?: string | null): string | undefined {
  if (!src) return undefined;
  let key = src.trim();

  // Quitar comillas exteriores si las hay
  if (
    (key.startsWith('"') && key.endsWith('"')) ||
    (key.startsWith("'") && key.endsWith("'"))
  ) {
    key = key.slice(1, -1);
  }

  // Reemplazar \n por saltos reales
  if (key.includes("\\n")) key = key.replace(/\\n/g, "\n");

  // Intentar decodificar base64 si no parece una key normal
  if (
    !key.includes("BEGIN PRIVATE KEY") &&
    !key.includes("BEGIN RSA PRIVATE KEY")
  ) {
    try {
      const decoded = Buffer.from(key, "base64").toString("utf8");
      if (
        decoded.includes("BEGIN PRIVATE KEY") ||
        decoded.includes("BEGIN RSA PRIVATE KEY")
      ) {
        key = decoded;
      }
    } catch {}
  }
  return key;
}

function loadServiceAccount(): SA {
  const b64 = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (b64 && b64.trim()) {
    const json = Buffer.from(b64, "base64").toString("utf8");
    const sa = JSON.parse(json);
    if (!sa.project_id || !sa.client_email || !sa.private_key) {
      throw new Error("FIREBASE_SERVICE_ACCOUNT inválido: faltan campos");
    }
    sa.private_key = normalizePrivateKey(sa.private_key)!;
    return sa;
  }

  const project_id = process.env.FIREBASE_PROJECT_ID || "";
  const client_email = process.env.FIREBASE_CLIENT_EMAIL || "";
  const private_key = normalizePrivateKey(process.env.FIREBASE_PRIVATE_KEY) || "";

  if (!project_id || !client_email || !private_key) {
    throw new Error("Faltan credenciales Firebase");
  }

  return { project_id, client_email, private_key };
}

/* --------------------------- Firebase Admin ---------------------------- */
if (!admin.apps.length) {
  const sa = loadServiceAccount();
  console.log("🔥 Inicializando Firebase Admin para confirmar-turno", {
    projectId: sa.project_id,
  });

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: sa.project_id,
      clientEmail: sa.client_email,
      privateKey: sa.private_key,
    }),
  });
}

const db = admin.firestore();

/* ------------------------------- Mailer -------------------------------- */
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,
  },
});

export const handler: Handler = async (event) => {
  console.log("➡️ [confirmar-turno] INICIO", {
    method: event.httpMethod,
    path: event.path,
  });

  try {
    // Soportar GET ?docPath=... para pruebas manuales
    if (event.httpMethod === "GET") {
      const url = new URL(event.rawUrl);
      const docPath = url.searchParams.get("docPath");
      console.log("🔎 [confirmar-turno] GET con docPath:", docPath);

      if (!docPath) {
        console.warn("⚠️ [confirmar-turno] Falta docPath en GET");
        return { statusCode: 400, body: "Falta docPath" };
      }

      // Simulamos un POST interno
      event.httpMethod = "POST";
      event.body = JSON.stringify({ docPath });
    }

    if (event.httpMethod !== "POST") {
      console.warn(
        "⚠️ [confirmar-turno] Método no permitido:",
        event.httpMethod
      );
      return { statusCode: 405, body: "Use POST" };
    }

    let body: any = {};
    try {
      body = JSON.parse(event.body || "{}");
    } catch (e) {
      console.error("❌ [confirmar-turno] Error parseando body:", e);
      return { statusCode: 400, body: "Body JSON inválido" };
    }

    const { docPath } = body;
    console.log("📄 [confirmar-turno] docPath recibido:", docPath);

    if (!docPath) {
      console.warn("⚠️ [confirmar-turno] Falta docPath en body");
      return { statusCode: 400, body: "Falta docPath" };
    }

    // 🔥 Forzar una llamada a Firestore para confirmar que funciona
    await db.listCollections();
    console.log("✅ [confirmar-turno] Firestore Admin OK");

    const ref = db.doc(docPath);
    const snap = await ref.get();

    if (!snap.exists) {
      console.warn("⚠️ [confirmar-turno] Turno no encontrado en:", docPath);
      return { statusCode: 404, body: "Turno no encontrado" };
    }

    const t: any = snap.data() || {};
    console.log("🧾 [confirmar-turno] Datos del turno:", {
      negocioNombre: t.negocioNombre,
      servicioNombre: t.servicioNombre,
      empleadoNombre: t.empleadoNombre,
      clienteEmail: t.clienteEmail,
      clienteUid: t.clienteUid,
    });

    let clienteEmail: string | undefined = t.clienteEmail;
    const clienteUid: string | undefined = t.clienteUid;

    // Si no tenemos email directo en el turno, buscamos en Usuarios/{uid}
    if (!clienteEmail && clienteUid) {
      try {
        console.log(
          "🔎 [confirmar-turno] Buscando email en Usuarios/",
          clienteUid
        );
        const uSnap = await db.collection("Usuarios").doc(clienteUid).get();
        const u = uSnap.exists ? (uSnap.data() || {}) : {};
        clienteEmail = (u as any).email || (u as any).correo;
        console.log(
          "📨 [confirmar-turno] Email encontrado en Usuarios:",
          clienteEmail
        );
      } catch (e) {
        console.error(
          "❌ [confirmar-turno] Error buscando usuario para email:",
          e
        );
      }
    }

    if (!clienteEmail) {
      console.warn(
        "⚠️ [confirmar-turno] Sin email de cliente. No se enviará correo."
      );
      await ref.update({
        emailConfirmacionEnviado: false,
        emailConfirmacionError: "Sin email de cliente",
        emailConfirmacionIntentadoAt:
          admin.firestore.FieldValue.serverTimestamp(),
      });
      return { statusCode: 200, body: "Sin email. No se envió." };
    }

    // Verificar mailer
    try {
      console.log("🔐 [confirmar-turno] Verificando transporter nodemailer...");
      await transporter.verify();
      console.log("✅ [confirmar-turno] Transporter verificado");
    } catch (e) {
      console.error(
        "❌ [confirmar-turno] Error verificando transporter:",
        e
      );
      await ref.update({
        emailConfirmacionEnviado: false,
        emailConfirmacionError: "Mailer no verificado",
        emailConfirmacionIntentadoAt:
          admin.firestore.FieldValue.serverTimestamp(),
      });
      return { statusCode: 500, body: "Mailer no verificado" };
    }

    const negocioNombre = t.negocioNombre || "Tu negocio";
    const servicioNombre = t.servicioNombre || "Servicio";
    const empleadoNombre = t.empleadoNombre || "Empleado";
    const fecha = t.fecha || "";
    const hora = t.hora || "";
    const slug =
      t.slugNegocio ||
      negocioNombre.replace(/\s+/g, "-").toLowerCase();

    const subject = `✅ Confirmación de turno${
      servicioNombre ? " • " + servicioNombre : ""
    } • ${negocioNombre}`;

    const text = `
Hola! Tu turno fue confirmado ✅

• Negocio: ${negocioNombre}
• Servicio: ${servicioNombre}
• Empleado: ${empleadoNombre}
• Fecha: ${fecha}
• Hora: ${hora}

Si necesitás cancelar tu turno entrá en https://agendateonline.com/agenda/${slug}
`.trim();

    const html = `<!doctype html>
<html>
  <body style="margin:0;padding:24px;background:linear-gradient(90deg,#2563eb,#4f46e5);font-family:Inter,Arial,Helvetica,sans-serif;color:#fff">
    <div style="max-width:560px;margin:0 auto;background:rgba(0,0,0,0.10);backdrop-filter:saturate(180%) blur(4px);border:1px solid rgba(255,255,255,0.15);border-radius:14px;overflow:hidden">
      <div style="padding:18px 20px;border-bottom:1px solid rgba(255,255,255,0.12)">
        <strong style="font-size:16px">Confirmación de turno • ${negocioNombre}</strong>
      </div>
      <div style="padding:20px 20px 8px 20px;font-size:14px;line-height:1.6;color:#fff">
        <p>Hola!</p>
        <p>Tu turno fue <strong>confirmado con éxito ✅</strong></p>
        <ul style="list-style:none;padding:0;margin:14px 0">
          <li>• <strong>Servicio:</strong> ${servicioNombre}</li>
          <li>• <strong>Empleado:</strong> ${empleadoNombre}</li>
          <li>• <strong>Fecha:</strong> ${fecha}</li>
          <li>• <strong>Hora:</strong> ${hora}</li>
        </ul>
        <p style="margin-top:16px">Si necesitás <b>cancelar tu turno</b>, podés hacerlo aquí:</p>
        <p style="text-align:center;margin:20px 0;">
          <a href="https://agendateonline.com/agenda/${slug}" 
             style="display:inline-block;background:#ef4444;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:bold;">
            Cancelar turno
          </a>
        </p>
      </div>
      <div style="padding:14px 20px;border-top:1px solid rgba(255,255,255,0.12);opacity:.9;font-size:12px;color:#fff">
        ${negocioNombre}
      </div>
    </div>
  </body>
</html>`;

    try {
      console.log("📨 [confirmar-turno] Enviando email a:", clienteEmail);
      await transporter.sendMail({
        from: `"${negocioNombre}" <${process.env.GMAIL_USER}>`,
        to: clienteEmail,
        subject,
        text,
        html,
      });

      console.log("✅ [confirmar-turno] Email enviado OK a:", clienteEmail);

      await ref.update({
        emailConfirmacionEnviado: true,
        emailConfirmacionEnviadoAt:
          admin.firestore.FieldValue.serverTimestamp(),
        emailConfirmacionError: admin.firestore.FieldValue.delete(),
      });

      return { statusCode: 200, body: "OK: email enviado" };
    } catch (e) {
      console.error(
        "❌ [confirmar-turno] Error enviando email:",
        (e as any)?.message || e
      );

      await ref.update({
        emailConfirmacionEnviado: false,
        emailConfirmacionError: String((e as any)?.message || e),
        emailConfirmacionIntentadoAt:
          admin.firestore.FieldValue.serverTimestamp(),
      });
      return { statusCode: 500, body: "Error enviando confirmación" };
    }
  } catch (e) {
    console.error("💥 [confirmar-turno] Error interno inesperado:", e);
    return { statusCode: 500, body: "Error interno" };
  }
};
