// src/components/agendaVirtual/ui/modalHorariosEmpleados.tsx

import { useState, useEffect } from "react";
import ModalBase from "../../ui/modalGenerico";

type Props = {
  abierto: boolean;
  onClose: () => void;
  horario: {
    inicio: string;
    fin: string;
    diasLibres: string[];
    diaYMedio?: {
      diaCompleto: string;
      tipo: "antes" | "despues";
      medioDia: string;
      inicioMedio: string;
      finMedio: string;
    } | null;
  };
  onGuardar: (nuevoHorario: any) => void;
};

export default function ModalHorariosEmpleados({
  abierto,
  onClose,
  horario,
  onGuardar,
}: Props) {
  
  const diasSemana = [
    "Lunes",
    "Martes",
    "Miércoles",
    "Jueves",
    "Viernes",
    "Sábado",
    "Domingo",
  ];

  // función para obtener dia anterior/siguiente
  const getDiaAnterior = (dia: string) => {
    const idx = diasSemana.indexOf(dia);
    return diasSemana[(idx - 1 + 7) % 7];
  };

  const getDiaSiguiente = (dia: string) => {
    const idx = diasSemana.indexOf(dia);
    return diasSemana[(idx + 1) % 7];
  };

  // mitad de la jornada
  const calcularMitad = (inicio: string, fin: string) => {
    const [hi, mi] = inicio.split(":").map(Number);
    const [hf, mf] = fin.split(":").map(Number);

    const inicioMin = hi * 60 + mi;
    const finMin = hf * 60 + mf;
    const mitad = Math.floor((inicioMin + finMin) / 2);

    const hh = String(Math.floor(mitad / 60)).padStart(2, "0");
    const mm = String(mitad % 60).padStart(2, "0");

    return `${hh}:${mm}`;
  };

  const [tempHorario, setTempHorario] = useState(horario);
  const [diasOriginales, setDiasOriginales] = useState<string[]>([]);

  useEffect(() => {
    const diasNormalizados = Array.isArray(horario.diasLibres)
      ? horario.diasLibres.map(
          (d) => d.charAt(0).toUpperCase() + d.slice(1).toLowerCase()
        )
      : [];

    setDiasOriginales(diasNormalizados);

    setTempHorario({
      ...horario,
      diasLibres: diasNormalizados,
    });
  }, [horario, abierto]);

  if (!abierto) return null;

  // mitad jornada calculada
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
                  const siguiente = getDiaSiguiente(dia);

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
                {getDiaAnterior(tempHorario.diaYMedio.diaCompleto)} por la mañana
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
                {getDiaSiguiente(tempHorario.diaYMedio.diaCompleto)} por la tarde
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
