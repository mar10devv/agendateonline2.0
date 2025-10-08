// src/components/agendaVirtual/modales/modalConfigCalendarioNegocio.tsx
import { useState, useEffect } from "react";
import ModalGenerico from "../../ui/modalGenerico";
import MercadoPagoIcon from "../../../assets/mp-icon.svg?url";
import LoaderSpinner from "../../ui/loaderSpinner";

type Props = {
  abierto: boolean;
  onCerrar: () => void;
  negocioId: string;
};

export default function ModalConfigCalendarioNegocio({
  abierto,
  onCerrar,
  negocioId,
}: Props) {
  const [estado, setEstado] = useState<"idle" | "loading" | "success" | "error">(
    "idle"
  );

  useEffect(() => {
    // 🧩 Escucha el mensaje del popup (mp-callback)
    const listener = (event: MessageEvent) => {
      if (event.data?.type === "MP_CONNECTED") {
        setEstado("success");
        setTimeout(onCerrar, 2000);
      }
    };
    window.addEventListener("message", listener);
    return () => window.removeEventListener("message", listener);
  }, [onCerrar]);

  const manejarVinculacionMP = async () => {
    try {
      setEstado("loading");

      // 🔹 Redirección al flujo de autenticación de Mercado Pago
      const redirectUri = `${window.location.origin}/.netlify/functions/mp-callback`;
      const clientId = Number(import.meta.env.PUBLIC_MP_CLIENT_ID) || 0;

      const url = `https://auth.mercadopago.com/authorization?client_id=${clientId}&response_type=code&platform_id=mp&redirect_uri=${encodeURIComponent(
        redirectUri
      )}&state=${negocioId}`;

      // 🔄 Abrir ventana emergente
      window.open(url, "mp_auth", "width=720,height=900");
    } catch (e) {
      console.error("❌ Error iniciando vinculación MP:", e);
      setEstado("error");
      setTimeout(() => setEstado("idle"), 2000);
    }
  };

  return (
    <ModalGenerico
      abierto={abierto}
      onClose={onCerrar}
      titulo="Configuración de agenda"
      maxWidth="max-w-md"
    >
      <div className="p-4 text-sm text-gray-300 space-y-6">
        <p className="text-gray-300">
          Desde aquí podrás vincular tu agenda con tu cuenta de{" "}
          <b>Mercado Pago</b> para aceptar pagos automáticamente cuando tus
          clientes reserven turnos.
        </p>

        {/* 🔹 Botón Mercado Pago */}
        <button
          onClick={manejarVinculacionMP}
          disabled={estado === "loading"}
          className={`w-full flex items-center justify-center gap-3 py-3 rounded-lg transition font-semibold ${
            estado === "loading"
              ? "bg-sky-700 cursor-wait"
              : "bg-sky-600 hover:bg-sky-700"
          }`}
        >
          {estado === "loading" ? (
            <>
              <LoaderSpinner size={20} /> {/* 👈 corregido: number en lugar de string */}
              Conectando...
            </>
          ) : (
            <>
              <img
                src={MercadoPagoIcon}
                alt="Mercado Pago"
                className="w-6 h-6 invert"
              />
              Vincular con Mercado Pago
            </>
          )}
        </button>

        {/* 🔹 Estado final */}
        {estado === "success" && (
          <div className="text-emerald-400 text-center font-medium">
            ✅ Cuenta vinculada correctamente
          </div>
        )}
        {estado === "error" && (
          <div className="text-red-400 text-center font-medium">
            ❌ Error al conectar. Intenta nuevamente.
          </div>
        )}
      </div>

      {/* Footer botones */}
      <div className="flex justify-end mt-6 gap-2 px-4 pb-2">
        <button
          onClick={onCerrar}
          className="px-4 py-2 rounded bg-neutral-700 hover:bg-neutral-600 text-white"
        >
          Cerrar
        </button>
      </div>
    </ModalGenerico>
  );
}
