// src/components/agendaVirtual/ui/modalAgendarse.tsx
import { useState, useEffect } from "react";
import ModalBase from "../../ui/modalGenerico";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../../lib/firebase";
import CalendarioUI from "../ui/calendarioUI";
type Empleado = {
  nombre: string;
  fotoPerfil?: string;
  trabajos?: string[];
  calendario?: any;
};

type Servicio = {
  id: string;
  servicio: string;
  precio: number;
  duracion: number;
};

type Props = {
  abierto: boolean;
  onClose: () => void;
  negocio: {
    id: string;
    nombre: string;
    empleadosData?: Empleado[];
    ubicacion?: {
      lat: number;
      lng: number;
      direccion: string;
    };
  };
};

export default function ModalAgendarse({ abierto, onClose, negocio }: Props) {
  const [paso, setPaso] = useState(1);
  const [servicio, setServicio] = useState<Servicio | null>(null);
  const [empleado, setEmpleado] = useState<Empleado | null>(null);
  const [turno, setTurno] = useState<any>(null);

  const siguiente = () => setPaso((p) => p + 1);
  const volver = () => setPaso((p) => p - 1);

  if (!abierto) return null;

  return (
    <ModalBase
      abierto={abierto}
      onClose={onClose}
      titulo="Agendar turno"
      maxWidth="max-w-lg"
    >
      {paso === 1 && (
        <PasoServicios
          negocio={negocio}
          onSelect={(s: Servicio) => {
            setServicio(s);
            siguiente();
          }}
        />
      )}

      {paso === 2 && servicio && (
        <PasoEmpleados
          servicio={servicio}
          negocio={negocio}
          onSelect={(e: Empleado) => {
            setEmpleado(e);
            siguiente();
          }}
          onBack={volver}
        />
      )}

      {paso === 3 && empleado && servicio && (
  <PasoTurnos
    empleado={empleado}
    servicio={servicio}   // 👈 ahora lo recibe bien
    negocio={negocio}
    onSelect={(t: any) => {
      setTurno(t);
      siguiente();
    }}
    onBack={volver}
  />
)}


      {paso === 4 && servicio && empleado && (
        <PasoConfirmacion
          servicio={servicio}
          empleado={empleado}
          turno={turno}
          negocio={negocio}
          onConfirm={siguiente}
          onBack={volver}
        />
      )}

      {paso === 5 && <PasoFinal negocio={negocio} onClose={onClose} />}
    </ModalBase>
  );
}

/* ============================================================
   SUBCOMPONENTES
   ============================================================ */

// 🔹 Paso 1 – Servicios
function PasoServicios({ negocio, onSelect }: { negocio: any; onSelect: (s: Servicio) => void }) {
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    async function cargarServicios() {
      try {
        const ref = collection(db, "Negocios", negocio.id, "Precios");
        const snap = await getDocs(ref);
        const lista = snap.docs.map(
          (doc) =>
            ({
              id: doc.id,
              ...doc.data(),
            } as Servicio)
        );
        setServicios(lista);
      } catch (err) {
        console.error("Error cargando servicios:", err);
      } finally {
        setCargando(false);
      }
    }
    cargarServicios();
  }, [negocio.id]);

  if (cargando) return <p>Cargando servicios...</p>;

  return (
    <div className="grid gap-4">
      {servicios.length > 0 ? (
        servicios.map((s) => (
          <button
            key={s.id}
            onClick={() => onSelect(s)}
            className="w-full p-4 bg-neutral-800 rounded-xl hover:bg-neutral-700 transition text-left"
          >
            <p className="text-lg font-medium">{s.servicio}</p>
            <p className="text-sm text-gray-400">
              ${s.precio} · {s.duracion} min
            </p>
          </button>
        ))
      ) : (
        <p className="text-gray-400 text-sm">No hay servicios configurados.</p>
      )}
    </div>
  );
}

