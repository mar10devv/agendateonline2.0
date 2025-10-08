// netlify/functions/create-preference.ts
import type { Handler } from "@netlify/functions";
import fetch from "node-fetch";
import * as admin from "firebase-admin";

// 🔹 Inicializar Firebase Admin (si no está inicializado)
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
  });
}
const db = admin.firestore();

export const handler: Handler = async (event) => {
  try {
    const body = JSON.parse(event.body || "{}");
    const { servicioId, servicio, descripcion, precio, emailCliente, negocioId, turnoId } = body;

    if (!negocioId) {
      return { statusCode: 400, body: "❌ Falta negocioId" };
    }

    // 🔎 Buscar token y configuración del negocio
    const negocioRef = db.collection("Negocios").doc(negocioId);
    const negocioSnap = await negocioRef.get();
    const negocioData = negocioSnap.exists ? negocioSnap.data() : null;

    // ✅ Usar el token del negocio (OAuth) o el global
    const accessToken =
      negocioData?.configuracionAgenda?.mercadoPago?.accessToken ||
      process.env.MP_ACCESS_TOKEN;

    if (!accessToken) {
      return { statusCode: 400, body: "❌ No hay Access Token configurado" };
    }

    // 🧮 Calcular monto de seña y comisión del marketplace
    const porcentajeSeña = 0.2; // 20 % del valor del servicio
    const montoSeña = Math.round((precio || 100) * porcentajeSeña);

    const porcentajeComisionMarketplace = 0.1; // 10 % de la seña (ejemplo)
    const marketplaceFee = Math.round(montoSeña * porcentajeComisionMarketplace);

    // 🔹 Crear preferencia Checkout Pro
    const response = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        items: [
          {
            id: servicioId || "servicio_generico",
            title: servicio || "Pago de reserva",
            description: descripcion || "Reserva de turno en AgéndateOnline",
            category_id: "services",
            quantity: 1,
            currency_id: negocioData?.moneda || "UYU",
            unit_price: montoSeña,
          },
        ],
        payer: {
          email: emailCliente || "invitado@agendateonline.com",
        },
        metadata: {
          negocioId,
          turnoId,
        },
        external_reference: `${negocioId}_${turnoId || Date.now()}`,
        notification_url: `${process.env.SITE_URL}/.netlify/functions/mp-webhook`,
        back_urls: {
          success: `${process.env.SITE_URL}/pago-exitoso`,
          failure: `${process.env.SITE_URL}/pago-fallido`,
          pending: `${process.env.SITE_URL}/pago-pendiente`,
        },
        auto_return: "approved",

        // ✅ Componente esencial del Marketplace
        marketplace_fee: marketplaceFee,
      }),
    });

    console.log("📡 Status Mercado Pago:", response.status, response.statusText);
    const data: any = await response.json();
    console.log("📦 Respuesta de Mercado Pago:", JSON.stringify(data, null, 2));

    if (!data.init_point) {
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: "No se recibió init_point",
          mpResponse: data,
        }),
      };
    }

    // (Opcional) Guardar registro de la preferencia creada
    await negocioRef.collection("Pagos").doc(turnoId || Date.now().toString()).set({
      servicio,
      montoSeña,
      marketplaceFee,
      preferenceId: data.id,
      initPoint: data.init_point,
      creado: admin.firestore.FieldValue.serverTimestamp(),
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ init_point: data.init_point }),
    };
  } catch (err: any) {
    console.error("❌ Error en create-preference:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
