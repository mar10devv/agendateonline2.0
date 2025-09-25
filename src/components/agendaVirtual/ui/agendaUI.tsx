// src/components/agendaVirtual/ui/agendaVirtual.tsx
import { useState } from "react";
import ConfigIcon from "../../../assets/config-svg.svg?url";
import { subirLogoNegocio, agregarServicio } from "../backend/agenda-backend"; 
import CalendarioUI from "../ui/calendarioUI";

type Turno = {
  id: string;
  cliente: string;
  email: string;
  servicio: string;
  fecha: string;
  hora: string;
  estado: "pendiente" | "confirmado" | "cancelado";
  barbero: string;
};

type Empleado = {
  nombre: string;
  foto?: string;
  especialidad?: string;
};

type Servicio = {
  id?: string;       // 👈 agregado para Firebase
  servicio: string;  // 👈 antes era nombre
  precio: number;
  duracion: number;
};

type Negocio = {
  nombre: string;
  direccion?: string;
  slug: string;
  perfilLogo?: string;
  bannerUrl?: string;
  servicios?: Servicio[];
};

type Props = {
  empleados: Empleado[];
  turnos: Turno[];
  negocio: Negocio;
  modo: "dueño" | "cliente";
  plan: "gratis" | "lite" | "gold";
  usuario?: {
    nombre?: string;
    fotoPerfil?: string;
  };
};

