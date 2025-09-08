import React, { useEffect, useState } from "react";
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  setPersistence,
  browserLocalPersistence,
  type User,
} from "firebase/auth";
import { auth, googleProvider, db } from "../../lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import Menu from "./Menu";

type ClienteLink = { label: string; href: string; highlight?: boolean };

const baseLinks: ClienteLink[] = [
  { label: "Mi Agenda", href: "/Usuarios/AgendaDelUsuario", highlight: true },
  { label: "Descargar la app", href: "/app" },
  { label: "Ayuda y servicio al cliente", href: "/ayuda" },
];

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [isPremium, setIsPremium] = useState<boolean | null>(null);

  // 🔔 Estado de notificaciones
  const [notificaciones, setNotificaciones] = useState<string[]>([
    "Nueva reserva confirmada",
    "Tu suscripción vence en 3 días",
  ]);
  const [notifOpen, setNotifOpen] = useState(false);

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

  // 🔹 Links dinámicos
  const linksMenu: ClienteLink[] = [...baseLinks];
  if (isPremium) {
    linksMenu.splice(1, 0, { label: "Mi Panel", href: "/ControlPanel/PanelDeControlPrincipal", highlight: true });
  }

  return (
    <>
      <header className="fixed top-0 left-0 w-full z-[9999] bg-transparent">

        <div className="mx-auto max-w-7xl px-4">
          <div className="flex h-16 items-center justify-between">
            {/* Logo */}
            <a
  href="/"
  className="text-3xl font-bold tracking-tight text-white font-inter"
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
                  {/* Foto como botón de notificaciones */}
                  <div
                    className="relative cursor-pointer"
                    onClick={() => setNotifOpen(true)}
                  >
                    <img
  src={user.photoURL ?? ""}
  alt="Usuario"
  className="h-8 w-8 rounded-full border-2 border-white"
  referrerPolicy="no-referrer"
/>

                    {notificaciones.length > 0 && (
  <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-yellow-400" />
)}
                  </div>
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

              {/* Menú dropdown */}
              <Menu
                open={menuOpen}
                setOpen={setMenuOpen}
                user={user}
                onLogout={handleLogout}
                links={linksMenu}
              />
            </nav>

            {/* Mobile */}
            <div className="md:hidden flex items-center gap-2">
              {user && (
                <button
                  onClick={() => setNotifOpen(true)}
                  className="relative rounded-md border border-gray-300 px-3 py-2 text-sm"
                >
                  🔔
                  {notificaciones.length > 0 && (
                    <span className="absolute top-1 right-1 block h-2 w-2 rounded-full bg-gray-500" />
                  )}
                </button>
              )}
              <button
                onClick={() => setMobileOpen((prev) => !prev)}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm"
              >
                ☰
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile sidebar */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[9999] flex justify-end">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fadeIn"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative w-72 h-screen bg-white text-gray-800 shadow-xl animate-slideIn flex flex-col z-10">
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

            {/* Opciones */}
            <div className="flex-1 p-4 space-y-3 overflow-y-auto bg-white">
              {checkingAuth ? (
                <p className="text-sm text-gray-500 animate-fadeIn delay-200">
                  Cargando...
                </p>
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
                  {!isPremium && (
                    <a
                      href="/registrar-negocio"
                      className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-800 animate-fadeIn delay-300"
                    >
                      🏢 Registrar empresa
                    </a>
                  )}
                  <a
                    href="/Usuarios/AgendaDelUsuario"
                    className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-800 animate-fadeIn delay-350"
                  >
                    📅 Mi Agenda
                  </a>
                  {isPremium && (
                    <a
                      href="/ControlPanel/PanelDeControlPrincipal"
                      className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-800 animate-fadeIn delay-375"
                    >
                      🖥 Mi Panel
                    </a>
                  )}
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

      {/* 🔔 Modal de notificaciones centrado */}
{notifOpen && (
  <div className="fixed inset-0 z-[10000] flex items-center justify-center">
    <div
      className="absolute inset-0 bg-black/40"
      onClick={() => setNotifOpen(false)}
    />
    <div className="relative bg-white rounded-lg shadow-xl p-6 w-96 z-10 animate-fadeIn">
      <button
        onClick={() => setNotifOpen(false)}
        className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
      >
        ✕
      </button>
      <h2 className="text-lg font-semibold mb-4">Notificaciones</h2>
      {notificaciones.length > 0 ? (
        <ul className="space-y-2">
          {notificaciones.map((n, i) => (
            <li
              key={i}
              className="flex justify-between items-center p-2 bg-gray-100 rounded"
            >
              <span>{n}</span>
              <button
                onClick={() =>
                  setNotificaciones((prev) => prev.filter((_, idx) => idx !== i))
                }
                className="text-red-500 hover:text-red-700 text-sm font-bold"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-gray-500">No tienes notificaciones nuevas 🎉</p>
      )}
    </div>
  </div>
)}

    </>
  );
}
