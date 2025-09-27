import { useState, useEffect } from "react";
import ConfigIcon from "../../../assets/config-svg.svg?url";
import { obtenerDireccion } from "../../../lib/geocoding";
import { useRef } from "react";
import ModalEmpleadosUI from "./modalEmpleadosUI";
import ModalAgregarServicios from "../modalAgregarServicios";
import { 
  doc, 
  updateDoc, 
  collection, 
  query, 
  where, 
  getDocs,
  onSnapshot,
} from "firebase/firestore";

import { db } from "../../../lib/firebase";
import FloatingMenu from "../../ui/floatingMenu";


import {
  subirLogoNegocio,
  agregarServicio,
  actualizarNombreYSlug,
  escucharServicios, 
  guardarUbicacionNegocio
} from "../backend/agenda-backend";
import CalendarioUI from "../ui/calendarioUI";
import { Instagram, Facebook, Phone, Music } from "lucide-react";

// 🌍 Leaflet
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import LoaderSpinner from "../../ui/loaderSpinner"; 

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
  ubicacion?: {
    lat: number;
    lng: number;
    direccion: string;
  };  // 👈 agregado
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

  // 👇 Estados para servicios
  const [modalServiciosAbierto, setModalServiciosAbierto] = useState(false);


  // 👇 Estados para editar nombre/slug
  const [editandoNombre, setEditandoNombre] = useState(false);
  const [nuevoNombreNegocio, setNuevoNombreNegocio] = useState(negocio.nombre);
  const [nombreNegocio, setNombreNegocio] = useState(negocio.nombre);
const [servicios, setServicios] = useState<Servicio[]>(negocio.servicios || []);
const [empleadosState, setEmpleadosState] = useState<Empleado[]>(empleados || []);


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


