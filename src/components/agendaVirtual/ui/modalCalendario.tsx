// src/components/agendaVirtual/ui/ModalCalendario.tsx
import { useState, useEffect } from "react";
import ModalGenerico from "../../ui/modalGenerico";
import { db } from "../../../lib/firebase";
import { doc, updateDoc, getDoc } from "firebase/firestore";

type Props = {
  abierto: boolean;
  onCerrar: () => void;
  negocioId: string;
};

export default function ModalCalendario({ abierto, onCerrar, negocioId }: Props) {
  const [modoPago, setModoPago] = useState<"libre" | "senia">("libre");
  const [porcentajeSenia, setPorcentajeSenia] = useState<number>(20);
  const [guardando, setGuardando] = useState(false);
  const [mercadoPagoConectado, setMercadoPagoConectado] = useState(false);
  const [loadingPago, setLoadingPago] = useState(false);

  // 👇 CLIENT_ID desde .env
  const CLIENT_ID = "7842411370137167";

  // 🔹 Cargar configuración inicial desde Firestore
  useEffect(() => {
    if (!abierto || !negocioId) return;
    const cargarConfig = async () => {
      try {
        const negocioRef = doc(db, "Negocios", negocioId);
        const snap = await getDoc(negocioRef);
        if (snap.exists()) {
          const data = snap.data() as any;
          if (data?.configuracionAgenda?.modoPago) {
            setModoPago(data.configuracionAgenda.modoPago);
            setPorcentajeSenia(data.configuracionAgenda.porcentajeSenia || 20);
          }
          if (data?.configuracionAgenda?.mercadoPago?.conectado) {
            setMercadoPagoConectado(true);
          }
        }
      } catch (err) {
        console.error("❌ Error cargando configuración:", err);
      }
    };
    cargarConfig();
  }, [abierto, negocioId]);

  // 🔹 Guardar cambios básicos
  const handleGuardar = async () => {
    if (!negocioId) return;
    try {
      setGuardando(true);
      const negocioRef = doc(db, "Negocios", negocioId);
      await updateDoc(negocioRef, {
        "configuracionAgenda.modoPago": modoPago,
        "configuracionAgenda.porcentajeSenia":
          modoPago === "senia" ? porcentajeSenia : null,
        "configuracionAgenda.mercadoPago.conectado": mercadoPagoConectado,
      });
      setGuardando(false);
      onCerrar();
    } catch (err) {
      console.error("❌ Error guardando configuración:", err);
      setGuardando(false);
      alert("No se pudo guardar la configuración");
    }
  };

  // 🔹 Conectar con Mercado Pago (OAuth)
  const handleConectarMercadoPago = () => {
    if (!CLIENT_ID) {
      alert("⚠️ Falta configurar PUBLIC_MP_CLIENT_ID en tu .env");
      return;
    }

    // redirect_uri con negocioId embebido
    const redirectUri = `${window.location.origin}/.netlify/functions/mp-callback?negocioId=${negocioId}`;

    // URL de autorización oficial de Mercado Pago
    const authUrl = `https://auth.mercadopago.com/authorization?client_id=${CLIENT_ID}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}`;

    const popup = window.open(authUrl, "mpLogin", "width=600,height=700");

    // Escuchar confirmación desde el backend (cuando mp-callback termine)
    const listener = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data.type === "MP_CONNECTED") {
        setMercadoPagoConectado(true);
        window.removeEventListener("message", listener);
        if (popup && !popup.closed) popup.close();
        alert("✅ Cuenta de Mercado Pago conectada correctamente");
      }
    };

    window.addEventListener("message", listener);
  };

  // 🔹 Pago de prueba directo
  const handlePagoPrueba = async () => {
    try {
      setLoadingPago(true);
      const resp = await fetch("/.netlify/functions/create-preference", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ servicio: "Prueba MP", precio: 10 }),
      });
      const data = await resp.json();
      if (data.init_point) {
        window.location.href = data.init_point;
      } else {
        alert("No se pudo iniciar el pago");
        console.error("Respuesta MP:", data);
      }
    } catch (err) {
      console.error("Error iniciando pago:", err);
      alert("Error al iniciar el pago");
    } finally {
      setLoadingPago(false);
    }
  };

  if (!abierto) return null;

  return (
    <ModalGenerico abierto={abierto} onClose={onCerrar} titulo="Configuración de Agenda">
      <div className="flex flex-col gap-6">
        {/* Selección de modo */}
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              checked={modoPago === "libre"}
              onChange={() => setModoPago("libre")}
            />
            <span>Permitir agendar sin seña</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              checked={modoPago === "senia"}
              onChange={() => setModoPago("senia")}
            />
            <span>Requerir seña</span>
          </label>
        </div>

        {/* Campo de % + conexión Mercado Pago */}
        {modoPago === "senia" && (
          <div className="flex flex-col gap-4">
            {/* % de seña */}
            <div className="flex flex-col gap-2">
              <label className="font-medium">Porcentaje de seña (%)</label>
              <input
                type="number"
                min={10}
                max={100}
                step={5}
                value={porcentajeSenia}
                onChange={(e) => setPorcentajeSenia(Number(e.target.value))}
                className="px-3 py-2 rounded-md bg-neutral-700 text-white w-32"
              />
            </div>

            {/* Conectar Mercado Pago */}
            <div className="flex flex-col gap-2">
              <label className="font-medium">Cuenta de Mercado Pago</label>
              {mercadoPagoConectado ? (
                <p className="text-green-400 text-sm">✅ Cuenta conectada</p>
              ) : (
                <button
                  onClick={handleConectarMercadoPago}
                  className="px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Conectar con Mercado Pago
                </button>
              )}
            </div>
          </div>
        )}

        {/* 🔹 Botón de pago de prueba */}
        <div className="flex flex-col gap-2">
          <label className="font-medium">Probar pago en producción</label>
          <button
            onClick={handlePagoPrueba}
            disabled={loadingPago}
            className="px-4 py-2 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            {loadingPago ? "Redirigiendo..." : "💳 Pagar $10 de prueba"}
          </button>
        </div>

        {/* Botones */}
        <div className="flex justify-end gap-3 mt-4">
          <button
            onClick={onCerrar}
            className="px-4 py-2 rounded-md bg-gray-600 hover:bg-gray-700"
          >
            Cancelar
          </button>
          <button
            onClick={handleGuardar}
            disabled={guardando}
            className="px-4 py-2 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            {guardando ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>
    </ModalGenerico>
  );
}
