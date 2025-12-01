// src/components/ui/form-registerEmpresa2.tsx
import { useState, useEffect } from "react";

type TipoNegocio = "emprendimiento" | "negocio";

type Props = {
  onSubmit: (valores: {
    tipoNegocio: TipoNegocio;

    // Emprendimiento (1 usuario)
    diasLibres?: string[];
    modoTurnos?: "jornada" | "personalizado";

    // Negocio (más de 1 usuario)
    diasCerradoLocal?: string[];
    horarioApertura?: string;
    horarioCierre?: string;

    // Compatibilidad con lógica vieja
    clientesPorDia?: number | null;
  }) => void;
  onBack: () => void;

  // Iniciales opcionales (para volver atrás en el wizard)
  initialTipoNegocio?: TipoNegocio;

  initialDiasLibres?: string[];
  initialModoTurnos?: "jornada" | "personalizado";

  initialDiasCerradoLocal?: string[];
  initialHorarioApertura?: string;
  initialHorarioCierre?: string;

  // 🔹 SOLO para compatibilidad con el padre (aunque aquí no lo usemos)
  initialClientesPorDia?: number | null;
};

const DIAS_SEMANA = [
  { id: "lunes", label: "Lunes" },
  { id: "martes", label: "Martes" },
  { id: "miercoles", label: "Miércoles" },
  { id: "jueves", label: "Jueves" },
  { id: "viernes", label: "Viernes" },
  { id: "sabado", label: "Sábado" },
  { id: "domingo", label: "Domingo" },
];

