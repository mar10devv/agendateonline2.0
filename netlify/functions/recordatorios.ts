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

const MS_HORA = 60 * 60 * 1000;

export const handler: Handler = async () => {
  try {
    const ahora = new Date();

    // Ventanas de búsqueda
    const win24Start = new Date(ahora.getTime() + 23.5 * MS_HORA);
    const win24End   = new Date(ahora.getTime() + 24.5 * MS_HORA);

    const win1hStart = new Date(ahora.getTime() + 0.9 * MS_HORA);
    const win1hEnd   = new Date(ahora.getTime() + 1.1 * MS_HORA);

    /* -------- Recordatorio 24h -------- */
    const snap24 = await db
      .collectionGroup("Turnos")
      .where("inicioTs", ">=", admin.firestore.Timestamp.fromDate(win24Start))
      .where("inicioTs", "<=", admin.firestore.Timestamp.fromDate(win24End))
      .get();

    for (const doc of snap24.docs) {
      const t = doc.data() as any;
      if (!t.inicioTs || !t.clienteEmail) continue;
      if (t.email24Enviado) continue;

      const fechaTurno = t.inicioTs.toDate();

      await transporter.sendMail({
        from: `"AgéndateOnline" <${process.env.GMAIL_USER}>`,
        to: t.clienteEmail,
        subject: "📅 Recordatorio: tu turno es mañana",
        html: `
          <p>Hola ${t.clienteNombre || ""},</p>
          <p>Mañana tenés tu turno en <b>${t.negocioNombre || "tu negocio"}</b> 
          a las <b>${fechaTurno.toLocaleTimeString("es-ES",{hour:"2-digit",minute:"2-digit"})}</b>.</p>
          <hr>
          <p>Este es un mensaje automático, por favor no responder.</p>
        `,
      });

      await doc.ref.update({ email24Enviado: true });
    }

    /* -------- Recordatorio 1h -------- */
    const snap1h = await db
      .collectionGroup("Turnos")
      .where("inicioTs", ">=", admin.firestore.Timestamp.fromDate(win1hStart))
      .where("inicioTs", "<=", admin.firestore.Timestamp.fromDate(win1hEnd))
      .get();

    for (const doc of snap1h.docs) {
      const t = doc.data() as any;
      if (!t.inicioTs || !t.clienteEmail) continue;
      if (t.email1hEnviado) continue;

      const fechaTurno = t.inicioTs.toDate();

      await transporter.sendMail({
        from: `"AgéndateOnline" <${process.env.GMAIL_USER}>`,
        to: t.clienteEmail,
        subject: "⏰ Recordatorio: tu turno en 1 hora",
        html: `
          <p>Hola ${t.clienteNombre || ""},</p>
          <p>Tu turno en <b>${t.negocioNombre || "tu negocio"}</b> es a las 
          <b>${fechaTurno.toLocaleTimeString("es-ES",{hour:"2-digit",minute:"2-digit"})}</b>.</p>
          <hr>
          <p>Este es un mensaje automático, por favor no responder.</p>
        `,
      });

      await doc.ref.update({ email1hEnviado: true });
    }

    return { statusCode: 200, body: "Recordatorios procesados" };
  } catch (e: any) {
    console.error("❌ Error en recordatorios:", e);
    return { statusCode: 500, body: e.message };
  }
};
