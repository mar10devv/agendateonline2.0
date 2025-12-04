import { useState, useEffect } from "react";
import ModalGenerico from "../../ui/modalGenerico";
import LoaderSpinner from "../../ui/loaderSpinner";
import { subirLogoNegocio, actualizarNombreYSlug } from "../backend/agenda-backend";
import { compressImageFileToWebP } from "../../../lib/imageUtils";
import ModalTema from "./modalTema";

// 🔹 Firestore para verificar nombre/slug
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../../../lib/firebase";
// 🔹 Iconitos para el estado del nombre
import { Check, X, Loader2 } from "lucide-react";

type Props = {
  abierto: boolean;
  onCerrar: () => void;
  negocio: {
    id: string;
    nombre: string;
    slug: string;
    perfilLogo?: string;
    descripcion?: string;
    redes?: {
      instagram?: string;
      facebook?: string;
      telefono?: string;
    };
    nombreArchivoLogo?: string;
    tamanioArchivoLogo?: number;
  };
  onGuardar: (data: {
    perfilLogo?: string;
    descripcion?: string;
    redes?: {
      instagram?: string;
      facebook?: string;
      telefono?: string;
    };
    nombre?: string;
    slug?: string;
    nombreArchivoLogo?: string;
    tamanioArchivoLogo?: number;
  }) => void;
};

