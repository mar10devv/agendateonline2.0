// src/components/AgendaUsuario.tsx
import React, { useEffect, useState } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { db } from "../lib/firebase";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  deleteDoc,
  doc,
} from "firebase/firestore";

// 🔹 Importar SVGs
import MoreIcon from "../assets/more-svg.svg?url";
import CalendarioIcon from "../assets/calendario-svg.svg?url";
import RelojIcon from "../assets/reloj-svg.svg?url";
import PapeleraIcon from "../assets/papelera-svg.svg?url";
import EditarIcon from "../assets/editar-svg.svg?url";

type Turno = {
  id: string;
  negocioNombre: string;
  barbero: string;
  servicio: string;
  fecha: string; // YYYY-MM-DD
  hora: string; // HH:mm
};

export default function AgendaUsuario() {
  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [cargando, setCargando] = useState(true);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  useEffect(() => {
    const auth = getAuth();
    const unsubAuth = onAuthStateChanged(auth, (usuario) => {
      if (!usuario) {
        setCargando(false);
        setTurnos([]);
        return;
      }

      const q = query(collection(db, "Usuarios", usuario.uid, "Turnos"));

      const unsubTurnos = onSnapshot(q, async (snap) => {
        const docs = snap.docs.map(
          (d) => ({ id: d.id, ...d.data() } as Turno)
        );

        // ✅ Ordenar todos por fecha+hora (más recientes primero)
        const ordenados = docs.sort(
          (a, b) =>
            new Date(`${b.fecha}T${b.hora}:00`).getTime() -
            new Date(`${a.fecha}T${a.hora}:00`).getTime()
        );

        // ✅ Conservar solo los últimos 3
        const conservar = ordenados.slice(0, 3);

        // ✅ Borrar del Firestore los que sobren
        const borrar = ordenados.slice(3);
        for (const turno of borrar) {
          await deleteDoc(doc(db, "Usuarios", usuario.uid, "Turnos", turno.id));
        }

        // ✅ Actualizar estado solo con 3
        setTurnos(conservar);
        setCargando(false);
      });

      return () => unsubTurnos();
    });

    return () => unsubAuth();
  }, []);

  const handleEditar = (id: string) => {
    alert(`✏️ Editar turno ${id}`);
    setMenuOpen(null);
  };

  const handleBorrar = (id: string) => {
    alert(`🗑 Borrar turno ${id}`);
    setMenuOpen(null);
  };

  // 👇 Calcula estado según fecha/hora
  const calcularEstado = (t: Turno) => {
    const ahora = new Date();
    const fechaHora = new Date(`${t.fecha}T${t.hora}:00`);
    return fechaHora >= ahora ? "Activo" : "Vencido";
  };

  return (
    <section className="py-10 px-6">
      <h2 className="text-2xl font-bold mb-6">📅 Mi Agenda</h2>

      {cargando ? (
        <p className="text-gray-600">Cargando tus turnos...</p>
      ) : turnos.length === 0 ? (
        <p className="text-gray-600">No tienes turnos reservados.</p>
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
  {turnos.map((t) => (
    <li
      key={t.id}
      className="relative border rounded-xl p-5 bg-white shadow-md hover:shadow-lg transition"
    >
              {/* Botón more */}
              <button
                className="absolute top-3 right-3 p-1 rounded-full hover:bg-gray-100"
                onClick={() => setMenuOpen(menuOpen === t.id ? null : t.id)}
              >
                <img src={MoreIcon} alt="Opciones" className="w-5 h-5" />
              </button>

              {/* Menú desplegable */}
              {menuOpen === t.id && (
                <div className="absolute top-10 right-3 bg-white border rounded-lg shadow-lg w-32 py-1 z-20">
                  <button
                    onClick={() => handleEditar(t.id)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-100"
                  >
                    <img src={EditarIcon} alt="Editar" className="w-4 h-4" />
                    Editar
                  </button>
                  <button
                    onClick={() => handleBorrar(t.id)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                  >
                    <img src={PapeleraIcon} alt="Borrar" className="w-4 h-4" />
                    Borrar
                  </button>
                </div>
              )}

              {/* Contenido del turno */}
              <p className="font-semibold text-lg text-gray-800">
                {t.negocioNombre}
              </p>
              <p className="text-gray-700">
                {t.servicio} con{" "}
                <span className="font-medium">{t.barbero}</span>
              </p>
              <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                <span className="flex items-center gap-1">
                  <img src={CalendarioIcon} alt="Fecha" className="w-4 h-4" />
                  {t.fecha}
                </span>
                <span className="flex items-center gap-1">
                  <img src={RelojIcon} alt="Hora" className="w-4 h-4" />
                  {t.hora}
                </span>
              </div>
              <p className="text-sm mt-2 italic">
                Estado:{" "}
                <span
                  className={
                    calcularEstado(t) === "Activo"
                      ? "text-green-600 font-medium"
                      : "text-red-600 font-medium"
                  }
                >
                  {calcularEstado(t)}
                </span>
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
