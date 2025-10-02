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
    pass: process.env.GMAIL_PASS, // con 2FA: App Password
  },
});

type MailData = {
  email?: string | null;
  nombre?: string | null;
  servicio?: string | null;
  fecha?: string | null;
  hora?: string | null;
  motivo?: string | null;
  negocioNombre?: string | null;
  slug?: string | null;
  agendaUrl?: string | null; // opcional: si ya la calculás en el front
};

// util para armar una URL base confiable
const getBaseUrl = (headers: Record<string, string | undefined>) => {
  const envBase = process.env.PUBLIC_BASE_URL || process.env.URL || process.env.DEPLOY_PRIME_URL;
  if (envBase) return envBase;
  // intenta derivar del Origin o Referer
  const origin = headers["origin"] || headers["Origin"] || "";
  if (origin) return origin;
  const ref = headers["referer"] || headers["Referer"] || "";
  const m = ref.match(/^https?:\/\/[^/]+/i);
  return m ? m[0] : "";
};

const htmlTemplate = (d: Required<Pick<MailData,
  "negocioNombre" | "nombre" | "servicio" | "fecha" | "hora" | "motivo"
>> & { agendaHref?: string }) => `<!doctype html>
<html>
  <body style="margin:0;padding:24px;font-family:Inter,Arial,Helvetica,sans-serif;background:linear-gradient(90deg,#2563eb,#4f46e5);">
    <div style="max-width:600px;margin:0 auto;">
      <div style="background:#111;color:#eaeaea;border:1px solid #2a2a2a;border-radius:14px;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,.2)">
        <div style="padding:18px 20px;border-bottom:1px solid #2a2a2a">
          <strong style="font-size:16px">Cancelación de turno${d.negocioNombre ? " • " + d.negocioNombre : ""}</strong>
        </div>

        <div style="padding:20px 20px 8px 20px;font-size:14px;line-height:1.6">
          <p>Hola ${d.nombre || "cliente"},</p>
          <p>Tu turno ha sido <strong>cancelado</strong>.</p>

          <ul style="list-style:none;padding:0;margin:14px 0">
            <li>• <strong>Servicio:</strong> ${d.servicio || "—"}</li>
            <li>• <strong>Fecha:</strong> ${d.fecha || "—"}</li>
            <li>• <strong>Hora:</strong> ${d.hora || "—"}</li>
          </ul>

          ${d.motivo ? `
          <div style="margin:16px 0;padding:12px 14px;border:1px solid #333;border-radius:10px;background:#141414">
            <div style="color:#9aa0a6;font-size:12px;margin-bottom:6px">Mensaje de ${d.negocioNombre}</div>
            <div style="white-space:pre-wrap">${String(d.motivo).replace(/</g,"&lt;").replace(/>/g,"&gt;")}</div>
          </div>` : ""}

          <p style="margin-top:16px">Si deseas reprogramar, podés volver a ingresar a nuestra agenda.</p>

          ${d.agendaHref ? `
          <p style="margin:10px 0 20px">
            <a href="${d.agendaHref}" style="display:inline-block;padding:10px 14px;border-radius:10px;background:#2563eb;color:#fff;text-decoration:none">Ir a la agenda</a>
          </p>
          <p style="font-size:12px;color:#9aa0a6;margin-top:0">También podés copiar este enlace: <br/>
            <a href="${d.agendaHref}" style="color:#93c5fd">${d.agendaHref}</a>
          </p>` : ""}
        </div>

        <div style="padding:14px 20px;border-top:1px solid #2a2a2a;color:#9aa0a6;font-size:12px">
          ${d.negocioNombre || "Tu negocio"}
        </div>
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
    const body: MailData = JSON.parse(event.body || "{}");
    const {
      email, nombre, servicio, fecha, hora, motivo,
      negocioNombre: negocioNombreRaw, slug, agendaUrl
    } = body;

    if (!email) {
      return { statusCode: 400, headers: corsHeaders, body: "Falta email del cliente." };
    }

    // nombre mostrado (prefiere negocioNombre, si no slug)
    const negocioNombre = (negocioNombreRaw || slug || "el negocio") as string;

    // calcula link a la agenda
    const base = getBaseUrl(event.headers || {});
    const agendaHref =
      agendaUrl ||                                // si ya viene listo del front
      (slug ? `${base.replace(/\/$/,"")}/${slug}` : undefined);

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

${motivo ? `Mensaje de ${negocioNombre}:\n${motivo}\n\n` : ""}\
Si necesitás reprogramar, podés volver a nuestra agenda.
${agendaHref ? `\nAgenda: ${agendaHref}\n` : ""}\
${negocioNombre}`;

    await transporter.sendMail({
      from: negocioNombre ? `${negocioNombre} <${process.env.GMAIL_USER}>` : process.env.GMAIL_USER,
      to: email,
      subject,
      text,
      html: htmlTemplate({
        negocioNombre,
        nombre: nombre || "",
        servicio: servicio || "",
        fecha: fecha || "",
        hora: hora || "",
        motivo: motivo || "",
        agendaHref,
      }),
    });

    return { statusCode: 200, headers: corsHeaders, body: "Email enviado" };
  } catch (e: any) {
    console.error("❌ notificar-cancelacion:", e);
    return { statusCode: 500, headers: corsHeaders, body: `Error: ${e?.message || e}` };
  }
};
