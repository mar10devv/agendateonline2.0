import { useState, useEffect } from "react";
import ModalGenerico from "../../ui/modalGenerico";
import LoaderSpinner from "../../ui/loaderSpinner";
import { subirLogoNegocio, actualizarNombreYSlug } from "../backend/agenda-backend";

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
  }) => Promise<void> | void;
};

export default function ModalPerfil({ abierto, onCerrar, negocio, onGuardar }: Props) {
  const [subiendo, setSubiendo] = useState(false);
  const [logo, setLogo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [instagram, setInstagram] = useState("");
  const [facebook, setFacebook] = useState("");
  const [telefono, setTelefono] = useState("");
  const [nombre, setNombre] = useState("");
  const [nombreArchivo, setNombreArchivo] = useState("");
  const [tamanioArchivo, setTamanioArchivo] = useState(0);

  // 👇 estado del botón: idle | guardando | exito
  const [estadoGuardar, setEstadoGuardar] = useState<"idle" | "guardando" | "exito">("idle");

  // 🔄 Sincronizar con negocio cada vez que abre el modal
  useEffect(() => {
    if (negocio) {
      setLogo(negocio.perfilLogo || "");
      setDescripcion(negocio.descripcion || "");
      setInstagram(negocio.redes?.instagram || "");
      setFacebook(negocio.redes?.facebook || "");
      setTelefono(negocio.redes?.telefono || "");
      setNombre(negocio.nombre || "");
      setNombreArchivo(negocio.nombreArchivoLogo || "");
      setTamanioArchivo(negocio.tamanioArchivoLogo || 0);
    }
  }, [negocio, abierto]);

  if (!abierto) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (logo && nombreArchivo === file.name && tamanioArchivo === file.size) {
      console.log("⚡ Logo ya existente, usando URL previa");
      return;
    }

    try {
      setSubiendo(true);
      const url = await subirLogoNegocio(file);
      if (url) {
        setLogo(url);
        setNombreArchivo(file.name);
        setTamanioArchivo(file.size);
      }
    } catch (err) {
      console.error("❌ Error al subir logo:", err);
      alert("No se pudo subir la imagen");
    } finally {
      setSubiendo(false);
    }
  };

  const handleGuardar = async () => {
    try {
      setEstadoGuardar("guardando");

      let nuevoSlug = negocio.slug;
      if (nombre !== negocio.nombre) {
        nuevoSlug = await actualizarNombreYSlug(negocio.slug, nombre);
      }

      await onGuardar({
        perfilLogo: logo,
        descripcion,
        redes: { instagram, facebook, telefono },
        nombre,
        slug: nuevoSlug,
        nombreArchivoLogo: nombreArchivo,
        tamanioArchivoLogo: tamanioArchivo,
      });

      setEstadoGuardar("exito");

      // volver a "idle" después de 2s
      setTimeout(() => setEstadoGuardar("idle"), 2000);

      if (nuevoSlug !== negocio.slug) {
        window.location.href = `/agenda/${nuevoSlug}`;
      }
    } catch (err) {
      console.error("❌ Error al guardar nombre/slug:", err);
      alert("No se pudo actualizar el perfil");
      setEstadoGuardar("idle");
    }
  };

  return (
    <ModalGenerico
      abierto={abierto}
      onClose={onCerrar}
      titulo="Editar perfil del negocio"
      maxWidth="max-w-xl"
    >
      <div className="flex flex-col gap-6 items-center text-center">
        {/* 📸 Logo */}
        <div className="relative w-28 h-28">
          {subiendo ? (
            <div className="w-28 h-28 rounded-full bg-neutral-800 flex items-center justify-center border-4 border-white">
              <LoaderSpinner />
            </div>
          ) : logo ? (
            <img
              src={logo}
              alt="Logo negocio"
              className="w-28 h-28 rounded-full object-cover border-4 border-white"
            />
          ) : (
            <div className="w-28 h-28 rounded-full bg-gray-700 flex items-center justify-center text-3xl font-bold border-4 border-black">
              {nombre.charAt(0)}
            </div>
          )}

          <label
            htmlFor="upload-logo"
            className="absolute bottom-2 right-2 bg-neutral-700 text-white w-8 h-8 flex items-center justify-center rounded-full cursor-pointer border-2 border-white text-lg"
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

        {/* Nombre */}
        <input
          type="text"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Nombre del negocio"
          className="w-full bg-neutral-800 rounded p-2 text-white text-center"
        />

        {/* Descripción */}
        <textarea
          maxLength={200}
          rows={4}
          placeholder="Escribe una descripción (máx 200 caracteres)"
          className="w-full text-sm bg-neutral-800 rounded-lg p-3 text-white resize-none outline-none"
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
        />

        {/* Redes */}
        <div className="flex flex-col gap-3 w-full">
          <input
            type="text"
            placeholder="Link de Instagram"
            className="flex-1 bg-neutral-800 p-2 rounded text-white text-sm outline-none"
            value={instagram}
            onChange={(e) => setInstagram(e.target.value)}
          />
          <input
            type="text"
            placeholder="Link de Facebook"
            className="flex-1 bg-neutral-800 p-2 rounded text-white text-sm outline-none"
            value={facebook}
            onChange={(e) => setFacebook(e.target.value)}
          />
          <input
            type="text"
            placeholder="Número de teléfono o WhatsApp"
            className="flex-1 bg-neutral-800 p-2 rounded text-white text-sm outline-none"
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
          />
        </div>

        {/* Botón guardar dinámico */}
        <button
          onClick={handleGuardar}
          disabled={estadoGuardar === "guardando"}
          className={`px-4 py-2 rounded font-medium transition flex items-center justify-center gap-2
            ${estadoGuardar === "idle" ? "bg-indigo-600 hover:bg-indigo-700 text-white" : ""}
            ${estadoGuardar === "guardando" ? "bg-gray-600 text-gray-200 cursor-not-allowed" : ""}
            ${estadoGuardar === "exito" ? "bg-green-600 text-white" : ""}`}
        >
          {estadoGuardar === "guardando" && (
            <>
              <LoaderSpinner size={18} color="white" />
              Guardando...
            </>
          )}
          {estadoGuardar === "exito" && "✅ Se guardó correctamente"}
          {estadoGuardar === "idle" && "Guardar cambios"}
        </button>
      </div>
    </ModalGenerico>
  );
}
