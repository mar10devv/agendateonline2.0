import { useState, useEffect, useRef, useMemo } from "react";

import {
  Calendar,
  Wrench,
  Users,
  MapPin,
  Share2
} from "lucide-react";

import CalendarioBase from "../calendario/calendario-diseño";
import ModalAgendarse from "./modalAgendarse";
import ModalShare from "./share";
import ModalPerfil from "../ui/modalPerfil";
import ModalEmpleadosUI from "./modalEmpleadosUI";
import { Instagram, Facebook, Phone } from "lucide-react";
import ConfigIcon from "../../ui/Config-icono";
import ModalAgregarServicios from "../modalAgregarServicios";
import { obtenerDireccion } from "../../../lib/geocoding";
import { guardarUbicacionNegocio, escucharServicios } from "../backend/agenda-backend";
import LoaderSpinner from "../../ui/loaderSpinner";
import ComponenteMapa from "./mapa";
import CardServicio from "../../ui/cardServicio";

import IconAgenda from "../../../assets/icon-navbar/calendario.svg?url";
import IconServicios from "../../../assets/icon-navbar/servicio.svg?url";
import IconEmpleados from "../../../assets/icon-navbar/personal.svg?url";
import IconUbicacion from "../../../assets/icon-navbar/map.svg?url";

import { db } from "../../../lib/firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";

