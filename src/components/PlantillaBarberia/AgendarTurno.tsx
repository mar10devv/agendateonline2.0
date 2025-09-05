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

// 🔹 Firebase
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { db } from "../../lib/firebase";
import { collection, addDoc, query, where, onSnapshot, getDocs, doc, setDoc } from "firebase/firestore";

type Empleado = {
  nombre: string;
  fotoPerfil: string;
  trabajos?: string[];
  calendario?: Record<string, any>;
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
  const [barberoSeleccionado, setBarberoSeleccionado] = useState<Empleado | null>(null);
  const [thumbsSwiper, setThumbsSwiper] = useState<SwiperType | null>(null);
  const [scrollHint, setScrollHint] = useState<"left" | "right" | null>("right");
  const [paso, setPaso] = useState<"imagenes" | "pregunta" | "precios" | "fecha" | "horarios">("imagenes");
  const [conAmigos, setConAmigos] = useState<"solo" | "amigos" | null>(null);
  const [cantidadAmigos, setCantidadAmigos] = useState(1);
  const [servicioSeleccionado, setServicioSeleccionado] = useState<string | null>(null);
  const [fechaSeleccionada, setFechaSeleccionada] = useState<string | null>(null);
  const [horarioSeleccionado, setHorarioSeleccionado] = useState<string | null>(null);
  const [horariosOcupados, setHorariosOcupados] = useState<string[]>([]);
  const [turnoActivo, setTurnoActivo] = useState<any>(null);

  const [estadoTurno, setEstadoTurno] = useState<"inicial" | "exito" | "ver" | "error">("inicial");

  // 🔎 Filtramos imágenes válidas
  const trabajosValidos = barberoSeleccionado?.trabajos?.filter((t) => t && t.trim() !== "") || [];

  // Genera horarios desde 10:30 a 21:30
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

  // 🔎 Escuchar horarios ocupados
  useEffect(() => {
    if (!barberoSeleccionado || !fechaSeleccionada) return;

    const q = query(
      collection(db, "Negocios", negocioId, "Turnos"),
      where("barbero", "==", barberoSeleccionado.nombre),
      where("fecha", "==", fechaSeleccionada)
    );

    const unsub = onSnapshot(q, (snap) => {
      const ocupados = snap.docs.map((d) => d.data().hora as string);
      setHorariosOcupados(ocupados);
    });

    return () => unsub();
  }, [barberoSeleccionado, fechaSeleccionada, negocioId]);

  // 🔹 Guardar turno
  const guardarTurno = async () => {
    if (!barberoSeleccionado || !servicioSeleccionado || !fechaSeleccionada || !horarioSeleccionado) {
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

      // Verificar disponibilidad
      const q = query(
        collection(db, "Negocios", negocioId, "Turnos"),
        where("barbero", "==", barberoSeleccionado.nombre),
        where("fecha", "==", fechaSeleccionada),
        where("hora", "==", horarioSeleccionado)
      );

      const snap = await getDocs(q);
      if (!snap.empty) {
        alert("Ese horario ya está ocupado, selecciona otro.");
        return;
      }

      // Guardar turno en negocio
      const turnoRef = await addDoc(collection(db, "Negocios", negocioId, "Turnos"), {
        barbero: barberoSeleccionado.nombre,
        servicio: servicioSeleccionado,
        fecha: fechaSeleccionada,
        hora: horarioSeleccionado,
        cliente: usuario.displayName || "Cliente",
        email: usuario.email || "",
        uidCliente: usuario.email || "",
        estado: "pendiente",
        creadoEn: new Date(),
      });

      // Guardar copia en el usuario
      await setDoc(doc(db, "Usuarios", usuario.uid, "Turnos", turnoRef.id), {
        negocioId,
        negocioNombre: "BarberStyle",
        barbero: barberoSeleccionado.nombre,
        servicio: servicioSeleccionado,
        fecha: fechaSeleccionada,
        hora: horarioSeleccionado,
        estado: "pendiente",
        creadoEn: new Date(),
      });

      setEstadoTurno("exito");
      setPaso("imagenes");
      setServicioSeleccionado(null);
      setFechaSeleccionada(null);
      setHorarioSeleccionado(null);
      setBarberoSeleccionado(null);
      setMostrarBarberos(false);
    } catch (e: any) {
      console.error("Error al guardar turno:", e);
      setEstadoTurno("error");
    }
  };

  // 🔹 Barra superior
  const renderBarra = () => {
    if (!barberoSeleccionado) return null;
    return (
      <div className="w-full max-w-3xl flex items-center justify-between bg-black text-white px-6 py-3 rounded-t-xl shadow mx-auto">
        <h2 className="text-lg md:text-xl font-bold">
          {paso === "imagenes" && `Trabajos de ${barberoSeleccionado.nombre}`}
          {paso === "pregunta" && "Confirmar acompañantes"}
          {paso === "precios" && "Seleccionar servicio"}
          {paso === "fecha" && "Seleccionar fecha"}
          {paso === "horarios" && "Horarios disponibles"}
        </h2>
        <button
          onClick={() => {
            if (paso === "imagenes") {
              setBarberoSeleccionado(null);
              setThumbsSwiper(null);
              setScrollHint("right");
            } else if (paso === "pregunta") {
              setBarberoSeleccionado(null);
              setMostrarBarberos(true);
              setThumbsSwiper(null);
              setScrollHint("right");
            } else if (paso === "precios") {
              setPaso("pregunta");
            } else if (paso === "fecha") {
              setPaso("precios");
            } else if (paso === "horarios") {
              setPaso("fecha");
            }
          }}
          className="flex items-center gap-1 bg-white text-black px-3 py-1 rounded-lg shadow hover:bg-gray-100 transition"
        >
          <span>←</span>
          <span className="text-sm font-medium">Volver</span>
        </button>
      </div>
    );
  };

// 👇 Verificamos si el turnoActivo sigue vigente (hora local)
let turnoActivoVigente = false;

if (turnoActivo?.fecha && turnoActivo?.hora) {
  const [year, month, day] = turnoActivo.fecha.split("-").map(Number);
  const [hours, minutes] = turnoActivo.hora.split(":").map(Number);

  // ⚡ Crear fecha en hora local (no UTC)
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
        <h2 className="text-5xl font-bold mb-6 font-euphoria">
  Reserva turno con tu barbero favorito
</h2>


        {estadoTurno === "exito" && (
          <p className="mb-4 text-green-600 font-semibold">✅ Tu turno fue agendado con éxito</p>
        )}
        {estadoTurno === "error" && (
          <p className="mb-4 text-red-600 font-semibold">❌ Hubo un error al agendar el turno</p>
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

      {/* Lista de barberos */}
      {mostrarBarberos && !barberoSeleccionado && (
        <div>
          <h2 className="text-5xl font-euphoria mb-10">Elige tu barbero</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {empleados.map((empleado, i) => (
              <div key={i} className={`bg-white rounded-xl shadow p-6 flex flex-col items-center ${fuenteTexto}`}>
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
          {renderBarra()}

          {/* Paso imágenes */}
          {paso === "imagenes" && (
            <div className="w-full max-w-3xl bg-white p-6 rounded-b-xl shadow flex flex-col items-center justify-center min-h-[500px]">
              {trabajosValidos.length > 0 ? (
                <>
                  <div className="relative w-full">
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
                          <img src={foto} alt={`Trabajo ${idx + 1}`} className="w-full h-[400px] object-cover rounded-xl" />
                        </SwiperSlide>
                      ))}
                    </Swiper>
                    <button className="custom-prev absolute top-1/2 left-4 transform -translate-y-1/2 z-10 bg-white/70 hover:bg-white rounded-full p-2 shadow">
                      <img src={ArrowLeft} alt="Anterior" className="w-6 h-6" />
                    </button>
                    <button className="custom-next absolute top-1/2 right-4 transform -translate-y-1/2 z-10 bg-white/70 hover:bg-white rounded-full p-2 shadow">
                      <img src={ArrowRight} alt="Siguiente" className="w-6 h-6" />
                    </button>
                  </div>
                </>
              ) : (
                <p className="text-gray-600">Este barbero aún no tiene trabajos subidos.</p>
              )}
              <button
                onClick={() => setPaso("pregunta")}
                className={`mt-8 px-6 py-3 rounded-lg bg-black text-white hover:bg-gray-800 ${fuenteBotones}`}
              >
                Continuar
              </button>
            </div>
          )}

          {/* Paso pregunta */}
          {paso === "pregunta" && (
            <div className="w-full max-w-3xl bg-white p-6 rounded-b-xl shadow flex flex-col items-center justify-center min-h-[500px]">
              <p className="text-lg font-medium mb-4">¿Vienes solo o con amigos?</p>
              <div className="flex gap-4 mb-4">
                <button
                  onClick={() => {
                    setConAmigos("solo");
                    setPaso("precios");
                  }}
                  className="px-4 py-2 rounded-lg bg-black text-white hover:bg-gray-800"
                >
                  Solo
                </button>
                <button
                  onClick={() => setConAmigos("amigos")}
                  className="px-4 py-2 rounded-lg bg-black text-white hover:bg-gray-800"
                >
                  Con amigos
                </button>
              </div>
            </div>
          )}

          {/* Paso precios */}
          {paso === "precios" && (
            <div className="w-full max-w-3xl bg-white p-6 rounded-b-xl shadow flex flex-col items-center justify-center min-h-[500px]">
              <div className="flex flex-col gap-3 w-full">
                {[
                  "Corte de pelo — $400",
                  "Corte + Barba — $500",
                  "Corte + Barba + Cejas — $550",
                  "Corte + Tinta — $800",
                  "Tinta — $600",
                ].map((serv, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setServicioSeleccionado(serv);
                      setPaso("fecha");
                    }}
                    className="px-4 py-3 rounded-lg bg-black text-white hover:bg-gray-800"
                  >
                    {serv}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Paso fecha */}
          {paso === "fecha" && (
            <div className="w-full max-w-3xl bg-white p-6 rounded-b-xl shadow flex flex-col items-center justify-center min-h-[500px]">
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
                {fechas.map((d) => (
                  <button
                    key={d.value}
                    onClick={() => setFechaSeleccionada(d.value)}
                    className={`py-2 px-6 rounded-full ${
                      fechaSeleccionada === d.value
                        ? "text-white bg-black scale-105"
                        : "text-black bg-gray-100 hover:bg-gray-200"
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
              {fechaSeleccionada && (
                <button
                  onClick={() => setPaso("horarios")}
                  className="mt-6 px-6 py-2 rounded-lg bg-black text-white hover:bg-gray-800"
                >
                  Ver horarios
                </button>
              )}
            </div>
          )}

          {/* Paso horarios */}
          {paso === "horarios" && fechaSeleccionada && (
            <div className="w-full max-w-3xl bg-white p-6 rounded-b-xl shadow flex flex-col items-center justify-center min-h-[500px]">
              <div className="flex flex-wrap gap-3 justify-center">
                {horariosDisponibles.map((h, i) => {
                  const ocupado = horariosOcupados.includes(h);
                  return (
                    <button
                      key={i}
                      onClick={() => !ocupado && setHorarioSeleccionado(h)}
                      disabled={ocupado}
                      className={`px-4 py-2 rounded-lg ${
                        ocupado
                          ? "bg-red-600 text-white cursor-not-allowed"
                          : horarioSeleccionado === h
                          ? "bg-gray-800 text-white"
                          : "bg-black text-white hover:bg-gray-800"
                      }`}
                    >
                      {h}
                    </button>
                  );
                })}
              </div>
              {horarioSeleccionado && (
                <>
                  <p className="mt-4 font-medium">
                    Has seleccionado: {servicioSeleccionado} el {fechaSeleccionada} a las {horarioSeleccionado}
                  </p>
                  <button
                    onClick={guardarTurno}
                    className="mt-6 px-6 py-3 rounded-lg bg-green-600 text-white hover:bg-green-700"
                  >
                    Confirmar turno
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
