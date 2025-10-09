// netlify/functions/create-qr-order.ts
import type { Handler } from "@netlify/functions";
import fetch from "node-fetch";
import * as admin from "firebase-admin";
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.applicationDefault() });
const db = admin.firestore();

export const handler: Handler = async (event) => {
  try {
    const { negocioId, monto, descripcion } = JSON.parse(event.body || "{}");
    const negocioSnap = await db.collection("Negocios").doc(negocioId).get();
    if (!negocioSnap.exists) throw new Error("Negocio no encontrado");

    const negocio = negocioSnap.data()!;
    const accessToken = negocio.mercadoPago.accessToken;
    const userId = negocio.mercadoPago.userId;
    const posId = negocio.mercadoPago.posId;

    const payload = {
      external_reference: `${negocioId}_${Date.now()}`,
      title: descripcion,
      description: descripcion,
      notification_url: `${process.env.SITE_URL}/.netlify/functions/mp-webhook`,
      items: [
        { title: descripcion, quantity: 1, unit_price: monto, currency_id: "UYU" },
      ],
    };

    const res = await fetch(
      `https://api.mercadopago.com/instore/orders/qr/seller/collectors/${userId}/pos/${posId}/order`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }
    );

    const data = await res.json();
    if (!res.ok) throw new Error(JSON.stringify(data));

    return { statusCode: 200, body: JSON.stringify(data) };
  } catch (err: any) {
    console.error("❌ Error creando orden QR:", err);
    return { statusCode: 500, body: err.message };
  }
};
