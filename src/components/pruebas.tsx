import React, { useMemo, useState } from "react";

/** Usa PUBLIC_SITE_URL si la definís en .env, si no toma window.location.origin */
const getOrigin = () => {
  // @ts-ignore
  const env = import.meta?.env?.PUBLIC_SITE_URL as string | undefined;
  const base =
    env && env.trim()
      ? env
      : typeof window !== "undefined"
      ? window.location.origin
      : "";
  return (base || "").replace(/\/$/, "");
};

/* 🔗 IMPORTAMOS EL BACKEND DEL CALENDARIO */
import {
  type NegocioAgendaSource,
  type EmpleadoAgendaSource,
  type TurnoExistente,
  type SlotCalendario,
  type DiaCalendario,
  generarCalendarioEmpleadoRango,
  combinarFechaHora,
} from "../components/agendaVirtual/calendario/calendario-backend"; // 👈 ajustá la ruta si hace falta

/* =====================================================
   UI REUTILIZABLE: CalendarioBase
   ===================================================== */

type CalendarioBaseProps = {
  titulo: string;
  dias: DiaCalendario[];
  slotsPorDia: Record<string, SlotCalendario[]>;
  modo: "negocio" | "cliente";
  onClickSlot?: (slot: SlotCalendario) => void;
};

