// src/components/agendaVirtual/agendaVirtual.tsx
import { useEffect, useState } from "react";
import {
  detectarUsuario,
  loginConGoogle,
  getEmpleados,
  getTurnos,
  type Turno,
  type Empleado,
  type Negocio,
} from "./backend/agenda-backend";
import AgendaVirtualUI from "./ui/agendaUI";
import LoaderAgenda from "../ui/loaderAgenda"; // 👈 tu loader

type Estado = "cargando" | "no-sesion" | "listo";
type Modo = "dueño" | "cliente";

type Props = {
  slug: string; // 👈 ahora el componente recibe el slug
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

  useEffect(() => {
    detectarUsuario(slug, async (estado, modo, user, negocio) => {
      setEstado(estado);
      setModo(modo);
      setNegocio(negocio);

      if (estado === "listo" && negocio) {
        const [emps, tns] = await Promise.all([
          getEmpleados(slug),
          getTurnos(slug, fechaSeleccionada),
        ]);
        setEmpleados(emps);
        setTurnos(tns);
      }
    });
  }, [slug, fechaSeleccionada]);

  // 👇 Pantalla de carga
  if (estado === "cargando") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white gap-6">
        <LoaderAgenda />
        <p className="text-lg font-medium animate-pulse">
          Cargando agenda...
        </p>
      </div>
    );
  }

  if (estado === "no-sesion") {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black text-white">
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
    <AgendaVirtualUI
      empleados={empleados}
      turnos={turnos}
      negocio={negocio}
      modo={modo}
      plan={negocio.tipoPremium ?? "gratis"}
    />
  );
}
