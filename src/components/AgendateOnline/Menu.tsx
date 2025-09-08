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
        className="rounded-full border border-neutral-300 bg-white px-4 py-2 text-sm font-medium hover:bg-neutral-50 cursor-pointer"
        aria-haspopup="true"
        aria-expanded={open}
      >
        Menú ☰
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-72 rounded-xl border border-gray-200 bg-white shadow-lg z-50">
          <div className="p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">
              Para clientes
            </h3>
            <ul className="space-y-2">
              {links.map((item) => (
                <li key={item.href}>
                  <a
                    href={item.href}
                    className={`block text-sm px-3 py-2 rounded hover:bg-gray-100 transition ${
                      item.highlight
                        ? "text-violet-600 font-medium"
                        : "text-gray-800"
                    }`}
                  >
                    {item.label}
                  </a>
                </li>
              ))}
              <li className="px-3 py-2 text-sm text-gray-600 flex items-center gap-2 hover:bg-gray-50 rounded">
                🌐 español (ES)
              </li>
            </ul>

            <hr className="my-3" />

            {!user ? (
              <a
                href="/login"
                className="mt-3 block w-full text-left text-sm text-blue-600 hover:bg-blue-100 px-3 py-2 rounded transition"
              >
                Iniciar sesión
              </a>
            ) : (
              <>
                <a
                  href="#"
                  className="block text-sm font-semibold text-gray-900 hover:underline px-3 py-2 rounded hover:bg-gray-50 transition"
                >
                  Para negocios →
                </a>

                <button
                  onClick={onLogout}
                  className="mt-3 w-full text-left text-sm text-red-600 hover:bg-red-100 px-3 py-2 rounded transition"
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
