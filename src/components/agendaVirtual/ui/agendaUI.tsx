import { useState, useEffect } from "react";
import ConfigIcon from "../../../assets/config-svg.svg?url";
import { 
  doc, 
  updateDoc, 
  collection, 
  query, 
  where, 
  getDocs 
} from "firebase/firestore";

import { db } from "../../../lib/firebase";

import {
  subirLogoNegocio,
  agregarServicio,
  actualizarNombreYSlug,
  escucharServicios, 
} from "../backend/agenda-backend";
import CalendarioUI from "../ui/calendarioUI";
import { Instagram, Facebook, Phone, Music } from "lucide-react";


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
  nombre: string;
  direccion?: string;
  slug: string;
  perfilLogo?: string;
  bannerUrl?: string;
  servicios?: Servicio[];
  descripcion?: string;   // 👈 agregado
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
  const [agregando, setAgregando] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevoPrecio, setNuevoPrecio] = useState("");

  // 👇 Estados para editar nombre/slug
  const [editandoNombre, setEditandoNombre] = useState(false);
  const [nuevoNombreNegocio, setNuevoNombreNegocio] = useState(negocio.nombre);
  const [nombreNegocio, setNombreNegocio] = useState(negocio.nombre);
const [servicios, setServicios] = useState<Servicio[]>(negocio.servicios || []);

// 👇 Estados para descripción
const [nuevaDescripcion, setNuevaDescripcion] = useState(negocio.descripcion || "");
const [editandoDescripcion, setEditandoDescripcion] = useState(false);

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

  const handleGuardarServicio = async () => {
    if (!nuevoNombre.trim() || !nuevoPrecio) return;
    try {
      await agregarServicio(negocio.slug, {
        nombre: nuevoNombre,
        precio: Number(nuevoPrecio),
      });
      setNuevoNombre("");
      setNuevoPrecio("");
      setAgregando(false);
    } catch (err) {
      console.error("❌ Error al guardar servicio:", err);
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

  let unsubscribe: () => void;

  escucharServicios(negocio.slug, (servs) => {
    setServicios(servs);
  }).then((unsub) => {
    unsubscribe = unsub;
  });

  return () => {
    if (unsubscribe) unsubscribe();
  };
}, [negocio.slug]);

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
        <div className="w-full max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Columna derecha */}
