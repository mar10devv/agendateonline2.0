import React, { useEffect, useState } from "react";
import ModalGenerico from "../../ui/modalGenerico";
import LoaderSpinner from "../../ui/loaderSpinner";
import MercadoPagoIcon from "../../../assets/mp-icon.svg?url";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { getFirestore, doc, getDoc, updateDoc } from "firebase/firestore";
import { app } from "../../../lib/firebase"; // ✅ tu instancia de Firebase

type Props = {
  abierto: boolean;
  onCerrar: () => void;
  negocioId?: string;
};

export default function ModalConfigCalendarioNegocio({
  abierto,
  onCerrar,
  negocioId: negocioIdProp,
}: Props) {
  const [negocioId, setNegocioId] = useState<string | null>(negocioIdProp || null);
  const [conectado, setConectado] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  const [cobraSenia, setCobraSenia] = useState(false);
  const [porcentajeSenia, setPorcentajeSenia] = useState(25);

  const CLIENT_ID = import.meta.env.PUBLIC_MP_CLIENT_ID;
  const SITE_URL = import.meta.env.PUBLIC_SITE_URL || import.meta.env.SITE_URL;
  const db = getFirestore(app);

  // 🔹 Detectar usuario logueado o usar negocio de prueba
  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      const uid = negocioIdProp || user?.uid || "hycp0nS5NycAYP32NfNf3wI6fhg2";
      setNegocioId(uid);

      try {
        const ref = doc(db, "Negocios", uid);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const data = snap.data();
          const conectado =
            data?.configuracionAgenda?.mercadoPago?.conectado ??
            data?.mercadoPago?.conectado ??
            false;

          const cobraSenia = data?.configuracionAgenda?.cobraSenia ?? false;
          const porcentajeSenia = data?.configuracionAgenda?.porcentajeSenia ?? 25;

          setConectado(conectado);
          setCobraSenia(cobraSenia);
          setPorcentajeSenia(porcentajeSenia);
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
  }, [negocioIdProp]);

  // 🔹 Escuchar mensaje desde popup (cuando se vincula)
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

  // 🔹 Vincular Mercado Pago
  const handleVincular = () => {
    if (!CLIENT_ID || !SITE_URL) {
      alert("⚠️ Faltan variables de entorno de Mercado Pago");
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

  // 🔹 Desvincular Mercado Pago
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

  // 🔹 Guardar configuración de seña
  const guardarConfigSenia = async () => {
    if (!negocioId) return;
    try {
      const ref = doc(db, "Negocios", negocioId);
      await updateDoc(ref, {
        "configuracionAgenda.cobraSenia": cobraSenia,
        "configuracionAgenda.porcentajeSenia": porcentajeSenia,
      });
      alert("✅ Configuración guardada correctamente.");
    } catch (err) {
      console.error("Error guardando configuración:", err);
      alert("❌ Error al guardar la configuración.");
    }
  };

  // 💰 Ejemplo de cálculo
  const ejemploPrecio = 1000;
  const ejemploSenia = (ejemploPrecio * porcentajeSenia) / 100;

  return (
    <ModalGenerico
      abierto={abierto}
      onClose={onCerrar}
      titulo="⚙️ Configuración de agenda"
      maxWidth="max-w-lg"
    >
      {loading ? (
        <div className="p-5 text-center text-gray-400">
          <LoaderSpinner size={24} /> Cargando configuración...
        </div>
      ) : (
        <div className="p-5 text-gray-200 space-y-6">
          <p className="text-sm">
            Aquí podrás configurar si deseás cobrar una <b>seña</b> para que los
            clientes confirmen sus turnos, y vincular tu cuenta de{" "}
            <b>Mercado Pago</b>.
          </p>

          {/* 🔹 Toggle */}
          <div className="flex items-center justify-between bg-neutral-800 rounded-lg p-3">
            <span className="text-sm">
              ¿Desea cobrar una seña para que el cliente agende turno?
            </span>
            <button
              onClick={() => setCobraSenia(!cobraSenia)}
              className={`relative w-14 h-7 rounded-full transition ${
                cobraSenia ? "bg-emerald-500" : "bg-neutral-600"
              }`}
            >
              <div
                className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white transition-transform ${
                  cobraSenia ? "translate-x-7" : ""
                }`}
              ></div>
              <span className="absolute inset-0 flex items-center justify-center text-xs text-black font-bold">
                {cobraSenia ? "Sí" : "No"}
              </span>
            </button>
          </div>

          {/* 🔹 Slider */}
          {cobraSenia && (
            <div className="space-y-3 mt-2">
              <label className="text-sm font-medium text-gray-300">
                Escoge el porcentaje que deseas cobrar de seña:
              </label>
              <input
                type="range"
                min={1}
                max={100}
                value={porcentajeSenia}
                onChange={(e) => setPorcentajeSenia(Number(e.target.value))}
                className="w-full accent-emerald-500"
              />
              <div className="text-sm text-gray-400">
                Se cobrará un <b>{porcentajeSenia}%</b> del precio total al
                momento de agendar.
              </div>

              {/* Ejemplo */}
              <div className="bg-neutral-900/50 rounded-lg p-3 text-sm">
                <p className="text-gray-300 font-medium mb-1">
                  💡 Ejemplo práctico:
                </p>
                <p className="text-gray-400">
                  Si un servicio cuesta{" "}
                  <span className="font-semibold text-white">
                    ${ejemploPrecio}
                  </span>{" "}
                  y la seña es del{" "}
                  <span className="font-semibold text-white">
                    {porcentajeSenia}%
                  </span>
                  , el cliente pagará{" "}
                  <span className="text-emerald-400 font-semibold">
                    ${ejemploSenia.toFixed(2)}
                  </span>{" "}
                  al agendar. El resto{" "}
                  <span className="text-yellow-400 font-semibold">
                    ${ejemploPrecio - ejemploSenia}
                  </span>{" "}
                  se abona en el local.
                </p>
              </div>
            </div>
          )}

          {/* 🔹 Botones MP */}
          <div className="pt-4 border-t border-neutral-700">
            <p className="text-sm mb-2 text-gray-300">
              Vinculá tu cuenta de <b>Mercado Pago</b> para recibir las señas
              automáticamente:
            </p>
            <button
              onClick={conectado ? handleDesvincular : handleVincular}
              className={`w-full flex items-center justify-center gap-3 py-3 rounded-lg transition font-semibold ${
                conectado
                  ? "bg-red-600 hover:bg-red-700"
                  : "bg-sky-600 hover:bg-sky-700"
              }`}
            >
              {loading ? (
                <>
                  <LoaderSpinner size={20} />
                  Conectando...
                </>
              ) : conectado ? (
                "🔌 Desvincular mi cuenta"
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

            <p
              className={`text-center mt-2 text-sm ${
                conectado ? "text-green-400" : "text-gray-400"
              }`}
            >
              {conectado
                ? "Cuenta vinculada correctamente ✅"
                : "Aún no hay cuenta vinculada"}
            </p>
          </div>

          {/* 🔹 Guardar configuración */}
          <div className="flex justify-end pt-4">
            <button
              onClick={guardarConfigSenia}
              className="bg-emerald-600 hover:bg-emerald-700 px-4 py-2 rounded-lg text-white font-semibold"
            >
              Guardar cambios
            </button>
          </div>
        </div>
      )}
    </ModalGenerico>
  );
}
