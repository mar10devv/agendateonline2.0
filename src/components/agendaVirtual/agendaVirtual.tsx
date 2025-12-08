// src/components/agendaVirtual/agendaVirtual.tsx
import { useEffect, useState } from "react";
import {
  detectarUsuario,
  loginConGoogle,
  getTurnos,
  type Turno,
  type Negocio,
} from "./backend/agenda-backend";
import type { Empleado } from "./backend/modalEmpleadosBackend";

import AgendaVirtualUI from "./ui/agenda-v2";
import LoaderAgenda from "../ui/loaderAgenda";

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
  const [fechaSeleccionada] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );

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

        if (estadoDetectado === "listo" && negocioDetectado) {
          setNegocio(negocioDetectado);

          const emps = (negocioDetectado.empleadosData ?? []) as Empleado[];
          setEmpleados(emps);

          const tns = await getTurnos(slug, fechaSeleccionada);
          setTurnos(tns);

          if (user) {
            if (user.uid === negocioDetectado.id) {
              setModo("dueño");
            } else {
              const esAdmin = emps.find(
                (e) => e.admin === true && e.adminEmail === user.email
              );
              setModo(esAdmin ? "admin" : "cliente");
            }
          } else {
            setModo("cliente");
          }
        }
      }
    );
  }, [slug, fechaSeleccionada]);

  useEffect(() => {
    if (negocio?.nombre) {
      document.title = `${negocio.nombre} | AgendateOnline`;
    }
  }, [negocio]);

  useEffect(() => {
    if (!negocio) return;

    const cfg: any = negocio.configuracionAgenda || {};

    setConfigAgendaInicial({
      diasLibres: cfg.diasLibres || [],
      modoTurnos: cfg.modoTurnos || "jornada",
      clientesPorDia:
        typeof cfg.clientesPorDia === "number" ? cfg.clientesPorDia : null,
    });

    if (modo === "dueño" || modo === "admin") {
      setMostrarModalConfigAgenda(cfg.onboardingCompletado !== true);
    } else {
      setMostrarModalConfigAgenda(false);
    }
  }, [negocio, modo]);

  if (estado === "cargando") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-r from-blue-600 to-indigo-600 text-white gap-6">
        <LoaderAgenda />
        <p className="text-lg font-medium animate-pulse">
          Cargando agenda...
        </p>
      </div>
    );
  }

  if (estado === "no-sesion") {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
        <div className="text-center space-y-4">
          <p className="text-lg font-medium">
            Debes iniciar sesión para ver la agenda
          </p>
          <button
            onClick={loginConGoogle}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl transition"
          >
            Iniciar sesión con Google
          </button>
        </div>
      </div>
    );
  }

if (!negocio) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-blue-600 to-indigo-600 to-black px-4">
      <div
        className="
          max-w-md w-full
          rounded-3xl
          border border-white/15
          bg-white/5
          backdrop-blur-xl
          shadow-[0_0_60px_rgba(255,255,255,0.18)]
          px-6 py-7
          text-center
          space-y-4
        "
      >
        {/* Icono de alerta (sin círculo, animado) */}
        <div className="mx-auto flex items-center justify-center">
          <span className="icon-alerta-breath text-4xl md:text-5xl">⚠️</span>
        </div>

        {/* Título */}
        <h1 className="text-lg md:text-xl font-semibold text-neutral-50">
          No encontramos esta agenda
        </h1>

        {/* Detalle del error */}
        <p className="text-sm text-neutral-200">
          No existe ningún negocio con el enlace:
          <span className="block mt-1 font-mono text-red-300 break-all">
            "{slug}"
          </span>
        </p>

        <p className="text-xs text-neutral-300">
          Verificá que el link esté bien escrito o pedile al dueño que te
          comparta el enlace correcto.
        </p>

        {/* Botón para volver */}
        <a
          href="/"
          className="inline-flex items-center justify-center rounded-xl bg-neutral-100 text-neutral-900 hover:bg-white px-4 py-2 text-sm font-medium transition"
        >
          Volver al inicio
        </a>
      </div>
    </div>
  );
}


  // 👇 Flag para saber si esta agenda es un EMPRENDIMIENTO
  const esEmprendimiento = negocio.tipoAgenda === "emprendimiento";

  return (
    <>
      <AgendaVirtualUI
        empleados={empleados}
        turnos={turnos}
        negocio={negocio}
        servicios={negocio.servicios ?? []}
        modo={modo}
        esEmprendimiento={esEmprendimiento} // 👈 se lo pasamos al UI
      />
    </>
  );
}
