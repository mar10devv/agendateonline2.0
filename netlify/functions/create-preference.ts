// netlify/functions/create-preference.ts
import type { Handler } from "@netlify/functions";
import fetch from "node-fetch";
import * as admin from "firebase-admin";

// ✅ Inicializar Firebase Admin (usando variables del entorno Netlify)
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

    // 🔹 Buscar negocio
    const negocioRef = db.collection("Negocios").doc(negocioId);
    const negocioSnap = await negocioRef.get();
    const negocioData = negocioSnap.exists ? negocioSnap.data() : null;

    if (!negocioData) {
      return { statusCode: 404, body: "❌ Negocio no encontrado" };
    }

    console.log("📄 Negocio:", negocioData?.nombre);

    // 🔹 Token de acceso Mercado Pago
    const accessToken =
      negocioData?.mercadoPago?.accessToken ||
      negocioData?.configuracionAgenda?.mercadoPago?.accessToken ||
      process.env.MP_ACCESS_TOKEN;

    if (!accessToken) {
      return {
        statusCode: 400,
        body: "❌ No hay Access Token configurado para este negocio",
      };
    }

    // 🧮 Calcular monto de seña real
    const total = Number(precio) || 0;
    const porcentajeSenia =
      Number(negocioData?.configuracionAgenda?.porcentajeSenia) || 0;

    const montoSenia = Math.round((total * porcentajeSenia) / 100);

    console.log(
      `💰 Total: $${total} | Seña: ${porcentajeSenia}% ($${montoSenia})`
    );

    if (!montoSenia || montoSenia <= 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: "Monto de seña inválido",
          total,
          porcentajeSenia,
          montoSenia,
        }),
      };
    }

    // 💸 Comisión del marketplace (10%)
    const porcentajeComisionMarketplace = 0.1;
    const marketplaceFee = Math.round(montoSenia * porcentajeComisionMarketplace);

    // 📦 Payload a Mercado Pago
    const payload = {
      items: [
        {
          id: servicioId || "servicio_generico",
          title: servicio || "Pago de seña",
          description:
            descripcion ||
            `Pago de seña del ${porcentajeSenia}% del servicio ${servicio}`,
          category_id: "services",
          quantity: 1,
          currency_id: negocioData?.moneda || "UYU",
          unit_price: montoSenia,
        },
      ],
      payer: { email: emailCliente || "invitado@agendateonline.com" },
      metadata: {
        negocioId,
        turnoId,
        porcentajeSenia,
        total,
        montoSenia,
      },
      external_reference: `${negocioId}_${turnoId || Date.now()}`,
      notification_url: `${process.env.SITE_URL}/.netlify/functions/mp-webhook`,
      back_urls: {
        success: `${process.env.SITE_URL}/pago-exitoso`,
        failure: `${process.env.SITE_URL}/pago-fallido`,
        pending: `${process.env.SITE_URL}/pago-pendiente`,
      },

      // 💳 Aceptar todos los métodos de pago
      payment_methods: {
        excluded_payment_types: [], // no excluir nada (permite crédito, débito, billetera)
        excluded_payment_methods: [],
        installments: 1, // solo una cuota
        default_payment_method_id: null,
      },

      auto_return: "approved",
      marketplace_fee: marketplaceFee,
    };

    console.log("📤 Enviando payload a Mercado Pago:", JSON.stringify(payload, null, 2));

    // 🚀 Crear preferencia en Mercado Pago
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
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "MP no devolvió init_point", data }),
      };
    }

    // ✅ Guardar registro del pago en Firestore
    await negocioRef.collection("Pagos").doc(turnoId || Date.now().toString()).set({
      servicio,
      total,
      porcentajeSenia,
      montoSenia,
      marketplaceFee,
      preferenceId: data.id,
      initPoint: data.init_point,
      estado: "pendiente", // hasta que el webhook confirme
      creado: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log("✅ Preferencia creada correctamente:", data.init_point);

    return {
      statusCode: 200,
      body: JSON.stringify({
        init_point: data.init_point,
        montoSenia,
        porcentajeSenia,
        total,
      }),
    };
  } catch (err: any) {
    console.error("❌ Error en create-preference:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: err.message,
        stack: err.stack,
      }),
    };
  }
};
