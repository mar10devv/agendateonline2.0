import type { Handler } from "@netlify/functions";
import fetch from "node-fetch";
import * as admin from "firebase-admin";

// 🧩 Interfaces para tipado
interface MPUser {
  id?: number;
  first_name?: string;
  last_name?: string;
  email?: string;
  nickname?: string;
  site_id?: string;
  logo?: string;
  picture?: string;
}

interface MPBalance {
  available_balance?: number;
}

// 🔒 Inicializar Firebase Admin solo una vez
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

// ✅ Headers base (unificados)
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
};

export const handler: Handler = async (event) => {
  try {
    const negocioId = event.queryStringParameters?.negocioId;
    if (!negocioId) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: "Falta negocioId" }),
      };
    }

    // 🔍 Obtener accessToken desde Firestore
    const ref = db.collection("Negocios").doc(negocioId);
    const snap = await ref.get();
    const mpData = snap.get("configuracionAgenda.mercadoPago");

    if (!mpData?.accessToken) {
      return {
        statusCode: 404,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: "Access token no encontrado" }),
      };
    }

    const accessToken = mpData.accessToken;

    // 🔹 Consultar información del usuario desde Mercado Pago
    const userRes = await fetch("https://api.mercadopago.com/users/me", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!userRes.ok) {
      const errorText = await userRes.text();
      console.error("❌ Error respuesta MP:", errorText);
      return {
        statusCode: userRes.status,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: "Error obteniendo datos del usuario" }),
      };
    }

    const user = (await userRes.json()) as MPUser;

    // 🔹 Si no devuelve ID, usamos el userId guardado
    const userId = user?.id || mpData.userId || null;

    // 🔹 Consultar saldo disponible (opcional)
    let saldoDisponible: number | null = null;
    try {
      const saldoRes = await fetch("https://api.mercadopago.com/v1/account/balance", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (saldoRes.ok) {
        const saldoData = (await saldoRes.json()) as MPBalance;
        saldoDisponible = saldoData.available_balance ?? null;
      }
    } catch (err) {
      console.warn("⚠️ No se pudo obtener saldo:", err);
    }

    // 🔹 Armar respuesta limpia
    const data = {
      id: userId,
      nombre: user.first_name || "",
      apellido: user.last_name || "",
      email: user.email || "",
      nickname: user.nickname || "",
      site_id: user.site_id || "",
      logo:
        user.logo ||
        user.picture ||
        "https://cdn-icons-png.flaticon.com/512/149/149071.png",
      saldoDisponible,
    };

    // ✅ Responder OK
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify(data),
    };
  } catch (err: any) {
    console.error("❌ Error interno en mp-user-info:", err);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: err.message || String(err) }),
    };
  }
};