export default function FormRegisterEmpresa2({
  onSubmit,
  onBack,
  initialTipoNegocio,
  initialDiasLibres,
  initialModoTurnos,
  initialDiasCerradoLocal,
  initialHorarioApertura,
  initialHorarioCierre,
  initialClientesPorDia, // no se usa, solo compatibilidad
}: Props) {
  // 🔹 Tipo: 1 persona vs varios
  const [tipoNegocio, setTipoNegocio] = useState<TipoNegocio>(
    initialTipoNegocio ?? "emprendimiento"
  );

  // 🔹 Emprendimiento (1 usuario)
  const [diasLibres, setDiasLibres] = useState<string[]>(
    initialDiasLibres ?? []
  );
  const [modoTurnos, setModoTurnos] = useState<"jornada" | "personalizado">(
    initialModoTurnos ?? "jornada"
  );

  // 🔹 Negocio (más de 1 usuario)
  const [diasCerradoLocal, setDiasCerradoLocal] = useState<string[]>(
    initialDiasCerradoLocal ?? []
  );
  const [horarioApertura, setHorarioApertura] = useState<string>(
    initialHorarioApertura ?? "09:00"
  );
  const [horarioCierre, setHorarioCierre] = useState<string>(
    initialHorarioCierre ?? "19:00"
  );

  // 🔁 Sincronizar con valores del padre cuando cambian
  useEffect(() => {
    if (initialTipoNegocio) setTipoNegocio(initialTipoNegocio);

    setDiasLibres(initialDiasLibres ?? []);
    setModoTurnos(initialModoTurnos ?? "jornada");

    setDiasCerradoLocal(initialDiasCerradoLocal ?? []);
    setHorarioApertura(initialHorarioApertura ?? "09:00");
    setHorarioCierre(initialHorarioCierre ?? "19:00");
  }, [
    initialTipoNegocio,
    initialDiasLibres,
    initialModoTurnos,
    initialDiasCerradoLocal,
    initialHorarioApertura,
    initialHorarioCierre,
    initialClientesPorDia,
  ]);

  const toggleDiaEmprendimiento = (id: string) => {
    setDiasLibres((prev) =>
      prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]
    );
  };

  const toggleDiaCerradoLocal = (id: string) => {
    setDiasCerradoLocal((prev) =>
      prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]
    );
  };

  const validarNegocio = () => {
    if (!horarioApertura || !horarioCierre) return false;
    return horarioApertura < horarioCierre; // "HH:MM"
  };

  const handleContinuar = () => {
    if (tipoNegocio === "negocio") {
      if (!validarNegocio()) {
        alert("⚠️ La hora de apertura debe ser anterior a la hora de cierre.");
        return;
      }

      onSubmit({
        tipoNegocio,
        diasCerradoLocal,
        horarioApertura,
        horarioCierre,
        clientesPorDia: null,
      });
      return;
    }

    // Emprendimiento (1 usuario)
    onSubmit({
      tipoNegocio,
      diasLibres,
      modoTurnos,
      clientesPorDia: null,
    });
  };

  const puedeContinuar =
    tipoNegocio === "negocio" ? validarNegocio() : true;

  const esEmprendimiento = tipoNegocio === "emprendimiento";
  const esNegocio = tipoNegocio === "negocio";

  return (
    <div className="space-y-6">
      {/* Encabezado del paso */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900">
          Configura tu agenda
        </h2>
        <p className="text-sm text-gray-500">
          Definí cómo funciona tu emprendimiento o negocio en el día a día.
        </p>
      </div>

      {/* Tipo de proyecto: Emprendimiento vs Negocio */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-gray-700">
          ¿Qué vas a registrar?
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Emprendimiento */}
          <button
            type="button"
            onClick={() => setTipoNegocio("emprendimiento")}
            className={`p-3 rounded-lg border text-sm text-left transition ${
              esEmprendimiento
                ? "bg-blue-600 border-blue-600"
                : "bg-white border-blue-200 hover:bg-blue-50"
            }`}
          >
            <p
              className={`font-semibold ${
                esEmprendimiento ? "text-white" : "text-blue-900"
              }`}
            >
              Emprendimiento (1 persona)
            </p>
            <p
              className={`text-xs mt-1 ${
                esEmprendimiento ? "text-blue-100" : "text-blue-700"
              }`}
            >
              Sos vos solo atendiendo clientes.
            </p>
          </button>

          {/* Negocio */}
          <button
            type="button"
            onClick={() => setTipoNegocio("negocio")}
            className={`p-3 rounded-lg border text-sm text-left transition ${
              esNegocio
                ? "bg-blue-600 border-blue-600"
                : "bg-white border-blue-200 hover:bg-blue-50"
            }`}
          >
            <p
              className={`font-semibold ${
                esNegocio ? "text-white" : "text-blue-900"
              }`}
            >
              Negocio (más de 1 persona)
            </p>
            <p
              className={`text-xs mt-1 ${
                esNegocio ? "text-blue-100" : "text-blue-700"
              }`}
            >
              Local con varios empleados o colaboradores.
            </p>
          </button>
        </div>
      </div>

      {/* EMPRENDIMIENTO */}
      {tipoNegocio === "emprendimiento" && (
        <div className="space-y-6">
          {/* Días libres */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700">
              ¿Días libres?
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {DIAS_SEMANA.map((dia) => (
                <button
                  key={dia.id}
                  type="button"
                  onClick={() => toggleDiaEmprendimiento(dia.id)}
                  className={`py-2 rounded-lg border text-sm font-medium transition ${
                    diasLibres.includes(dia.id)
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  {dia.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-500">
              Estos días no vas a aparecer disponible para tomar turnos.
            </p>
          </div>

          {/* Forma de trabajar */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700">
              ¿Cómo preferís manejar tus turnos?
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setModoTurnos("jornada")}
                className={`py-2 rounded-lg text-sm font-semibold transition ${
                  modoTurnos === "jornada"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700"
                }`}
              >
                Jornada 8h
              </button>
              <button
                type="button"
                onClick={() => setModoTurnos("personalizado")}
                className={`py-2 rounded-lg text-sm font-semibold transition ${
                  modoTurnos === "personalizado"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700"
                }`}
              >
                Personalizado
              </button>
            </div>
            <p className="text-xs text-gray-500">
              El detalle de los turnos lo vamos a terminar en el modal de
              configuración avanzada.
            </p>
          </div>
        </div>
      )}

      {/* NEGOCIO */}
      {tipoNegocio === "negocio" && (
        <div className="space-y-6">
          {/* Días cerrado */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700">
              ¿Qué días suele estar cerrado el local?
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {DIAS_SEMANA.map((dia) => (
                <button
                  key={dia.id}
                  type="button"
                  onClick={() => toggleDiaCerradoLocal(dia.id)}
                  className={`py-2 rounded-lg border text-sm font-medium transition ${
                    diasCerradoLocal.includes(dia.id)
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  {dia.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-500">
              Podés dejar todos en blanco si el local abre todos los días.
            </p>
          </div>

          {/* Horario del negocio */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700">
              ¿En qué horario suele estar abierto el negocio?
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs mb-1 text-gray-600">
                  Hora de apertura
                </label>
                <input
                  type="time"
                  value={horarioApertura}
                  onChange={(e) => setHorarioApertura(e.target.value)}
                  className="w-full p-2 border rounded text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs mb-1 text-gray-600">
                  Hora de cierre
                </label>
                <input
                  type="time"
                  value={horarioCierre}
                  onChange={(e) => setHorarioCierre(e.target.value)}
                  className="w-full p-2 border rounded text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <p className="text-xs text-gray-500">
              Más adelante, en la configuración final, vamos a definir turnos y
              horarios específicos por empleado.
            </p>
          </div>
        </div>
      )}

      {/* Botones */}
      <div className="flex gap-3 pt-4">
        <button
          type="button"
          onClick={onBack}
          className="w-1/3 py-2 rounded border border-gray-300 text-gray-700 hover:bg-gray-100 transition"
        >
          Volver
        </button>

        <button
          type="button"
          onClick={handleContinuar}
          disabled={!puedeContinuar}
          className={`flex-1 py-2 rounded text-white font-semibold transition ${
            puedeContinuar
              ? "bg-blue-600 hover:bg-blue-700"
              : "bg-gray-400 cursor-not-allowed"
          }`}
        >
          Continuar a precios
        </button>
      </div>
    </div>
  );
}
