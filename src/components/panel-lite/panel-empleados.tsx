// src/components/panel-lite/panel-empleados.tsx
import { useEffect, useState } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { guardarConfigNegocio, obtenerConfigNegocio } from "../../lib/firestore";

// 🔑 etiquetas dinámicas por plantilla
const etiquetasPorPlantilla: Record<string, string> = {
  barberia: "Barbero",
  dentista: "Dentista",
  tatuajes: "Tatuador",
  peluqueria: "Estilista",
  spa: "Masajista",
};

function getEtiquetaEmpleado(plantilla?: string) {
  if (!plantilla) return "empleado";
  return etiquetasPorPlantilla[plantilla.toLowerCase()] || "empleado";
}

// 🚀 Subida a ImgBB (foto de perfil)
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
  const [plantilla, setPlantilla] = useState<string>("");
  const [estado, setEstado] = useState<
    "cargando" | "listo" | "guardando" | "sin-acceso"
  >("cargando");
  const [mensaje, setMensaje] = useState("");

  // 🔹 Modal horario
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

  // Forzar renderizado con preview
  const img = new Image();
  img.onload = () => {
    const actualizado = [...config.empleadosData];
    actualizado[index].subiendoPerfil = false;
    setConfig((prev: any) => ({ ...prev, empleadosData: actualizado }));
  };
  img.src = URL.createObjectURL(file);
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

  {/* Botón X para borrar foto */}
  {empleado.fotoPerfil && (
    <button
      type="button"
      onClick={() => handleChangeEmpleado(index, "fotoPerfil", "")}
      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs shadow hover:bg-red-600"
    >
      ×
    </button>
  )}
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

      {/* 🔹 Modal Configurar horario (reutilizado de DashboardEmpleados) */}
      {empleadoSeleccionado !== null && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-8">
            <h2 className="text-2xl font-bold mb-6 text-gray-800 text-center">
              Configurar horario
            </h2>

            {/* Horario */}
            <div className="grid grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Inicio
                </label>
                <input
                  type="time"
                  value={horarioTemp.inicio}
                  onChange={(e) => setHorarioTemp({ ...horarioTemp, inicio: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Fin
                </label>
                <input
                  type="time"
                  value={horarioTemp.fin}
                  onChange={(e) => setHorarioTemp({ ...horarioTemp, fin: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>

            {/* Días libres */}
            <p className="font-semibold mb-3 text-gray-700">Seleccionar días libres</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
              {["lunes","martes","miércoles","jueves","viernes","sábado","domingo"].map((dia) => {
                const activo = horarioTemp.diasLibres.includes(dia);
                return (
                  <button
                    key={dia}
                    type="button"
                    onClick={() => {
                      setHorarioTemp((prev) => {
                        const nuevo = activo
                          ? prev.diasLibres.filter((d) => d !== dia)
                          : [...prev.diasLibres, dia];
                        return { ...prev, diasLibres: nuevo };
                      });
                    }}
                    className={`px-3 py-2 rounded-lg border text-sm font-medium transition
                      ${
                        activo
                          ? "bg-green-600 text-white border-green-600"
                          : "bg-white text-gray-700 border-gray-300 hover:border-green-400"
                      }`}
                  >
                    {dia}
                  </button>
                );
              })}
            </div>

            {/* Botones */}
            <div className="flex justify-end gap-4">
              <button
                type="button"
                onClick={() => setEmpleadoSeleccionado(null)}
                className="px-5 py-2 rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300"
              >
                Cancelar
              </button>
              <button
  type="button"
  onClick={async () => {
    if (empleadoSeleccionado === null || !user) return;

    // 👉 Actualizar estado local
    const nuevo = [...config.empleadosData];
    nuevo[empleadoSeleccionado].calendario = { ...horarioTemp };
    const nuevaConfig = { ...config, empleadosData: nuevo };

    setConfig(nuevaConfig);
    setEmpleadoSeleccionado(null);

    // 👉 Guardar en Firebase
    setEstado("guardando");
    const ok = await guardarConfigNegocio(user.uid, nuevaConfig);
    setMensaje(ok ? "✅ Horario guardado correctamente." : "❌ Error al guardar.");
    setEstado("listo");
  }}
  className="px-6 py-2 rounded-lg bg-gradient-to-r from-green-600 to-emerald-600 text-white font-semibold shadow hover:opacity-90 transition"
>
  Guardar
</button>

            </div>
          </div>
        </div>
      )}
    </form>
  );
}
