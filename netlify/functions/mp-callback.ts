// netlify/functions/mp-callback.ts
import type { Handler } from "@netlify/functions";
import fetch from "node-fetch";
import * as admin from "firebase-admin";

// 🔹 Inicializar Firebase Admin (para Firestore)
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
  });
}
const db = admin.firestore();

// 🔹 Configuración Mercado Pago
const CLIENT_ID = process.env.MP_CLIENT_ID || "";
const CLIENT_SECRET = process.env.MP_CLIENT_SECRET || "";
const BASE_URL = process.env.SITE_URL || "";

export const handler: Handler = async (event) => {
  try {
    const params = new URLSearchParams(event.rawQuery || "");
    const code = params.get("code");
    const negocioId = params.get("state"); // viene desde la URL de autorización

    if (!code || !negocioId) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "text/html" },
        body: `<html><body>❌ Faltan parámetros (code o negocioId)</body></html>`,
      };
    }

    // 🔒 Validar negocio en Firestore
    const negocioRef = db.collection("Negocios").doc(negocioId);
    const negocioSnap = await negocioRef.get();

    if (!negocioSnap.exists) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "text/html" },
        body: `<html><body>❌ Negocio no encontrado</body></html>`,
      };
    }

    // 🔹 Intercambiar el code por access_token del vendedor (OAuth)
    const tokenResp = await fetch("https://api.mercadopago.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        code,
        // ⚠️ Debe coincidir EXACTAMENTE con el redirect_uri configurado en MP Developers
        redirect_uri: `${BASE_URL}/.netlify/functions/mp-callback`,
      }),
    });

    const data: any = await tokenResp.json();

    if (!data.access_token) {
      const bodyHtml = `
        <html><body>
          <h3>❌ Error conectando con Mercado Pago</h3>
          <pre>${JSON.stringify(data, null, 2)}</pre>
          <p>Cerrá esta ventana y volvé a intentar desde tu panel de negocio.</p>
        </body></html>
      `;
      return { statusCode: 500, headers: { "Content-Type": "text/html" }, body: bodyHtml };
    }

    // 🔹 Guardar tokens del vendedor en Firestore
    await negocioRef.update({
      "configuracionAgenda.mercadoPago": {
        conectado: true,
        userId: data.user_id,
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        publicKey: data.public_key || null, // ✅ nuevo
        liveMode: data.live_mode,
        actualizado: admin.firestore.FieldValue.serverTimestamp(),
      },
    });

    // ✅ Devolver HTML de éxito (notifica al opener y cierra la ventana)
    const html = `
      <!doctype html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>Cuenta vinculada</title>
        <style>
          body { font-family: sans-serif; color: #222; text-align: center; padding: 40px; }
        </style>
      </head>
      <body>
        <h2>✅ Cuenta de Mercado Pago conectada correctamente</h2>
        <p>Podés cerrar esta ventana.</p>
        <script>
          (function() {
            try {
              if (window.opener && !window.opener.closed) {
                window.opener.postMessage(
                  { type: 'MP_CONNECTED', negocioId: ${JSON.stringify(negocioId)} },
                  window.location.origin
                );
                setTimeout(() => { window.close(); }, 1000);
              }
            } catch (err) {
              console.error('Error al procesar la respuesta:', err);
            }
          })();
        </script>
      </body>
      </html>
    `;

    return { statusCode: 200, headers: { "Content-Type": "text/html" }, body: html };
  } catch (err: any) {
    console.error("❌ Error interno en mp-callback:", err);
    const html = `<html><body><h3>❌ Error interno</h3><pre>${String(err)}</pre></body></html>`;
    return { statusCode: 500, headers: { "Content-Type": "text/html" }, body: html };
  }
};
