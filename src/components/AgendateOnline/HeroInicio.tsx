// src/components/HeroInicio.tsx
import React, { useState } from "react";
import { Search, MapPin, Calendar, Clock } from "lucide-react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../../lib/firebase";

type Negocio = {
  id: string;
  nombre: string;
  plantilla: string;
  slug?: string;
  ubicacion?: {
    direccion?: string;
    lat?: number;
    lng?: number;
  };
  bannerImages?: { url: string }[];
  logoUrl?: string;
};

export default function HeroInicio() {
  const [servicio, setServicio] = useState("");
  const [ubicacion, setUbicacion] = useState("");
  const [negocios, setNegocios] = useState<Negocio[]>([]);
  const [loading, setLoading] = useState(false);

  const buscarNegocios = async () => {
    if (!servicio || servicio === "Seleccionar servicio") return;
    setLoading(true);

    try {
      const q = query(
        collection(db, "Negocios"),
        where("plantilla", "==", servicio.toLowerCase())
      );
      const snapshot = await getDocs(q);

      let data: Negocio[] = snapshot.docs.map((doc) => {
        const d = doc.data();
        return {
          id: doc.id,
          nombre: d.nombre || "",
          plantilla: d.plantilla || "",
          slug: d.slug || "",
          ubicacion: d.ubicacion || {},
          bannerImages: d.bannerImages || [],
          logoUrl: d.logoUrl || "",
        };
      });

      // 🔠 Ordenar alfabéticamente por slug
      data = data.sort((a, b) =>
        (a.slug || "").localeCompare(b.slug || "", "es", { sensitivity: "base" })
      );

      setNegocios(data);
    } catch (error) {
      console.error("Error buscando negocios:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="min-h-screen bg-gradient-to-r from-blue-600 to-indigo-600 
  flex flex-col items-center text-center px-6 pt-20">
  {/* Título */}
  <h1 className="mb-10 mt-20 text-4xl sm:text-5xl lg:text-6xl font-bold text-white max-w-3xl">
    Reserva turno donde quiera que estés con solo un clic
  </h1>

      {/* Barra de búsqueda */}
<div className="w-full max-w-5xl bg-white rounded-2xl shadow-md p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:rounded-full sm:px-6 sm:py-3">
  <div className="grid grid-cols-1 gap-3 w-full sm:flex sm:gap-0 sm:w-auto sm:flex-1">
    {/* Seleccionar servicio */}
    <div className="flex items-center gap-2 border border-gray-300 rounded-lg px-3 py-2 bg-white">
      <Search className="text-gray-500 w-5 h-5 shrink-0" />
      <select
        value={servicio}
        onChange={(e) => setServicio(e.target.value)}
        className="w-full bg-transparent outline-none text-gray-700"
      >
        <option>Seleccionar servicio</option>
        <option>Barberia</option>
        <option>Peluquerias femeninas</option>
        <option>Uñas</option>
        <option>Cejas y pestañas</option>
        <option>Masajes</option>
        <option>Depilacion</option>
        <option>Tatto y piercing</option>
        <option>Maquillaje</option>
        <option>Medico dental</option>
        <option>Terapia</option>
        <option>Fitnees</option>
      </select>
    </div>

    {/* Ubicación */}
    <div className="flex items-center gap-2 border border-gray-300 rounded-lg px-3 py-2 bg-white">
      <MapPin className="text-gray-500 w-5 h-5 shrink-0" />
      <input
        type="text"
        placeholder="Ubicación actual"
        value={ubicacion}
        onChange={(e) => setUbicacion(e.target.value)}
        className="w-full bg-transparent outline-none text-gray-700"
      />
    </div>

    {/* Fecha + Momento del día */}
    <div className="grid grid-cols-2 gap-3 sm:flex sm:gap-0 sm:flex-1">
      <div className="flex items-center gap-2 border border-gray-300 rounded-lg px-3 py-2 bg-white">
        <Calendar className="text-gray-500 w-5 h-5 shrink-0" />
        <select className="w-full bg-transparent outline-none text-gray-700">
          <option>Cualquier fecha</option>
          <option>Hoy</option>
          <option>Esta semana</option>
          <option>Semana que viene</option>
        </select>
      </div>

      <div className="flex items-center gap-2 border border-gray-300 rounded-lg px-3 py-2 bg-white">
        <Clock className="text-gray-500 w-5 h-5 shrink-0" />
        <select className="w-full bg-transparent outline-none text-gray-700">
          <option>En cualquier momento</option>
          <option>Mañana</option>
          <option>Tarde</option>
          <option>Noche</option>
        </select>
      </div>
    </div>
  </div>

  {/* Botón buscar */}
  <button
    onClick={buscarNegocios}
    className="w-full sm:w-auto bg-black text-white px-6 py-3 rounded-lg font-semibold hover:bg-gray-800 transition"
  >
    Buscar
  </button>
</div>


      {/* Resultados */}
<div className="w-full max-w-6xl mt-12 text-left">
  {loading && <p className="text-white">Buscando negocios...</p>}

  {negocios.length > 0 && (
    <>
      <h2 className="text-2xl font-bold text-white mb-6">
        Encontré estos servicios cerca de ti
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {negocios.map((negocio) => (
          <a
            key={negocio.id}
            href={`/${negocio.plantilla}/${negocio.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="block bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition"
          >
            {/* Imagen */}
            {negocio.logoUrl ? (
              <img
                src={negocio.logoUrl}
                alt={negocio.nombre}
                className="h-40 w-full object-cover"
              />
            ) : negocio.bannerImages && negocio.bannerImages[0] ? (
              <img
                src={negocio.bannerImages[0].url}
                alt={negocio.nombre}
                className="h-40 w-full object-cover"
              />
            ) : (
              <div className="h-40 w-full bg-gray-200 flex items-center justify-center text-gray-500 text-sm">
                Sin imagen
              </div>
            )}

            {/* Info */}
            <div className="p-4">
              <h3 className="text-lg font-bold">{negocio.nombre}</h3>
              <p className="text-gray-600 text-sm">
                {negocio.ubicacion?.direccion || "Ubicación no disponible"}
              </p>
              <span className="mt-2 inline-block bg-gray-100 text-gray-800 px-3 py-1 text-xs rounded-full capitalize">
                {negocio.plantilla}
              </span>
            </div>
          </a>
        ))}
      </div>
    </>
  )}
</div>

    </section>
  );
}
