// netlify/functions/notificar-cancelacion.ts
import type { Handler } from "@netlify/functions";
import nodemailer from "nodemailer";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,
  },
});

// 🔧 util: base URL desde env (funciona en Netlify Functions)
const getBaseUrl = () => {
  const raw =
    process.env.SITE_URL ||
    process.env.PUBLIC_SITE_URL ||
    "https://agendateonline.com";
  return (raw || "").replace(/\/$/, "");
};

const htmlTemplate = ({
  negocioNombre,
  nombre,
  servicio,
  fecha,
  hora,
  motivo,
  agendaHref,
}: {
  negocioNombre?: string | null;
  nombre?: string | null;
  servicio?: string | null;
  fecha?: string | null;
  hora?: string | null;
  motivo?: string | null;
  agendaHref?: string | null;
}) => `<!doctype html>
<html>
  <body style="margin:0;padding:24px;background:linear-gradient(90deg,#2563eb,#4f46e5);font-family:Inter,Arial,Helvetica,sans-serif;color:#fff">
    <div style="max-width:560px;margin:0 auto;background:rgba(0,0,0,0.10);backdrop-filter:saturate(180%) blur(4px);border:1px solid rgba(255,255,255,0.15);border-radius:14px;overflow:hidden">
      <div style="padding:18px 20px;border-bottom:1px solid rgba(255,255,255,0.12)">
        <strong style="font-size:16px">Cancelación de turno${negocioNombre ? " • " + negocioNombre : ""}</strong>
      </div>
      <div style="padding:20px 20px 8px 20px;font-size:14px;line-height:1.6;color:#fff">
        <p>Hola ${nombre || "cliente"},</p>
        <p>Tu turno ha sido <strong>cancelado</strong>.</p>
        <ul style="list-style:none;padding:0;margin:14px 0">
          <li>• <strong>Servicio:</strong> ${servicio || "—"}</li>
          <li>• <strong>Fecha:</strong> ${fecha || "—"}</li>
          <li>• <strong>Hora:</strong> ${hora || "—"}</li>
        </ul>
        ${
          motivo
            ? `<div style="margin:16px 0;padding:12px 14px;border:1px solid rgba(255,255,255,0.15);border-radius:10px;background:rgba(0,0,0,0.15)">
                 <div style="opacity:.85;font-size:12px;margin-bottom:6px">Mensaje de ${negocioNombre || "tu negocio"}</div>
                 <div style="white-space:pre-wrap">${String(motivo).replace(/</g,"&lt;").replace(/>/g,"&gt;")}</div>
               </div>`
            : ""
        }
        <p style="margin-top:16px">Si deseas reprogramar, podés volver a ingresar a nuestra agenda.</p>
        ${
          agendaHref
            ? `<div style="margin-top:16px;text-align:center">
                 <a href="${agendaHref}" 
                    style="display:inline-block;padding:12px 20px;border-radius:8px;
                           background:#ffffff;color:#2563eb;font-weight:bold;
                           text-decoration:none;font-size:14px">
                   🔄 Agendarme de nuevo
                 </a>
               </div>`
            : ""
        }
      </div>
      <div style="padding:14px 20px;border-top:1px solid rgba(255,255,255,0.12);opacity:.9;font-size:12px;color:#fff">
        ${negocioNombre || "Negocio"}
      </div>
    </div>
  </body>
</html>`;

export const handler: Handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: corsHeaders, body: "ok" };
  }
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers: corsHeaders, body: "Use POST" };
  }

  try {
    const {
      email,
      nombre,
      servicio,
      fecha,
      hora,
      motivo,
      negocioNombre,
      slug,
      agendaUrl,
    } = JSON.parse(event.body || "{}");

    if (!email) {
      return { statusCode: 400, headers: corsHeaders, body: "Falta email del cliente." };
    }

    const base = getBaseUrl();
    // ✅ Construir link SIEMPRE con fallback
    const agendaHref =
      (agendaUrl && String(agendaUrl).trim()) ||
      (slug && slug.trim() ? `${base}/agenda/${slug}` : base);

    const subject =
      `Cancelación de turno` +
      (servicio ? ` • ${servicio}` : "") +
      (negocioNombre ? ` • ${negocioNombre}` : "");

    const text =
`Hola ${nombre || "cliente"},
Tu turno ha sido cancelado.

• Servicio: ${servicio || "—"}
• Fecha: ${fecha || "—"}
• Hora: ${hora || "—"}
${motivo ? `\nMensaje de ${negocioNombre || "el negocio"}:\n${motivo}\n` : ""}
${agendaHref ? `\nReprogramar: ${agendaHref}\n` : ""}${negocioNombre || ""}`;

    await transporter.sendMail({
      from: negocioNombre
        ? `${negocioNombre} <${process.env.GMAIL_USER}>`
        : process.env.GMAIL_USER,
      to: email,
      subject,
      text,
      html: htmlTemplate({
        negocioNombre,
        nombre,
        servicio,
        fecha,
        hora,
        motivo,
        agendaHref,
      }),
    });

    return { statusCode: 200, headers: corsHeaders, body: "Email enviado" };
  } catch (e: any) {
    console.error("❌ notificar-cancelacion:", e);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: `Error: ${e?.message || e}`,
    };
  }
};
