import { useMemo, useState } from "react";

/**
 * Banco de pruebas para el correo de cancelación.
 * - Fondo: gradient a la derecha (from-blue-600 to-indigo-600)
 * - Card: negro al 10% (bg-black/10), bordes claros, texto blanco
 * - CTA opcional con URL de agenda (slug)
 */
export default function EmailCancelPreview() {
  const [negocioNombre, setNegocioNombre] = useState("BarberStylee");
  const [nombre, setNombre] = useState("Jeremias Fernandez");
  const [servicio, setServicio] = useState("Corte + barba");
  const [fecha, setFecha] = useState("2025-10-03");
  const [hora, setHora] = useState("14:00");
  const [motivo, setMotivo] = useState("El empleado no podrá asistir");
  const [slug, setSlug] = useState("barberstylee");

  const agendaHref = useMemo(() => {
    if (!slug.trim()) return "";
    // Cambia el dominio si corresponde
    return `https://tudominio.com/n/${slug.trim()}`;
  }, [slug]);

  return (
    <div className="grid min-h-screen grid-cols-1 md:grid-cols-[360px_1fr]">
      {/* Panel izquierdo (controles) */}
      <aside className="sticky top-0 h-full overflow-auto border-r border-neutral-800 bg-neutral-900/95 p-4 md:h-screen">
        <h1 className="mb-3 text-base font-semibold text-white">
          Banco de pruebas • Email
        </h1>

        <FormField label="Negocio" value={negocioNombre} onChange={setNegocioNombre} />
        <FormField label="Nombre cliente" value={nombre} onChange={setNombre} />
        <FormField label="Servicio" value={servicio} onChange={setServicio} />
        <FormField label="Fecha" value={fecha} onChange={setFecha} />
        <FormField label="Hora" value={hora} onChange={setHora} />

        <div className="mb-3">
          <label className="mb-1 block text-xs text-neutral-400">Motivo</label>
          <textarea
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            className="w-full rounded-xl border border-neutral-700 bg-neutral-800 p-2.5 text-sm text-white outline-none"
            rows={4}
          />
        </div>

        <FormField
          label="Slug (agenda)"
          value={slug}
          onChange={setSlug}
          hint='Se usará para el link "Ir a la agenda": https://tudominio.com/n/<slug>'
        />
      </aside>

      {/* Preview derecha */}
      <main className="flex min-h-screen items-center justify-center bg-gradient-to-r from-blue-600 to-indigo-600 p-4">
        <div className="w-full max-w-[620px] overflow-hidden rounded-2xl border border-white/15 bg-black/10 text-white shadow-2xl">
          {/* Header */}
          <div className="border-b border-white/10 px-5 py-4">
            <strong className="text-[15px] font-semibold">
              Cancelación de turno{negocioNombre ? ` • ${negocioNombre}` : ""}
            </strong>
          </div>

          {/* Body */}
          <div className="px-5 py-5 text-[14px] leading-6">
            <p>Hola {nombre || "cliente"},</p>
            <p>
              Tu turno ha sido <b>cancelado</b>.
            </p>

            <ul className="my-3 list-none space-y-1 p-0">
              <li>
                • <b>Servicio:</b> {servicio || "—"}
              </li>
              <li>
                • <b>Fecha:</b> {fecha || "—"}
              </li>
              <li>
                • <b>Hora:</b> {hora || "—"}
              </li>
            </ul>

            {!!motivo.trim() && (
              <div className="my-4 rounded-xl border border-white/20 bg-black/20 p-3">
                <div className="mb-1 text-[12px] text-white/80">
                  Mensaje de {negocioNombre || "el negocio"}
                </div>
                <div className="whitespace-pre-wrap">{motivo}</div>
              </div>
            )}

            <p className="mt-3">
              Si deseas reprogramar, podés volver a ingresar a nuestra agenda.
            </p>

            {!!agendaHref && (
              <>
                <div className="mt-3">
                  <a
                    href={agendaHref}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-block rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
                  >
                    Ir a la agenda
                  </a>
                </div>
                <p className="mt-2 text-[12px] underline">
                  <a href={agendaHref} target="_blank" rel="noreferrer" className="text-white">
                    {agendaHref}
                  </a>
                </p>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-white/10 px-5 py-3 text-[12px] text-white/85">
            {negocioNombre || "Tu negocio"}
          </div>
        </div>
      </main>
    </div>
  );
}

function FormField({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
}) {
  return (
    <div className="mb-3">
      <label className="mb-1 block text-xs text-neutral-400">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-neutral-700 bg-neutral-800 p-2.5 text-sm text-white outline-none"
      />
      {hint && <div className="mt-1 text-[11px] text-neutral-400">{hint}</div>}
    </div>
  );
}
