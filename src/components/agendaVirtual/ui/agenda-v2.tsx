import { useState, useEffect, useRef } from "react";

import {
  Calendar,
  Wrench,
  Users,
  MapPin,
  Share2
} from "lucide-react";

import AgendaNegocio from "../ui/agendaNegocio";
import ModalAgendarse from "./modalAgendarse";
import ModalShare from "./share";
import ModalPerfil from "../ui/modalPerfil";
import ModalEmpleadosUI from "./modalEmpleadosUI";
import { Instagram, Facebook, Phone } from "lucide-react";
import ConfigIcon from "../../ui/Config-icono";
import ModalAgregarServicios from "../modalAgregarServicios";
import { obtenerDireccion } from "../../../lib/geocoding";
import { guardarUbicacionNegocio } from "../backend/agenda-backend";
import LoaderSpinner from "../../ui/loaderSpinner";
import ComponenteMapa from "./mapa";


import { useMap } from "react-leaflet";


import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";

// 🔥 IMPORTANTE: Listener de servicios
import { escucharServicios } from "../backend/agenda-backend";

const customIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

/* ------------------------------ TIPOS ------------------------------ */

export type Turno = {
  id: string;
  cliente: string;
  email: string;
  servicio: string;
  fecha: string;
  hora: string;
  estado: "pendiente" | "confirmado" | "cancelado";
  barbero: string;
};

export type Empleado = {
  id?: string;
  nombre: string;
  email?: string;
  foto?: string;
  fotoPerfil?: string;
  rol?: "empleado" | "admin" | "dueño";
  admin?: boolean;
  adminEmail?: string;
  trabajos?: string[];
  calendario?: any;
  esEmpleado?: boolean;
};

export type Servicio = {
  id?: string;
  servicio: string;
  precio: number;
  duracion: number;
};

export type Negocio = {
  id: string;
  nombre: string;
  slug: string;
  descripcion?: string;
  perfilLogo?: string;
  bannerUrl?: string;
  servicios?: Servicio[];
  empleadosData?: Empleado[];
  ubicacion?: {
    lat: number;
    lng: number;
    direccion: string;
  };
  redes?: {
    instagram?: string;
    facebook?: string;
    telefono?: string;
  };
  tema?: {
    colorPrimario: string;
    colorFondo: string;
    colorPrimarioOscuro: string;
  };
};

type Usuario = {
  nombre?: string;
  fotoPerfil?: string;
  email?: string;
};

type Props = {
  negocio: Negocio;
  servicios: Servicio[];
  empleados: Empleado[];
  turnos: Turno[];
  modo: "dueño" | "cliente" | "admin";
  usuario?: Usuario;
};

/* ------------------------------ COMPONENTE ------------------------------ */

