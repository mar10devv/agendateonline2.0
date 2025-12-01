import React from "react";

type TipoAgenda = "emprendimiento" | "negocio" | null;
type ModoTurnos = "jornada" | "personalizado" | null;

type Props = {
  tipoAgenda: TipoAgenda;
  diasLibres: string[];
  modoTurnos: ModoTurnos;
  clientesPorDia: number | null;
  horaInicio: string;
  horaFin: string;
  onChange: (patch: {
    modoTurnos?: ModoTurnos;
    clientesPorDia?: number | null;
    horaInicio?: string;
    horaFin?: string;
  }) => void;
  onNext: () => void;
  onBack: () => void;
};

function RegistroPaso5Horarios({
  tipoAgenda,
  diasLibres,
  modoTurnos,
  clientesPorDia,
  horaInicio,
  horaFin,
  onChange,
  onNext,
  onBack,
}: Props) {
  const esEmprendimiento = tipoAgenda === "emprendimiento" || !tipoAgenda;

  const handleNextClick = () => {
    if (esEmprendimiento) {
      if (!modoTurnos) {
        alert("⚠️ Elegí si trabajás por jornada o con horarios personalizados.");
        return;
      }

      if (!horaInicio || !horaFin) {
        alert("⚠️ Elegí un horario de inicio y fin.");
        return;
      }

      if (horaFin <= horaInicio) {
        alert("⚠️ La hora de fin debe ser mayor a la de inicio.");
        return;
      }

      if (
        modoTurnos === "personalizado" &&
        (!clientesPorDia || clientesPorDia <= 0)
      ) {
        alert("⚠️ Indicá cuántos turnos querés ofrecer por día.");
        return;
      }
    } else {
      if (!horaInicio || !horaFin) {
        alert("⚠️ Elegí un horario de apertura y cierre.");
        return;
      }
      if (horaFin <= horaInicio) {
        alert("⚠️ La hora de cierre debe ser mayor a la de apertura.");
        return;
      }
    }

    onNext();
  };

  // 🔹 MISMO ESTILO QUE EN REGISTRO-PASO3
  const OpcionCard = ({
    selected,
    title,
    subtitle,
    onClick,
  }: {
    selected: boolean;
    title: string;
    subtitle: string;
    onClick: () => void;
  }) => (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => e.key === "Enter" && onClick()}
      className={`rounded-2xl border px-4 py-3 text-sm cursor-pointer transition shadow-sm
        ${
          selected
            ? "bg-blue-600 border-blue-600 shadow-md"
            : "bg-white border-gray-200 hover:border-blue-500 hover:bg-blue-50"
        }`}
    >
      <div
        className={`font-semibold ${
          selected ? "text-white" : "text-gray-900"
        }`}
      >
        {title}
      </div>
      <div
        className={`mt-1 text-xs ${
          selected ? "text-blue-100" : "text-gray-600"
        }`}
      >
        {subtitle}
      </div>
    </div>
  );

  return (
    <div className="space-y-6 text-gray-900">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-gray-900">
          Configura tus horarios
        </h1>
        <p className="text-sm text-gray-600">
          {esEmprendimiento
            ? "Definí si trabajás por jornada fija o con un número aproximado de clientes por día."
            : "Este será el horario general en el que tu negocio está abierto. Los días cerrados ya los configuraste en el paso anterior."}
        </p>
      </div>

      {esEmprendimiento ? (
        <>
          {/* Pregunta principal */}
          <p className="text-sm font-medium text-gray-800">
            ¿Cómo querés organizar tus horarios?
          </p>

          {/* Tarjetas Jornada / Personalizado */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <OpcionCard
              selected={modoTurnos === "jornada"}
              title="Jornada de 8 horas"
              subtitle="Indicá a qué hora empezás y terminás tu jornada."
              onClick={() => onChange({ modoTurnos: "jornada" })}
            />

            <OpcionCard
              selected={modoTurnos === "personalizado"}
              title="Horarios personalizados"
              subtitle="Definí cuántos turnos ofrecés por día y tu rango horario."
              onClick={() => onChange({ modoTurnos: "personalizado" })}
            />
          </div>

          {/* Jornada: solo reloj */}
          {modoTurnos === "jornada" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-gray-800 mb-1">
                  Hora de inicio
                </label>
                <input
                  type="time"
                  value={horaInicio}
                  onChange={(e) => onChange({ horaInicio: e.target.value })}
                  className="w-full p-2 border rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-800 mb-1">
                  Hora de fin
                </label>
                <input
                  type="time"
                  value={horaFin}
                  onChange={(e) => onChange({ horaFin: e.target.value })}
                  className="w-full p-2 border rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          )}

          {/* Personalizado: select + reloj cuando elija cantidad */}
          {modoTurnos === "personalizado" && (
            <>
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-800 mb-1">
                  ¿Cuántos turnos querés ofrecer por día (aprox.)?
                </label>
                <select
                  value={clientesPorDia ?? ""}
                  onChange={(e) =>
                    onChange({
                      clientesPorDia: e.target.value
                        ? Number(e.target.value)
                        : null,
                    })
                  }
                  className="w-full p-2 border rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Elegí una opción</option>
                  {[1, 2, 3, 4, 5, 6, 8, 10, 12, 15, 20].map((n) => (
                    <option key={n} value={n}>
                      {n} turnos por día
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Usamos este dato para repartir mejor tus turnos a lo largo del
                  día.
                </p>
              </div>

              {clientesPorDia && clientesPorDia > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-800 mb-1">
                      Hora de inicio
                    </label>
                    <input
                      type="time"
                      value={horaInicio}
                      onChange={(e) =>
                        onChange({ horaInicio: e.target.value })
                      }
                      className="w-full p-2 border rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-800 mb-1">
                      Hora de fin
                    </label>
                    <input
                      type="time"
                      value={horaFin}
                      onChange={(e) => onChange({ horaFin: e.target.value })}
                      className="w-full p-2 border rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              )}
            </>
          )}

          <p className="text-xs text-gray-500 mt-3">
            Días libres seleccionados:{" "}
            {diasLibres.length > 0
              ? diasLibres.join(", ")
              : "ninguno (atendés todos los días configurados)"}
          </p>
        </>
      ) : (
        <>
          {/* VISTA NEGOCIO */}
          <p className="text-sm font-medium text-gray-800">
            Definí el horario general de apertura del local.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-gray-800 mb-1">
                Hora de apertura
              </label>
              <input
                type="time"
                value={horaInicio}
                onChange={(e) => onChange({ horaInicio: e.target.value })}
                className="w-full p-2 border rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-800 mb-1">
                Hora de cierre
              </label>
              <input
                type="time"
                value={horaFin}
                onChange={(e) => onChange({ horaFin: e.target.value })}
                className="w-full p-2.border rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <p className="text-xs text-gray-500 mt-3">
            Los días marcados como cerrados en el paso anterior no tendrán
            turnos disponibles.
          </p>
        </>
      )}

      {/* Botones Volver / Continuar */}
      <div className="flex items-center justify-between gap-3 pt-4">
        <button
          type="button"
          onClick={onBack}
          className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm hover:bg-gray-100 transition"
        >
          Volver
        </button>

        <button
          onClick={handleNextClick}
          className="flex-1 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition shadow-sm"
        >
          Continuar
        </button>
      </div>
    </div>
  );
}

export default RegistroPaso5Horarios;
