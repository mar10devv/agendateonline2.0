// netlify/functions/mp-create-pos.ts
import type { Handler } from "@netlify/functions";
import fetch from "node-fetch";
import * as admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
  });
}

const db = admin.firestore();

export const handler: Handler = async (event) => {
  try {
    const { negocioId, accessToken, userId } = JSON.parse(event.body || "{}");

    if (!negocioId || !accessToken || !userId) {
      return { statusCode: 400, body: "❌ Faltan parámetros requeridos" };
    }

    const posId = `POS_${negocioId.slice(0, 6).toUpperCase()}`;
    const payload = {
      name: "AgéndateOnline POS",
      fixed_amount: false,
      category: 621102,
      external_id: posId,
    };

    // 🔹 Crear el POS en Mercado Pago
    const res = await fetch(
      `https://api.mercadopago.com/pos?user_id=${userId}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }
    );

    const data = (await res.json()) as {
      id?: string;
      qr?: { image?: string; base_url?: string };
      error?: any;
    };

    if (!res.ok) {
      console.error("❌ Error al crear POS:", data);
      throw new Error(JSON.stringify(data));
    }

    const qrUrl = data.qr?.image || data.qr?.base_url || null;

    // 🔹 Guardar en Firestore
    await db.collection("Negocios").doc(negocioId).update({
      "mercadoPago.posId": posId,
      "mercadoPago.qrUrl": qrUrl,
      "mercadoPago.userId": userId,
    });

    console.log(`✅ POS creado correctamente para negocio ${negocioId}`);
    return {
      statusCode: 200,
      body: JSON.stringify({
        posId,
        qrUrl,
        message: "POS creado correctamente",
      }),
    };
  } catch (err: any) {
    console.error("❌ Error creando POS:", err);
    return { statusCode: 500, body: err.message };
  }
};
