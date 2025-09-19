import { useState } from "react";
import { db } from "../../lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";

const tiposDeNegocio = ["Barbería", "Casa de Tattoo", "Estilista", "Dentista", "Spa"];
const diasSemana = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

export default function PanelRegistro() {
  const [paso, setPaso] = useState(1);

  // Paso 1
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");
  const [tipoNegocio, setTipoNegocio] = useState("");
  const [touched, setTouched] = useState<{ [key: string]: boolean }>({});

  // Validaciones
  const nombreValido = nombre.trim().length > 2;
  const emailValido = /\S+@\S+\.\S+/.test(email);
  const telefonoValido = /^\d{8,15}$/.test(telefono);
  const tipoValido = tipoNegocio !== "";
  const formularioValido = nombreValido && emailValido && telefonoValido && tipoValido;

  const handleNext = () => {
    if (!formularioValido) {
      alert("⚠️ Completa todos los campos obligatorios correctamente");
      return;
    }
    setPaso(2);
  };

  // Paso 2
  const [mostrarDias, setMostrarDias] = useState(false);
  const [diasLibres, setDiasLibres] = useState<string[]>([]);
  const [modoTurnos, setModoTurnos] = useState<"jornada" | "personalizado">("jornada");
  const [subModoJornada, setSubModoJornada] = useState<"minutos" | "horas" | null>(null);
  const [clientesPorDia, setClientesPorDia] = useState(4);
  const [horasSeparacion, setHorasSeparacion] = useState(1);

  const toggleDia = (dia: string) => {
    setDiasLibres((prev) =>
      prev.includes(dia) ? prev.filter((d) => d !== dia) : [...prev, dia]
    );
  };

  const handleFinalizar = () => {
    setPaso(3);
  };

  // Paso 3 → selección de plan
  const [planSeleccionado, setPlanSeleccionado] = useState<"agenda" | "web" | null>(null);

  // Paso 4 → pago
  const [codigo, setCodigo] = useState("");
  const [codigoValido, setCodigoValido] = useState<boolean | null>(null);

  // ✅ Validación en Firestore
  const verificarCodigo = async () => {
    if (!codigo || codigo.length < 15) {
      alert("⚠️ Ingresa un código válido de 15 cifras");
      return;
    }

    try {
      const codigoRef = doc(db, "Codigos", codigo);
      const codigoSnap = await getDoc(codigoRef);

      if (!codigoSnap.exists()) {
        setCodigoValido(false);
        alert("❌ Código inválido, no existe en el sistema.");
        return;
      }

      const data = codigoSnap.data();

      if (!data.valido) {
        setCodigoValido(false);
        alert("❌ Código ya fue utilizado.");
        return;
      }

      // ✅ Código válido → actualizar Firestore
      await updateDoc(codigoRef, {
        valido: false,
        usadoPor: nombre || "desconocido",
      });

      setCodigoValido(true);
      alert("✅ Código válido. Servicio activado.");
    } catch (error) {
      console.error("Error verificando el código:", error);
      alert("⚠️ Ocurrió un error verificando el código.");
    }
  };

  const renderIcon = (campo: string, valido: boolean) => {
    if (!touched[campo]) return null;
    return valido ? (
      <span className="text-green-600 font-bold">✔</span>
    ) : (
      <span className="text-red-600 font-bold">✖</span>
    );
  };

  return (
    <div className="w-full max-w-2xl bg-white p-6 rounded-lg shadow-lg">
      {/* Paso 1 */}
      {paso === 1 && (
        <>
          <h2 className="text-2xl font-bold mb-4 text-gray-800">Registro de Negocio</h2>

          {/* Nombre */}
          <div className="relative mb-3">
            <input
              type="text"
              placeholder="Nombre del negocio (slug)"
              value={nombre}
              onChange={(e) => setNombre(e.target.value.replace(/\s+/g, ""))}
              onBlur={() => setTouched((prev) => ({ ...prev, nombre: true }))}
              className="w-full p-2 border rounded pr-8"
              required
            />
            <div className="absolute top-2 right-2">{renderIcon("nombre", nombreValido)}</div>
          </div>

          {/* Email */}
          <div className="relative mb-3">
            <input
              type="email"
              placeholder="Correo electrónico"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => setTouched((prev) => ({ ...prev, email: true }))}
              className="w-full p-2 border rounded pr-8"
              required
            />
            <div className="absolute top-2 right-2">{renderIcon("email", emailValido)}</div>
          </div>

          {/* Teléfono */}
          <div className="relative mb-3">
            <input
              type="tel"
              placeholder="Número de teléfono"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              onBlur={() => setTouched((prev) => ({ ...prev, telefono: true }))}
              className="w-full p-2 border rounded pr-8"
              required
            />
            <div className="absolute top-2 right-2">{renderIcon("telefono", telefonoValido)}</div>
          </div>

          {/* Tipo de negocio */}
          <div className="relative mb-4">
            <select
              value={tipoNegocio}
              onChange={(e) => setTipoNegocio(e.target.value)}
              onBlur={() => setTouched((prev) => ({ ...prev, tipo: true }))}
              className="w-full p-2 border rounded pr-8"
              required
            >
              <option value="">Selecciona tipo de negocio</option>
              {tiposDeNegocio.map((tipo) => (
                <option key={tipo} value={tipo}>
                  {tipo}
                </option>
              ))}
            </select>
            <div className="absolute top-2 right-2">{renderIcon("tipo", tipoValido)}</div>
          </div>

          <button
            onClick={handleNext}
            disabled={!formularioValido}
            className={`w-full p-2 rounded text-white ${
              formularioValido
                ? "bg-blue-600 hover:bg-blue-700"
                : "bg-gray-400 cursor-not-allowed"
            }`}
          >
            Siguiente
          </button>
        </>
      )}

      {/* Paso 2 */}
      {paso === 2 && (
        <>
          <h2 className="text-2xl font-bold mb-4 text-gray-800">Configura tu agenda</h2>

          {/* Selección de días libres */}
          <div className="mb-6">
            <h3 className="block font-medium mb-2">Elegir días libres</h3>
            <button
              onClick={() => setMostrarDias(!mostrarDias)}
              className="w-full py-2 mb-2 rounded text-white bg-indigo-600 hover:bg-indigo-700"
            >
              {mostrarDias ? "Ocultar días" : "Ver días"}
            </button>

            {mostrarDias && (
              <div className="grid grid-cols-2 gap-2">
                {diasSemana.map((dia) => (
                  <button
                    key={dia}
                    type="button"
                    onClick={() => toggleDia(dia)}
                    className={`p-2 rounded border ${
                      diasLibres.includes(dia)
                        ? "bg-green-600 text-white"
                        : "bg-gray-200 text-gray-800"
                    }`}
                  >
                    {dia}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Modo de turnos */}
          <div className="mb-6">
            <label className="block font-medium mb-2">¿Cómo quieres manejar tus turnos?</label>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setModoTurnos("jornada");
                  setSubModoJornada(null);
                }}
                className={`flex-1 py-2 rounded ${
                  modoTurnos === "jornada" ? "bg-blue-600 text-white" : "bg-gray-200"
                }`}
              >
                Jornada 8h
              </button>
              <button
                onClick={() => setModoTurnos("personalizado")}
                className={`flex-1 py-2 rounded ${
                  modoTurnos === "personalizado" ? "bg-blue-600 text-white" : "bg-gray-200"
                }`}
              >
                Personalizado
              </button>
            </div>
          </div>

          {/* Configuración Jornada */}
          {modoTurnos === "jornada" && (
            <div className="mb-6">
              <label className="block font-medium mb-2">
                ¿Cuánto tiempo demora en atender un cliente?
              </label>
              <div className="flex gap-2 mb-3">
                <button
                  onClick={() => setSubModoJornada("minutos")}
                  className={`flex-1 py-2 rounded ${
                    subModoJornada === "minutos" ? "bg-indigo-600 text-white" : "bg-gray-200"
                  }`}
                >
                  Minutos
                </button>
                <button
                  onClick={() => setSubModoJornada("horas")}
                  className={`flex-1 py-2 rounded ${
                    subModoJornada === "horas" ? "bg-indigo-600 text-white" : "bg-gray-200"
                  }`}
                >
                  Horas
                </button>
              </div>

              {/* Si selecciona minutos */}
              {subModoJornada === "minutos" && (
                <div className="grid grid-cols-2 gap-2">
                  {[20, 30, 40, 50].map((m) => (
                    <button
                      key={m}
                      onClick={() => setHorasSeparacion(m / 60)}
                      className={`p-2 rounded ${
                        horasSeparacion === m / 60 ? "bg-green-600 text-white" : "bg-gray-200"
                      }`}
                    >
                      {m} min
                    </button>
                  ))}
                </div>
              )}

              {/* Si selecciona horas */}
              {subModoJornada === "horas" && (
                <div className="flex gap-2">
                  <input
                    type="number"
                    min={1}
                    max={8}
                    value={horasSeparacion}
                    onChange={(e) => setHorasSeparacion(parseInt(e.target.value))}
                    className="w-full p-2 border rounded"
                  />
                  <span className="self-center">horas</span>
                </div>
              )}
            </div>
          )}

          {/* Configuración Personalizado */}
          {modoTurnos === "personalizado" && (
            <div className="mb-6">
              <label className="block font-medium mb-2">Clientes por día</label>
              <input
                type="number"
                min={4}
                max={10}
                value={clientesPorDia}
                onChange={(e) => setClientesPorDia(parseInt(e.target.value))}
                className="w-full p-2 border rounded"
              />
            </div>
          )}

          <button
            onClick={handleFinalizar}
            className="w-full bg-indigo-600 text-white p-2 rounded hover:bg-indigo-700"
          >
            Continuar a precios
          </button>
        </>
      )}

      {/* Paso 3 */}
      {paso === 3 && (
        <>
          <h2 className="text-2xl font-bold mb-6 text-gray-800">Elige tu plan</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Plan Agenda */}
            <div className="border rounded-lg p-6 shadow hover:shadow-lg transition">
              <h3 className="text-xl font-bold mb-2">Agenda</h3>
              <p className="text-2xl font-extrabold text-blue-600 mb-4">$15 USD / mes</p>
              <ul className="list-disc list-inside text-gray-700 space-y-1">
                <li>Hasta 3 empleados configurables</li>
                <li>Cancelar turnos</li>
                <li>Agregar servicios</li>
                <li>Personalizar agenda</li>
                <li>Ver turnos ocupados y disponibles</li>
                <li>Ver qué usuario se agendó y qué servicio tomó</li>
              </ul>
              <button
                onClick={() => {
                  setPlanSeleccionado("agenda");
                  setPaso(4);
                }}
                className="mt-4 w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
              >
                Seleccionar Agenda
              </button>
            </div>

            {/* Plan Agenda + Web */}
            <div className="border rounded-lg p-6 shadow hover:shadow-lg transition">
              <h3 className="text-xl font-bold mb-2">Agenda + Web personalizada</h3>
              <p className="text-2xl font-extrabold text-indigo-600 mb-4">$50 USD / mes</p>
              <ul className="list-disc list-inside text-gray-700 space-y-1">
                <li>Página web acorde al negocio</li>
                <li>Incluye agenda completa y personalizable</li>
                <li>Ubicación en Google Maps</li>
                <li>Indexada en buscadores</li>
                <li>Mostrar trabajos de cada empleado</li>
                <li>Panel de personalización: logo, texto, imágenes</li>
                <li>Mensajes directos a clientes</li>
                <li>Estadísticas mes a mes</li>
                <li>Clientes y turnos más frecuentes</li>
                <li>Servicios más consumidos</li>
              </ul>
              <button
                onClick={() => {
                  setPlanSeleccionado("web");
                  setPaso(4);
                }}
                className="mt-4 w-full bg-indigo-600 text-white py-2 rounded hover:bg-indigo-700"
              >
                Seleccionar Agenda + Web
              </button>
            </div>
          </div>
        </>
      )}

      {/* Paso 4 */}
      {paso === 4 && (
        <>
          <h2 className="text-2xl font-bold mb-6 text-gray-800">Método de pago</h2>

          <div className="mb-4 p-3 bg-gray-100 rounded">
            <p className="text-gray-800">
              Estás contratando:{" "}
              <strong>
                {planSeleccionado === "agenda"
                  ? "Agenda ($15 USD / mes)"
                  : "Agenda + Web personalizada ($50 USD / mes)"}
              </strong>
            </p>
          </div>

          <div className="space-y-6">
            {/* Opción Transferencia */}
            <div className="border rounded-lg p-6 shadow">
              <h3 className="text-xl font-bold mb-2 text-blue-600">Transferencia bancaria</h3>
              <p className="text-gray-700 mb-2">
                Puedes realizar la transferencia a la siguiente cuenta:
              </p>
              <ul className="list-disc list-inside text-gray-700 mb-4">
                <li><strong>Banco:</strong> Prex</li>
                <li><strong>Número de cuenta:</strong> 123456789</li>
                <li><strong>Titular:</strong> Martin Martinez</li>
              </ul>
              <button
                onClick={() => alert("✅ Recibiremos tu comprobante de transferencia.")}
                className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
              >
                Confirmar transferencia
              </button>
            </div>

            {/* Opción Código */}
            <div className="border rounded-lg p-6 shadow">
              <h3 className="text-xl font-bold mb-2 text-indigo-600">Pagar vía código</h3>
              <p className="text-gray-700 mb-4">
                Ingresa tu código de 15 cifras para activar el servicio:
              </p>
              <input
                type="text"
                maxLength={15}
                value={codigo}
                onChange={(e) => setCodigo(e.target.value)}
                className="w-full p-2 border rounded mb-3"
                placeholder="Ej: 123456789012345"
              />
              <button
                onClick={verificarCodigo}
                className="w-full bg-indigo-600 text-white py-2 rounded hover:bg-indigo-700"
              >
                Validar código
              </button>

              {codigoValido === true && (
                <p className="mt-2 text-green-600 font-semibold">
                  ✅ Código válido, servicio activado.
                </p>
              )}
              {codigoValido === false && (
                <p className="mt-2 text-red-600 font-semibold">
                  ❌ Código inválido, por favor verifica.
                </p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
