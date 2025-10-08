// src/components/panel-negocio/BotonVincularMP.tsx
import React, { useEffect, useState } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";

export default function BotonVincularMP() {
  const [negocioId, setNegocioId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const CLIENT_ID = import.meta.env.PUBLIC_MP_CLIENT_ID;
  const SITE_URL = import.meta.env.PUBLIC_SITE_URL || import.meta.env.SITE_URL;

  // 🔹 Detectar usuario logueado (dueño del negocio)
  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) setNegocioId(user.uid);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

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

  if (loading) return <div className="text-gray-400">Cargando...</div>;

  return (
    <button
      onClick={handleVincular}
      disabled={!negocioId}
      className={`px-4 py-2 rounded-lg font-semibold transition ${
        negocioId
          ? "bg-[#00b9f1] hover:bg-[#009ad1] text-white"
          : "bg-gray-500 cursor-not-allowed text-gray-300"
      }`}
    >
      💳 Vincular cuenta de Mercado Pago
    </button>
  );
}
