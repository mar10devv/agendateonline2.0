// src/components/barberia/AgendarTurno.tsx
import React, { useState, useEffect } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Thumbs } from "swiper/modules";
import type { Swiper as SwiperType } from "swiper";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/thumbs";
import ArrowLeft from "../../assets/arrow-left.svg?url";
import ArrowRight from "../../assets/arrow-right.svg?url";
import { useFechasAgenda } from "../../lib/useFechasAgenda";
import Calendario from "../Calendario";

// 🔹 Firebase
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { db } from "../../lib/firebase";
import {
  collection,
  addDoc,
  query,
  where,
  onSnapshot,
  getDocs,
  doc,
  setDoc,
} from "firebase/firestore";

type CalendarioEmpleado = {
  inicio: string;
  fin: string;
  diasLibres: string[];
  horariosOcupados?: string[];
};

type Empleado = {
  nombre: string;
  fotoPerfil: string;
  trabajos?: string[];
  calendario?: CalendarioEmpleado | null;
};

type Props = {
  fuenteTexto?: string;
  fuenteBotones?: string;
  empleados: Empleado[];
  negocioId: string;
};

export default function AgendarTurno({
  fuenteTexto = "raleway",
  fuenteBotones = "poppins",
  empleados = [],
  negocioId,
}: Props) {
  const [mostrarBarberos, setMostrarBarberos] = useState(false);
  const [barberoSeleccionado, setBarberoSeleccionado] =
    useState<Empleado | null>(null);
  const [thumbsSwiper, setThumbsSwiper] = useState<SwiperType | null>(null);
  const [scrollHint, setScrollHint] = useState<"left" | "right" | null>(
    "right"
  );
  const [paso, setPaso] = useState<
    "imagenes" | "pregunta" | "precios" | "fecha" | "horarios"
  >("imagenes");

  const [conAmigos, setConAmigos] = useState<"solo" | "amigos" | null>(null);
  const [cantidadAmigos, setCantidadAmigos] = useState<number>(1);
  const [usuarioActual, setUsuarioActual] = useState<number>(1);
  const [serviciosGrupo, setServiciosGrupo] = useState<
    { servicio: string; precio: number }[]
  >([]);
  const [servicioSeleccionado, setServicioSeleccionado] = useState<
    { servicio: string; precio: number } | null
  >(null);

  const [fechaSeleccionada, setFechaSeleccionada] = useState<string | null>(
    null
  );
  const [horarioSeleccionado, setHorarioSeleccionado] = useState<string | null>(null);

  const [horariosOcupados, setHorariosOcupados] = useState<string[]>([]);
  const [turnoActivo, setTurnoActivo] = useState<any>(null);
  const [estadoTurno, setEstadoTurno] = useState<
    "inicial" | "exito" | "ver" | "error"
  >("inicial");

  const [serviciosDisponibles, setServiciosDisponibles] = useState<
    { servicio: string; precio: number }[]
  >([]);

  // 🔎 Filtramos imágenes válidas
  const trabajosValidos =
    barberoSeleccionado?.trabajos?.filter((t) => t && t.trim() !== "") || [];

  // Generar horarios disponibles
  const generarHorarios = () => {
    const horarios: string[] = [];
    let hora = 10;
    let minuto = 30;
    while (hora < 21 || (hora === 21 && minuto <= 30)) {
      const h = hora.toString().padStart(2, "0");
      const m = minuto.toString().padStart(2, "0");
      horarios.push(`${h}:${m}`);
      hora++;
      minuto = 30;
    }
    return horarios;
  };
  const horariosDisponibles = generarHorarios();

  // ✅ Hook compartido para sincronizar fechas
  const fechas = useFechasAgenda(14);

  // 🔹 Escuchar precios configurados por el negocio
  useEffect(() => {
    if (!negocioId) return;
    const preciosRef = collection(db, "Negocios", negocioId, "Precios");
    const unsub = onSnapshot(preciosRef, (snapshot) => {
      const data = snapshot.docs.map(
        (doc) => doc.data() as { servicio: string; precio: number }
      );
      setServiciosDisponibles(data);
    });
    return () => unsub();
  }, [negocioId]);

  // 🔎 Escuchar si el usuario ya tiene un turno en este negocio
  useEffect(() => {
    const auth = getAuth();
    const unsubAuth = onAuthStateChanged(auth, (usuario) => {
      if (usuario && negocioId) {
        const q = query(
          collection(db, "Negocios", negocioId, "Turnos"),
          where("uidCliente", "==", usuario.email)
        );
        const unsubTurnos = onSnapshot(q, (snap) => {
          if (!snap.empty) {
            setTurnoActivo({ id: snap.docs[0].id, ...snap.docs[0].data() });
          } else {
            setTurnoActivo(null);
          }
        });
        return () => unsubTurnos();
      } else {
        setTurnoActivo(null);
      }
    });
    return () => unsubAuth();
  }, [negocioId]);

  useEffect(() => {
  if (!barberoSeleccionado || !fechaSeleccionada) return;
  const q = query(
    collection(db, "Negocios", negocioId, "Turnos"),
    where("barbero", "==", barberoSeleccionado.nombre),
    where("fecha", "==", fechaSeleccionada)
  );
  const unsub = onSnapshot(q, (snap) => {
    const ocupados = snap.docs.map((d) => {
      const hora = d.data().hora as string;
      return hora.slice(0, 5); // normalizamos formato "HH:mm"
    });
    setHorariosOcupados(ocupados);
  });
  return () => unsub();
}, [barberoSeleccionado, fechaSeleccionada, negocioId]);


  // 🔹 Guardar turno → ahora guarda múltiples turnos si hay amigos
  const guardarTurno = async () => {
    if (!barberoSeleccionado || !fechaSeleccionada || !horarioSeleccionado) {
      alert("Completa todos los campos antes de confirmar el turno.");
      return;
    }
    try {
      const auth = getAuth();
      const usuario = auth.currentUser;
      if (!usuario) {
        alert("Debes iniciar sesión con Google para reservar un turno.");
        return;
      }

      // Convertir hora inicial en objeto Date
      const [h, m] = horarioSeleccionado.split(":").map(Number);
      const [year, month, day] = fechaSeleccionada.split("-").map(Number);
      const fechaHoraBase = new Date(year, month - 1, day, h, m);

      for (let i = 0; i < cantidadAmigos; i++) {
        const servicio = serviciosGrupo[i] || serviciosGrupo[0];

        const fechaTurno = new Date(fechaHoraBase);
        fechaTurno.setMinutes(fechaHoraBase.getMinutes() + i * 30);

        const horaTurno = fechaTurno.toTimeString().slice(0, 5);
        const fechaStr = fechaTurno.toISOString().split("T")[0];

        // Verificar disponibilidad
        const q = query(
          collection(db, "Negocios", negocioId, "Turnos"),
          where("barbero", "==", barberoSeleccionado.nombre),
          where("fecha", "==", fechaStr),
          where("hora", "==", horaTurno)
        );
        const snap = await getDocs(q);
        if (!snap.empty) {
          alert(
            `El horario ${horaTurno} ya está ocupado. Selecciona otro rango.`
          );
          return;
        }

        // Guardar turno en negocio
        const turnoRef = await addDoc(
          collection(db, "Negocios", negocioId, "Turnos"),
          {
            barbero: barberoSeleccionado.nombre,
            servicio: servicio.servicio,
            precio: servicio.precio,
            fecha: fechaStr,
            hora: horaTurno,
            cliente: usuario.displayName || "Cliente",
            email: usuario.email || "",
            uidCliente: usuario.email || "",
            estado: "pendiente",
            creadoEn: new Date(),
          }
        );

        // Guardar copia en usuario
        await setDoc(
          doc(db, "Usuarios", usuario.uid, "Turnos", turnoRef.id),
          {
            negocioId,
            negocioNombre: "BarberStyle",
            barbero: barberoSeleccionado.nombre,
            servicio: servicio.servicio,
            precio: servicio.precio,
            fecha: fechaStr,
            hora: horaTurno,
            estado: "pendiente",
            creadoEn: new Date(),
          }
        );
      }

      // Reset después de agendar
      setEstadoTurno("exito");
      setPaso("imagenes");
      setServicioSeleccionado(null);
      setServiciosGrupo([]);
      setFechaSeleccionada(null);
      setHorarioSeleccionado(null);
      setBarberoSeleccionado(null);
      setMostrarBarberos(false);
      setUsuarioActual(1);
      setConAmigos(null);
    } catch (e: any) {
      console.error("Error al guardar turno:", e);
      setEstadoTurno("error");
    }
  };

  // 👇 Verificar turno activo vigente
  let turnoActivoVigente = false;
  if (turnoActivo?.fecha && turnoActivo?.hora) {
    const [year, month, day] = turnoActivo.fecha.split("-").map(Number);
    const [hours, minutes] = turnoActivo.hora.split(":").map(Number);
    const fechaHoraTurno = new Date(year, month - 1, day, hours, minutes);
    turnoActivoVigente = fechaHoraTurno.getTime() >= Date.now();
  }

  return (
    <section
      className={`py-20 px-6 md:px-12 lg:px-24 bg-gray-50 text-center ${fuenteTexto}`}
      style={{ minHeight: "400px" }}
    >
      {/* Vista inicial */}
{!mostrarBarberos && !barberoSeleccionado && (
  <>
    {estadoTurno === "exito" ? (
      <div className="flex flex-col items-center justify-center gap-4">
        <p className="mb-4 text-green-600 font-semibold text-lg">
          ✅ Tu turno fue agendado con éxito
        </p>
        <a
          href="/agenda-usuario"
          className={`px-8 py-3 rounded-lg transition bg-green-600 text-white hover:bg-green-700 ${fuenteBotones}`}
        >
          Ver mi turno
        </a>
      </div>
    ) : (
      <>
        <h2 className="text-5xl font-bold mb-6 font-euphoria">
          Reserva turno con tu barbero favorito
        </h2>

        {estadoTurno === "error" && (
          <p className="mb-4 text-red-600 font-semibold">
            ❌ Hubo un error al agendar el turno
          </p>
        )}

        {turnoActivo && turnoActivoVigente ? (
          <a
            href="/agenda-usuario"
            className={`px-8 py-3 rounded-lg transition bg-green-600 text-white hover:bg-green-700 ${fuenteBotones}`}
          >
            Ver mi turno
          </a>
        ) : (
          <button
            onClick={() => setMostrarBarberos(true)}
            className={`px-8 mt-10 py-3 rounded-lg transition bg-black text-white hover:bg-gray-800 ${fuenteBotones}`}
          >
            Agendar turno
          </button>
        )}
      </>
    )}
  </>
)}


      {/* Lista de barberos */}
      {mostrarBarberos && !barberoSeleccionado && (
        <div>
          <h2 className="text-5xl font-bold font-euphoria mb-10">Elige tu barbero</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {empleados.map((empleado, i) => (
              <div
                key={i}
                className={`bg-white rounded-xl shadow p-6 flex flex-col items-center ${fuenteTexto}`}
              >
                <img
                  src={empleado.fotoPerfil || "/img/default-user.jpg"}
                  alt={empleado.nombre}
                  className="w-32 h-32 object-cover rounded-full mb-4"
                />
                <h3 className="text-lg font-semibold">{empleado.nombre}</h3>
                <button
                  onClick={() => {
                    setBarberoSeleccionado(empleado);
                    setPaso("imagenes");
                  }}
                  className={`mt-4 px-4 py-2 rounded-lg transition bg-black text-white hover:bg-gray-800 ${fuenteBotones}`}
                >
                  Seleccionar
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Flujo pasos */}
{barberoSeleccionado && (
  <div className="mt-12 flex flex-col items-center w-full">
    {/* 👇 Eliminamos {renderBarra()} */}

          {/* Paso imágenes */}
{paso === "imagenes" && (
  <div className="w-full flex flex-col items-center justify-center min-h-[500px] px-6">
    {/* Título centrado */}
    <h2 className="text-2xl md:text-5xl font-bold font-euphoria mb-8 text-gray-800 text-center">
      Trabajos hechos por {barberoSeleccionado?.nombre}
    </h2>

    {/* Galería */}
    {trabajosValidos.length > 0 ? (
      <div className="relative w-full max-w-3xl">
        <Swiper
          modules={[Navigation, Thumbs]}
          navigation={{ prevEl: ".custom-prev", nextEl: ".custom-next" }}
          thumbs={{ swiper: thumbsSwiper }}
          className="rounded-xl shadow"
          touchRatio={1}
          simulateTouch={true}
        >
          {trabajosValidos.map((foto, idx) => (
            <SwiperSlide key={idx}>
              <img
                src={foto}
                alt={`Trabajo ${idx + 1}`}
                className="w-full h-[400px] object-cover rounded-xl"
              />
            </SwiperSlide>
          ))}
        </Swiper>

        {/* Botones navegación slider */}
        <button className="custom-prev absolute top-1/2 left-4 transform -translate-y-1/2 z-10 bg-white/70 hover:bg-white rounded-full p-2 shadow">
          <img src={ArrowLeft} alt="Anterior" className="w-6 h-6" />
        </button>
        <button className="custom-next absolute top-1/2 right-4 transform -translate-y-1/2 z-10 bg-white/70 hover:bg-white rounded-full p-2 shadow">
          <img src={ArrowRight} alt="Siguiente" className="w-6 h-6" />
        </button>
      </div>
    ) : (
      <p className="text-gray-600 text-center">
        Este barbero aún no tiene trabajos subidos.
      </p>
    )}

    {/* Botones abajo */}
    <div className="mt-8 flex gap-4">
      <button
        onClick={() => {
          setBarberoSeleccionado(null);
          setThumbsSwiper(null);
          setScrollHint("right");
          setMostrarBarberos(true);
        }}
        className={`px-6 py-3 rounded-lg bg-gray-200 text-gray-800 hover:bg-gray-300 transition ${fuenteBotones}`}
      >
        ← Volver
      </button>
      <button
        onClick={() => setPaso("pregunta")}
        className={`px-6 py-3 rounded-lg bg-black text-white hover:bg-gray-800 transition ${fuenteBotones}`}
      >
        Continuar
      </button>
    </div>
  </div>
)}


          {/* Paso pregunta */}
{paso === "pregunta" && (
  <div className="w-full flex flex-col items-center justify-center min-h-[400px]">
    <p className="text-lg font-medium mb-6">
      ¿Vienes solo o con amigos?
    </p>

    {/* Botones Solo / Con amigos */}
    <div className="flex gap-4 mb-6">
      <button
        onClick={() => {
          setConAmigos("solo");
        }}
        className={`px-4 py-2 rounded-lg transition ${
          conAmigos === "solo"
            ? "bg-black text-white"
            : "bg-gray-200 text-gray-800 hover:bg-gray-300"
        }`}
      >
        Solo
      </button>
      <button
        onClick={() => {
          setConAmigos("amigos");
        }}
        className={`px-4 py-2 rounded-lg transition ${
          conAmigos === "amigos"
            ? "bg-black text-white"
            : "bg-gray-200 text-gray-800 hover:bg-gray-300"
        }`}
      >
        Con amigos
      </button>
    </div>

    {/* Si elige con amigos → selector cantidad */}
    {conAmigos === "amigos" && (
      <div className="flex flex-col items-center gap-4 mb-6">
        <p className="text-gray-700">¿Cuántas personas en total?</p>
        <div className="flex gap-3">
          {[2, 3, 4].map((num) => (
            <button
              key={num}
              onClick={() => setCantidadAmigos(num)}
              className={`px-4 py-2 rounded-lg transition ${
                cantidadAmigos === num
                  ? "bg-black text-white"
                  : "bg-gray-200 text-gray-800 hover:bg-gray-300"
              }`}
            >
              {num}
            </button>
          ))}
        </div>
      </div>
    )}

    {/* Botones navegación */}
    <div className="flex gap-4 mt-4">
      <button
        onClick={() => {
          setBarberoSeleccionado(null);
          setMostrarBarberos(true);
        }}
        className="px-6 py-3 rounded-lg bg-gray-200 text-gray-800 hover:bg-gray-300 transition"
      >
        ← Volver
      </button>
      <button
        onClick={() => {
          if (conAmigos === "solo" || (conAmigos === "amigos" && cantidadAmigos > 1)) {
            setPaso("precios");
          }
        }}
        disabled={
          !conAmigos || (conAmigos === "amigos" && cantidadAmigos < 2)
        }
        className={`px-6 py-3 rounded-lg transition ${
          !conAmigos || (conAmigos === "amigos" && cantidadAmigos < 2)
            ? "bg-gray-300 text-gray-500 cursor-not-allowed"
            : "bg-black text-white hover:bg-gray-800"
        }`}
      >
        Continuar
      </button>
    </div>
  </div>
)}



          {/* Paso precios */}
{paso === "precios" && (
  <div className="w-full p-6 rounded-b-xl flex flex-col items-center justify-center">
    <h3 className="text-xl font-semibold mb-8 text-gray-800 text-center">
      Selecciona un servicio{" "}
      {conAmigos === "amigos" &&
        `(Usuario ${usuarioActual} de ${cantidadAmigos})`}
    </h3>

    {/* Servicios en cuadrícula */}
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-4 w-full mb-8">
      {serviciosDisponibles.length > 0 ? (
        serviciosDisponibles.map((item, i) => (
          <button
            key={i}
            onClick={() => setServicioSeleccionado(item)}
            className={`flex flex-col items-center justify-center rounded-lg shadow-md px-3 py-4 transition border
              ${
                servicioSeleccionado?.servicio === item.servicio
                  ? "bg-black text-white"
                  : "text-gray-800 hover:bg-gray-100 border-gray-200"
              }`}
          >
            <span className="text-base font-medium text-center">
              {item.servicio}
            </span>
            <span className="mt-1 font-semibold text-sm">
              ${item.precio}
            </span>
          </button>
        ))
      ) : (
        <p className="text-gray-600 text-center col-span-3">
          Este negocio aún no tiene servicios configurados.
        </p>
      )}
    </div>

    {/* Botones de navegación → SOLO ESTE BLOQUE */}
    <div className="flex gap-4 mt-4">
      <button
        onClick={() => {
          setPaso("pregunta");
          setServicioSeleccionado(null);
        }}
        className="px-6 py-3 rounded-lg bg-gray-200 text-gray-800 hover:bg-gray-300 transition"
      >
        ← Volver
      </button>

      <button
        disabled={!servicioSeleccionado}
        onClick={() => {
          if (!servicioSeleccionado) return;

          // Guardar servicio en el array
          const nuevos = [...serviciosGrupo];
          nuevos[usuarioActual - 1] = servicioSeleccionado;
          setServiciosGrupo(nuevos);

          if (usuarioActual < cantidadAmigos) {
            // Pasar al siguiente usuario
            setUsuarioActual(usuarioActual + 1);
            setServicioSeleccionado(null);
          } else {
            // Todos seleccionaron → pasar al calendario
            setPaso("fecha");
          }
        }}
        className={`px-6 py-3 rounded-lg transition ${
          servicioSeleccionado
            ? "bg-black text-white hover:bg-gray-800"
            : "bg-gray-300 text-gray-500 cursor-not-allowed"
        }`}
      >
        Continuar
      </button>
    </div>
  </div>
)}
          {/* Paso fecha */}
{paso === "fecha" && barberoSeleccionado && (
  <div className="w-full max-w-3xl p-6 flex flex-col items-center justify-center min-h-[500px]">
    <Calendario
  calendario={barberoSeleccionado.calendario}
  horariosOcupados={horariosOcupados}
  onSeleccionarTurno={(fecha: Date, hora: string | null) => {
    setFechaSeleccionada(fecha.toISOString().split("T")[0]);
    setHorarioSeleccionado(hora); // ahora puede ser string o null
  }}
/>

    <div className="mt-6 text-center w-full">
      {/* Info turno seleccionado */}
      {fechaSeleccionada && horarioSeleccionado && servicioSeleccionado && (
        <p className="mb-4 font-medium">
          Has seleccionado: {servicioSeleccionado.servicio} — $
          {servicioSeleccionado.precio} el {fechaSeleccionada} a las{" "}
          {horarioSeleccionado}
        </p>
      )}

      {/* Botones de navegación */}
      <div className="flex gap-4 justify-center">
        {/* 🔙 Volver siempre disponible → regresa a precios */}
        <button
          onClick={() => {
            setPaso("precios");
            setFechaSeleccionada(null);
            setHorarioSeleccionado(null);
          }}
          className="px-6 py-3 rounded-lg bg-gray-200 text-gray-800 hover:bg-gray-300 transition"
        >
          ← Volver
        </button>

        {/* ✅ Confirmar turno (solo habilitado si eligió servicio + fecha + hora) */}
        <button
          onClick={guardarTurno}
          disabled={!fechaSeleccionada || !horarioSeleccionado || !servicioSeleccionado}
          className={`px-6 py-3 rounded-lg transition ${
            !fechaSeleccionada || !horarioSeleccionado || !servicioSeleccionado
              ? "bg-green-400 text-white cursor-not-allowed opacity-50"
              : "bg-green-600 text-white hover:bg-green-700"
          }`}
        >
          Confirmar turno
        </button>
      </div>
    </div>
  </div>
)}

        </div>
      )}
    </section>
  );
}
