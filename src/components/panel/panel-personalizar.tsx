// src/components/PlantillaForm.tsx
import { useEffect, useState } from "react";
import { obtenerConfigNegocio, guardarConfigNegocio } from "../../lib/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { getDoc, doc } from "firebase/firestore";
import { db } from "../../lib/firebase";

// 📂 Leaflet
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

function generarSlug(nombre: string) {
  return nombre
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

type BannerImage = {
  url: string;
  deleteUrl?: string;
  file?: File; // 👈 guardamos archivo temporal
};

// ✅ Icono personalizado para Leaflet
const customIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

export default function PlantillaForm() {
  const [user, setUser] = useState<any>(null);
  const [config, setConfig] = useState<any>({
    nombre: "",
    eslogan: "Cortes modernos, clásicos y a tu medida",
    fuenteBotones: "poppins",
    fuenteTexto: "raleway",
    hoverColor: "#3b82f6",
    plantilla: "",
    bannerImages: [] as BannerImage[],
    modoImagenes: "defecto",
    sobreNosotrosImages: [] as BannerImage[], // 👈 nuevo
    modoSobreNosotros: "defecto",
    ubicacion: null,
    telefono: "",
    emailContacto: "",
  });
  const [estado, setEstado] = useState<
    "cargando" | "listo" | "guardando" | "sin-acceso"
  >("cargando");
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    const auth = getAuth();
    const unsub = onAuthStateChanged(auth, async (usuario) => {
      if (usuario) {
        const userRef = doc(db, "Usuarios", usuario.uid);
        const snap = await getDoc(userRef);

        if (!snap.exists()) {
          setEstado("sin-acceso");
          setMensaje("🚫 No tienes acceso a Plantilla.");
          return;
        }

        const data = snap.data();
        if (data?.premium) {
          const negocioConfig: any = await obtenerConfigNegocio(usuario.uid);
          if (negocioConfig) {
            if (!negocioConfig.slug) {
              negocioConfig.slug = generarSlug(
                negocioConfig.nombre || "mi-negocio"
              );
            }
            setUser(usuario);
            setConfig((prev: any) => ({
  ...prev,
  ...negocioConfig,
  fuenteBotones: negocioConfig.fuenteBotones || "poppins",
  fuenteTexto: negocioConfig.fuenteTexto || "raleway",
  eslogan:
    negocioConfig.eslogan ||
    "Cortes modernos, clásicos y a tu medida",
  bannerImages: negocioConfig.bannerImages || [],
  modoImagenes: negocioConfig.modoImagenes || "defecto",
  sobreNosotrosImages: negocioConfig.sobreNosotrosImages || [], // 👈 nuevo
  modoSobreNosotros: negocioConfig.modoSobreNosotros || "defecto", // 👈 nuevo
}));


            setEstado("listo");
          }
        } else {
          setEstado("sin-acceso");
          setMensaje("🚫 No tienes acceso a Plantilla.");
        }
      } else {
        setEstado("sin-acceso");
        setMensaje("🔒 No has iniciado sesión.");
      }
    });
    return () => unsub();
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type, checked } = e.target;
    setConfig((prev: any) => {
      const newConfig = {
        ...prev,
        [name]: type === "checkbox" ? checked : value,
      };
      if (name === "nombre") newConfig.slug = generarSlug(value);
      if (name === "eslogan" && value.trim() === "") {
        newConfig.eslogan = "Cortes modernos, clásicos y a tu medida";
      }
      return newConfig;
    });
  };

  // 🚀 Preview local inmediato BANNER
  const handleBannerChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    index: number
  ) => {
    if (!e.target.files || !user) return;
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const nuevasImagenes = [...config.bannerImages];
      nuevasImagenes[index] = { url: reader.result as string, file };
      setConfig({ ...config, bannerImages: nuevasImagenes });
      setMensaje("⚠️ Recuerda guardar para aplicar cambios.");
    };
    reader.readAsDataURL(file);
  };

  // 🚀 Preview local inmediato SOBRE NOSOTROS
  const handleSobreNosotrosChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    index: number
  ) => {
    if (!e.target.files || !user) return;
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const nuevasImagenes = [...config.sobreNosotrosImages];
      nuevasImagenes[index] = { url: reader.result as string, file };
      setConfig({ ...config, sobreNosotrosImages: nuevasImagenes });
      setMensaje("⚠️ Recuerda guardar para aplicar cambios.");
    };
    reader.readAsDataURL(file);
  };

  // 🗑️ Eliminar imagen BANNER
  const eliminarImagen = (index: number) => {
    const nuevasImagenes = [...config.bannerImages];
    nuevasImagenes[index] = null as any;
    setConfig({ ...config, bannerImages: nuevasImagenes });
    setMensaje("⚠️ Recuerda guardar para aplicar cambios.");
  };

  // 🗑️ Eliminar imagen SOBRE NOSOTROS
  const eliminarImagenSobreNosotros = (index: number) => {
    const nuevasImagenes = [...config.sobreNosotrosImages];
    nuevasImagenes[index] = null as any;
    setConfig({ ...config, sobreNosotrosImages: nuevasImagenes });
    setMensaje("⚠️ Recuerda guardar para aplicar cambios.");
  };

  // 🚀 Guardar cambios (subida a ImgBB recién aquí)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setEstado("guardando");

    const nuevasImagenes = await Promise.all(
      config.bannerImages.map(async (img: any) => {
        if (img?.file) {
          const formData = new FormData();
          formData.append("image", img.file);

          const res = await fetch(
            `https://api.imgbb.com/1/upload?key=2d9fa5d6354c8d98e3f92b270213f787`,
            { method: "POST", body: formData }
          );

          const data = await res.json();
          if (data?.data?.display_url && data?.data?.delete_url) {
            return {
              url: data.data.display_url,
              deleteUrl: data.data.delete_url,
            };
          }
        }
        return img;
      })
    );

    const nuevasImagenesSobreNosotros = await Promise.all(
      config.sobreNosotrosImages.map(async (img: any) => {
        if (img?.file) {
          const formData = new FormData();
          formData.append("image", img.file);

          const res = await fetch(
            `https://api.imgbb.com/1/upload?key=2d9fa5d6354c8d98e3f92b270213f787`,
            { method: "POST", body: formData }
          );

          const data = await res.json();
          if (data?.data?.display_url && data?.data?.delete_url) {
            return {
              url: data.data.display_url,
              deleteUrl: data.data.delete_url,
            };
          }
        }
        return img;
      })
    );

    const ok = await guardarConfigNegocio(user.uid, {
      ...config,
      bannerImages: nuevasImagenes,
      sobreNosotrosImages: nuevasImagenesSobreNosotros,
    });
    setMensaje(ok ? "✅ Cambios guardados correctamente." : "❌ Error al guardar.");
    setEstado("listo");
  };

  if (estado === "cargando")
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-gray-700">
        <div className="loader">
          <div className="circle"></div>
          <div className="circle"></div>
          <div className="circle"></div>
          <div className="circle"></div>
        </div>
        <p className="mt-6 text-lg font-medium">Cargando plantilla...</p>
      </div>
    );

  if (estado === "sin-acceso") return <p className="p-6 text-red-600">{mensaje}</p>;
  if (!config) return null;

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
      {/* Encabezado */}
      <div className="px-6 py-4 bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white flex items-center justify-between">
        <h1 className="text-xl md:text-2xl font-bold">Personaliza tu negocio</h1>
        <button
          onClick={() => (window.location.href = "/panel/paneldecontrol")}
          className="flex items-center gap-2 bg-white text-pink-600 px-4 py-2 rounded-lg shadow hover:bg-pink-50 transition"
        >
          <span className="text-lg">←</span>
          <span className="font-medium">Volver al panel</span>
        </button>
      </div>

      {/* Formulario */}
      <form onSubmit={handleSubmit} className="p-8 flex flex-col gap-8">
        {/* Nombre */}
        <div className="relative">
          <input
            name="nombre"
            value={config.nombre}
            onChange={handleChange}
            required
            className="peer w-full px-4 py-3 bg-gray-100 text-gray-700 font-semibold rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500 transition-all placeholder-transparent"
            placeholder="Nombre del negocio"
          />
          <label
            className={`absolute left-3 top-2.5 text-gray-500 font-medium transition-all ${
              config.nombre
                ? "-translate-y-6 scale-90 text-gray-700"
                : "peer-placeholder-shown:translate-y-0 peer-placeholder-shown:scale-100"
            } peer-focus:-translate-y-6 peer-focus:scale-90 peer-focus:text-gray-700`}
          >
            Nombre del negocio
          </label>
        </div>

        {/* Eslogan */}
        <div className="relative">
          <input
            name="eslogan"
            value={config.eslogan}
            onChange={handleChange}
            className="peer w-full px-4 py-3 bg-gray-100 text-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500 transition-all placeholder-transparent"
            placeholder="Eslogan de la web"
          />
          <label
            className={`absolute left-3 top-2.5 text-gray-500 font-medium transition-all ${
              config.eslogan
                ? "-translate-y-6 scale-90 text-gray-700"
                : "peer-placeholder-shown:translate-y-0 peer-placeholder-shown:scale-100"
            } peer-focus:-translate-y-6 peer-focus:scale-90 peer-focus:text-gray-700`}
          >
            Eslogan de la web
          </label>
        </div>

        {/* Teléfono */}
        <div className="relative">
          <input
            name="telefono"
            value={config.telefono}
            onChange={handleChange}
            className="peer w-full px-4 py-3 bg-gray-100 text-gray-700 rounded-md 
               focus:outline-none focus:ring-2 focus:ring-pink-500 
               transition-all placeholder-transparent"
            placeholder="Teléfono de contacto"
          />
          <label
            className={`absolute left-3 top-2.5 text-gray-500 font-medium transition-all ${
              config.telefono
                ? "-translate-y-6 scale-90 text-gray-700"
                : "peer-placeholder-shown:translate-y-0 peer-placeholder-shown:scale-100"
            } peer-focus:-translate-y-6 peer-focus:scale-90 peer-focus:text-gray-700`}
          >
            Teléfono de contacto
          </label>
        </div>

        {/* Email de contacto */}
        <div className="relative">
          <input
            type="email"
            name="emailContacto"
            value={config.emailContacto}
            onChange={handleChange}
            className="peer w-full px-4 py-3 bg-gray-100 text-gray-700 rounded-md 
               focus:outline-none focus:ring-2 focus:ring-pink-500 
               transition-all placeholder-transparent"
            placeholder="Correo de contacto"
          />
          <label
            className={`absolute left-3 top-2.5 text-gray-500 font-medium transition-all ${
              config.emailContacto
                ? "-translate-y-6 scale-90 text-gray-700"
                : "peer-placeholder-shown:translate-y-0 peer-placeholder-shown:scale-100"
            } peer-focus:-translate-y-6 peer-focus:scale-90 peer-focus:text-gray-700`}
          >
            Correo de contacto
          </label>
        </div>

        {/* Fuentes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Escoger fuente
          </label>
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 w-24">Botones</span>
              <select
                name="fuenteBotones"
                value={config.fuenteBotones}
                onChange={handleChange}
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 bg-gray-50"
              >
                <option value="montserrat">Montserrat</option>
                <option value="poppins">Poppins</option>
                <option value="raleway">Raleway</option>
                <option value="playfair">Playfair Display</option>
                <option value="bebas">Bebas Neue</option>
              </select>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 w-24">Texto</span>
              <select
                name="fuenteTexto"
                value={config.fuenteTexto}
                onChange={handleChange}
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 bg-gray-50"
              >
                <option value="montserrat">Montserrat</option>
                <option value="poppins">Poppins</option>
                <option value="raleway">Raleway</option>
                <option value="playfair">Playfair Display</option>
                <option value="bebas">Bebas Neue</option>
              </select>
            </div>
          </div>
        </div>

        {/* Imágenes del banner */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Imágenes del banner
          </label>

          {/* Toggle */}
          <div className="flex items-center gap-3 mb-4">
            <span className="text-sm font-medium text-gray-600">
              {config.modoImagenes === "defecto" ? "Defecto" : "Personalizado"}
            </span>
            <label className="relative inline-block w-[3.5em] h-[2em]">
              <input
                type="checkbox"
                checked={config.modoImagenes === "personalizado"}
                onChange={(e) =>
                  setConfig((prev: any) => ({
                    ...prev,
                    modoImagenes: e.target.checked ? "personalizado" : "defecto",
                  }))
                }
                className="opacity-0 w-0 h-0 peer"
              />
              <span
                className="
                  absolute cursor-pointer top-0 left-0 right-0 bottom-0
                  bg-white border border-gray-400 rounded-[30px]
                  transition-colors duration-300
                  peer-checked:bg-blue-500 peer-checked:border-blue-500
                  after:content-[''] after:absolute after:h-[1.4em] after:w-[1.4em]
                  after:rounded-full after:left-[0.27em] after:bottom-[0.25em]
                  after:bg-gray-400 after:transition-transform after:duration-300
                  peer-checked:after:translate-x-[1.4em] peer-checked:after:bg-white
                "
              ></span>
            </label>
          </div>

          {/* Render según el modo */}
          {config.modoImagenes === "defecto" ? (
            <div className="flex gap-3">
              <img
                src="/img/1.jpeg"
                className="w-20 h-20 object-cover rounded-lg"
              />
              <img
                src="/img/2.jpg"
                className="w-20 h-20 object-cover rounded-lg"
              />
              <img
                src="/img/3.jpg"
                className="w-20 h-20 object-cover rounded-lg"
              />
            </div>
          ) : (
            <div>
              <div className="flex gap-3 mt-3 flex-wrap">
                {Array.from({ length: 4 }).map((_, i) => {
                  const img = config.bannerImages?.[i];

                  if (img) {
                    return (
                      <div key={i} className="relative w-20 h-20">
                        <img
                          src={img.url}
                          alt={`banner-${i}`}
                          className="w-full h-full object-cover rounded-full border border-gray-300"
                        />
                        <button
                          type="button"
                          onClick={() => eliminarImagen(i)}
                          className="absolute -top-2 -right-2 bg-white rounded-full w-6 h-6 flex items-center justify-center shadow z-10 border"
                        >
                          <span className="text-red-600 font-bold text-sm">
                            ✕
                          </span>
                        </button>
                      </div>
                    );
                  }

                  return (
                    <label
                      key={i}
                      className="w-20 h-20 flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-full text-gray-400 cursor-pointer hover:bg-gray-50"
                    >
                      <span className="text-lg">+</span>
                      <span className="text-xs">Añadir</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleBannerChange(e, i)}
                      />
                    </label>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Imágenes de SOBRE NOSOTROS */}
<div>
  <label className="block text-sm font-medium text-gray-700 mb-3">
    Imágenes de "Sobre nosotros"
  </label>

  {/* Toggle */}
  <div className="flex items-center gap-3 mb-4">
    <span className="text-sm font-medium text-gray-600">
      {config.modoSobreNosotros === "defecto" ? "Defecto" : "Personalizado"}
    </span>
    <label className="relative inline-block w-[3.5em] h-[2em]">
      <input
        type="checkbox"
        checked={config.modoSobreNosotros === "personalizado"}
        onChange={(e) =>
          setConfig((prev: any) => ({
            ...prev,
            modoSobreNosotros: e.target.checked ? "personalizado" : "defecto",
          }))
        }
        className="opacity-0 w-0 h-0 peer"
      />
      <span
        className="
          absolute cursor-pointer top-0 left-0 right-0 bottom-0
          bg-white border border-gray-400 rounded-[30px]
          transition-colors duration-300
          peer-checked:bg-blue-500 peer-checked:border-blue-500
          after:content-[''] after:absolute after:h-[1.4em] after:w-[1.4em]
          after:rounded-full after:left-[0.27em] after:bottom-[0.25em]
          after:bg-gray-400 after:transition-transform after:duration-300
          peer-checked:after:translate-x-[1.4em] peer-checked:after:bg-white
        "
      ></span>
    </label>
  </div>

  {/* Render según el modo */}
  {config.modoSobreNosotros === "defecto" ? (
    <div className="flex gap-3">
      <img src="/img/barberia5.jpg" className="w-20 h-20 object-cover rounded-full" />
      <img src="/img/barberia6.jpg" className="w-20 h-20 object-cover rounded-full" />
      <img src="/img/barberia8.jpg" className="w-20 h-20 object-cover rounded-full" />
    </div>
  ) : (
    <div>
      <div className="flex gap-3 mt-3 flex-wrap">
        {Array.from({ length: 3 }).map((_, i) => {
          const img = config.sobreNosotrosImages?.[i];
          if (img) {
            return (
              <div key={i} className="relative w-20 h-20">
                <img
                  src={img.url}
                  alt={`sobre-nosotros-${i}`}
                  className="w-full h-full object-cover rounded-full border border-gray-300"
                />
                <button
                  type="button"
                  onClick={() => eliminarImagenSobreNosotros(i)}
                  className="absolute -top-2 -right-2 bg-white rounded-full w-6 h-6 flex items-center justify-center shadow z-10 border"
                >
                  <span className="text-red-600 font-bold text-sm">✕</span>
                </button>
              </div>
            );
          }

          return (
            <label
              key={i}
              className="w-20 h-20 flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-full text-gray-400 cursor-pointer hover:bg-gray-50"
            >
              <span className="text-lg">+</span>
              <span className="text-xs">Añadir</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleSobreNosotrosChange(e, i)}
              />
            </label>
          );
        })}
      </div>
    </div>
  )}
</div>

        {/* Botón ubicación actual */}
        <button
          type="button"
          onClick={() => {
            if (navigator.geolocation) {
              navigator.geolocation.getCurrentPosition(
                (pos) => {
                  const { latitude, longitude } = pos.coords;
                  setConfig((prev: any) => ({
                    ...prev,
                    ubicacion: {
                      lat: latitude,
                      lng: longitude,
                      direccion: `Lat: ${latitude}, Lng: ${longitude}`,
                    },
                  }));
                  setMensaje("📍 Ubicación actual detectada.");
                },
                (error) => {
                  console.error(error);
                  if (error.code === 1) {
                    setMensaje(
                      "⚠️ Permiso de ubicación denegado. Activa el GPS y otorga permisos."
                    );
                  } else if (error.code === 2) {
                    setMensaje(
                      "⚠️ No se pudo obtener tu ubicación. Verifica tu señal o activa el GPS."
                    );
                  } else if (error.code === 3) {
                    setMensaje(
                      "⚠️ Tiempo de espera agotado al intentar obtener tu ubicación."
                    );
                  } else {
                    setMensaje("❌ Error desconocido al obtener ubicación.");
                  }
                },
                { enableHighAccuracy: true, timeout: 10000 }
              );
            } else {
              setMensaje("⚠️ Tu navegador no soporta geolocalización.");
            }
          }}
          className="bg-blue-500 text-white px-4 py-2 rounded-lg shadow hover:bg-blue-600 transition"
        >
          Usar mi ubicación actual
        </button>

        {/* Mini mapa */}
        {config.ubicacion?.lat && config.ubicacion?.lng && (
          <div className="mt-3">
            <div className="w-full h-64 rounded-md overflow-hidden border">
              <MapContainer
                key={`${config.ubicacion.lat}-${config.ubicacion.lng}`}
                center={[config.ubicacion.lat, config.ubicacion.lng]}
                zoom={16}
                style={{ width: "100%", height: "100%" }}
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; OpenStreetMap contributors'
                />
                <Marker
                  position={[config.ubicacion.lat, config.ubicacion.lng]}
                  icon={customIcon}
                  draggable={true}
                  eventHandlers={{
                    dragend: (e) => {
                      const newPos = e.target.getLatLng();
                      setConfig((prev: any) => ({
                        ...prev,
                        ubicacion: {
                          lat: newPos.lat,
                          lng: newPos.lng,
                        },
                      }));
                    },
                  }}
                >
                  <Popup>Mueve el pin si la ubicación no es correcta</Popup>
                </Marker>
              </MapContainer>
            </div>
          </div>
        )}

        {/* Botones */}
        <div className="flex flex-col gap-2 mt-4">
          <div className="flex items-center gap-4">
            <button
              type="submit"
              disabled={estado === "guardando"}
              className="bg-pink-600 text-white px-6 py-2 rounded-lg disabled:opacity-50 shadow flex items-center gap-2"
            >
              {estado === "guardando" && (
                <div className="w-5 h-5 border-4 border-t-white border-white/30 rounded-full animate-spin"></div>
              )}
              {estado === "guardando" ? "Guardando..." : "Guardar cambios"}
            </button>

            {config?.plantilla && config?.slug && (
              <a
                href={`/${config.plantilla}/${config.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-pink-600 text-white px-6 py-2 rounded-lg shadow hover:bg-pink-700 transition"
              >
                Visitar web
              </a>
            )}
          </div>

          {/* Mensaje de estado */}
          {mensaje && <p className="text-sm text-gray-600">{mensaje}</p>}
        </div>
      </form>
    </div>
  );
}
