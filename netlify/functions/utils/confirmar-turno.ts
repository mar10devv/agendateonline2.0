import type { Handler } from "@netlify/functions";
import * as admin from "firebase-admin";
import nodemailer from "nodemailer";

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  });
}

const db = admin.firestore();

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_PASS },
});

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Use POST" };
  }

  try {
    const { docPath } = JSON.parse(event.body || "{}");
    if (!docPath) {
      return { statusCode: 400, body: "Falta docPath" };
    }

    const docRef = db.doc(docPath);
    const snap = await docRef.get();

    if (!snap.exists) {
      return { statusCode: 404, body: "Turno no encontrado" };
    }

    const t = snap.data() as any;

    if (!t.clienteEmail) {
      return { statusCode: 400, body: "El turno no tiene clienteEmail" };
    }

    // Enviar mail de confirmación
    await transporter.sendMail({
      from: `"AgéndateOnline" <${process.env.GMAIL_USER}>`,
      to: t.clienteEmail,
      subject: "✅ Confirmación de turno",
      html: `
        <p>Hola ${t.clienteNombre || ""},</p>
        <p>Tu turno fue agendado con éxito en <b>${t.negocioNombre || "tu negocio"}</b>.</p>
        <p>Fecha: <b>${t.fecha}</b> a las <b>${t.hora}</b>.</p>
        <hr>
        <p>Visítanos en <a href="https://agendateonline.com">AgéndateOnline.com</a></p>
        <p><i>Este es un mensaje automático, no responder.</i></p>
      `,
    });

    // Marcamos en Firestore que ya se envió
    await docRef.update({ emailConfirmacionEnviado: true });

    return { statusCode: 200, body: "Email de confirmación enviado" };
  } catch (err: any) {
    console.error("❌ Error en confirmar-turno:", err);
    return { statusCode: 500, body: err.message };
  }
};
