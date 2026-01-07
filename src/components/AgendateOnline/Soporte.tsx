import { useEffect, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth, db } from "../../lib/firebase";
import {
  collection,
  addDoc,
  query,
  where,
  onSnapshot,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { loginConGoogle } from "../../lib/auth";

interface Reporte {
  id: string;
  usuarioId: string;
  usuarioNombre: string;
  usuarioEmail: string;
  asunto: string;
  mensaje: string;
  estado: "pendiente" | "en_revision" | "resuelto";
  fecha: Timestamp;
}

export default function SoportePage() {
  const [user, setUser] = useState<User | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [reportes, setReportes] = useState<Reporte[]>([]);
  const [loadingReportes, setLoadingReportes] = useState(true);

  // Formulario
  const [asunto, setAsunto] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);

  // Auth listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setCheckingAuth(false);
    });
    return () => unsub();
  }, []);

  // Cargar reportes del usuario
  useEffect(() => {
    if (!user) {
      setReportes([]);
      setLoadingReportes(false);
      return;
    }

    setLoadingReportes(true);

    // Query simple sin orderBy (evita necesidad de índice compuesto)
    const q = query(
      collection(db, "Reportes"),
      where("usuarioId", "==", user.uid)
    );

    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Reporte[];
        
        // Ordenar en el cliente por fecha descendente
        data.sort((a, b) => {
          const fechaA = a.fecha?.toMillis?.() || 0;
          const fechaB = b.fecha?.toMillis?.() || 0;
          return fechaB - fechaA;
        });
        
        setReportes(data);
        setLoadingReportes(false);
      },
      (error) => {
        console.error("Error al cargar reportes:", error);
        setLoadingReportes(false);
      }
    );

    return () => unsub();
  }, [user]);

  // Enviar reporte
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user || !asunto.trim() || !mensaje.trim()) return;

    setEnviando(true);

    try {
      await addDoc(collection(db, "Reportes"), {
        usuarioId: user.uid,
        usuarioNombre: user.displayName || "Usuario",
        usuarioEmail: user.email || "",
        usuarioFoto: user.photoURL || "",
        asunto: asunto.trim(),
        mensaje: mensaje.trim(),
        estado: "pendiente",
        fecha: serverTimestamp(),
      });

      setAsunto("");
      setMensaje("");
      setEnviado(true);

      setTimeout(() => setEnviado(false), 3000);
    } catch (error) {
      console.error("Error al enviar reporte:", error);
      alert("Error al enviar el reporte. Intenta de nuevo.");
    }

    setEnviando(false);
  };

  // Login
  const handleLogin = async () => {
    try {
      await loginConGoogle();
    } catch (e) {
      console.error("Error al iniciar sesión:", e);
    }
  };

  // Formatear fecha
  const formatFecha = (timestamp: Timestamp) => {
    if (!timestamp) return "";
    const date = timestamp.toDate();
    return date.toLocaleDateString("es-ES", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Estado badge
  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case "pendiente":
        return (
          <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-700">
            ⏳ Pendiente
          </span>
        );
      case "en_revision":
        return (
          <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-700">
            🔍 En revisión
          </span>
        );
      case "resuelto":
        return (
          <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">
            ✅ Resuelto
          </span>
        );
      default:
        return null;
    }
  };

  // Loading state
  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-600 to-purple-700 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-600 to-purple-700">
      {/* Header */}
      <header className="bg-white/10 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <a href="/" className="text-2xl font-bold text-white">
            AgéndateOnline
          </a>
          <a
            href="/"
            className="text-white/80 hover:text-white text-sm flex items-center gap-2 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Volver al inicio
          </a>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Título */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Centro de Soporte</h1>
          <p className="text-white/70">¿Tienes algún problema o sugerencia? Estamos aquí para ayudarte.</p>
        </div>

        {/* Si no está logueado */}
        {!user ? (
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center max-w-md mx-auto">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-violet-100 flex items-center justify-center">
              <svg className="w-8 h-8 text-violet-600" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Inicia sesión</h2>
            <p className="text-gray-500 mb-6">
              Para enviar un reporte o ver tus reportes anteriores, necesitas iniciar sesión.
            </p>
            <button
              onClick={handleLogin}
              className="w-full py-3 px-6 bg-white border-2 border-gray-200 rounded-xl font-medium text-gray-700 flex items-center justify-center gap-3 transition-all duration-200 hover:border-violet-300 hover:shadow-lg"
            >
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Continuar con Google
            </button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {/* Formulario de nuevo reporte */}
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-violet-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                Nuevo Reporte
              </h2>

              {enviado ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
                    <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-1">¡Reporte enviado!</h3>
                  <p className="text-gray-500 text-sm">Te responderemos lo antes posible.</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Usuario info */}
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <img
                      src={user.photoURL || ""}
                      alt=""
                      className="w-10 h-10 rounded-full"
                      referrerPolicy="no-referrer"
                    />
                    <div>
                      <p className="text-sm font-medium text-gray-800">{user.displayName}</p>
                      <p className="text-xs text-gray-500">{user.email}</p>
                    </div>
                  </div>

                  {/* Asunto */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Asunto
                    </label>
                    <select
                      value={asunto}
                      onChange={(e) => setAsunto(e.target.value)}
                      required
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                    >
                      <option value="">Selecciona un asunto</option>
                      <option value="Error en la plataforma">🐛 Error en la plataforma</option>
                      <option value="Problema con mi cuenta">👤 Problema con mi cuenta</option>
                      <option value="Problema con pagos">💳 Problema con pagos</option>
                      <option value="Sugerencia">💡 Sugerencia</option>
                      <option value="Consulta general">❓ Consulta general</option>
                      <option value="Otro">📝 Otro</option>
                    </select>
                  </div>

                  {/* Mensaje */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Describe tu problema o sugerencia
                    </label>
                    <textarea
                      value={mensaje}
                      onChange={(e) => setMensaje(e.target.value)}
                      required
                      rows={4}
                      placeholder="Cuéntanos en detalle..."
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all resize-none"
                    />
                  </div>

                  {/* Botón enviar */}
                  <button
                    type="submit"
                    disabled={enviando || !asunto || !mensaje.trim()}
                    className="w-full py-3 px-6 text-white font-medium rounded-xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                    style={{
                      background: "linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)",
                      boxShadow: "0 4px 14px rgba(124, 58, 237, 0.4)",
                    }}
                  >
                    {enviando ? (
                      <span className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Enviando...
                      </span>
                    ) : (
                      "Enviar Reporte"
                    )}
                  </button>
                </form>
              )}
            </div>

            {/* Lista de reportes anteriores */}
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-violet-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
                Mis Reportes
              </h2>

              {loadingReportes ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-8 h-8 border-3 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
                </div>
              ) : reportes.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m6 4.125l2.25 2.25m0 0l2.25 2.25M12 13.875l2.25-2.25M12 13.875l-2.25 2.25M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                    </svg>
                  </div>
                  <p className="text-gray-500">No tienes reportes anteriores</p>
                  <p className="text-gray-400 text-sm mt-1">¡Envía tu primer reporte!</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                  {reportes.map((reporte) => (
                    <div
                      key={reporte.id}
                      className="p-4 border border-gray-100 rounded-xl hover:border-violet-200 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium text-gray-800 text-sm">{reporte.asunto}</h4>
                        {getEstadoBadge(reporte.estado)}
                      </div>
                      <p className="text-gray-600 text-sm line-clamp-2 mb-2">{reporte.mensaje}</p>
                      <p className="text-gray-400 text-xs">
                        {reporte.fecha && formatFecha(reporte.fecha)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Info adicional */}
        <div className="mt-8 text-center">
          <p className="text-white/60 text-sm">
            También puedes contactarnos por email:{" "}
            <a href="mailto:soporte@agendateonline.com" className="text-white underline">
              soporte@agendateonline.com
            </a>
          </p>
        </div>
      </main>

      {/* Estilos adicionales */}
      <style>{`
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .border-3 {
          border-width: 3px;
        }
      `}</style>
    </div>
  );
}