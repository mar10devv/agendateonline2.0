import React, { useEffect, useState } from "react";
import {
  onAuthStateChanged,
  signOut,
  type User,
} from "firebase/auth";
import { auth, db } from "../../lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import Menu from "./Menu";
import { loginConGoogle } from "../../lib/auth";
import settingsIcon from "../../assets/settings-svg.svg?url";
import alarmIcon from "../../assets/alarm-svg.svg?url";
import agendaIcon from "../../assets/agenda-svg.svg?url";

type ClienteLink = { label: string; href: string; highlight?: boolean };

const baseLinks: ClienteLink[] = [
  { label: "Descargar la app", href: "/app" },
  { label: "Ayuda y servicio al cliente", href: "/ayuda" },
];

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [tipoPremium, setTipoPremium] = useState<"lite" | "gold" | null>(null);
  const [slug, setSlug] = useState<string | null>(null);

  // 🔔 Estado de notificaciones
  const [notificaciones, setNotificaciones] = useState<string[]>([
    "Nueva reserva confirmada",
    "Tu suscripción vence en 3 días",
  ]);
  const [notifOpen, setNotifOpen] = useState(false);

const [isAdmin, setIsAdmin] = useState(false);

useEffect(() => {
  // 1️⃣ Leer cache local al inicio
  const cachedPremium = localStorage.getItem("tipoPremium");
  const cachedSlug = localStorage.getItem("slug");

  if (cachedPremium) setTipoPremium(cachedPremium as "lite" | "gold");
  if (cachedSlug) setSlug(cachedSlug);

  // 2️⃣ Suscribirse a cambios de auth
  const unsub = onAuthStateChanged(auth, async (u) => {
    setUser(u);
    setCheckingAuth(false);

    if (u) {
      try {
        const userSnap = await getDoc(doc(db, "Usuarios", u.uid));
        if (userSnap.exists()) {
          const data = userSnap.data();

          // 🔑 Guardar si es admin
          setIsAdmin(data?.rol === "admin");

          const premium = data?.tipoPremium || null;
          setTipoPremium(premium);

          // Guardar en cache
          if (premium) {
            localStorage.setItem("tipoPremium", premium);
          } else {
            localStorage.removeItem("tipoPremium");
          }

          const negocioSnap = await getDoc(doc(db, "Negocios", u.uid));
          if (negocioSnap.exists()) {
            const newSlug = negocioSnap.data()?.slug || null;
            setSlug(newSlug);

            // Guardar en cache
            if (newSlug) {
              localStorage.setItem("slug", newSlug);
            } else {
              localStorage.removeItem("slug");
            }
          }
        }
      } catch (err) {
        console.error("❌ Error al leer Firestore:", err);
      }
    } else {
      setTipoPremium(null);
      setSlug(null);
      setIsAdmin(false);

      // Limpiar cache
      localStorage.removeItem("tipoPremium");
      localStorage.removeItem("slug");
    }
  });

  return () => unsub();
}, []);



  const handleLogin = async () => {
    try {
      await loginConGoogle();
    } catch (e) {
      alert(`No se pudo iniciar sesión: ${String((e as any)?.code || e)}`);
    }
  };

  const handleLogout = () => {
    signOut(auth).catch((e) => console.error("[Navbar] signOut error:", e));
  };

// 🔹 Links dinámicos para menú
const linksMenu: ClienteLink[] = [
  { label: "Mis turnos", href: "/usuarios/usuario-agenda", highlight: true },
  ...baseLinks,
];

// Si es premium gold → aparece primero
if (tipoPremium === "gold") {
  linksMenu.unshift({
    label: "Mi Panel",
    href: "/panel/paneldecontrol",
    highlight: true,
  });
}

// Si es premium lite → aparece después de "Mis turnos"
if (tipoPremium === "lite" && slug) {
  linksMenu.splice(1, 0, {
    label: "Mi Agenda",
    href: `/agenda/${slug}`,
    highlight: true,
  });
}


  return (
    <>
      <header className="fixed top-0 left-0 w-full z-[10000] bg-transparent">

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
                  {/* Foto usuario */}
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

              
              <label className="hamburger cursor-pointer">
  <input
    type="checkbox"
    checked={mobileOpen}
    onChange={() => setMobileOpen((prev) => !prev)}
    className="hidden"
  />
  <svg
    viewBox="0 0 32 32"
    className="h-8 w-8 transition-transform duration-[600ms] ease-in-out"
  >
    <path
      className="line line-top-bottom stroke-white"
      d="M27 10 13 10C10.8 10 9 8.2 9 6 9 3.5 10.8 2 13 2 15.2 2 17 3.8 17 6L17 26C17 28.2 18.8 30 21 30 23.2 30 25 28.2 25 26 25 23.8 23.2 22 21 22L7 22"
    />
    <path className="line stroke-white" d="M7 16 27 16" />
  </svg>
</label>

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
            {/* Links de cliente */}
            <a
              href="/usuarios/usuario-agenda"
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-800 animate-fadeIn delay-200"
            >
              <img src={alarmIcon} alt="Mis turnos" className="w-5 h-5" />
              Mis turnos
            </a>

            {tipoPremium === "gold" && (
              <a
                href="/panel/paneldecontrol"
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-800 animate-fadeIn delay-300"
              >
                <img src={settingsIcon} alt="Mi Panel" className="w-5 h-5" />
                Mi Panel
              </a>
            )}

            {tipoPremium === "lite" && slug && (
              <a
                href={`/agenda/${slug}`}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-800 animate-fadeIn delay-300"
              >
                <img src={agendaIcon} alt="Mi Agenda" className="w-5 h-5" />
                Mi Agenda
              </a>
            )}

            {!tipoPremium && (
              <a
                href="/usuarios/usuario-agenda"
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-800 animate-fadeIn delay-300"
              >
                <img src={agendaIcon} alt="Mi Agenda" className="w-5 h-5" />
                Mi Agenda
              </a>
            )}

            {/* Admin extra */}
            {isAdmin && (
              <a
                href="/panel/panel-admin"
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-800"
              >
                <img src={settingsIcon} alt="Panel Admin" className="w-5 h-5" />
                Panel Admin
              </a>
            )}

            {/* Logout al final */}
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 w-full text-left px-3 py-2 text-sm font-medium text-red-600 animate-fadeIn delay-600"
            >
              🚪 Cerrar sesión
            </button>
          </>
        )}
      </div>
    </div>
  </div>
)}



      {/* 🔔 Modal de notificaciones */}
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
