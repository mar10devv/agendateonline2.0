// src/components/agendaVirtual/ui/ModalEmpleados.tsx
import { useState, useEffect } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../../lib/firebase";
import { guardarConfigNegocio, obtenerConfigNegocio } from "../../../lib/firestore";
import ModalBase from "../../ui/modalGenerico";
import ModalAviso from "../../ui/modalAviso";

// 🚀 Subida a ImgBB
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

type Props = {
  abierto: boolean;
  onCerrar: () => void;
};

export default function ModalEmpleados({ abierto, onCerrar }: Props) {
  const [user, setUser] = useState<any>(null);
  const [config, setConfig] = useState<any>(null);
  const [estado, setEstado] = useState<"cargando" | "listo" | "guardando" | "sin-acceso">("cargando");

  const [empleadoSeleccionado, setEmpleadoSeleccionado] = useState<number | null>(null);
  const [horarioTemp, setHorarioTemp] = useState({
    inicio: "08:00",
    fin: "17:00",
    diasLibres: [] as string[],
  });

  const [empleadoAEliminar, setEmpleadoAEliminar] = useState<number | null>(null);
  const [mostrarAviso, setMostrarAviso] = useState(false);

  const agregarEmpleado = () => {
    const nuevoEmpleado = {
      nombre: "",
      fotoPerfil: "",
      trabajos: Array(6).fill(""),
      calendario: { inicio: "08:00", fin: "17:00", diasLibres: [] },
    };
    setConfig((prev: any) => ({
      ...prev,
      empleadosData: [...(prev.empleadosData || []), nuevoEmpleado],
    }));
  };

  // 🔑 Detectar usuario y cargar config
  useEffect(() => {
    if (!abierto) return;
    const auth = getAuth();
    const unsub = onAuthStateChanged(auth, async (usuario) => {
      if (usuario) {
        const userRef = doc(db, "Usuarios", usuario.uid);
        const snap = await getDoc(userRef);

        if (!snap.exists()) {
          setEstado("sin-acceso");
          return;
        }

        const data = snap.data();
        if (data?.premium) {
          const negocioConfig = await obtenerConfigNegocio(usuario.uid);
          if (negocioConfig) {
            setUser(usuario);
            setConfig({
              ...negocioConfig,
              empleados: negocioConfig.empleados || 1,
              empleadosData:
                negocioConfig.empleadosData && negocioConfig.empleadosData.length > 0
                  ? negocioConfig.empleadosData
                  : [
                      {
                        nombre: "",
                        fotoPerfil: "",
                        trabajos: Array(6).fill(""),
                        calendario: { inicio: "08:00", fin: "17:00", diasLibres: [] },
                      },
                    ],
            });
            setEstado("listo");
          }
        } else {
          setEstado("sin-acceso");
        }
      }
    });

    return () => unsub();
  }, [abierto]);

  const handleChangeEmpleado = (index: number, field: string, value: any) => {
    const nuevo = [...config.empleadosData];
    nuevo[index][field] = value;
    setConfig((prev: any) => ({ ...prev, empleadosData: nuevo }));
  };

  const handleFotoPerfil = async (index: number, file: File | null) => {
    if (!file) return;
    const url = await subirImagenImgBB(file);
    if (!url) return;
    handleChangeEmpleado(index, "fotoPerfil", url);
  };

  const handleSubmit = async () => {
    if (!user) return;
    setEstado("guardando");
    await guardarConfigNegocio(user.uid, config);
    setEstado("listo");
    onCerrar();
  };

  if (!abierto) return null;

  return (
    <>
      <ModalBase abierto={abierto} onClose={onCerrar} titulo="Configuración de empleados" maxWidth="max-w-4xl">
        {estado === "cargando" && <p>Cargando...</p>}
        {estado === "sin-acceso" && <p className="text-red-400">🚫 No tienes acceso</p>}
        {estado === "listo" && (
          <div className="flex flex-col gap-6">
            {config.empleadosData.map((empleado: any, index: number) => (
              <div
                key={index}
                className="relative border border-gray-700 rounded-xl p-6 flex flex-col sm:flex-row gap-6 items-center bg-neutral-800"
              >
                {/* Botón eliminar */}
                <button
                  type="button"
                  onClick={() => {
                    setEmpleadoAEliminar(index);
                    setMostrarAviso(true);
                  }}
                  className="absolute top-2 right-2 flex items-center justify-center w-7 h-7 rounded-full 
                             bg-red-600 text-white text-sm font-bold 
                             hover:bg-red-700 active:bg-red-800"
                  title="Eliminar empleado"
                >
                  X
                </button>

                {/* Foto perfil */}
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
                    className="w-24 h-24 rounded-full bg-neutral-700 flex items-center justify-center cursor-pointer overflow-hidden shadow-sm hover:border-green-500 transition"
                  >
                    {empleado.fotoPerfil ? (
                      <img src={empleado.fotoPerfil} alt="" className="object-cover w-full h-full" />
                    ) : (
                      <span className="text-xl text-gray-400">+</span>
                    )}
                  </label>
                </div>

                {/* Datos */}
                <div className="flex-1 flex flex-col gap-3">
                  <input
                    type="text"
                    placeholder="Nombre del empleado"
                    value={empleado.nombre}
                    onChange={(e) => handleChangeEmpleado(index, "nombre", e.target.value)}
                    className="w-full px-4 py-2 bg-neutral-800 border border-gray-700 rounded-md text-white focus:ring-2 focus:ring-green-600"
                  />
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setEmpleadoSeleccionado(index)}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-md shadow hover:bg-indigo-700 transition"
                    >
                      Configurar horario
                    </button>
                    <button
                      type="button"
                      onClick={() => alert(`Abrir servicios para ${empleado.nombre || "empleado"}`)}
                      className="px-4 py-2 bg-purple-600 text-white rounded-md shadow hover:bg-purple-700 transition"
                    >
                      Configurar servicios
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {/* Botón guardar / añadir */}
            <div className="flex justify-between mt-6">
              <button
                onClick={agregarEmpleado}
                className="bg-blue-600 text-white px-6 py-3 rounded-xl shadow hover:bg-blue-700 transition"
              >
                ➕ Añadir empleado
              </button>
              <button
                onClick={handleSubmit}
                className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-8 py-3 rounded-xl shadow hover:opacity-90 transition"
              >
                Guardar cambios
              </button>
            </div>
          </div>
        )}
      </ModalBase>

      {/* Modal horario */}
      {empleadoSeleccionado !== null && (
        <ModalBase
          abierto={empleadoSeleccionado !== null}
          onClose={() => setEmpleadoSeleccionado(null)}
          titulo="Configurar horario"
          maxWidth="max-w-lg"
        >
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm">Inicio</label>
              <input
                type="time"
                value={horarioTemp.inicio}
                onChange={(e) => setHorarioTemp({ ...horarioTemp, inicio: e.target.value })}
                className="w-full px-3 py-2 bg-neutral-800 border border-gray-700 rounded-md text-white"
              />
            </div>
            <div>
              <label className="block text-sm">Fin</label>
              <input
                type="time"
                value={horarioTemp.fin}
                onChange={(e) => setHorarioTemp({ ...horarioTemp, fin: e.target.value })}
                className="w-full px-3 py-2 bg-neutral-800 border border-gray-700 rounded-md text-white"
              />
            </div>
          </div>

          <div className="flex justify-end gap-4">
            <button
              onClick={() => setEmpleadoSeleccionado(null)}
              className="px-5 py-2 rounded-lg bg-gray-700 text-gray-200 hover:bg-gray-600"
            >
              Cancelar
            </button>
            <button
              onClick={() => {
                const nuevo = [...config.empleadosData];
                nuevo[empleadoSeleccionado].calendario = horarioTemp;
                setConfig((prev: any) => ({
                  ...prev,
                  empleadosData: nuevo,
                }));
                setEmpleadoSeleccionado(null);
              }}
              className="px-6 py-2 rounded-lg bg-green-600 text-white"
            >
              Guardar
            </button>
          </div>
        </ModalBase>
      )}

      {/* Modal aviso eliminación */}
      {mostrarAviso && (
        <ModalAviso
          abierto={mostrarAviso}
          onClose={() => {
            setMostrarAviso(false);
            setEmpleadoAEliminar(null);
          }}
          onConfirm={() => {
            if (empleadoAEliminar !== null) {
              setConfig((prev: any) => ({
                ...prev,
                empleadosData: prev.empleadosData.filter((_: any, i: number) => i !== empleadoAEliminar),
              }));
            }
            setMostrarAviso(false);
            setEmpleadoAEliminar(null);
          }}
          titulo="Eliminar empleado"
        >
          ¿Seguro que deseas eliminar este empleado?
        </ModalAviso>
      )}
    </>
  );
}
