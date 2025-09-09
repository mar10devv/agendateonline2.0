// src/components/ControlPanel/PreciosControlPanel.tsx
import React, { useState, useEffect } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { db } from "../../lib/firebase";
import {
  doc,
  collection,
  setDoc,
  deleteDoc,
  getDocs,
  onSnapshot,
} from "firebase/firestore";

// 📂 Icono papelera
import PapeleraIcon from "../../assets/papelera-svg.svg?url";


export default function PreciosControlPanel() {
  const [user, setUser] = useState<any>(null);
  const [precios, setPrecios] = useState<any[] | null>(null); // null = aún no cargado
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    const auth = getAuth();
    const unsub = onAuthStateChanged(auth, (usuario) => {
      if (usuario) {
        setUser(usuario);

        // 🔹 Cargar precios existentes en tiempo real
        const negocioRef = doc(db, "Negocios", usuario.uid);
        const preciosRef = collection(negocioRef, "Precios");

        onSnapshot(preciosRef, (snapshot) => {
          const preciosData = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          setPrecios(preciosData);
        });
      } else {
        setPrecios([]); // usuario no logueado
      }
    });
    return () => unsub();
  }, []);

  const handleChange = (index: number, campo: string, valor: string) => {
    if (!precios) return;
    const nuevos = [...precios];
    (nuevos[index] as any)[campo] = campo === "precio" ? Number(valor) : valor;
    setPrecios(nuevos);
  };

  const agregarServicio = () => {
    if (!precios) {
      setPrecios([{ servicio: "", precio: 0 }]);
    } else {
      setPrecios([...precios, { servicio: "", precio: 0 }]);
    }
  };

  const eliminarServicio = (index: number) => {
    if (!precios) return;
    const nuevos = precios.filter((_, i) => i !== index);
    setPrecios(nuevos);
  };

  const guardarPrecios = async () => {
    if (!user || !precios) return;
    setGuardando(true);
    setMensaje("");

    try {
      const negocioRef = doc(db, "Negocios", user.uid);
      const preciosRef = collection(negocioRef, "Precios");

      // Borrar todos los docs actuales
      const snapshot = await getDocs(preciosRef);
      snapshot.forEach(async (docSnap) => {
        await deleteDoc(docSnap.ref);
      });

      // Guardar cada servicio nuevo
      for (const item of precios) {
        if (item.servicio.trim() !== "") {
          const nuevoDoc = doc(preciosRef); // auto-ID
          await setDoc(nuevoDoc, {
            servicio: item.servicio,
            precio: item.precio,
          });
        }
      }

      setMensaje("✅ Precios guardados correctamente.");
    } catch (error) {
      console.error(error);
      setMensaje("❌ Error al guardar precios.");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
      {/* Banner superior */}
      <div className="px-6 py-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white flex items-center justify-between">
        <h1 className="text-xl md:text-2xl font-bold">Gestión de precios</h1>
        <button
          onClick={() =>
            (window.location.href = "/ControlPanel/PanelDeControlPrincipal")
          }
          className="flex items-center gap-2 bg-white text-blue-600 px-4 py-2 rounded-lg shadow hover:bg-blue-50 transition"
        >
          <span className="text-lg">←</span>
          <span className="font-medium">Volver al panel</span>
        </button>
      </div>

      {/* Contenido */}
      <div className="p-8 flex flex-col gap-6">
        <p className="text-gray-600">
          Aquí puedes añadir tus servicios y sus precios. Se mostrarán a tus clientes.
        </p>

        {/* Lista de servicios */}
        <div className="space-y-4">
          {precios === null ? (
            // 🔹 Loader mientras Firebase responde
            <div className="flex flex-col items-center justify-center h-[200px] gap-4 border rounded-lg bg-gray-50">
              <section className="dots-container">
                <div className="dot"></div>
                <div className="dot"></div>
                <div className="dot"></div>
                <div className="dot"></div>
                <div className="dot"></div>
              </section>
              <p className="text-gray-600 font-medium">Cargando servicios...</p>
            </div>
          ) : precios.length === 0 ? (
            // 🔹 Formulario vacío cuando Firebase respondió sin datos
            <div className="bg-gray-50 p-4 rounded-lg border flex flex-col gap-3">
              <div className="flex flex-col">
                <label className="mb-1 text-sm font-bold text-gray-600">
                  Servicio
                </label>
                <input
                  type="text"
                  placeholder="Añadir servicio"
                  className="h-11 px-3 rounded-lg border-2 border-transparent bg-gray-100 focus:border-gray-800 focus:outline-none transition"
                  onChange={(e) =>
                    setPrecios([{ servicio: e.target.value, precio: 0 }])
                  }
                />
              </div>

              <div className="flex flex-col">
                <label className="mb-1 text-sm font-bold text-gray-600">
                  Precio
                </label>
                <input
                  type="number"
                  value={0}
                  disabled
                  className="h-11 px-3 rounded-lg border-2 border-transparent bg-gray-100 text-gray-400"
                />
              </div>
            </div>
          ) : (
            // 🔹 Lista de servicios cargada
            precios.map((item, i) => (
              <div
                key={i}
                className="bg-gray-50 p-4 rounded-lg border flex flex-col md:flex-row md:items-end md:gap-4"
              >
                {/* Servicio */}
                <div className="flex-1 flex flex-col mb-3 md:mb-0">
                  <label className="mb-1 text-sm font-bold text-gray-600">
                    Servicio
                  </label>
                  <input
                    type="text"
                    value={item.servicio}
                    onChange={(e) =>
                      handleChange(i, "servicio", e.target.value)
                    }
                    placeholder="Añadir servicio"
                    className="h-11 px-3 rounded-lg border-2 border-transparent bg-gray-100 focus:border-gray-800 focus:outline-none transition"
                  />
                </div>

                {/* Precio */}
                <div className="w-full md:w-32 flex flex-col mb-3 md:mb-0">
                  <label className="mb-1 text-sm font-bold text-gray-600">
                    Precio
                  </label>
                  <input
                    type="number"
                    value={item.precio}
                    onChange={(e) =>
                      handleChange(i, "precio", e.target.value)
                    }
                    placeholder="0"
                    className="h-11 px-3 rounded-lg border-2 border-transparent bg-gray-100 focus:border-gray-800 focus:outline-none transition text-left"
                  />
                </div>

                {/* Papelera */}
                <button
                  type="button"
                  onClick={() => eliminarServicio(i)}
                  className="ml-auto p-2 rounded-lg hover:bg-red-100 transition"
                  title="Eliminar servicio"
                >
                  <img src={PapeleraIcon} alt="Eliminar" className="w-6 h-6" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Botones */}
        <div className="flex gap-3 mt-4 justify-end">
          <button
            type="button"
            onClick={agregarServicio}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg shadow hover:bg-blue-600 transition text-sm"
          >
            + Agregar servicio
          </button>

          <button
            type="button"
            onClick={guardarPrecios}
            disabled={guardando}
            className="bg-green-600 text-white px-4 py-2 rounded-lg shadow hover:bg-green-700 transition disabled:opacity-50 flex items-center gap-2 text-sm"
          >
            {guardando && (
              <div className="w-4 h-4 border-2 border-t-white border-white/30 rounded-full animate-spin"></div>
            )}
            {guardando ? "Guardando..." : "Guardar precios"}
          </button>
        </div>

        {/* Mensaje de estado */}
        {mensaje && <p className="text-sm text-gray-700">{mensaje}</p>}
      </div>
    </div>
  );
}
