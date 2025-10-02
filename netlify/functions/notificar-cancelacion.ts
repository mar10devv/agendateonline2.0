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

// --- helpers ---
const getOrigin = (event: any) => {
  const env = process.env.SITE_URL?.replace(/\/$/, ""); // sin slash final
  if (env) return env;
  const proto = event.headers["x-forwarded-proto"] || "https";
  const host = event.headers["x-forwarded-host"] || event.headers.host;
  return host ? `${proto}://${host}` : "";
};

// plantilla HTML con bg gradient, card translúcida y link absoluto
const htmlTemplate = ({
  negocioNombre,
  nombre,
  servicio,
  fecha,
  hora,
  motivo,
  agendaUrlAbs,
}: {
  negocioNombre?: string | null;
  nombre?: string | null;
  servicio?: string | null;
  fecha?: string | null;
  hora?: string | null;
  motivo?: string | null;
  agendaUrlAbs?: string | null;
}) => `<!doctype html>
<html>
  <body style="margin:0;padding:24px;background:linear-gradient(135deg,#2563eb,#4f46e5);font-family:Inter,Arial,Helvetica,sans-serif;color:#fff;">
    <div style="max-width:600px;margin:0 auto;
                background:rgba(0,0,0,.10);
                backdrop-filter:saturate(120%) blur(6px);
                border:1px solid rgba(255,255,255,.15);
                border-radius:16px;overflow:hidden;box-shadow:0 8px 30px rgba(0,0,0,.25)">
      <div style="padding:18px 20px;border-bottom:1px solid rgba(255,255,255,.12)">
        <strong style="font-size:16px">Cancelación de turno${negocioNombre ? " • " + negocioNombre : ""}</strong>
      </div>

      <div style="padding:22px 22px 8px 22px;font-size:14px;line-height:1.6">
        <p style="margin:0 0 12px">Hola ${nombre || "cliente"},</p>
        <p style="margin:0 0 16px">Tu turno ha sido <strong style="color:#fff">cancelado</strong>.</p>

        <ul style="list-style:none;padding:0;margin:0 0 16px">
          <li>• <strong>Servicio:</strong> ${servicio || "—"}</li>
          <li>• <strong>Fecha:</strong> ${fecha || "—"}</li>
          <li>• <strong>Hora:</strong> ${hora || "—"}</li>
        </ul>

        ${
          motivo
            ? `<div style="margin:16px 0;padding:12px 14px;border:1px solid rgba(255,255,255,.18);
                             border-radius:10px;background:rgba(0,0,0,.18);color:#fff">
                 <div style="opacity:.85;font-size:12px;margin-bottom:6px">Mensaje de ${negocioNombre || "la barbería"}</div>
                 <div style="white-space:pre-wrap">${String(motivo).replace(/</g,"&lt;").replace(/>/g,"&gt;")}</div>
               </div>`
            : ""
        }

        <p style="margin:18px 0 12px">Si deseas reprogramar, podés volver a ingresar a nuestra agenda.</p>

        ${
          agendaUrlAbs
            ? `<div style="margin:0 0 8px">
                 <a href="${agendaUrlAbs}" 
                    style="display:inline-block;padding:10px 14px;border-radius:10px;text-decoration:none;
                           color:#fff;background:rgba(255,255,255,.18);border:1px solid rgba(255,255,255,.22);">
                   Ir a la agenda
                 </a>
               </div>
               <div style="margin:6px 0 0">
                 <a href="${agendaUrlAbs}" style="color:#dbeafe;text-decoration:underline">${agendaUrlAbs}</a>
               </div>`
            : ""
        }
      </div>

      <div style="padding:14px 20px;border-top:1px solid rgba(255,255,255,.12);opacity:.9;font-size:12px">
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
    const { email, nombre, servicio, fecha, hora, motivo, negocioNombre, slug, agendaUrl } =
      JSON.parse(event.body || "{}");

    if (!email) {
      return { statusCode: 400, headers: corsHeaders, body: "Falta email del cliente." };
    }

    // Construimos una URL ABSOLUTA segura
    const origin = getOrigin(event);
    const agendaPath = agendaUrl || (slug ? `/n/${slug}` : "");
    const agendaUrlAbs = agendaPath ? `${origin}${agendaPath}` : "";

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
${motivo ? `\nMensaje de ${negocioNombre || "la barbería"}:\n${motivo}\n` : ""}${
agendaUrlAbs ? `\nAgendar de nuevo: ${agendaUrlAbs}\n` : ""}${negocioNombre || ""}`;

    await transporter.sendMail({
      from: negocioNombre ? `${negocioNombre} <${process.env.GMAIL_USER}>` : process.env.GMAIL_USER,
      to: email,
      subject,
      text,
      html: htmlTemplate({ negocioNombre, nombre, servicio, fecha, hora, motivo, agendaUrlAbs }),
    });

    return { statusCode: 200, headers: corsHeaders, body: "Email enviado" };
  } catch (e: any) {
    console.error("❌ notificar-cancelacion:", e);
    return { statusCode: 500, headers: corsHeaders, body: `Error: ${e?.message || e}` };
  }
};
