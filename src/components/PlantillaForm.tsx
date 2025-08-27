// src/components/PlantillaForm.tsx
import { useEffect, useState } from "react";
import { obtenerConfigNegocio, guardarConfigNegocio } from "../lib/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { getDoc, doc } from "firebase/firestore";
import { db } from "../lib/firebase";

function generarSlug(nombre: string) {
  return nombre
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

export default function PlantillaForm() {
  const [user, setUser] = useState<any>(null);
  const [config, setConfig] = useState<any>(null);
  const [estado, setEstado] = useState<
    "cargando" | "listo" | "guardando" | "sin-acceso"
  >("cargando");
  const [mensaje, setMensaje] = useState("");
  const [mostrarPaleta, setMostrarPaleta] = useState(false);

  const COLORES = [
    "#ef4444", "#f97316", "#eab308", "#22c55e", "#0ea5e9",
    "#3b82f6", "#8b5cf6", "#ec4899", "#6b7280", "#000000",
  ];

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

            // ⚡ Valores por defecto seguros
            negocioConfig.fuenteBotones = negocioConfig.fuenteBotones || "poppins";
            negocioConfig.fuenteTexto = negocioConfig.fuenteTexto || "raleway";
            negocioConfig.eslogan =
              negocioConfig.eslogan || "Cortes modernos, clásicos y a tu medida";

            setUser(usuario);
            setConfig(negocioConfig);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setEstado("guardando");
    const ok = await guardarConfigNegocio(user.uid, config);
    setMensaje(
      ok ? "✅ Cambios guardados correctamente." : "❌ Error al guardar."
    );
    setEstado("listo");
  };

  // 🔄 Loader
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

  if (estado === "sin-acceso")
    return <p className="p-6 text-red-600">{mensaje}</p>;
  if (!config) return null;

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
      {/* ✅ Encabezado con botón volver */}
      <div className="px-6 py-4 bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white flex items-center justify-between">
        <h1 className="text-xl md:text-2xl font-bold">
          Personaliza tu negocio
        </h1>

        <button
          onClick={() => (window.location.href = "/panel")}
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
            className="peer w-full px-4 py-3 bg-gray-100 text-gray-700 font-semibold rounded-md 
                       focus:outline-none focus:ring-2 focus:ring-pink-500 transition-all placeholder-transparent"
            placeholder="Nombre del negocio"
          />
          <label
            className={`absolute left-3 top-2.5 text-gray-500 font-medium transition-all
              ${
                config.nombre
                  ? "-translate-y-6 scale-90 text-gray-700"
                  : "peer-placeholder-shown:translate-y-0 peer-placeholder-shown:scale-100"
              }
              peer-focus:-translate-y-6 peer-focus:scale-90 peer-focus:text-gray-700`}
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
            className="peer w-full px-4 py-3 bg-gray-100 text-gray-700 rounded-md 
                       focus:outline-none focus:ring-2 focus:ring-pink-500 transition-all placeholder-transparent"
            placeholder="Eslogan de la web"
          />
          <label
            className={`absolute left-3 top-2.5 text-gray-500 font-medium transition-all
              ${
                config.eslogan
                  ? "-translate-y-6 scale-90 text-gray-700"
                  : "peer-placeholder-shown:translate-y-0 peer-placeholder-shown:scale-100"
              }
              peer-focus:-translate-y-6 peer-focus:scale-90 peer-focus:text-gray-700`}
          >
            Eslogan de la web
          </label>
        </div>

        {/* Escoger fuente */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Escoger fuente
          </label>

          <div className="flex flex-col gap-4">
            {/* Fuente Botones */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 w-24">Botones</span>
              <select
                name="fuenteBotones"
                value={config.fuenteBotones}
                onChange={handleChange}
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 bg-gray-50"
              >
                <option value="montserrat" className="font-montserrat">Montserrat</option>
                <option value="poppins" className="font-poppins">Poppins</option>
                <option value="raleway" className="font-raleway">Raleway</option>
                <option value="playfair" className="font-playfair">Playfair Display</option>
                <option value="bebas" className="font-bebas">Bebas Neue</option>
              </select>
            </div>

            {/* Fuente Texto */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 w-24">Texto</span>
              <select
                name="fuenteTexto"
                value={config.fuenteTexto}
                onChange={handleChange}
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 bg-gray-50"
              >
                <option value="montserrat" className="font-montserrat">Montserrat</option>
                <option value="poppins" className="font-poppins">Poppins</option>
                <option value="raleway" className="font-raleway">Raleway</option>
                <option value="playfair" className="font-playfair">Playfair Display</option>
                <option value="bebas" className="font-bebas">Bebas Neue</option>
              </select>
            </div>
          </div>
        </div>

        {/* Color hover */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Color del hover
          </label>
          <button
            type="button"
            onClick={() => setMostrarPaleta(!mostrarPaleta)}
            className="flex items-center justify-center w-full px-4 py-2 rounded-xl shadow-sm text-white font-medium transition-transform hover:scale-105"
            style={{ backgroundColor: config.hoverColor }}
          >
            {mostrarPaleta ? "Selecciona un color" : "Cambiar color"}
          </button>

          {mostrarPaleta && (
            <div className="grid grid-cols-5 gap-3 mt-3">
              {COLORES.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => {
                    setConfig((prev: any) => ({
                      ...prev,
                      hoverColor: color,
                    }));
                    setMostrarPaleta(false);
                  }}
                  className="w-10 h-10 rounded-full border-2 border-gray-200 hover:scale-110 transition-transform"
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Plantilla */}
        <div className="relative">
          <select
            name="plantilla"
            value={config.plantilla}
            onChange={handleChange}
            required
            className="peer w-full px-4 py-3 bg-gray-100 text-gray-700 font-semibold rounded-md 
             focus:outline-none focus:ring-2 focus:ring-pink-500 transition-all"
          >
            <option value="" disabled hidden></option>
            <option value="barberia">Barbería</option>
            <option value="estilo1">Estilo 1</option>
            <option value="estilo2">Estilo 2</option>
            <option value="estilo3">Estilo 3</option>
          </select>
          <label
            className={`absolute left-3 top-2.5 text-gray-500 font-medium transition-all
            ${
              config.plantilla
                ? "-translate-y-6 scale-90 text-gray-700"
                : "peer-placeholder-shown:translate-y-0 peer-placeholder-shown:scale-100"
            }
            peer-focus:-translate-y-6 peer-focus:scale-90 peer-focus:text-gray-700`}
          >
            Plantilla
          </label>
        </div>

        {/* Botones */}
        <div className="flex items-center gap-4 mt-4">
          <button
            type="submit"
            disabled={estado === "guardando"}
            className="bg-pink-600 text-white px-6 py-2 rounded-lg disabled:opacity-50 shadow"
          >
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
      </form>
    </div>
  );
}
