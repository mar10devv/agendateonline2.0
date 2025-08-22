import { useEffect, useState } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { guardarConfigNegocio, obtenerConfigNegocio } from "../lib/firestore";

export default function DashboardEmpleados() {
  const [user, setUser] = useState<any>(null);
  const [config, setConfig] = useState<any>(null);
  const [estado, setEstado] = useState<"cargando" | "listo" | "guardando" | "sin-acceso">("cargando");
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    const auth = getAuth();
    const unsub = onAuthStateChanged(auth, async (usuario) => {
      if (usuario) {
        const userRef = doc(db, "Usuarios", usuario.uid);
        const snap = await getDoc(userRef);

        if (!snap.exists()) {
          setEstado("sin-acceso");
          setMensaje("🚫 No tienes acceso al panel.");
          return;
        }

        const data = snap.data();
        if (data?.premium) {
          const negocioConfig = await obtenerConfigNegocio(usuario.uid);
          if (negocioConfig) {
            setUser(usuario);
            setConfig(negocioConfig);
            setEstado("listo");
          }
        } else {
          setEstado("sin-acceso");
          setMensaje("🚫 No tienes acceso al panel.");
        }
      } else {
        setEstado("sin-acceso");
        setMensaje("🔒 No has iniciado sesión.");
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
    const reader = new FileReader();
    reader.onloadend = () => {
      handleChangeEmpleado(index, "fotoPerfil", reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleFotoTrabajo = (indexEmpleado: number, slot: number, file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const nuevo = [...config.empleadosData];
      const arr = Array.from({ length: 6 }, (_, i) => nuevo[indexEmpleado]?.trabajos?.[i] || "");
      arr[slot] = reader.result as string;
      nuevo[indexEmpleado].trabajos = arr;
      setConfig((prev: any) => ({ ...prev, empleadosData: nuevo }));
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEstado("guardando");
    const ok = await guardarConfigNegocio(user.uid, config);
    setMensaje(ok ? "✅ Cambios guardados correctamente." : "❌ Error al guardar.");
    setEstado("listo");
  };

  if (estado === "cargando")
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="loader">
          <div className="circle"></div>
          <div className="circle"></div>
          <div className="circle"></div>
          <div className="circle"></div>
        </div>
      </div>
    );

  if (estado === "sin-acceso") return <p className="text-red-600 text-center mt-10">{mensaje}</p>;
  if (!config) return null;

  return (
    <div className="max-w-6xl mx-auto p-6 md:p-10">
      <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
        {/* Encabezado */}
        <div className="px-6 py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white flex items-center justify-between">
          <h1 className="text-xl md:text-2xl font-bold">Panel de empleados</h1>

          <button
            onClick={() => (window.location.href = "/panel")}
            className="flex items-center gap-2 bg-white text-green-700 px-4 py-2 rounded-lg shadow hover:bg-green-50 transition"
          >
            <span className="text-lg">←</span>
            <span className="font-medium">Volver al panel</span>
          </button>
        </div>

        {/* Contenido */}
        <form onSubmit={handleSubmit} className="p-8 space-y-8">
          {/* Selector cantidad */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Cantidad de empleados</label>
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
                    trabajos: prev.empleadosData?.[i]?.trabajos || Array(6).fill(""),
                    calendario: prev.empleadosData?.[i]?.calendario || {},
                  })),
                }));
              }}
              className="w-32 px-4 py-2 bg-gray-100 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-600"
            >
              {[...Array(10)].map((_, i) => (
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
                className="bg-white border rounded-xl shadow-md hover:shadow-lg transition p-6 flex flex-col items-center gap-4 w-full"
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
                    className="w-24 h-24 rounded-full bg-white border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer overflow-hidden shadow-sm hover:border-green-500 transition"
                  >
                    {empleado.fotoPerfil ? (
                      <img
                        src={empleado.fotoPerfil}
                        alt=""
                        className="object-cover w-full h-full"
                      />
                    ) : (
                      <>
                        <span className="text-xl text-gray-500">+</span>
                        <span className="text-xs text-gray-400">Perfil</span>
                      </>
                    )}
                  </label>

                  {/* X para borrar perfil */}
                  {empleado.fotoPerfil && (
                    <button
                      type="button"
                      onClick={() => handleChangeEmpleado(index, "fotoPerfil", "")}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs shadow hover:bg-red-600"
                    >
                      ×
                    </button>
                  )}
                </div>

                {/* Nombre */}
                <input
                  type="text"
                  placeholder="Nombre del empleado"
                  value={empleado.nombre}
                  onChange={(e) => handleChangeEmpleado(index, "nombre", e.target.value)}
                  className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-600"
                />

                {/* Trabajos (6 slots circulares) */}
                <div className="w-full">
                  <p className="text-sm text-gray-600 mb-2">Fotos de trabajos (máx. 6)</p>
                  <div className="grid grid-cols-3 gap-3 justify-items-center">
                    {Array.from({ length: 6 }).map((_, i) => {
                      const img = empleado.trabajos?.[i] || "";
                      return (
                        <div key={i} className="relative w-16 h-16">
                          <input
                            id={`trabajo-${index}-${i}`}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => handleFotoTrabajo(index, i, e.target.files?.[0] || null)}
                          />
                          <label
                            htmlFor={`trabajo-${index}-${i}`}
                            className="w-16 h-16 rounded-full bg-white border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer overflow-hidden shadow-sm hover:border-green-500 transition"
                          >
                            {img ? (
                              <img
                                src={img}
                                alt=""
                                className="object-cover w-full h-full"
                              />
                            ) : (
                              <span className="text-lg text-gray-400">+</span>
                            )}
                          </label>

                          {/* X para borrar cada foto */}
                          {img && (
                            <button
                              type="button"
                              onClick={() => {
                                const nuevo = [...config.empleadosData];
                                const arr = [...(nuevo[index].trabajos || Array(6).fill(""))];
                                arr[i] = "";
                                nuevo[index].trabajos = arr;
                                setConfig((prev: any) => ({ ...prev, empleadosData: nuevo }));
                              }}
                              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs shadow hover:bg-red-600"
                            >
                              ×
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Botón calendario */}
                <button
                  type="button"
                  className="w-full bg-indigo-600 text-white px-5 py-2 rounded-lg shadow hover:bg-indigo-700 transition"
                >
                  Configurar calendario
                </button>
              </div>
            ))}
          </div>

          {/* Botón guardar */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={estado === "guardando"}
              className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-8 py-3 rounded-xl shadow hover:opacity-90 transition disabled:opacity-50"
            >
              {estado === "guardando" ? "Guardando..." : "Guardar empleados"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
