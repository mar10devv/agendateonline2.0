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

    // 1️⃣ Intentamos leer los metadatos para saber a qué negocio pertenece
    // (algunas veces Mercado Pago no los envía en el primer webhook → doble verificación)
    let negocioId: string | undefined;
    let turnoId: string | undefined;
    let pago: MpPago | null = null;

    // Primero consultamos con token global por si aún no sabemos el negocio
    const appToken = process.env.MP_APP_TOKEN || "";
    let resp = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${appToken}` },
    });

    pago = (await resp.json()) as MpPago;
    negocioId = pago.metadata?.negocioId;
    turnoId = pago.metadata?.turnoId;

    // 2️⃣ Si hay negocioId, buscamos su token OAuth
    let accessToken = appToken;
    if (negocioId) {
      const negocioSnap = await db.collection("Negocios").doc(negocioId).get();
      const negocioData = negocioSnap.exists ? negocioSnap.data() : null;
      const tokenVendedor = negocioData?.configuracionAgenda?.mercadoPago?.accessToken;

      if (tokenVendedor) {
        accessToken = tokenVendedor;
        // volvemos a consultar con el token del vendedor
        resp = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        pago = (await resp.json()) as MpPago;
      }
    }

    if (!pago || !pago.id) {
      console.error("❌ Pago no encontrado o inválido:", pago);
      return { statusCode: 404, body: "❌ Pago no encontrado en MP" };
    }

    const estado = pago.status;
    negocioId = pago.metadata?.negocioId;
    turnoId = pago.metadata?.turnoId;

    if (!negocioId || !turnoId) {
      console.error("⚠️ Pago sin metadata suficiente:", pago);
      return { statusCode: 400, body: "❌ Falta negocioId o turnoId en metadata" };
    }

    // 3️⃣ Procesar solo pagos aprobados o en proceso de acreditación
    if (estado === "approved" || estado === "in_process") {
      const negocioRef = db.collection("Negocios").doc(negocioId);
      const turnoRef = negocioRef.collection("Turnos").doc(turnoId);

      // 🔹 Actualizar estado del turno
      await turnoRef.update({
        estado: estado === "approved" ? "confirmado" : "pendiente_pago",
        pago: {
          id: pago.id,
          monto: pago.transaction_amount,
          status: pago.status,
          fecha: admin.firestore.FieldValue.serverTimestamp(),
        },
      });

      // (Opcional) registrar el pago en subcolección Pagos
      await negocioRef.collection("Pagos").doc(pago.id.toString()).set({
        turnoId,
        monto: pago.transaction_amount,
        status: pago.status,
        fecha: admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log(`✅ Pago ${pago.id} procesado (${estado}) para negocio ${negocioId}`);
    }

    return { statusCode: 200, body: "OK" };
  } catch (err: any) {
    console.error("❌ Error en webhook:", err);
    return { statusCode: 500, body: "Error interno" };
  }
};
