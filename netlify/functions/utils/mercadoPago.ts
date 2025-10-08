import fetch from "node-fetch";
import { getStore } from "@netlify/blobs";

// 🔑 Variables de entorno (unificadas con el resto de las funciones)
const CLIENT_ID = process.env.MP_CLIENT_ID || "";
const CLIENT_SECRET = process.env.MP_CLIENT_SECRET || "";

// Datos guardados por negocio
export type MpTokenData = {
  access_token: string;
  refresh_token: string;
  userId: string;
  public_key?: string | null;
  liveMode: boolean;
  updatedAt: number;
};

// Respuesta esperada de Mercado Pago
type MpTokenResponse = {
  access_token?: string;
  refresh_token?: string;
  public_key?: string;
  user_id?: string;
  live_mode?: boolean;
  error?: string;
  message?: string;
};

/**
 * Recupera los tokens de un negocio desde Netlify Blobs
 */
export async function getTokens(negocioId: string): Promise<MpTokenData | null> {
  const store = getStore({ name: "mp_tokens" });
  const raw = await store.get(`negocio:${negocioId}`);
  if (!raw) return null;
  return JSON.parse(raw as string);
}

/**
 * Guarda tokens actualizados
 */
export async function saveTokens(negocioId: string, data: MpTokenData) {
  const store = getStore({ name: "mp_tokens" });
  await store.set(`negocio:${negocioId}`, JSON.stringify(data));
}

/**
 * Refresca el access_token usando el refresh_token
 */
export async function refrescarTokenMercadoPago(
  negocioId: string
): Promise<MpTokenData | null> {
  const current = await getTokens(negocioId);
  if (!current) return null;

  const resp = await fetch("https://api.mercadopago.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      refresh_token: current.refresh_token,
    }),
  });

  const data = (await resp.json()) as MpTokenResponse;

  if (!data.access_token) {
    console.error("❌ Error al refrescar token:", data);
    // Si Mercado Pago devuelve “invalid_grant” u otro error de autorización, eliminamos el registro
    if (data.error === "invalid_grant") {
      const store = getStore({ name: "mp_tokens" });
      await store.delete(`negocio:${negocioId}`);
    }
    return null;
  }

  const updated: MpTokenData = {
    access_token: data.access_token,
    refresh_token: data.refresh_token || current.refresh_token,
    userId: data.user_id || current.userId,
    public_key: data.public_key || current.public_key || null,
    liveMode: data.live_mode ?? current.liveMode,
    updatedAt: Date.now(),
  };

  await saveTokens(negocioId, updated);
  return updated;
}
