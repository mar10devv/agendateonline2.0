// src/pages/panel-admin.tsx
import { useEffect, useState } from "react";
import { db } from "../../lib/firebase";
import { collection, getDocs, updateDoc, doc } from "firebase/firestore";

type Usuario = {
  id: string;
  nombre: string;
  email: string;
  rol: "usuario" | "negocio" | "admin";
  premium: boolean;
  slug?: string;
};

export default function PanelAdmin() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [busqueda, setBusqueda] = useState("");

  useEffect(() => {
    const cargarUsuarios = async () => {
      const snap = await getDocs(collection(db, "Usuarios"));
      const data = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Usuario, "id">),
      }));
      setUsuarios(data);
    };
    cargarUsuarios();
  }, []);

  const togglePremium = async (uid: string, premium: boolean) => {
    await updateDoc(doc(db, "Usuarios", uid), { premium });
    setUsuarios((prev) =>
      prev.map((u) => (u.id === uid ? { ...u, premium } : u))
    );
  };

  const cambiarSlug = async (uid: string, slug: string) => {
    await updateDoc(doc(db, "Usuarios", uid), { slug });
    setUsuarios((prev) =>
      prev.map((u) => (u.id === uid ? { ...u, slug } : u))
    );
  };

  // Filtrar usuarios
  const filtrados = usuarios.filter(
    (u) =>
      u.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      u.email.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <section className="p-6 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold mb-6">Panel de Administración</h1>

      {/* Buscador */}
      <input
        type="text"
        placeholder="Buscar por nombre o email..."
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        className="border rounded px-4 py-2 mb-4 w-full"
      />

      {/* Tabla usuarios */}
      <table className="w-full bg-white shadow rounded">
        <thead>
          <tr className="bg-gray-100 text-left">
            <th className="p-3">Nombre</th>
            <th className="p-3">Email</th>
            <th className="p-3">Premium</th>
            <th className="p-3">Slug</th>
          </tr>
        </thead>
        <tbody>
          {filtrados.map((u) => (
            <tr key={u.id} className="border-t">
              <td className="p-3">{u.nombre}</td>
              <td className="p-3">{u.email}</td>
              <td className="p-3">
                <button
                  onClick={() => togglePremium(u.id, !u.premium)}
                  className={`px-3 py-1 rounded ${
                    u.premium ? "bg-green-500 text-white" : "bg-gray-200"
                  }`}
                >
                  {u.premium ? "Activo" : "Inactivo"}
                </button>
              </td>
              <td className="p-3">
                {u.premium ? (
                  <input
                    type="text"
                    value={u.slug || ""}
                    onChange={(e) => cambiarSlug(u.id, e.target.value)}
                    className="border rounded p-1"
                    placeholder="ej: barberstyle"
                  />
                ) : (
                  "-"
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