export default function AgendaVirtualUIv3({
  negocio,
  servicios,
  empleados,
  turnos,
  modo,
  usuario,
}: Props) {

  /* --------  ESTADOS  -------- */
  const [vista, setVista] = useState<string>("agenda");
  const [modalShare, setModalShare] = useState(false);
  const [modalAgendarse, setModalAgendarse] = useState(false);
  const [modalPerfil, setModalPerfil] = useState(false);
  const [modalEmpleados, setModalEmpleados] = useState(false);
  const [ubicacion, setUbicacion] = useState(negocio.ubicacion || null);
  const [estadoUbicacion, setEstadoUbicacion] = useState<"idle" | "cargando" | "exito">("idle");

const mapWrapperRef = useRef<HTMLDivElement>(null);
const [readyToShowMap, setReadyToShowMap] = useState(false);

useEffect(() => {
  // Esperar a que el contenedor tenga tamaño real
  const timer = setTimeout(() => {
    if (mapWrapperRef.current && mapWrapperRef.current.clientHeight > 0) {
      setReadyToShowMap(true);
    }
  }, 100);

  return () => clearTimeout(timer);
}, [vista]);

function FixMapRender() {
  const map = useMap();
  useEffect(() => {
    setTimeout(() => {
      map.invalidateSize();
    }, 150);
  }, [map]);
  return null;
}

  // 🔥 Nuevo estado: servicios en tiempo real
  const [serviciosState, setServiciosState] = useState<Servicio[]>([]);
  const [modalServicios, setModalServicios] = useState(false);
  // 📍 FUNCIÓN PARA GUARDAR UBICACIÓN
const handleGuardarUbicacion = () => {
  if (!navigator.geolocation) {
    console.error("Tu navegador no soporta geolocalización.");
    return;
  }

  setEstadoUbicacion("cargando");

  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      try {
        const { latitude, longitude } = pos.coords;

        const direccion = await obtenerDireccion(latitude, longitude);

        const nuevaUbicacion = {
          lat: latitude,
          lng: longitude,
          direccion,
        };

        await guardarUbicacionNegocio(negocio.slug, nuevaUbicacion);

        setUbicacion(nuevaUbicacion);

        // Cambia el estado visual del botón
        setEstadoUbicacion("exito");
        setTimeout(() => setEstadoUbicacion("idle"), 2500);
      } catch (error) {
        console.error("Error guardando ubicación:", error);
        setEstadoUbicacion("idle");
      }
    },
    (err) => {
      console.error("Error al obtener ubicación:", err);
      setEstadoUbicacion("idle");
    },
    { enableHighAccuracy: true, timeout: 10000 }
  );
};


  /* --------  CARGA REAL DE SERVICIOS  -------- */

  useEffect(() => {
    if (!negocio.slug) return;

    let unsubscribe: any;

    escucharServicios(negocio.slug, (servs) => {
      setServiciosState(servs);
    }).then((unsub) => {
      unsubscribe = unsub;
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [negocio.slug]);

  

  /* --------  NAVBAR  -------- */

  const navItems = [
    { id: "agenda", label: "Agenda", icon: <Calendar /> },
    { id: "servicios", label: "Servicios", icon: <Wrench /> },
    { id: "empleados", label: "Empleados", icon: <Users /> },
    { id: "ubicacion", label: "Ubicación", icon: <MapPin /> },
  ];

  /* -------- RENDERIZAR VISTA -------- */

  const renderVista = () => {
    switch (vista) {

      case "servicios":
        return (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {serviciosState.length > 0 ? (
              serviciosState.map((s) => (
                <div
                  key={s.id}
                  className="p-4 bg-purple-800/60 rounded-2xl text-center"
                >
                  <p className="font-semibold">{s.servicio}</p>
                  <p className="text-sm opacity-80">${s.precio}</p>
                  <p className="text-xs opacity-60">{s.duracion} min</p>
                </div>
              ))
            ) : (
              <p className="opacity-80">No hay servicios cargados.</p>
            )}
          </div>
        );

      case "empleados":
  return (
    <div className="relative w-full">

      {/* LISTA DE EMPLEADOS */}
      <div className="flex flex-wrap justify-center gap-6 mt-10">
        {empleados?.length > 0 ? (
          empleados.map((e) => (
            <div key={e.id} className="flex flex-col items-center">
              <div className="w-20 h-20 rounded-full overflow-hidden border border-white/30">
                {e.fotoPerfil ? (
                  <img
                    src={e.fotoPerfil}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-purple-900 flex items-center justify-center">
                    <span className="text-xl font-bold">{e.nombre[0]}</span>
                  </div>
                )}
              </div>
              <p className="mt-2 text-sm">{e.nombre}</p>
            </div>
          ))
        ) : (
          <p className="opacity-80">No hay empleados cargados.</p>
        )}
      </div>

    </div>
  );

      case "agenda":
        return modo === "cliente" ? (
          <div className="flex justify-center">
            <button
              onClick={() => setModalAgendarse(true)}
              className="bg-purple-800 px-6 py-3 rounded-2xl hover:bg-purple-900 transition"
            >
              Reservar Turno
            </button>
          </div>
        ) : (
          <AgendaNegocio
            negocio={{
              id: negocio.id,
              nombre: negocio.nombre,
              empleadosData: empleados,
              slug: negocio.slug,
            }}
          />
        );

case "ubicacion":
  return (
    <div className="w-full">

      {/* Título */}
      <h2 className="text-lg font-semibold mb-4 text-white">
        {(modo === "dueño" || modo === "admin")
          ? "Mi ubicación"
          : `Ubicación de ${negocio.nombre}`}
      </h2>

      {/* Si NO existe ubicación */}
      {!ubicacion && (
        <>
          {(modo === "dueño" || modo === "admin") ? (
            <button
              onClick={handleGuardarUbicacion}
              disabled={estadoUbicacion === "cargando"}
              className={`
                px-4 py-2 rounded-md flex items-center justify-center gap-2
                font-medium transition-all
                ${
                  estadoUbicacion === "cargando"
                    ? "bg-purple-900 opacity-60 text-white"
                    : estadoUbicacion === "exito"
                    ? "bg-green-600 text-white"
                    : "bg-purple-900 hover:bg-purple-800 text-white"
                }
              `}
            >
              {estadoUbicacion === "cargando" && (
                <>
                  <LoaderSpinner size={20} color="white" />
                  Cargando nueva ubicación...
                </>
              )}
              {estadoUbicacion === "exito" && "✅ Se ha cambiado la ubicación"}
              {estadoUbicacion === "idle" && "📍 Agregar ubicación"}
            </button>
          ) : (
            <p className="opacity-80 text-sm">Ubicación no disponible.</p>
          )}
        </>
      )}

      {/* Si SÍ existe ubicación */}
      {ubicacion && (
        <div className="flex flex-col gap-4">

          {/* MAPA REUTILIZABLE */}
          <div className="w-full flex justify-center">
            <ComponenteMapa
              ubicacion={ubicacion}
              modo={modo}
              negocioSlug={negocio.slug}
              onUbicacionActualizada={(u) => setUbicacion(u)}
              height="h-64"
            />
          </div>

          {/* Botón actualizar ubicación */}
          {(modo === "dueño" || modo === "admin") && (
            <div className="flex justify-end">
              <button
                onClick={handleGuardarUbicacion}
                disabled={estadoUbicacion === "cargando"}
                className={`
                  px-3 py-1.5 text-sm rounded-md flex items-center gap-2
                  transition-all font-medium
                  ${
                    estadoUbicacion === "cargando"
                      ? "bg-purple-900 opacity-60 text-white"
                      : estadoUbicacion === "exito"
                      ? "bg-green-600 text-white"
                      : "bg-purple-900 hover:bg-purple-800 text-white"
                  }
                `}
              >
                {estadoUbicacion === "cargando" && (
                  <>
                    <LoaderSpinner size={14} color="white" />
                    Buscando nueva ubicación...
                  </>
                )}
                {estadoUbicacion === "exito" && "✅ Ubicación actualizada"}
                {estadoUbicacion === "idle" && "📍 Actualizar ubicación"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );



      default:
        return null;
    }
  };

  /* --------  UI PRINCIPAL -------- */

  return (
    <div className="min-h-screen w-full flex flex-col items-center bg-gradient-to-b from-indigo-900 to-blue-600 text-white p-4">

      {/* HEADER */}
      <div className="
  w-full max-w-3xl bg-purple-700 rounded-3xl p-6 flex flex-col items-center 
  shadow-[0_8px_20px_rgba(0,0,0,0.45)]
  hover:shadow-[0_12px_28px_rgba(0,0,0,0.55)]
  transition-all duration-300
  relative
">


        {/* ⚙️ Config */}
        {(modo === "dueño" || modo === "admin") && (
          <button
            onClick={() => setModalPerfil(true)}
            className="absolute top-4 right-4"
          >
            <ConfigIcon className="w-7 h-7 opacity-80 hover:opacity-100 transition" />
          </button>
        )}

        {/* Foto */}
        <div className="w-24 h-24 rounded-full bg-purple-900 overflow-hidden border-4 border-white/20">
          {negocio.perfilLogo ? (
            <img src={negocio.perfilLogo} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-3xl">
              {negocio.nombre[0]}
            </div>
          )}
        </div>

        {/* Nombre */}
        <h1 className="mt-4 text-2xl font-bold">{negocio.nombre}</h1>

        {/* Descripción */}
        <p className="opacity-80 text-center mt-4 px-4">
          {negocio.descripcion || "Sin descripción."}
        </p>

        {/* Redes */}
        <div className="flex gap-3 justify-center mt-3">
          <a
            href={negocio?.redes?.instagram || "#"}
            target="_blank"
            className={`p-2 rounded-full border border-white/40 ${
              negocio?.redes?.instagram
                ? ""
                : "opacity-50 pointer-events-none"
            }`}
          >
            <Instagram className="w-4 h-4" />
          </a>

          <a
            href={negocio?.redes?.facebook || "#"}
            target="_blank"
            className={`p-2 rounded-full border border-white/40 ${
              negocio?.redes?.facebook
                ? ""
                : "opacity-50 pointer-events-none"
            }`}
          >
            <Facebook className="w-4 h-4" />
          </a>

          <a
            href={
              negocio?.redes?.telefono
                ? `tel:${negocio.redes.telefono}`
                : "#"
            }
            className={`p-2 rounded-full border border-white/40 ${
              negocio?.redes?.telefono
                ? ""
                : "opacity-50 pointer-events-none"
            }`}
          >
            <Phone className="w-4 h-4" />
          </a>

          <button
            onClick={() => setModalShare(true)}
            className="p-2 rounded-full border border-white/40"
          >
            <Share2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* NAV */}
     <div className="
  w-full max-w-3xl bg-purple-800 mt-4 p-3 rounded-3xl flex justify-around gap-2
  shadow-[0_6px_16px_rgba(0,0,0,0.40)]
  hover:shadow-[0_10px_24px_rgba(0,0,0,0.55)]
  transition-all duration-300
">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setVista(item.id)}
            className={`flex flex-col items-center p-2 min-w-[70px] transition 
              ${vista === item.id ? "bg-purple-600 text-white rounded-xl" : "bg-transparent"}`}
          >
            <div className="w-6 h-6 flex items-center justify-center">{item.icon}</div>
            <span className="text-xs mt-1 text-center">{item.label}</span>
          </button>
        ))}
      </div>

{/* CONTENIDO */}
<div
  key={vista}
  className={`
    relative
    w-full max-w-3xl bg-purple-700 mt-6 p-6 rounded-3xl 
    shadow-[0_8px_20px_rgba(0,0,0,0.45)]
    hover:shadow-[0_12px_28px_rgba(0,0,0,0.55)]
    transition-all duration-300

    ${
      vista === "agenda" && modo === "cliente"
        ? "min-h-0" 
        : vista === "ubicacion"
        ? "min-h-0"
        : vista === "empleados"
        ? "min-h-fit"
        : "min-h-[280px]"
    }
  `}
>

  {/* CONFIG PARA EMPLEADOS */}
  {(vista === "empleados") && (modo === "dueño" || modo === "admin") && (
    <button
      onClick={() => setModalEmpleados(true)}
      className="absolute top-4 right-4 z-20"
      title="Administrar empleados"
    >
      <ConfigIcon className="w-7 h-7 opacity-80 hover:opacity-100 transition" />
    </button>
  )}

  {/* CONFIG PARA SERVICIOS */}
  {(vista === "servicios") && (modo === "dueño" || modo === "admin") && (
    <button
      onClick={() => setModalServicios(true)}
      className="absolute top-4 right-4 z-20"
      title="Administrar servicios"
    >
      <ConfigIcon className="w-7 h-7 opacity-80 hover:opacity-100 transition" />
    </button>
  )}

  {renderVista()}
</div>


      {/* FOOTER */}
      <div className="w-full max-w-3xl bg-black mt-6 p-4 rounded-3xl text-center opacity-80">
        FOOTER DE AGENDATEONLINE
      </div>

      {/* MODALES */}
      {modalShare && (
        <ModalShare
          abierto={modalShare}
          onCerrar={() => setModalShare(false)}
          slug={negocio.slug}
        />
      )}

      {modalAgendarse && (
        <ModalAgendarse
          abierto={modalAgendarse}
          onClose={() => setModalAgendarse(false)}
          negocio={negocio}
        />
      )}

      {modalPerfil && (
        <ModalPerfil
          abierto={modalPerfil}
          onCerrar={() => setModalPerfil(false)}
          negocio={negocio}
          onGuardar={() => {}}
        />
      )}

      {modalEmpleados && (
        <ModalEmpleadosUI
          abierto={modalEmpleados}
          onCerrar={() => setModalEmpleados(false)}
          negocioId={negocio.id}
          modo={modo === "cliente" ? "dueño" : modo}
        />
      )}
        {/* MODAL DE SERVICIOS */}
{modalServicios && (
  <ModalAgregarServicios
    abierto={modalServicios}
    onCerrar={() => setModalServicios(false)}
    negocioId={negocio.id}
  />
)}
    </div>
  );
  
}
