// src/components/agendaVirtual/calendario/modalCalendarioCliente.tsx
import { useEffect, useState } from "react";
import { onSnapshot, collection, query, where } from "firebase/firestore";
import { db } from "../../../lib/firebase";
import CalendarioUI from "../ui/calendarioUI";
import ModalGenerico from "../../ui/modalGenerico";

type Turno = {
  id: string;
  fecha: string; // formato YYYY-MM-DD
  hora: string;  // formato HH:mm
  empleadoId: string;
  servicio: string;
  estado: "pendiente" | "confirmado" | "cancelado";
};

type Props = {
  abierto: boolean;
  onCerrar: () => void;
  negocioId: string;
  empleado: any;
  servicio: any;
  onAgendar: (turno: Turno) => void;
};

export default function ModalCalendarioCliente({
  abierto,
  onCerrar,
  negocioId,
  empleado,
  servicio,
  onAgendar,
}: Props) {
  const [turnosOcupados, setTurnosOcupados] = useState<Turno[]>([]);

  // 🔎 Escuchar turnos en tiempo real
  useEffect(() => {
    if (!empleado?.id) return;

    const q = query(
      collection(db, "Negocios", negocioId, "Turnos"),
      where("empleadoId", "==", empleado.id),
      where("estado", "in", ["pendiente", "confirmado"])
    );

    const unsub = onSnapshot(q, (snap) => {
      const datos: Turno[] = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as Turno[];
      setTurnosOcupados(datos);
    });

    return () => unsub();
  }, [negocioId, empleado?.id]);

  // ⚡ Generar slots
  const generarSlots = (fecha: Date) => {
    const turnosTemp: { hora: string; disponible: boolean }[] = [];
    if (!empleado?.calendario) return turnosTemp;

    const [hInicio, mInicio] = empleado.calendario.inicio
      ? empleado.calendario.inicio.split(":").map(Number)
      : [8, 0];
    const [hFin, mFin] = empleado.calendario.fin
      ? empleado.calendario.fin.split(":").map(Number)
      : [16, 0];

    const inicioMins = hInicio * 60 + mInicio;
    const finMins = hFin * 60 + mFin;
    const totalMins = finMins - inicioMins;

    let duracion = servicio?.duracion || 30;
    if (empleado.calendario.modo === "clientesPorJornada") {
      duracion = Math.floor(totalMins / empleado.calendario.clientesPorJornada);
    }

    // Orden de llegada
    if (empleado.calendario.modo === "ordenLlegada") {
      turnosTemp.push({
        hora: `${hInicio.toString().padStart(2, "0")}:${mInicio
          .toString()
          .padStart(2, "0")} - ${hFin.toString().padStart(2, "0")}:${mFin
          .toString()
          .padStart(2, "0")}`,
        disponible: true,
      });
      return turnosTemp;
    }

    // Por bloques
    let mins = inicioMins;
    while (mins + duracion <= finMins) {
      const hh = String(Math.floor(mins / 60)).padStart(2, "0");
      const mm = String(mins % 60).padStart(2, "0");
      const hora = `${hh}:${mm}`;

      const fechaISO = fecha.toISOString().split("T")[0];
      const ocupado = turnosOcupados.some(
        (t) => t.fecha === fechaISO && t.hora === hora
      );

      turnosTemp.push({ hora, disponible: !ocupado });
      mins += duracion;
    }

    // Minutos sobrantes
    if (mins < finMins) {
      const sobrante = finMins - mins;
      if (sobrante >= (servicio?.duracion || 0)) {
        const hh = String(Math.floor(mins / 60)).padStart(2, "0");
        const mm = String(mins % 60).padStart(2, "0");
        const hora = `${hh}:${mm}`;

        const fechaISO = fecha.toISOString().split("T")[0];
        const ocupado = turnosOcupados.some(
          (t) => t.fecha === fechaISO && t.hora === hora
        );

        turnosTemp.push({ hora, disponible: !ocupado });
      }
    }

    return turnosTemp;
  };

  // 👇 Callback cliente
  const handleSelectTurno = ({ hora, fecha }: { hora: string; fecha: Date }) => {
    const fechaISO = fecha.toISOString().split("T")[0];

    const ocupado = turnosOcupados.some(
      (t) => t.fecha === fechaISO && t.hora === hora
    );
    if (ocupado) {
      alert("Ese horario ya fue reservado ❌");
      return;
    }

    const nuevoTurno: Turno = {
      id: "",
      fecha: fechaISO,
      hora,
      empleadoId: empleado.id,
      servicio: servicio?.servicio || "", // 👈 corregido
      estado: "pendiente",
    };

    onAgendar(nuevoTurno);
  };

  return (
    <ModalGenerico
      abierto={abierto}
      onClose={onCerrar}
      titulo="Agendar turno"
      maxWidth="max-w-3xl"
    >
      <CalendarioUI
        empleado={empleado}
        servicio={servicio}
        negocioId={negocioId}
        onSelectTurno={handleSelectTurno}
        generarTurnos={generarSlots}
      />
    </ModalGenerico>
  );
}
