import type { Handler } from "@netlify/functions";
import fetch from "node-fetch";
import { getTokens, refrescarTokenMercadoPago } from "./utils/mercadoPago";

// Tipo de respuesta de un pago en MP
type MpPagoResponse = {
  id: string;
  status: string;
  init_point?: string;
  point_of_interaction?: {
    transaction_data?: {
      ticket_url?: string;
    };
  };
};

export const handler: Handler = async (event) => {
  try {
    const { negocioId, turnoId, descripcion, monto, clienteEmail } = JSON.parse(event.body || "{}");

    if (!negocioId || !turnoId || !monto) {
      return { statusCode: 400, body: "❌ Faltan parámetros (negocioId, turnoId o monto)" };
    }

    let tokens = await getTokens(negocioId);
    if (!tokens) return { statusCode: 401, body: "❌ Negocio no vinculado a Mercado Pago" };

    const payload = {
      transaction_amount: monto,
      description: descripcion || "Seña de turno",
      payer: { email: clienteEmail || "test@test.com" },
      metadata: { negocioId, turnoId },
    };

    let resp = await fetch("https://api.mercadopago.com/v1/payments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokens.access_token}`,
      },
      body: JSON.stringify(payload),
    });

    if (resp.status === 401) {
      tokens = await refrescarTokenMercadoPago(negocioId);
      if (!tokens) return { statusCode: 500, body: "❌ No se pudo refrescar token" };

      resp = await fetch("https://api.mercadopago.com/v1/payments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokens.access_token}`,
        },
        body: JSON.stringify(payload),
      });
    }

    // 👇 Cast explícito a MpPagoResponse
    const data = (await resp.json()) as MpPagoResponse;

    return {
      statusCode: 200,
      body: JSON.stringify({
        id: data.id,
        status: data.status,
        init_point: data.point_of_interaction?.transaction_data?.ticket_url || data.init_point,
      }),
    };
  } catch (err: any) {
    console.error("❌ Error creando pago:", err);
    return { statusCode: 500, body: JSON.stringify({ error: String(err) }) };
  }
};
