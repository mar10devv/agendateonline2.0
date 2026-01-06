import React, { useEffect, useRef, useState } from "react";
import {
  onAuthStateChanged,
  signOut,
  type User,
} from "firebase/auth";
import { auth, db } from "../../lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import Menu from "./Menu";
import { loginConGoogle } from "../../lib/auth";

type ClienteLink = { label: string; href: string; highlight?: boolean };

const baseLinks: ClienteLink[] = [
  { label: "Descargar la app", href: "/app" },
  { label: "Ayuda y servicio al cliente", href: "/ayuda" },
];

const navLinks = [
  { label: "¿Qué es?", href: "#que-es" },
  { label: "¿Cómo funciona?", href: "#como-funciona" },
  { label: "¿Funciones?", href: "#funciones" },
  { label: "¿Precios?", href: "#precios" },
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

  // ✅ Navbar hide/show al hacer scroll (iOS style)
  const [navHidden, setNavHidden] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [hasScrolled, setHasScrolled] = useState(false);
  const lastY = useRef(0);
  const ticking = useRef(false);

  useEffect(() => {
    lastY.current = window.scrollY || 0;

    const onScroll = () => {
      const y = window.scrollY || 0;
      if (ticking.current) return;
      ticking.current = true;

      requestAnimationFrame(() => {
        const prev = lastY.current;
        const goingDown = y > prev;
        const delta = Math.abs(y - prev);

        // Marcar si ha scrolleado para agregar fondo
        setHasScrolled(y > 50);

        // siempre visible cerca del tope
        if (y < 48) {
          setNavHidden(false);
        } else if (goingDown && delta > 8) {
          // baja => ocultar (sensible)
          setNavHidden(true);
        } else if (!goingDown && delta > 40) {
          // sube => mostrar (requiere más scroll)
          setNavHidden(false);
        }

        // Mostrar botón scroll to top después de 300px
        setShowScrollTop(y > 300);

        lastY.current = y;
        ticking.current = false;
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // ✅ Si se abre un overlay, que el navbar no desaparezca
  useEffect(() => {
    if (mobileOpen || menuOpen || notifOpen) setNavHidden(false);
  }, [mobileOpen, menuOpen, notifOpen]);

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

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
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
      <header
        className={[
          "fixed top-0 left-0 w-full z-[10000] mt-5",
          "transition-all duration-300 ease-out will-change-transform",
          navHidden ? "-translate-y-[110%]" : "translate-y-0",
          hasScrolled 
            ? "bg-white/80 backdrop-blur-md shadow-sm mt-0 py-2" 
            : "bg-transparent",
        ].join(" ")}
      >
        <div className="mx-auto max-w-7xl px-4">
          <div className="flex h-16 items-center justify-between">
            {/* Logo */}
            <a
              href="/"
              className={[
                "text-3xl font-bold tracking-tight font-inter transition-colors duration-300",
                hasScrolled ? "text-violet-600" : "text-white",
              ].join(" ")}
            >
              AgéndateOnline
            </a>

            {/* Desktop */}
            <nav className="hidden md:flex items-center gap-3">
              {/* Links de navegación - Desktop */}
              <div className="flex items-center gap-1 mr-4">
                {navLinks.map((link) => (
                  <a
                    key={link.label}
                    href={link.href}
                    className={[
                      "px-3 py-2 rounded-full text-sm font-medium transition-all duration-200",
                      hasScrolled 
                        ? "text-gray-600 hover:text-violet-600 hover:bg-violet-50" 
                        : "text-white/80 hover:text-white hover:bg-white/10",
                    ].join(" ")}
                  >
                    {link.label}
                  </a>
                ))}
              </div>

              {checkingAuth ? (
                <span className="rounded-full border border-neutral-300 bg-white px-4 py-2 text-sm text-neutral-500">
                  Cargando…
                </span>
              ) : user ? (
                <>
                  {/* Foto usuario */}
                  <div className="relative">
                    <img
                      src={user.photoURL ?? ""}
                      alt="Usuario"
                      className={[
                        "h-8 w-8 rounded-full border-2 transition-colors duration-300",
                        hasScrolled ? "border-violet-600" : "border-white",
                      ].join(" ")}
                      referrerPolicy="no-referrer"
                    />
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
                    className={[
                      "line line-top-bottom transition-colors duration-300",
                      hasScrolled ? "stroke-violet-600" : "stroke-white",
                    ].join(" ")}
                    d="M27 10 13 10C10.8 10 9 8.2 9 6 9 3.5 10.8 2 13 2 15.2 2 17 3.8 17 6L17 26C17 28.2 18.8 30 21 30 23.2 30 25 28.2 25 26 25 23.8 23.2 22 21 22L7 22"
                  />
                  <path className={[
                    "line transition-colors duration-300",
                    hasScrolled ? "stroke-violet-600" : "stroke-white",
                  ].join(" ")} d="M7 16 27 16" />
                </svg>
              </label>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile sidebar */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[10001] flex justify-end">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fadeIn"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative w-72 h-screen bg-white text-gray-800 shadow-xl animate-slideIn flex flex-col z-10">
            <div className="bg-gradient-to-r from-violet-600 to-purple-600 h-32 flex items-end p-4 text-white relative">
              {/* Botón hamburguesa/X animado dentro del sidebar */}
              <label className="hamburger cursor-pointer absolute top-3 right-3">
                <input
                  type="checkbox"
                  checked={mobileOpen}
                  onChange={() => setMobileOpen(false)}
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

            {/* Opciones principales */}
            <div className="flex-1 p-4 space-y-3 overflow-y-auto bg-white flex flex-col">
              {checkingAuth ? (
                <p className="text-sm text-gray-500 animate-fadeIn delay-200">
                  Cargando...
                </p>
              ) : !user ? (
                <>
                  <button
                    onClick={handleLogin}
                    className="flex items-center gap-3 w-full text-left px-3 py-2 text-sm font-medium text-gray-800 hover:bg-violet-50 hover:text-violet-600 rounded-lg transition-colors animate-fadeIn delay-200"
                  >
                    <svg className="w-5 h-5 text-violet-500" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                    </svg>
                    Iniciar sesión
                  </button>
                  <a
                    href="/app"
                    className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-gray-800 hover:bg-violet-50 hover:text-violet-600 rounded-lg transition-colors animate-fadeIn delay-300"
                  >
                    <svg className="w-5 h-5 text-violet-500" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
                    </svg>
                    Descargar la app
                  </a>
                  <a
                    href="/ayuda"
                    className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-gray-800 hover:bg-violet-50 hover:text-violet-600 rounded-lg transition-colors animate-fadeIn delay-400"
                  >
                    <svg className="w-5 h-5 text-violet-500" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
                    </svg>
                    Ayuda y servicio al cliente
                  </a>
                </>
              ) : (
                <>
                  {/* Links de cliente */}
                  <a
                    href="/usuarios/usuario-agenda"
                    className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-gray-800 hover:bg-violet-50 hover:text-violet-600 rounded-lg transition-colors animate-fadeIn delay-200"
                  >
                    <svg className="w-5 h-5 text-violet-500" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Mis turnos
                  </a>

                  {tipoPremium === "gold" && (
                    <a
                      href="/panel/paneldecontrol"
                      className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-gray-800 hover:bg-violet-50 hover:text-violet-600 rounded-lg transition-colors animate-fadeIn delay-300"
                    >
                      <svg className="w-5 h-5 text-violet-500" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
                      </svg>
                      Mi Panel
                    </a>
                  )}

                  {tipoPremium === "lite" && slug && (
                    <a
                      href={`/agenda/${slug}`}
                      className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-gray-800 hover:bg-violet-50 hover:text-violet-600 rounded-lg transition-colors animate-fadeIn delay-300"
                    >
                      <svg className="w-5 h-5 text-violet-500" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                      </svg>
                      Mi Agenda
                    </a>
                  )}

                  {!tipoPremium && (
                    <a
                      href="/panel/panel-registro"
                      className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-violet-600 hover:bg-violet-50 rounded-lg transition-colors animate-fadeIn delay-300"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
                      </svg>
                      Obtener mi agenda
                    </a>
                  )}

                  {/* Admin extra */}
                  {isAdmin && (
                    <a
                      href="/panel/panel-admin"
                      className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-gray-800 hover:bg-violet-50 hover:text-violet-600 rounded-lg transition-colors"
                    >
                      <svg className="w-5 h-5 text-violet-500" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Panel Admin
                    </a>
                  )}

                  <a
                    href="/app"
                    className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-gray-800 hover:bg-violet-50 hover:text-violet-600 rounded-lg transition-colors animate-fadeIn delay-400"
                  >
                    <svg className="w-5 h-5 text-violet-500" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
                    </svg>
                    Descargar la app
                  </a>
                  <a
                    href="/ayuda"
                    className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-gray-800 hover:bg-violet-50 hover:text-violet-600 rounded-lg transition-colors animate-fadeIn delay-500"
                  >
                    <svg className="w-5 h-5 text-violet-500" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
                    </svg>
                    Ayuda y servicio al cliente
                  </a>

                  {/* Logout */}
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 w-full text-left px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors animate-fadeIn delay-600"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                    </svg>
                    Cerrar sesión
                  </button>
                </>
              )}

              {/* Links de navegación */}
              <div className="border-t border-gray-200 pt-3 mt-3">
                <p className="px-3 py-1 text-xs font-semibold text-gray-300 uppercase tracking-wider">
                  Navegación
                </p>
                {navLinks.map((link, index) => (
                  <a
                    key={link.label}
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-400 hover:bg-violet-50 hover:text-violet-500 rounded-lg transition-colors"
                    style={{ animationDelay: `${700 + index * 100}ms` }}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="10" />
                      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                      <line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                    {link.label}
                  </a>
                ))}
              </div>
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
                        setNotificaciones((prev) =>
                          prev.filter((_, idx) => idx !== i)
                        )
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

      {/* 🔼 Botón Scroll to Top */}
      <button
        onClick={scrollToTop}
        className={[
          "fixed bottom-6 right-6 z-[9999] p-3 rounded-full",
          "bg-gradient-to-r from-violet-600 to-purple-600 text-white",
          "shadow-lg hover:shadow-xl hover:scale-110",
          "transition-all duration-300 ease-out",
          showScrollTop ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10 pointer-events-none",
        ].join(" ")}
        aria-label="Volver arriba"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
        </svg>
      </button>
    </>
  );
}