import { useState, useEffect, useRef, useMemo } from "react";

import {
  Calendar,
  Wrench,
  Users,
  MapPin,
  Share2,
} from "lucide-react";

import CalendarioBase from "../calendario/calendario-diseño";
import ModalAgendarse from "../modales/modalAgendarse";
import ModalShare from "./share";
import ModalPerfil from "../modales/modalPerfil";
import ModalEmpleadosUI from "../modales/modalEmpleadosUI";
import ConfigIcon from "../../ui/Config-icono";
import ModalAgregarServicios from "../modales/modalAgregarServicios";
import { obtenerDireccion } from "../../../lib/geocoding";
import {
  guardarUbicacionNegocio,
  escucharServicios,
} from "../backend/agenda-backend";
import LoaderSpinner from "../../ui/loaderSpinner";
import ComponenteMapa from "./mapa";
import CardServicio from "../../ui/cardServicio";
import CardServicioAgregar from "../../ui/cardAgregarServicio";
import ModalEmprendimiento from "../modales/modalEmprendimiento";
import IconEstadisticas from "../../../assets/estadisticas-svg.svg?url";

import ModalEstadisticas from "../modales/modalEstadisticas";
import IconAgenda from "../../../assets/icon-navbar/calendario.svg?url";
import IconServicios from "../../../assets/icon-navbar/servicio.svg?url";
import IconEmpleados from "../../../assets/icon-navbar/personal.svg?url";
import IconUbicacion from "../../../assets/icon-navbar/map.svg?url";

import { db } from "../../../lib/firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
} from "firebase/firestore";

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

  // 👇 NUEVO: viene del padre (agendaVirtual.tsx)
  esEmprendimiento: boolean;
};

/* ------------------------------ COMPONENTE ------------------------------ */

