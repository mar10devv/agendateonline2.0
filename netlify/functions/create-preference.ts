// netlify/functions/create-preference.ts
import type { Handler } from "@netlify/functions";
import fetch from "node-fetch";

export const handler: Handler = async (event) => {
  try {
    // Datos que podés enviar desde el frontend (servicio, turnoId, negocioId, emailCliente, precio, etc.)
    const body = JSON.parse(event.body || "{}");

    const response = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.MP_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({
        items: [
          {
            id: body.servicioId || "servicio_generico",   // 👈 código interno del servicio
            title: body.servicio || "Pago de prueba",
            description: body.descripcion || "Reserva de turno en AgéndateOnline",
            category_id: "services", // 👈 categoría general
            quantity: 1,
            currency_id: "UYU", // UYU para Uruguay, ARS para Argentina
            unit_price: body.precio || 100, // precio dinámico (o fijo 100 si no llega nada)
          },
        ],
        payer: {
          email: body.emailCliente || "invitado@agendateonline.com", // opcional pero recomendado
        },
        // 👇 ahora mandamos ambas cosas
        metadata: {
          negocioId: body.negocioId,
          turnoId: body.turnoId,
        },
        external_reference: `${body.negocioId || "negocio"}_${body.turnoId || Date.now()}`, // 👈 referencia única
        notification_url: `${process.env.SITE_URL}/.netlify/functions/mp-webhook`, // 👈 tu webhook en Netlify
        back_urls: {
          success: `${process.env.SITE_URL}/pago-exitoso`,
          failure: `${process.env.SITE_URL}/pago-fallido`,
          pending: `${process.env.SITE_URL}/pago-pendiente`,
        },
        auto_return: "approved",
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
