import { useState, useEffect } from "react";
import ConfigIcon from "../../../assets/config-svg.svg?url";
import { obtenerDireccion } from "../../../lib/geocoding";
import { useRef } from "react";
import ModalEmpleadosUI from "./modalEmpleadosUI";
import ModalAgregarServicios from "../modalAgregarServicios";
import { inicializarTema } from "../../../lib/temaColores";
import SelectorTema from "../ui/SelectorTema";

import ModalShare from "./share";
import { 
  doc, 
  updateDoc, 
  collection, 
  query, 
  where, 
  getDocs,
  onSnapshot,
} from "firebase/firestore";
import ModalAgendarse from "./modalAgendarse";
import { db } from "../../../lib/firebase";
import FloatingMenu from "../../ui/floatingMenu";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination, Autoplay } from "swiper/modules";
import ModalPerfil from "../ui/modalPerfil"; // 👈 asegurate de importar el modal
import { useAgendaCache } from "../../../hooks/useAgendaCache";
import {
  subirLogoNegocio,
  agregarServicio,
  actualizarNombreYSlug,
  escucharServicios, 
  guardarUbicacionNegocio
} from "../backend/agenda-backend";
import CalendarioUI from "../ui/calendarioUI";
import { Instagram, Facebook, Phone, Music } from "lucide-react";
import AgendaNegocio from "./agendaNegocio";
import ShareIcon from "../../../assets/share.svg?url";

// 🌍 Leaflet
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import LoaderSpinner from "../../ui/loaderSpinner"; 
import ModalCalendario from "../ui/modalCalendario";


// ✅ Icono personalizado para Leaflet
const customIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});



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

export type Empleado = {
  id?: string;
  nombre: string;
  foto?: string;       // 👈 usamos solo "foto"
  especialidad?: string;
  calendario?: any;
};


type Servicio = {
  id?: string;
  servicio: string;
  precio: number;
  duracion: number;
};

type Negocio = {
  id: string;  
  nombre: string;
  direccion?: string;
  slug: string;
  perfilLogo?: string;
  bannerUrl?: string;
  servicios?: Servicio[];
  descripcion?: string;
  empleadosData?: any[];
  ubicacion?: {
    lat: number;
    lng: number;
    direccion: string;
  };
  redes?: {
    instagram?: string;
    facebook?: string;
    telefono?: string;  // puede ser WhatsApp o número normal
  };
    tema?: {
    colorPrimario: string;
    colorFondo: string;
    colorPrimarioOscuro: string;
  };

};

