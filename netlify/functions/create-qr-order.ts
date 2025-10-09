// netlify/functions/create-qr-order.ts
import type { Handler } from "@netlify/functions";
import fetch from "node-fetch";
import * as admin from "firebase-admin";

// Inicializar Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
  });
}
const db = admin.firestore();

export const handler: Handler = async (event) => {
  try {
    const body = JSON.parse(event.body || "{}");
    const { negocioId, monto, descripcion, turnoId } = body;

    if (!negocioId || !monto) {
      return { statusCode: 400, body: "❌ Faltan parámetros (negocioId o monto)" };
    }

    // 1️⃣ Obtener datos del negocio desde Firestore
    const negocioSnap = await db.collection("Negocios").doc(negocioId).get();
    if (!negocioSnap.exists) {
      return { statusCode: 404, body: "❌ Negocio no encontrado" };
    }

    const negocio = negocioSnap.data()!;
    const accessToken = negocio?.mercadoPago?.accessToken;
    const userId = negocio?.mercadoPago?.userId;
    const posId = negocio?.mercadoPago?.posId;

    if (!accessToken || !userId || !posId) {
      return {
        statusCode: 400,
        body: "❌ El negocio no tiene un POS configurado (creá uno con mp-create-pos.ts)",
      };
    }

    // 2️⃣ Crear orden QR (InStore)
    const payload = {
      external_reference: `${negocioId}_${turnoId || Date.now()}`,
      title: descripcion || "Pago con QR AgéndateOnline",
      description: descripcion || "Pago directo al negocio",
      notification_url: `${process.env.SITE_URL}/.netlify/functions/mp-webhook`,
      items: [
        {
          title: descripcion || "Pago de seña",
          quantity: 1,
          unit_price: Number(monto),
          currency_id: "UYU",
        },
      ],
    };

    const url = `https://api.mercadopago.com/instore/orders/qr/seller/collectors/${userId}/pos/${posId}/order`;

    const res = await fetch(url, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = (await res.json()) as any;

    if (!res.ok) {
      console.error("❌ Error al crear orden QR:", data);
      throw new Error(JSON.stringify(data));
    }

    // 3️⃣ Guardar el registro del intento de pago
    await db.collection("Negocios").doc(negocioId).collection("Pagos").add({
      turnoId: turnoId || null,
      monto,
      metodo: "qr",
      estado: "pendiente",
      creado: admin.firestore.FieldValue.serverTimestamp(),
      external_reference: payload.external_reference,
    });

    console.log("✅ Orden QR creada correctamente:", data);

    return {
      statusCode: 200,
      body: JSON.stringify({
        qrUrl: negocio.mercadoPago.qrUrl,
        external_reference: payload.external_reference,
        message: "Orden QR creada correctamente",
      }),
    };
  } catch (err: any) {
    console.error("❌ Error en create-qr-order:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: err.message,
        stack: err.stack,
      }),
    };
  }
};