import { useMap } from "react-leaflet";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";



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
  esEmpleado?: boolean; // 🔥 clave para saber si trabaja
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

  // 🟢 UNIFICADO: pagos + agenda
  configuracionAgenda?: {
    // ---- Cosas que ya tenías para pagos ----
    modoPago?: "libre" | "senia";
    porcentajeSenia?: number;
    mercadoPago?: {
      conectado?: boolean;
      accessToken?: string;
    };

    // ---- Nuevos campos de agenda ----
    diasLibres?: string[];
    modoTurnos?: "jornada" | "personalizado";
    clientesPorDia?: number | null;
    onboardingCompletado?: boolean;
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
  const [estadoUbicacion, setEstadoUbicacion] =
    useState<"idle" | "cargando" | "exito">("idle");

  const mapWrapperRef = useRef<HTMLDivElement>(null);
  const [readyToShowMap, setReadyToShowMap] = useState(false);

  // 🟢 NUEVO: estado para el modal de configuración de agenda
  const [mostrarModalConfigAgenda, setMostrarModalConfigAgenda] =
    useState(false);
  const [configAgendaInicial, setConfigAgendaInicial] = useState<{
    diasLibres?: string[];
    modoTurnos?: "jornada" | "personalizado";
    clientesPorDia?: number | null;
  } | null>(null);

  useEffect(() => {
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

  /* -------- EMPLEADOS ACTIVOS (DUEÑO SOLO SI ES EMPLEADO) -------- */

  const empleadosFuente = useMemo<Empleado[]>(() => {
    const lista =
      empleados && empleados.length > 0
        ? empleados
        : negocio.empleadosData ?? [];

    return Array.isArray(lista) ? lista : [];
  }, [empleados, negocio.empleadosData]);

  // Ocultamos:
  // - Dueño: solo se muestra si esEmpleado === true
  // - Resto: se ocultan si esEmpleado === false
  const empleadosActivos = useMemo(() => {
    return empleadosFuente.filter((e) => {
      if (e.rol === "dueño") {
        return e.esEmpleado === true;
      }
      return e.esEmpleado !== false;
    });
  }, [empleadosFuente]);

  // Para el calendario: usamos los activos; si no hay ninguno marcado, usamos la fuente
  // Para el calendario: usamos los activos; si no hay ninguno marcado, usamos la fuente
  const empleadosParaAgenda =
    empleadosActivos.length > 0 ? empleadosActivos : empleadosFuente;

  // 🟡 ¿Hay empleados sin configurar del todo?
  const hayEmpleadosIncompletos = useMemo(() => {
    // Tomamos solo los que realmente trabajan
    const lista = empleadosParaAgenda.filter((e) => e.esEmpleado !== false);

    // Si no hay nadie configurado todavía, consideramos "incompleto"
    if (lista.length === 0) return true;

    return lista.some((e) => {
      const cal: any = e.calendario || {};
      const inicio = cal.inicio as string | undefined;
      const fin = cal.fin as string | undefined;
      const diasLibres = Array.isArray(cal.diasLibres) ? cal.diasLibres : [];
      const trabajos = Array.isArray(e.trabajos) ? e.trabajos : [];

      const horarioOk =
        typeof inicio === "string" &&
        typeof fin === "string" &&
        inicio < fin;

      const diasOk = diasLibres.length > 0;
      const trabajosOk = trabajos.length > 0;

      // Si le falta alguna de las 3 cosas → empleado incompleto
      return !(horarioOk && diasOk && trabajosOk);
    });
  }, [empleadosParaAgenda]);


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

  /* --------  TEMAS (COLORES) -------- */

  useEffect(() => {
    if (!negocio?.slug) return;

    const q = query(
      collection(db, "Negocios"),
      where("slug", "==", negocio.slug)
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      if (snap.empty) return;

      const data = snap.docs[0].data() as Negocio;
      const tema = data.tema;

      if (tema && tema.colorPrimario) {
        requestAnimationFrame(() => {
          document.documentElement.style.setProperty(
            "--color-primario",
            tema.colorPrimario || "#262626"
          );
          document.documentElement.style.setProperty(
            "--color-fondo",
            tema.colorFondo || "#171717"
          );
          document.documentElement.style.setProperty(
            "--color-primario-oscuro",
            tema.colorPrimarioOscuro || "#0a0a0a"
          );
          document.documentElement.style.setProperty(
            "--color-texto",
            "#ffffff"
          );
        });
      } else {
        document.documentElement.style.setProperty(
          "--color-primario",
          "#262626"
        );
        document.documentElement.style.setProperty(
          "--color-fondo",
          "#171717"
        );
        document.documentElement.style.setProperty(
          "--color-primario-oscuro",
          "#0a0a0a"
        );
        document.documentElement.style.setProperty(
          "--color-texto",
          "#ffffff"
        );
      }
    });

    return () => unsubscribe();
  }, [negocio.slug]);

  /* --------  ONBOARDING: CONFIGURAR AGENDA LA PRIMERA VEZ -------- */

  useEffect(() => {
    const cfg: any = negocio.configuracionAgenda || {};

    setConfigAgendaInicial({
      diasLibres: cfg.diasLibres || [],
      modoTurnos: cfg.modoTurnos || "jornada",
      clientesPorDia:
        typeof cfg.clientesPorDia === "number" ? cfg.clientesPorDia : null,
    });

    if (modo === "dueño" || modo === "admin") {
      if (cfg.onboardingCompletado !== true) {
        setMostrarModalConfigAgenda(true);
      } else {
        setMostrarModalConfigAgenda(false);
      }
    } else {
      setMostrarModalConfigAgenda(false);
    }
  }, [negocio, modo]);

  /* --------  NAVBAR  -------- */

  const navItems = [
    { id: "agenda", label: "Agenda", icon: IconAgenda },
    { id: "servicios", label: "Servicios", icon: IconServicios },
    { id: "empleados", label: "Empleados", icon: IconEmpleados },
    { id: "ubicacion", label: "Ubicación", icon: IconUbicacion },
  ];

  // 🔴 ¿Falta terminar el onboarding?
  const onboardingPendiente =
    (modo === "dueño" || modo === "admin") &&
    negocio?.configuracionAgenda?.onboardingCompletado !== true;

  /* -------- RENDERIZAR VISTA -------- */

  const renderVista = () => {
    switch (vista) {
case "servicios":
  return (
<div className="flex flex-wrap gap-6 justify-start">
  {serviciosState.length > 0 ? (
    serviciosState.map((s) => (
      <CardServicio
        key={s.id || s.servicio}
        nombre={s.servicio}
        precio={s.precio}
        duracion={s.duracion}
      />
    ))
  ) : (
    <p className="opacity-80">No hay servicios cargados.</p>
  )}
</div>

  );


      case "empleados": {
        const listaEmpleados =
          empleadosActivos.length > 0 ? empleadosActivos : empleadosFuente;

        return (
          <div className="relative w-full">
            <div className="flex flex-wrap justify-center gap-6 mt-10">
              {listaEmpleados?.length > 0 ? (
                listaEmpleados.map((e) => (
                  <div
                    key={e.id || e.email || e.nombre}
                    className="flex flex-col items-center"
                  >
                    <div className="w-20 h-20 rounded-full overflow-hidden border border-white/30">
                      {e.fotoPerfil ? (
                        <img
                          src={e.fotoPerfil}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-[var(--color-primario-oscuro)] flex items-center justify-center">
                          <span className="text-xl font-bold">
                            {(e.nombre && e.nombre[0]) || "?"}
                          </span>
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
      }

      case "agenda": {
        const modoAgenda = modo === "cliente" ? "cliente" : "negocio";

        // 📌 Vista cliente: solo botón de reservar (se abre ModalAgendarse)
        if (modoAgenda === "cliente") {
          return (
            <div className="flex justify-center">
              <button
                onClick={() => setModalAgendarse(true)}
                className="
                  px-6 py-3 rounded-2xl transition
                  bg-[var(--color-primario)]
                  hover:bg-[var(--color-primario-oscuro)]
                "
              >
                Reservar Turno
              </button>
            </div>
          );
        }

        // 📌 Vista dueño/admin: CalendarioBase con selector interno
        const empleadoActual = empleadosParaAgenda[0] || null;

        if (!empleadoActual) {
          return (
            <p className="text-sm text-gray-400">
              No hay empleados configurados en la agenda.
            </p>
          );
        }

        // 👇 Adaptamos el negocio al formato esperado por calendario-backend
        const negocioAgenda: any = {
          id: negocio.id,
          nombre: negocio.nombre,
          slug: negocio.slug,
          ownerUid: negocio.id,
          adminUids: empleadosParaAgenda
            .filter((e) => e.admin === true)
            .map((e) => e.email || ""),
          configuracionAgenda: negocio.configuracionAgenda || {},
          empleados: empleadosParaAgenda,
          empleadosData: empleadosParaAgenda,
        };

        // 👇 Usuario actual para esDuenoOAdmin (simple por ahora)
        const usuarioActualCalendario: any = {
          uid: usuario?.email || "anon",
          email: usuario?.email || null,
          rol: modo,
        };

        return (
          <div className="space-y-4">
            <CalendarioBase
              modo={modoAgenda} // "negocio"
              usuarioActual={usuarioActualCalendario}
              negocio={negocioAgenda}
              empleado={empleadoActual as any}
              empleados={empleadosParaAgenda as any}
              turnos={turnos as any}
              minutosPorSlot={30}
            />
          </div>
        );
      }

      case "ubicacion":
        return (
          <div className="w-full">
            {/* Título */}
            <h2 className="text-lg font-semibold mb-4 text-[var(--color-texto)]">
              {modo === "dueño" || modo === "admin"
                ? "Mi ubicación"
                : `Ubicación de ${negocio.nombre}`}
            </h2>

            {/* Si NO existe ubicación */}
            {!ubicacion && (
              <>
                {modo === "dueño" || modo === "admin" ? (
                  <button
                    onClick={handleGuardarUbicacion}
                    disabled={estadoUbicacion === "cargando"}
                    className={`
                      px-4 py-2 rounded-md flex items-center justify-center gap-2
                      font-medium transition-all
                      ${
                        estadoUbicacion === "cargando"
                          ? "bg-[var(--color-primario-oscuro)] opacity-60 text-[var(--color-texto)]"
                          : estadoUbicacion === "exito"
                          ? "bg-green-600 text-white"
                          : "bg-[var(--color-primario-oscuro)] hover:opacity-90 text-[var(--color-texto)]"
                      }
                    `}
                  >
                    {estadoUbicacion === "cargando" && (
                      <>
                        <LoaderSpinner size={20} color="white" />
                        Cargando nueva ubicación...
                      </>
                    )}
                    {estadoUbicacion === "exito" &&
                      "✅ Se ha cambiado la ubicación"}
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
                            ? "bg-[var(--color-primario-oscuro)] opacity-60 text-[var(--color-texto)]"
                            : estadoUbicacion === "exito"
                            ? "bg-green-600 text-white"
                            : "bg-[var(--color-primario-oscuro)] hover:opacity-90 text-[var(--color-texto)]"
                        }
                      `}
                    >
                      {estadoUbicacion === "cargando" && (
                        <>
                          <LoaderSpinner size={14} color="white" />
                          Buscando nueva ubicación...
                        </>
                      )}
                      {estadoUbicacion === "exito" &&
                        "✅ Ubicación actualizada"}
                      {estadoUbicacion === "idle" &&
                        "📍 Actualizar ubicación"}
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
    <>


      <div
        className="
          min-h-screen w-full flex flex-col items-center
          bg-[var(--color-fondo)]
          text-[var(--color-texto)]
          p-4
          transition-colors duration-300
        "
      >
        {/* HEADER */}
        <div
          className="
            w-full max-w-3xl 
            bg-[var(--color-primario)]
            rounded-3xl p-6 flex flex-col items-center 
            shadow-[0_8px_20px_rgba(0,0,0,0.45)]
            hover:shadow-[0_12px_28px_rgba(0,0,0,0.55)]
            transition-all duration-300
            relative
            text-[var(--color-texto)]
          "
        >
          {(modo === "dueño" || modo === "admin") && (
            <button
              onClick={() => setModalPerfil(true)}
              className="absolute top-4 right-4"
            >
              <ConfigIcon className="w-7 h-7 opacity-80 hover:opacity-100 transition" />
            </button>
          )}

          {/* Foto */}
          <div className="w-24 h-24 rounded-full bg-[var(--color-primario-oscuro)] overflow-hidden border-4 border-white/20">
            {negocio.perfilLogo ? (
              <img
                src={negocio.perfilLogo}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-3xl">
                {negocio.nombre[0]}
              </div>
            )}
          </div>

          {/* Nombre */}
          <h1
            className="
              font-euphoria 
              text-[38px]
              md:text-[48px]
              leading-none
              tracking-wide
              mt-4
            "
          >
            {negocio.nombre}
          </h1>

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
<div
  className="
    w-full max-w-3xl mt-4 p-3 rounded-3xl flex justify-around gap-2
    bg-[var(--color-primario-oscuro)]
    text-[var(--color-texto)]
    shadow-[0_6px_16px_rgba(0,0,0,0.40)]
    hover:shadow-[0_10px_24px_rgba(0,0,0,0.55)]
    transition-all duration-300
  "
>
  {navItems.map((item) => {
    const onboardingIncompleto =
      (modo === "dueño" || modo === "admin") &&
      negocio.configuracionAgenda?.onboardingCompletado !== true;

    let mostrarAlerta = false;

    if (onboardingIncompleto) {
      if (item.id === "servicios") {
        // 👉 Punto solo si NO hay servicios cargados
        mostrarAlerta = serviciosState.length === 0;
      } else if (item.id === "ubicacion") {
        // 👉 Punto solo si todavía NO hay ubicación guardada
        mostrarAlerta = !ubicacion;
      } else if (item.id === "empleados") {
        // 👉 Punto si HAY al menos un empleado incompleto
        mostrarAlerta = hayEmpleadosIncompletos;
      }
      // En "agenda" nunca mostramos punto
    }

    return (
      <button
        key={item.id}
        onClick={() => setVista(item.id)}
        className={`relative flex flex-col items-center p-2 min-w-[70px] transition 
          ${
            vista === item.id
              ? "rounded-xl bg-[var(--color-primario)] text-[var(--color-texto)]"
              : "bg-transparent"
          }`}
      >
        {/* PUNTO AMARILLO PARPADEANDO */}
        {mostrarAlerta && (
          <span
            className="
              absolute -top-1 right-4
              h-2.5 w-2.5 rounded-full
              bg-yellow-400
              shadow-[0_0_10px_rgba(250,204,21,0.9)]
              animate-pulse
            "
          />
        )}

        <div className="w-8 h-8 flex items-center justify-center">
          <img
            src={item.icon}
            alt={item.label}
            className="w-8 h-8 icono-blanco"
          />
        </div>
        <span className="text-xs mt-1 text-center">{item.label}</span>
      </button>
    );
  })}
</div>


        {/* CONTENIDO */}
        <div
          key={vista}
          className={`
            relative
            w-full max-w-3xl mt-6 p-6 rounded-3xl 
            bg-[var(--color-primario)]
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
          {vista === "empleados" && (modo === "dueño" || modo === "admin") && (
            <button
              onClick={() => setModalEmpleados(true)}
              className="absolute top-4 right-4 z-20"
              title="Administrar empleados"
            >
              <ConfigIcon className="w-7 h-7 opacity-80 hover:opacity-100 transition" />
            </button>
          )}

          {/* CONFIG PARA SERVICIOS */}
          {vista === "servicios" && (modo === "dueño" || modo === "admin") && (
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
        <div
          className="
            w-full max-w-3xl bg-black/80 mt-6 p-6 rounded-3xl 
            text-center text-white 
            shadow-[0_8px_20px_rgba(0,0,0,0.4)]
            flex flex-col items-center gap-2
          "
        >
          <p className="text-sm opacity-80 leading-relaxed">
            © {new Date().getFullYear()} {negocio.nombre} — Todos los derechos
            reservados.
            <br />
            <span className="opacity-70">Powered by AgendateOnline</span>
          </p>

          <button
            onClick={() => (window.location.href = "/")}
            className="
              mt-1 px-4 py-2 text-sm rounded-xl font-medium
              bg-[var(--color-primario)]
              hover:bg-[var(--color-primario-oscuro)]
              transition-colors duration-300
            "
          >
            Obtener tu agenda
          </button>
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

        {modalServicios && (
          <ModalAgregarServicios
            abierto={modalServicios}
            onCerrar={() => setModalServicios(false)}
            negocioId={negocio.id}
          />
        )}
      </div>
    </>
  );
}
