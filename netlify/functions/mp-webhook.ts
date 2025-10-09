// netlify/functions/mp-webhook.ts
import type { Handler } from "@netlify/functions";
import fetch from "node-fetch";
import * as admin from "firebase-admin";

// ✅ Inicializar Firebase Admin con variables de entorno
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

type MpPago = {
  id: string;
  status: "approved" | "pending" | "rejected" | "in_process" | string;
  transaction_amount: number;
  metadata?: {
    negocioId?: string;
    turnoId?: string;
  };
};

export const handler: Handler = async (event) => {
  try {
    const body = JSON.parse(event.body || "{}");
    console.log("📬 Webhook recibido:", JSON.stringify(body, null, 2));

    if (!body || !body.data?.id) {
      return { statusCode: 400, body: "❌ Webhook sin ID de pago" };
    }

    const paymentId = body.data.id;

    // 1️⃣ Intentamos leer los metadatos del pago con token global
    const globalToken = process.env.MP_ACCESS_TOKEN || "";
    let resp = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${globalToken}` },
    });

    const pago = (await resp.json()) as MpPago;
    console.log("💳 Detalle del pago:", pago);

    let negocioId = pago.metadata?.negocioId;
    let turnoId = pago.metadata?.turnoId;

    if (!pago.id) {
      console.error("❌ Pago no encontrado o inválido:", pago);
      return { statusCode: 404, body: "❌ Pago no encontrado en MP" };
    }

    // 2️⃣ Buscar token de vendedor si existe
    let accessToken = globalToken;
    if (negocioId) {
      const negocioSnap = await db.collection("Negocios").doc(negocioId).get();
      const negocioData = negocioSnap.exists ? negocioSnap.data() : null;
      const tokenVendedor = negocioData?.configuracionAgenda?.mercadoPago?.accessToken;
      if (tokenVendedor) {
        accessToken = tokenVendedor;
      }
    }

    // 3️⃣ Reconsultar con token del vendedor para máxima precisión
    resp = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const pagoFinal = (await resp.json()) as MpPago;

    const estado = pagoFinal.status;
    negocioId = pagoFinal.metadata?.negocioId;
    turnoId = pagoFinal.metadata?.turnoId;

    if (!negocioId || !turnoId) {
      console.error("⚠️ Pago sin metadata suficiente:", pagoFinal);
      return { statusCode: 400, body: "❌ Falta negocioId o turnoId en metadata" };
    }

    // 4️⃣ Procesar solo pagos aprobados o en acreditación
    if (estado === "approved" || estado === "in_process") {
      const negocioRef = db.collection("Negocios").doc(negocioId);
      const turnoRef = negocioRef.collection("Turnos").doc(turnoId);

      // 🔹 Crear o actualizar turno
      await turnoRef.set(
        {
          estado: estado === "approved" ? "confirmado" : "pendiente_pago",
          pago: {
            id: pagoFinal.id,
            monto: pagoFinal.transaction_amount,
            status: pagoFinal.status,
            fecha: admin.firestore.FieldValue.serverTimestamp(),
          },
        },
        { merge: true }
      );

      // 🔹 Registrar el pago en la subcolección Pagos
      await negocioRef.collection("Pagos").doc(pagoFinal.id.toString()).set({
        turnoId,
        monto: pagoFinal.transaction_amount,
        status: pagoFinal.status,
        fecha: admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log(`✅ Pago ${pagoFinal.id} procesado (${estado}) para negocio ${negocioId}`);
    } else {
      console.log(`⏸ Pago ${paymentId} con estado ${estado}, no se confirma turno.`);
    }

    return { statusCode: 200, body: "OK" };
  } catch (err: any) {
    console.error("❌ Error en mp-webhook:", err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