export default function AgendaVirtualUI({
  empleados,
  turnos,
  negocio,
  modo,
  plan,
  usuario,
}: Props) {
  const [empleadoSeleccionado, setEmpleadoSeleccionado] =
    useState<Empleado | null>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [logo, setLogo] = useState(negocio.perfilLogo || "");

  // 👇 Estados para agregar servicio
  const [agregando, setAgregando] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevoPrecio, setNuevoPrecio] = useState("");

  const handleGuardarServicio = async () => {
    if (!nuevoNombre.trim() || !nuevoPrecio) return;
    try {
      await agregarServicio(negocio.slug, {
        nombre: nuevoNombre, // 👈 backend lo guarda como "servicio"
        precio: Number(nuevoPrecio),
      });
      setNuevoNombre("");
      setNuevoPrecio("");
      setAgregando(false);
    } catch (err) {
      console.error("❌ Error al guardar servicio:", err);
    }
  };

  // Subida de logo
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setSubiendo(true);
      const url = await subirLogoNegocio(file);
      setLogo(url);
    } catch (err) {
      console.error("Error al subir logo:", err);
      alert("❌ No se pudo subir la imagen");
    } finally {
      setSubiendo(false);
    }
  };

  if (modo === "dueño" && plan === "gratis") {
    return (
      <div className="flex items-center justify-center min-h-screen bg-neutral-900 text-white text-center p-6">
        🚫 Tu negocio está en plan <b>Gratis</b>.
        <br />
        Actualizá a Premium Lite o Premium Gold para activar tu agenda.
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-neutral-900 text-white">
      {/* Banner */}
      <div className="hidden md:flex justify-center">
        <div className="w-[70%] h-80 relative rounded-b-2xl overflow-hidden">
          <img
            src={negocio.bannerUrl || logo || "/banner-default.jpg"}
            alt={negocio.nombre}
            className="w-full h-full object-cover"
          />
        </div>
      </div>

      {/* Contenido */}
      <div className="relative md:-mt-16 px-4 pb-10">
        <div className="w-full max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Columna derecha (perfil) */}
          <div className="order-1 mt-8 md:order-2 bg-neutral-800 rounded-2xl p-6 flex flex-col items-center text-center shadow-lg">
            {/* Logo negocio */}
            <div className="mt-8 relative">
              {logo ? (
                <img
                  src={logo}
                  alt="Logo negocio"
                  className="w-24 h-24 rounded-full object-cover mb-4 border-4 border-white"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-gray-700 flex items-center justify-center text-3xl font-bold mb-4 border-4 border-black">
                  {negocio.nombre.charAt(0)}
                </div>
              )}

              {modo === "dueño" && (
                <>
                  <label
                    htmlFor="upload-logo"
                    className="absolute bottom-2 right-2 bg-neutral-700 text-white w-8 h-8 flex items-center justify-center rounded-full cursor-pointer border-2 border-white text-lg"
                  >
                    +
                  </label>
                  <input
                    id="upload-logo"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </>
              )}

              {subiendo && (
                <p className="absolute -bottom-5 text-xs text-gray-400">
                  Subiendo...
                </p>
              )}
            </div>

            <h3 className="text-lg font-semibold">
              {modo === "dueño" && usuario?.nombre
                ? usuario.nombre
                : negocio.nombre}
            </h3>

            {modo === "cliente" && (
              <button className="mt-4 bg-white text-black px-6 py-2 rounded-full font-medium hover:bg-gray-200">
                Reservar
              </button>
            )}

            <div className="mt-6 text-xs text-gray-400 space-y-2">
              {negocio.direccion && <p>📍 {negocio.direccion}</p>}
              <p className="underline cursor-pointer">Contactar</p>
            </div>
          </div>

          {/* Columna izquierda -> servicios y empleados */}
          <div className="order-2 md:order-1 md:col-span-2 space-y-8">

            {/* Servicios */}
<div className="bg-neutral-800 rounded-2xl p-6 shadow-lg">
  <h2 className="text-lg font-semibold mb-4">Servicios</h2>

  {negocio.servicios && negocio.servicios.length > 0 ? (
    <div className="flex flex-wrap gap-4">
      {negocio.servicios.map((s, idx) => (
        <div
          key={s.id || idx}
          className="flex flex-col justify-center items-center w-32 h-24 bg-neutral-900 rounded-xl p-2 text-center"
        >
          {/* 🔹 El nombre nunca rompe el tamaño */}
          <p className="font-medium text-white text-sm leading-tight break-words truncate w-full">
            {s.servicio}
          </p>
          <span className="text-sm text-gray-400">${s.precio}</span>
        </div>
      ))}

      {/* Rectángulo de agregar servicio */}
      {modo === "dueño" && (
        <>
          {!agregando ? (
            <button
              onClick={() => setAgregando(true)}
              className="w-32 h-24 flex items-center justify-center border-2 border-dashed border-gray-500 rounded-xl hover:border-white transition"
            >
              <span className="text-3xl text-gray-400">+</span>
            </button>
          ) : (
            <div className="flex flex-col justify-center items-center bg-neutral-900 border border-dashed border-gray-500 rounded-xl p-2 w-32 h-24">
              <input
                type="text"
                placeholder="Servicio"
                value={nuevoNombre}
                onChange={(e) => setNuevoNombre(e.target.value)}
                className="w-full px-2 py-1 mb-1 rounded bg-neutral-800 text-xs text-center truncate"
              />
              <input
                type="number"
                placeholder="Precio"
                value={nuevoPrecio}
                onChange={(e) => setNuevoPrecio(e.target.value)}
                className="w-full px-2 py-1 mb-1 rounded bg-neutral-800 text-xs text-center"
              />
              <button
                onClick={handleGuardarServicio}
                className="bg-indigo-600 hover:bg-indigo-700 rounded px-2 py-1 text-xs font-medium"
              >
                Guardar
              </button>
            </div>
          )}
        </>
      )}
    </div>
  ) : (
    <div className="w-full flex justify-start mt-2">
      {modo === "dueño" && (
        <>
          {!agregando ? (
            <button
              onClick={() => setAgregando(true)}
              className="w-32 h-24 flex items-center justify-center border-2 border-dashed border-gray-500 rounded-xl hover:border-white transition"
            >
              <span className="text-3xl text-gray-400">+</span>
            </button>
          ) : (
            <div className="flex flex-col justify-center items-center bg-neutral-900 border border-dashed border-gray-500 rounded-xl p-2 w-32 h-24">
              <input
                type="text"
                placeholder="Servicio"
                value={nuevoNombre}
                onChange={(e) => setNuevoNombre(e.target.value)}
                className="w-full px-2 py-1 mb-1 rounded bg-neutral-800 text-xs text-center truncate"
              />
              <input
                type="number"
                placeholder="Precio"
                value={nuevoPrecio}
                onChange={(e) => setNuevoPrecio(e.target.value)}
                className="w-full px-2 py-1 mb-1 rounded bg-neutral-800 text-xs text-center"
              />
              <button
                onClick={handleGuardarServicio}
                className="bg-indigo-600 hover:bg-indigo-700 rounded px-2 py-1 text-xs font-medium"
              >
                Guardar
              </button>
            </div>
          )}
        </>
      )}
      {modo === "cliente" && (
        <p className="text-gray-400 text-sm">No hay servicios cargados.</p>
      )}
    </div>
  )}
</div>

            {/* Empleados */}
            <div className="bg-neutral-800 rounded-2xl p-6 relative shadow-lg">
              <h2 className="text-lg font-semibold mb-4">Empleados</h2>
              {modo === "dueño" && (
                <button
                  onClick={() => alert("Abrir configuración de empleados")}
                  className="absolute top-4 right-4"
                >
                  <img
                    src={ConfigIcon}
                    alt="Configurar empleados"
                    className="w-6 h-6 opacity-80 hover:opacity-100 transition filter invert"
                  />
                </button>
              )}

              <div className="flex ml-20 gap-6 flex-wrap mt-2">
                {empleados.map((e, idx) => (
                  <button
                    key={idx}
                    onClick={() => setEmpleadoSeleccionado(e)}
                    className="relative w-24 h-24 rounded-full bg-neutral-900 hover:bg-neutral-700 transition flex items-center justify-center"
                  >
                    {e.foto ? (
                      <img
                        src={e.foto}
                        alt={e.nombre}
                        className="w-22 h-22 rounded-full object-cover border-4 border-white"
                      />
                    ) : (
                      <div className="w-22 h-22 rounded-full bg-indigo-500 flex items-center justify-center font-bold text-white border-4 border-black text-xl">
                        {e.nombre.charAt(0)}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Calendario */}
            <div className="bg-neutral-800 rounded-2xl p-6 shadow-lg flex justify-center">
              <div className="w-full max-w-sm">
                <h2 className="text-lg font-semibold mb-4 ml-2">Mi Calendario</h2>
                <CalendarioUI />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
