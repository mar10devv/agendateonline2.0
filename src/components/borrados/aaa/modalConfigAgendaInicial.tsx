// src/components/agendaVirtual/ui/modalConfigAgendaInicial.tsx
import { useState, useEffect } from "react";
import ModalBase from "../ui/modalGenerico";
import { db } from "../../lib/firebase";
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { subirImagenImgBB } from "../agendaVirtual/backend/modalEmpleadosBackend";
import { obtenerDireccion } from "../../lib/geocoding";
import { guardarUbicacionNegocio } from "../agendaVirtual/backend/agenda-backend";

// 🌍 Leaflet
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// ✅ Icono personalizado para Leaflet
const customIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

// --------- Tipos básicos ---------
type ConfigAgenda = {
  diasLibres?: string[];
  modoTurnos?: "jornada" | "personalizado";
  clientesPorDia?: number | null;
  horaInicio?: string;
  horaFin?: string;
  onboardingCompletado?: boolean;
};

type UbicacionNegocio = {
  lat: number;
  lng: number;
  direccion: string;
};

type Props = {
  abierto: boolean;
  onClose: () => void;
  negocioId: string;
  configuracionActual?: ConfigAgenda;
  onGuardado?: (nuevaConfig: ConfigAgenda) => void; // ⭐ NUEVO
};

type ServicioLocal = {
  nombre: string;
  precio: string;
  duracion: number;
};

type DescansoModo = "negocio" | "1dia" | "2dias" | "diaYMedio";

type EmpleadoLocal = {
  nombre: string;
  email: string;
  rol: "empleado" | "admin";
  esEmpleado: boolean;
  fotoPerfil?: string;
  subiendoFoto?: boolean;
  trabajos: string[];
  horarioModo: "jornada" | "personalizado";
  horarioInicio: string;
  horarioFin: string;
  diasLibres: string[];

  // Nuevo: patrón de descanso
  descansoModo: DescansoModo;
  diasDescansoExtra: string[]; // solo extras, los días cerrados del negocio se agregan al guardar
};

// --------- Helpers ---------
const DIAS_LABELS = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
  "Domingo",
];

