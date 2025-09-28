// netlify/functions/create-preference.ts
import type { Handler } from "@netlify/functions";
import fetch from "node-fetch";

export const handler: Handler = async (event) => {
  try {
    // Opcional: si querés enviar datos desde el frontend
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
            title: body.servicio || "Pago de prueba",
            quantity: 1,
            currency_id: "UYU", // 👈 UYU para Uruguay, ARS para Argentina
            unit_price: body.precio || 10,
          },
        ],
        back_urls: {
          success: `${process.env.SITE_URL}/pago-exitoso`,
          failure: `${process.env.SITE_URL}/pago-fallido`,
          pending: `${process.env.SITE_URL}/pago-pendiente`,
        },
        auto_return: "approved",
      }),
    });

    const data: any = await response.json(); // 👈 casteamos a any para evitar error TS

    return {
      statusCode: 200,
      body: JSON.stringify({ init_point: data.init_point }), // 👈 solo devolvemos lo necesario
    };
  } catch (err: any) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
