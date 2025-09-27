// netlify/functions/mp-callback.ts
import type { Handler } from "@netlify/functions";
import fetch from "node-fetch";
import * as admin from "firebase-admin";
import { getStore } from "@netlify/blobs";

// 🔹 Inicializar Firebase Admin (para Firestore)
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
  });
}
const db = admin.firestore();

// 🔹 Configuración Mercado Pago
const CLIENT_ID = process.env.PUBLIC_MP_CLIENT_ID || "";  // 👈 ahora sí correcto
const CLIENT_SECRET = process.env.MP_CLIENT_SECRET || ""; // 👈 tu Access Token
const BASE_URL = process.env.SITE_URL || "";              // 👈 dominio de Netlify

export const handler: Handler = async (event) => {
  try {
    const params = new URLSearchParams(event.rawQuery || "");
    const code = params.get("code");
    const negocioId = params.get("negocioId");

    if (!code || !negocioId) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "text/html" },
        body: `<html><body>Faltan parámetros (code o negocioId)</body></html>`,
      };
    }

    // 🔹 Intercambio del code por access_token
    const tokenResp = await fetch("https://api.mercadopago.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        code,
        redirect_uri: `${BASE_URL}/.netlify/functions/mp-callback?negocioId=${negocioId}`,
      }),
    });

    const data: any = await tokenResp.json();

    if (!data.access_token) {
      const bodyHtml = `
        <html><body>
          <h3>Error conectando con Mercado Pago</h3>
          <pre>${JSON.stringify(data, null, 2)}</pre>
          <p>Cerrá la ventana y volvé a intentar.</p>
        </body></html>
      `;
      return { statusCode: 500, headers: { "Content-Type": "text/html" }, body: bodyHtml };
    }

    // 🔐 Guardar tokens en Netlify Blobs como JSON string
    const store = getStore({ name: "mp_tokens" });
    await store.set(
      `negocio:${negocioId}`,
      JSON.stringify({
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        userId: data.user_id,
        liveMode: data.live_mode,
      })
    );

    // 🔹 Guardar solo info pública en Firestore
    await db.collection("Negocios").doc(negocioId).update({
      "configuracionAgenda.mercadoPago": {
        conectado: true,
        userId: data.user_id,
      },
    });

    // ✅ Devolver HTML de éxito (cierra popup y avisa al opener)
    const html = `
      <!doctype html>
      <html>
      <head><meta charset="utf-8" /></head>
      <body>
        <script>
          (function() {
            try {
              if (window.opener && !window.opener.closed) {
                window.opener.postMessage(
                  { type: 'MP_CONNECTED', negocioId: ${JSON.stringify(negocioId)} },
                  window.location.origin
                );
                document.body.innerText = "✅ Cuenta conectada correctamente. Esta ventana se cerrará.";
                setTimeout(() => { window.close(); }, 800);
              } else {
                document.body.innerHTML = "<p>Cuenta conectada. Podés cerrar esta ventana.</p>";
              }
            } catch (err) {
              document.body.innerText = 'Error al procesar la respuesta: ' + err;
            }
          })();
        </script>
      </body>
      </html>
    `;

    return { statusCode: 200, headers: { "Content-Type": "text/html" }, body: html };
  } catch (err: any) {
    const html = `<html><body><h3>Error interno</h3><pre>${String(err)}</pre></body></html>`;
    return { statusCode: 500, headers: { "Content-Type": "text/html" }, body: html };
  }
};