export default function AgendaVirtualUIv3({
  negocio,
  servicios,
  empleados,
  turnos,
  modo,
  usuario,
  esEmprendimiento, // 👈 ahora lo recibimos
}: Props) {

/* -------- ROLES -------- */
const esDueno = modo === "dueño";
const esAdmin = modo === "admin";
const esCliente = modo === "cliente";

const esDuenoOAdmin = esDueno || esAdmin; // 👈 NUEVO

// 👑 Solo el dueño puede tocar perfil general + estadísticas
const puedeConfigPerfil = esDueno;

// 👑 Solo el dueño puede gestionar servicios y empleados (tuerquita)
const puedeConfigServiciosYEmpleados = esDueno;

  /* --------  ESTADOS  -------- */
  const [vista, setVista] = useState<string>("agenda");
  const [modalShare, setModalShare] = useState(false);
  const [modalAgendarse, setModalAgendarse] = useState(false);
  const [modalPerfil, setModalPerfil] = useState(false);
  const [modalEstadisticas, setModalEstadisticas] = useState(false);
  const [modalEmpleados, setModalEmpleados] = useState(false);
  const [ubicacion, setUbicacion] = useState(negocio.ubicacion || null);
  const [estadoUbicacion, setEstadoUbicacion] =
    useState<"idle" | "cargando" | "exito">("idle");
  const [modalEmprendimiento, setModalEmprendimiento] = useState(false);

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

  // 🧮 Ordenar servicios: más nuevo → más viejo (usando createdAt)
  const serviciosOrdenados = useMemo(() => {
    if (!serviciosState || serviciosState.length === 0) return [];

    return [...serviciosState].sort((a: any, b: any) => {
      const ta =
        a.createdAt?.toMillis?.() ??
        (a.createdAt?.seconds
          ? a.createdAt.seconds * 1000
          : typeof a.createdAt === "number"
          ? a.createdAt
          : 0);

      const tb =
        b.createdAt?.toMillis?.() ??
        (b.createdAt?.seconds
          ? b.createdAt.seconds * 1000
          : typeof b.createdAt === "number"
          ? b.createdAt
          : 0);

      return tb - ta; // 👈 más nuevo primero
    });
  }, [serviciosState]);

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

      // 👉 también aceptamos configuración de día y medio
      const diaYMedio = cal.diaYMedio as any | null;
      const tieneDiaYMedioValido =
        diaYMedio &&
        (typeof diaYMedio.diaCompleto === "string" ||
          typeof diaYMedio.medioDia === "string");

      const horarioOk =
        typeof inicio === "string" &&
        typeof fin === "string" &&
        inicio < fin;

      // ✅ ahora es válido si tiene díasLibres O diaYMedio configurado
      const diasOk = diasLibres.length > 0 || !!tieneDiaYMedioValido;

      const trabajosOk = trabajos.length > 0;

      // Si le falta alguna de las 3 cosas → empleado incompleto
      return !(horarioOk && diasOk && trabajosOk);
    });
  }, [empleadosParaAgenda]);

  // 📍 FUNCIÓN PARA GUARDAR UBICACIÓN
  const handleGuardarUbicacion = () => {
    // Si estamos en SSR o no existe navigator, salimos
    if (typeof window === "undefined" || typeof navigator === "undefined") {
      console.error("Navigator no está disponible en este entorno.");
      return;
    }

    if (!("geolocation" in navigator)) {
      console.error("Tu navegador no soporta geolocalización.");
      // Nos aseguramos de no dejar el botón en 'cargando'
      setEstadoUbicacion("idle");
      alert(
        "Tu navegador no soporta geolocalización o está desactivada. Configura la ubicación manualmente."
      );
      return;
    }

    setEstadoUbicacion("cargando");

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;

          let direccion = "";
          try {
            // Si falla obtenerDireccion, no rompemos todo
            direccion = await obtenerDireccion(latitude, longitude);
          } catch (e) {
            console.error("No se pudo obtener la dirección legible:", e);
          }

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
          alert("Ocurrió un error al guardar la ubicación.");
        }
      },
      (err) => {
        console.error("Error al obtener ubicación:", err);
        setEstadoUbicacion("idle");
        alert(
          "No pudimos obtener tu ubicación. Verifica los permisos de ubicación del navegador."
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 10000, // 10s → si no responde, dispara el callback de error
        maximumAge: 0,
      }
    );
  };

  // 🔹 Guardar cambios del modal de perfil (nombre, descripción, logo, etc.)
  const handleGuardarPerfil = async (data: {
    perfilLogo?: string;
    descripcion?: string;
    redes?: {
      instagram?: string;
      facebook?: string;
      telefono?: string;
    };
    nombre?: string;
    slug?: string;
    nombreArchivoLogo?: string;
    tamanioArchivoLogo?: number;
  }) => {
    try {
      const ref = doc(db, "Negocios", negocio.id);
      const payload: any = {};

      if (data.perfilLogo !== undefined) {
        payload.perfilLogo = data.perfilLogo;
      }
      if (data.descripcion !== undefined) {
        payload.descripcion = data.descripcion;
      }
      if (data.redes !== undefined) {
        payload.redes = data.redes;
      }
      if (data.nombre !== undefined) {
        payload.nombre = data.nombre;
      }
      if (data.slug !== undefined) {
        payload.slug = data.slug;
      }
      if (data.nombreArchivoLogo !== undefined) {
        payload.nombreArchivoLogo = data.nombreArchivoLogo;
      }
      if (data.tamanioArchivoLogo !== undefined) {
        payload.tamanioArchivoLogo = data.tamanioArchivoLogo;
      }

      if (Object.keys(payload).length > 0) {
        await updateDoc(ref, payload);
      }
    } catch (e) {
      console.error("Error guardando perfil del negocio:", e);
    }
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

    // 📍 Abrir ubicación en Google Maps
  const handleAbrirEnGoogleMaps = () => {
    if (!ubicacion) return;

    const { lat, lng } = ubicacion;
    if (!lat || !lng) return;

    const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
    window.open(url, "_blank");
  };


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
      {/* 👉 Card "+" SIEMPRE PRIMERO y SOLO dueño/admin */}
      {esDuenoOAdmin && (
        <CardServicioAgregar onClick={() => setModalServicios(true)} />
      )}

            {/* Cards de servicios existentes (ordenados) */}
      {serviciosOrdenados.length > 0 &&
        serviciosOrdenados.map((s) => (
          <CardServicio
            key={s.id || s.servicio}
            nombre={s.servicio}
            precio={s.precio}
            duracion={s.duracion}
          />
        ))}


      {/* Mensaje SOLO para clientes cuando no hay servicios */}
      {esCliente && serviciosState.length === 0 && (
        <p className="opacity-80">Esta agenda no tiene servicios.</p>
      )}
    </div>
  );

      case "empleados": {
        // Fuente base
        let listaEmpleados =
          empleadosActivos.length > 0 ? empleadosActivos : empleadosFuente;

        // 🟢 Si es EMPRENDIMIENTO, mostramos solo al dueño (o el primero)
        if (esEmprendimiento) {
          const dueno =
            listaEmpleados.find((e) => e.rol === "dueño") || listaEmpleados[0];
          listaEmpleados = dueno ? [dueno] : [];
        }

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

      case "ubicacion": {
        const esDuenoOAdminLocal = modo === "dueño" || modo === "admin";

        return (
          <div className="w-full space-y-4">
            {/* 🔹 CARD SOLO CUANDO NO HAY UBICACIÓN (dueño/admin) */}
            {!ubicacion && (
              <div className="rounded-2xl border border-neutral-800 bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950 px-5 py-4 shadow-lg">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  {/* Izquierda: icono + textos */}
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/50 bg-white/5">
                      <MapPin className="h-5 w-5 text-white" />
                    </div>

                    <div className="space-y-1">
                      <h2 className="text-lg font-semibold text-white">
                        {esDuenoOAdminLocal
                          ? "Mi ubicación"
                          : `Ubicación de ${negocio.nombre}`}
                      </h2>

                      <p className="text-sm text-neutral-300">
                        La ubicación se mostrará en el mapa y tus clientes
                        podrán abrirla en Google Maps para llegar más fácil.
                      </p>

                      {esDuenoOAdminLocal ? (
                        <span className="mt-2 inline-flex items-center gap-2 rounded-full border border-dashed border-neutral-600 bg-neutral-900/80 px-3 py-1 text-xs text-neutral-300">
                          <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                          Aún no configuraste la ubicación
                        </span>
                      ) : (
                        <p className="mt-2 text-xs text-neutral-400">
                          Esta agenda todavía no tiene una ubicación configurada.
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Botón acción (solo dueño/admin) */}
                  {esDuenoOAdminLocal && (
                    <button
                      onClick={handleGuardarUbicacion}
                      disabled={estadoUbicacion === "cargando"}
                      className={`
                        inline-flex items-center justify-center gap-2 rounded-full px-5 py-2 text-sm font-medium
                        shadow-md transition
                        ${
                          estadoUbicacion === "cargando"
                            ? "bg-[var(--color-primario-oscuro)] opacity-70 cursor-wait text-[var(--color-texto)]"
                            : estadoUbicacion === "exito"
                            ? "bg-green-600 text-white hover:bg-green-500 hover:shadow-green-400/40"
                            : "border border-white/60 bg-white/10 text-white hover:bg-white/20 hover:shadow-[0_0_16px_rgba(255,255,255,0.35)] active:scale-[0.97]"
                        }
                      `}
                    >
                      {estadoUbicacion === "cargando" && (
                        <>
                          <LoaderSpinner size={18} color="white" />
                          Buscando ubicación...
                        </>
                      )}

                      {estadoUbicacion === "exito" && (
                        <>
                          <MapPin className="h-4 w-4 text-white" />
                          Ubicación guardada
                        </>
                      )}

                      {estadoUbicacion === "idle" && (
                        <>
                          <MapPin className="h-4 w-4 text-white" />
                          Agregar ubicación
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* 🔹 MAPA + BOTONES SOLO CUANDO SÍ HAY UBICACIÓN */}
            {ubicacion && (
              <div className="space-y-3">
                {/* Título según rol */}
                <h2 className="text-lg font-semibold text-[var(--color-texto)]">
                  {esDuenoOAdminLocal
                    ? "Mi ubicación"
                    : `Ubicación de ${negocio.nombre}`}
                </h2>

                <div className="rounded-2xl border border-neutral-800 bg-neutral-950/70 p-3 sm:p-4">
                  <div className="w-full flex justify-center">
                    <ComponenteMapa
                      ubicacion={ubicacion}
                      modo={modo}
                      negocioSlug={negocio.slug}
                      onUbicacionActualizada={(u) => setUbicacion(u)}
                      height="h-72"
                    />
                  </div>

                  {/* Botones abajo a la derecha */}
                  <div className="mt-3 flex justify-end gap-2">
                    {/* Ver en Google Maps (todos los roles) */}
                    <button
                      onClick={handleAbrirEnGoogleMaps}
                      className="px-3 py-1.5 text-xs sm:text-sm rounded-full flex items-center gap-2 font-medium border border-white/60 bg-white/10 text-white hover:bg-white/20 transition"
                    >
                      <MapPin className="h-3 w-3" />
                      Ver en Google Maps
                    </button>

                    {/* Actualizar ubicación (solo dueño/admin) */}
                    {esDuenoOAdminLocal && (
                      <button
                        onClick={handleGuardarUbicacion}
                        disabled={estadoUbicacion === "cargando"}
                        className={`
                          px-3 py-1.5 text-xs sm:text-sm rounded-full flex items-center gap-2
                          font-medium transition-all
                          ${
                            estadoUbicacion === "cargando"
                              ? "bg-[var(--color-primario-oscuro)] opacity-70 cursor-wait text-[var(--color-texto)]"
                              : estadoUbicacion === "exito"
                              ? "bg-green-600 text-white hover:bg-green-500"
                              : "border border-white/50 bg-white/5 text-white hover:bg-white/15"
                          }
                        `}
                      >
                        {estadoUbicacion === "cargando" && (
                          <>
                            <LoaderSpinner size={14} color="white" />
                            Actualizando...
                          </>
                        )}
                        {estadoUbicacion === "exito" &&
                          "✅ Ubicación actualizada"}
                        {estadoUbicacion === "idle" &&
                          "📍 Actualizar ubicación"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      }

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
    rounded-3xl p-6 pb-12 flex flex-col items-center
    shadow-[0_8px_20px_rgba(0,0,0,0.45)]
    hover:shadow-[0_12px_28px_rgba(0,0,0,0.55)]
    transition-all duration-300
    relative
    text-[var(--color-texto)]
  "
>
{/* Iconos superiores derechos */}
<div className="absolute top-4 right-4 flex items-center gap-3">
  {/* Icono compartir (todos) */}
  <button
    onClick={() => setModalShare(true)}
    className="p-1 rounded-full hover:bg-black/10 transition"
    title="Compartir agenda"
  >
    <Share2 className="w-6 h-6 opacity-80 hover:opacity-100 transition" />
  </button>

  {/* Icono estadísticas (solo DUEÑO) */}
  {modo === "dueño" && (
    <button
      onClick={() => setModalEstadisticas(true)}
      className="p-1 rounded-full hover:bg-black/10 transition"
      title="Ver estadísticas"
    >
      <img
        src={IconEstadisticas}
        alt="Estadísticas"
        className="w-7 h-7 icono-blanco opacity-80 hover:opacity-100 transition"
      />
    </button>
  )}

  {/* Icono configuración (solo DUEÑO) */}
  {modo === "dueño" && (
    <button
      onClick={() => setModalPerfil(true)}
      className="p-1 rounded-full hover:bg-black/10 transition"
      title="Configurar perfil"
    >
      <ConfigIcon className="w-7 h-7 opacity-80 hover:opacity-100 transition" />
    </button>
  )}
</div>
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
      relative
      font-euphoria
      text-[34px]
      md:text-[48px]
      leading-none
      tracking-wide
      mt-4
      text-white
    "
    style={{
      textShadow: "0 2px 6px rgba(0,0,0,0.45)",
      WebkitTextStroke: "0.3px rgba(255,255,255,0.30)",
      WebkitTextFillColor: "#ffffff",
    }}
  >
    {negocio.nombre}
  </h1>

  {/* Descripción */}
  <p className="opacity-80 text-center mt-4 px-4">
    {negocio.descripcion || "Sin descripción."}
  </p>


{/* Agujeros inferiores del header (para los ganchos) */}
<div className="absolute -bottom-2 left-0 right-0 flex justify-between px-8 md:justify-around md:px-20 pointer-events-none">
  {[...Array(4)].map((_, i) => (
    <div
      key={i}
      className="w-5 h-5 rounded-full bg-[var(--color-fondo)] shadow-[inset_0_2px_6px_rgba(0,0,0,0.6)]"
    />
  ))}
</div>
</div>

{/* NAV CON GANCHOS DE AGENDA */}
<div className="relative w-full max-w-3xl mt-6">
{/* Ganchos de espiral */}
<div className="absolute -top-0 left-0 right-0 flex justify-between px-8 md:justify-around md:px-20 pointer-events-none z-[100]">
  {[...Array(4)].map((_, i) => (
    <div key={i} className="relative flex flex-col items-center">
      {/* Gancho superior */}
      <div 
        className="absolute -top-7 left-1/2 -translate-x-1/2 w-3 h-10 rounded-t-full shadow-md"
        style={{
          background: 'linear-gradient(to bottom, #d1d5db 0%, #9ca3af 50%, #374151 80%, #1f2937 100%)'
        }}
      />
      {/* Anillo del gancho */}
      <div className="w-6 h-6 rounded-full border-4 border-gray-400 bg-[var(--color-fondo)] shadow-[inset_0_2px_4px_rgba(0,0,0,0.5),0_2px_4px_rgba(0,0,0,0.3)]" />
    </div>
  ))}
</div>

  {/* Barra del nav */}
  <div
    className="
     w-full px-3 pt-10 md:pt-6 pb-5 md:pb-3 rounded-3xl flex justify-around gap-2
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
          mostrarAlerta = serviciosState.length === 0;
        } else if (item.id === "ubicacion") {
          mostrarAlerta = !ubicacion;
        } else if (item.id === "empleados") {
          mostrarAlerta = !esEmprendimiento && hayEmpleadosIncompletos;
        }
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
    transition-all duration-300 animate-fadeSlideIn
    animate-[fadeSlideIn_0.3s_ease-out]
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
  {/* CONFIG PARA EMPLEADOS (solo DUEÑO) */}
  {vista === "empleados" && puedeConfigServiciosYEmpleados && (
    <button
      onClick={() => {
        if (esEmprendimiento) {
          setModalEmprendimiento(true);
        } else {
          setModalEmpleados(true);
        }
      }}
      className="absolute top-4 right-4 z-20"
      title={
        esEmprendimiento
          ? "Configurar emprendimiento"
          : "Administrar empleados"
      }
    >
      <ConfigIcon className="w-7 h-7 opacity-80 hover:opacity-100 transition" />
    </button>
  )}

  {/* 👇 ya sin la tuerca de servicios */}

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
            negocio={{
              ...negocio,
              esEmprendimiento, // 👈 le pasamos el flag que ya tenés en AgendaVirtualUIv3
            }}
          />
        )}

        {modalPerfil && (
          <ModalPerfil
            abierto={modalPerfil}
            onCerrar={() => setModalPerfil(false)}
            negocio={negocio}
            onGuardar={handleGuardarPerfil}
          />
        )}

        {modalEmpleados && (
          <ModalEmpleadosUI
            abierto={modalEmpleados}
            onCerrar={() => setModalEmpleados(false)}
            negocioId={negocio.id}
            modo={modo === "cliente" ? "dueño" : modo}
            esEmprendimiento={esEmprendimiento} // 👈 este sí lo mantiene ModalEmpleadosUI
          />
        )}

        {modalEmprendimiento && (
          <ModalEmprendimiento
            abierto={modalEmprendimiento}
            onCerrar={() => setModalEmprendimiento(false)}
            negocio={negocio}
          />
        )}

        {modalServicios && (
          <ModalAgregarServicios
            abierto={modalServicios}
            onCerrar={() => setModalServicios(false)}
            negocioId={negocio.id}
            esEmprendimiento={esEmprendimiento} // 👈 pasar el flag
          />
        )}

        {modalEstadisticas && (
          <ModalEstadisticas
            abierto={modalEstadisticas}
            onCerrar={() => setModalEstadisticas(false)}
            negocio={negocio}
            empleados={empleadosParaAgenda}
            turnos={turnos}
          />
        )}
      </div>
    </>
  );
}