// 🔹 Paso 2 – Empleados
function PasoEmpleados({
  servicio,
  negocio,
  onSelect,
  onBack,
}: {
  servicio: Servicio;
  negocio: { empleadosData?: Empleado[] };
  onSelect: (e: Empleado) => void;
  onBack: () => void;
}) {
  const [filtrados, setFiltrados] = useState<Empleado[]>([]);

  useEffect(() => {
    if (!servicio || !Array.isArray(negocio.empleadosData)) return;

    const disponibles = negocio.empleadosData.filter(
      (emp: Empleado) =>
        Array.isArray(emp.trabajos) &&
        emp.trabajos.some((t: string) => String(t).trim() === String(servicio.id).trim())
    );

    console.log("📌 Servicio seleccionado:", servicio.id);
    negocio.empleadosData.forEach((emp, idx) => {
      console.log(`Empleado ${idx}:`, emp.nombre, " -> trabajos:", emp.trabajos);
    });
    console.log("📌 Empleados disponibles:", disponibles);

    setFiltrados(disponibles);
  }, [servicio, negocio]);

  return (
    <div className="space-y-4">
      <p className="mb-2">
    Servicio {servicio.servicio}
    <br />
    Selecciona un empleado
  </p>

      {filtrados.length > 0 ? (
        filtrados.map((e, idx) => (
          <button
            key={idx}
            onClick={() => onSelect(e)}
            className="w-full flex items-center gap-4 p-3 rounded-xl transition bg-neutral-800 hover:bg-neutral-700"
          >
            {e.fotoPerfil || (e as any).foto ? (
              <img
                src={e.fotoPerfil || (e as any).foto}
                alt={e.nombre}
                className="w-12 h-12 rounded-full object-cover"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-indigo-500 flex items-center justify-center text-white font-bold">
                {e.nombre?.charAt(0) || "?"}
              </div>
            )}
            <div className="text-left">
              <p className="font-medium">{e.nombre}</p>
            </div>
          </button>
        ))
      ) : (
        <p className="text-gray-400 text-sm">
          No hay empleados disponibles para este servicio.
        </p>
      )}

      <button onClick={onBack} className="text-sm text-gray-400">
        ← Volver
      </button>
    </div>
  );
}

// 🔹 Paso 3 – Turnos
function PasoTurnos({
  negocio,
  empleado,
  servicio,
  onSelect,
  onBack,
}: {
  negocio: { id: string };
  empleado: any;
  servicio: any;
  onSelect: (t: { hora: string; fecha: Date }) => void;
  onBack: () => void;
}) {
  return (
    <div>
      <p className="mb-4 text-center">
        Selecciona un turno para <b>{empleado?.nombre}</b>
      </p>

      {/* Calendario con slots */}
      <div className="flex justify-center mb-6">
        <CalendarioUI
          empleado={empleado}
          servicio={servicio}
          negocioId={negocio.id}
          onSelectTurno={onSelect} // 👈 pasa el turno elegido al padre
        />
      </div>

      <div className="text-center">
        <button
          onClick={onBack}
          className="text-sm text-gray-400 hover:text-gray-200 transition"
        >
          ← Volver
        </button>
      </div>
    </div>
  );
}

// 🔹 Paso 4 – Confirmación
function PasoConfirmacion({
  servicio,
  empleado,
  turno,
  negocio,
  onConfirm,
  onBack,
}: any) {
  return (
    <div>
      <p>Confirma tu turno:</p>
      <ul className="mb-4 text-sm">
        <li>Servicio: {servicio?.servicio}</li>
        <li>Empleado: {empleado?.nombre}</li>
        <li>Hora: {turno?.hora}</li>
      </ul>
      <div className="flex justify-end gap-4">
        <button
          onClick={onBack}
          className="px-4 py-2 rounded bg-gray-700 text-white"
        >
          Volver
        </button>
        <button
          onClick={onConfirm}
          className="px-4 py-2 rounded bg-green-600 text-white"
        >
          Confirmar
        </button>
      </div>
    </div>
  );
}

// 🔹 Paso 5 – Final
function PasoFinal({ negocio, onClose }: any) {
  return (
    <div className="text-center">
      <h2 className="text-xl font-semibold mb-4">
        ✅ Turno agendado con éxito
      </h2>
      <p className="mb-4">Te esperamos en {negocio.nombre}</p>
      <button
        className="mt-6 w-full py-2 bg-purple-600 rounded-xl"
        onClick={onClose}
      >
        Cerrar
      </button>
    </div>
  );
}