export default function ModalPerfil({ abierto, onCerrar, negocio, onGuardar }: Props) {
  const [subiendo, setSubiendo] = useState(false);
  const [logo, setLogo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [nombre, setNombre] = useState("");
  const [nombreArchivo, setNombreArchivo] = useState("");
  const [tamanioArchivo, setTamanioArchivo] = useState(0);
  const [modalTemaAbierto, setModalTemaAbierto] = useState(false);

  // 🔹 Estado del botón “Guardar cambios”
  const [estadoBoton, setEstadoBoton] =
    useState<"normal" | "guardando" | "exito" | "error">("normal");

  // 🔹 Estado del nombre / slug
  const [estadoNombre, setEstadoNombre] =
    useState<"idle" | "checking" | "ok" | "taken" | "error">("idle");

  // 🔄 Sincronizar con negocio cada vez que abre el modal
  useEffect(() => {
    if (negocio && abierto) {
      setLogo(negocio.perfilLogo || "");
      setDescripcion(negocio.descripcion || "");
      setNombre(negocio.nombre || "");
      setNombreArchivo(negocio.nombreArchivoLogo || "");
      setTamanioArchivo(negocio.tamanioArchivoLogo || 0);
      setEstadoNombre("idle");
    }
  }, [negocio, abierto]);

  if (!abierto) return null;

  // Utilidad para generar slug desde nombre (igual que en el resto de la app)
  const slugDesdeNombre = (texto: string) =>
    texto
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

  // 🧠 Verificación de nombre / slug con debounce
  useEffect(() => {
    // Si el nombre está vacío o es el mismo de siempre, no molestamos
    if (!nombre.trim()) {
      setEstadoNombre("idle");
      return;
    }
    if (nombre.trim() === negocio.nombre.trim()) {
      setEstadoNombre("ok");
      return;
    }

    const handler = setTimeout(async () => {
      try {
        setEstadoNombre("checking");
        const slugPropuesto = slugDesdeNombre(nombre);

        if (!slugPropuesto) {
          setEstadoNombre("idle");
          return;
        }

        const q = query(
          collection(db, "Negocios"),
          where("slug", "==", slugPropuesto)
        );
        const snap = await getDocs(q);

        const ocupadoPorOtro = snap.docs.some((d) => d.id !== negocio.id);

        if (ocupadoPorOtro) {
          setEstadoNombre("taken");
        } else {
          setEstadoNombre("ok");
        }
      } catch (e) {
        console.error("Error verificando nombre/slug:", e);
        setEstadoNombre("error");
      }
    }, 500); // 0,5s después de dejar de tipear

    return () => clearTimeout(handler);
  }, [nombre, negocio.id, negocio.nombre]);

  // 📸 Manejar carga del logo
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (logo && nombreArchivo === file.name && tamanioArchivo === file.size) {
      return;
    }

    try {
      setSubiendo(true);
      const fileComprimido = await compressImageFileToWebP(file);
      const url = await subirLogoNegocio(fileComprimido);
      if (url) {
        setLogo(url);
        setNombreArchivo(fileComprimido.name);
        setTamanioArchivo(fileComprimido.size);
      }
    } catch (err) {
      console.error("❌ Error al subir logo:", err);
      alert("No se pudo subir la imagen");
    } finally {
      setSubiendo(false);
    }
  };

  // 💾 Guardar cambios con estados del botón
  const handleGuardar = async () => {
    // Si ya sabemos que está tomado, ni intentamos
    if (estadoNombre === "taken") {
      alert("Ese nombre ya está siendo usado por otro negocio. Elegí otro 🙂");
      return;
    }

    let nuevoSlug = negocio.slug;

    try {
      setEstadoBoton("guardando");

      if (nombre && nombre !== negocio.nombre) {
        nuevoSlug = await actualizarNombreYSlug(negocio.slug, nombre);
      }

      await onGuardar({
        perfilLogo: logo,
        descripcion,
        // 🔒 Mantenemos las redes actuales tal como están en la DB
        redes: negocio.redes,
        nombre,
        slug: nuevoSlug,
        nombreArchivoLogo: nombreArchivo,
        tamanioArchivoLogo: tamanioArchivo,
      });

      setEstadoBoton("exito");
      setTimeout(() => setEstadoBoton("normal"), 2000);

      onCerrar();

      // 🟢 SIEMPRE refrescamos la web
      if (nuevoSlug !== negocio.slug) {
        // Cambió el slug → redirigimos a la nueva URL
        window.location.href = `/agenda/${nuevoSlug}`;
      } else {
        // Mismo slug → recargamos la página actual
        window.location.reload();
      }
    } catch (err: any) {
      console.error("❌ Error en handleGuardar:", err);
      setEstadoBoton("error");
      setTimeout(() => setEstadoBoton("normal"), 3000);

      if (err.message?.includes("Ya existe")) {
        alert("❌ Ya existe un negocio con ese nombre/slug");
      } else {
        alert("❌ No se pudo guardar los cambios, intenta nuevamente");
      }
    }
  };

  const inicial =
    (nombre && nombre.trim().charAt(0)) ||
    (negocio.nombre && negocio.nombre.trim().charAt(0)) ||
    "?";

  return (
    <ModalGenerico
      abierto={abierto}
      onClose={onCerrar}
      titulo="Editar perfil del negocio"
      maxWidth="max-w-md"
    >
      <div className="space-y-6">
        {/* Encabezado: foto + texto */}
        <div className="flex items-center gap-4">
          {/* 📸 Logo */}
          <div className="relative w-20 h-20 shrink-0">
            {subiendo ? (
              <div className="w-20 h-20 rounded-full flex items-center justify-center border border-white/10 bg-neutral-900/80">
                <LoaderSpinner />
              </div>
            ) : logo ? (
              <img
                src={logo}
                alt="Logo negocio"
                className="w-20 h-20 rounded-full object-cover border border-white/10 shadow-md"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-neutral-800 flex items-center justify-center text-2xl font-semibold border border-white/10 shadow-inner">
                {inicial.toLowerCase()}
              </div>
            )}

            <label
              htmlFor="upload-logo"
              className="absolute -bottom-1 -right-1 bg-neutral-900/90 border border-white/20 rounded-full w-8 h-8 flex items-center justify-center text-sm cursor-pointer hover:bg-neutral-800 transition"
            >
              +
            </label>
            <input
              id="upload-logo"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-xs uppercase tracking-wide text-neutral-400">
              Perfil del negocio
            </span>
            <span className="text-[11px] text-neutral-500 mt-1">
              agendate.online/agenda/
              <span className="font-mono text-neutral-300">{negocio.slug}</span>
            </span>
          </div>
        </div>

        {/* Campos */}
        <div className="space-y-4">
          {/* 🔹 Nombre del negocio con verificador */}
          <div className="text-left space-y-1">
            <label
              htmlFor="nombre-negocio"
              className="text-xs text-neutral-400"
            >
              Nombre del negocio
            </label>
            <div className="relative">
              <input
                id="nombre-negocio"
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="w-full rounded-lg bg-neutral-900/70 border border-neutral-700/80 px-3 py-2 pr-9 text-sm text-neutral-100 placeholder:text-neutral-500 outline-none focus:border-[var(--color-primario)] focus:ring-1 focus:ring-[var(--color-primario)] transition"
                placeholder="Cómo se llama tu negocio"
              />

              {/* Icono de estado */}
              <div className="absolute inset-y-0 right-2 flex items-center">
                {estadoNombre === "checking" && (
                  <Loader2 className="w-4 h-4 animate-spin text-neutral-400" />
                )}
                {estadoNombre === "ok" && (
                  <Check className="w-4 h-4 text-emerald-400" />
                )}
                {estadoNombre === "taken" && (
                  <X className="w-4 h-4 text-red-400" />
                )}
                {estadoNombre === "error" && (
                  <X className="w-4 h-4 text-amber-400" />
                )}
              </div>
            </div>
            {estadoNombre === "taken" && (
              <p className="text-[11px] text-red-400">
                Ya existe un negocio con un nombre muy parecido. Probá con otra variante.
              </p>
            )}
          </div>

          {/* Descripción */}
          <div className="text-left space-y-1">
            <label
              htmlFor="descripcion-negocio"
              className="text-xs text-neutral-400"
            >
              Descripción del negocio
            </label>
            <textarea
              id="descripcion-negocio"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              rows={3}
              maxLength={220}
              className="w-full rounded-lg bg-neutral-900/70 border border-neutral-700/80 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 outline-none focus:border-[var(--color-primario)] focus:ring-1 focus:ring-[var(--color-primario)] transition resize-none"
              placeholder="Contá brevemente qué ofrecés, estilo, servicios, etc."
            />
            <p className="text-[11px] text-neutral-500 text-right">
              {descripcion.length}/220
            </p>
          </div>
        </div>

        {/* Botones */}
        <div className="flex items-center justify-between gap-3 pt-2">
          <button
            onClick={() => setModalTemaAbierto(true)}
            className="text-xs sm:text-sm px-3 py-2 rounded-full border border-neutral-700/70 bg-neutral-900/60 hover:bg-neutral-800/80 text-neutral-200 transition"
          >
            Cambiar tema
          </button>

          <button
            onClick={handleGuardar}
            disabled={estadoBoton === "guardando"}
            className={`px-4 py-2 rounded-full text-sm font-medium flex items-center justify-center gap-2
              ${
                estadoBoton === "guardando"
                  ? "bg-neutral-700 text-neutral-300 cursor-not-allowed"
                  : estadoBoton === "exito"
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : estadoBoton === "error"
                  ? "bg-red-600 hover:bg-red-700"
                  : "bg-[var(--color-primario)] hover:brightness-110"
              }`}
          >
            {estadoBoton === "guardando" && <LoaderSpinner size={16} />}
            {estadoBoton === "guardando"
              ? "Guardando..."
              : estadoBoton === "exito"
              ? "✔ Guardado"
              : estadoBoton === "error"
              ? "Error al guardar"
              : "Guardar cambios"}
          </button>
        </div>
      </div>

      <ModalTema
        abierto={modalTemaAbierto}
        onCerrar={() => setModalTemaAbierto(false)}
        negocioId={negocio.id}
      />
    </ModalGenerico>
  );
}
