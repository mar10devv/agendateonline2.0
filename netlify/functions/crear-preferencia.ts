import { Handler } from "@netlify/functions";
import fetch from "node-fetch";

const handler: Handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") {
      return {
        statusCode: 405,
        body: JSON.stringify({ error: "Método no permitido" }),
      };
    }

    const body = JSON.parse(event.body || "{}");
    const { servicio, precio, senia } = body;

    if (!servicio || !precio || !senia) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Faltan datos: servicio, precio o seña" }),
      };
    }

    // 🔑 Usamos el Access Token guardado en Netlify
    const accessToken = process.env.MP_ACCESS_TOKEN;
    if (!accessToken) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Falta configurar MP_ACCESS_TOKEN" }),
      };
    }

    // 🔹 Crear preferencia en Mercado Pago
    const mpRes = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        items: [
          {
            title: `Seña de ${servicio}`,
            quantity: 1,
            unit_price: senia,
            currency_id: "UYU", // 👈 cambia a "ARS" si es Argentina
          },
        ],
        back_urls: {
          success: "https://agendateonline.com/success",
          failure: "https://agendateonline.com/failure",
          pending: "https://agendateonline.com/pending",
        },
        auto_return: "approved",
      }),
    });

    const data = await mpRes.json();

    if (data.init_point) {
      return {
        statusCode: 200,
        body: JSON.stringify({ init_point: data.init_point }),
      };
    } else {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "No se pudo generar preferencia", detalle: data }),
      };
    }
  } catch (err: any) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};

export { handler };