function CalendarioBase({
  titulo,
  dias,
  slotsPorDia,
  modo,
  onClickSlot,
}: CalendarioBaseProps) {
  const primeraFechaValida = dias.find((d) => !d.disabled)?.value || "";
  const [diaSeleccionado, setDiaSeleccionado] = useState<string>(
    primeraFechaValida
  );

  const slotsDelDia = slotsPorDia[diaSeleccionado] || [];

  return (
    <div className="bg-neutral-900 border border-neutral-700/80 rounded-2xl p-4 space-y-4">
      <h3 className="text-base md:text-lg font-semibold">{titulo}</h3>

      {/* Días */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {dias.map((d) => {
          const isSelected = d.value === diaSeleccionado;
          const disabled = d.disabled;

          let classes =
            "px-2.5 py-1.5 rounded-lg text-xs whitespace-nowrap border transition-all";
          if (disabled) {
            classes +=
              " border-neutral-700 text-neutral-500 cursor-not-allowed opacity-60";
          } else if (isSelected) {
            classes +=
              " bg-indigo-600 border-indigo-500 text-white shadow-sm";
          } else {
            classes +=
              " border-neutral-700 text-neutral-200 hover:bg-neutral-800";
          }

          return (
            <button
              key={d.value}
              type="button"
              disabled={disabled}
              onClick={() => !disabled && setDiaSeleccionado(d.value)}
              className={classes}
            >
              {d.label}
            </button>
          );
        })}
      </div>

      {/* Slots */}
      {slotsDelDia.length === 0 ? (
        <p className="text-xs text-neutral-400">
          No hay horarios disponibles para este día.
        </p>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
          {slotsDelDia.map((slot) => {
            const estado = slot.estado;
            let bg = "bg-emerald-600/80 text-white";
            let label = "Libre";

            if (estado === "ocupado") {
              bg = "bg-yellow-500/90 text-black";
              label = slot.turnoOcupado?.clienteNombre
                ? slot.turnoOcupado.clienteNombre
                : "Ocupado";
            } else if (estado === "bloqueado") {
              bg = "bg-red-600/90 text-white";
              label = "Bloqueado";
            } else if (estado === "pasado") {
              bg = "bg-neutral-800 text-neutral-400 line-through";
              label = "Pasado";
            }

            const clickableCliente =
              modo === "cliente" && estado === "libre";
            const clickableNegocio =
              modo === "negocio" && estado !== "pasado";
            const clickable = clickableCliente || clickableNegocio;

            return (
              <button
                key={slot.hora}
                type="button"
                disabled={!clickable}
                onClick={() => clickable && onClickSlot?.(slot)}
                className={`flex flex-col items-center justify-center rounded-lg px-1 py-1.5 text-xs font-medium transition border border-neutral-700 ${bg} ${
                  clickable ? "hover:scale-[1.03]" : "opacity-70"
                }`}
              >
                <span className="text-[11px]">{slot.hora}</span>
                <span className="text-[10px] opacity-90 truncate max-w-[70px]">
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* =====================================================
   MOCKS DE DEMO PARA EL BANCO DE PRUEBAS
   ===================================================== */

const negocioDemo: NegocioAgendaSource = {
  id: "negocio-demo",
  nombre: "BarberStylee",
  configuracionAgenda: {
    diasLibres: ["domingo"],
    modoTurnos: "jornada",
    horaInicio: "10:00",
    horaFin: "20:00",
    horasSeparacion: 30,
  },
};

const empleadoDemo: EmpleadoAgendaSource = {
  nombre: "Martín (dueño)",
  calendario: {
    inicio: "10:00",
    fin: "20:00",
    diasLibres: ["lunes"],
    descansoDiaMedio: "viernes",
    descansoTurnoMedio: "tarde",
  },
};

const turnosDemo: TurnoExistente[] = (() => {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const mañana = new Date(hoy);
  mañana.setDate(hoy.getDate() + 1);

  const pasado = new Date(hoy);
  pasado.setDate(hoy.getDate() - 1);

  return [
    // Turno futuro ocupado (clientes lo ven como ocupado)
    {
      id: "t1",
      inicio: combinarFechaHora(mañana, "14:00"),
      fin: combinarFechaHora(mañana, "15:00"),
      bloqueado: false,
      servicioNombre: "Corte + barba",
      clienteNombre: "Cliente demo",
      clienteEmail: "cliente@demo.com",
      clienteTelefono: "+59899999999",
    },
    // Turno futuro bloqueado
    {
      id: "t2",
      inicio: combinarFechaHora(mañana, "16:00"),
      fin: combinarFechaHora(mañana, "16:30"),
      bloqueado: true,
      servicioNombre: "Bloqueado",
      clienteNombre: null,
      clienteEmail: null,
      clienteTelefono: null,
    },
    // Turno pasado (se ve como pasado)
    {
      id: "t3",
      inicio: combinarFechaHora(pasado, "11:00"),
      fin: combinarFechaHora(pasado, "11:30"),
      bloqueado: false,
      servicioNombre: "Turno pasado",
      clienteNombre: "Cliente viejo",
    },
  ] as TurnoExistente[];
})();

/* =====================================================
   COMPONENTE PRINCIPAL DEL BANCO DE PRUEBAS
   ===================================================== */

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

  // 🧠 Usamos el BACKEND del calendario para generar el rango
  const { dias, slotsPorDia } = useMemo(
    () =>
      generarCalendarioEmpleadoRango(negocioDemo, empleadoDemo, turnosDemo, {
        diasAdelante: 7,
        minutosPorSlot: 30,
      }),
    []
  );

  return (
    <div className="grid md:grid-cols-[360px,1fr] gap-6">
      {/* Panel izquierdo: formulario */}
      <div className="bg-neutral-800 border border-neutral-700/80 rounded-2xl p-4 space-y-4">
        <h2 className="text-lg font-semibold">Banco de pruebas • Email + Calendarios</h2>

        <div>
          <label className="block text-sm text-gray-300">Negocio</label>
          <input
            className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2"
            value={negocioNombre}
            onChange={(e) => setNegocioNombre(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm text-gray-300">Nombre cliente</label>
          <input
            className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm text-gray-300">Servicio</label>
          <input
            className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2"
            value={servicio}
            onChange={(e) => setServicio(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm text-gray-300">Fecha</label>
            <input
              className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm text-gray-300">Hora</label>
            <input
              className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2"
              value={hora}
              onChange={(e) => setHora(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm text-gray-300">Motivo</label>
          <textarea
            rows={3}
            className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm text-gray-300">Slug (agenda)</label>
          <input
            className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
          />
          <p className="text-xs text-gray-400 mt-1">
            URL generada:{" "}
            <code className="text-blue-300">
              {agendaUrlAbs || "(sin slug)"}
            </code>
          </p>
        </div>

        <div className="text-xs text-gray-400">
          Origen detectado:{" "}
          <span className="text-gray-200">
            {origin || "(no disponible en SSR)"}
          </span>
          <div>
            Definí{" "}
            <code className="text-blue-300">PUBLIC_SITE_URL</code> en tu{" "}
            <code>.env</code> si querés forzar el dominio.
          </div>
        </div>
      </div>

      {/* Panel derecho: vista previa + calendarios */}
      <div className="rounded-2xl overflow-hidden space-y-6">
        {/* Vista previa del email */}
        <div className="p-6 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 min-h-[360px] grid place-items-start">
          <div
            className="w-full max-w-2xl rounded-2xl overflow-hidden"
            style={{
              background: "rgba(0,0,0,.10)",
              backdropFilter: "saturate(120%) blur(6px)",
              border: "1px solid rgba(255,255,255,.15)",
              boxShadow: "0 8px 30px rgba(0,0,0,.25)",
            }}
          >
            <div className="px-6 py-4 border-b border-white/15">
              <strong>
                Cancelación de turno
                {negocioNombre ? ` • ${negocioNombre}` : ""}
              </strong>
            </div>

            <div className="px-6 pt-6 pb-3 text-[14px] leading-relaxed">
              <p>Hola {nombre || "cliente"},</p>
              <p>
                Tu turno ha sido <strong>cancelado</strong>.
              </p>

              <ul className="list-none pl-0 my-4 space-y-1">
                <li>
                  • <strong>Servicio:</strong> {servicio || "—"}
                </li>
                <li>
                  • <strong>Fecha:</strong> {fecha || "—"}
                </li>
                <li>
                  • <strong>Hora:</strong> {hora || "—"}
                </li>
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

              <p className="mt-5">
                Si deseas reprogramar, podés volver a ingresar a nuestra agenda.
              </p>

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
                    <a
                      href={agendaUrlAbs}
                      target="_blank"
                      rel="noreferrer"
                      className="underline text-blue-100"
                    >
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

        {/* 🔹 Calendarios */}
        <div className="space-y-4">
          <CalendarioBase
            titulo="Calendario del negocio (panel dueño)"
            dias={dias}
            slotsPorDia={slotsPorDia}
            modo="negocio"
            onClickSlot={(slot) => {
              console.log("[NEGOCIO] Click en slot:", slot);
            }}
          />

          <CalendarioBase
            titulo="Calendario para clientes (reservar turno)"
            dias={dias}
            slotsPorDia={slotsPorDia}
            modo="cliente"
            onClickSlot={(slot) => {
              if (slot.estado === "libre") {
                console.log("[CLIENTE] Reservar en:", slot);
              }
            }}
          />
        </div>
      </div>
    </div>
  );
}
