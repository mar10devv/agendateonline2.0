import fetch from "node-fetch";
import { getStore } from "@netlify/blobs";

// 🔑 Variables de entorno
const CLIENT_ID = process.env.PUBLIC_MP_CLIENT_ID || "";
const CLIENT_SECRET = process.env.MP_CLIENT_SECRET || "";

// Tipo de datos guardados en Blobs
export type MpTokenData = {
  access_token: string;
  refresh_token: string;
  userId: string;
  liveMode: boolean;
  updatedAt: number;
};

// Tipo de respuesta de Mercado Pago
type MpTokenResponse = {
  access_token?: string;
  refresh_token?: string;
  user_id?: string;
  live_mode?: boolean;
  error?: string;
  message?: string;
};

/**
 * Recupera tokens de un negocio desde Netlify Blobs
 */
export async function getTokens(negocioId: string): Promise<MpTokenData | null> {
  const store = getStore({ name: "mp_tokens" });
  const raw = await store.get(`negocio:${negocioId}`);
  if (!raw) return null;
  return JSON.parse(raw as string);
}

/**
 * Guarda tokens actualizados en Blobs
 */
export async function saveTokens(negocioId: string, data: MpTokenData) {
  const store = getStore({ name: "mp_tokens" });
  await store.set(`negocio:${negocioId}`, JSON.stringify(data));
}

/**
 * Refresca el access_token usando refresh_token
 */
export async function refrescarTokenMercadoPago(negocioId: string): Promise<MpTokenData | null> {
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

  // ✅ Cast explícito a MpTokenResponse
  const data = (await resp.json()) as MpTokenResponse;

  if (!data.access_token) {
    console.error("❌ Error al refrescar token:", data);
    return null;
  }

  const updated: MpTokenData = {
    access_token: data.access_token,
    refresh_token: data.refresh_token || current.refresh_token,
    userId: data.user_id || current.userId,
    liveMode: data.live_mode ?? current.liveMode,
    updatedAt: Date.now(),
  };

  await saveTokens(negocioId, updated);
  return updated;
}
