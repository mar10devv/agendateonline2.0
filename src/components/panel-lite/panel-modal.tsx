// src/components/panel-lite/panel-modal.tsx
import React, { useState, useEffect, useRef } from "react";
import {
  doc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { db } from "../../lib/firebase";
import PanelServiciosLite from "./panel-servicios";
import DownIcon from "../../assets/down-svg.svg?url";

type Props = {
  negocioId: string;
  slug: string;
  onClose: () => void;
};

function generarSlug(nombre: string) {
  return nombre
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

export default function ConfigModalLite({ negocioId, slug, onClose }: Props) {
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [mostrarFlecha, setMostrarFlecha] = useState(false);

  const [slugDisponible, setSlugDisponible] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);

  // 🔎 Verificar slug en Firestore
  const verificarSlugDisponible = async (slugCheck: string) => {
    const q = query(collection(db, "Negocios"), where("slug", "==", slugCheck));
    const snap = await getDocs(q);

    // Si está vacío → disponible
    if (snap.empty) return true;

    // Si existe, verificar que el único doc encontrado sea el mismo negocio actual
    if (snap.size === 1 && snap.docs[0].id === negocioId) {
      return true; // es su propio slug, válido
    }

    return false; // ocupado por otro negocio
  };

  // Validar slug mientras el usuario escribe
  useEffect(() => {
    if (!nuevoNombre.trim()) {
      setSlugDisponible(null);
      return;
    }

    const slugGenerado = generarSlug(nuevoNombre);

    setChecking(true);
    const timeout = setTimeout(async () => {
      const disponible = await verificarSlugDisponible(slugGenerado);
      setSlugDisponible(disponible);
      setChecking(false);
    }, 500);

    return () => clearTimeout(timeout);
  }, [nuevoNombre, negocioId]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const calcularFlecha = () => {
      setMostrarFlecha(el.scrollHeight > el.clientHeight && el.scrollTop === 0);
    };

    calcularFlecha();

    const handleScroll = () => {
      if (el.scrollTop > 0) setMostrarFlecha(false);
    };

    el.addEventListener("scroll", handleScroll);

    const resizeObserver = new ResizeObserver(() => calcularFlecha());
    resizeObserver.observe(el);

    return () => {
      el.removeEventListener("scroll", handleScroll);
      resizeObserver.disconnect();
    };
  }, [slug, negocioId]);

  const guardarNombre = async () => {
    if (!slugDisponible) return;

    setGuardando(true);
    setMensaje("");

    try {
      const negocioRef = doc(db, "Negocios", negocioId);
      const nuevoSlug = generarSlug(nuevoNombre);

      await updateDoc(negocioRef, {
        nombre: nuevoNombre,
        slug: nuevoSlug,
      });

      setMensaje("✅ Nombre de la agenda actualizado.");

      // 👇 Recargar la página en la nueva URL
      setTimeout(() => {
        window.location.href = `/agenda/${nuevoSlug}`;
      }, 800);
    } catch (err) {
      console.error("❌ Error guardando nombre:", err);
      setMensaje("❌ No se pudo guardar el nombre de la agenda.");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white w-full max-w-xl rounded-2xl shadow-xl relative flex flex-col max-h-[70vh]">
        {/* Cabecera */}
        <div className="sticky top-0 bg-white z-10 px-6 py-4 border-b rounded-t-2xl flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-800">
            ⚙️ Configuración de la agenda
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-xl"
          >
            ✕
          </button>
        </div>

        {/* Contenido con scroll */}
        <div
          ref={scrollRef}
          className="p-6 overflow-y-auto custom-scroll relative"
        >
          {/* Nombre */}
          <div className="mb-6 text-center">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nombre de la agenda (actual: <b>{slug}</b>)
            </label>
            <input
              type="text"
              value={nuevoNombre}
              onChange={(e) => setNuevoNombre(e.target.value)}
              placeholder="Nuevo nombre de la agenda"
              className="w-full md:w-3/4 mx-auto px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-600"
            />

            {/* Validación slug */}
            {nuevoNombre.trim() && (
              <p className="mt-2 text-sm">
                {checking ? (
                  <span className="text-gray-500">Verificando...</span>
                ) : slugDisponible ? (
                  <span className="text-green-600">✅ Disponible</span>
                ) : (
                  <span className="text-red-600">❌ Ocupado</span>
                )}
              </p>
            )}

            <button
              onClick={guardarNombre}
              disabled={guardando || !nuevoNombre.trim() || !slugDisponible}
              className="mt-4 px-6 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {guardando ? "Guardando..." : "Guardar nombre"}
            </button>
            {mensaje && <p className="text-sm text-gray-600 mt-2">{mensaje}</p>}
          </div>

          {/* Servicios */}
          <PanelServiciosLite negocioId={negocioId} />

          {/* Flecha */}
          {mostrarFlecha && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2">
              <img
                src={DownIcon}
                alt="scroll down"
                className="w-10 h-10 opacity-70 animate-bounce"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
