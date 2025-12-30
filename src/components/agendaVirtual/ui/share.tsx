// src/components/agendaVirtual/share.tsx
import { useEffect } from "react";
import ModalBase from "../../ui/modalGenerico";
import { QRCodeCanvas } from "qrcode.react";

type Props = {
  abierto: boolean;
  onCerrar: () => void;
  slug: string; // 🔹 para armar el link
};

export default function ModalShare({ abierto, onCerrar, slug }: Props) {
  const url = `https://agendateonline.com/${slug}`;

  // Copiamos al portapapeles apenas se abre el modal (una sola vez por apertura)
  useEffect(() => {
    if (!abierto) return;

    if (navigator?.clipboard?.writeText) {
      navigator.clipboard
        .writeText(url)
        .catch((err) =>
          console.error("❌ Error al copiar al portapapeles:", err)
        );
    }
  }, [abierto, url]);

  if (!abierto) return null;

  return (
    <ModalBase
      abierto={abierto}
      onClose={onCerrar}
      titulo="Compartir agenda"
      maxWidth="max-w-md"
    >
      <div className="flex flex-col items-center justify-center gap-6 py-6">
        <p className="text-center text-gray-200 text-lg">
          ✅ Se copió el enlace de tu agenda.
          <br />
          Ya podés compartirlo.
        </p>

        {/* Link en texto */}
        <div className="w-full bg-neutral-900 px-4 py-2 rounded text-sm text-gray-400 text-center break-all">
          {url}
        </div>

        {/* QR de la agenda */}
        <div className="flex flex-col items-center gap-2">
          <p className="text-xs text-gray-400 text-center">
            Escaneá este código QR para abrir la agenda:
          </p>
          <div className="p-3 rounded-2xl bg-black/80 shadow-[0_0_20px_rgba(0,0,0,0.6)]">
            <QRCodeCanvas value={url} size={160} includeMargin />
          </div>
        </div>

        <button
          onClick={onCerrar}
          className="px-6 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
        >
          OK
        </button>
      </div>
    </ModalBase>
  );
}
