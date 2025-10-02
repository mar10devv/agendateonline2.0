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
    console.log("⏰ Ejecutando recordatorios en:", ahora.toISOString());

    // Ventanas de búsqueda (más amplias para no perder turnos)
    const win24Start = new Date(ahora.getTime() + 23 * MS_HORA);
    const win24End   = new Date(ahora.getTime() + 25 * MS_HORA);

    const win1hStart = new Date(ahora.getTime() + 50 * 60 * 1000); // 50 min
    const win1hEnd   = new Date(ahora.getTime() + 70 * 60 * 1000); // 70 min

    console.log("Ventana 24h:", win24Start.toISOString(), "-", win24End.toISOString());
    console.log("Ventana 1h:", win1hStart.toISOString(), "-", win1hEnd.toISOString());

    /* -------- Recordatorio 24h -------- */
    const snap24 = await db
      .collectionGroup("Turnos")
      .where("inicioTs", ">=", admin.firestore.Timestamp.fromDate(win24Start))
      .where("inicioTs", "<=", admin.firestore.Timestamp.fromDate(win24End))
      .get();

    console.log("📌 Turnos encontrados para 24h:", snap24.size);

    for (const doc of snap24.docs) {
      const t = doc.data() as any;
      if (!t.inicioTs || !t.clienteEmail) continue;
      if (t.email24Enviado) {
        console.log("⏭️ Ya se envió recordatorio 24h a:", t.clienteEmail);
        continue;
      }

      const fechaTurno = t.inicioTs.toDate();
      console.log("➡️ Enviando recordatorio 24h a:", t.clienteEmail, fechaTurno);

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

    console.log("📌 Turnos encontrados para 1h:", snap1h.size);

    for (const doc of snap1h.docs) {
      const t = doc.data() as any;
      if (!t.inicioTs || !t.clienteEmail) continue;
      if (t.email1hEnviado) {
        console.log("⏭️ Ya se envió recordatorio 1h a:", t.clienteEmail);
        continue;
      }

      const fechaTurno = t.inicioTs.toDate();
      console.log("➡️ Enviando recordatorio 1h a:", t.clienteEmail, fechaTurno);

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
