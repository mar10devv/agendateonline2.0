// src/components/HeroInicio.tsx
import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useLayoutEffect,
} from "react";
import { createPortal } from "react-dom";
import { Search, MapPin } from "lucide-react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../../lib/firebase";

type Negocio = {
  id: string;
  nombre: string;
  plantilla: string;
  slug?: string;
  ubicacion?: {
    direccion?: string;
    lat?: number;
    lng?: number;
  };
  bannerImages?: { url: string }[];
  logoUrl?: string;
  distanciaKm?: number | null;
};

type Option = { value: string; label: string };

const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

// --------------------
// Dropdown estilo Apple (portal para que siempre quede arriba)
// --------------------
function ServicioDropdown({
  value,
  onChange,
  options,
  placeholder = "Seleccionar servicio",
}: {
  value: string;
  onChange: (v: string) => void;
  options: Option[];
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const btnRef = useRef<HTMLButtonElement | null>(null);

  const currentLabel =
    options.find((o) => o.value === value)?.label || placeholder;

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const [pos, setPos] = useState<{ left: number; top: number; width: number }>(
    { left: 0, top: 0, width: 0 }
  );

  const updatePos = () => {
    const el = btnRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setPos({ left: r.left, top: r.bottom + 8, width: r.width });
  };

  useIsomorphicLayoutEffect(() => {
    if (!open) return;
    updatePos();

    const onMove = () => updatePos();
    window.addEventListener("resize", onMove);
    window.addEventListener("scroll", onMove, true);

    return () => {
      window.removeEventListener("resize", onMove);
      window.removeEventListener("scroll", onMove, true);
    };
  }, [open]);

  return (
    <div className="relative w-full">
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 rounded-2xl border border-white/18 bg-white/10 px-4 py-2.5 hover:border-white/30 transition"
      >
        <Search className="w-4.5 h-4.5 text-white/70 shrink-0" />
        <span className="flex-1 text-[15px] text-white text-center">
          {currentLabel}
        </span>
        <span className="text-white/70 text-sm">▾</span>
      </button>

      {open &&
        mounted &&
        createPortal(
          <>
            <button
              type="button"
              aria-label="Cerrar"
              className="fixed inset-0 z-[9998] cursor-default"
              onClick={() => setOpen(false)}
            />

            <div
              className="fixed z-[9999]"
              style={{ left: pos.left, top: pos.top, width: pos.width }}
            >
              <div className="rounded-2xl border border-white/18 bg-neutral-950/70 backdrop-blur-2xl shadow-[0_18px_50px_rgba(0,0,0,0.35)] overflow-hidden">
                <div className="max-h-[280px] overflow-y-auto">
                  {options.map((opt) => {
                    const active = opt.value === value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => {
                          onChange(opt.value);
                          setOpen(false);
                        }}
                        className={[
                          "w-full px-4 py-3 text-[15px] transition text-center",
                          active
                            ? "bg-white/15 text-white"
                            : "text-white/85 hover:bg-white/10",
                        ].join(" ")}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </>,
          document.body
        )}
    </div>
  );
}

// --------------------
// Utils distancia (Haversine)
// --------------------
function distanciaKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export default function HeroInicio() {
  const PLACEHOLDER = "Seleccionar servicio";

  const [servicio, setServicio] = useState(PLACEHOLDER);
  const [negocios, setNegocios] = useState<Negocio[]>([]);
  const [loading, setLoading] = useState(false);

  const [mostrarBloqueServicio, setMostrarBloqueServicio] = useState(false);

  const [geoStatus, setGeoStatus] = useState<
    "idle" | "requesting" | "ready" | "denied" | "error"
  >("idle");
  const [geo, setGeo] = useState<{ lat: number; lng: number } | null>(null);

  const servicioElegido = useMemo(
    () => !!servicio && servicio !== PLACEHOLDER,
    [servicio]
  );

  const opcionesServicio: Option[] = useMemo(
    () => [
      { value: PLACEHOLDER, label: "Seleccionar servicio" },
      { value: "Barberia", label: "Barberia" },
      { value: "Peluquerias femeninas", label: "Peluquerias femeninas" },
      { value: "Uñas", label: "Uñas" },
      { value: "Cejas y pestañas", label: "Cejas y pestañas" },
      { value: "Masajes", label: "Masajes" },
      { value: "Depilacion", label: "Depilacion" },
      { value: "Tatto y piercing", label: "Tatto y piercing" },
      { value: "Maquillaje", label: "Maquillaje" },
      { value: "Medico dental", label: "Medico dental" },
      { value: "Terapia", label: "Terapia" },
      { value: "Fitnees", label: "Fitnees" },
    ],
    []
  );

  const buscarNegociosCercanos = async (lat?: number, lng?: number) => {
    if (!servicio || servicio === PLACEHOLDER) return;

    setLoading(true);
    try {
      const q = query(
        collection(db, "Negocios"),
        where("plantilla", "==", servicio.toLowerCase())
      );
      const snapshot = await getDocs(q);

      let data: Negocio[] = snapshot.docs.map((doc) => {
        const d: any = doc.data();
        const n: Negocio = {
          id: doc.id,
          nombre: d.nombre || "",
          plantilla: d.plantilla || "",
          slug: d.slug || "",
          ubicacion: d.ubicacion || {},
          bannerImages: d.bannerImages || [],
          logoUrl: d.logoUrl || "",
          distanciaKm: null,
        };

        const nLat = n.ubicacion?.lat;
        const nLng = n.ubicacion?.lng;

        if (
          typeof lat === "number" &&
          typeof lng === "number" &&
          typeof nLat === "number" &&
          typeof nLng === "number"
        ) {
          n.distanciaKm = distanciaKm(lat, lng, nLat, nLng);
        }

        return n;
      });

      data = data.sort((a, b) => {
        const aHas = typeof a.distanciaKm === "number";
        const bHas = typeof b.distanciaKm === "number";
        if (aHas && bHas) return (a.distanciaKm as number) - (b.distanciaKm as number);
        if (aHas && !bHas) return -1;
        if (!aHas && bHas) return 1;
        return (a.slug || "").localeCompare(b.slug || "", "es", {
          sensitivity: "base",
        });
      });

      setNegocios(data);
    } catch (error) {
      console.error("Error buscando negocios:", error);
    } finally {
      setLoading(false);
    }
  };

  const pedirUbicacionYBuscar = () => {
    if (!servicioElegido) return;

    if (typeof window === "undefined" || !navigator?.geolocation) {
      setGeoStatus("error");
      return;
    }

    setGeoStatus("requesting");

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setGeo({ lat, lng });
        setGeoStatus("ready");
        buscarNegociosCercanos(lat, lng);
      },
      (err) => {
        console.error("Geoloc error:", err);
        if (err.code === err.PERMISSION_DENIED) setGeoStatus("denied");
        else setGeoStatus("error");
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  };

  const handleServicioChange = (v: string) => {
    setServicio(v);
    setNegocios([]);
    setGeo(null);

    if (!v || v === PLACEHOLDER) {
      setGeoStatus("idle");
      return;
    }

    pedirUbicacionYBuscar();
  };

  return (
    <section className="relative bg-gradient-to-r from-violet-600 to-purple-600 flex flex-col items-center text-center px-6 pt-16 pb-28 md:pt-0 md:pb-12">

<h1 className="relative mt-40 max-w-4xl leading-[1.1] text-center">
  <span className="block text-xl sm:text-2xl font-medium text-white/80 tracking-wide mb-2">
    Reserva turno
  </span>
  
<span 
  className="block text-6xl sm:text-7xl lg:text-8xl font-oswald uppercase text-white"
  style={{
    fontWeight: 700,
  }}
>
  donde quieras
</span>
  
  <span className="block text-lg sm:text-xl text-white/70 tracking-widest uppercase mt-3">
    con solo un clic
  </span>
</h1>
    <br />
    <br />
      {/* ✅ BOTÓN estilo macOS/iOS (glass + borde suave + highlight) con lupa */}
      {!mostrarBloqueServicio && (
        <button
          type="button"
          onClick={() => setMostrarBloqueServicio(true)}
          className={[
            "group relative",
            "mt-2",
            "rounded-full px-6 py-3",
            "border border-white/25",
            "bg-white/10 backdrop-blur-xl",
            "text-white font-semibold tracking-wide",
            "shadow-[0_14px_40px_rgba(0,0,0,0.22)]",
            "hover:bg-white/14 hover:border-white/35",
            "active:scale-[0.98] transition",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent",
          ].join(" ")}
        >
          {/* brillo superior tipo iOS */}
          <span
            aria-hidden="true"
            className={[
              "pointer-events-none absolute inset-0 rounded-full",
              "bg-gradient-to-b from-white/22 to-transparent",
              "opacity-70 group-hover:opacity-90 transition",
            ].join(" ")}
          />
          {/* borde interno sutil */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-[1px] rounded-full ring-1 ring-white/10"
          />
          {/* ✅ Contenido con lupa */}
          <span className="relative flex items-center gap-2">
            <Search className="w-4 h-4 text-white/90 group-hover:text-white transition-colors" />
            <span>Buscar servicios</span>
          </span>
        </button>
      )}

      {mostrarBloqueServicio && (
        <div className="w-full max-w-5xl mt-5 mx-auto text-center flex flex-col items-center">
          <div className="w-full max-w-[760px] rounded-[22px] border border-white/20 bg-white/12 backdrop-blur-2xl shadow-[0_18px_50px_rgba(0,0,0,0.22)] px-4 py-4 sm:px-5 sm:py-5">
            <div className="relative">
              <div className="flex flex-col items-center">
                <p className="text-[11px] tracking-[0.18em] uppercase text-white/65">
                  BUSCADOR
                </p>
                <h2 className="mt-1 text-[22px] sm:text-[24px] font-semibold text-white leading-tight">
                  ¿Qué servicio estás buscando?
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setMostrarBloqueServicio(false)}
                className="absolute right-0 top-0 rounded-full border border-white/20 bg-white/10 hover:bg-white/15 transition px-3 py-2 text-white/90"
                aria-label="Cerrar"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 flex flex-col items-center">
              <label className="block text-[12px] font-medium text-white/75">
                Servicio
              </label>

              <div className="mt-2 w-full max-w-[720px]">
                <ServicioDropdown
                  value={servicio}
                  onChange={handleServicioChange}
                  options={opcionesServicio}
                />
              </div>
            </div>

            {servicioElegido && (
              <div className="mt-4 w-full max-w-[720px] mx-auto text-left">
                <div className="rounded-2xl border border-white/18 bg-white/10 px-4 py-3">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 rounded-full border border-white/18 bg-white/10 p-2">
                      <MapPin className="w-4 h-4 text-white/80" />
                    </div>

                    <div className="flex-1">
                      <p className="text-white font-medium text-[14px]">
                        Necesitamos tu ubicación
                      </p>
                      <p className="text-white/70 text-[12px] mt-0.5">
                        Activala para encontrar{" "}
                        <span className="font-semibold text-white/90">
                          {servicio.toLowerCase()}
                        </span>{" "}
                        cerca de ti.
                      </p>

                      {geoStatus === "requesting" && (
                        <p className="text-white/80 text-[12px] mt-2">
                          Buscando tu ubicación…
                        </p>
                      )}

                      {geoStatus === "denied" && (
                        <p className="text-white/80 text-[12px] mt-2">
                          No tengo permiso de ubicación. Activala en el navegador
                          y volvé a intentar.
                        </p>
                      )}

                      {geoStatus === "error" && (
                        <p className="text-white/80 text-[12px] mt-2">
                          No pude obtener tu ubicación en este dispositivo.
                        </p>
                      )}

                      {geoStatus === "ready" && geo && (
                        <p className="text-white/80 text-[12px] mt-2">
                          Ubicación lista ✅ Buscando negocios cercanos…
                        </p>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={pedirUbicacionYBuscar}
                      disabled={loading || geoStatus === "requesting"}
                      className={[
                        "shrink-0 rounded-xl px-4 py-2 text-[13px] font-semibold transition",
                        "border border-white/18 bg-black/70 hover:bg-black text-white",
                        (loading || geoStatus === "requesting") &&
                          "opacity-60 cursor-not-allowed",
                      ].join(" ")}
                    >
                      {geoStatus === "requesting" ? "…" : "Usar"}
                    </button>
                  </div>

                  <div className="mt-3">
                    <button
                      type="button"
                      onClick={() => buscarNegociosCercanos(geo?.lat, geo?.lng)}
                      disabled={loading || geoStatus === "requesting"}
                      className={[
                        "w-full rounded-2xl py-3 font-semibold transition",
                        "bg-black/90 hover:bg-black text-white",
                        (loading || geoStatus === "requesting") &&
                          "opacity-60 cursor-not-allowed",
                      ].join(" ")}
                    >
                      {loading ? "Buscando…" : "Buscar"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="w-full max-w-6xl mt-12 text-left">
        {loading && <p className="text-white">Buscando negocios...</p>}

        {negocios.length > 0 && (
          <>
            <h2 className="text-2xl font-bold text-white mb-6">
              Encontré estos servicios cerca de ti
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {negocios.map((negocio) => (
                <a
                  key={negocio.id}
                  href={`/${negocio.plantilla}/${negocio.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group block bg-white rounded-lg shadow-md overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-2"
                >
                  {negocio.logoUrl ? (
                    <img
                      src={negocio.logoUrl}
                      alt={negocio.nombre}
                      className="h-40 w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : negocio.bannerImages && negocio.bannerImages[0] ? (
                    <img
                      src={negocio.bannerImages[0].url}
                      alt={negocio.nombre}
                      className="h-40 w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="h-40 w-full bg-black flex items-center justify-center text-white text-lg font-bold font-euphoria text-center px-2">
                      {negocio.nombre}
                    </div>
                  )}

                  <div className="p-4 transition-colors duration-300 group-hover:bg-gray-50">
                    <h3 className="text-lg font-bold group-hover:text-violet-600 transition-colors duration-300">
                      {negocio.nombre}
                    </h3>
                    <p className="text-gray-600 text-sm">
                      {negocio.ubicacion?.direccion || "Ubicación no disponible"}
                    </p>

                    <span className="mt-2 inline-block bg-gray-100 text-gray-800 px-3 py-1 text-xs rounded-full capitalize group-hover:bg-violet-100 group-hover:text-violet-700 transition-colors duration-300">
                      {negocio.plantilla}
                    </span>

                    {typeof negocio.distanciaKm === "number" && (
                      <p className="mt-2 text-xs text-gray-500">
                        A {negocio.distanciaKm.toFixed(1)} km
                      </p>
                    )}
                  </div>
                </a>
              ))}
            </div>
          </>
        )}
</div>

{/* CURVA PANZA HACIA ABAJO */}
<div className="absolute left-0 right-0 bottom-0 translate-y-full">
  <svg
    viewBox="0 0 1200 120"
    preserveAspectRatio="none"
    className="block w-full h-[60px] sm:h-[80px] md:h-[100px]"
  >
    <defs>
      <linearGradient id="curveGradient" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#7c3aed" />
        <stop offset="100%" stopColor="#9333ea" />
      </linearGradient>
    </defs>
    {/* Fondo blanco debajo de la curva */}
    <path
      d="M0,0 C300,100 900,100 1200,0 L1200,120 L0,120 Z"
      fill="white"
    />
    {/* Curva con gradiente */}
    <path
      d="M0,0 C300,100 900,100 1200,0 L1200,0 L0,0 Z"
      fill="url(#curveGradient)"
    />
  </svg>
</div>
    </section>
  );
}