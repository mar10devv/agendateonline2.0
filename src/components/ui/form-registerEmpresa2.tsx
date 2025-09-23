import React, { useState } from "react";

type ValoresConfigAgenda = {
  diasLibres: string[];
  modoTurnos?: "jornada" | "personalizado";
  subModoJornada?: "minutos" | "horas" | null;
  horasSeparacion?: number | null; // siempre en minutos
  clientesPorDia?: number | null;
};

type Props = {
  onSubmit: (valores: ValoresConfigAgenda) => void;
};

const FormConfigAgenda: React.FC<Props> = ({ onSubmit }) => {
  const [diasVisibles, setDiasVisibles] = useState(false);
  const [valores, setValores] = useState<ValoresConfigAgenda>({
    diasLibres: [],
    modoTurnos: undefined,
    subModoJornada: null,
    horasSeparacion: null,
    clientesPorDia: null,
  });

  const toggleDia = (dia: string) => {
    setValores((prev) => {
      const yaSeleccionado = prev.diasLibres.includes(dia);
      return {
        ...prev,
        diasLibres: yaSeleccionado
          ? prev.diasLibres.filter((d) => d !== dia)
          : [...prev.diasLibres, dia],
      };
    });
  };

  const handleChange = (name: keyof ValoresConfigAgenda, value: any) => {
    setValores((prev) => ({ ...prev, [name]: value }));
  };

  // ✅ Validaciones
  const diasValidos = valores.diasLibres.length > 0;
  const modoValido = !!valores.modoTurnos;
  const jornadaValida =
    valores.modoTurnos === "jornada" &&
    !!valores.subModoJornada &&
    (valores.horasSeparacion ?? 0) > 0;
  const personalizadoValido =
    valores.modoTurnos === "personalizado" &&
    (valores.clientesPorDia ?? 0) > 0;

  const formularioValido =
    diasValidos && modoValido && (jornadaValida || personalizadoValido);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formularioValido) {
      alert("⚠️ Completa todos los campos para continuar.");
      return;
    }

    let finalValues = { ...valores };
    if (valores.modoTurnos === "jornada") {
      finalValues.clientesPorDia = null;
    }
    if (valores.modoTurnos === "personalizado") {
      finalValues.horasSeparacion = null;
      finalValues.subModoJornada = null;
    }

    onSubmit(finalValues);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 w-full bg-white p-6 rounded-xl shadow-lg"
    >
      {/* Título */}
      <h2 className="text-2xl font-bold text-blue-600 flex items-center gap-2">
        Configura tu agenda
        <span className="animate-pulse w-3 h-3 bg-blue-600 rounded-full"></span>
      </h2>

      {/* Días libres */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-gray-700">Elegir días libres</label>
        <button
          type="button"
          onClick={() => setDiasVisibles((prev) => !prev)}
          className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white py-2 rounded-lg"
        >
          Ver días
        </button>

        <div
          className={`transition-all duration-300 overflow-hidden ${
            diasVisibles ? "max-h-40 mt-2" : "max-h-0"
          }`}
        >
          <div className="flex flex-wrap gap-2">
            {["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"].map(
              (dia) => (
                <button
                  key={dia}
                  type="button"
                  onClick={() => toggleDia(dia)}
                  className={`px-3 py-1 rounded-lg border ${
                    valores.diasLibres.includes(dia)
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-700"
                  }`}
                >
                  {dia}
                </button>
              )
            )}
          </div>
        </div>
      </div>

      {/* Modo de turnos */}
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700">
          ¿Cómo quieres manejar tus turnos?
        </label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() =>
              setValores((prev) => ({
                ...prev,
                modoTurnos: "jornada",
                subModoJornada: null,
                horasSeparacion: null,
                clientesPorDia: null,
              }))
            }
            className={`flex-1 px-3 py-2 rounded-lg border ${
              valores.modoTurnos === "jornada"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-700"
            }`}
          >
            Jornada 8h
          </button>
          <button
            type="button"
            onClick={() =>
              setValores((prev) => ({
                ...prev,
                modoTurnos: "personalizado",
                subModoJornada: null,
                horasSeparacion: null,
                clientesPorDia: null,
              }))
            }
            className={`flex-1 px-3 py-2 rounded-lg border ${
              valores.modoTurnos === "personalizado"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-700"
            }`}
          >
            Personalizado
          </button>
        </div>
      </div>

      {/* Si eligió Jornada */}
      {valores.modoTurnos === "jornada" && (
        <div className="flex flex-col gap-2 mt-2">
          <label className="text-sm font-medium text-gray-700">
            ¿Cuánto tiempo demora en atender un cliente?
          </label>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => handleChange("subModoJornada", "minutos")}
              className={`flex-1 px-3 py-2 rounded-lg border ${
                valores.subModoJornada === "minutos"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700"
              }`}
            >
              Minutos
            </button>
            <button
              type="button"
              onClick={() => handleChange("subModoJornada", "horas")}
              className={`flex-1 px-3 py-2 rounded-lg border ${
                valores.subModoJornada === "horas"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700"
              }`}
            >
              Horas
            </button>
          </div>

          {/* Predefinidos en minutos */}
          {valores.subModoJornada === "minutos" && (
            <div className="flex flex-wrap gap-2 mt-2">
              {[20, 30, 40, 50].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => handleChange("horasSeparacion", m)}
                  className={`px-3 py-1 rounded-lg border ${
                    valores.horasSeparacion === m
                      ? "bg-green-600 text-white"
                      : "bg-gray-100 text-gray-700"
                  }`}
                >
                  {m} min
                </button>
              ))}
            </div>
          )}

          {/* Predefinidos en horas */}
          {valores.subModoJornada === "horas" && (
            <div className="flex flex-wrap gap-2 mt-2">
              {[
                { label: "1h", value: 60 },
                { label: "1:30h", value: 90 },
                { label: "2h", value: 120 },
                { label: "2:30h", value: 150 },
                { label: "3h", value: 180 },
                { label: "3:30h", value: 210 },
                { label: "4h", value: 240 },
              ].map((h) => (
                <button
                  key={h.value}
                  type="button"
                  onClick={() => handleChange("horasSeparacion", h.value)}
                  className={`px-3 py-1 rounded-lg border ${
                    valores.horasSeparacion === h.value
                      ? "bg-green-600 text-white"
                      : "bg-gray-100 text-gray-700"
                  }`}
                >
                  {h.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Si eligió Personalizado */}
      {valores.modoTurnos === "personalizado" && (
        <div className="flex flex-col gap-2 mt-2">
          <label className="text-sm font-medium text-gray-700">
            ¿Cuántos clientes vas a atender en una jornada?
          </label>
          <input
            type="number"
            min={1}
            placeholder="Ej: 10"
            value={valores.clientesPorDia ?? ""}
            onChange={(e) => handleChange("clientesPorDia", Number(e.target.value))}
            className="border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      )}

      {/* Botón continuar */}
      <button
        type="submit"
        disabled={!formularioValido}
        className={`w-full py-2 px-4 rounded-lg text-white transition ${
          formularioValido
            ? "bg-blue-600 hover:bg-blue-700"
            : "bg-gray-400 cursor-not-allowed"
        }`}
      >
        Continuar a precios
      </button>
    </form>
  );
};

export default FormConfigAgenda;
