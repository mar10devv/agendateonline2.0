// src/components/agendaVirtual/ui/modalEmprendimiento.tsx
import { useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../../../lib/firebase";
import ModalBase from "../../ui/modalGenerico";
import { subirImagenImgBB } from "../backend/modalEmpleadosBackend";
import { Camera } from "lucide-react";

// Tipo mínimo que necesitamos del negocio
type EmpleadoBasico = {
  id?: string;
  nombre?: string;
  fotoPerfil?: string;
  calendario?: {
    diasLibres?: string[];
    horaInicio?: string;
    horaFin?: string;
    modoTurnos?: "jornada" | "personalizado";
    clientesPorDia?: number | null;
    [key: string]: any;
  };
  [key: string]: any;
};

type NegocioBasico = {
  id: string;
  nombre: string;
  slug: string;
  tipoAgenda?: string;
  configuracionAgenda?: {
    diasLibres?: string[];
    horaInicio?: string;
    horaFin?: string;
    modoTurnos?: "jornada" | "personalizado";
    clientesPorDia?: number | null;
    onboardingCompletado?: boolean;
    [key: string]: any;
  };
  empleadosData?: EmpleadoBasico[];
};

type Props = {
  abierto: boolean;
  onCerrar: () => void;
  negocio: NegocioBasico;
};

const DIAS_SEMANA = [
  "lunes",
  "martes",
  "miercoles",
  "jueves",
  "viernes",
  "sabado",
  "domingo",
];

export default function ModalEmprendimiento({
  abierto,
  onCerrar,
  negocio,
}: Props) {
  const cfg = negocio.configuracionAgenda || {};
  const empleadoActual = negocio.empleadosData?.[0];

  // 🧑 Nombre del empleado
  const [nombreEmpleado, setNombreEmpleado] = useState<string>(
    empleadoActual?.nombre || ""
  );

  // 📷 Foto del empleado
  const [fotoActual, setFotoActual] = useState<string>(
    empleadoActual?.fotoPerfil || ""
  );
  const [fotoNueva, setFotoNueva] = useState<File | null>(null);
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const [subiendoFoto, setSubiendoFoto] = useState(false);

  // 🔀 MODO: jornada vs personalizado
  const [modoTurnos, setModoTurnos] = useState<"jornada" | "personalizado">(
    cfg.modoTurnos === "personalizado" ? "personalizado" : "jornada"
  );

  const [horaInicio, setHoraInicio] = useState<string>(cfg.horaInicio || "09:00");
  const [horaFin, setHoraFin] = useState<string>(cfg.horaFin || "17:00");
  const [diasLibres, setDiasLibres] = useState<string[]>(
    Array.isArray(cfg.diasLibres) ? cfg.diasLibres : []
  );
  const [clientesPorDia, setClientesPorDia] = useState<number>(
    typeof cfg.clientesPorDia === "number" ? cfg.clientesPorDia : 5
  );

  const [guardando, setGuardando] = useState(false);
  const [exito, setExito] = useState(false);

  // ============================
  // 🔢 Validación de horarios
  // ============================

  const aMinutos = (h: string | undefined) => {
    if (!h) return null;
    const [hh, mm] = h.split(":").map(Number);
    const horas = hh === 0 && mm === 0 ? 24 : hh;
    return horas * 60 + mm;
  };

  const minutosInicio = aMinutos(horaInicio);
  const minutosFin = aMinutos(horaFin);

  const horarioInvalido =
    minutosInicio === null ||
    minutosFin === null ||
    minutosInicio >= minutosFin;

  const clientesInvalidos =
    modoTurnos === "personalizado" &&
    (!clientesPorDia || clientesPorDia <= 0);

  const nombreInvalido = !nombreEmpleado.trim();

  if (!abierto) return null;

  const toggleDia = (dia: string) => {
    setDiasLibres((prev) =>
      prev.includes(dia) ? prev.filter((d) => d !== dia) : [...prev, dia]
    );
  };

  // 📷 Manejar selección de foto
  const handleFotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo
    if (!file.type.startsWith("image/")) {
      alert("Por favor seleccioná una imagen válida");
      return;
    }

    // Validar tamaño (máx 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert("La imagen no puede superar los 5MB");
      return;
    }

    setFotoNueva(file);
    setFotoPreview(URL.createObjectURL(file));
  };

  const handleGuardar = async () => {
    try {
      setGuardando(true);
      const negocioRef = doc(db, "Negocios", negocio.id);

      const turnosPorDiaFinal =
        modoTurnos === "personalizado" ? Number(clientesPorDia) || 0 : null;

      // 📷 Subir foto si hay una nueva
      let fotoFinal = fotoActual;
      if (fotoNueva) {
        setSubiendoFoto(true);
        const urlSubida = await subirImagenImgBB(fotoNueva);
        if (urlSubida) {
          fotoFinal = urlSubida;
        }
        setSubiendoFoto(false);
      }

      // 🔹 Configuración de agenda unificada (nivel negocio)
      const nuevaConfig = {
        ...(negocio.configuracionAgenda || {}),
        diasLibres,
        horaInicio,
        horaFin,
        modoTurnos,
        clientesPorDia: turnosPorDiaFinal,
      };

      // 🔹 Solo si es EMPRENDIMIENTO → sincronizar calendario, nombre y foto del ÚNICO empleado
      let empleadosActualizados: EmpleadoBasico[] | undefined = undefined;

      const esEmprendimiento = negocio.tipoAgenda === "emprendimiento";

      if (
        esEmprendimiento &&
        Array.isArray(negocio.empleadosData) &&
        negocio.empleadosData.length > 0
      ) {
        const [primerEmpleado, ...resto] = negocio.empleadosData;

        const nuevoCalendario = {
          ...(primerEmpleado.calendario || {}),
          diasLibres,
          horaInicio,
          horaFin,
          modoTurnos,
          clientesPorDia: turnosPorDiaFinal,
        };

        empleadosActualizados = [
          { 
            ...primerEmpleado, 
            nombre: nombreEmpleado.trim(),
            fotoPerfil: fotoFinal, // 👈 Actualizar foto
            calendario: nuevoCalendario 
          },
          ...resto,
        ];
      }

      const payload: any = {
        configuracionAgenda: nuevaConfig,
      };

      if (empleadosActualizados) {
        payload.empleadosData = empleadosActualizados;
      }

      await updateDoc(negocioRef, payload);

      setExito(true);
      setGuardando(false);

      setTimeout(() => {
        window.location.reload();
      }, 600);
    } catch (err) {
      console.error("❌ Error guardando configuración de emprendimiento:", err);
      setGuardando(false);
      setSubiendoFoto(false);
    }
  };

  // Foto a mostrar (preview > actual > ninguna)
  const fotoMostrar = fotoPreview || fotoActual;

  return (
    <ModalBase
      abierto={abierto}
      onClose={onCerrar}
      titulo="Configurar emprendimiento"
      maxWidth="max-w-xl"
    >
      <div className="space-y-5">
        <p className="text-sm text-gray-300">
          Esta agenda está en modo <strong>emprendimiento</strong>. Acá definís
          tu <strong>foto</strong>, tu <strong>nombre</strong>, el <strong>horario de trabajo</strong>, los{" "}
          <strong>días libres</strong> y, si usás modo{" "}
          <strong>personalizado</strong>, la{" "}
          <strong>cantidad de turnos por día</strong>.
        </p>

        {/* 📷 Foto + Nombre en fila */}
        <div className="flex items-start gap-4">
          {/* Foto de perfil */}
          <div className="relative group">
            <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-gray-600 bg-[var(--color-primario-oscuro)]">
              {fotoMostrar ? (
                <img
                  src={fotoMostrar}
                  alt="Foto de perfil"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-2xl text-gray-400">
                  {nombreEmpleado.charAt(0).toUpperCase() || "?"}
                </div>
              )}
            </div>
            
            {/* Overlay para cambiar foto */}
            <label className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition cursor-pointer">
              <Camera className="w-6 h-6 text-white" />
              <input
                type="file"
                accept="image/*"
                onChange={handleFotoChange}
                className="hidden"
              />
            </label>
          </div>

          {/* Nombre */}
          <div className="flex-1">
            <label className="block text-xs mb-1 text-gray-400">
              Tu nombre (visible para clientes)
            </label>
            <input
              type="text"
              value={nombreEmpleado}
              onChange={(e) => setNombreEmpleado(e.target.value)}
              placeholder="Ej: María García"
              className="w-full px-3 py-2 rounded-md bg-[var(--color-primario-oscuro)] border border-gray-700 text-white text-sm placeholder:text-gray-500"
            />
            {nombreInvalido && (
              <p className="text-xs text-red-400 mt-1">
                El nombre no puede estar vacío.
              </p>
            )}
            <p className="text-xs text-gray-500 mt-1">
              Pasá el mouse sobre la foto para cambiarla
            </p>
          </div>
        </div>

        {/* 🔀 Toggle modo de turnos */}
        <div className="flex gap-2 bg-[var(--color-primario-oscuro)] rounded-xl p-1 text-xs">
          <button
            type="button"
            onClick={() => setModoTurnos("jornada")}
            className={`
              flex-1 px-3 py-2 rounded-lg font-medium transition
              ${
                modoTurnos === "jornada"
                  ? "bg-white text-black"
                  : "bg-transparent text-gray-300 hover:text-white"
              }
            `}
          >
            Jornada
          </button>
          <button
            type="button"
            onClick={() => setModoTurnos("personalizado")}
            className={`
              flex-1 px-3 py-2 rounded-lg font-medium transition
              ${
                modoTurnos === "personalizado"
                  ? "bg-white text-black"
                  : "bg-transparent text-gray-300 hover:text-white"
              }
            `}
          >
            Personalizado (turnos fijos por día)
          </button>
        </div>

        {/* Horarios */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs mb-1 text-gray-400">
              Hora de inicio
            </label>
            <input
              type="time"
              value={horaInicio}
              onChange={(e) => setHoraInicio(e.target.value)}
              className="w-full px-3 py-2 rounded-md bg-[var(--color-primario-oscuro)] border border-gray-700 text-white text-sm"
            />
          </div>
          <div>
            <label className="block text-xs mb-1 text-gray-400">
              Hora de cierre
            </label>
            <input
              type="time"
              value={horaFin}
              onChange={(e) => setHoraFin(e.target.value)}
              className="w-full px-3 py-2 rounded-md bg-[var(--color-primario-oscuro)] border border-gray-700 text-white text-sm"
            />
          </div>
        </div>

        {horarioInvalido && (
          <p className="text-xs text-red-400">
            La hora de inicio debe ser menor a la hora de cierre.
          </p>
        )}

        {/* Clientes por día (solo en PERSONALIZADO) */}
        {modoTurnos === "personalizado" && (
          <div>
            <label className="block text-xs mb-1 text-gray-400">
              Cantidad de turnos disponibles por día
            </label>
            <input
              type="number"
              min={1}
              max={50}
              value={clientesPorDia}
              onChange={(e) => setClientesPorDia(Number(e.target.value) || 0)}
              className="w-full px-3 py-2 rounded-md bg-[var(--color-primario-oscuro)] border border-gray-700 text-white text-sm"
            />
            {clientesInvalidos && (
              <p className="text-xs text-red-400 mt-1">
                Debe haber al menos 1 turno disponible por día.
              </p>
            )}
          </div>
        )}

        {/* Días libres */}
        <div>
          <label className="block text-xs mb-2 text-gray-400">
            Días cerrados
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {DIAS_SEMANA.map((dia) => {
              const activo = diasLibres.includes(dia);
              return (
                <button
                  key={dia}
                  type="button"
                  onClick={() => toggleDia(dia)}
                  className={`
                    text-xs px-3 py-2 rounded-lg border transition
                    ${
                      activo
                        ? "bg-yellow-400 text-black border-yellow-400"
                        : "bg-[var(--color-primario-oscuro)] text-gray-200 border-gray-700 hover:border-gray-500"
                    }
                  `}
                >
                  {dia.charAt(0).toUpperCase() + dia.slice(1)}
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-700">
          <button
            type="button"
            onClick={onCerrar}
            className="px-4 py-2 rounded-lg text-sm bg-gray-700 text-white hover:bg-gray-600"
            disabled={guardando}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleGuardar}
            disabled={guardando || horarioInvalido || clientesInvalidos || nombreInvalido}
            className={`
              px-5 py-2 rounded-lg text-sm font-medium
              ${
                guardando
                  ? "bg-green-700 text-white opacity-70"
                  : "bg-green-600 text-white hover:bg-green-500"
              }
            `}
          >
            {subiendoFoto
              ? "Subiendo foto..."
              : guardando
              ? "Guardando..."
              : exito
              ? "✅ Guardado"
              : "Guardar cambios"}
          </button>
        </div>
      </div>
    </ModalBase>
  );
}