import React, { useEffect, useState } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { getFirestore, doc, getDoc, updateDoc } from "firebase/firestore";
import { app } from "../lib/firebase"; // ✅ tu instancia inicializada

export default function Pruebas() {
  const [negocioId, setNegocioId] = useState<string | null>(null);
  const [conectado, setConectado] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  const CLIENT_ID = import.meta.env.PUBLIC_MP_CLIENT_ID;
  const SITE_URL = import.meta.env.PUBLIC_SITE_URL || import.meta.env.SITE_URL;
  const db = getFirestore(app);

  // 🔹 Detectar usuario logueado o usar negocio de prueba
  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      const uid = user?.uid || "hycp0nS5NycAYP32NfNf3wI6fhg2"; // negocio de prueba
      setNegocioId(uid);

      try {
        const ref = doc(db, "Negocios", uid);
        const snap = await getDoc(ref);

        if (snap.exists()) {
          const data = snap.data();
          // busca en configuracionAgenda o directamente en raíz
          const conectado =
            data?.configuracionAgenda?.mercadoPago?.conectado ??
            data?.mercadoPago?.conectado ??
            false;
          setConectado(conectado);
          console.log("📦 Estado de Mercado Pago:", conectado);
        } else {
          console.warn("⚠️ Negocio no encontrado:", uid);
          setConectado(false);
        }
      } catch (err) {
        console.error("Error al leer negocio:", err);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // 🔹 Escuchar mensajes del popup (cuando se vincula exitosamente)
  useEffect(() => {
    const handler = async (event: MessageEvent) => {
      if (event.data?.type === "MP_CONNECTED" && event.data.negocioId) {
        console.log("✅ Vinculación confirmada desde popup:", event.data);
        setConectado(true);
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  // 🔹 Abrir flujo OAuth
  const handleVincular = () => {
    if (!CLIENT_ID || !SITE_URL) {
      alert("⚠️ Faltan variables de entorno de Mercado Pago");
      console.error("CLIENT_ID o SITE_URL no definidos");
      return;
    }
    if (!negocioId) {
      alert("⚠️ No se detectó el ID del negocio.");
      return;
    }

    const redirectUri = `${SITE_URL}/.netlify/functions/mp-callback`;
    const url = `https://auth.mercadopago.com.uy/authorization?client_id=${CLIENT_ID}&response_type=code&platform_id=mp&state=${encodeURIComponent(
      negocioId
    )}&redirect_uri=${encodeURIComponent(redirectUri)}`;

    window.open(url, "_blank", "width=600,height=700");
  };

  // 🔹 Desvincular cuenta
  const handleDesvincular = async () => {
    if (!negocioId) return;
    try {
      const ref = doc(db, "Negocios", negocioId);
      await updateDoc(ref, {
        "configuracionAgenda.mercadoPago": {
          conectado: false,
          accessToken: null,
          refreshToken: null,
          userId: null,
          publicKey: null,
          liveMode: null,
          actualizado: null,
        },
      });
      alert("✅ Cuenta de Mercado Pago desvinculada correctamente.");
      setConectado(false);
    } catch (err) {
      console.error("Error al desvincular cuenta:", err);
      alert("❌ Error al desvincular la cuenta.");
    }
  };

  // 🔹 UI
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-6 text-center">
      <h1 className="text-2xl font-bold">🧪 Banco de pruebas</h1>

      {loading ? (
        <p className="text-gray-400">Cargando...</p>
      ) : (
        <>
          <button
            onClick={conectado ? handleDesvincular : handleVincular}
            className={`px-4 py-2 rounded-lg font-semibold transition ${
              conectado
                ? "bg-red-500 hover:bg-red-600 text-white"
                : "bg-[#00b9f1] hover:bg-[#009ad1] text-white"
            }`}
          >
            {conectado
              ? "🔌 Desvincular mi cuenta"
              : "💳 Vincular cuenta de Mercado Pago"}
          </button>

          <p
            className={`text-sm ${
              conectado ? "text-green-400" : "text-gray-400"
            }`}
          >
            {conectado
              ? "Cuenta vinculada correctamente ✅"
              : "Aún no hay cuenta vinculada"}
          </p>
        </>
      )}

      <p className="text-gray-500 text-xs mt-6">
        Editá este archivo en <code>src/pages/pruebas.tsx</code>
      </p>
    </div>
  );
}
