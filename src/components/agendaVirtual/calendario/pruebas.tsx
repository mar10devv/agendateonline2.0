// src/components/agendaVirtual/pruebas/BancoTrabajoAgendas.tsx
import React, { useState, useEffect } from "react";
import CalendarioBase from "../calendario/calendario-diseño";

import {
  type NegocioAgendaSource,
  type EmpleadoAgendaSource,
  type TurnoFuente,
  type SlotCalendario,
  type UsuarioActual,
  bloquearSlotBackend,
  crearTurnoManualBackend,
} from "./calendario-backend";

import { db } from "../../../lib/firebase";
import { collection, onSnapshot, query, where } from "firebase/firestore";

/* ==========================
   DEMO: negocio + empleado
   ========================== */

// ⚠️ Cambia estos IDs por algo real de tu Firestore si querés probarlo con datos de verdad
const OWNER_UID_REAL = "OWNER_UID_DE_TU_NEGOCIO";
const NEGOCIO_ID_REAL = "ID_DOC_NEGOCIO_EN_FIRESTORE";

const usuarioDemo: UsuarioActual = {
  uid: OWNER_UID_REAL,
};

const negocioDemo: NegocioAgendaSource = {
  id: NEGOCIO_ID_REAL,
  nombre: "BarberStylee (demo)",
  ownerUid: OWNER_UID_REAL,
  adminUids: [OWNER_UID_REAL],
  configuracionAgenda: {
    diasLibres: ["domingo"], // negocio cerrado
    modoTurnos: "jornada",
    horaInicio: "10:00",
    horaFin: "20:00",
    horasSeparacion: 30,
  },
};

const empleadoDemo: EmpleadoAgendaSource = {
  nombre: "Empleado demo",
  calendario: {
    inicio: "10:00",
    fin: "20:00",
    diasLibres: ["lunes"],
    descansoDiaMedio: "viernes",
    descansoTurnoMedio: "tarde",
  },
};

/* ==========================
   Hook: turnos en tiempo real
   ========================== */

function useTurnosRealtime(
  negocioId: string,
  empleadoNombre?: string
): TurnoFuente[] {
  const [lista, setLista] = useState<TurnoFuente[]>([]);

  useEffect(() => {
    if (!negocioId || !empleadoNombre) return;

    const ref = collection(db, "Negocios", negocioId, "Turnos");
    const qRef = query(ref, where("empleadoNombre", "==", empleadoNombre));

    const off = onSnapshot(qRef, (snap) => {
      const arr: TurnoFuente[] = [];
      snap.forEach((d) => {
        arr.push({
          id: d.id,
          ...(d.data() as any),
        });
      });
      setLista(arr);
    });

    return () => off();
  }, [negocioId, empleadoNombre]);

  return lista;
}

/* ==========================
   Banco de trabajo agendas
   ========================== */

export default function BancoTrabajoAgendas() {
  const minutosPorSlot = 30;

  // turnos en vivo de Firestore
  const turnosDemo = useTurnosRealtime(negocioDemo.id, empleadoDemo.nombre);

  // ---- handlers para la agenda del negocio ----
  const handleSlotLibreNegocio = async (slot: SlotCalendario) => {
    // pequeño menú rápido para probar
    const opcion = window.prompt(
      [
        `Horario: ${slot.hora}`,
        "",
        "¿Qué querés hacer?",
        "1 = Agendar manual",
        "2 = Bloquear este horario",
        "Cancelar = nada",
      ].join("\n")
    );

    if (!opcion) return;

    try {
      if (opcion === "2") {
        // Bloquear solo ese slot
        await bloquearSlotBackend({
          usuario: usuarioDemo,
          negocio: negocioDemo,
          empleadoId: undefined,
          empleadoNombre: empleadoDemo.nombre || "Empleado demo",
          fecha: slot.fecha,
          hora: slot.hora,
          duracionMin: minutosPorSlot,
        });
        alert("✅ Horario bloqueado");
      } else if (opcion === "1") {
        const nombre = window.prompt("Nombre del cliente:");
        if (!nombre) return;

        // En este banco de pruebas usamos un servicio "demo"
        await crearTurnoManualBackend({
          usuario: usuarioDemo,
          negocio: negocioDemo,
          empleadoId: undefined,
          empleadoNombre: empleadoDemo.nombre || "Empleado demo",
          fecha: slot.fecha,
          hora: slot.hora,
          servicioId: "servicio-demo",
          servicioNombre: "Servicio demo",
          duracion: minutosPorSlot,
          clienteNombre: nombre,
          clienteEmail: null,
          clienteTelefono: null,
        });

        alert("✅ Turno creado manualmente");
      }
    } catch (e: any) {
      console.error(e);
      if (e?.message === "NO_PERMISO_AGENDA") {
        alert(
          "⚠️ No tenés permisos para gestionar esta agenda (solo dueño/admin)."
        );
      } else {
        alert("❌ Ocurrió un error al operar sobre el turno.");
      }
    }
  };

  const handleSlotOcupadoNegocio = (slot: SlotCalendario) => {
    const t = slot.turnoOcupado;
    if (!t) return;

    alert(
      [
        `⏰ ${slot.hora}`,
        `Cliente: ${t.clienteNombre || "—"}`,
        `Servicio: ${t.servicioNombre || "—"}`,
      ].join("\n")
    );
  };

  const handleSlotBloqueadoNegocio = (slot: SlotCalendario) => {
    alert(`🚫 Horario bloqueado a las ${slot.hora}`);
    // Más adelante podrías agregar acá "desbloquear" usando una función helper
  };

  // ---- handlers para agenda cliente (solo mostrar) ----
  const handleSlotLibreCliente = (slot: SlotCalendario) => {
    alert(
      `Cliente quiere agendar el día ${slot.fecha.toLocaleDateString(
        "es-ES"
      )} a las ${slot.hora}`
    );
  };

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
            usuarioActual={usuarioDemo}       
            negocio={negocioDemo}
            empleado={empleadoDemo}
            turnos={turnosDemo}
            minutosPorSlot={minutosPorSlot}
            onSlotLibreClick={handleSlotLibreNegocio}
            onSlotOcupadoClick={handleSlotOcupadoNegocio}
            onSlotBloqueadoClick={handleSlotBloqueadoNegocio}
          />
          <span className="text-2xl font-bold text-black">
            agenda negocio
          </span>
        </div>

        {/* Agenda cliente */}
        <div className="flex flex-col items-center gap-4">
          <CalendarioBase
            modo="cliente"
            usuarioActual={usuarioDemo}     
            negocio={negocioDemo}
            empleado={empleadoDemo}
            turnos={turnosDemo}
            minutosPorSlot={minutosPorSlot}
            onSlotLibreClick={handleSlotLibreCliente}
            onSlotOcupadoClick={(slot) =>
              alert(
                `Turno ya reservado a las ${slot.hora} por ${
                  slot.turnoOcupado?.clienteNombre || "otro cliente"
                }`
              )
            }
            onSlotBloqueadoClick={() =>
              alert("Ese horario está bloqueado por el negocio")
            }
          />
          <span className="text-2xl font-bold text-black">
            agenda cliente
          </span>
        </div>
      </div>
    </div>
  );
}
