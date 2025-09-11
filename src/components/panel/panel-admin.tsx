// src/components/panel/PanelAdmin.tsx
import { useEffect, useState } from "react";
import { db, auth } from "../../lib/firebase";
import {
  collection,
  getDocs,
  updateDoc,
  doc,
  getDoc,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

type Usuario = {
  id: string;
  nombre?: string;
  email?: string;
  fotoPerfil?: string;
  foto?: string;
  rol: "usuario" | "negocio" | "admin";
  premium: boolean;
  plantilla?: string;
};

export default function PanelAdmin() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState<Usuario | null>(null);

  const plantillas = ["barberia"];

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const snap = await getDoc(doc(db, "Usuarios", user.uid));
        setIsAdmin(snap.exists() && snap.data()?.rol === "admin");
      } else {
        setIsAdmin(false);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    const cargarUsuarios = async () => {
      const snap = await getDocs(collection(db, "Usuarios"));
      const data: Usuario[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Usuario, "id">),
      }));
      setUsuarios(data);
    };
    cargarUsuarios();
  }, [isAdmin]);

  const togglePremium = async (usuario: Usuario) => {
    try {
      await updateDoc(doc(db, "Usuarios", usuario.id), {
        premium: !usuario.premium,
        rol: !usuario.premium ? "negocio" : "usuario",
      });
      setUsuarios((prev) =>
        prev.map((u) =>
          u.id === usuario.id
            ? { ...u, premium: !usuario.premium, rol: !usuario.premium ? "negocio" : "usuario" }
            : u
        )
      );
      setUsuarioSeleccionado((prev) =>
        prev ? { ...prev, premium: !prev.premium, rol: !prev.premium ? "negocio" : "usuario" } : prev
      );
    } catch (err) {
      console.error("Error cambiando premium:", err);
    }
  };

  const asignarPlantilla = async (usuarioId: string, plantilla: string) => {
    try {
      await updateDoc(doc(db, "Usuarios", usuarioId), { plantilla });
      setUsuarios((prev) =>
        prev.map((u) => (u.id === usuarioId ? { ...u, plantilla } : u))
      );
      setUsuarioSeleccionado((prev) =>
        prev ? { ...prev, plantilla } : prev
      );
    } catch (err) {
      console.error("Error asignando plantilla:", err);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-gray-700">
        <p>Cargando usuarios...</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-red-600 font-semibold">
          🚫 No tenés permiso para ver este panel
        </p>
      </div>
    );
  }

  return (
    <div className="w-[95vw] sm:w-[90vw] max-w-6xl mx-auto p-2 sm:p-4 md:p-6">
      <div className="w-full bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex items-center justify-between">
          <h1 className="text-xl md:text-2xl font-bold">Panel de Administración</h1>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
            {usuarios.map((u) => {
              const foto =
                u.fotoPerfil && u.fotoPerfil.trim() !== ""
                  ? u.fotoPerfil
                  : u.foto && u.foto.trim() !== ""
                  ? u.foto
                  : `https://ui-avatars.com/api/?name=${encodeURIComponent(
                      u.nombre || "U"
                    )}&background=random`;

              return (
                <div
                  key={u.id}
                  onClick={() => setUsuarioSeleccionado(u)}
                  className="w-full h-52 bg-gray-100 rounded-xl shadow-2xl flex flex-col items-center justify-center text-center text-gray-700 hover:scale-105 transition cursor-pointer p-3"
                >
                  <img
                    src={foto}
                    alt={u.nombre || "Usuario"}
                    className="w-16 h-16 rounded-full mb-3 border-2 border-gray-300 object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <span className="font-semibold">{u.nombre || "Sin nombre"}</span>
                  <span className="text-xs opacity-70 truncate w-full max-w-[120px]">
                    {u.email}
                  </span>
                  <span
                    className={`mt-2 px-2 py-1 text-xs rounded ${
                      u.premium ? "bg-green-500 text-white" : "bg-gray-300"
                    }`}
                  >
                    {u.premium ? "Premium" : "Gratis"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Modal configuración usuario */}
      {usuarioSeleccionado && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-[90%] max-w-md relative">
            <button
              onClick={() => setUsuarioSeleccionado(null)}
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
            <h2 className="text-xl font-bold mb-4">
              Configuración de {usuarioSeleccionado.nombre}
            </h2>

            {/* Premium con toggle */}
            <div className="mb-4">
              <p className="font-medium mb-2">Estado Premium:</p>
              <label className="relative inline-block w-[3.5em] h-[2em]">
                <input
                  type="checkbox"
                  checked={usuarioSeleccionado.premium}
                  onChange={() => togglePremium(usuarioSeleccionado)}
                  className="opacity-0 w-0 h-0 peer"
                />
                <span
                  className="
                    absolute cursor-pointer top-0 left-0 right-0 bottom-0
                    bg-gray-300 rounded-full transition-colors duration-300
                    peer-checked:bg-green-500
                    after:content-[''] after:absolute after:h-[1.4em] after:w-[1.4em]
                    after:rounded-full after:left-[0.3em] after:top-[0.3em]
                    after:bg-white after:shadow-md after:transition-transform after:duration-300
                    peer-checked:after:translate-x-[1.5em]
                  "
                ></span>
              </label>
            </div>

            {/* Plantilla */}
            <div className="mb-4">
              <p className="font-medium">Plantilla:</p>
              <select
                value={usuarioSeleccionado.plantilla || ""}
                onChange={(e) =>
                  asignarPlantilla(usuarioSeleccionado.id, e.target.value)
                }
                className="border rounded px-2 py-1 mt-2 w-full"
              >
                <option value="">-- Seleccionar --</option>
                {plantillas.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            {/* Estadísticas */}
            <button
              onClick={() =>
                (window.location.href = `/panel/panel-estadisticas?user=${usuarioSeleccionado.id}`)
              }
              className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition"
            >
              Ver estadísticas
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
