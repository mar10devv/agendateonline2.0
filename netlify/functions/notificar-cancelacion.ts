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
    pass: process.env.GMAIL_PASS, // si tienes 2FA, usa App Password
  },
});

const htmlTemplate = ({
  negocioNombre,
  nombre,
  servicio,
  fecha,
  hora,
  motivo,
}: {
  negocioNombre?: string | null;
  nombre?: string | null;
  servicio?: string | null;
  fecha?: string | null;
  hora?: string | null;
  motivo?: string | null;
}) => `<!doctype html>
<html>
  <body style="background:#0b0b0b;color:#eaeaea;font-family:Inter,Arial,Helvetica,sans-serif;padding:24px">
    <div style="max-width:560px;margin:0 auto;background:#111;border:1px solid #2a2a2a;border-radius:14px;overflow:hidden">
      <div style="padding:18px 20px;border-bottom:1px solid #2a2a2a">
        <strong style="font-size:16px">Cancelación de turno${negocioNombre ? " • " + negocioNombre : ""}</strong>
      </div>
      <div style="padding:20px 20px 8px 20px;font-size:14px;line-height:1.6">
        <p>Hola ${nombre || "cliente"},</p>
        <p>Tu turno ha sido <strong>cancelado</strong>.</p>
        <ul style="list-style:none;padding:0;margin:14px 0">
          <li>• <strong>Servicio:</strong> ${servicio || "—"}</li>
          <li>• <strong>Fecha:</strong> ${fecha || "—"}</li>
          <li>• <strong>Hora:</strong> ${hora || "—"}</li>
        </ul>
        ${
          motivo
            ? `<div style="margin:16px 0;padding:12px 14px;border:1px solid #333;border-radius:10px;background:#141414">
                 <div style="color:#9aa0a6;font-size:12px;margin-bottom:6px">Mensaje del negocio</div>
                 <div style="white-space:pre-wrap">${String(motivo).replace(/</g,"&lt;").replace(/>/g,"&gt;")}</div>
               </div>`
            : ""
        }
        <p style="margin-top:16px">Si deseas reprogramar, podés volver a ingresar a nuestra agenda.</p>
      </div>
      <div style="padding:14px 20px;border-top:1px solid #2a2a2a;color:#9aa0a6;font-size:12px">
        ${negocioNombre || "Negocio"}
      </div>
    </div>
  </body>
</html>`;

export const handler: Handler = async (event) => {
  // CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: corsHeaders, body: "ok" };
  }
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers: corsHeaders, body: "Use POST" };
  }

  try {
    const { email, nombre, servicio, fecha, hora, motivo, negocioNombre } = JSON.parse(event.body || "{}");

    if (!email) {
      return { statusCode: 400, headers: corsHeaders, body: "Falta email del cliente." };
    }

    const subject =
      `Cancelación de turno` +
      (servicio ? ` • ${servicio}` : "") +
      (negocioNombre ? ` • ${negocioNombre}` : "");

    const text = `Hola ${nombre || "cliente"},
Tu turno ha sido cancelado.

• Servicio: ${servicio || "—"}
• Fecha: ${fecha || "—"}
• Hora: ${hora || "—"}

${motivo ? `Mensaje del negocio:\n${motivo}` : ""}

Si necesitás reprogramar, podés volver a nuestra agenda.
${negocioNombre || ""}`;

    await transporter.sendMail({
      from: negocioNombre
        ? `${negocioNombre} <${process.env.GMAIL_USER}>`
        : process.env.GMAIL_USER,
      to: email,
      subject,
      text,
      html: htmlTemplate({ negocioNombre, nombre, servicio, fecha, hora, motivo }),
      // opcional: replyTo: correo del negocio si lo tienes
      // replyTo: "contacto@tu-negocio.com",
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
