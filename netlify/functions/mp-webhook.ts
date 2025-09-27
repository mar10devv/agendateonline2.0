// netlify/functions/mp-webhook.ts
import type { Handler } from "@netlify/functions";
import fetch from "node-fetch";
import * as admin from "firebase-admin";

// 🔹 Inicializar Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
  });
}
const db = admin.firestore();

// Tipo de pago esperado de MP
type MpPago = {
  id: string;
  status: "approved" | "pending" | "rejected" | string;
  transaction_amount: number;
  metadata?: {
    negocioId?: string;
    turnoId?: string;
  };
};

export const handler: Handler = async (event) => {
  try {
    const body = JSON.parse(event.body || "{}");

    if (!body || !body.data?.id) {
      return { statusCode: 400, body: "❌ Webhook sin ID de pago" };
    }

    const paymentId = body.data.id;

    // Usar un Access Token de la app principal para leer el pago
    const APP_TOKEN = process.env.MP_APP_TOKEN || "";
    const resp = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${APP_TOKEN}` },
    });

    const pago = (await resp.json()) as MpPago;

    if (!pago || !pago.id) {
      return { statusCode: 404, body: "❌ Pago no encontrado en MP" };
    }

    const estado = pago.status;
    const negocioId = pago.metadata?.negocioId;
    const turnoId = pago.metadata?.turnoId;

    if (!negocioId || !turnoId) {
      console.error("⚠️ Pago sin metadata suficiente:", pago);
      return { statusCode: 400, body: "❌ Falta negocioId o turnoId en metadata" };
    }

    if (estado === "approved") {
      await db
        .collection("Negocios")
        .doc(negocioId)
        .collection("Turnos")
        .doc(turnoId)
        .update({
          estado: "confirmado",
          pago: {
            id: pago.id,
            monto: pago.transaction_amount,
            status: pago.status,
            fecha: admin.firestore.FieldValue.serverTimestamp(),
          },
        });

      console.log(`✅ Turno ${turnoId} confirmado en negocio ${negocioId}`);
    }

    return { statusCode: 200, body: "OK" };
  } catch (err: any) {
    console.error("❌ Error en webhook:", err);
    return { statusCode: 500, body: "Error interno" };
  }
};
