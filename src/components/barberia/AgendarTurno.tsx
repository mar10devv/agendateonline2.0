import React, { useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Thumbs } from "swiper/modules";
import type { Swiper as SwiperType } from "swiper";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/thumbs";
import ArrowLeft from "../../assets/arrow-left.svg?url";
import ArrowRight from "../../assets/arrow-right.svg?url";

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
};

export default function AgendarTurno({
  fuenteTexto = "raleway",
  fuenteBotones = "poppins",
  empleados = [],
}: Props) {
  const [mostrarBarberos, setMostrarBarberos] = useState(false);
  const [barberoSeleccionado, setBarberoSeleccionado] = useState<Empleado | null>(null);
  const [thumbsSwiper, setThumbsSwiper] = useState<SwiperType | null>(null);

  // 🔎 Filtramos imágenes válidas
  const trabajosValidos =
    barberoSeleccionado?.trabajos?.filter((t) => t && t.trim() !== "") || [];

  return (
    <section
      className={`py-20 px-6 md:px-12 lg:px-24 bg-gray-50 text-center ${fuenteTexto}`}
    >
      {/* Vista inicial */}
      {!mostrarBarberos && !barberoSeleccionado && (
        <>
          <h2 className="text-3xl font-bold mb-6">
            Reserva turno con los mejores barberos
          </h2>
          <button
            onClick={() => setMostrarBarberos(true)}
            className={`px-8 py-3 rounded-lg transition bg-black text-white hover:bg-gray-800 ${fuenteBotones}`}
          >
            Reservar turno
          </button>
        </>
      )}

      {/* Lista de barberos */}
      {mostrarBarberos && !barberoSeleccionado && (
        <div>
          <h2 className="text-2xl font-bold mb-10">Elige tu barbero</h2>
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
                  onClick={() => setBarberoSeleccionado(empleado)}
                  className={`mt-4 px-4 py-2 rounded-lg transition bg-black text-white hover:bg-gray-800 ${fuenteBotones}`}
                >
                  Seleccionar
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Slideshow con thumbnails */}
      {barberoSeleccionado && (
        <div className="mt-12 flex flex-col items-center">
          <h2 className="text-2xl font-bold mb-6">
            Trabajos de {barberoSeleccionado.nombre}
          </h2>

          {trabajosValidos.length > 0 ? (
            <>
              {/* Carrusel principal */}
              <div className="relative w-full max-w-3xl">
                <Swiper
                  modules={[Navigation, Thumbs]}
                  navigation={{
                    prevEl: ".custom-prev",
                    nextEl: ".custom-next",
                  }}
                  thumbs={{ swiper: thumbsSwiper }}
                  className="rounded-xl shadow"
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

                {/* Botones flechas personalizados */}
                <button className="custom-prev absolute top-1/2 left-4 transform -translate-y-1/2 z-10 bg-white/70 hover:bg-white rounded-full p-2 shadow">
                  <img src={ArrowLeft} alt="Anterior" className="w-6 h-6" />
                </button>
                <button className="custom-next absolute top-1/2 right-4 transform -translate-y-1/2 z-10 bg-white/70 hover:bg-white rounded-full p-2 shadow">
                  <img src={ArrowRight} alt="Siguiente" className="w-6 h-6" />
                </button>
              </div>

              {/* Miniaturas centradas */}
<div className="mt-6 w-full max-w-3xl flex justify-center">
  <Swiper
    onSwiper={setThumbsSwiper}
    spaceBetween={10}
    slidesPerView={Math.min(6, trabajosValidos.length)}
    freeMode={true}
    watchSlidesProgress={true}
    modules={[Thumbs]}
    className="inline-flex mx-auto"  // 👈 truco: que ocupe solo lo necesario
  >
    {trabajosValidos.map((foto, idx) => (
      <SwiperSlide
        key={idx}
        className="!w-auto flex justify-center border-2 border-transparent rounded-md transition swiper-slide-thumb-active:border-black"
      >
        <img
          src={foto}
          alt={`Miniatura ${idx + 1}`}
          className="h-20 w-28 object-cover rounded-md cursor-pointer"
        />
      </SwiperSlide>
    ))}
  </Swiper>
</div>


            </>
          ) : (
            <p className="text-gray-600">Este barbero aún no tiene trabajos subidos.</p>
          )}

          <button
            className={`mt-8 px-6 py-3 rounded-lg bg-black text-white hover:bg-gray-800 ${fuenteBotones}`}
          >
            Continuar
          </button>
        </div>
      )}
    </section>
  );
}
