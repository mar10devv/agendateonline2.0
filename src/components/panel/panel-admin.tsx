import { useEffect, useState } from "react";
import { db, auth } from "../../lib/firebase";
import {
  collection,
  getDocs,
  updateDoc,
  doc,
  getDoc,
  query,
  where,
  setDoc,
  serverTimestamp,
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
  tipoPremium?: "gold" | "lite" | "";
  plantilla?: string;
};

type Negocio = {
  slug?: string;
  urlPersonal?: string;
  plantilla?: string;
};

export default function PanelAdmin() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [usuarioSeleccionado, setUsuarioSeleccionado] =
    useState<Usuario | null>(null);
  const [negocioSeleccionado, setNegocioSeleccionado] =
    useState<Negocio | null>(null);

  // 👉 nueva tab
  const [activeTab, setActiveTab] = useState<"usuarios" | "codigos">("usuarios");

  // 👉 estados para codigos premium
  const [codigos, setCodigos] = useState<any[]>([]);
  const [loadingCodigos, setLoadingCodigos] = useState(true);

  const plantillasDisponibles = [
    { id: "barberia", label: "Barbería" },
    { id: "tatuajes", label: "Casa de Tatuajes" },
    { id: "peluqueria", label: "Peluquería" },
    { id: "dentista", label: "Dentista" },
    { id: "spa", label: "Spa" },
  ];

  // 🔹 Generar un código aleatorio de 15 cifras
  const generarCodigo = () => {
    let codigo = "";
    for (let i = 0; i < 15; i++) {
      codigo += Math.floor(Math.random() * 10); // solo números
    }
    return codigo;
  };

  // 🔹 Crear un nuevo código en Firebase
  const crearCodigo = async () => {
    try {
      const nuevoCodigo = generarCodigo();
      await setDoc(doc(db, "CodigosPremium", nuevoCodigo), {
        codigo: nuevoCodigo,
        valido: true,
        usado: false,
        usadoPor: null,
        fechaCreacion: serverTimestamp(),
      });
      alert(`✅ Código creado: ${nuevoCodigo}`);
      cargarCodigos();
    } catch (err) {
      console.error("Error creando código:", err);
    }
  };

  // 🔹 Cargar códigos desde Firestore
  const cargarCodigos = async () => {
    setLoadingCodigos(true);
    try {
      const snap = await getDocs(collection(db, "CodigosPremium"));
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setCodigos(data);
    } catch (err) {
      console.error("Error cargando códigos:", err);
    }
    setLoadingCodigos(false);
  };

  // 🔑 Normaliza string
  function normalizarTexto(texto: string) {
    return texto
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "");
  }

  // 🔑 Base desde email (antes del @)
  function baseDesdeEmail(email: string, nombre?: string) {
    if (!email) return normalizarTexto(nombre || "usuario");
    return normalizarTexto(email.split("@")[0]);
  }

  // 🔑 Generar slug único en Firestore (colección Negocios)
  async function generarSlugUnico(nombre: string, email: string) {
    const base = baseDesdeEmail(email, nombre);
    let slug = base;

    let existe = true;
    while (existe) {
      const q = query(collection(db, "Negocios"), where("slug", "==", slug));
      const snap = await getDocs(q);

      if (snap.empty) {
        existe = false;
      } else {
        const randomSuffix = Math.random().toString(36).substring(2, 7);
        slug = `${base}-${randomSuffix}`;
      }
    }

    return slug;
  }

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
      const data: Usuario[] = snap.docs.map((d) => {
        const datos = d.data() as any;
        return {
          id: d.id,
          nombre: datos.nombre,
          email: datos.email,
          fotoPerfil: datos.fotoPerfil,
          foto: datos.foto,
          rol: datos.rol || "usuario",
          premium: datos.premium || false,
          tipoPremium: datos.tipoPremium || "",
          plantilla: datos.plantilla,
        };
      });
      setUsuarios(data);
    };
    cargarUsuarios();
  }, [isAdmin]);

  // 🔄 Cargar codigos cuando entra en la tab
  useEffect(() => {
    if (activeTab === "codigos") {
      cargarCodigos();
    }
  }, [activeTab]);

  // ... 👇 mantengo toda tu lógica de actualizarPremium, actualizarTipoPremium y asignarPlantilla sin tocar ...

  const actualizarPremium = async (usuarioId: string, nuevoValor: boolean) => {
    try {
      let cambiosUsuario: any = { premium: nuevoValor };

      if (nuevoValor) {
        cambiosUsuario.tipoPremium = "lite";

        const snap = await getDoc(doc(db, "Usuarios", usuarioId));
        const datos = snap.data();

        if (datos?.nombre && datos?.email) {
          const slug = await generarSlugUnico(datos.nombre, datos.email);

          await setDoc(
            doc(db, "Negocios", usuarioId),
            {
              nombre: datos.nombre,
              emailContacto: datos.email || "",
              slug,
              urlPersonal: `https://agendateonline.com/${slug}`,
              plantilla: datos.plantilla || "",
            },
            { merge: true }
          );
        }
      } else {
        cambiosUsuario.tipoPremium = "";

        await setDoc(
          doc(db, "Negocios", usuarioId),
          { slug: "", urlPersonal: "", plantilla: "" },
          { merge: true }
        );
      }

      await updateDoc(doc(db, "Usuarios", usuarioId), cambiosUsuario);

      setUsuarios((prev) =>
        prev.map((u) => (u.id === usuarioId ? { ...u, ...cambiosUsuario } : u))
      );

      setUsuarioSeleccionado((prev) =>
        prev ? { ...prev, ...cambiosUsuario } : prev
      );

      const snapNegocio = await getDoc(doc(db, "Negocios", usuarioId));
      if (snapNegocio.exists()) {
        setNegocioSeleccionado(snapNegocio.data() as Negocio);
      }
    } catch (err) {
      console.error("Error cambiando premium:", err);
    }
  };

  const actualizarTipoPremium = async (usuarioId: string, tipo: string) => {
    try {
      let cambios: any = { tipoPremium: tipo };

      if (tipo === "gold" || tipo === "lite") {
        const snap = await getDoc(doc(db, "Negocios", usuarioId));
        if (!snap.exists() || !snap.data()?.slug) {
          const snapUser = await getDoc(doc(db, "Usuarios", usuarioId));
          const datos = snapUser.data();
          if (datos?.nombre && datos?.email) {
            const slug = await generarSlugUnico(datos.nombre, datos.email);
            await setDoc(
              doc(db, "Negocios", usuarioId),
              {
                nombre: datos.nombre,
                emailContacto: datos.email || "",
                slug,
                urlPersonal: `https://agendateonline.com/${slug}`,
                plantilla: datos.plantilla || "",
              },
              { merge: true }
            );
          }
        }
      }

      await updateDoc(doc(db, "Usuarios", usuarioId), cambios);

      setUsuarios((prev) =>
        prev.map((u) => (u.id === usuarioId ? { ...u, ...cambios } : u))
      );

      setUsuarioSeleccionado((prev) =>
        prev ? { ...prev, ...cambios } : prev
      );

      const snapNegocio = await getDoc(doc(db, "Negocios", usuarioId));
      if (snapNegocio.exists()) {
        setNegocioSeleccionado(snapNegocio.data() as Negocio);
      }
    } catch (err) {
      console.error("Error actualizando tipoPremium:", err);
    }
  };

  const asignarPlantilla = async (usuarioId: string, plantilla: string) => {
    try {
      await updateDoc(doc(db, "Usuarios", usuarioId), { plantilla });
      await setDoc(doc(db, "Negocios", usuarioId), { plantilla }, { merge: true });

      setUsuarios((prev) =>
        prev.map((u) => (u.id === usuarioId ? { ...u, plantilla } : u))
      );
      setUsuarioSeleccionado((prev) =>
        prev ? { ...prev, plantilla } : prev
      );
      setNegocioSeleccionado((prev) =>
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

        {/* 🔹 Tabs */}
        <div className="flex border-b bg-gray-50">
          <button
            onClick={() => setActiveTab("usuarios")}
            className={`flex-1 py-3 text-center font-medium ${
              activeTab === "usuarios"
                ? "text-blue-600 border-b-2 border-blue-600 bg-white"
                : "text-gray-600 hover:text-blue-600"
            }`}
          >
            Usuarios
          </button>
          <button
            onClick={() => setActiveTab("codigos")}
            className={`flex-1 py-3 text-center font-medium ${
              activeTab === "codigos"
                ? "text-blue-600 border-b-2 border-blue-600 bg-white"
                : "text-gray-600 hover:text-blue-600"
            }`}
          >
            Códigos Premium
          </button>
        </div>

        {/* 🔹 Contenido de cada tab */}
        <div className="p-6">
          {activeTab === "usuarios" && (
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
                    <span className="font-semibold">
                      {u.nombre || "Sin nombre"}
                    </span>
                    <span className="text-xs opacity-70 truncate w-full max-w-[120px]">
                      {u.email}
                    </span>
                    <span
                      className={`mt-2 px-2 py-1 text-xs rounded ${
                        !u.premium
                          ? "bg-gray-300"
                          : u.tipoPremium === "gold"
                          ? "bg-green-500 text-white"
                          : u.tipoPremium === "lite"
                          ? "bg-yellow-500 text-white"
                          : "bg-blue-400 text-white"
                      }`}
                    >
                      {!u.premium
                        ? "Gratis"
                        : u.tipoPremium === "gold"
                        ? "Premium Gold"
                        : u.tipoPremium === "lite"
                        ? "Premium Lite"
                        : "Premium"}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {activeTab === "codigos" && (
            <div>
              <h2 className="text-lg font-bold mb-4">Gestión de Códigos Premium</h2>
              <button
                onClick={crearCodigo}
                className="mb-4 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
              >
                Generar nuevo código
              </button>

              {loadingCodigos ? (
                <p className="text-gray-600">Cargando códigos...</p>
              ) : (
                <table className="w-full text-sm border">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="p-2 border">Código</th>
                      <th className="p-2 border">Estado</th>
                      <th className="p-2 border">Usado por</th>
                      <th className="p-2 border">Fecha</th>
                    </tr>
                  </thead>
                  <tbody>
                    {codigos.map((c) => (
                      <tr key={c.id} className="text-center">
                        <td className="p-2 border font-mono">{c.codigo}</td>
                        <td className="p-2 border">
                          {c.usado
                            ? "❌ Usado"
                            : c.valido
                            ? "✅ Disponible"
                            : "⚠️ Invalido"}
                        </td>
                        <td className="p-2 border">{c.usadoPor || "-"}</td>
                        <td className="p-2 border">
                          {c.fechaCreacion?.toDate
                            ? c.fechaCreacion.toDate().toLocaleString()
                            : "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
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

            {negocioSeleccionado?.slug && (
              <p className="mb-4 text-sm text-blue-600 break-all">
                URL actual:{" "}
                <a
                  href={`https://agendateonline.com/${negocioSeleccionado.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  https://agendateonline.com/{negocioSeleccionado.slug}
                </a>
              </p>
            )}

            {/* Toggle Premium */}
            <div className="mb-4">
              <p className="font-medium mb-2">Estado Premium:</p>
              <label className="relative inline-block w-[3.5em] h-[2em]">
                <input
                  type="checkbox"
                  checked={usuarioSeleccionado.premium}
                  onChange={() =>
                    actualizarPremium(
                      usuarioSeleccionado.id,
                      !usuarioSeleccionado.premium
                    )
                  }
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

            {/* Tipo Premium */}
            {usuarioSeleccionado.premium && (
              <div className="mb-4">
                <p className="font-medium mb-2">Tipo de Premium:</p>
                <select
                  value={usuarioSeleccionado.tipoPremium || ""}
                  onChange={(e) =>
                    actualizarTipoPremium(usuarioSeleccionado.id, e.target.value)
                  }
                  className="border rounded px-2 py-1 mt-2 w-full"
                >
                  <option value="">-- Seleccionar --</option>
                  <option value="gold">Premium Gold</option>
                  <option value="lite">Premium Lite</option>
                </select>
              </div>
            )}

            {/* Plantilla */}
            <div className="mb-4">
              <p className="font-medium">Plantilla:</p>
              <select
                value={usuarioSeleccionado.plantilla || ""}
                onChange={(e) => asignarPlantilla(usuarioSeleccionado.id, e.target.value)}
                className="border rounded px-2 py-1 mt-2 w-full"
              >
                <option value="">-- Seleccionar --</option>
                {plantillasDisponibles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
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
