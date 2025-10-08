// src/components/panel-negocio/BotonVincularMP.tsx
import React from "react";

type Props = {
  negocioId: string;
};

export default function BotonVincularMP({ negocioId }: Props) {
  const CLIENT_ID = import.meta.env.PUBLIC_MP_CLIENT_ID; // o process.env.MP_CLIENT_ID si estás del lado server
  const REDIRECT_URI = `${import.meta.env.PUBLIC_SITE_URL}/.netlify/functions/mp-callback`;

  const handleVincular = () => {
    const url = `https://auth.mercadopago.com.uy/authorization?client_id=${CLIENT_ID}&response_type=code&platform_id=mp&state=${negocioId}&redirect_uri=${encodeURIComponent(
      REDIRECT_URI
    )}`;
    window.open(url, "_blank", "width=600,height=700");
  };

  return (
    <button
      onClick={handleVincular}
      className="px-4 py-2 bg-[#00b9f1] hover:bg-[#009ad1] text-white rounded-lg font-semibold transition"
    >
      💳 Vincular cuenta de Mercado Pago
    </button>
  );
}
