// src/components/Usuarios/AgendaDelUsuario.tsx
import React, { useEffect, useState } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { db } from "../../lib/firebase";
import {
  collection,
  onSnapshot,
  query,
  deleteDoc,
  doc,
} from "firebase/firestore";

import { 
  Calendar, 
  Clock, 
  Trash2, 
  MoreVertical, 
  RefreshCw,
  MapPin,
  User,
  Scissors,
  CalendarCheck,
  ArrowLeft
} from "lucide-react";

type Turno = {
  id: string;
  negocioNombre: string;
  barbero?: string;
  empleadoNombre?: string;
  servicio: string;
  servicioNombre?: string;
  fecha: string;
  hora: string;
  slugNegocio?: string;
  negocioId?: string;
};

export default function AgendaUsuario() {
  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [cargando, setCargando] = useState(true);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const auth = getAuth();
    const unsubAuth = onAuthStateChanged(auth, (usuario) => {
      if (!usuario) {
        setCargando(false);
        setTurnos([]);
        setUserId(null);
        return;
      }

      setUserId(usuario.uid);

      const q = query(collection(db, "Usuarios", usuario.uid, "Turnos"));

      const unsubTurnos = onSnapshot(q, async (snap) => {
        const docs = snap.docs.map(
          (d) => ({ id: d.id, ...d.data() } as Turno)
        );

        const ordenados = docs.sort(
          (a, b) =>
            new Date(`${b.fecha}T${b.hora}:00`).getTime() -
            new Date(`${a.fecha}T${a.hora}:00`).getTime()
        );

        const conservar = ordenados.slice(0, 6);

        const borrar = ordenados.slice(6);
        for (const turno of borrar) {
          await deleteDoc(doc(db, "Usuarios", usuario.uid, "Turnos", turno.id));
        }

        setTurnos(conservar);
        setCargando(false);
      });

      return () => unsubTurnos();
    });

    return () => unsubAuth();
  }, []);

  const handleBorrar = async (turno: Turno) => {
    if (!userId) return;
    
    const confirmar = window.confirm("¿Seguro que deseas eliminar este turno de tu historial?");
    if (!confirmar) return;

    try {
      await deleteDoc(doc(db, "Usuarios", userId, "Turnos", turno.id));
      
      if (turno.negocioId) {
        await deleteDoc(doc(db, "Negocios", turno.negocioId, "Turnos", turno.id));
      }
      
      setMenuOpen(null);
    } catch (error) {
      console.error("Error al borrar turno:", error);
      alert("No se pudo eliminar el turno");
    }
  };

  const handleAgendarDeNuevo = (turno: Turno) => {
    if (turno.slugNegocio) {
      window.location.href = `/a/${turno.slugNegocio}`;
    } else if (turno.negocioId) {
      window.location.href = `/agenda/${turno.negocioId}`;
    }
    setMenuOpen(null);
  };

  const calcularEstado = (t: Turno): "activo" | "vencido" => {
    const ahora = new Date();
    let fechaHora: Date;
    
    if (t.fecha.includes(",")) {
      const partes = t.hora.split(":");
      const horas = parseInt(partes[0]) || 0;
      const minutos = parseInt(partes[1]) || 0;
      
      const match = t.fecha.match(/(\d+)\s+de\s+(\w+)\s+de\s+(\d+)/);
      if (match) {
        const dia = parseInt(match[1]);
        const mesTexto = match[2].toLowerCase();
        const anio = parseInt(match[3]);
        
        const meses: { [key: string]: number } = {
          enero: 0, febrero: 1, marzo: 2, abril: 3,
          mayo: 4, junio: 5, julio: 6, agosto: 7,
          septiembre: 8, octubre: 9, noviembre: 10, diciembre: 11
        };
        
        const mes = meses[mesTexto] ?? 0;
        fechaHora = new Date(anio, mes, dia, horas, minutos);
      } else {
        fechaHora = new Date();
      }
    } else {
      fechaHora = new Date(`${t.fecha}T${t.hora}:00`);
    }
    
    return fechaHora >= ahora ? "activo" : "vencido";
  };

  const turnosActivos = turnos.filter(t => calcularEstado(t) === "activo");
  const turnosVencidos = turnos.filter(t => calcularEstado(t) === "vencido");

  return (
    <div className="min-h-screen bg-gradient-to-r from-violet-600 to-purple-600 flex flex-col">
      <header className="bg-white/10 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <a href="/" className="text-2xl font-bold text-white">
            AgendateOnline
          </a>
          <a href="/" className="text-white/80 hover:text-white text-sm flex items-center gap-2 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Volver al inicio
          </a>
        </div>
      </header>

      <div className="flex-1">
        <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-3 bg-white/10 backdrop-blur-sm rounded-xl">
              <CalendarCheck className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white">Mi Agenda</h1>
              <p className="text-white/70 text-sm">Tus turnos reservados</p>
            </div>
          </div>

          {cargando ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-white"></div>
            </div>
          ) : turnos.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-20 h-20 mx-auto mb-4 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center">
                <Calendar className="w-10 h-10 text-white/60" />
              </div>
              <p className="text-white/80 text-lg">No tienes turnos reservados</p>
              <p className="text-white/50 text-sm mt-1">Cuando reserves, apareceran aqui</p>
            </div>
          ) : (
            <div className="space-y-8">
              {turnosActivos.length > 0 && (
                <div>
                  <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                    Proximos turnos
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {turnosActivos.map((t) => (
                      <TurnoCard
                        key={t.id}
                        turno={t}
                        estado="activo"
                        menuOpen={menuOpen === t.id}
                        onMenuToggle={() => setMenuOpen(menuOpen === t.id ? null : t.id)}
                        onBorrar={() => handleBorrar(t)}
                        onAgendarDeNuevo={() => handleAgendarDeNuevo(t)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {turnosVencidos.length > 0 && (
                <div>
                  <h2 className="text-lg font-semibold text-white/80 mb-4 flex items-center gap-2">
                    <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
                    Historial
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {turnosVencidos.map((t) => (
                      <TurnoCard
                        key={t.id}
                        turno={t}
                        estado="vencido"
                        menuOpen={menuOpen === t.id}
                        onMenuToggle={() => setMenuOpen(menuOpen === t.id ? null : t.id)}
                        onBorrar={() => handleBorrar(t)}
                        onAgendarDeNuevo={() => handleAgendarDeNuevo(t)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TurnoCard({
  turno,
  estado,
  menuOpen,
  onMenuToggle,
  onBorrar,
  onAgendarDeNuevo,
}: {
  turno: Turno;
  estado: "activo" | "vencido";
  menuOpen: boolean;
  onMenuToggle: () => void;
  onBorrar: () => void;
  onAgendarDeNuevo: () => void;
}) {
  const esActivo = estado === "activo";
  const empleado = turno.empleadoNombre || turno.barbero || "Sin asignar";
  const servicioNombre = turno.servicioNombre || turno.servicio;

  return (
    <div
      className={`relative rounded-2xl p-5 transition-all duration-300 ${
        esActivo 
          ? "bg-white shadow-lg shadow-black/10 hover:shadow-xl hover:-translate-y-1" 
          : "bg-white/90 shadow-md opacity-80 hover:opacity-100"
      }`}
    >
      <div className="absolute top-4 left-4">
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
            esActivo 
              ? "bg-green-100 text-green-700" 
              : "bg-gray-100 text-gray-600"
          }`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${esActivo ? "bg-green-500" : "bg-gray-400"}`}></span>
          {esActivo ? "Activo" : "Vencido"}
        </span>
      </div>

      <button
        className="absolute top-3 right-3 p-2 rounded-full hover:bg-gray-100 transition"
        onClick={onMenuToggle}
      >
        <MoreVertical className="w-5 h-5 text-gray-400" />
      </button>

      {menuOpen && (
        <div className="absolute top-12 right-3 bg-white border border-gray-200 rounded-xl shadow-xl w-44 py-2 z-20 overflow-hidden">
          {!esActivo && (turno.slugNegocio || turno.negocioId) && (
            <button
              onClick={onAgendarDeNuevo}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-violet-100 text-violet-700 font-medium transition"
            >
              <RefreshCw className="w-4 h-4" />
              Agendar de nuevo
            </button>
          )}
          <button
            onClick={onBorrar}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 transition"
          >
            <Trash2 className="w-4 h-4" />
            Eliminar
          </button>
        </div>
      )}

      <div className="mt-8 space-y-3">
        <div className="flex items-start gap-2">
          <MapPin className="w-4 h-4 text-violet-500 mt-0.5 flex-shrink-0" />
          <p className="font-semibold text-gray-900 leading-tight">
            {turno.negocioNombre}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Scissors className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <p className="text-gray-700 text-sm">{servicioNombre}</p>
        </div>

        <div className="flex items-center gap-2">
          <User className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <p className="text-gray-600 text-sm">con {empleado}</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-gray-100">
          <div className="flex items-center gap-1.5 text-sm text-gray-500">
            <Calendar className="w-4 h-4" />
            <span>{turno.fecha}</span>
          </div>
          <div className="flex items-center gap-1.5 text-sm text-gray-500">
            <Clock className="w-4 h-4" />
            <span>{turno.hora}</span>
          </div>
        </div>

        {!esActivo && (turno.slugNegocio || turno.negocioId) && (
          <button
            onClick={onAgendarDeNuevo}
            className="w-full mt-3 flex items-center justify-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-xl transition"
          >
            <RefreshCw className="w-4 h-4" />
            Agendar de nuevo
          </button>
        )}
      </div>
    </div>
  );
}