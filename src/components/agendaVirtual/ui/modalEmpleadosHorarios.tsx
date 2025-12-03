// src/components/agendaVirtual/ui/modalHorariosEmpleados.tsx

import { useState, useEffect } from "react";
import ModalBase from "../../ui/modalGenerico";

type DiaYMedio = {
  diaCompleto: string;
  tipo: "antes" | "despues";
  medioDia: string;
  inicioMedio: string;
  finMedio: string;
};

type HorarioEmpleado = {
  inicio: string;
  fin: string;
  diasLibres: string[];
  diaYMedio?: DiaYMedio | null;
  // 🆕 media hora diaria bloqueada (ej: "13:00")
  pausaMediaHora?: string | null;
};

type Props = {
  abierto: boolean;
  onClose: () => void;
  horario: HorarioEmpleado;
  onGuardar: (nuevoHorario: HorarioEmpleado) => void;
};

const diasSemana = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
  "Domingo",
];

const capitalizarDia = (d: string) =>
  d ? d.charAt(0).toUpperCase() + d.slice(1).toLowerCase() : d;

// 🛡️ Normalizar hora y evitar undefined / valores raros
function normalizarHora(
  hora: string | null | undefined,
  fallback: string
): string {
  if (!hora || typeof hora !== "string") return fallback;

  const match = hora.match(/^(\d{1,2}):(\d{1,2})$/);
  if (!match) return fallback;

  let h = Number(match[1]) || 0;
  let m = Number(match[2]) || 0;

  if (h < 0) h = 0;
  if (h > 23) h = 23;
  if (m < 0) m = 0;
  if (m > 59) m = 59;

  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

// 💡 Calcula la mitad de una jornada, tolerando undefined
function calcularMitad(inicio?: string | null, fin?: string | null): string {
  const ini = normalizarHora(inicio, "09:00");
  const finReal = normalizarHora(fin, "17:00");

  const [hi, mi] = ini.split(":").map(Number);
  const [hf, mf] = finReal.split(":").map(Number);

  const inicioMin = hi * 60 + mi;
  const finMin = hf * 60 + mf;

  if (Number.isNaN(inicioMin) || Number.isNaN(finMin) || finMin <= inicioMin) {
    return ini; // fallback razonable
  }

  const mitad = Math.floor((inicioMin + finMin) / 2);
  const hh = String(Math.floor(mitad / 60)).padStart(2, "0");
  const mm = String(mitad % 60).padStart(2, "0");

  return `${hh}:${mm}`;
}

const getDiaAnterior = (dia: string) => {
  const idx = diasSemana.indexOf(dia);
  return diasSemana[(idx - 1 + 7) % 7];
};

const getDiaSiguiente = (dia: string) => {
  const idx = diasSemana.indexOf(dia);
  return diasSemana[(idx + 1) % 7];
};

export default function ModalHorariosEmpleados({
  abierto,
  onClose,
  horario,
  onGuardar,
}: Props) {
  // Estado interno del horario (copiamos el prop pero saneado)
  const [tempHorario, setTempHorario] = useState<HorarioEmpleado>(() => {
    const diasNormalizados = Array.isArray(horario?.diasLibres)
      ? horario.diasLibres.map(capitalizarDia)
      : [];

    return {
      inicio: horario?.inicio || "09:00",
      fin: horario?.fin || "17:00",
      diasLibres: diasNormalizados,
      diaYMedio: horario?.diaYMedio ?? null,
      pausaMediaHora: horario?.pausaMediaHora ?? null, // 🆕
    };
  });

  const [diasOriginales, setDiasOriginales] = useState<string[]>([]);

  // Cuando cambia el horario que viene de arriba (o se abre el modal), sincronizamos
  useEffect(() => {
    const diasNormalizados = Array.isArray(horario?.diasLibres)
      ? horario.diasLibres.map(capitalizarDia)
      : [];

    setDiasOriginales(diasNormalizados);

    setTempHorario((prev) => ({
      inicio: horario?.inicio || prev.inicio || "09:00",
      fin: horario?.fin || prev.fin || "17:00",
      diasLibres: diasNormalizados,
      diaYMedio: horario?.diaYMedio ?? null,
      pausaMediaHora:
        horario?.pausaMediaHora ?? prev.pausaMediaHora ?? null, // 🆕
    }));
  }, [horario, abierto]);

  if (!abierto) return null;

  // mitad jornada calculada SIEMPRE con valores saneados
  const mitadJornada = calcularMitad(tempHorario.inicio, tempHorario.fin);

  return (
    <ModalBase
      abierto={abierto}
      onClose={onClose}
      titulo="Configurar horario del empleado"
      maxWidth="max-w-lg"
    >
      {/* Horarios */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        <div>
          <label className="block text-sm mb-1">Inicio</label>
          <input
            type="time"
            value={tempHorario.inicio}
            onChange={(e) =>
              setTempHorario({ ...tempHorario, inicio: e.target.value })
            }
            className="w-full px-3 py-2 bg-neutral-800 border border-gray-700 rounded-md text-white"
          />
        </div>

        <div>
          <label className="block text-sm mb-1">Fin</label>
          <input
            type="time"
            value={tempHorario.fin}
            onChange={(e) =>
              setTempHorario({ ...tempHorario, fin: e.target.value })
            }
            className="w-full px-3 py-2 bg-neutral-800 border border-gray-700 rounded-md text-white"
          />
        </div>
      </div>

      {/* 🆕 Media hora diaria de descanso */}
      <div className="mb-6">
        <label className="block text-sm mb-1">Media hora de descanso</label>
        <div className="flex items-center gap-3">
          <input
            type="time"
            value={tempHorario.pausaMediaHora || ""}
            onChange={(e) =>
              setTempHorario({
                ...tempHorario,
                pausaMediaHora: e.target.value || null,
              })
            }
            className="px-3 py-2 bg-neutral-800 border border-gray-700 rounded-md text-white"
          />
          <button
            type="button"
            onClick={() =>
              setTempHorario((prev) => ({
                ...prev,
                pausaMediaHora: mitadJornada, // sugerimos mitad de jornada
              }))
            }
            className="px-3 py-2 text-xs rounded-lg bg-neutral-800 border border-gray-600 text-gray-200 hover:bg-neutral-700"
          >
            Usar mitad de jornada ({mitadJornada})
          </button>
          <button
            type="button"
            onClick={() =>
              setTempHorario((prev) => ({ ...prev, pausaMediaHora: null }))
            }
            className="px-3 py-2 text-xs rounded-lg bg-neutral-900 border border-gray-700 text-gray-300 hover:bg-neutral-800"
          >
            Sin descanso
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-1">
          Ese horario quedará bloqueado todos los días laborales (turnos de 30
          minutos).
        </p>
      </div>

      {/* Días libres */}
      <div className="mb-6">
        <label className="block text-sm mb-3">Días libres</label>

        {/* Selector modo */}
        <div className="flex gap-4 mb-4">
          <button
            type="button"
            onClick={() =>
              setTempHorario({
                ...tempHorario,
                diaYMedio: null,
                diasLibres: diasOriginales,
              })
            }
            className={`px-4 py-2 rounded-lg border transition ${
              !tempHorario.diaYMedio
                ? "bg-green-600 text-white border-green-600"
                : "bg-neutral-800 text-gray-300 border-gray-600 hover:bg-neutral-700"
            }`}
          >
            Varios días libres
          </button>

          <button
            type="button"
            onClick={() =>
              setTempHorario({
                ...tempHorario,
                diasLibres: [],
                diaYMedio: {
                  diaCompleto: "Lunes",
                  tipo: "antes",
                  medioDia: "Domingo",
                  inicioMedio: tempHorario.inicio,
                  finMedio: mitadJornada,
                },
              })
            }
            className={`px-4 py-2 rounded-lg border transition ${
              tempHorario.diaYMedio
                ? "bg-green-600 text-white border-green-600"
                : "bg-neutral-800 text-gray-300 border-gray-600 hover:bg-neutral-700"
            }`}
          >
            Un día y medio libre
          </button>
        </div>

        {/* MODO 1: VARIOS DÍAS */}
        {!tempHorario.diaYMedio && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {diasSemana.map((dia) => {
              const activo = tempHorario.diasLibres.includes(dia);

              return (
                <button
                  key={dia}
                  type="button"
                  onClick={() => {
                    if (activo) {
                      setTempHorario((prev) => ({
                        ...prev,
                        diasLibres: prev.diasLibres.filter((d) => d !== dia),
                      }));
                    } else {
                      setTempHorario((prev) => ({
                        ...prev,
                        diasLibres: [...prev.diasLibres, dia],
                      }));
                    }
                  }}
                  className={`px-3 py-2 rounded-lg border text-sm transition ${
                    activo
                      ? "bg-green-600 text-white border-green-600"
                      : "bg-neutral-800 text-gray-300 border-gray-600 hover:bg-neutral-700"
                  }`}
                >
                  {dia}
                </button>
              );
            })}
          </div>
        )}

        {/* MODO 2: UN DÍA Y MEDIO */}
        {tempHorario.diaYMedio && (
          <div className="flex flex-col gap-5">
            {/* DÍA COMPLETO */}
            <div>
              <label className="block text-sm mb-1">Día libre completo</label>
              <select
                value={tempHorario.diaYMedio.diaCompleto}
                onChange={(e) => {
                  const dia = e.target.value;
                  const anterior = getDiaAnterior(dia);

                  setTempHorario({
                    ...tempHorario,
                    diaYMedio: {
                      diaCompleto: dia,
                      tipo: "antes",
                      medioDia: anterior,
                      inicioMedio: tempHorario.inicio,
                      finMedio: mitadJornada,
                    },
                  });
                }}
                className="w-full px-3 py-2 bg-neutral-800 border border-gray-700 rounded-md text-white"
              >
                {diasSemana.map((dia) => (
                  <option key={dia} value={dia}>
                    {dia}
                  </option>
                ))}
              </select>
            </div>

            {/* OPCIONES VALIDAS */}
            <div className="flex flex-col gap-3 p-3 bg-neutral-900 rounded-lg">
              <label className="text-sm opacity-80 mb-2">
                Medio día libre
              </label>

              {/* Medio día ANTES */}
              <button
                type="button"
                onClick={() => {
                  const dia = tempHorario.diaYMedio!.diaCompleto;
                  const anterior = getDiaAnterior(dia);

                  setTempHorario({
                    ...tempHorario,
                    diaYMedio: {
                      diaCompleto: dia,
                      tipo: "antes",
                      medioDia: anterior,
                      inicioMedio: tempHorario.inicio,
                      finMedio: mitadJornada,
                    },
                  });
                }}
                className={`
                  w-full px-4 py-3 rounded-lg border 
                  ${
                    tempHorario.diaYMedio.tipo === "antes"
                      ? "bg-green-600 text-white border-green-600"
                      : "bg-neutral-800 text-gray-300 border-gray-600"
                  }
                `}
              >
                {getDiaAnterior(tempHorario.diaYMedio.diaCompleto)} por la
                mañana
              </button>

              {/* Medio día DESPUES */}
              <button
                type="button"
                onClick={() => {
                  const dia = tempHorario.diaYMedio!.diaCompleto;
                  const siguiente = getDiaSiguiente(dia);

                  setTempHorario({
                    ...tempHorario,
                    diaYMedio: {
                      diaCompleto: dia,
                      tipo: "despues",
                      medioDia: siguiente,
                      inicioMedio: mitadJornada,
                      finMedio: tempHorario.fin,
                    },
                  });
                }}
                className={`
                  w-full px-4 py-3 rounded-lg border 
                  ${
                    tempHorario.diaYMedio.tipo === "despues"
                      ? "bg-green-600 text-white border-green-600"
                      : "bg-neutral-800 text-gray-300 border-gray-600"
                  }
                `}
              >
                {getDiaSiguiente(tempHorario.diaYMedio.diaCompleto)} por la
                tarde
              </button>
            </div>
          </div>
        )}
      </div>

      {/* BOTONES */}
      <div className="flex justify-end gap-4 pt-4 border-t border-gray-700">
        <button
          onClick={onClose}
          className="px-5 py-2 rounded-lg bg-gray-700 text-gray-200 hover:bg-gray-600"
        >
          Cancelar
        </button>

        <button
          onClick={() => {
            onGuardar(tempHorario);
            onClose();
          }}
          className="px-6 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700"
        >
          Guardar
        </button>
      </div>
    </ModalBase>
  );
}
