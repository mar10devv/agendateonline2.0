// netlify/functions/recordatorios.ts
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");

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

// 🌍 Zona horaria y locale por defecto
const DEFAULT_TZ = "America/Montevideo";
const DEFAULT_LOCALE = "es-ES";

// --------- Tipo del turno que leemos de Firestore ---------
interface TurnoData {
  inicioTs?: import("firebase-admin").firestore.Timestamp;
  clienteEmail?: string;
  clienteNombre?: string;
  negocioNombre?: string;
  email24Enviado?: boolean;
  email1hEnviado?: boolean;
  horaLocalTexto?: string;
  zonaHoraria?: string;
  negocioZonaHoraria?: string;
  negocioTimezone?: string;
  locale?: string;
}

// --------- Helper para formatear la hora local ---------
function obtenerHoraLocalDesdeTurno(t: TurnoData): string {
  if (!t.inicioTs) return "";

  // 1) Si ya guardaste la hora lista desde el front, la usamos
  if (t.horaLocalTexto) return t.horaLocalTexto;

  const fechaTurno: Date = t.inicioTs.toDate();

  // 2) Detectar timezone del turno/negocio
  const timeZone =
    t.zonaHoraria ||
    t.negocioZonaHoraria ||
    t.negocioTimezone ||
    DEFAULT_TZ;

  const locale = t.locale || DEFAULT_LOCALE;

  const formatter = new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone,
  });

  const horaLocal = formatter.format(fechaTurno);

  console.log(
    "[DEBUG HORA]",
    "UTC:",
    fechaTurno.toISOString(),
    "TZ:",
    timeZone,
    "->",
    horaLocal
  );

  return horaLocal;
}

exports.handler = async function () {
  try {
    const ahora = new Date();
    console.log("⏰ Ejecutando recordatorios en:", ahora.toISOString());

    // Ventanas de búsqueda (más amplias)
    const win24Start = new Date(ahora.getTime() + 23 * MS_HORA);
    const win24End = new Date(ahora.getTime() + 25 * MS_HORA);

    const win1hStart = new Date(ahora.getTime() + 50 * 60 * 1000); // 50 min
    const win1hEnd = new Date(ahora.getTime() + 70 * 60 * 1000);   // 70 min

    console.log(
      "Ventana 24h:",
      win24Start.toISOString(),
      "-",
      win24End.toISOString()
    );
    console.log(
      "Ventana 1h:",
      win1hStart.toISOString(),
      "-",
      win1hEnd.toISOString()
    );

    // 🛡 Sets para evitar duplicados en esta ejecución
    const procesados24 = new Set<string>();
    const procesados1h = new Set<string>();

    /* -------- Recordatorio 24h -------- */
    const snap24 = await db
      .collectionGroup("Turnos")
      .where("inicioTs", ">=", admin.firestore.Timestamp.fromDate(win24Start))
      .where("inicioTs", "<=", admin.firestore.Timestamp.fromDate(win24End))
      .get();

    console.log("📌 Turnos encontrados para 24h:", snap24.size);

    for (const docSnap of snap24.docs) {
      const t = docSnap.data() as TurnoData;
      if (!t.inicioTs || !t.clienteEmail) continue;
      if (t.email24Enviado) {
        console.log("⏭️ Ya se envió recordatorio 24h a:", t.clienteEmail);
        continue;
      }

      const fechaTurno = t.inicioTs.toDate();
      const minutoTurno = Math.round(fechaTurno.getTime() / 60000);
      const dedupeKey =
        `24|${t.clienteEmail}|${t.negocioNombre || ""}|${minutoTurno}`;

      if (procesados24.has(dedupeKey)) {
        console.log("⏭️ Duplicado 24h en esta corrida, se omite:", dedupeKey);
        continue;
      }
      procesados24.add(dedupeKey);

      const horaLocal = obtenerHoraLocalDesdeTurno(t);

      console.log(
        "➡️ Enviando recordatorio 24h a:",
        t.clienteEmail,
        "horaLocal:",
        horaLocal
      );

      await transporter.sendMail({
        from: `"AgéndateOnline" <${process.env.GMAIL_USER}>`,
        to: t.clienteEmail,
        subject: "📅 Recordatorio: tu turno es mañana",
        html: `<p>Hola ${t.clienteNombre || ""},</p>
               <p>Mañana tenés tu turno en <b>${t.negocioNombre || "tu negocio"}</b> 
               a las <b>${horaLocal}</b>.</p>
               <hr><p>Este es un mensaje automático, por favor no responder.</p>`,
      });

      await docSnap.ref.update({ email24Enviado: true });
    }

    /* -------- Recordatorio 1h -------- */
    const snap1h = await db
      .collectionGroup("Turnos")
      .where("inicioTs", ">=", admin.firestore.Timestamp.fromDate(win1hStart))
      .where("inicioTs", "<=", admin.firestore.Timestamp.fromDate(win1hEnd))
      .get();

    console.log("📌 Turnos encontrados para 1h:", snap1h.size);

    for (const docSnap of snap1h.docs) {
      const t = docSnap.data() as TurnoData;
      if (!t.inicioTs || !t.clienteEmail) continue;
      if (t.email1hEnviado) {
        console.log("⏭️ Ya se envió recordatorio 1h a:", t.clienteEmail);
        continue;
      }

      const fechaTurno = t.inicioTs.toDate();
      const minutoTurno = Math.round(fechaTurno.getTime() / 60000);
      const dedupeKey =
        `1h|${t.clienteEmail}|${t.negocioNombre || ""}|${minutoTurno}`;

      if (procesados1h.has(dedupeKey)) {
        console.log("⏭️ Duplicado 1h en esta corrida, se omite:", dedupeKey);
        continue;
      }
      procesados1h.add(dedupeKey);

      const horaLocal = obtenerHoraLocalDesdeTurno(t);

      console.log(
        "➡️ Enviando recordatorio 1h a:",
        t.clienteEmail,
        "horaLocal:",
        horaLocal
      );

      await transporter.sendMail({
        from: `"AgéndateOnline" <${process.env.GMAIL_USER}>`,
        to: t.clienteEmail,
        subject: "⏰ Recordatorio: tu turno en 1 hora",
        html: `<p>Hola ${t.clienteNombre || ""},</p>
               <p>Tu turno en <b>${t.negocioNombre || "tu negocio"}</b> es a las 
               <b>${horaLocal}</b>.</p>
               <hr><p>Este es un mensaje automático, por favor no responder.</p>`,
      });

      await docSnap.ref.update({ email1hEnviado: true });
    }

    return { statusCode: 200, body: "Recordatorios procesados" };
  } catch (e: any) {
    console.error("❌ Error en recordatorios:", e);
    const message =
      (e && typeof e === "object" && "message" in e && (e as any).message) ||
      "Error desconocido";
    return { statusCode: 500, body: message };
  }
};
