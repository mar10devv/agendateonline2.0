// src/components/agendaVirtual/pruebas/BancoTrabajoAgendas.tsx
import React, { useMemo } from "react";
import CalendarioBase from "../components/agendaVirtual/calendario/calendario-diseño"; // 👈 AJUSTA RUTA

import type {
  NegocioAgendaSource,
  EmpleadoAgendaSource,
  TurnoFuente,
} from "../components/agendaVirtual/calendario/calendario-backend"; // 👈 AJUSTA RUTA

// ======== DEMO: negocio + empleado ========
const negocioDemo: NegocioAgendaSource = {
  id: "negocio-demo",
  nombre: "BarberStylee",
  configuracionAgenda: {
    diasLibres: ["domingo"],     // negocio cerrado
    modoTurnos: "jornada",
    horaInicio: "10:00",
    horaFin: "20:00",
    horasSeparacion: 30,         // cada 30'
  },
};

const empleadoDemo: EmpleadoAgendaSource = {
  nombre: "Martin Developer",
  calendario: {
    inicio: "10:00",
    fin: "20:00",
    diasLibres: ["lunes"],       // descanso del empleado
    descansoDiaMedio: "viernes", // medio día el viernes
    descansoTurnoMedio: "tarde",
  },
};

// ======== DEMO: algunos turnos para probar ========
function useTurnosDemo(): TurnoFuente[] {
  return useMemo(() => {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const ymd = (d: Date) => d.toISOString().split("T")[0];

    const dia = (offset: number) => {
      const d = new Date(hoy);
      d.setDate(hoy.getDate() + offset);
      return ymd(d);
    };

    const lista: TurnoFuente[] = [
      {
        id: "t1",
        fecha: dia(0),
        hora: "14:00",
        duracion: 60,
        clienteNombre: "Cliente demo",
      },
      {
        id: "t2",
        fecha: dia(0),
        hora: "16:00",
        duracion: 30,
        bloqueado: true,
      },
      {
        id: "t3",
        fecha: dia(1),
        hora: "12:00",
        duracion: 30,
        clienteNombre: "Lucía",
      },
      {
        id: "t4",
        fecha: dia(2),
        hora: "18:00",
        duracion: 45,
        clienteNombre: "Juan",
      },
    ];

    return lista;
  }, []);
}

// ======== PANTALLA BANCO DE TRABAJO ========
export default function BancoTrabajoAgendas() {
  const turnosDemo = useTurnosDemo();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center py-10 bg-[#8b5cf6]">
      {/* Título grande */}
      <h1 className="text-4xl md:text-5xl font-black text-black mb-10 text-center">
        banco de trabajo
      </h1>

      {/* Dos agendas lado a lado */}
      <div className="flex flex-col md:flex-row items-start justify-center gap-12">
        {/* Agenda negocio */}
        <div className="flex flex-col items-center gap-4">
          <CalendarioBase
            modo="negocio"
            negocio={negocioDemo}
            empleado={empleadoDemo}
            turnos={turnosDemo}
            minutosPorSlot={30}
            onSlotLibreClick={(slot) => {
              console.log("[NEGOCIO] slot libre →", slot);
            }}
            onSlotOcupadoClick={(slot) => {
              console.log("[NEGOCIO] slot ocupado →", slot);
            }}
            onSlotBloqueadoClick={(slot) => {
              console.log("[NEGOCIO] slot bloqueado →", slot);
            }}
          />
          <span className="text-2xl font-bold text-black">
            agenda negocio
          </span>
        </div>

        {/* Agenda cliente */}
        <div className="flex flex-col items-center gap-4">
          <CalendarioBase
            modo="cliente"
            negocio={negocioDemo}
            empleado={empleadoDemo}
            turnos={turnosDemo}
            minutosPorSlot={30}
            onSlotLibreClick={(slot) => {
              console.log("[CLIENTE] quiere agendar en →", slot);
            }}
            onSlotOcupadoClick={(slot) => {
              console.log("[CLIENTE] click en turno ocupado →", slot);
            }}
            onSlotBloqueadoClick={(slot) => {
              console.log("[CLIENTE] slot bloqueado →", slot);
            }}
          />
          <span className="text-2xl font-bold text-black">
            agenda cliente
          </span>
        </div>
      </div>
    </div>
  );
}
