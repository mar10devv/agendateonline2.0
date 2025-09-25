
// BACK END SRC/COMPONENTS/AGENDAVIRTUAL/UI/AGENDA.TSX

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

type Turno = {
  id: string;
  cliente: string;
  email: string;
  servicio: string;
  fecha: string;
  hora: string;
  estado: "pendiente" | "confirmado" | "cancelado";
  barbero: string;
};

type Empleado = {
  nombre: string;
  foto?: string;
  especialidad?: string;
};

type Servicio = {
  nombre: string;
  precio: number;
  duracion: number;
};

type Negocio = {
  nombre: string;
  direccion?: string;
  slug: string;
  logoUrl?: string;
  bannerUrl?: string;
  servicios?: Servicio[];
};

type Props = {
  empleados: Empleado[];
  turnos: Turno[];
  negocio: Negocio;
  modo: "dueño" | "cliente";
  plan: "gratis" | "lite" | "gold";
};

export default function AgendaVirtualUI({
  empleados,
  turnos,
  negocio,
  modo,
  plan,
}: Props) {
  const [paso, setPaso] = useState<1 | 2 | 3>(1);
  const [empleadoSeleccionado, setEmpleadoSeleccionado] =
    useState<Empleado | null>(null);
  const [servicioSeleccionado, setServicioSeleccionado] =
    useState<Servicio | null>(null);
  const [selectedDate, setSelectedDate] = useState<number>(
    new Date().getDate()
  );
  const [horarioSeleccionado, setHorarioSeleccionado] = useState<string | null>(
    null
  );

  // Horarios de prueba (podés reemplazar por lógica de calendario real)
  const horarios = [
    "10:00 AM",
    "10:45 AM",
    "11:30 AM",
    "12:15 PM",
    "1:00 PM",
    "1:45 PM",
    "2:30 PM",
    "3:15 PM",
    "4:00 PM",
    "4:45 PM",
    "5:30 PM",
    "6:15 PM",
    "7:00 PM",
  ];

  const fechaSeleccionada = `2025-09-${String(selectedDate).padStart(2, "0")}`;

  // Turnos filtrados del día
  const turnosDelDia = turnos.filter(
    (t) =>
      t.fecha === fechaSeleccionada &&
      (!empleadoSeleccionado || t.barbero === empleadoSeleccionado.nombre)
  );

  // Función para saber si un horario está ocupado
  const getTurno = (hora: string) =>
    turnosDelDia.find((t) => t.hora === hora) || null;

  // 🟥 Plan gratis → solo muestra aviso
  if (modo === "dueño" && plan === "gratis") {
    return (
      <div className="flex items-center justify-center min-h-screen bg-neutral-900 text-white text-center p-6">
        🚫 Tu negocio está en plan <b>Gratis</b>.
        <br />
        Actualizá a Premium Lite o Premium Gold para activar tu agenda.
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-neutral-900 text-white">
      {/* Banner */}
      <div className="w-full h-56 overflow-hidden">
        <img
          src={negocio.bannerUrl || "/banner-default.jpg"}
          alt={negocio.nombre}
          className="w-full h-full object-cover"
        />
      </div>

      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 p-6">
        {/* Columna izquierda */}
        <div className="md:col-span-2 space-y-8">
          {/* Servicios */}
          <div className="bg-neutral-800 rounded-2xl p-6">
            <h2 className="text-lg font-semibold mb-4">Servicios</h2>
            <div className="space-y-3">
              {negocio.servicios?.map((s, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setServicioSeleccionado(s);
                    setPaso(2);
                  }}
                  className="w-full flex justify-between items-center bg-neutral-900 p-4 rounded-xl hover:bg-neutral-700 transition"
                >
                  <div>
                    <p className="font-medium">{s.nombre}</p>
                    <p className="text-xs text-gray-400">
                      {s.duracion} mins · Detalles
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold">${s.precio}</span>
                    <span className="text-gray-500">{">"}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Empleados */}
          <div className="bg-neutral-800 rounded-2xl p-6">
            <h2 className="text-lg font-semibold mb-4">Empleados</h2>
            <div className="space-y-3">
              {empleados.map((e, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setEmpleadoSeleccionado(e);
                    setPaso(2);
                  }}
                  className="flex justify-between items-center bg-neutral-900 p-4 rounded-xl hover:bg-neutral-700 transition w-full"
                >
                  <div className="flex items-center gap-3">
                    {e.foto ? (
                      <img
                        src={e.foto}
                        alt={e.nombre}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center font-bold">
                        {e.nombre.charAt(0)}
                      </div>
                    )}
                    <div>
                      <p className="font-medium">{e.nombre}</p>
                      {e.especialidad && (
                        <p className="text-xs text-gray-400">
                          {e.especialidad}
                        </p>
                      )}
                    </div>
                  </div>
                  <span className="text-gray-500">{">"}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Horarios */}
          <div className="bg-neutral-800 rounded-2xl p-6">
            <h2 className="text-lg font-semibold mb-4">Horarios</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {horarios.map((h) => {
                const turno = getTurno(h);
                return (
                  <button
                    key={h}
                    disabled={!!turno && modo === "cliente"} // cliente no puede reservar ocupado
                    onClick={() => setHorarioSeleccionado(h)}
                    className={`p-3 rounded-xl text-sm font-medium transition ${
                      turno
                        ? "bg-red-600 text-white cursor-not-allowed"
                        : "bg-green-600 text-white hover:bg-green-700"
                    }`}
                  >
                    {h}
                    {turno && (
                      <div className="mt-1 text-xs truncate">
                        {modo === "dueño"
                          ? `${turno.cliente} (${turno.servicio})`
                          : "Ocupado"}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Columna derecha */}
        <div className="bg-neutral-800 rounded-2xl p-6 flex flex-col items-center text-center">
          {negocio.logoUrl ? (
            <img
              src={negocio.logoUrl}
              alt="Logo negocio"
              className="w-20 h-20 rounded-full mb-4"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-gray-700 flex items-center justify-center text-2xl font-bold mb-4">
              {negocio.nombre.charAt(0)}
            </div>
          )}
          <h3 className="text-lg font-semibold">{negocio.nombre}</h3>

          {modo === "cliente" && (
            <button className="mt-4 bg-white text-black px-6 py-2 rounded-full font-medium hover:bg-gray-200">
              Reservar
            </button>
          )}

          <div className="mt-6 text-xs text-gray-400 space-y-2">
            <p>📍 {negocio.direccion}</p>
            <p className="underline cursor-pointer">Contactar</p>
          </div>
        </div>
      </div>
    </div>
  );
}
