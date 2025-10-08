// src/components/agendaVirtual/modalCalendario.tsx
import React, { useEffect, useState } from "react";
import ModalGenerico from "../../ui/modalGenerico";
import { db } from "../../../lib/firebase";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import LoaderSpinner from "../../ui/loaderSpinner";

type Props = {
  abierto: boolean;
  onCerrar: () => void;
  negocioId: string;
};

export default function ModalCalendario({ abierto, onCerrar, negocioId }: Props) {
  const [modoPago, setModoPago] = useState<"libre" | "senia">("libre");
  const [porcentajeSenia, setPorcentajeSenia] = useState<number>(25);
  const [mercadoPagoConectado, setMercadoPagoConectado] = useState(false);
  const [mpUserData, setMpUserData] = useState<any>(null);
  const [guardando, setGuardando] = useState(false);
  const [loading, setLoading] = useState(true);

  const CLIENT_ID = import.meta.env.PUBLIC_MP_CLIENT_ID;
  const SITE_URL = import.meta.env.PUBLIC_SITE_URL || import.meta.env.SITE_URL;

  // 🔹 Obtener datos del usuario desde la función Netlify (sin CORS)
  const obtenerDatosMP = async () => {
    try {
      const res = await fetch(`/.netlify/functions/mp-user-info?negocioId=${negocioId}`);
      if (!res.ok) throw new Error("Respuesta no válida del servidor");
      const data = await res.json();

      if (data?.id) {
        setMpUserData({
          nombre: data.first_name,
          apellido: data.last_name,
          email: data.email,
          id: data.id,
          foto:
            data.picture ||
            "https://static.mercadopago.com/images/user-placeholder.png",
        });
      }
    } catch (err) {
      console.error("⚠️ Error obteniendo datos de Mercado Pago:", err);
    }
  };

  // 🔹 Cargar configuración desde Firestore
  useEffect(() => {
    if (!abierto || !negocioId) return;

    const cargarConfig = async () => {
      try {
        const ref = doc(db, "Negocios", negocioId);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const data = snap.data() as any;
          const conf = data?.configuracionAgenda;
          setModoPago(conf?.modoPago || "libre");
          setPorcentajeSenia(conf?.porcentajeSenia || 25);

          const mpData = conf?.mercadoPago;
          setMercadoPagoConectado(mpData?.conectado || false);

          // ✅ Si hay accessToken, obtener datos del usuario
          if (mpData?.accessToken) {
            obtenerDatosMP();
          }
        }
      } catch (err) {
        console.error("❌ Error cargando configuración:", err);
      } finally {
        setLoading(false);
      }
    };

    cargarConfig();
  }, [abierto, negocioId]);

  // 🔹 Escuchar vinculación desde popup
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.data?.type === "MP_CONNECTED" && event.data.negocioId === negocioId) {
        setMercadoPagoConectado(true);
        obtenerDatosMP(); // 👈 actualizar datos al instante
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [negocioId]);

  // 🔹 Guardar cambios
  const handleGuardar = async () => {
    if (!negocioId) return;
    try {
      setGuardando(true);
      const ref = doc(db, "Negocios", negocioId);
      await updateDoc(ref, {
        "configuracionAgenda.modoPago": modoPago,
        "configuracionAgenda.porcentajeSenia":
          modoPago === "senia" ? porcentajeSenia : null,
        "configuracionAgenda.mercadoPago.conectado":
          modoPago === "senia" ? mercadoPagoConectado : false,
      });
      alert("✅ Configuración guardada correctamente.");
      onCerrar();
    } catch (err) {
      console.error("❌ Error guardando configuración:", err);
      alert("❌ No se pudo guardar la configuración.");
    } finally {
      setGuardando(false);
    }
  };

  // 🔹 Vincular Mercado Pago
  const handleConectarMercadoPago = () => {
    if (!CLIENT_ID || !SITE_URL) {
      alert("⚠️ Faltan variables de entorno (PUBLIC_MP_CLIENT_ID o SITE_URL)");
      return;
    }

    const redirectUri = `${SITE_URL}/.netlify/functions/mp-callback`;
    const authUrl = `https://auth.mercadopago.com.uy/authorization?client_id=${CLIENT_ID}&response_type=code&platform_id=mp&state=${negocioId}&redirect_uri=${encodeURIComponent(
      redirectUri
    )}`;

    window.open(authUrl, "mpLogin", "width=700,height=800");
  };

  // 🔹 Desvincular Mercado Pago
  const handleDesvincular = async () => {
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
      setMercadoPagoConectado(false);
      setMpUserData(null);
      alert("✅ Cuenta de Mercado Pago desvinculada correctamente.");
    } catch (err) {
      console.error("❌ Error al desvincular cuenta:", err);
      alert("❌ No se pudo desvincular la cuenta.");
    }
  };

  const ejemploPrecio = 1000;
  const ejemploSenia = (ejemploPrecio * porcentajeSenia) / 100;

  if (!abierto) return null;

  return (
    <ModalGenerico abierto={abierto} onClose={onCerrar} titulo="⚙️ Configuración de agenda">
      {loading ? (
        <div className="p-6 text-center text-gray-400">
          <LoaderSpinner size={24} /> Cargando configuración...
        </div>
      ) : (
        <div className="flex flex-col gap-6 p-4 text-gray-200">
          {/* Toggle seña */}
          <div className="flex items-center justify-between bg-neutral-800 rounded-lg p-3">
            <span className="text-sm">
              ¿Desea cobrar una seña para que el cliente agende turno?
            </span>
            <button
              onClick={() =>
                setModoPago((prev) => (prev === "senia" ? "libre" : "senia"))
              }
              className={`relative w-14 h-7 rounded-full transition ${
                modoPago === "senia" ? "bg-emerald-500" : "bg-neutral-600"
              }`}
            >
              <div
                className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white transition-transform ${
                  modoPago === "senia" ? "translate-x-7" : ""
                }`}
              ></div>
              <span className="absolute inset-0 flex items-center justify-center text-xs text-black font-bold">
                {modoPago === "senia" ? "Sí" : "No"}
              </span>
            </button>
          </div>

          {/* Solo visible si el modo de pago es "seña" */}
          {modoPago === "senia" && (
            <div className="space-y-6">
              {/* Slider porcentaje */}
              <div className="space-y-2">
                <div className="text-sm">Escoge el porcentaje de seña:</div>
                <input
                  type="range"
                  min={1}
                  max={100}
                  value={porcentajeSenia}
                  onChange={(e) => setPorcentajeSenia(Number(e.target.value))}
                  className="w-full accent-emerald-500"
                />
                <div className="text-sm text-gray-400">
                  Se cobrará un <b>{porcentajeSenia}%</b> del precio total.
                </div>

                <div className="bg-neutral-900/60 rounded-lg p-3 text-sm">
                  <p className="font-medium text-gray-300 mb-1">💡 Ejemplo:</p>
                  <p className="text-gray-400">
                    Si el servicio cuesta{" "}
                    <b className="text-white">${ejemploPrecio}</b> y la seña es del{" "}
                    <b className="text-white">{porcentajeSenia}%</b>, el cliente pagará{" "}
                    <span className="text-emerald-400 font-semibold">
                      ${ejemploSenia.toFixed(2)}
                    </span>{" "}
                    al agendar.
                  </p>
                </div>
              </div>

              {/* Mercado Pago */}
              <div className="pt-4 border-t border-neutral-700">
                <p className="text-sm mb-2">
                  Vinculá tu cuenta de <b>Mercado Pago</b>:
                </p>

                <button
                  onClick={
                    mercadoPagoConectado
                      ? handleDesvincular
                      : handleConectarMercadoPago
                  }
                  className={`w-full flex items-center justify-center py-3 rounded-lg font-semibold transition ${
                    mercadoPagoConectado
                      ? "bg-red-600 hover:bg-red-700"
                      : "bg-sky-600 hover:bg-sky-700"
                  }`}
                >
                  {mercadoPagoConectado
                    ? "🔌 Desvincular cuenta"
                    : "💳 Vincular con Mercado Pago"}
                </button>

                <p
                  className={`text-center mt-2 text-sm ${
                    mercadoPagoConectado ? "text-green-400" : "text-gray-400"
                  }`}
                >
                  {mercadoPagoConectado
                    ? "Cuenta vinculada correctamente ✅"
                    : "Aún no hay cuenta vinculada"}
                </p>

                {/* 👤 Datos del usuario de Mercado Pago */}
                {mercadoPagoConectado && mpUserData && (
                  <div className="mt-4 bg-neutral-900/70 rounded-xl p-4 flex items-center gap-4 border border-neutral-700">
                    <img
                      src={mpUserData.foto}
                      alt="Foto MP"
                      className="w-12 h-12 rounded-full object-cover border border-gray-600"
                    />
                    <div className="text-sm">
                      <div className="font-semibold text-white">
                        {mpUserData.nombre} {mpUserData.apellido}
                      </div>
                      <div className="text-gray-400">{mpUserData.email}</div>
                      <div className="text-gray-500 text-xs mt-1">
                        ID: {mpUserData.id}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Botones finales */}
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
              className="px-4 py-2 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
            >
              {guardando ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        </div>
      )}
    </ModalGenerico>
  );
}
