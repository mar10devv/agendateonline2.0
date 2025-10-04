// src/components/agendaVirtual/share.tsx
import ModalBase from "../../ui/modalGenerico";

type Props = {
  abierto: boolean;
  onCerrar: () => void;
  slug: string; // 🔹 para armar el link
};

export default function ModalShare({ abierto, onCerrar, slug }: Props) {
  if (!abierto) return null;

  const url = `https://agendateonline.com/agenda/${slug}`;

  // Copiamos al portapapeles apenas se abre el modal
  if (abierto && navigator?.clipboard) {
    navigator.clipboard.writeText(url).catch((err) =>
      console.error("❌ Error al copiar al portapapeles:", err)
    );
  }

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
          Ya podés compartirlo con tus clientes.
        </p>

        <div className="w-full bg-neutral-900 px-4 py-2 rounded text-sm text-gray-400 text-center break-all">
          {url}
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