function normalizarDiaKey(label: string): string {
  return label
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

// Duraciones sugeridas (minutos) hasta 4 horas
const DURACIONES = [
  10, 20, 30, 40, 50, 60, 70, 80, 90, 120, 150, 180, 210, 240,
];

function formatearDuracion(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h} h ${m} min`;
}

// ----------------------------------------------------
//               COMPONENTE PRINCIPAL
// ----------------------------------------------------
export default function ModalConfigAgendaInicial({
  abierto,
  onClose,
  negocioId,
  configuracionActual,
  onGuardado, // ⭐ NUEVO: lo recibimos
}: Props) {
  const [paso, setPaso] = useState(1);

  const [tipoAgenda, setTipoAgenda] = useState<
    "emprendimiento" | "negocio" | null
  >(null);
  const [nombreNegocio, setNombreNegocio] = useState("");
  const [configAgenda, setConfigAgenda] = useState<ConfigAgenda | null>(null);
  const [diasCerradosNegocio, setDiasCerradosNegocio] = useState<string[]>([]);
  const [horarioNegocio, setHorarioNegocio] = useState<{
    inicio: string;
    fin: string;
  }>({
    inicio: "09:00",
    fin: "18:00",
  });

  // Servicios
  const [servicios, setServicios] = useState<ServicioLocal[]>([
    { nombre: "", precio: "", duracion: 30 },
  ]);

  // Empleados (solo negocio, pero también usamos 1 interno para emprendimiento)
  const [empleados, setEmpleados] = useState<EmpleadoLocal[]>([]);

  // Ubicación + branding
  const [negocioSlug, setNegocioSlug] = useState("");
  const [ubicacion, setUbicacion] = useState<UbicacionNegocio | null>(null);
  const [estadoUbicacion, setEstadoUbicacion] = useState<
    "idle" | "cargando" | "exito"
  >("idle");

  const [direccion, setDireccion] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [instagram, setInstagram] = useState("");
  const [facebook, setFacebook] = useState("");
  const [tiktok, setTiktok] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [logoNegocio, setLogoNegocio] = useState("");
  const [subiendoLogo, setSubiendoLogo] = useState(false);

  const [cargandoNegocio, setCargandoNegocio] = useState(true);
  const [guardando, setGuardando] = useState(false);

  const esNegocio = tipoAgenda === "negocio";
  const totalPasos = esNegocio ? 4 : 3;

  // --------- Cargar datos desde Firebase al abrir ---------
  useEffect(() => {
    if (!abierto || !negocioId) return;

    const cargar = async () => {
      setCargandoNegocio(true);
      try {
        const negocioRef = doc(db, "Negocios", negocioId);
        const snap = await getDoc(negocioRef);

        if (!snap.exists()) {
          console.warn("Negocio no encontrado para onboarding");
          setTipoAgenda("emprendimiento");
          setNegocioSlug("");
          setConfigAgenda({
            diasLibres: [],
            modoTurnos: "jornada",
            horaInicio: "09:00",
            horaFin: "18:00",
          });
          setDiasCerradosNegocio([]);
          setHorarioNegocio({ inicio: "09:00", fin: "18:00" });
          setEmpleados([]);
          setServicios([{ nombre: "", precio: "", duracion: 30 }]);
          setUbicacion(null);
          setDireccion("");
          setDescripcion("");
          setInstagram("");
          setFacebook("");
          setTiktok("");
          setWhatsapp("");
          setLogoNegocio("");
          setEstadoUbicacion("idle");
          setPaso(1);
          return;
        }

        const data = snap.data() as any;

        const tAgenda =
          (data.tipoAgenda as "emprendimiento" | "negocio") ||
          "emprendimiento";
        setTipoAgenda(tAgenda);

        setNegocioSlug(data.slug ?? "");

        const cfg: ConfigAgenda =
          (data.configuracionAgenda as ConfigAgenda) ||
          configuracionActual ||
          {};
        const dias = cfg.diasLibres ?? [];
        const inicio = cfg.horaInicio ?? "09:00";
        const fin = cfg.horaFin ?? "18:00";

        setConfigAgenda(cfg);
        setDiasCerradosNegocio(dias);
        setHorarioNegocio({ inicio, fin });

        setNombreNegocio(data.nombre ?? "");
        setDescripcion(data.descripcion ?? "");

        const ubicDb =
          (data.ubicacion as UbicacionNegocio | undefined) || null;
        if (ubicDb && typeof ubicDb.lat === "number") {
          setUbicacion(ubicDb);
          setDireccion(ubicDb.direccion ?? data.direccion ?? "");
        } else {
          setUbicacion(null);
          setDireccion(data.direccion ?? "");
        }

        const redes = (data.redes as any) ?? {};
        setInstagram(redes.instagram ?? "");
        setFacebook(redes.facebook ?? "");
        setTiktok(redes.tiktok ?? "");
        // 🔁 Lee primero `telefono`, si no existe usa `whatsapp`
        setWhatsapp(redes.telefono ?? redes.whatsapp ?? "");

        setLogoNegocio(data.perfilLogo ?? "");
        setEstadoUbicacion("idle");

        // ---- Empleados iniciales ----
        const empleadosDb = (data.empleadosData as any[]) ?? [];
        if (tAgenda === "negocio") {
          if (empleadosDb.length > 0) {
            setEmpleados(
              empleadosDb.map((e: any) => {
                const cal = e.calendario || {};
                const cfgDescansoModo: DescansoModo =
                  (e.descansoModo as DescansoModo) ?? "negocio";

                const diasExtraDb: string[] = Array.isArray(e.diasDescansoExtra)
                  ? e.diasDescansoExtra
                  : [];

                return {
                  nombre: e.nombre ?? "",
                  email: e.email ?? "",
                  rol: e.rol === "admin" ? "admin" : "empleado",
                  esEmpleado: e.esEmpleado !== false,
                  fotoPerfil: e.fotoPerfil ?? "",
                  subiendoFoto: false,
                  trabajos: Array.isArray(e.trabajos) ? e.trabajos : [],

                  horarioModo: "personalizado",
                  horarioInicio: cal.inicio ?? inicio,
                  horarioFin: cal.fin ?? fin,
                  diasLibres: Array.isArray(cal.diasLibres) ? cal.diasLibres : dias,

                  // 👇 ahora respeta lo guardado en Firebase
                  descansoModo: cfgDescansoModo,
                  diasDescansoExtra: diasExtraDb,
                } as EmpleadoLocal;
              })
            );
          } else {
            setEmpleados([
              {
                nombre: data.nombre ?? "Empleado 1",
                email: "",
                rol: "admin",
                esEmpleado: true,
                fotoPerfil: "",
                subiendoFoto: false,
                trabajos: [],
                horarioModo: "personalizado",
                horarioInicio: inicio,
                horarioFin: fin,
                diasLibres: dias,
                descansoModo: "negocio",
                diasDescansoExtra: [],
              },
            ]);
          }
        }

        // Servicios: empezamos vacío para que el usuario los cargue acá
        setServicios([{ nombre: "", precio: "", duracion: 30 }]);
        setPaso(1);
      } catch (err) {
        console.error("Error cargando negocio para onboarding:", err);
      } finally {
        setCargandoNegocio(false);
      }
    };

    cargar();
  }, [abierto, negocioId, configuracionActual]);

  if (!abierto) return null;

  // --------- Helpers de estado/acciones ---------
  const serviciosValidos = servicios.filter((s) => s.nombre.trim() !== "");

  const handleServicioChange = (
    index: number,
    field: keyof ServicioLocal,
    value: string | number
  ) => {
    setServicios((prev) =>
      prev.map((s, i) => (i === index ? { ...s, [field]: value } : s))
    );
  };

  const handleAgregarServicio = () => {
    setServicios((prev) => [
      ...prev,
      { nombre: "", precio: "", duracion: 30 },
    ]);
  };

  const handleEliminarServicio = (index: number) => {
    setServicios((prev) => prev.filter((_, i) => i !== index));
  };

  const handleEmpleadoChange = (
    index: number,
    field: keyof EmpleadoLocal,
    value: any
  ) => {
    setEmpleados((prev) =>
      prev.map((e, i) => (i === index ? { ...e, [field]: value } : e))
    );
  };

  const toggleTrabajoEmpleado = (index: number, servicioNombre: string) => {
    setEmpleados((prev) =>
      prev.map((e, i) => {
        if (i !== index) return e;
        const yaLoTiene = e.trabajos.includes(servicioNombre);
        return {
          ...e,
          trabajos: yaLoTiene
            ? e.trabajos.filter((t) => t !== servicioNombre)
            : [...e.trabajos, servicioNombre],
        };
      })
    );
  };

  const handleAgregarEmpleado = () => {
    const inicio = horarioNegocio.inicio;
    const fin = horarioNegocio.fin;
    setEmpleados((prev) => [
      ...prev,
      {
        nombre: "",
        email: "",
        rol: "empleado",
        esEmpleado: true,
        fotoPerfil: "",
        subiendoFoto: false,
        trabajos: [],
        horarioModo: "personalizado",
        horarioInicio: inicio,
        horarioFin: fin,
        diasLibres: diasCerradosNegocio,
        descansoModo: "negocio",
        diasDescansoExtra: [],
      },
    ]);
  };

  const handleEliminarEmpleado = (index: number) => {
    if (index === 0) {
      alert("El creador de la agenda no se puede eliminar.");
      return;
    }
    setEmpleados((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubirFotoEmpleado = async (index: number, file: File) => {
    try {
      setEmpleados((prev) =>
        prev.map((e, i) =>
          i === index ? { ...e, subiendoFoto: true } : e
        )
      );

      const url = await subirImagenImgBB(file);

      if (!url) {
        alert("No se pudo subir la foto. Intentalo de nuevo.");
      } else {
        setEmpleados((prev) =>
          prev.map((e, i) =>
            i === index ? { ...e, fotoPerfil: url, subiendoFoto: false } : e
          )
        );
      }
    } catch (err) {
      console.error("Error subiendo foto:", err);
      alert("Ocurrió un error subiendo la foto.");
      setEmpleados((prev) =>
        prev.map((e, i) =>
          i === index ? { ...e, subiendoFoto: false } : e
        )
      );
    }
  };

  const handleSubirLogoNegocio = async (file: File) => {
    try {
      setSubiendoLogo(true);
      const url = await subirImagenImgBB(file);
      if (!url) {
        alert("No se pudo subir la imagen. Intentalo de nuevo.");
      } else {
        setLogoNegocio(url);
      }
    } catch (err) {
      console.error("Error subiendo logo negocio:", err);
      alert("Ocurrió un error subiendo la imagen.");
    } finally {
      setSubiendoLogo(false);
    }
  };

  const toggleDiaExtraEmpleado = (index: number, diaLabel: string) => {
    const key = normalizarDiaKey(diaLabel);
    setEmpleados((prev) =>
      prev.map((e, i) => {
        if (i !== index) return e;
        const existe = e.diasDescansoExtra.includes(key);
        return {
          ...e,
          diasDescansoExtra: existe
            ? e.diasDescansoExtra.filter((d) => d !== key)
            : [...e.diasDescansoExtra, key],
        };
      })
    );
  };

  // ✅ Minimapa: geolocalizar (como antes) pero solo setea la posición inicial
  const handleGeolocalizar = () => {
    if (!navigator.geolocation) {
      alert("Tu navegador no soporta geolocalización.");
      return;
    }

    setEstadoUbicacion("cargando");

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;

        let direccionApi = "";
        try {
          direccionApi = await obtenerDireccion(latitude, longitude);
        } catch (err) {
          console.error("Error obteniendo dirección:", err);
        }

        const direccionFinal =
          direccionApi || direccion || "Ubicación actual";

        const nuevaUbicacion: UbicacionNegocio = {
          lat: latitude,
          lng: longitude,
          direccion: direccionFinal,
        };

        setUbicacion(nuevaUbicacion);
        setDireccion(direccionFinal);

        // Guardar inmediatamente la ubicación estructurada
        try {
          if (negocioSlug) {
            await guardarUbicacionNegocio(negocioSlug, nuevaUbicacion);
          } else if (negocioId) {
            const negocioRef = doc(db, "Negocios", negocioId);
            await updateDoc(negocioRef, {
              ubicacion: nuevaUbicacion,
              direccion: direccionFinal,
            });
          }
        } catch (err) {
          console.error("Error guardando ubicación en Firestore:", err);
        }

        setEstadoUbicacion("exito");
        setTimeout(() => setEstadoUbicacion("idle"), 2500);
      },
      (err) => {
        console.error("Error al obtener ubicación:", err);
        alert(
          "No se pudo obtener tu ubicación. Revisá los permisos del navegador."
        );
        setEstadoUbicacion("idle");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // ✅ Handler cuando mueven el pin del minimapa (igual que en AgendaVirtualUI)
  const handleMarkerDragEnd = async (event: any) => {
    try {
      const marker = event.target;
      const newPos = marker.getLatLng();

      const direccionNueva = await obtenerDireccion(newPos.lat, newPos.lng);

      const nuevaUbicacion: UbicacionNegocio = {
        lat: newPos.lat,
        lng: newPos.lng,
        direccion: direccionNueva || "Ubicación ajustada",
      };

      setUbicacion(nuevaUbicacion);
      setDireccion(nuevaUbicacion.direccion);

      if (negocioSlug) {
        await guardarUbicacionNegocio(negocioSlug, nuevaUbicacion);
      } else if (negocioId) {
        const negocioRef = doc(db, "Negocios", negocioId);
        await updateDoc(negocioRef, {
          ubicacion: nuevaUbicacion,
          direccion: nuevaUbicacion.direccion,
        });
      }

      setEstadoUbicacion("exito");
      setTimeout(() => setEstadoUbicacion("idle"), 2500);
    } catch (err) {
      console.error("Error al mover el pin:", err);
      setEstadoUbicacion("idle");
    }
  };

  // --------- Guardar todo y terminar ---------
  const handleGuardarYTerminar = async () => {
    if (serviciosValidos.length === 0) {
      alert("Agregá al menos un servicio para comenzar.");
      setPaso(1);
      return;
    }

    const tipo = tipoAgenda ?? "emprendimiento";

    if (tipo === "negocio" && empleados.length === 0) {
      alert("Agregá al menos un empleado.");
      setPaso(2);
      return;
    }

    if (tipo === "negocio" && !direccion.trim()) {
      alert("Agregá la dirección de tu local (podés ajustarla luego).");
      return;
    }

    const cfgAnterior = configAgenda ?? configuracionActual ?? {};
    const diasBase = cfgAnterior.diasLibres ?? diasCerradosNegocio ?? [];
    const inicioNegocio = horarioNegocio.inicio;
    const finNegocio = horarioNegocio.fin;

    // Validaciones empleados (solo negocio)
    if (tipo === "negocio") {
      for (const e of empleados) {
        if (!e.nombre.trim()) {
          alert("Todos los empleados deben tener nombre.");
          return;
        }

        if (e.esEmpleado) {
          if (serviciosValidos.length === 0) {
            alert(
              `Agregá servicios en el Paso 1 para poder asignarlos a tus empleados.`
            );
            return;
          }
          if (!e.trabajos || e.trabajos.length === 0) {
            alert(
              `El empleado "${e.nombre || "sin nombre"}" debe tener al menos un servicio asignado.`
            );
            return;
          }

          const horaIni = e.horarioInicio || inicioNegocio;
          const horaFin = e.horarioFin || finNegocio;

          if (!horaIni || !horaFin || horaIni >= horaFin) {
            alert(
              `Revisá el horario de "${e.nombre || "empleado"}". La hora de entrada debe ser anterior a la de salida.`
            );
            return;
          }

          if (horaIni < inicioNegocio || horaFin > finNegocio) {
            alert(
              `El horario de "${e.nombre || "empleado"}" debe estar dentro del horario del negocio (${inicioNegocio} - ${finNegocio}).`
            );
            return;
          }

          const extra = e.diasDescansoExtra ?? [];

          // 👉 MODO "1 día libre o más": debe haber AL MENOS 1 día seleccionado
          if (e.descansoModo === "1dia" && extra.length < 1) {
            alert(
              `Elegí al menos 1 día extra de descanso para "${
                e.nombre || "empleado"
              }".`
            );
            return;
          }

          // 👉 MODO "2 días" o "1 día y medio": deben ser EXACTAMENTE 2 días
          if (
            (e.descansoModo === "2dias" || e.descansoModo === "diaYMedio") &&
            extra.length !== 2
          ) {
            alert(
              `Elegí exactamente 2 días extra de descanso para "${
                e.nombre || "empleado"
              }".`
            );
            return;
          }
        }
      }
    }

    try {
      setGuardando(true);

      const negocioRef = doc(db, "Negocios", negocioId);

      // Configuración de agenda con onboarding completado
      const nuevaConfig: ConfigAgenda = {
        ...cfgAnterior,
        diasLibres: diasBase,
        onboardingCompletado: true,
      };

      let empleadosNormalizados: any[] = [];

      if (tipo === "negocio") {
        empleadosNormalizados = empleados.map((e) => {
          const emailTrim = e.email.trim();
          const adminEmail =
            e.rol === "admin" && emailTrim
              ? emailTrim.toLowerCase()
              : "";

          // Días extra seleccionados en el modal (normalizados: "lunes", "domingo", etc.)
          const diasExtraUnique = Array.from(
            new Set(e.diasDescansoExtra || [])
          );

          const horaInicioFinal = e.horarioInicio || inicioNegocio;
          const horaFinFinal = e.horarioFin || finNegocio;

          // 👇 NUEVO: calculamos descanso real del empleado
          let diasLibresEmpleado: string[] = [];
          let descansoDiaLibre: string | null = null;
          let descansoDiaMedio: string | null = null;
          let descansoTurnoMedio: "manana" | "tarde" | null = null;

          // Siempre partimos de los días que el negocio ya tiene cerrados
          const diasBaseNegocio = Array.isArray(diasBase) ? diasBase : [];

          if (e.descansoModo === "negocio") {
            // Mismos días que el negocio
            diasLibresEmpleado = Array.from(new Set(diasBaseNegocio));
          } else if (e.descansoModo === "1dia" || e.descansoModo === "2dias") {
            // 1 día libre o más → todos los extras son días libres completos
            diasLibresEmpleado = Array.from(
              new Set([...diasBaseNegocio, ...diasExtraUnique])
            );
          } else if (e.descansoModo === "diaYMedio") {
            // Día y medio:
            // - diasExtraUnique[0] => día libre completo
            // - diasExtraUnique[1] => día de medio turno
            if (diasExtraUnique.length >= 1) {
              descansoDiaLibre = diasExtraUnique[0];
            }
            if (diasExtraUnique.length >= 2) {
              descansoDiaMedio = diasExtraUnique[1];
            }

            // 👇 Partimos de los días que el negocio tiene cerrados
            let base = [...diasBaseNegocio];

            // 👉 Si el día de medio turno está en los días cerrados del negocio,
            // lo sacamos para ESTE empleado (porque él sí trabaja 4h ese día)
            if (descansoDiaMedio) {
              base = base.filter((d) => d !== descansoDiaMedio);
            }

            // 👉 Agregamos el día libre completo del empleado
            if (descansoDiaLibre) {
              base.push(descansoDiaLibre);
            }

            diasLibresEmpleado = Array.from(new Set(base));

            // 🔍 Calculamos si el medio día es mañana o tarde
            if (descansoDiaLibre && descansoDiaMedio) {
              const idxLibre = DIAS_LABELS.findIndex(
                (d) => normalizarDiaKey(d) === descansoDiaLibre
              );
              const idxMedio = DIAS_LABELS.findIndex(
                (d) => normalizarDiaKey(d) === descansoDiaMedio
              );

              if (idxLibre !== -1 && idxMedio !== -1) {
                const prevIndex =
                  (idxLibre - 1 + DIAS_LABELS.length) % DIAS_LABELS.length;
                const nextIndex =
                  (idxLibre + 1) % DIAS_LABELS.length;

                if (idxMedio === prevIndex) {
                  descansoTurnoMedio = "manana";
                } else if (idxMedio === nextIndex) {
                  descansoTurnoMedio = "tarde";
                }
              }
            }
          }

          return {
            nombre: e.nombre.trim(),
            email: emailTrim,
            rol: e.rol,
            admin: e.rol === "admin",
            adminEmail,
            fotoPerfil: e.fotoPerfil || "",
            trabajos: Array.isArray(e.trabajos) ? e.trabajos : [],

            // 🗓️ Calendario del empleado
            calendario: {
              inicio: horaInicioFinal,
              fin: horaFinFinal,
              diasLibres: diasLibresEmpleado,
            },

            esEmpleado: e.esEmpleado !== false,

            // Guardamos el modo y los extras tal como los eligió en el modal
            descansoModo: e.descansoModo,
            diasDescansoExtra: diasExtraUnique,

            // NUEVO: info explícita para el calendario (día libre + medio día)
            // Solo tiene sentido en "diaYMedio", pero se puede guardar null en otros casos sin drama.
            descansoDiaLibre: descansoDiaLibre,
            descansoDiaMedio: descansoDiaMedio,
            descansoTurnoMedio: descansoTurnoMedio,
          };
        });
      } else {
        // Emprendimiento: 1 persona = hace todos los servicios
        const base = empleados[0] || {
          nombre: nombreNegocio || "Vos",
          email: "",
        };

        empleadosNormalizados = [
          {
            nombre: (base as any).nombre ?? nombreNegocio ?? "Vos",
            email: (base as any).email ?? "",
            rol: "admin",
            admin: true,
            adminEmail:
              ((base as any).email || "").toLowerCase() || "",
            fotoPerfil: logoNegocio || (base as any).fotoPerfil || "",
            trabajos: serviciosValidos.map((s) => s.nombre.trim()),
            calendario: {
              inicio: cfgAnterior.horaInicio ?? horarioNegocio.inicio,
              fin: cfgAnterior.horaFin ?? horarioNegocio.fin,
              diasLibres: diasBase,
            },
            esEmpleado: true,
            descansoModo: "negocio" as DescansoModo,
            diasDescansoExtra: [],
            descansoDiaLibre: null,
            descansoDiaMedio: null,
            descansoTurnoMedio: null,
          },
        ];
      }

      const adminUidsEmails = empleadosNormalizados
        .filter((e) => e.adminEmail)
        .map((e) => e.adminEmail);

      // ---- Payload de actualización ----
      const payload: any = {
        configuracionAgenda: nuevaConfig,
        empleados: empleadosNormalizados.length,
        empleadosData: empleadosNormalizados,
        adminUids: adminUidsEmails,
        descripcion: descripcion.trim(),
        redes: {
          instagram: instagram.trim(),
          facebook: facebook.trim(),
          tiktok: tiktok.trim(),
          whatsapp: whatsapp.trim(),
          // ✅ también guardamos `telefono` como hace ModalPerfil
          telefono: whatsapp.trim(),
        },
      };

      if (direccion.trim()) {
        payload.direccion = direccion.trim();
      }

      if (logoNegocio) {
        payload.perfilLogo = logoNegocio;
      }

      if (ubicacion) {
        payload.ubicacion = {
          ...ubicacion,
          direccion: direccion.trim() || ubicacion.direccion,
        };
      }

      await updateDoc(negocioRef, payload);

      // ⭐ Avisamos al padre cuál es la nueva config de agenda
      if (onGuardado) {
        onGuardado(nuevaConfig);
      }

      // ✅ cerrar modal y refrescar web
      onClose();
      if (typeof window !== "undefined") {
        window.location.reload();
      }
    } catch (e) {
      console.error("Error guardando configuración inicial:", e);
      alert("Ocurrió un error guardando la configuración inicial.");
    } finally {
      setGuardando(false);
    }
  };

  // --------- Render tarjeta empleado (Creador / Empleados) ---------
  const renderEmpleadoCard = (index: number, esCreador: boolean) => {
    const e = empleados[index];
    if (!e) return null;

    // ------------ UI de descanso (creador y empleados) ------------
    const BloqueDescanso = () => {
      const esModo1Dia = e.descansoModo === "1dia";
      const esModoDiaYMedio = e.descansoModo === "diaYMedio";

      const diasSeleccionados = e.diasDescansoExtra || [];

      // Para "1 día y medio" interpretamos:
      // - diasSeleccionados[0] => día libre completo
      // - diasSeleccionados[1] => día de medio turno (4 horas)
      const diaLibreKey = esModoDiaYMedio ? diasSeleccionados[0] ?? null : null;
      const diaMedioKey = esModoDiaYMedio ? diasSeleccionados[1] ?? null : null;

      const labelDesdeKey = (key: string | null) => {
        if (!key) return null;
        return DIAS_LABELS.find((d) => normalizarDiaKey(d) === key) ?? null;
      };

      const diaLibreLabel = labelDesdeKey(diaLibreKey);

      // Para el medio día: solo permitimos el día anterior y el siguiente del día libre
      const getPrevNextOptions = () => {
        if (!diaLibreLabel) return [];
        const index = DIAS_LABELS.findIndex((d) => d === diaLibreLabel);
        if (index === -1) return [];

        const prevIndex = (index - 1 + DIAS_LABELS.length) % DIAS_LABELS.length;
        const nextIndex = (index + 1) % DIAS_LABELS.length;

        const prevLabel = DIAS_LABELS[prevIndex];
        const nextLabel = DIAS_LABELS[nextIndex];

        return [
          { label: prevLabel, key: normalizarDiaKey(prevLabel), tipo: "antes" as const },
          { label: nextLabel, key: normalizarDiaKey(nextLabel), tipo: "despues" as const },
        ];
      };

      const opcionesMedioDia = getPrevNextOptions();

      // Helper para setear el array de días de descanso (solo diseño)
      const setDiasDescanso = (dias: string[]) => {
        handleEmpleadoChange(index, "diasDescansoExtra", dias);
      };

      // Paso 1: seleccionar el día libre completo
      const handleSeleccionDiaLibre = (labelDia: string) => {
        const key = normalizarDiaKey(labelDia);

        // Si hace clic de nuevo en el mismo día => lo deseleccionamos
        if (diaLibreKey === key) {
          // Mantengo (opcional) el medio día si lo hubiera, pero sin día libre no tiene mucho sentido.
          // Para diseño podríamos simplemente limpiar todo:
          setDiasDescanso([]);
          return;
        }

        // Si ya había medio día, lo mantenemos solo si sigue siendo adyacente; para diseño, lo reseteamos.
        setDiasDescanso([key]);
      };

      // Paso 2: seleccionar el día donde hace solo 4 horas
      const handleSeleccionDiaMedio = (optKey: string) => {
        if (!diaLibreKey) return; // aún no eligió el día libre

        // Si clickea el mismo día medio ya seleccionado => lo quitamos (opcional)
        if (diaMedioKey === optKey) {
          setDiasDescanso([diaLibreKey]);
          return;
        }

        setDiasDescanso([diaLibreKey, optKey]);
      };

      // Para el texto explicativo de mañana / tarde según la posición del medio día
      const getResumenMedioDia = () => {
        if (!diaLibreKey || !diaMedioKey) return "";

        const libreIndex = DIAS_LABELS.findIndex(
          (d) => normalizarDiaKey(d) === diaLibreKey
        );
        const medioIndex = DIAS_LABELS.findIndex(
          (d) => normalizarDiaKey(d) === diaMedioKey
        );
        if (libreIndex === -1 || medioIndex === -1) return "";

        const prevIndex = (libreIndex - 1 + DIAS_LABELS.length) % DIAS_LABELS.length;
        const nextIndex = (libreIndex + 1) % DIAS_LABELS.length;

        if (medioIndex === prevIndex) {
          return `Ese día de medio turno será en la mañana.`;
        }
        if (medioIndex === nextIndex) {
          return `Ese día de medio turno será en la tarde.`;
        }
        return "";
      };

      const resumenMedioDia = getResumenMedioDia();

      return (
        <div className="space-y-3">
          <label className="block text-xs mb-1 text-gray-300">
            Descanso semanal del empleado
          </label>

          {/* BOTONES MODO DE DESCANSO */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {[
              {
                key: "negocio" as DescansoModo,
                label: "Mismos días que el negocio",
              },
              {
                key: "1dia" as DescansoModo,
                label: "1 día libre o más",
              },
              {
                key: "diaYMedio" as DescansoModo,
                label: "1 día libre y medio",
              },
            ].map((b) => (
              <button
                key={b.key}
                type="button"
                onClick={() => handleEmpleadoChange(index, "descansoModo", b.key)}
                className={`px-3 py-2 rounded-lg border text-xs transition
              ${
                e.descansoModo === b.key
                  ? "bg-emerald-600 border-emerald-600 text-white"
                  : "bg-[#181818] border-[#3a3a3a] text-gray-300 hover:bg-[#222]"
              }`}
              >
                {b.label}
              </button>
            ))}
          </div>

          {/* MODO: 1 día libre o más (multi selección simple) */}
          {esModo1Dia && (
            <div className="space-y-2 pt-1">
              <p className="text-xs text-gray-400">
                Elegí 1 o más días que este empleado tendrá libre.
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {DIAS_LABELS.map((dia) => {
                  const key = normalizarDiaKey(dia);
                  const activo = diasSeleccionados.includes(key);

                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => toggleDiaExtraEmpleado(index, dia)}
                      className={`px-3 py-1.5 rounded-lg border text-xs transition
                    ${
                      activo
                        ? "bg-emerald-600 border-emerald-600 text-white"
                        : "bg-[#181818] border-[#3a3a3a] text-gray-200 hover:bg-[#222]"
                    }`}
                    >
                      {dia}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* MODO: 1 día libre y medio (2 pasos) */}
          {esModoDiaYMedio && (
            <div className="space-y-3 pt-1">
              {/* Paso 1: día libre completo */}
              <div className="space-y-2">
                <p className="text-xs text-gray-400">
                  <span className="font-semibold text-gray-200">Paso 1:</span>{" "}
                  elegí el día libre completo de este empleado.
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {DIAS_LABELS.map((dia) => {
                    const key = normalizarDiaKey(dia);
                    const activo = diaLibreKey === key;

                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => handleSeleccionDiaLibre(dia)}
                        className={`px-3 py-1.5 rounded-lg border text-xs transition
                      ${
                        activo
                          ? "bg-emerald-600 border-emerald-600 text-white"
                          : "bg-[#181818] border-[#3a3a3a] text-gray-200 hover:bg-[#222]"
                      }`}
                      >
                        {dia}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Paso 2: día donde hace solo 4 horas (pegado al libre) */}
              {diaLibreKey && opcionesMedioDia.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-gray-400">
                    <span className="font-semibold text-gray-200">Paso 2:</span>{" "}
                    ¿qué día hará solo 4 horas?
                    <span className="block text-[11px] text-gray-500">
                      Debe ser el día anterior o el siguiente al día libre.
                    </span>
                  </p>

                  <div className="grid grid-cols-2 gap-2">
                    {opcionesMedioDia.map((opt) => {
                      const activo = diaMedioKey === opt.key;

                      // Texto pequeño que describe mañana/tarde según sea antes/después
                      const extraTexto =
                        opt.tipo === "antes"
                          ? " (4h en la mañana)"
                          : " (4h en la tarde)";

                      return (
                        <button
                          key={opt.key}
                          type="button"
                          onClick={() => handleSeleccionDiaMedio(opt.key)}
                          className={`px-3 py-1.5 rounded-lg border text-xs transition text-left
                        ${
                          activo
                            ? "bg-emerald-600 border-emerald-600 text-white"
                            : "bg-[#181818] border-[#3a3a3a] text-gray-200 hover:bg-[#222]"
                        }`}
                        >
                          {opt.label}
                          <span className="block text-[10px] opacity-80">
                            {extraTexto}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Resumen visual (opcional) */}
              {diaLibreKey && diaMedioKey && resumenMedioDia && (
                <div className="text-[11px] text-emerald-300 bg-[#102019] border border-emerald-700/40 rounded-md px-3 py-2">
                  Día libre completo:{" "}
                  <span className="font-semibold">
                    {labelDesdeKey(diaLibreKey)}
                  </span>
                  <br />
                  Día de medio turno:{" "}
                  <span className="font-semibold">
                    {labelDesdeKey(diaMedioKey)}
                  </span>
                  <br />
                  {resumenMedioDia}
                </div>
              )}
            </div>
          )}
        </div>
      );
    };

    // =============== CARD DEL CREADOR ===============
    if (esCreador) {
      return (
        <div className="rounded-xl border border-[#3a3a3a] bg-[#151515] p-4 space-y-4">
          <p className="font-semibold text-gray-100">Vos (creador de la agenda)</p>

          {/* Pregunta si trabaja */}
          <div className="space-y-2">
            <p className="text-xs text-gray-300">¿Usted trabaja aquí?</p>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleEmpleadoChange(index, "esEmpleado", true)}
                className={`px-3 py-2 rounded-lg border text-xs transition
                ${
                  e.esEmpleado
                    ? "bg-emerald-600 border-emerald-600 text-white"
                    : "bg-[#181818] border-[#3a3a3a] text-gray-300 hover:bg-[#222]"
                }`}
              >
                Sí, trabajo aquí
              </button>

              <button
                type="button"
                onClick={() => handleEmpleadoChange(index, "esEmpleado", false)}
                className={`px-3 py-2 rounded-lg border text-xs transition
                ${
                  !e.esEmpleado
                    ? "bg-emerald-600 border-emerald-600 text-white"
                    : "bg-[#181818] border-[#3a3a3a] text-gray-300 hover:bg-[#222]"
                }`}
              >
                No, solo administro
              </button>
            </div>
          </div>

          {/* Si NO trabaja → no mostrar más */}
          {!e.esEmpleado && (
            <div className="text-xs text-gray-400 bg-[#1c1c1c] border border-[#333] rounded-lg p-3">
              No configurará turnos porque solo administra la agenda.
            </div>
          )}

          {/* Si SÍ trabaja → mostrar todo */}
          {e.esEmpleado && (
            <div className="space-y-4">
              {/* FOTO */}
              <div>
                <label className="block text-xs mb-1 text-gray-300">
                  Foto de perfil (opcional)
                </label>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#222] flex items-center justify-center text-xs text-gray-300 overflow-hidden">
                    {e.fotoPerfil ? (
                      <img src={e.fotoPerfil} className="w-full h-full object-cover" />
                    ) : (
                      <span>
                        {e.nombre ? e.nombre.charAt(0).toUpperCase() : "?"}
                      </span>
                    )}
                  </div>

                  <label className="px-3 py-1.5 text-xs rounded-md bg-[#222] hover:bg-[#2d2d2d] cursor-pointer text-gray-100">
                    {e.subiendoFoto ? "Subiendo..." : "Subir foto"}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(ev) => {
                        const file = ev.target.files?.[0];
                        if (file) handleSubirFotoEmpleado(index, file);
                      }}
                    />
                  </label>
                </div>
              </div>

              {/* NOMBRE */}
              <div>
                <label className="block text-xs mb-1 text-gray-300">
                  Nombre completo
                </label>
                <input
                  type="text"
                  value={e.nombre}
                  onChange={(ev) =>
                    handleEmpleadoChange(index, "nombre", ev.target.value)
                  }
                  className="w-full px-3 py-2 bg-[#181818] border border-[#3a3a3a] rounded-md text-white"
                  placeholder="Ej: Juan Pérez"
                />
              </div>

              {/* SERVICIOS */}
              {serviciosValidos.length > 0 && (
                <div>
                  <label className="block text-xs mb-1 text-gray-300">
                    Servicios que realiza
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {serviciosValidos.map((s, idx) => {
                      const seleccionado = e.trabajos.includes(s.nombre);
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => toggleTrabajoEmpleado(index, s.nombre)}
                          className={`px-3 py-1.5 rounded-full border text-xs transition
                          ${
                            seleccionado
                              ? "bg-emerald-600 border-emerald-600 text-white"
                              : "bg-[#181818] border-[#3a3a3a] text-gray-200 hover:bg-[#222]"
                          }`}
                        >
                          {s.nombre}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* HORARIO */}
              <div className="space-y-2">
                <label className="block text-xs mb-1 text-gray-300">
                  Horario de este empleado
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-1">
                  <div>
                    <label className="block text-xs mb-1 text-gray-300">
                      Hora de entrada
                    </label>
                    <input
                      type="time"
                      value={e.horarioInicio}
                      onChange={(ev) =>
                        handleEmpleadoChange(index, "horarioInicio", ev.target.value)
                      }
                      className="w-full px-3 py-2 bg-[#181818] border border-[#3a3a3a] rounded-md text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs mb-1 text-gray-300">
                      Hora de salida
                    </label>
                    <input
                      type="time"
                      value={e.horarioFin}
                      onChange={(ev) =>
                        handleEmpleadoChange(index, "horarioFin", ev.target.value)
                      }
                      className="w-full px-3 py-2 bg-[#181818] border border-[#3a3a3a] rounded-md text-white"
                    />
                  </div>
                </div>
              </div>

              {/* DESCANSO */}
              <BloqueDescanso />
            </div>
          )}
        </div>
      );
    }

    // =============== CARD EMPLEADO NORMAL ===============
    return (
      <div className="rounded-xl border border-[#3a3a3a] bg-[#151515] p-4 space-y-4">
        {/* HEADER */}
        <div className="flex justify-between items-center">
          <p className="font-semibold text-gray-100">Empleado {index}</p>

          <button
            type="button"
            onClick={() => handleEliminarEmpleado(index)}
            className="text-xs px-2 py-1 rounded-md bg-red-600 text-white hover:bg-red-700"
          >
            Eliminar
          </button>
        </div>

        {/* FOTO */}
        <div>
          <label className="block text-xs mb-1 text-gray-300">
            Foto de perfil (opcional)
          </label>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#222] flex items-center justify-center text-xs text-gray-300 overflow-hidden">
              {e.fotoPerfil ? (
                <img src={e.fotoPerfil} className="w-full h-full object-cover" />
              ) : (
                <span>
                  {e.nombre ? e.nombre.charAt(0).toUpperCase() : "?"}
                </span>
              )}
            </div>

            <label className="px-3 py-1.5 text-xs rounded-md bg-[#222] hover:bg-[#2d2d2d] cursor-pointer text-gray-100">
              {e.subiendoFoto ? "Subiendo..." : "Subir foto"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(ev) => {
                  const file = ev.target.files?.[0];
                  if (file) handleSubirFotoEmpleado(index, file);
                }}
              />
            </label>
          </div>
        </div>

        {/* NOMBRE */}
        <div>
          <label className="block text-xs mb-1 text-gray-300">
            Nombre completo
          </label>
          <input
            type="text"
            value={e.nombre}
            onChange={(ev) =>
              handleEmpleadoChange(index, "nombre", ev.target.value)
            }
            className="w-full px-3 py-2 bg-[#181818] border border-[#3a3a3a] rounded-md text-white"
            placeholder="Ej: Juan Pérez"
          />
        </div>

        {/* SERVICIOS */}
        {serviciosValidos.length > 0 && (
          <div>
            <label className="block text-xs mb-1 text-gray-300">
              Servicios que realiza
            </label>
            <div className="flex flex-wrap gap-2">
              {serviciosValidos.map((s, idx) => {
                const seleccionado = e.trabajos.includes(s.nombre);
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => toggleTrabajoEmpleado(index, s.nombre)}
                    className={`px-3 py-1.5 rounded-full border text-xs transition
                    ${
                      seleccionado
                        ? "bg-emerald-600 border-emerald-600 text-white"
                        : "bg-[#181818] border-[#3a3a3a] text-gray-200 hover:bg-[#222]"
                    }`}
                  >
                    {s.nombre}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* HORARIO */}
        <div className="space-y-2">
          <label className="block text-xs mb-1 text-gray-300">
            Horario de este empleado
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-1">
            <div>
              <label className="block text-xs mb-1 text-gray-300">
                Hora de entrada
              </label>
              <input
                type="time"
                value={e.horarioInicio}
                onChange={(ev) =>
                  handleEmpleadoChange(index, "horarioInicio", ev.target.value)
                }
                className="w-full px-3 py-2 bg-[#181818] border border-[#3a3a3a] rounded-md text-white"
              />
            </div>

            <div>
              <label className="block text-xs mb-1 text-gray-300">
                Hora de salida
              </label>
              <input
                type="time"
                value={e.horarioFin}
                onChange={(ev) =>
                  handleEmpleadoChange(index, "horarioFin", ev.target.value)
                }
                className="w-full px-3 py-2 bg-[#181818] border border-[#3a3a3a] rounded-md text-white"
              />
            </div>
          </div>
        </div>

        {/* DESCANSO */}
        <BloqueDescanso />
      </div>
    );
  };

  // 🔥 PASO 3 SOLO PARA NEGOCIO: Ubicación sin branding
  const renderPasoUbicacionNegocioSolo = () => {
    return (
      <div className="space-y-6 text-sm text-gray-100">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-gray-100">
            Ubicación de tu negocio
          </h2>
          <p className="text-xs text-gray-400">
            Esta dirección se mostrará a tus clientes. Podés ajustar el pin en el mapa.
          </p>
        </div>

        {/* Contenedor */}
        <div className="rounded-2xl border border-[#3a3a3a] bg-[#151515] p-4 space-y-3">
          {/* Estado actual */}
          {ubicacion ? (
            <div className="text-xs text-gray-300">
              <p className="font-semibold mb-1">Ubicación guardada</p>
              <p className="text-gray-200">
                {direccion || ubicacion.direccion}
              </p>
              <p className="text-[11px] text-gray-500 mt-1">
                Podés mover el pin en el mapa si querés ajustarla.
              </p>
            </div>
          ) : (
            <p className="text-xs text-gray-400">
              Todavía no guardaste una ubicación.
            </p>
          )}

          {/* 🔍 Botón geolocalizar */}
          <button
            type="button"
            onClick={handleGeolocalizar}
            disabled={estadoUbicacion === "cargando"}
            className={`mt-2 px-4 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2
            ${
              estadoUbicacion === "cargando"
                ? "bg-[#181818] border border-[#3a3a3a] text-gray-300 cursor-not-allowed"
                : "bg-emerald-600 hover:bg-emerald-700 text-white"
            }`}
          >
            {estadoUbicacion === "cargando" && "Buscando ubicación..."}
            {estadoUbicacion === "exito" && "✅ Ubicación guardada"}
            {estadoUbicacion === "idle" && "📍 Usar mi ubicación actual"}
          </button>

          {/* 🗺️ Mapa */}
          {ubicacion && (
            <div className="mt-3 h-52 rounded-md overflow-hidden border border-[#333]">
              <MapContainer
                key={`${ubicacion.lat}-${ubicacion.lng}`}
                center={[ubicacion.lat, ubicacion.lng]}
                zoom={16}
                style={{ width: "100%", height: "100%" }}
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; OpenStreetMap contributors'
                />
                <Marker
                  position={[ubicacion.lat, ubicacion.lng]}
                  icon={customIcon}
                  draggable={true}
                  eventHandlers={{
                    dragend: handleMarkerDragEnd,
                  }}
                >
                  <Popup>
                    Mueve el pin si la ubicación no es correcta
                  </Popup>
                </Marker>
              </MapContainer>
            </div>
          )}

          {/* Dirección manual */}
          <div className="space-y-2 pt-2">
            <label className="block text-xs mb-1 text-gray-300">
              Dirección o referencia
            </label>
            <input
              type="text"
              value={direccion}
              onChange={(e) => setDireccion(e.target.value)}
              className="w-full px-3 py-2 bg-[#181818] border border-[#3a3a3a] rounded-md text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="Ej: Av. 18 de Julio 1234, Centro"
            />
          </div>
        </div>

        <hr className="border-[#333]" />

        <div className="flex justify-between items-center gap-3">
          <button
            type="button"
            onClick={() => setPaso(2)}
            className="px-4 py-2 rounded-lg bg-[#222] text-gray-200 hover:bg-[#2d2d2d]"
          >
            Volver
          </button>

          <button
            type="button"
            onClick={() => setPaso(4)}
            className="px-6 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 font-medium"
          >
            Siguiente
          </button>
        </div>
      </div>
    );
  };

  // ==================== CONTENIDOS POR PASO ====================
  const renderPasoServicios = () => {
    const titulo = esNegocio
      ? "Servicios de tu negocio"
      : "¿Qué servicios ofrecés?";
    const subtitulo = esNegocio
      ? "Agregá al menos un servicio para que tus clientes puedan reservar turnos."
      : "Contale a tus clientes qué podés hacer por ellos. Después podés editar todo desde el panel.";

    return (
      <div className="space-y-6 text-sm text-gray-100">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-gray-100">{titulo}</h2>
          <p className="text-xs text-gray-400">{subtitulo}</p>
        </div>

        <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-1">
          {servicios.map((s, i) => {
            const idxActual =
              DURACIONES.indexOf(s.duracion) === -1
                ? DURACIONES.indexOf(30)
                : DURACIONES.indexOf(s.duracion);
            const indexDuracion = Math.max(0, idxActual);

            return (
              <div
                key={i}
                className="rounded-xl border border-[#3a3a3a] bg-[#151515] p-4 space-y-3"
              >
                <div className="flex justify-between items-center gap-2">
                  <p className="font-semibold text-gray-100">
                    Servicio {i + 1}
                  </p>
                  {servicios.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleEliminarServicio(i)}
                      className="text-xs px-2 py-1 rounded-md bg-red-600 text-white hover:bg-red-700"
                    >
                      Eliminar
                    </button>
                  )}
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs mb-1 text-gray-300">
                      Nombre del servicio
                    </label>
                    <input
                      type="text"
                      value={s.nombre}
                      onChange={(e) =>
                        handleServicioChange(i, "nombre", e.target.value)
                      }
                      className="w-full px-3 py-2 bg-[#181818] border border-[#3a3a3a] rounded-md text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="Ej: Corte de cabello"
                    />
                  </div>

                  <div>
                    <label className="block text-xs mb-1 text-gray-300">
                      Precio (opcional)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={s.precio}
                      onChange={(e) =>
                        handleServicioChange(i, "precio", e.target.value)
                      }
                      className="w-full px-3 py-2 bg-[#181818] border border-[#3a3a3a] rounded-md text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="Ej: 500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs mb-1 text-gray-300">
                      Duración aproximada
                    </label>
                    <input
                      type="range"
                      min={0}
                      max={DURACIONES.length - 1}
                      step={1}
                      value={indexDuracion}
                      onChange={(e) => {
                        const idx = Number(e.target.value);
                        const nuevaDuracion = DURACIONES[idx] ?? 30;
                        handleServicioChange(i, "duracion", nuevaDuracion);
                      }}
                      className="w-full accent-emerald-500"
                    />
                    <p className="text-gray-200 text-xs font-medium mt-1">
                      {formatearDuracion(DURACIONES[indexDuracion] ?? 30)}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div>
          <button
            type="button"
            onClick={handleAgregarServicio}
            className="px-4 py-2 rounded-lg bg-[#222] text-white hover:bg-[#2d2d2d] font-medium"
          >
            + Añadir otro servicio
          </button>
        </div>

        <hr className="border-[#333]" />

        <div className="flex justify-end items-center gap-3">
          <button
            type="button"
            onClick={() => {
              if (serviciosValidos.length === 0) {
                alert("Agregá al menos un servicio para continuar.");
                return;
              }
              setPaso(2);
            }}
            className="px-6 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 font-medium"
          >
            Siguiente
          </button>
        </div>
      </div>
    );
  };

  const renderPasoEmpleados = () => {
    const creador = empleados[0];
    const creadorNoTrabaja = creador && creador.esEmpleado === false;

    const empleadosReales = empleados.filter((e, idx) => idx !== 0 && e.esEmpleado);

    return (
      <div className="space-y-6 text-sm text-gray-100">
        {/* TÍTULO */}
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-gray-100">
            ¿Quiénes van a atender en este negocio?
          </h2>

          {!creadorNoTrabaja ? (
            <p className="text-xs text-gray-400">
              Configurá tus empleados, sus horarios y sus días libres. Después
              podés cambiar todo desde el panel.
            </p>
          ) : (
            <p className="text-xs text-gray-400">
              Usted indicó que solo administra la agenda. Agregue al menos un
              empleado que atienda clientes.
            </p>
          )}
        </div>

        {/* ADVERTENCIA SI NO HAY SERVICIOS */}
        {serviciosValidos.length === 0 && (
          <div className="rounded-lg border border-yellow-600/70 bg-yellow-900/30 px-4 py-3 text-xs text-yellow-100">
            Primero agregá al menos un servicio en el paso anterior para poder
            asignarlo a tus empleados.
          </div>
        )}

        {/* CARDS DE EMPLEADOS */}
        <div className="space-y-4 max-h-[45vh] overflow-y-auto pr-1">

          {/* CREATOR ALWAYS FIRST */}
          {renderEmpleadoCard(0, true)}

          {/* EMPLEADOS NORMALES */}
          {empleados.map((emp, idx) => {
            if (idx === 0) return null;              // skip creator
            return renderEmpleadoCard(idx, false);
          })}
        </div>

        {/* BOTÓN AÑADIR EMPLEADO */}
        <div>
          <button
            type="button"
            onClick={handleAgregarEmpleado}
            className="px-4 py-2 rounded-lg bg-[#222] text-white hover:bg-[#2d2d2d] font-medium"
          >
            + Añadir empleado
          </button>
        </div>

        {/* VALIDACIÓN SI EL CREADOR NO TRABAJA */}
        {creadorNoTrabaja && empleadosReales.length === 0 && (
          <div className="rounded-lg border border-red-700 bg-red-900/30 px-4 py-3 text-xs text-red-200">
            Debe agregar al menos un empleado que atienda clientes para continuar.
          </div>
        )}

        <hr className="border-[#333]" />

        {/* BOTONES SIGUIENTE / VOLVER */}
        <div className="flex justify-between items-center gap-3">
          <button
            type="button"
            onClick={() => setPaso(1)}
            className="px-4 py-2 rounded-lg bg-[#222] text-gray-200 hover:bg-[#2d2d2d]"
          >
            Volver
          </button>

          <button
            type="button"
            onClick={() => {

              // VALIDACIONES
              if (serviciosValidos.length === 0) {
                alert("Agregá al menos un servicio para continuar.");
                return;
              }

              // ❗ Si el creador NO trabaja → debe haber al menos UN empleado real
              if (creadorNoTrabaja && empleadosReales.length === 0) {
                alert("Debe agregar al menos un empleado que atienda clientes.");
                return;
              }

              // ❗ Si el creador trabaja → debe tener servicios asignados
              if (!creadorNoTrabaja) {
                const c = empleados[0];
                if (!c.trabajos || c.trabajos.length === 0) {
                  alert("Debe seleccionar al menos un servicio que usted realiza.");
                  return;
                }
              }

              setPaso(3);
            }}
            className="px-6 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 font-medium"
          >
            Siguiente
          </button>
        </div>
      </div>
    );
  };

  const renderPasoUbicacionEmprendimiento = () => {
    return (
      <div className="space-y-6 text-sm text-gray-100">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-gray-100">
            ¿Dónde atendés a tus clientes?
          </h2>
          <p className="text-xs text-gray-400">
            Podés usar tu ubicación actual o escribir una zona aproximada. Este
            paso es opcional, pero ayuda a que tus clientes te ubiquen mejor.
          </p>
        </div>

        <div className="rounded-2xl border border-[#3a3a3a] bg-[#151515] p-4 space-y-3">
          {ubicacion ? (
            <div className="text-xs text-gray-300">
              <p className="font-semibold mb-1">Ubicación guardada</p>
              <p className="text-gray-200">
                {direccion || ubicacion.direccion}
              </p>
              <p className="text-[11px] text-gray-500 mt-1">
                Si querés, podés ajustar el pin en el mapa.
              </p>
            </div>
          ) : (
            <p className="text-xs text-gray-400">
              Aún no guardaste una ubicación. Podés usar tu ubicación actual o
              solo escribir una referencia.
            </p>
          )}

          {/* 🔍 Botón geolocalizar */}
          <button
            type="button"
            onClick={handleGeolocalizar}
            disabled={estadoUbicacion === "cargando"}
            className={`mt-2 px-4 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2
              ${
                estadoUbicacion === "cargando"
                  ? "bg-[#181818] border border-[#3a3a3a] text-gray-300 cursor-not-allowed"
                  : "bg-emerald-600 hover:bg-emerald-700 text-white"
              }`}
          >
            {estadoUbicacion === "cargando" && "Buscando ubicación..."}
            {estadoUbicacion === "exito" && "✅ Ubicación guardada"}
            {estadoUbicacion === "idle" && "📍 Usar mi ubicación actual"}
          </button>

          {/* 🗺️ Minimapa draggable (como en AgendaVirtualUI) */}
          {ubicacion && (
            <div className="mt-3 h-52 rounded-md overflow-hidden border border-[#333]">
              <MapContainer
                key={`${ubicacion.lat}-${ubicacion.lng}`}
                center={[ubicacion.lat, ubicacion.lng]}
                zoom={16}
                style={{ width: "100%", height: "100%" }}
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; OpenStreetMap contributors'
                />
                <Marker
                  position={[ubicacion.lat, ubicacion.lng]}
                  icon={customIcon}
                  draggable={true}
                  eventHandlers={{
                    dragend: handleMarkerDragEnd,
                  }}
                >
                  <Popup>
                    Mueve el pin si la ubicación no es correcta
                  </Popup>
                </Marker>
              </MapContainer>
            </div>
          )}

          <div className="space-y-2 pt-2">
            <label className="block text-xs mb-1 text-gray-300">
              Dirección o zona (opcional)
            </label>
            <input
              type="text"
              value={direccion}
              onChange={(e) => setDireccion(e.target.value)}
              className="w-full px-3 py-2 bg-[#181818] border border-[#3a3a3a] rounded-md text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="Ej: Centro de Montevideo, a domicilio"
            />
          </div>
        </div>

        <hr className="border-[#333]" />

        <div className="flex justify-between items-center gap-3">
          <button
            type="button"
            onClick={() => setPaso(1)}
            className="px-4 py-2 rounded-lg bg-[#222] text-gray-200 hover:bg-[#2d2d2d]"
          >
            Volver
          </button>

          <button
            type="button"
            onClick={() => setPaso(3)}
            className="px-6 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 font-medium"
          >
            Siguiente
          </button>
        </div>
      </div>
    );
  };

  const renderPasoUbicacionYBranding = () => {
    const textoUbicacionObligatoria =
      "La dirección ayuda a que tus clientes sepan dónde está tu local. Podés ajustarla después.";

    return (
      <div className="space-y-6 text-sm text-gray-100">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-gray-100">
            Últimos detalles de tu agenda
          </h2>
          <p className="text-xs text-gray-400">
            Completá algunos datos para que tu agenda se vea más profesional.
          </p>
        </div>

        {/* Branding / foto / descripción / redes */}
        <div className="rounded-2xl border border-[#3a3a3a] bg-[#151515] p-4 space-y-4">
          <p className="font-semibold text-gray-100">
            Cómo se ve tu agenda desde afuera
          </p>

          {/* Logo / foto negocio */}
          <div className="space-y-2">
            <label className="block text-xs mb-1 text-gray-300">
              Foto de perfil o logo del negocio (opcional)
            </label>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-[#222] flex items-center justify-center text-xs text-gray-300 overflow-hidden">
                {logoNegocio ? (
                  <img
                    src={logoNegocio}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span>
                    {nombreNegocio
                      ? nombreNegocio.charAt(0).toUpperCase()
                      : "AO"}
                  </span>
                )}
              </div>

              <label className="px-3 py-1.5 text-xs rounded-md bg-[#222] hover:bg-[#2d2d2d] cursor-pointer text-gray-100">
                {subiendoLogo ? "Subiendo..." : "Subir imagen"}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(ev) => {
                    const file = ev.target.files?.[0];
                    if (file) handleSubirLogoNegocio(file);
                  }}
                />
              </label>
            </div>
            <p className="text-[11px] text-gray-400">
              Se mostrará en las tarjetas de tu agenda y en el perfil público.
            </p>
          </div>

          {/* Descripción */}
          <div className="space-y-1">
            <label className="block text-xs mb-1 text-gray-300">
              Descripción corta (opcional)
            </label>
            <textarea
              rows={3}
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              className="w-full px-3 py-2 bg-[#181818] border border-[#3a3a3a] rounded-md text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
              placeholder="Ej: Barbería especializada en fades y diseños. Atendemos con reserva previa."
            />
            <p className="text-[11px] text-gray-400">
              Esto se muestra cuando un cliente entra a tu agenda. Máximo 200
              caracteres recomendado.
            </p>
          </div>

          {/* Redes sociales */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-300">
              Redes sociales (opcional)
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] mb-1 text-gray-400">
                  Instagram
                </label>
                <input
                  type="text"
                  value={instagram}
                  onChange={(e) => setInstagram(e.target.value)}
                  className="w-full px-3 py-2 bg-[#181818] border border-[#3a3a3a] rounded-md text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="@mi_negocio"
                />
              </div>
              <div>
                <label className="block text-[11px] mb-1 text-gray-400">
                  Facebook
                </label>
                <input
                  type="text"
                  value={facebook}
                  onChange={(e) => setFacebook(e.target.value)}
                  className="w-full px-3 py-2 bg-[#181818] border border-[#3a3a3a] rounded-md text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="fb.com/mi_negocio"
                />
              </div>
              <div>
                <label className="block text-[11px] mb-1 text-gray-400">
                  TikTok
                </label>
                <input
                  type="text"
                  value={tiktok}
                  onChange={(e) => setTiktok(e.target.value)}
                  className="w-full px-3 py-2 bg-[#181818] border border-[#3a3a3a] rounded-md text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="@mi_negocio"
                />
              </div>
              <div>
                <label className="block text-[11px] mb-1 text-gray-400">
                  WhatsApp (link o número)
                </label>
                <input
                  type="text"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  className="w-full px-3 py-2 bg-[#181818] border border-[#3a3a3a] rounded-md text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="Ej: +598..."
                />
              </div>
            </div>
          </div>
        </div>

        <hr className="border-[#333]" />

        <div className="flex justify-between items-center gap-3">
          <button
            type="button"
            onClick={() => setPaso(2)}
            className="px-4 py-2 rounded-lg bg-[#222] text-gray-200 hover:bg-[#2d2d2d]"
          >
            Volver
          </button>

          <button
            type="button"
            onClick={handleGuardarYTerminar}
            disabled={guardando}
            className={`px-6 py-2 rounded-lg font-medium text-white transition
              ${
                guardando
                  ? "bg-gray-500 cursor-not-allowed"
                  : "bg-emerald-600 hover:bg-emerald-700"
              }`}
          >
            {guardando ? "Guardando..." : "Guardar y terminar"}
          </button>
        </div>
      </div>
    );
  };

  // ==================== RENDER PRINCIPAL MODAL ====================
  return (
    <ModalBase
      abierto={abierto}
      onClose={onClose}
      titulo="Configura tu agenda"
      maxWidth="max-w-3xl"
    >
      {cargandoNegocio ? (
        <div className="py-10 text-center text-sm text-gray-200">
          Cargando configuración inicial...
        </div>
      ) : (
        <div className="space-y-4">
          {/* Indicador de pasos */}
          <div className="flex items-center justify-between text-xs text-gray-300">
            <span className="inline-flex items-center px-3 py-1 rounded-full bg-[#1b1b1b] border border-[#333]">
              Paso {paso} de {totalPasos}
            </span>
            {nombreNegocio && (
              <span className="truncate max-w-[60%] text-right text-gray-400">
                {nombreNegocio}
              </span>
            )}
          </div>

          {paso === 1 && renderPasoServicios()}

          {esNegocio && paso === 2 && renderPasoEmpleados()}

          {!esNegocio && paso === 2 && renderPasoUbicacionEmprendimiento()}

          {/* PASO 3 */}
          {paso === 3 && (
            esNegocio
              ? renderPasoUbicacionNegocioSolo()   // negocio → paso 3 es ubicación
              : renderPasoUbicacionYBranding()     // emprendimiento → paso 3 es branding
          )}

          {/* PASO 4 SOLO PARA NEGOCIO */}
          {paso === 4 && esNegocio && renderPasoUbicacionYBranding()}
        </div>
      )}
    </ModalBase>
  );
}
