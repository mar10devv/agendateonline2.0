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
  rol: "usuario" | "negocio" | "admin";
  premium: boolean;
  negocioId?: string;
};

type Negocio = {
  id: string;
  nombre: string;
  slug: string;
  telefono?: string;
  plantilla?: string;
};

type UsuarioConNegocio = Usuario & {
  negocio?: Negocio;
};

export default function PanelAdmin() {
  const [usuarios, setUsuarios] = useState<UsuarioConNegocio[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [negocios, setNegocios] = useState<Negocio[]>([]);

  // Chequear si el usuario logueado es admin
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const snap = await getDoc(doc(db, "Usuarios", user.uid));
          if (snap.exists() && snap.data()?.rol === "admin") {
            setIsAdmin(true);
          } else {
            setIsAdmin(false);
          }
        } catch (err) {
          console.error("Error al obtener usuario:", err);
          setIsAdmin(false);
        }
      } else {
        setIsAdmin(false);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // Cargar usuarios + negocios si sos admin
  useEffect(() => {
    if (!isAdmin) return;

    const cargarDatos = async () => {
      // Cargar usuarios
      const snapUsuarios = await getDocs(collection(db, "Usuarios"));
      const usuariosData: Usuario[] = snapUsuarios.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Usuario, "id">),
      }));

      // Cargar negocios
      const snapNegocios = await getDocs(collection(db, "Negocios"));
      const negociosData: Negocio[] = snapNegocios.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Negocio, "id">),
      }));

      // Relacionar usuarios con negocios
      const usuariosConNegocio: UsuarioConNegocio[] = usuariosData.map((u) => {
        const negocio = u.negocioId
          ? negociosData.find((n) => n.id === u.negocioId)
          : undefined;
        return { ...u, negocio };
      });

      setUsuarios(usuariosConNegocio);
      setNegocios(negociosData);
    };

    cargarDatos();
  }, [isAdmin]);

  const asignarNegocio = async (usuarioId: string, negocioId: string) => {
    try {
      await updateDoc(doc(db, "Usuarios", usuarioId), { negocioId });
      alert("✅ Negocio asignado correctamente");
      // refrescar lista
      const snapUsuarios = await getDocs(collection(db, "Usuarios"));
      const usuariosData: Usuario[] = snapUsuarios.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Usuario, "id">),
      }));
      const usuariosConNegocio: UsuarioConNegocio[] = usuariosData.map((u) => {
        const negocio = u.negocioId
          ? negocios.find((n) => n.id === u.negocioId)
          : undefined;
        return { ...u, negocio };
      });
      setUsuarios(usuariosConNegocio);
    } catch (err) {
      console.error("Error asignando negocio:", err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-600">Cargando...</p>
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

  // --- render del panel admin ---
  return (
    <section className="p-6 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold mb-6">Panel de Administración</h1>

      <input
        type="text"
        placeholder="Buscar por usuario, email o negocio..."
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        className="border rounded px-4 py-2 mb-4 w-full"
      />

      <table className="w-full bg-white shadow rounded">
        <thead>
          <tr className="bg-gray-100 text-left">
            <th className="p-3">Usuario</th>
            <th className="p-3">Email</th>
            <th className="p-3">Rol</th>
            <th className="p-3">Premium</th>
            <th className="p-3">Negocio</th>
            <th className="p-3">Slug</th>
            <th className="p-3">Teléfono</th>
            <th className="p-3">Asignar Negocio</th>
          </tr>
        </thead>
        <tbody>
          {usuarios
            .filter(
              (u) =>
                (u.nombre || "")
                  .toLowerCase()
                  .includes(busqueda.toLowerCase()) ||
                (u.email || "")
                  .toLowerCase()
                  .includes(busqueda.toLowerCase()) ||
                (u.negocio?.nombre || "")
                  .toLowerCase()
                  .includes(busqueda.toLowerCase())
            )
            .map((u) => (
              <tr key={u.id} className="border-t">
                <td className="p-3">{u.nombre || "-"}</td>
                <td className="p-3">{u.email || "-"}</td>
                <td className="p-3 capitalize">{u.rol}</td>
                <td className="p-3">
                  <span
                    className={`px-2 py-1 rounded text-sm ${
                      u.premium ? "bg-green-500 text-white" : "bg-gray-300"
                    }`}
                  >
                    {u.premium ? "Activo" : "Inactivo"}
                  </span>
                </td>
                <td className="p-3">{u.negocio?.nombre || "-"}</td>
                <td className="p-3">{u.negocio?.slug || "-"}</td>
                <td className="p-3">{u.negocio?.telefono || "-"}</td>
                <td className="p-3">
                  <select
                    value={u.negocio?.id || ""}
                    onChange={(e) => asignarNegocio(u.id, e.target.value)}
                    className="border rounded px-2 py-1"
                  >
                    <option value="">-- Seleccionar --</option>
                    {negocios.map((n) => (
                      <option key={n.id} value={n.id}>
                        {n.nombre} ({n.slug})
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
        </tbody>
      </table>
    </section>
  );
}
