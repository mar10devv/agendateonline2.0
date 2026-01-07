import React, { useEffect, useRef } from "react";
import type { User } from "firebase/auth";

// Reutilizable en Navbar
export type MenuLink = { label: string; href: string; highlight?: boolean };

type Props = {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  user: User | null;
  onLogout: () => void;
  links: MenuLink[];
};

export default function Menu({ open, setOpen, user, onLogout, links }: Props) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open, setOpen]);

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="group relative rounded-full px-5 py-2.5 border border-white/25 bg-white/10 backdrop-blur-xl text-white font-semibold tracking-wide shadow-[0_14px_40px_rgba(0,0,0,0.22)] hover:bg-white/14 hover:border-white/35 active:scale-[0.98] transition cursor-pointer"
        aria-haspopup="true"
        aria-expanded={open}
      >
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-b from-white/22 to-transparent opacity-70 group-hover:opacity-90 transition"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-[1px] rounded-full ring-1 ring-white/10"
        />
        <span className="relative">Menú ☰</span>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-72 rounded-xl border border-white/30 bg-white/20 backdrop-blur-xl shadow-[0_14px_40px_rgba(0,0,0,0.3)] z-50">
          <div className="p-4">
            <h3 className="text-sm font-bold text-white mb-2 drop-shadow-sm">
              Para clientes
            </h3>

            <ul className="space-y-2">
              {links.map((item) => (
                <li key={item.href}>
                  <a
                    href={item.href}
                    className={`block text-sm px-3 py-2 rounded hover:bg-white/20 transition drop-shadow-sm ${
                      item.highlight
                        ? "text-violet-200 font-semibold"
                        : "text-white font-medium"
                    }`}
                  >
                    {item.label}
                  </a>
                </li>
              ))}

              <li className="px-3 py-2 text-sm text-white font-medium flex items-center gap-2 hover:bg-white/20 rounded drop-shadow-sm">
                🌐 español (ES)
              </li>
            </ul>

            <hr className="my-3 border-white/30" />

            {!user ? (
              <a
                href="/login"
                className="mt-3 block w-full text-left text-sm text-white font-semibold hover:bg-white/20 px-3 py-2 rounded transition drop-shadow-sm"
              >
                Iniciar sesión
              </a>
            ) : (
              <>

                <button
                  type="button"
                  onClick={onLogout}
                  className="mt-3 w-full text-left text-sm text-red-200 font-semibold hover:bg-red-500/30 px-3 py-2 rounded transition drop-shadow-sm"
                >
                  Cerrar sesión
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