type Props = {
  empleados: Empleado[];
  turnos: Turno[];
  negocio: Negocio;
  modo: "dueño" | "cliente" | "admin"; // 👑 ahora soporta admin
  plan: "gratis" | "lite" | "gold";
  usuario?: {
    nombre?: string;
    fotoPerfil?: string;
    email?: string; // 👈 importante para validar contra adminEmail
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


  // 👇 Estados para servicios
  const [modalServiciosAbierto, setModalServiciosAbierto] = useState(false);
const [modalCalendarioAbierto, setModalCalendarioAbierto] = useState(false);
const [modalAgendarseAbierto, setModalAgendarseAbierto] = useState(false);


  // 👇 Estados para editar nombre/slug
  const [editandoNombre, setEditandoNombre] = useState(false);
  const [nuevoNombreNegocio, setNuevoNombreNegocio] = useState(negocio.nombre);
  const [nombreNegocio, setNombreNegocio] = useState(negocio.nombre);

const scrollRef = useRef<HTMLDivElement>(null);

const handleMouseDown = (e: React.MouseEvent) => {
  const slider = scrollRef.current;
  if (!slider) return;

  let startX = e.pageX - slider.offsetLeft;
  let scrollLeft = slider.scrollLeft;

  const handleMouseMove = (e: MouseEvent) => {
    const x = e.pageX - slider.offsetLeft;
    const walk = x - startX;
    slider.scrollLeft = scrollLeft - walk;
  };

  const handleMouseUp = () => {
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);
  };

  document.addEventListener("mousemove", handleMouseMove);
  document.addEventListener("mouseup", handleMouseUp);
};


const puedeEditar = (tipo: "servicios" | "empleados" | "perfil" | "ubicacion") => {
  if (modo === "dueño") return true;

  if (modo === "admin" && usuario?.email) {
    const empleadoAdmin = empleadosState.find(
      (e: any) => e.admin === true && e.adminEmail === usuario.email
    );
    // 👉 admin solo puede editar servicios y su perfil propio
    if (empleadoAdmin) {
      return tipo === "empleados" || tipo === "perfil";
    }
  }

  return false;
};


 // 👇 Hook para logo
  const [logo, setLogo] = useAgendaCache<string>(
    negocio.slug,
    "logo",
    negocio.perfilLogo || ""
  );

  // 👇 Hook para empleados
  const [empleadosState, setEmpleadosState] = useAgendaCache(
    negocio.slug,
    "empleados",
    empleados || []
  );

  // 👇 Hook para servicios
  const [servicios, setServicios] = useAgendaCache(
    negocio.slug,
    "servicios",
    negocio.servicios || []
  );



// 👇 Estados para descripción
const [nuevaDescripcion, setNuevaDescripcion] = useState(negocio.descripcion || "");
const [editandoDescripcion, setEditandoDescripcion] = useState(false);
const [modalAbierto, setModalAbierto] = useState(false);
const [modalPerfilAbierto, setModalPerfilAbierto] = useState(false);
// 👇 Estado único para ModalCalendarioCliente
const [modalClienteAbierto, setModalClienteAbierto] = useState(false);
const [redes, setRedes] = useState<Negocio["redes"]>(negocio.redes || {});
const [modalShareAbierto, setModalShareAbierto] = useState(false);
const handleGuardarUbicacion = () => {
  if (!navigator.geolocation) {
    console.error("⚠️ Tu navegador no soporta geolocalización.");
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

        // ✅ Mostrar estado de éxito
        setEstadoUbicacion("exito");
        setTimeout(() => setEstadoUbicacion("idle"), 3000);
      } catch (err) {
        console.error("❌ Error al guardar ubicación:", err);
        setEstadoUbicacion("idle");
      }
    },
    (err) => {
      console.error("❌ Error al obtener ubicación:", err);
      setEstadoUbicacion("idle");
    },
    { enableHighAccuracy: true, timeout: 10000 }
  );
};


// 👇 Estado para manejar ubicación actual
const [ubicacion, setUbicacion] = useState<Negocio["ubicacion"] | null>(
  negocio.ubicacion || null
);
// 👇 Estado para controlar el botón de ubicación
const [estadoUbicacion, setEstadoUbicacion] = useState<
  "idle" | "cargando" | "exito"
>("idle");


const handleGuardarDescripcion = async () => {
  try {
    if (!nuevaDescripcion.trim()) return;

    // 👉 Buscar negocio por slug
    const q = query(collection(db, "Negocios"), where("slug", "==", negocio.slug));
    const snap = await getDocs(q);

    if (snap.empty) {
      throw new Error("❌ No se encontró un negocio con ese slug");
    }

    // ✅ Obtenemos el ID real del documento
    const negocioId = snap.docs[0].id;
    const negocioRef = doc(db, "Negocios", negocioId);

    await updateDoc(negocioRef, {
      descripcion: nuevaDescripcion.trim(),
    });

    console.log("✅ Descripción guardada en Firestore");
    // actualizar estado local también
    setEditandoDescripcion(false);
  } catch (err) {
    console.error("❌ Error al guardar descripción:", err);
    alert("No se pudo guardar la descripción");
  }
};

  // 👉 Guardar nuevo nombre + slug
  const handleGuardarNombre = async () => {
    if (!nuevoNombreNegocio.trim()) return;
    try {
      const nuevoSlug = await actualizarNombreYSlug(
        negocio.slug,
        nuevoNombreNegocio
      );
      setNombreNegocio(nuevoNombreNegocio);
      setEditandoNombre(false);

      // 🔄 Redirigir automáticamente a la nueva URL
      window.location.href = `/agenda/${nuevoSlug}`;
    } catch (err) {
      console.error("❌ Error al actualizar nombre/slug:", err);
      alert("❌ No se pudo actualizar el nombre/slug");
    }
  };

  // 👉 Subir logo
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

