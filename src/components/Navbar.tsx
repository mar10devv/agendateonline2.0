import React, { useEffect, useState } from "react";
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  setPersistence,
  browserLocalPersistence,
  type User,
} from "firebase/auth";
import { auth, googleProvider, db } from "../lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import Menu from "../components/Menu";

type ClienteLink = { label: string; href: string; highlight?: boolean };

// 👇 quitamos "Iniciar sesión o registrarse"
const clientes: ClienteLink[] = [
  { label: "Mi Agenda", href: "/agenda-usuario", highlight: true }, // 👈 nuevo
  { label: "Descargar la app", href: "/app" },
  { label: "Ayuda y servicio al cliente", href: "/ayuda" },
];


export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [isPremium, setIsPremium] = useState<boolean | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      setCheckingAuth(false);
      if (u) {
        try {
          const snap = await getDoc(doc(db, "Usuarios", u.uid));
          setIsPremium(snap.exists() ? snap.data()?.premium ?? false : false);
        } catch (err) {
          console.error("❌ Error al leer Firestore:", err);
        }
      } else {
        setIsPremium(null);
      }
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
    signOut(auth).catch((e) => console.error("[Navbar] signOut error:", e));
  };

  return (
    <header className="sticky top-0 z-[9999] bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="mx-auto max-w-7xl px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <a
            href="/"
            className="text-3xl font-bold tracking-tight text-neutral-900 font-inter"
          >
            AgéndateOnline
          </a>

          {/* Desktop */}
          <nav className="hidden md:flex items-center gap-3">
            {checkingAuth ? (
              <span className="rounded-full border border-neutral-300 bg-white px-4 py-2 text-sm text-neutral-500">
                Cargando…
              </span>
            ) : user ? (
              <>
                <img
                  src={user.photoURL ?? ""}
                  alt="Usuario"
                  className="h-8 w-8 rounded-full"
                  referrerPolicy="no-referrer"
                />
                <button
                  type="button"
                  onClick={handleLogout}
                  className="cursor-pointer rounded-full border border-neutral-300 bg-white px-3 py-2 text-sm font-medium hover:bg-neutral-50"
                >
                  Cerrar sesión
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={handleLogin}
                className="cursor-pointer rounded-full border border-neutral-300 bg-white px-4 py-2 text-sm font-medium hover:bg-neutral-50"
              >
                Iniciar sesión
              </button>
            )}

          
            {user && (
              <a
                href={isPremium ? "/panel" : "/registrar-negocio"}
                className="rounded-full border border-neutral-300 bg-white px-4 py-2 text-sm font-medium hover:bg-neutral-50"
              >
                {isPremium ? "Panel de control" : "Registrar negocio"}
              </a>
              
            )}

            {/* Menú dropdown */}
            <Menu
              open={menuOpen}
              setOpen={setMenuOpen}
              user={user}
              onLogout={handleLogout}
              links={clientes}
            />
          </nav>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setMobileOpen((prev) => !prev)}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              ☰
            </button>
          </div>
        </div>
      </div>

      {/* Mobile sidebar */}
      {mobileOpen && (
  <div className="fixed inset-0 z-[9999] flex justify-end">
    {/* Overlay con fade */}
    <div
      className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fadeIn"
      onClick={() => setMobileOpen(false)}
    />

    {/* Sidebar con slide */}
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
          <p className="font-semibold animate-fadeIn delay-150">Bienvenido 👋</p>
        )}
      </div>

      {/* Opciones con animación stagger */}
<div className="flex-1 p-4 space-y-3 overflow-y-auto bg-white">
  {checkingAuth ? (
    <p className="text-sm text-gray-500 animate-fadeIn delay-200">Cargando...</p>
  ) : !user ? (
    <>
      <button
        onClick={handleLogin}
        className="flex items-center gap-2 w-full text-left px-3 py-2 text-sm font-medium text-gray-800 animate-fadeIn delay-200"
      >
        👉 Iniciar sesión
      </button>
      <a
        href="/app"
        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-800 animate-fadeIn delay-300"
      >
        📲 Descargar la app
      </a>
      <a
        href="/ayuda"
        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-800 animate-fadeIn delay-400"
      >
        ❓ Ayuda y servicio al cliente
      </a>
    </>
  ) : (
    <>
      <button
        onClick={handleLogout}
        className="flex items-center gap-2 w-full text-left px-3 py-2 text-sm font-medium text-red-600 animate-fadeIn delay-200"
      >
        🚪 Cerrar sesión
      </button>

      {isPremium ? (
        <a
          href="/panel"
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-800 animate-fadeIn delay-300"
        >
          🛠 Panel de control
        </a>
      ) : (
        <a
          href="/registrar-negocio"
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-800 animate-fadeIn delay-300"
        >
          🏢 Registrar empresa
        </a>
      )}

      {/* 👇 Nuevo link Mi Agenda */}
      <a
        href="/agenda-usuario"
        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-800 animate-fadeIn delay-350"
      >
        📅 Mi Agenda
      </a>

      <a
        href="/app"
        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-800 animate-fadeIn delay-400"
      >
        📲 Descargar la app
      </a>
      <a
        href="/ayuda"
        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-800 animate-fadeIn delay-500"
      >
        ❓ Ayuda y servicio al cliente
      </a>
    </>
  )}
</div>

    </div>
  </div>
)}

    </header>
  );
}
