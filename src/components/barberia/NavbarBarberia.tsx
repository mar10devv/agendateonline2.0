import React, { useEffect, useState } from "react";
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  setPersistence,
  browserLocalPersistence,
  type User,
} from "firebase/auth";
import { auth, googleProvider } from "../../lib/firebase";

type Props = {
  title: string;
  hoverColor?: string;
  logoUrl?: string | null;
};

export default function NavbarBarberia({
  title,
  hoverColor = "#3b82f6",
  logoUrl,
}: Props) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setCheckingAuth(false);
    });
    return () => unsub();
  }, []);

  const handleLogin = async () => {
    try {
      await setPersistence(auth, browserLocalPersistence);
      await signInWithPopup(auth, googleProvider);
    } catch (e) {
      alert(`No se pudo iniciar sesión: ${String((e as any)?.code || e)}`);
    }
  };

  const handleLogout = () => {
    signOut(auth).catch((e) => console.error("[NavbarBarberia] signOut error:", e));
  };

  return (
    <header className="bg-black text-white px-4 h-16 flex items-center sticky top-0 z-[9999]">
      <div className="max-w-7xl mx-auto flex justify-between items-center w-full">
        {/* Logo o título */}
        <div className="flex items-center space-x-2">
          {logoUrl ? (
            <img src={logoUrl} alt={title} className="h-10 w-10 object-contain" />
          ) : (
            <span className="text-lg font-bold">{title.toUpperCase()}</span>
          )}
        </div>

        {/* Links desktop */}
        <div className="hidden md:flex space-x-6 items-center">
          <a href="#" className="hover:text-[var(--hoverColor)]">
            Inicio
          </a>
          <a href="#nosotros" className="hover:text-[var(--hoverColor)]">
            Sobre nosotros
          </a>
          <a href="#cursos" className="hover:text-[var(--hoverColor)]">
            Cursos
          </a>
          <a href="#contacto" className="hover:text-[var(--hoverColor)]">
            Contacto
          </a>
          <a
            href="#reservar"
            className="bg-[var(--hoverColor)] text-white px-4 py-2 rounded-md font-semibold hover:opacity-90 transition"
          >
            Reservar cita
          </a>
        </div>

        {/* Botón hamburguesa */}
        <div className="md:hidden">
          <button
            onClick={() => setMobileOpen((prev) => !prev)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            ☰
          </button>
        </div>
      </div>

      {/* Sidebar móvil */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[9999] flex justify-end">
          {/* Overlay */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fadeIn"
            onClick={() => setMobileOpen(false)}
          />

          {/* Sidebar */}
          <div className="relative w-72 h-screen bg-white text-gray-800 shadow-xl animate-slideIn flex flex-col z-10">
            {/* Banner */}
            <div className="bg-indigo-600 h-32 flex items-end p-4 text-white relative">
              <button
                onClick={() => setMobileOpen(false)}
                className="absolute top-3 right-3 text-white hover:text-gray-200 transition-transform hover:scale-110"
              >
                ✕
              </button>

              {user ? (
                <div className="flex items-center gap-3 animate-fadeIn delay-150">
                  <img
                    src={user.photoURL ?? ""}
                    alt="Usuario"
                    className="w-12 h-12 rounded-full border-2 border-white"
                    referrerPolicy="no-referrer"
                  />
                  <div>
                    <p className="font-semibold">{user.displayName}</p>
                    <p className="text-xs opacity-80">{user.email}</p>
                  </div>
                </div>
              ) : (
                <p className="font-semibold animate-fadeIn delay-150">
                  Bienvenido 👋
                </p>
              )}
            </div>

            {/* Links con íconos */}
            <div className="flex-1 p-4 space-y-3 overflow-y-auto bg-white">
              <a
                href="#"
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-800"
              >
                🏠 Inicio
              </a>
              <a
                href="#nosotros"
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-800"
              >
                👤 Sobre nosotros
              </a>
              <a
                href="#cursos"
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-800"
              >
                🎓 Cursos
              </a>
              <a
                href="#contacto"
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-800"
              >
                📞 Contacto
              </a>
              <a
                href="#reservar"
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-800"
              >
                📅 Reservar cita
              </a>

              <hr className="my-3" />

              {/* Sesión */}
              {checkingAuth ? (
                <p className="text-sm text-gray-500">Cargando...</p>
              ) : !user ? (
                <button
                  onClick={handleLogin}
                  className="flex items-center gap-2 w-full text-left px-3 py-2 text-sm font-medium text-gray-800"
                >
                  👉 Iniciar sesión
                </button>
              ) : (
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 w-full text-left px-3 py-2 text-sm font-medium text-red-600"
                >
                  🚪 Cerrar sesión
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
