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
      medioDia: string;
      horaEntrada: string;
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

  // ⭐ Estado local
  const [tempHorario, setTempHorario] = useState(horario);

  // ⭐ Estado para guardar los días EXACTOS que vienen de Firebase
  const [diasOriginales, setDiasOriginales] = useState<string[]>([]);

  // ⭐ Se ejecuta al abrir el modal o cambiar de empleado
  useEffect(() => {
    const diasNormalizados = Array.isArray(horario.diasLibres)
      ? horario.diasLibres.map(
          (d) => d.charAt(0).toUpperCase() + d.slice(1).toLowerCase()
        )
      : [];

    setDiasOriginales(diasNormalizados); // ⬅️ Guardamos los días originales

    setTempHorario({
      ...horario,
      diasLibres: diasNormalizados,
    });
  }, [horario, abierto]);

  if (!abierto) return null;

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

        {/* Modo de selección */}
        <div className="flex gap-4 mb-4">
          {/* ⬅️ FIX: restaura diasOriginales cuando volvés a “varios días libres” */}
          <button
            type="button"
            onClick={() =>
              setTempHorario({
                ...tempHorario,
                diaYMedio: null,
                diasLibres: diasOriginales, // ⬅️ restaura días guardados
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
                  diaCompleto: "Viernes",
                  medioDia: "Sábado",
                  horaEntrada: "14:00",
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

        {/* Modo 1: varios días */}
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

        {/* Modo 2: un día y medio */}
        {tempHorario.diaYMedio && (
          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-sm">Día libre completo</label>
              <select
                value={tempHorario.diaYMedio.diaCompleto}
                onChange={(e) =>
                  setTempHorario({
                    ...tempHorario,
                    diaYMedio: {
                      ...tempHorario.diaYMedio!,
                      diaCompleto: e.target.value,
                    },
                  })
                }
                className="w-full px-3 py-2 bg-neutral-800 border border-gray-700 rounded-md text-white"
              >
                {diasSemana.map((dia) => (
                  <option key={dia} value={dia}>
                    {dia}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm">Medio día libre</label>
              <select
                value={tempHorario.diaYMedio.medioDia}
                onChange={(e) =>
                  setTempHorario({
                    ...tempHorario,
                    diaYMedio: {
                      ...tempHorario.diaYMedio!,
                      medioDia: e.target.value,
                    },
                  })
                }
                className="w-full px-3 py-2 bg-neutral-800 border border-gray-700 rounded-md text-white"
              >
                {diasSemana.map((dia) => (
                  <option key={dia} value={dia}>
                    {dia}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm">Hora de entrada</label>
              <input
                type="time"
                value={tempHorario.diaYMedio.horaEntrada}
                onChange={(e) =>
                  setTempHorario({
                    ...tempHorario,
                    diaYMedio: {
                      ...tempHorario.diaYMedio!,
                      horaEntrada: e.target.value,
                    },
                  })
                }
                className="w-full px-3 py-2 bg-neutral-800 border border-gray-700 rounded-md text-white"
              />
            </div>
          </div>
        )}
      </div>

      {/* Botones */}
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
