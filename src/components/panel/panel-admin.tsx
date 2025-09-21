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
   deleteDoc, 
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
  telefono?: string;
  emailContacto?: string;
  nombre?: string;
  tipoPremium?: string;
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
  
  // 🔹 Filtro de usuarios
const [filtro, setFiltro] = useState<"todos" | "gratis" | "lite" | "gold">("todos");


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

// 🔹 Eliminar código + negocio + usuario si corresponde
const eliminarCodigo = async (codigoId: string, userId?: string) => {
  if (!window.confirm("⚠️ Esta acción eliminará el código y, si existe, también el negocio y el usuario asociado. ¿Estás seguro?")) return;

  try {
    if (userId) {
      // Si el código ya fue usado: borrar negocio + usuario
      await deleteDoc(doc(db, "Negocios", userId));
      await deleteDoc(doc(db, "Usuarios", userId));
      console.log(`Negocio y usuario con UID ${userId} eliminados`);
    }

    // Siempre borramos el código premium
    await deleteDoc(doc(db, "CodigosPremium", codigoId));

    alert("✅ Código eliminado correctamente.");
    cargarCodigos(); // refresca la tabla
  } catch (err) {
    console.error("Error eliminando:", err);
    alert("❌ No se pudo eliminar todo correctamente. Revisa la consola.");
  }
};

// 🔹 Cargar códigos desde Firestore con slug del negocio y ordenados por fecha
const cargarCodigos = async () => {
  setLoadingCodigos(true);
  try {
    const snap = await getDocs(collection(db, "CodigosPremium"));

    let data = await Promise.all(
      snap.docs.map(async (d) => {
        const codigoData = d.data();
        let slug = null;

        // 👇 si ya fue usado, buscamos el slug en Negocios
        if (codigoData.usadoPor) {
          const negocioRef = doc(db, "Negocios", codigoData.usadoPor);
          const negocioSnap = await getDoc(negocioRef);
          if (negocioSnap.exists()) {
            slug = negocioSnap.data().slug;
          }
        }

        return {
          id: d.id,
          ...codigoData,
          slugUsado: slug,
        };
      })
    );

    // 👉 Ordenar por fechaCreacion (nuevos arriba)
data.sort((a: any, b: any) => {
  const fechaA = a.fechaCreacion?.toDate
    ? a.fechaCreacion.toDate().getTime()
    : 0;
  const fechaB = b.fechaCreacion?.toDate
    ? b.fechaCreacion.toDate().getTime()
    : 0;
  return fechaB - fechaA; // descendente → más nuevos primero
});


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

  // 🔹 Aplica el filtro sobre los usuarios
const usuariosFiltrados = usuarios.filter((u) => {
  if (filtro === "todos") return true;
  if (filtro === "gratis") return !u.premium;
  if (filtro === "lite") return u.tipoPremium === "lite";
  if (filtro === "gold") return u.tipoPremium === "gold";
  return true;
});


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

        {/* 🔹 Tabs principales */}
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

{/* 🔹 Sub-filtros solo si está en usuarios */}
{activeTab === "usuarios" && (
  <div className="flex border-b bg-gray-100">
    <button
      onClick={() => setFiltro("todos")}
      className={`flex-1 py-2 text-center text-sm font-medium ${
        filtro === "todos"
          ? "text-blue-600 border-b-2 border-blue-600 bg-white"
          : "text-gray-600 hover:text-blue-600"
      }`}
    >
      Todos
    </button>
    <button
      onClick={() => setFiltro("gratis")}
      className={`flex-1 py-2 text-center text-sm font-medium ${
        filtro === "gratis"
          ? "text-blue-600 border-b-2 border-blue-600 bg-white"
          : "text-gray-600 hover:text-blue-600"
      }`}
    >
      Gratis
    </button>
    <button
      onClick={() => setFiltro("lite")}
      className={`flex-1 py-2 text-center text-sm font-medium ${
        filtro === "lite"
          ? "text-blue-600 border-b-2 border-blue-600 bg-white"
          : "text-gray-600 hover:text-blue-600"
      }`}
    >
      Premium Lite
    </button>
    <button
      onClick={() => setFiltro("gold")}
      className={`flex-1 py-2 text-center text-sm font-medium ${
        filtro === "gold"
          ? "text-blue-600 border-b-2 border-blue-600 bg-white"
          : "text-gray-600 hover:text-blue-600"
      }`}
    >
      Premium Gold
    </button>
  </div>
)}

        {/* 🔹 Contenido de cada tab */}
        <div className="p-6">
          {activeTab === "usuarios" && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
              {usuariosFiltrados.map((u) => {
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
    onClick={async () => {
      setUsuarioSeleccionado(u);

      try {
        const negocioSnap = await getDoc(doc(db, "Negocios", u.id));
        if (negocioSnap.exists()) {
          setNegocioSeleccionado(negocioSnap.data() as Negocio);
        } else {
          setNegocioSeleccionado(null);
        }
      } catch (err) {
        console.error("Error cargando negocio:", err);
        setNegocioSeleccionado(null);
      }
    }}
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
  <div className="overflow-x-auto">
    <table className="min-w-max w-full text-sm border">
      <thead className="bg-gray-100">
        <tr>
          <th className="p-2 border">Código</th>
          <th className="p-2 border">Estado</th>
          <th className="p-2 border">Usado por</th>
          <th className="p-2 border">Fecha</th>
          <th className="p-2 border">Acciones</th>
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
                : "⚠️ Inválido"}
            </td>
            <td className="p-2 border">
              {c.usadoPor ? (c.slugUsado || "Sin slug") : "-"}
            </td>
            <td className="p-2 border">
              {c.fechaCreacion?.toDate
                ? c.fechaCreacion.toDate().toLocaleString()
                : "-"}
            </td>
            <td className="p-2 border">
              <button
                onClick={() => eliminarCodigo(c.id, c.usadoPor || undefined)}
                className="bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700"
              >
                Borrar
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
)}


            </div>
          )}
        </div>
      </div>

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

      {/* Datos del usuario */}
<div className="mb-4 text-sm text-gray-700 space-y-2">
  <p><strong>📧 Correo:</strong> {usuarioSeleccionado.email}</p>
  <p><strong>🏷️ Slug:</strong> {negocioSeleccionado?.slug || "Sin negocio"}</p>
  <p><strong>📞 Teléfono:</strong> {negocioSeleccionado?.telefono || "No registrado"}</p>

  {negocioSeleccionado?.slug && (
    <p>
      <strong>🌐 URL:</strong>{" "}
      <a
        href={
          negocioSeleccionado?.tipoPremium === "lite"
            ? `https://agendateonline.com/agenda/${negocioSeleccionado.slug}`
            : `https://agendateonline.com/${negocioSeleccionado.slug}`
        }
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-600 underline break-all"
      >
        {negocioSeleccionado?.tipoPremium === "lite"
          ? `https://agendateonline.com/agenda/${negocioSeleccionado.slug}`
          : `https://agendateonline.com/${negocioSeleccionado.slug}`}
      </a>
    </p>
  )}
</div>


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

      {/* Botón estadísticas con SVG */}
      <button
        onClick={() => alert("📊 Estadísticas próximamente...")}
        className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition"
      >
        <img src="/src/assets/estadisticas-svg.svg" alt="estadísticas" className="w-5 h-5" />
        Ver estadísticas
      </button>
    </div>
  </div>
)}

    </div>
  );
}
