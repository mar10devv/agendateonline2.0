// src/components/ui/CookieCard.tsx
import { useEffect, useState } from "react";
import { getCookieConsent, setCookieConsent } from "../../lib/cacheAgenda";

export default function CookieCard() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = getCookieConsent();
    if (!consent) {
      setVisible(true);
    }
  }, []);

  const acceptCookies = () => {
    setCookieConsent(true);
    setVisible(false);
  };

  const declineCookies = () => {
    // Guardamos false explícitamente para que no vuelva a aparecer
    setCookieConsent(false);
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <div className="w-[300px] h-[220px] bg-white rounded-lg flex flex-col items-center justify-center p-6 gap-3 shadow-lg">
        {/* Icono cookie */}
        <svg
          xmlSpace="preserve"
          viewBox="0 0 122.88 122.25"
          className="w-12 h-12"
        >
          <g>
            <path
              d="M101.77,49.38c2.09,3.1,4.37,5.11,6.86,5.78c2.45,0.66,5.32,0.06,8.7-2.01c1.36-0.84,3.14-0.41,3.97,0.95 
              c0.28,0.46,0.42,0.96,0.43,1.47c0.13,1.4,0.21,2.82,0.24,4.26c0.03,1.46,0.02,2.91-0.05,4.35h0v0c0,0.13-0.01,0.26-0.03,0.38 
              c-0.91,16.72-8.47,31.51-20,41.93c-11.55,10.44-27.06,16.49-43.82,15.69v0.01h0c-0.13,0-0.26-0.01-0.38-0.03 
              c-16.72-0.91-31.51-8.47-41.93-20C5.31,90.61-0.73,75.1,0.07,58.34H0.07v0c0-0.13,0.01-0.26,0.03-0.38 
              C1,41.22,8.81,26.35,20.57,15.87C32.34,5.37,48.09-0.73,64.85,0.07V0.07h0c1.6,0,2.89,1.29,2.89,2.89c0,0.4-0.08,0.78-0.23,1.12 
              c-1.17,3.81-1.25,7.34-0.27,10.14c0.89,2.54,2.7,4.51,5.41,5.52c1.44,0.54,2.2,2.1,1.74,3.55l0.01,0 
              c-1.83,5.89-1.87,11.08-0.52,15.26c0.82,2.53,2.14,4.69,3.88,6.4c1.74,1.72,3.9,3,6.39,3.78c4.04,1.26,8.94,1.18,14.31-0.55 
              C99.73,47.78,101.08,48.3,101.77,49.38z"
              fill="#615151"
            />
          </g>
        </svg>

        {/* Texto */}
        <p className="text-lg font-bold text-gray-900">Usamos cookies 🍪</p>
        <p className="text-center text-sm text-gray-600">
          Usamos cookies para mejorar tu experiencia en AgéndateOnline.{" "}
          <a href="/politica-cookies" className="text-blue-600 underline">
            Leer políticas
          </a>
          .
        </p>

        {/* Botones */}
        <div className="flex gap-4 mt-2">
          <button
            onClick={acceptCookies}
            className="px-4 py-2 bg-indigo-600 text-white rounded-full font-semibold shadow hover:bg-indigo-700 transition"
          >
            Aceptar
          </button>
          <button
            onClick={declineCookies}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-full font-semibold shadow hover:bg-gray-300 transition"
          >
            Rechazar
          </button>
        </div>
      </div>
    </div>
  );
}
