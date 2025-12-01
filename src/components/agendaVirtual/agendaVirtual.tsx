// src/components/agendaVirtual/agendaVirtual.tsx
import { useEffect, useState } from "react";
import {
  detectarUsuario,
  loginConGoogle,
  getEmpleados,
  getTurnos,
  type Turno,
  type Negocio,
} from "./backend/agenda-backend";
import type { Empleado } from "./backend/modalEmpleadosBackend";
import { getCache, setCache } from "../../lib/cacheAgenda";
import AgendaVirtualUI from "./ui/agenda-v2";
import LoaderAgenda from "../ui/loaderAgenda";
import ModalConfigAgendaInicial from "./ui/modalConfigAgendaInicial";

type Estado = "cargando" | "no-sesion" | "listo";
type Modo = "dueño" | "cliente" | "admin";

type Props = {
  slug: string;
};

export default function AgendaVirtual({ slug }: Props) {
  const [estado, setEstado] = useState<Estado>("cargando");
  const [modo, setModo] = useState<Modo>("cliente");
  const [negocio, setNegocio] = useState<Negocio | null>(null);
  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [fechaSeleccionada, setFechaSeleccionada] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );

  // 🔹 Estado para el modal de configuración inicial
  const [mostrarModalConfigAgenda, setMostrarModalConfigAgenda] =
    useState(false);
  const [configAgendaInicial, setConfigAgendaInicial] = useState<{
    diasLibres?: string[];
    modoTurnos?: "jornada" | "personalizado";
    clientesPorDia?: number | null;
  } | null>(null);

  useEffect(() => {
    detectarUsuario(
      slug,
      async (estadoDetectado, _modoDetectado, user, negocioDetectado) => {
        setEstado(estadoDetectado);

        // 1️⃣ Intentar cargar negocio desde cache
        const cachedNegocio = getCache<Negocio>(slug, "negocio");
        if (cachedNegocio) {
          setNegocio(cachedNegocio);
        }

        if (estadoDetectado === "listo" && negocioDetectado) {
          // Actualizar negocio y cachearlo (TTL 1h)
          setNegocio(negocioDetectado);
          setCache(slug, "negocio", negocioDetectado, 60 * 60 * 1000);

          // 2️⃣ Intentar cargar empleados desde cache
          const cachedEmps = getCache<Empleado[]>(slug, "empleados");
          if (cachedEmps && cachedEmps.length > 0) {
            setEmpleados(cachedEmps);
          }

          // Firestore siempre para refrescar empleados y turnos
          const [emps, tns] = await Promise.all([
            getEmpleados(slug),
            getTurnos(slug, fechaSeleccionada),
          ]);

          setEmpleados(emps);
          setTurnos(tns);

          // Cachear empleados (TTL 30 min)
          setCache(slug, "empleados", emps, 30 * 60 * 1000);

          // 👑 Detección de rol
          if (user) {
            if (user.uid === negocioDetectado.id) {
              setModo("dueño");
            } else {
              const esAdmin = emps.find(
                (e) => e.admin === true && e.adminEmail === user.email
              );
              if (esAdmin) {
                setModo("admin");
              } else {
                setModo("cliente");
              }
            }
          } else {
            setModo("cliente");
          }
        }
      }
    );
  }, [slug, fechaSeleccionada]);

  // 🔹 👉 ACTUALIZAR <title> dinámicamente
  useEffect(() => {
    if (negocio?.nombre) {
      document.title = `${negocio.nombre} | AgendateOnline`;
    }
  }, [negocio]);

  // 🔹 Detectar si debemos mostrar el modal de configuración inicial
  useEffect(() => {
    if (!negocio) return;

    const cfg: any = (negocio as any).configuracionAgenda || {};

    // Siempre preparamos la config inicial, aunque el modal no se abra
    setConfigAgendaInicial({
      diasLibres: cfg.diasLibres || [],
      modoTurnos: cfg.modoTurnos || "jornada",
      clientesPorDia:
        typeof cfg.clientesPorDia === "number" ? cfg.clientesPorDia : null,
    });

    // Solo mostrar si es DUEÑO / ADMIN
    if (modo === "dueño" || modo === "admin") {
      // 👇 Si NO está explícitamente en true, mostramos el modal
      if (cfg.onboardingCompletado !== true) {
        setMostrarModalConfigAgenda(true);
      } else {
        setMostrarModalConfigAgenda(false);
      }
    } else {
      setMostrarModalConfigAgenda(false);
    }
  }, [negocio, modo]);

  // -------------------------
  // 🔵 ESTADO: CARGANDO
  // -------------------------
  if (estado === "cargando") {
    return (
      <div
        className="
          flex flex-col items-center justify-center
          min-h-screen
          bg-gradient-to-r from-blue-600 to-indigo-600
          text-white gap-6
        "
      >
        <LoaderAgenda />
        <p className="text-lg font-medium animate-pulse">
          Cargando agenda...
        </p>
      </div>
    );
  }

  // -------------------------
  // 🔵 ESTADO: NO SESIÓN
  // -------------------------
  if (estado === "no-sesion") {
    return (
      <div
        className="
          flex items-center justify-center
          min-h-screen
          bg-gradient-to-r from-blue-600 to-indigo-600
          text-white
        "
      >
        <div className="text-center space-y-4">
          <p className="text-lg font-medium">
            Debes iniciar sesión para ver la agenda
          </p>
          <button
            onClick={loginConGoogle}
            className="
              bg-indigo-600 hover:bg-indigo-700
              text-white px-6 py-3 rounded-xl transition
            "
          >
            Iniciar sesión con Google
          </button>
        </div>
      </div>
    );
  }

  if (!negocio) {
    return (
      <div className="text-red-500 text-center p-10">
        ⚠️ No se encontró el negocio con el slug "{slug}"
      </div>
    );
  }

  return (
    <>
      {/* 🟢 Modal inicial de configuración de agenda (solo dueño/admin) */}
      <ModalConfigAgendaInicial
        abierto={mostrarModalConfigAgenda}
        onClose={() => setMostrarModalConfigAgenda(false)}
        negocioId={negocio.id}
        configuracionActual={configAgendaInicial ?? undefined}
      />

      <AgendaVirtualUI
        empleados={empleados}
        turnos={turnos}
        negocio={negocio}
        servicios={negocio.servicios ?? []}
        modo={modo}
      />
    </>
  );
}
