import type { Handler } from "@netlify/functions";
import * as admin from "firebase-admin";
import nodemailer from "nodemailer";

// Inicializar Firebase Admin solo una vez
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

// Configuración de Nodemailer con Gmail
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,
  },
});

// Tipo para turnos
type Turno = {
  clienteEmail: string;
  clienteNombre?: string;
  negocioNombre?: string;
  fecha: admin.firestore.Timestamp; // guardado en Firestore
};

// Función handler de Netlify
const handler: Handler = async (event, context) => {
  try {
    const ahora = new Date();
    const snapshot = await db.collectionGroup("Turnos").get();

    for (const doc of snapshot.docs) {
      const turno = doc.data() as Turno;

      if (!turno.fecha || !turno.clienteEmail) continue;

      const fechaTurno = turno.fecha.toDate();
      const diffHoras = (fechaTurno.getTime() - ahora.getTime()) / (1000 * 60 * 60);

      // Recordatorio 24h antes
      if (diffHoras > 23.5 && diffHoras < 24.5) {
        await enviarMail(
          turno.clienteEmail,
          "📅 Recordatorio: tu turno es mañana",
          `<p>Hola ${turno.clienteNombre || ""}, mañana tenés tu turno en <b>${turno.negocioNombre || "tu negocio"}</b> a las ${fechaTurno.toLocaleTimeString()}.</p>`
        );
      }

      // Recordatorio 1h antes
      if (diffHoras > 0.9 && diffHoras < 1.1) {
        await enviarMail(
          turno.clienteEmail,
          "⏰ Recordatorio: tu turno en 1 hora",
          `<p>Hola ${turno.clienteNombre || ""}, te recordamos tu turno en <b>${turno.negocioNombre || "tu negocio"}</b> a las ${fechaTurno.toLocaleTimeString()}.</p>`
        );
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, message: "Recordatorios revisados" }),
    };
  } catch (error: any) {
    console.error("Error en recordatorios:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, error: error.message }),
    };
  }
};

// Función auxiliar para enviar mail
async function enviarMail(para: string, asunto: string, mensaje: string) {
  const mailOptions = {
    from: `"AgéndateOnline" <${process.env.GMAIL_USER}>`,
    to: para,
    subject: asunto,
    html: mensaje,
  };
  await transporter.sendMail(mailOptions);
}

export { handler };
