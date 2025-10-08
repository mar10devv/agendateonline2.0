import type { Handler } from "@netlify/functions";
import fetch from "node-fetch";
import * as admin from "firebase-admin";

// 🔒 Inicializar Firebase Admin
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

export const handler: Handler = async (event) => {
  try {
    const negocioId = event.queryStringParameters?.negocioId;
    if (!negocioId) {
      return { statusCode: 400, body: "Falta negocioId" };
    }

    // 🔍 Obtener accessToken desde Firestore
    const ref = db.collection("Negocios").doc(negocioId);
    const snap = await ref.get();
    const accessToken = snap.get("configuracionAgenda.mercadoPago.accessToken");

    if (!accessToken) {
      return { statusCode: 404, body: "Access token no encontrado" };
    }

    // 🔹 Consultar API de Mercado Pago desde el servidor (sin CORS)
    const res = await fetch("https://api.mercadopago.com/users/me", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = await res.json();

    return {
      statusCode: 200,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify(data),
    };
  } catch (err: any) {
    console.error("❌ Error en mp-user-info:", err);
    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: String(err) }),
    };
  }
};
