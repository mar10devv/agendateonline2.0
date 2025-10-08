// netlify/functions/create-preference.ts
import type { Handler } from "@netlify/functions";
import fetch from "node-fetch";
import * as admin from "firebase-admin";

// ✅ Inicializar Firebase Admin una sola vez
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
  });
}
const db = admin.firestore();

export const handler: Handler = async (event) => {
  try {
    const body = JSON.parse(event.body || "{}");
    const {
      servicioId,
      servicio,
      descripcion,
      precio,
      emailCliente,
      negocioId,
      turnoId,
    } = body;

    console.log("🟢 Solicitud recibida:", body);

    if (!negocioId) {
      return { statusCode: 400, body: "❌ Falta negocioId" };
    }

    // 🔹 Buscar datos del negocio
    const negocioRef = db.collection("Negocios").doc(negocioId);
    const negocioSnap = await negocioRef.get();
    const negocioData = negocioSnap.exists ? negocioSnap.data() : null;

    console.log("📄 Datos negocio:", negocioData?.nombre || "Sin nombre");

    // ✅ Obtener el token de acceso correcto
    const accessToken =
      negocioData?.mercadoPago?.accessToken ||
      negocioData?.configuracionAgenda?.mercadoPago?.accessToken ||
      process.env.MP_ACCESS_TOKEN;

    if (!accessToken) {
      console.error("❌ No hay Access Token configurado");
      return {
        statusCode: 400,
        body: "❌ No hay Access Token configurado para este negocio",
      };
    }

    // 🧮 Calcular monto de seña y comisión
    const porcentajeSenia =
      (negocioData?.configuracionAgenda?.porcentajeSenia || 0) / 100;
    const montoSenia = Math.round((precio || 100) * porcentajeSenia);

    if (!montoSenia || montoSenia <= 0) {
      console.error("⚠️ Monto de seña inválido:", montoSenia);
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Monto de seña inválido" }),
      };
    }

    const porcentajeComisionMarketplace = 0.1;
    const marketplaceFee = Math.round(montoSenia * porcentajeComisionMarketplace);

    // 🔹 Payload a Mercado Pago
    const payload = {
      items: [
        {
          id: servicioId || "servicio_generico",
          title: servicio || "Pago de reserva",
          description: descripcion || "Reserva de turno en AgéndateOnline",
          category_id: "services",
          quantity: 1,
          currency_id: negocioData?.moneda || "UYU",
          unit_price: montoSenia,
        },
      ],
      payer: { email: emailCliente || "invitado@agendateonline.com" },
      metadata: { negocioId, turnoId },
      external_reference: `${negocioId}_${turnoId || Date.now()}`,
      notification_url: `${process.env.SITE_URL}/.netlify/functions/mp-webhook`,
      back_urls: {
        success: `${process.env.SITE_URL}/pago-exitoso`,
        failure: `${process.env.SITE_URL}/pago-fallido`,
        pending: `${process.env.SITE_URL}/pago-pendiente`,
      },
      auto_return: "approved",
      marketplace_fee: marketplaceFee,
    };

    console.log("📤 Enviando a Mercado Pago:", JSON.stringify(payload, null, 2));

    // 🔹 Enviar solicitud a MP
    const response = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
    });

    const rawText = await response.text();
    console.log("📡 Status MP:", response.status, response.statusText);
    console.log("📦 Respuesta MP:", rawText);

    if (!response.ok) {
      throw new Error(`Mercado Pago devolvió ${response.status}: ${rawText}`);
    }

    const data = JSON.parse(rawText);

    if (!data.init_point) {
      console.error("❌ MP no devolvió init_point");
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Sin init_point", data }),
      };
    }

    // ✅ Guardar registro del pago
    await negocioRef.collection("Pagos").doc(turnoId || Date.now().toString()).set({
      servicio,
      montoSenia,
      marketplaceFee,
      preferenceId: data.id,
      initPoint: data.init_point,
      creado: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log("✅ Preferencia creada correctamente:", data.init_point);

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
