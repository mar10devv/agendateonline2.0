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

          const emps = (negocioDetectado.empleadosData ??
            []) as Empleado[];
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
      <div className="text-red-500 text-center p-10">
        ⚠️ No se encontró el negocio con el slug "{slug}"
      </div>
    );
  }

  return (
    <>
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
