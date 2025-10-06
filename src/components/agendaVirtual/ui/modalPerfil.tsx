import { useState, useEffect } from "react";
import ModalGenerico from "../../ui/modalGenerico";
import LoaderSpinner from "../../ui/loaderSpinner";
import { subirLogoNegocio, actualizarNombreYSlug } from "../backend/agenda-backend";
import { compressImageFileToWebP } from "../../../lib/imageUtils";
import ModalTema from "./modalTema";
import InputAnimado from "../../ui/InputAnimado"; // ✅ import del input animado

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
  const [instagram, setInstagram] = useState("");
  const [facebook, setFacebook] = useState("");
  const [telefono, setTelefono] = useState("");
  const [nombre, setNombre] = useState("");
  const [nombreArchivo, setNombreArchivo] = useState("");
  const [tamanioArchivo, setTamanioArchivo] = useState(0);
  const [modalTemaAbierto, setModalTemaAbierto] = useState(false);

  // 🔹 Estado del botón “Guardar cambios”
  const [estadoBoton, setEstadoBoton] = useState<"normal" | "guardando" | "exito" | "error">("normal");

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

  // 📸 Manejar carga del logo
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (logo && nombreArchivo === file.name && tamanioArchivo === file.size) {
      console.log("⚡ Logo ya existente, usando URL previa");
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
    let nuevoSlug = negocio.slug;
    try {
      setEstadoBoton("guardando");

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

      console.log("✅ Perfil actualizado correctamente");
      setEstadoBoton("exito");
      setTimeout(() => setEstadoBoton("normal"), 3000);

      onCerrar();

      if (nuevoSlug !== negocio.slug) {
        window.location.href = `/agenda/${nuevoSlug}`;
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
            <div
              className="w-28 h-28 rounded-full flex items-center justify-center border-4 border-white transition-colors duration-300"
              style={{ backgroundColor: "var(--color-fondo)" }}
            >
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

        {/* ✅ Campos con InputAnimado */}
        <div className="flex flex-col gap-5 w-full px-4">
          <InputAnimado label="Nombre del negocio" id="nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} />
          <InputAnimado label="Descripción" id="descripcion" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
          <InputAnimado label="Instagram" id="instagram" value={instagram} onChange={(e) => setInstagram(e.target.value)} />
          <InputAnimado label="Facebook" id="facebook" value={facebook} onChange={(e) => setFacebook(e.target.value)} />
          <InputAnimado label="WhatsApp" id="telefono" value={telefono} onChange={(e) => setTelefono(e.target.value)} />
        </div>

        {/* 🔘 Botones */}
        <div className="flex gap-3 justify-center mt-4">
          <button
            onClick={() => setModalTemaAbierto(true)}
            className="bg-neutral-700 hover:bg-neutral-600 text-white px-4 py-2 rounded font-medium transition"
          >
            Cambiar tema
          </button>

          {/* Botón dinámico de Guardar */}
          <button
            onClick={handleGuardar}
            disabled={estadoBoton === "guardando"}
            className={`px-4 py-2 rounded font-medium transition text-white flex items-center justify-center gap-2
              ${
                estadoBoton === "guardando"
                  ? "bg-gray-500 cursor-not-allowed"
                  : estadoBoton === "exito"
                  ? "bg-green-600 hover:bg-green-700"
                  : estadoBoton === "error"
                  ? "bg-red-600 hover:bg-red-700"
                  : "bg-green-600 hover:bg-green-700"
              }`}
          >
            {estadoBoton === "guardando" && <LoaderSpinner size={18} />}
            {estadoBoton === "guardando"
              ? "Guardando cambios..."
              : estadoBoton === "exito"
              ? "✅ Se guardó correctamente"
              : estadoBoton === "error"
              ? "❌ Se produjo un error"
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