<div className="order-1 mt-8 md:order-2 bg-neutral-800 rounded-2xl p-6 flex flex-col items-center text-center shadow-lg relative">
  
  {/* ⚙️ Tuerca arriba a la derecha */}
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
    {logo ? (
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

    {subiendo && (
      <div className="absolute inset-0 bg-black/60 flex items-center justify-center rounded-full">
        <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
      </div>
    )}
  </div>

  {/* Nombre negocio editable */}
  <div className="relative group mt-4">
    {modo === "dueño" ? (
      editandoNombre ? (
        <div className="inline-flex items-center gap-2">
          <input
            type="text"
            value={nuevoNombreNegocio}
            onChange={(e) => setNuevoNombreNegocio(e.target.value)}
            className="w-40 text-sm font-medium text-center bg-neutral-700 text-white rounded px-2 py-1"
            autoFocus
          />
          <button
            onClick={handleGuardarNombre}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded px-3 py-1"
          >
            Guardar
          </button>
        </div>
      ) : (
        <h3 className="text-lg font-semibold">{nombreNegocio}</h3>
      )
    ) : (
      <h3 className="text-lg font-semibold">{nombreNegocio}</h3>
    )}

    {modo === "dueño" && !editandoNombre && (
      <button
        onClick={() => setEditandoNombre(true)}
        className="absolute -top-2 -right-6 opacity-0 group-hover:opacity-100 transition"
      >
        <img
          src="/src/assets/editar-svg.svg"
          alt="Editar"
          className="w-4 h-4 filter invert"
        />
      </button>
    )}
  </div>

  {modo === "cliente" && (
    <button className="mt-4 bg-white text-black px-6 py-2 rounded-full font-medium hover:bg-gray-200">
      Reservar
    </button>
  )}

  {/* Dirección + redes */}
  <div className="mt-6 text-xs text-gray-400 space-y-2 w-full">
    {negocio.direccion && <p>📍 {negocio.direccion}</p>}

    {/* Redes sociales */}
    <div className="flex items-center justify-center gap-4 mt-3">
      <a
        href="https://instagram.com/"
        target="_blank"
        rel="noopener noreferrer"
        className="w-8 h-8 flex items-center justify-center rounded-full bg-neutral-700 hover:bg-pink-600 transition"
        title="Instagram"
      >
        <Instagram className="w-4 h-4 text-white" />
      </a>

      <a
        href="https://facebook.com/"
        target="_blank"
        rel="noopener noreferrer"
        className="w-8 h-8 flex items-center justify-center rounded-full bg-neutral-700 hover:bg-blue-600 transition"
        title="Facebook"
      >
        <Facebook className="w-4 h-4 text-white" />
      </a>

      <a
        href="https://wa.me/59800000000"
        target="_blank"
        rel="noopener noreferrer"
        className="w-8 h-8 flex items-center justify-center rounded-full bg-neutral-700 hover:bg-green-600 transition"
        title="WhatsApp"
      >
        <Phone className="w-4 h-4 text-white" />
      </a>
    </div>
  </div>

  {/* Descripción editable */}
<div className="mt-8 w-full px-2">
  {modo === "dueño" ? (
    <div className="flex flex-col items-center gap-2 w-full">
      <textarea
        maxLength={200}
        placeholder="Escribe una descripción de tu negocio (máx 200 caracteres)"
        className={`w-full text-sm text-center text-white resize-none outline-none transition ${
          editandoDescripcion ? "bg-neutral-700 rounded p-2" : "bg-transparent"
        }`}
        value={nuevaDescripcion}
        onFocus={() => setEditandoDescripcion(true)}
        onBlur={() => {
          // 👇 Solo cierra si no hay cambios
          if (nuevaDescripcion.trim() === (negocio.descripcion || "")) {
            setEditandoDescripcion(false);
          }
        }}
        onChange={(e) => setNuevaDescripcion(e.target.value)}
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
    <p className="text-gray-300 text-sm text-center">
      {negocio.descripcion || "Este negocio aún no tiene descripción."}
    </p>
  )}
</div>


</div>

          {/* Columna izquierda -> servicios y empleados */}
          <div className="order-2 md:order-1 md:col-span-2 space-y-8">

            {/* Servicios */}
<div className="bg-neutral-800 rounded-2xl p-6 shadow-lg">
  <h2 className="text-lg font-semibold mb-4">Servicios</h2>

  {servicios && servicios.length > 0 ? (
  <div className="flex flex-wrap gap-4">
    {servicios.map((s, idx) => (
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
            <div className="flex flex-row items-center justify-between bg-neutral-900 border border-dashed border-gray-500 rounded-xl p-2 gap-2 w-auto">
              <input
                type="text"
                placeholder="Servicio"
                value={nuevoNombre}
                onChange={(e) => setNuevoNombre(e.target.value)}
                className="px-2 py-1 rounded bg-neutral-800 text-xs text-white w-28"
              />
              <input
                type="number"
                placeholder="Precio"
                value={nuevoPrecio}
                onChange={(e) => setNuevoPrecio(e.target.value)}
                className="px-2 py-1 rounded bg-neutral-800 text-xs text-white w-20"
              />
              <button
                onClick={handleGuardarServicio}
                className="bg-indigo-600 hover:bg-indigo-700 rounded px-3 py-1 text-xs font-medium text-white"
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
            <div className="flex flex-row items-center justify-between bg-neutral-900 border border-dashed border-gray-500 rounded-xl p-2 gap-2 w-auto">
              <input
                type="text"
                placeholder="Servicio"
                value={nuevoNombre}
                onChange={(e) => setNuevoNombre(e.target.value)}
                className="px-2 py-1 rounded bg-neutral-800 text-xs text-white w-28"
              />
              <input
                type="number"
                placeholder="Precio"
                value={nuevoPrecio}
                onChange={(e) => setNuevoPrecio(e.target.value)}
                className="px-2 py-1 rounded bg-neutral-800 text-xs text-white w-20"
              />
              <button
                onClick={handleGuardarServicio}
                className="bg-indigo-600 hover:bg-indigo-700 rounded px-3 py-1 text-xs font-medium text-white"
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
    {empleados && empleados.length > 0 ? (
      empleados.map((e, idx) => (
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
            <div className="bg-neutral-800 rounded-2xl p-6 shadow-lg flex justify-center">
              <div className="w-full max-w-sm">
                <h2 className="text-lg font-semibold mb-4 ml-2">Mi Agenda</h2>
                <CalendarioUI />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