// 👇 Estados para descripción
const [nuevaDescripcion, setNuevaDescripcion] = useState(negocio.descripcion || "");
const [editandoDescripcion, setEditandoDescripcion] = useState(false);
const [modalAbierto, setModalAbierto] = useState(false);


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

  // 👉 Escuchar empleados
  let unsubscribeEmpleados: () => void;

  import("../backend/agenda-backend").then(({ escucharEmpleados }) => {
    escucharEmpleados(negocio.slug, (emps) => {
      setEmpleadosState(emps); // 👈 refresca empleados
    }).then((unsub) => {
      unsubscribeEmpleados = unsub;
    });
  });

  // 👉 Escuchar ubicación del negocio en tiempo real
  const q = query(collection(db, "Negocios"), where("slug", "==", negocio.slug));
  const unsubscribeNegocio = onSnapshot(q, (snap) => {
    if (!snap.empty) {
      const data = snap.docs[0].data() as Negocio;
      if (data.ubicacion) {
        setUbicacion(data.ubicacion);
      }
    }
  });

  // 🔹 Limpieza de listeners
  return () => {
    if (unsubscribeServicios) unsubscribeServicios();
    if (unsubscribeEmpleados) unsubscribeEmpleados();
    unsubscribeNegocio();
  };
}, [negocio.slug, modalAbierto]); // 👈 importante incluir modalAbierto



  return (
    <div className="w-full min-h-screen bg-neutral-900 text-white">
      {/* Banner */}
      <div className="hidden md:flex justify-center">
        <div className="w-[70%] h-80 relative rounded-b-2xl overflow-hidden">
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
        </div>
      </div>
      

      {/* Contenido */}
<div className="relative md:-mt-16 px-4 pb-10">
<div className="w-full max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-[60%_40%] gap-6 items-stretch">


    



    
          {/* Columna izquierda -> servicios y empleados */}
            <div className="flex flex-col gap-6 order-2 md:order-1">

            
{/* Servicios */}
<div className="order-1 bg-neutral-800 rounded-2xl p-6 shadow-lg">
        <h2 className="text-lg font-semibold mb-4">Servicios</h2>

  {servicios && servicios.length > 0 ? (
    <div
      ref={scrollRef}
      onMouseDown={handleMouseDown}
      className="flex gap-4 overflow-x-auto flex-nowrap scrollbar-hide cursor-grab active:cursor-grabbing"
    >
      {/* Rectángulo de agregar servicio siempre primero */}
      {modo === "dueño" && (
        <button
          onClick={() => setModalServiciosAbierto(true)} // 👈 abre el modal
          className="w-32 h-24 flex-shrink-0 flex items-center justify-center border-2 border-dashed border-gray-500 rounded-xl hover:border-white transition"
        >
          <span className="text-3xl text-gray-400">+</span>
        </button>
      )}

      {/* Servicios cargados */}
      {servicios.map((s, idx) => (
        <div
          key={s.id || idx}
          className="flex-shrink-0 flex flex-col justify-center items-center w-32 h-24 bg-neutral-900 rounded-xl p-2 text-center"
        >
          <p className="font-medium text-white text-sm leading-tight break-words truncate w-full">
            {s.servicio}
          </p>
          <span className="text-sm text-gray-400">${s.precio}</span>
          <span className="text-xs text-gray-500">{s.duracion} min</span>
        </div>
      ))}
    </div>
  ) : (
    <div className="w-full flex justify-start mt-2">
      {modo === "dueño" ? (
        <button
          onClick={() => setModalServiciosAbierto(true)}
          className="w-32 h-24 flex items-center justify-center border-2 border-dashed border-gray-500 rounded-xl hover:border-white transition"
        >
          <span className="text-3xl text-gray-400">+</span>
        </button>
      ) : (
        <p className="text-gray-400 text-sm">No hay servicios cargados.</p>
      )}
    </div>
  )}

{/* Modal para agregar servicios */}
{modo === "dueño" && (
  <ModalAgregarServicios
    abierto={modalServiciosAbierto}
    onCerrar={() => setModalServiciosAbierto(false)}
    negocioId={negocio.id}   // ✅ ahora es el ID real
  />
)}
</div>


{/* Empleados */}
<div className="order-2 bg-neutral-800 rounded-2xl p-6 relative shadow-lg">
        <h2 className="text-lg font-semibold mb-4">Empleados</h2>
{modo === "dueño" && (
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

    {/* Modal empleados */}
    <ModalEmpleadosUI
      abierto={modalAbierto}
      onCerrar={() => setModalAbierto(false)}
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
            {/* Calendario */}
<div className="order-3 bg-neutral-800 rounded-2xl p-6 shadow-lg flex justify-center">
  <div className="max-w-sm w-full flex flex-col items-center">
    <h2 className="text-lg font-semibold mb-4">Mi Agenda</h2>
    <div className="flex justify-center">
      <CalendarioUI />
    </div>
  </div>
</div>

          </div>
              {/* Columna derecha */}
    <div className="flex flex-col gap-6 order-1">
      
      {/* Columna derecha -> Perfil */}
<div className="order-1 md:order-2 bg-neutral-800 rounded-2xl p-6 flex flex-col items-center text-center shadow-lg relative mt-10 md:mt-0">
  {/* ⚙️ Tuerca */}
  {modo === "dueño" && (
    <button
      onClick={() => alert("Abrir configuración del negocio")}
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
    // 🔥 Loader mientras se sube
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
</div>


  {/* Nombre */}
  <h3 className="mt-4 text-lg font-semibold">{nombreNegocio}</h3>

  {/* Redes */}
  <div className="mt-6 flex items-center justify-center gap-4">
    <a className="w-8 h-8 flex items-center justify-center rounded-full bg-neutral-700 hover:bg-pink-600 transition">
      <Instagram className="w-4 h-4 text-white" />
    </a>
    <a className="w-8 h-8 flex items-center justify-center rounded-full bg-neutral-700 hover:bg-blue-600 transition">
      <Facebook className="w-4 h-4 text-white" />
    </a>
    <a className="w-8 h-8 flex items-center justify-center rounded-full bg-neutral-700 hover:bg-green-600 transition">
      <Phone className="w-4 h-4 text-white" />
    </a>
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
              ? "bg-neutral-700 rounded p-2"
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
            disabled={
              nuevaDescripcion.trim() === (negocio.descripcion || "")
            }
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
<div className="hidden md:flex order-5 md:order-2 bg-neutral-800 rounded-2xl p-6 flex-col items-center text-center shadow-lg relative">
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
            draggable={modo === "dueño"}
            eventHandlers={
              modo === "dueño"
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
            {modo === "dueño" && (
              <Popup>Mueve el pin si la ubicación no es correcta</Popup>
            )}
          </Marker>
        </MapContainer>
      </div>

      {modo === "dueño" && (
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

      {/* 🔹 Botón flotante solo en mobile */}
      <FloatingMenu />
    </div>
  );
}
