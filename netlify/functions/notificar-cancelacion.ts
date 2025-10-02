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

const htmlTemplate = ({
  negocioNombre,
  nombre,
  servicio,
  fecha,
  hora,
  motivo,
  agendaUrl,
}: {
  negocioNombre?: string | null;
  nombre?: string | null;
  servicio?: string | null;
  fecha?: string | null;
  hora?: string | null;
  motivo?: string | null;
  agendaUrl?: string | null;
}) => `<!doctype html>
<html>
  <body style="margin:0;padding:24px;background:linear-gradient(90deg,#2563eb,#4f46e5);font-family:Inter,Arial,Helvetica,sans-serif;color:#ffffff;">
    <div style="max-width:620px;margin:0 auto;border-radius:16px;overflow:hidden;background:rgba(0,0,0,0.10);border:1px solid rgba(255,255,255,0.15);box-shadow:0 10px 30px rgba(0,0,0,0.25);">
      <!-- Header -->
      <div style="padding:16px 20px;border-bottom:1px solid rgba(255,255,255,0.10)">
        <strong style="font-size:15px;">Cancelación de turno${negocioNombre ? " • " + negocioNombre : ""}</strong>
      </div>

      <!-- Body -->
      <div style="padding:22px 20px 12px 20px;font-size:14px;line-height:1.65;color:#fff;">
        <p style="margin:0 0 10px 0;">Hola ${nombre || "cliente"},</p>
        <p style="margin:0 0 12px 0;">Tu turno ha sido <b>cancelado</b>.</p>

        <ul style="list-style:none;padding:0;margin:12px 0 8px 0;">
          <li style="margin:6px 0;">• <b>Servicio:</b> ${servicio || "—"}</li>
          <li style="margin:6px 0;">• <b>Fecha:</b> ${fecha || "—"}</li>
          <li style="margin:6px 0;">• <b>Hora:</b> ${hora || "—"}</li>
        </ul>

        ${
          motivo
            ? `<div style="margin:18px 0;padding:12px 14px;border:1px solid rgba(255,255,255,0.20);border-radius:12px;background:rgba(0,0,0,0.20);">
                 <div style="color:rgba(255,255,255,0.85);font-size:12px;margin:0 0 6px 0;">Mensaje de ${negocioNombre || "el negocio"}</div>
                 <div style="white-space:pre-wrap;color:#fff;">${String(motivo).replace(/</g,"&lt;").replace(/>/g,"&gt;")}</div>
               </div>`
            : ""
        }

        <p style="margin:12px 0 0 0;">Si deseas reprogramar, podés volver a ingresar a nuestra agenda.</p>

        ${
          agendaUrl
            ? `
            <div style="margin-top:12px;">
              <a href="${agendaUrl}" target="_blank" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:10px 14px;border-radius:10px;font-size:13px;">
                Ir a la agenda
              </a>
            </div>
            <p style="margin:8px 0 0 0;font-size:12px;">
              <a href="${agendaUrl}" target="_blank" style="color:#fff;text-decoration:underline;">${agendaUrl}</a>
            </p>`
            : ""
        }
      </div>

      <!-- Footer -->
      <div style="padding:12px 20px;border-top:1px solid rgba(255,255,255,0.10);color:rgba(255,255,255,0.90);font-size:12px;">
        ${negocioNombre || "Tu negocio"}
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
      agendaBase, // opcional, si no, toma del env
    } = JSON.parse(event.body || "{}");

    if (!email) {
      return { statusCode: 400, headers: corsHeaders, body: "Falta email del cliente." };
    }

    const base = (agendaBase || process.env.PUBLIC_SITE_URL || "").replace(/\/+$/,"");
    const agendaUrl = slug ? `${base}/n/${slug}` : "";

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

${motivo ? `Mensaje de ${negocioNombre || "el negocio"}:\n${motivo}\n\n` : ""}${
agendaUrl ? `Ir a la agenda: ${agendaUrl}\n\n` : ""}${negocioNombre || ""}`;

    await transporter.sendMail({
      from: negocioNombre
        ? `${negocioNombre} <${process.env.GMAIL_USER}>`
        : process.env.GMAIL_USER,
      to: email,
      subject,
      text,
      html: htmlTemplate({ negocioNombre, nombre, servicio, fecha, hora, motivo, agendaUrl }),
    });

    return { statusCode: 200, headers: corsHeaders, body: "Email enviado" };
  } catch (e: any) {
    console.error("❌ notificar-cancelacion:", e);
    return { statusCode: 500, headers: corsHeaders, body: `Error: ${e?.message || e}` };
  }
};
