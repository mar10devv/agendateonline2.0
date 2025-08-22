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
            className="text-3xl font-bold lowercase tracking-tight text-neutral-900 font-inter"
          >
            agéndate
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

      {/* Mobile dropdown */}
      {mobileOpen && (
        <div className="md:hidden px-4 pb-4 pt-2 space-y-3 bg-white border-t">
          {checkingAuth ? (
            <p className="text-sm text-gray-500">Cargando...</p>
          ) : user ? (
            <>
              <div className="flex items-center gap-2">
                <img
                  src={user.photoURL ?? ""}
                  alt="Usuario"
                  className="h-8 w-8 rounded-full"
                  referrerPolicy="no-referrer"
                />
                <span className="text-sm">{user.displayName}</span>
              </div>
              <button
                onClick={handleLogout}
                className="block w-full text-left text-sm text-red-600 hover:bg-red-50 px-4 py-2 rounded"
              >
                Cerrar sesión
              </button>
              <a
                href={isPremium ? "/panel" : "/registrar-negocio"}
                className="block text-sm hover:underline"
              >
                {isPremium ? "Panel de control" : "Registrar negocio"}
              </a>
            </>
          ) : (
            <button
              onClick={handleLogin}
              className="block w-full text-left text-sm text-gray-700 hover:bg-gray-100 px-4 py-2 rounded"
            >
              Iniciar sesión
            </button>
          )}

          <hr />

          {clientes.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className={`block text-sm px-4 py-2 rounded ${
                item.highlight ? "text-violet-600 font-medium" : "text-gray-700"
              } hover:bg-gray-100`}
            >
              {item.label}
            </a>
          ))}
        </div>
      )}
    </header>
  );
}
