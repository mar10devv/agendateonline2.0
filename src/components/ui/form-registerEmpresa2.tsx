import React, { useState } from "react";

type ValoresConfigAgenda = {
  diasLibres: string[];
  modoTurnos?: string;
  unidadTiempo?: string;
  duracion?: string;
  clientesPorDia?: number;
};

type Props = {
  onSubmit: (valores: ValoresConfigAgenda) => void;
};

const FormConfigAgenda: React.FC<Props> = ({ onSubmit }) => {
  const [diasVisibles, setDiasVisibles] = useState(false);
  const [valores, setValores] = useState<ValoresConfigAgenda>({
    diasLibres: [],
    modoTurnos: "",
    unidadTiempo: "",
    duracion: "",
    clientesPorDia: undefined,
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

  const handleChange = (name: string, value: string | number) => {
    setValores((prev) => ({ ...prev, [name]: value, duracion: "" }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(valores);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 w-full bg-white p-6 rounded-xl shadow-lg"
    >
      {/* Título con bolita */}
      <h2 className="text-2xl font-bold text-blue-600 flex items-center gap-2">
        Configura tu agenda
        <span className="animate-pulse w-3 h-3 bg-blue-600 rounded-full"></span>
      </h2>

      {/* Días libres */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-gray-700">
          Elegir días libres
        </label>
        <button
          type="button"
          onClick={() => setDiasVisibles((prev) => !prev)}
          className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white py-2 rounded-lg"
        >
          Ver días
        </button>

        {/* Contenedor animado */}
        <div
          className={`transition-all duration-300 overflow-hidden ${
            diasVisibles ? "max-h-40 mt-2" : "max-h-0"
          }`}
        >
          <div className="flex flex-wrap gap-2">
            {[
              "Lunes",
              "Martes",
              "Miércoles",
              "Jueves",
              "Viernes",
              "Sábado",
              "Domingo",
            ].map((dia) => (
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
            ))}
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
            onClick={() => handleChange("modoTurnos", "jornada")}
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
            onClick={() => handleChange("modoTurnos", "personalizado")}
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

      {/* Si eligió Jornada → mostramos opciones de tiempo */}
      <div
        className={`transition-all duration-300 overflow-hidden ${
          valores.modoTurnos === "jornada" ? "max-h-96" : "max-h-0"
        }`}
      >
        {valores.modoTurnos === "jornada" && (
          <div className="flex flex-col gap-2 mt-2">
            <label className="text-sm font-medium text-gray-700">
              ¿Cuánto tiempo demora en atender un cliente?
            </label>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleChange("unidadTiempo", "minutos")}
                className={`flex-1 px-3 py-2 rounded-lg border ${
                  valores.unidadTiempo === "minutos"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700"
                }`}
              >
                Minutos
              </button>
              <button
                type="button"
                onClick={() => handleChange("unidadTiempo", "horas")}
                className={`flex-1 px-3 py-2 rounded-lg border ${
                  valores.unidadTiempo === "horas"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700"
                }`}
              >
                Horas
              </button>
            </div>

            {/* Opciones según la unidad */}
            <div
              className={`transition-all duration-300 overflow-hidden ${
                valores.unidadTiempo === "minutos" ? "max-h-40 mt-2" : "max-h-0"
              }`}
            >
              <div className="flex flex-wrap gap-2">
                {["30", "40", "50"].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => handleChange("duracion", m + "m")}
                    className={`px-3 py-1 rounded-lg border ${
                      valores.duracion === m + "m"
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {m} min
                  </button>
                ))}
              </div>
            </div>

            <div
              className={`transition-all duration-300 overflow-hidden ${
                valores.unidadTiempo === "horas" ? "max-h-40 mt-2" : "max-h-0"
              }`}
            >
              <div className="flex flex-wrap gap-2">
                {["1h", "1:30h", "2h", "2:30h", "3h", "3:30h", "4h"].map((h) => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => handleChange("duracion", h)}
                    className={`px-3 py-1 rounded-lg border ${
                      valores.duracion === h
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {h}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Si eligió Personalizado → input de clientes */}
      <div
        className={`transition-all duration-300 overflow-hidden ${
          valores.modoTurnos === "personalizado" ? "max-h-40 mt-2" : "max-h-0"
        }`}
      >
        {valores.modoTurnos === "personalizado" && (
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-gray-700">
              ¿Cuántos clientes vas a atender en una jornada?
            </label>
            <input
              type="number"
              min={1}
              placeholder="Ej: 10"
              value={valores.clientesPorDia || ""}
              onChange={(e) =>
                handleChange("clientesPorDia", Number(e.target.value))
              }
              className="border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}
      </div>

      {/* Botón continuar */}
      <button
        type="submit"
        className="w-full bg-gradient-to-r from-blue-500 to-indigo-500 text-white py-2 px-4 rounded-lg hover:opacity-90 transition"
      >
        Continuar a precios
      </button>
    </form>
  );
};

export default FormConfigAgenda;