useEffect(() => {
  if (!negocio?.slug) return;

  // 👉 Escuchar servicios
  let unsubscribeServicios: () => void;

  escucharServicios(negocio.slug, (servs) => {
    setServicios(servs);
  }).then((unsub) => {
    unsubscribeServicios = unsub;
  });

  // 👉 Escuchar empleados (si seguís usando backend)
  let unsubscribeEmpleados: () => void;
  import("../backend/agenda-backend").then(({ escucharEmpleados }) => {
    escucharEmpleados(negocio.slug, (emps) => {
      setEmpleadosState(emps); // 👈 refresca empleados
    }).then((unsub) => {
      unsubscribeEmpleados = unsub;
    });
  });

// 👇 Definimos q
const q = query(
  collection(db, "Negocios"),
  where("slug", "==", negocio.slug)
);

const unsubscribeNegocio = onSnapshot(q, (snap: any) => {
  if (!snap.empty) {
    const data = snap.docs[0].data() as Negocio;

    console.log("Negocio cargado:", data);

    if (data.empleadosData) {
      setEmpleadosState(data.empleadosData);
    }

    if (data.ubicacion) {
      setUbicacion(data.ubicacion);
    }

    if (data.redes) {
      setRedes(data.redes);
    }

    // 🎨 Aplicar tema guardado en Firestore
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
      });
    } else {
      // 👇 Si no hay tema guardado, aplicar gris por defecto
      document.documentElement.style.setProperty("--color-primario", "#262626");
      document.documentElement.style.setProperty("--color-fondo", "#171717");
      document.documentElement.style.setProperty(
        "--color-primario-oscuro",
        "#0a0a0a"
      );
    }
  }
});




  // 🔹 Limpieza de listeners
  return () => {
    if (unsubscribeServicios) unsubscribeServicios();
    if (unsubscribeEmpleados) unsubscribeEmpleados();
    unsubscribeNegocio();
  };
}, [negocio.slug, modalAbierto]);
useEffect(() => {
  inicializarTema();
}, []);

  return (
    <div className="w-full min-h-screen bg-[var(--color-fondo)] text-white transition-colors duration-300">

{/* Banner */}
<div className="hidden md:flex justify-center">
  <div
    className="w-full max-w-7xl h-96 relative rounded-b-2xl overflow-hidden transition-colors duration-300"
    style={{
      backgroundColor:
        negocio.bannerUrl || logo || negocio.perfilLogo
          ? "transparent"
          : "var(--color-primario)",
    }}
  >
    {negocio.bannerUrl || logo || negocio.perfilLogo ? (
      <img
        src={
          logo
            ? logo
            : negocio.bannerUrl
            ? negocio.bannerUrl
            : negocio.perfilLogo
            ? negocio.perfilLogo
            : "/banner-default.webp"
        }
        alt={nombreNegocio}
        className="w-full h-full object-cover"
      />
    ) : (
      <div className="w-full h-full flex items-center justify-center text-white text-2xl font-semibold">
        {nombreNegocio}
      </div>
    )}
  </div>
</div>

      {/* Contenido */}
<div className="relative md:-mt-16 px-4 pb-10">
<div className="w-full max-w-6xl mx-auto flex flex-col gap-6 md:grid md:grid-cols-[60%_40%] md:items-stretch">

      {/* Columna izquierda -> servicios y empleados */}
<div className="flex flex-col gap-6 order-2 md:order-1">

            {/* Servicios */}
<div className="order-1 bg-[var(--color-primario)] rounded-2xl p-6 shadow-lg relative transition-colors duration-300">

  {/* 🔧 Botón Configuración */}
  {(modo === "dueño" || modo === "admin") && (
    <button
      onClick={() => setModalServiciosAbierto(true)}
      className="absolute top-4 right-4"
    >
      <img
        src={ConfigIcon}
        alt="Configurar servicios"
        className="w-6 h-6 opacity-80 hover:opacity-100 transition filter invert"
      />
    </button>
  )}

  <h2 className="text-lg font-semibold mb-4">Servicios</h2>

  {servicios && servicios.length > 0 ? (
    <Swiper
      modules={[Pagination, Autoplay]}
      spaceBetween={8} // 👈 pequeño espacio entre cards
      pagination={{ clickable: true }}
      autoplay={{ delay: 2000, disableOnInteraction: false }}
      loop={true} // 🔄 carrusel infinito
      className="!w-full !h-auto custom-swiper pb-10"
      breakpoints={{
        320: { slidesPerView: 2.5 },   // 📱 Mobile
        640: { slidesPerView: 3.5 },   // 📲 Tablet
        1024: { slidesPerView: 4 },    // 💻 PC
      }}
    >
      {servicios.map((s, idx) => (
        <SwiperSlide key={s.id || idx} className="flex justify-center">
          <div
  className="flex flex-col justify-center items-center 
  w-32 h-auto min-h-[96px] rounded-xl p-2 text-center transition-colors duration-300"
  style={{
    backgroundColor: "var(--color-primario-oscuro, #171717)", // negro por defecto
  }}
>

            <p className="font-medium text-white text-sm text-center whitespace-normal break-words leading-tight">
              {s.servicio}
            </p>
            <span className="text-sm text-gray-400">${s.precio}</span>
            <span className="text-xs text-gray-500">{s.duracion} min</span>
          </div>
        </SwiperSlide>
      ))}
    </Swiper>
  ) : (
    <div className="w-full flex justify-start mt-2">
      {(modo === "dueño" || modo === "admin") ? (
        <button
          onClick={() => setModalServiciosAbierto(true)}
          className="w-32 h-24 flex items-center justify-center 
                     border-2 border-dashed border-gray-500 rounded-xl 
                     hover:border-white transition"
        >
          <span className="text-3xl text-gray-400">+</span>
        </button>
      ) : (
        <p className="text-gray-400 text-sm">No hay servicios cargados.</p>
      )}
    </div>
  )}

  {/* ✅ Modal para agregar servicios (dueño o admin) */}
  {(modo === "dueño" || modo === "admin") && (
    <ModalAgregarServicios
      abierto={modalServiciosAbierto}
      onCerrar={() => setModalServiciosAbierto(false)}
      negocioId={negocio.id}
    />
  )}
</div>
<ModalPerfil
  abierto={modalPerfilAbierto}
  onCerrar={() => setModalPerfilAbierto(false)}
  negocio={{ ...negocio, redes }}
  onGuardar={async (data) => {
    try {
      let nuevoSlug = negocio.slug;

      // 👉 Si cambia el nombre, también actualizamos el slug
      if (data.nombre && data.nombre !== negocio.nombre) {
        nuevoSlug = await actualizarNombreYSlug(negocio.id, data.nombre); // 🔹 ahora usa negocio.id
        setNombreNegocio(data.nombre);

        // 🔄 Redirigir si cambió el slug
        if (nuevoSlug !== negocio.slug) {
          window.location.href = `/agenda/${nuevoSlug}`;
          return;
        }
      }

      // 👉 Guardar otros campos usando negocio.id (no depende del slug)
      const negocioRef = doc(db, "Negocios", negocio.id);
      await updateDoc(negocioRef, {
        perfilLogo: data.perfilLogo ?? negocio.perfilLogo ?? "",
        descripcion: data.descripcion ?? negocio.descripcion ?? "",
        "redes.instagram": data.redes?.instagram ?? negocio.redes?.instagram ?? "",
        "redes.facebook":  data.redes?.facebook  ?? negocio.redes?.facebook  ?? "",
        "redes.telefono":  data.redes?.telefono  ?? negocio.redes?.telefono  ?? "",
      });

      // 👉 Actualizar estado local
      if (data.perfilLogo) setLogo(data.perfilLogo);
      if (data.descripcion !== undefined) setNuevaDescripcion(data.descripcion);
      if (data.redes) setRedes(data.redes);

    } catch (err: any) {
      console.error("❌ Error al guardar perfil:", err);
    }
  }}
/>
            {/* Empleados */}
<div className="order-2 bg-[var(--color-primario)] rounded-2xl p-6 relative shadow-lg transition-colors duration-300">

  <h2 className="text-lg font-semibold mb-4">Empleados</h2>

  {/* 👑 Dueño y Admin pueden abrir el modal de empleados de ESTE negocio */}
  {(modo === "dueño" || modo === "admin") && (
    <>
      <button
        onClick={() => setModalAbierto(true)}
        className="absolute top-4 right-4"
      >
        <img
          src={ConfigIcon}
          alt="Configurar empleados"
          className="w-6 h-6 opacity-80 hover:opacity-100 transition filter invert"
        />
      </button>

      {/* Modal empleados → siempre abre el del negocio actual */}
      <ModalEmpleadosUI
  abierto={modalAbierto}
  onCerrar={() => setModalAbierto(false)}
  negocioId={negocio.id}
  modo={modo}              // 👈 ahora sabe si soy dueño o admin
  userUid={usuario?.email} // 👈 para validar contra adminEmail o id
/>

    </>
  )}

  <div className="flex gap-6 flex-wrap mt-2 justify-center">
    {empleadosState && empleadosState.length > 0 ? (
      empleadosState.map((e, idx) => (
        <button
          key={idx}
          onClick={() => setEmpleadoSeleccionado(e)}
          className="relative w-24 h-24 rounded-full bg-neutral-900 hover:bg-neutral-700 transition flex items-center justify-center"
        >
          {e.foto ? (
            <img
              src={e.foto}
              alt={e.nombre || "Empleado"}
              className="w-24 h-24 rounded-full object-cover border-4 border-white"
            />
          ) : (
            <div className="w-24 h-24 rounded-full bg-indigo-500 flex items-center justify-center font-bold text-white border-4 border-black text-xl">
              {e.nombre ? e.nombre.charAt(0) : "?"}
            </div>
          )}
        </button>
      ))
    ) : (
      <p className="text-gray-400 text-sm">No hay empleados cargados.</p>
    )}
  </div>
</div>

           {/* Calendario + Botón Agendarse */}
{(modo === "dueño" || modo === "admin") && (
  <div className="order-3 bg-[var(--color-primario)] rounded-2xl p-6 shadow-lg flex flex-col relative md:hidden transition-colors duration-300">

    <AgendaNegocio
      negocio={{
        id: negocio.id,
        nombre: negocio.nombre,
        empleadosData: empleadosState || empleados || [],
        slug: negocio.slug,
      }}
    />
  </div>
)}

<div className="order-3 bg-[var(--color-primario)] rounded-2xl p-6 shadow-lg hidden md:flex flex-col relative transition-colors duration-300">

  {(modo === "dueño" || modo === "admin") ? (
    <div className="order-3 w-full">
      <AgendaNegocio
        negocio={{
          id: negocio.id,
          nombre: negocio.nombre,
          empleadosData: empleadosState || empleados || [],
          slug: negocio.slug,
        }}
      />
    </div>
  ) : modo === "cliente" ? (
    <div className="w-full justify-center flex">
      <button
        onClick={() => setModalAgendarseAbierto(true)}
        className="px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-xl font-medium transition"
      >
        📅 Reservar turno
      </button>
    </div>
  ) : null}
</div>

{/* 🔹 Mobile → mapa debajo de AgendaNegocio */}
<div className="order-4 bg-[var(--color-primario)] rounded-2xl p-6 shadow-lg flex flex-col items-stretch relative md:hidden mt-4 transition-colors duration-300">

  <h2 className="text-lg font-semibold mb-4">
    {(modo === "dueño" || modo === "admin")
      ? "Mi ubicación"
      : `Ubicación de ${nombreNegocio}`}
  </h2>

  {/* Si no hay ubicación */}
  {!ubicacion && (
    <>
      {(modo === "dueño" || modo === "admin") ? (
        <button
          onClick={handleGuardarUbicacion}
          disabled={estadoUbicacion === "cargando"}
          className={`px-4 py-2 rounded-md flex items-center justify-center gap-2 transition ${
            estadoUbicacion === "cargando"
              ? "bg-gray-600 text-white"
              : estadoUbicacion === "exito"
              ? "bg-green-600 text-white"
              : "bg-indigo-600 hover:bg-indigo-700 text-white"
          }`}
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
        <p className="text-gray-400 text-sm">Ubicación no disponible.</p>
      )}
    </>
  )}

  {/* Si hay ubicación */}
  {ubicacion && (
    <div className="w-full flex flex-col gap-4">
      <div className="h-64 rounded-md overflow-hidden border">
        <MapContainer
          key={`${ubicacion.lat}-${ubicacion.lng}`}
          center={[ubicacion.lat, ubicacion.lng]}
          zoom={16}
          style={{ width: "100%", height: "100%" }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; OpenStreetMap contributors'
          />
          <Marker
            position={[ubicacion.lat, ubicacion.lng]}
            icon={customIcon}
            draggable={modo === "dueño" || modo === "admin"}
            eventHandlers={
              (modo === "dueño" || modo === "admin")
                ? {
                    dragend: async (e) => {
                      const newPos = e.target.getLatLng();
                      const direccion = await obtenerDireccion(
                        newPos.lat,
                        newPos.lng
                      );
                      const nuevaUbicacion = {
                        lat: newPos.lat,
                        lng: newPos.lng,
                        direccion,
                      };
                      await guardarUbicacionNegocio(
                        negocio.slug,
                        nuevaUbicacion
                      );
                      setUbicacion(nuevaUbicacion);
                    },
                  }
                : {}
            }
          >
            {(modo === "dueño" || modo === "admin") && (
              <Popup>Mueve el pin si la ubicación no es correcta</Popup>
            )}
          </Marker>
        </MapContainer>
      </div>

      {/* Botón solo para dueño o admin */}
      {(modo === "dueño" || modo === "admin") && (
        <div className="flex justify-end w-full">
          <button
            onClick={handleGuardarUbicacion}
            disabled={estadoUbicacion === "cargando"}
            className={`px-3 py-1.5 text-sm rounded-md flex items-center gap-2 transition ${
              estadoUbicacion === "cargando"
                ? "bg-gray-600 text-white"
                : estadoUbicacion === "exito"
                ? "bg-green-600 text-white"
                : "bg-indigo-600 hover:bg-indigo-700 text-white"
            }`}
          >
            {estadoUbicacion === "cargando" && (
              <>
                <LoaderSpinner size={14} color="white" />
                Cargando nueva ubicación...
              </>
            )}
            {estadoUbicacion === "exito" && "✅ Se ha cambiado la ubicación"}
            {estadoUbicacion === "idle" && "📍 Actualizar mi ubicación"}
          </button>
        </div>
      )}
    </div>
  )}
</div>

{/* Modal Agendarse */}
{modalAgendarseAbierto && (
  <ModalAgendarse
    abierto={modalAgendarseAbierto}
    onClose={() => setModalAgendarseAbierto(false)}
    negocio={negocio}
  />
)}

{/* Modal Agendarse */}
{modalAgendarseAbierto && (
  <ModalAgendarse
    abierto={modalAgendarseAbierto}
    onClose={() => setModalAgendarseAbierto(false)}
    negocio={negocio}
  />
)}

</div>
            {/* Columna derecha */}
<div className="flex flex-col gap-6 md:order-2 md:pr-6">
      
      {/* Columna derecha -> Perfil */}
<div className="order-1 md:order-2 bg-[var(--color-primario)] rounded-2xl p-6 flex flex-col items-center text-center shadow-lg relative mt-10 md:mt-0 transition-colors duration-300">

  {/* ⚙️ Tuerca */}
  {modo === "dueño" && (
    <button
      onClick={() => setModalPerfilAbierto(true)}
      className="absolute top-4 right-4"
    >
      <img
        src={ConfigIcon}
        alt="Configurar negocio"
        className="w-6 h-6 opacity-80 hover:opacity-100 transition filter invert"
      />
    </button>
  )}

  {/* Logo */}
  <div className="mt-8 relative w-24 h-24">
    {subiendo ? (
      <div className="w-24 h-24 rounded-full bg-neutral-800 flex items-center justify-center border-4 border-white">
        <LoaderSpinner />
      </div>
    ) : logo ? (
      <img
        src={logo}
        alt="Logo negocio"
        className="w-24 h-24 rounded-full object-cover border-4 border-white"
      />
    ) : (
      <div className="w-24 h-24 rounded-full bg-gray-700 flex items-center justify-center text-3xl font-bold border-4 border-black">
        {nombreNegocio.charAt(0)}
      </div>
    )}

    {modo === "dueño" && (
      <>
        <label
          htmlFor="upload-logo"
          className="absolute bottom-2 right-2 bg-[var(--color-primario)] text-white w-8 h-8 flex items-center justify-center rounded-full cursor-pointer border-2 border-white text-lg transition-colors duration-300 hover:opacity-80"
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
  </div>

  {/* Nombre y slug */}
  <div className="mt-4">
    <p className="text-lg font-semibold">{nombreNegocio}</p>
  </div>

  {/* Redes sociales */}
  <div className="mt-6 flex items-center justify-center gap-4">
    {/* Instagram */}
    <a
      href={redes?.instagram || "#"}
      target={redes?.instagram ? "_blank" : "_self"}
      rel="noopener noreferrer"
      className={`w-8 h-8 flex items-center justify-center rounded-full border border-white/20 transition-colors duration-300 ${
        redes?.instagram
          ? "bg-[var(--color-primario)] hover:opacity-80"
          : "bg-[var(--color-primario-oscuro)] opacity-40 cursor-not-allowed"
      }`}
    >
      <Instagram className="w-4 h-4 text-white" />
    </a>

    {/* Facebook */}
    <a
      href={redes?.facebook || "#"}
      target={redes?.facebook ? "_blank" : "_self"}
      rel="noopener noreferrer"
      className={`w-8 h-8 flex items-center justify-center rounded-full border border-white/20 transition-colors duration-300 ${
        redes?.facebook
          ? "bg-[var(--color-primario)] hover:opacity-80"
          : "bg-[var(--color-primario-oscuro)] opacity-40 cursor-not-allowed"
      }`}
    >
      <Facebook className="w-4 h-4 text-white" />
    </a>

    {/* Teléfono / WhatsApp */}
    <a
      href={
        redes?.telefono
          ? redes.telefono.startsWith("+")
            ? `https://wa.me/${redes.telefono.replace(/\D/g, "")}`
            : `tel:${redes.telefono}`
          : "#"
      }
      target={redes?.telefono ? "_blank" : "_self"}
      rel="noopener noreferrer"
      className={`w-8 h-8 flex items-center justify-center rounded-full border border-white/20 transition-colors duration-300 ${
        redes?.telefono
          ? "bg-[var(--color-primario)] hover:opacity-80"
          : "bg-[var(--color-primario-oscuro)] opacity-40 cursor-not-allowed"
      }`}
    >
      <Phone className="w-4 h-4 text-white" />
    </a>

    {/* Compartir (abre modal con link copiado) */}
    <button
      onClick={() => setModalShareAbierto(true)}
      className="w-8 h-8 flex items-center justify-center rounded-full border border-white/20 transition-colors duration-300 bg-[var(--color-primario)] hover:opacity-80"
      title="Compartir agenda"
    >
      <img src={ShareIcon} alt="Compartir" className="w-4 h-4 invert" />
    </button>

    {/* Modal compartir */}
    <ModalShare
      abierto={modalShareAbierto}
      onCerrar={() => setModalShareAbierto(false)}
      slug={negocio.slug}
    />
  </div>

  {/* Descripción editable */}
  <div className="mt-6 w-full px-2">
    {modo === "dueño" ? (
      <div className="flex flex-col items-stretch gap-2 w-full">
        <textarea
          maxLength={200}
          rows={4}
          style={{
            minHeight: "4rem",
            overflow: editandoDescripcion ? "auto" : "hidden",
          }}
          placeholder="Escribe una descripción de tu negocio (máx 200 caracteres)"
          className={`w-full text-sm text-center text-white resize-none outline-none transition break-words whitespace-pre-wrap ${
            editandoDescripcion
              ? "bg-[var(--color-primario-oscuro)] rounded p-2"
              : "bg-transparent"
          }`}
          value={nuevaDescripcion}
          onFocus={() => setEditandoDescripcion(true)}
          onBlur={() => {
            if (nuevaDescripcion.trim() === (negocio.descripcion || "")) {
              setEditandoDescripcion(false);
            }
          }}
          onInput={(e) => {
            const el = e.target as HTMLTextAreaElement;
            el.style.height = "auto";
            el.style.height = el.scrollHeight + "px";
            setNuevaDescripcion(el.value);
          }}
        />
        {editandoDescripcion && (
          <button
            onClick={handleGuardarDescripcion}
            disabled={nuevaDescripcion.trim() === (negocio.descripcion || "")}
            className={`px-4 py-2 rounded font-medium transition ${
              nuevaDescripcion.trim() === (negocio.descripcion || "")
                ? "bg-gray-600 text-gray-300 cursor-not-allowed"
                : "bg-indigo-600 hover:bg-indigo-700 text-white"
            }`}
          >
            Guardar
          </button>
        )}
      </div>
    ) : (
      <p className="text-gray-300 text-sm text-center break-words whitespace-pre-wrap">
        {negocio.descripcion || "Este negocio aún no tiene descripción."}
      </p>
    )}
  </div>
</div>
{/* 🔹 Fin Perfil */}


{/* Columna derecha -> Mapa */}
<div className="hidden md:flex order-5 md:order-2 bg-[var(--color-primario)] rounded-2xl p-6 flex-col items-center text-center shadow-lg relative transition-colors duration-300">
  {/* Botón inicial si no hay ubicación */}
  {modo === "dueño" && !ubicacion && (
    <button
      onClick={handleGuardarUbicacion}
      disabled={estadoUbicacion === "cargando"}
      className={`px-4 py-2 rounded-md flex items-center gap-2 transition ${
        estadoUbicacion === "cargando"
          ? "bg-gray-600 text-white"
          : estadoUbicacion === "exito"
          ? "bg-green-600 text-white"
          : "bg-indigo-600 hover:bg-indigo-700 text-white"
      }`}
    >
      {estadoUbicacion === "cargando" && (
        <>
          <LoaderSpinner size={20} color="white" />
          Buscando nueva ubicación...
        </>
      )}
      {estadoUbicacion === "exito" && "✅ Se cargó la nueva ubicación"}
      {estadoUbicacion === "idle" && "Usar mi ubicación actual"}
    </button>
  )}

  {/* Mapa y botón actualizar */}
{ubicacion && (
  <div className="w-full flex flex-col gap-4">
    <div className="h-64 rounded-md overflow-hidden border">
      <MapContainer
        key={`${ubicacion.lat}-${ubicacion.lng}`}
        center={[ubicacion.lat, ubicacion.lng]}
        zoom={16}
        style={{ width: "100%", height: "100%" }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; OpenStreetMap contributors'
        />
        <Marker
          position={[ubicacion.lat, ubicacion.lng]}
          icon={customIcon}
          draggable={modo === "dueño" || modo === "admin"}
          eventHandlers={
            (modo === "dueño" || modo === "admin")
              ? {
                  dragend: async (e) => {
                    const newPos = e.target.getLatLng();
                    const direccion = await obtenerDireccion(
                      newPos.lat,
                      newPos.lng
                    );
                    const nuevaUbicacion = {
                      lat: newPos.lat,
                      lng: newPos.lng,
                      direccion,
                    };
                    await guardarUbicacionNegocio(
                      negocio.slug,
                      nuevaUbicacion
                    );
                    setUbicacion(nuevaUbicacion);
                  },
                }
              : {}
          }
        >
          {(modo === "dueño" || modo === "admin") && (
            <Popup>Mueve el pin si la ubicación no es correcta</Popup>
          )}
        </Marker>
      </MapContainer>
    </div>

    {/* Botón actualizar ubicación */}
    {(modo === "dueño" || modo === "admin") && (
      <div className="flex justify-end w-full">
        <button
          onClick={handleGuardarUbicacion}
          disabled={estadoUbicacion === "cargando"}
          className={`px-3 py-1.5 text-sm rounded-md flex items-center gap-2 transition ${
            estadoUbicacion === "cargando"
              ? "bg-gray-600 text-white"
              : estadoUbicacion === "exito"
              ? "bg-green-600 text-white"
              : "bg-indigo-600 hover:bg-indigo-700 text-white"
          }`}
        >
          {estadoUbicacion === "cargando" && (
            <>
              <LoaderSpinner size={14} color="white" />
              Buscando...
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
</div>
{/* 🔹 Fin Mapa */}

               </div>
      </div>

      {/* 🔹 Botón flotante solo para clientes */}
{modo === "cliente" && <FloatingMenu negocio={negocio} />}
    </div>
  );
}
