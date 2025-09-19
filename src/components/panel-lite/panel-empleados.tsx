// src/components/panel-lite/panel-empleados.tsx
import { useEffect, useState } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { guardarConfigNegocio, obtenerConfigNegocio } from "../../lib/firestore";

// 🔑 etiquetas dinámicas por plantilla
const etiquetasPorPlantilla: Record<string, string> = {
  barberia: "barbero",
  dentista: "dentista",
  tatuajes: "tatuador",
  peluqueria: "estilista",
  spa: "masajista",
};

function getEtiquetaEmpleado(plantilla?: string) {
  if (!plantilla) return "empleado";
  return etiquetasPorPlantilla[plantilla.toLowerCase()] || "empleado";
}

// 🚀 Subida a ImgBB (solo para foto de perfil)
const subirImagenImgBB = async (file: File): Promise<string | null> => {
  const formData = new FormData();
  formData.append("image", file);

  const res = await fetch(
    `https://api.imgbb.com/1/upload?key=2d9fa5d6354c8d98e3f92b270213f787`,
    { method: "POST", body: formData }
  );

  const data = await res.json();
  return data?.data?.display_url || null;
};

export default function PanelEmpleadosLite() {
  const [user, setUser] = useState<any>(null);
  const [config, setConfig] = useState<any>(null);
  const [plantilla, setPlantilla] = useState<string>(""); // 👈 traer plantilla del negocio
  const [estado, setEstado] = useState<
    "cargando" | "listo" | "guardando" | "sin-acceso"
  >("cargando");
  const [mensaje, setMensaje] = useState("");

  const [empleadoSeleccionado, setEmpleadoSeleccionado] = useState<number | null>(null);
  const [horarioTemp, setHorarioTemp] = useState({
    inicio: "08:00",
    fin: "17:00",
    diasLibres: [] as string[],
  });

  useEffect(() => {
    const auth = getAuth();
    const unsub = onAuthStateChanged(auth, async (usuario) => {
      if (!usuario) {
        setEstado("sin-acceso");
        setMensaje("🔒 No has iniciado sesión.");
        return;
      }

      const userRef = doc(db, "Usuarios", usuario.uid);
      const snap = await getDoc(userRef);
      if (!snap.exists()) {
        setEstado("sin-acceso");
        setMensaje("🚫 No tienes acceso al panel.");
        return;
      }

      const negocioConfig = await obtenerConfigNegocio(usuario.uid);
      if (negocioConfig) {
        setUser(usuario);

        // 👇 buscar plantilla en Negocios/{uid}
        const negocioRef = doc(db, "Negocios", usuario.uid);
        const negocioSnap = await getDoc(negocioRef);
        if (negocioSnap.exists()) {
          const plantillaFirestore = negocioSnap.data()?.plantilla || "";
          setPlantilla(plantillaFirestore.toLowerCase());
          console.log("Plantilla desde Firestore:", plantillaFirestore);
        }

        setConfig({
          ...negocioConfig,
          empleados: negocioConfig.empleados || 1,
          empleadosData:
            negocioConfig.empleadosData && negocioConfig.empleadosData.length > 0
              ? negocioConfig.empleadosData
              : Array.from({ length: negocioConfig.empleados || 1 }, () => ({
                  nombre: "",
                  fotoPerfil: "",
                  calendario: { inicio: "08:00", fin: "17:00", diasLibres: [] },
                })),
        });
        setEstado("listo");
      }
    });

    return () => unsub();
  }, []);

  const handleChangeEmpleado = (index: number, field: string, value: any) => {
    const nuevo = [...config.empleadosData];
    nuevo[index][field] = value;
    setConfig((prev: any) => ({ ...prev, empleadosData: nuevo }));
  };

  const handleFotoPerfil = (index: number, file: File | null) => {
    if (!file) return;
    const nuevo = [...config.empleadosData];
    nuevo[index].subiendoPerfil = true;
    nuevo[index].fotoPerfil = file;
    setConfig((prev: any) => ({ ...prev, empleadosData: nuevo }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setEstado("guardando");

    const empleadosConImg = await Promise.all(
      config.empleadosData.map(async (empleado: any) => {
        let fotoPerfil = empleado.fotoPerfil;
        if (fotoPerfil instanceof File) {
          const subida = await subirImagenImgBB(fotoPerfil);
          if (subida) fotoPerfil = subida;
        }
        return {
          ...empleado,
          fotoPerfil,
          calendario: empleado.calendario || {
            inicio: "08:00",
            fin: "17:00",
            diasLibres: [],
          },
        };
      })
    );

    const nuevaConfig = {
      ...config,
      empleadosData: empleadosConImg,
    };

    const ok = await guardarConfigNegocio(user.uid, nuevaConfig);
    setMensaje(ok ? "✅ Cambios guardados." : "❌ Error al guardar.");
    setEstado("listo");
  };

  if (estado === "cargando") return <p className="text-center">Cargando empleados...</p>;
  if (estado === "sin-acceso") return <p className="text-red-600 text-center mt-10">{mensaje}</p>;
  if (!config) return null;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-8">
      {/* Cantidad de empleados */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Cantidad de {getEtiquetaEmpleado(plantilla)}s
        </label>
        <select
          value={config.empleados || 1}
          onChange={(e) => {
            const cantidad = parseInt(e.target.value, 10);
            setConfig((prev: any) => ({
              ...prev,
              empleados: cantidad,
              empleadosData: Array.from({ length: cantidad }, (_, i) => ({
                nombre: prev.empleadosData?.[i]?.nombre || "",
                fotoPerfil: prev.empleadosData?.[i]?.fotoPerfil || "",
                calendario: prev.empleadosData?.[i]?.calendario || {
                  inicio: "08:00",
                  fin: "17:00",
                  diasLibres: [],
                },
              })),
            }));
          }}
          className="w-32 px-4 py-2 bg-gray-100 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-600"
        >
          {Array.from({ length: config.maxEmpleados || 1 }).map((_, i) => (
            <option key={i + 1} value={i + 1}>
              {i + 1}
            </option>
          ))}
        </select>
      </div>

      {/* Cards empleados */}
      <div className="grid sm:grid-cols-2 gap-6">
        {config.empleadosData?.map((empleado: any, index: number) => (
          <div
            key={index}
            className="border rounded-xl shadow-md p-6 flex flex-col items-center gap-4"
          >
            {/* Foto de perfil */}
            <div className="relative">
              <input
                id={`fotoPerfil-${index}`}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleFotoPerfil(index, e.target.files?.[0] || null)}
              />
              <label
                htmlFor={`fotoPerfil-${index}`}
                className="w-24 h-24 rounded-full bg-white border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer overflow-hidden"
              >
                {empleado.subiendoPerfil ? (
                  <div className="w-10 h-10 border-4 border-t-blue-500 border-gray-300 rounded-full animate-spin"></div>
                ) : empleado.fotoPerfil ? (
                  typeof empleado.fotoPerfil === "string" ? (
                    <img src={empleado.fotoPerfil} alt="" className="object-cover w-full h-full" />
                  ) : (
                    <img
                      src={URL.createObjectURL(empleado.fotoPerfil)}
                      alt=""
                      className="object-cover w-full h-full"
                    />
                  )
                ) : (
                  <span className="text-gray-400">+</span>
                )}
              </label>
            </div>

            {/* Nombre */}
            <input
              type="text"
              placeholder={`Nombre del ${getEtiquetaEmpleado(plantilla)}`}
              value={empleado.nombre}
              onChange={(e) => handleChangeEmpleado(index, "nombre", e.target.value)}
              className="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-green-600"
            />

            {/* Rol dinámico 👇 */}
            <p className="text-gray-600 text-sm">{getEtiquetaEmpleado(plantilla)}</p>

            {/* Botón configurar horario */}
            <button
              type="button"
              onClick={() => {
                setEmpleadoSeleccionado(index);
                setHorarioTemp({
                  inicio: empleado?.calendario?.inicio || "08:00",
                  fin: empleado?.calendario?.fin || "17:00",
                  diasLibres: empleado?.calendario?.diasLibres || [],
                });
              }}
              className="w-full bg-indigo-600 text-white px-5 py-2 rounded-lg shadow hover:bg-indigo-700 transition"
            >
              Configurar horario
            </button>
          </div>
        ))}
      </div>

      {/* Guardar */}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={estado === "guardando"}
          className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-8 py-3 rounded-xl shadow hover:opacity-90 transition disabled:opacity-50"
        >
          {estado === "guardando" ? "Guardando..." : "Guardar cambios"}
        </button>
      </div>
    </form>
  );
}
