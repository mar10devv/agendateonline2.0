import type { Handler } from "@netlify/functions";
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,
  },
});

export const handler: Handler = async (event) => {
  try {
    const to = new URL(event.rawUrl).searchParams.get("to") || process.env.GMAIL_USER!;
    
    await transporter.sendMail({
      from: `"AgéndateOnline" <${process.env.GMAIL_USER}>`,
      to,
      subject: "📧 Prueba de email desde Netlify Functions",
      html: "<p>¡Funciona! 🚀</p>",
    });

    return {
      statusCode: 200,
      body: `OK: email enviado a ${to}`,
    };
  } catch (e: any) {
    console.error("Error enviando correo:", e);
    return {
      statusCode: 500,
      body: `ERROR: ${e.message}`,
    };
  }
};
