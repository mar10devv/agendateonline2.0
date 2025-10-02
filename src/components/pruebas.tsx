import React, { useMemo, useState } from "react";

/** Usa PUBLIC_SITE_URL si la definís en .env, si no toma window.location.origin */
const getOrigin = () => {
  // @ts-ignore
  const env = import.meta?.env?.PUBLIC_SITE_URL as string | undefined;
  const base = env && env.trim() ? env : (typeof window !== "undefined" ? window.location.origin : "");
  return (base || "").replace(/\/$/, "");
};

export default function EmailCancelPreview() {
  const [negocioNombre, setNegocioNombre] = useState("BarberStylee");
  const [nombre, setNombre] = useState("Jeremias Fernandez");
  const [servicio, setServicio] = useState("Corte + barba");
  const [fecha, setFecha] = useState("2025-10-03");
  const [hora, setHora] = useState("14:00");
  const [motivo, setMotivo] = useState("El empleado no podrá asistir");
  const [slug, setSlug] = useState("barberstylee");

  const origin = useMemo(getOrigin, []);
  const agendaUrlAbs = slug ? `${origin}/n/${slug}` : "";

  return (
    <div className="grid md:grid-cols-[360px,1fr] gap-6">
      {/* Panel izquierdo: formulario */}
      <div className="bg-neutral-800 border border-neutral-700/80 rounded-2xl p-4 space-y-4">
        <h2 className="text-lg font-semibold">Banco de pruebas • Email</h2>

        <div>
          <label className="block text-sm text-gray-300">Negocio</label>
          <input className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2"
                 value={negocioNombre} onChange={e=>setNegocioNombre(e.target.value)} />
        </div>

        <div>
          <label className="block text-sm text-gray-300">Nombre cliente</label>
          <input className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2"
                 value={nombre} onChange={e=>setNombre(e.target.value)} />
        </div>

        <div>
          <label className="block text-sm text-gray-300">Servicio</label>
          <input className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2"
                 value={servicio} onChange={e=>setServicio(e.target.value)} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm text-gray-300">Fecha</label>
            <input className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2"
                   value={fecha} onChange={e=>setFecha(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm text-gray-300">Hora</label>
            <input className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2"
                   value={hora} onChange={e=>setHora(e.target.value)} />
          </div>
        </div>

        <div>
          <label className="block text-sm text-gray-300">Motivo</label>
          <textarea rows={3}
            className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2"
            value={motivo} onChange={e=>setMotivo(e.target.value)} />
        </div>

        <div>
          <label className="block text-sm text-gray-300">Slug (agenda)</label>
          <input className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2"
                 value={slug} onChange={e=>setSlug(e.target.value)} />
          <p className="text-xs text-gray-400 mt-1">
            URL generada: <code className="text-blue-300">{agendaUrlAbs || "(sin slug)"}</code>
          </p>
        </div>

        <div className="text-xs text-gray-400">
          Origen detectado: <span className="text-gray-200">{origin || "(no disponible en SSR)"}</span>
          <div>Definí <code className="text-blue-300">PUBLIC_SITE_URL</code> en tu <code>.env</code> si querés forzar el dominio.</div>
        </div>
      </div>

      {/* Panel derecho: vista previa del email */}
      <div className="rounded-2xl overflow-hidden">
        <div className="p-6 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 min-h-[520px] grid place-items-start">
          <div
            className="w-full max-w-2xl rounded-2xl overflow-hidden"
            style={{
              background: "rgba(0,0,0,.10)",
              backdropFilter: "saturate(120%) blur(6px)",
              border: "1px solid rgba(255,255,255,.15)",
              boxShadow: "0 8px 30px rgba(0,0,0,.25)"
            }}
          >
            <div className="px-6 py-4 border-b border-white/15">
              <strong>Cancelación de turno{negocioNombre ? ` • ${negocioNombre}` : ""}</strong>
            </div>

            <div className="px-6 pt-6 pb-3 text-[14px] leading-relaxed">
              <p>Hola {nombre || "cliente"},</p>
              <p>Tu turno ha sido <strong>cancelado</strong>.</p>

              <ul className="list-none pl-0 my-4 space-y-1">
                <li>• <strong>Servicio:</strong> {servicio || "—"}</li>
                <li>• <strong>Fecha:</strong> {fecha || "—"}</li>
                <li>• <strong>Hora:</strong> {hora || "—"}</li>
              </ul>

              {motivo?.trim() && (
                <div
                  className="rounded-xl border border-white/20 bg-white/15 px-4 py-3"
                  style={{ color: "white" }}
                >
                  <div className="opacity-80 text-[12px] mb-1">
                    Mensaje de {negocioNombre || "la barbería"}
                  </div>
                  <div style={{ whiteSpace: "pre-wrap" }}>{motivo}</div>
                </div>
              )}

              <p className="mt-5">Si deseas reprogramar, podés volver a ingresar a nuestra agenda.</p>

              {agendaUrlAbs && (
                <>
                  <div className="mt-2">
                    <a
                      href={agendaUrlAbs}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-block px-4 py-2 rounded-xl border border-white/25 bg-white/20 hover:bg-white/25"
                    >
                      Ir a la agenda
                    </a>
                  </div>
                  <div className="mt-2">
                    <a href={agendaUrlAbs} target="_blank" rel="noreferrer" className="underline text-blue-100">
                      {agendaUrlAbs}
                    </a>
                  </div>
                </>
              )}
            </div>

            <div className="px-6 py-3 border-t border-white/15 text-[12px] opacity-90">
              {negocioNombre || "Negocio"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
