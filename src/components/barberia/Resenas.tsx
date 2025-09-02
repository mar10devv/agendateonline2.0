// src/components/barberia/Resenas.tsx
import React, { useState, useEffect } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import "swiper/css/navigation";
import { Navigation } from "swiper/modules";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { db } from "../../lib/firebase";
import ArrowLeft from "../../assets/arrow-left.svg?url";
import ArrowRight from "../../assets/arrow-right.svg?url";

import {
  collection,
  addDoc,
  getDocs,
  serverTimestamp,
  query,
  orderBy,
} from "firebase/firestore";
import { fuentesMap } from "../../lib/fonts";

type Reseña = {
  id?: string;
  nombre: string;
  foto?: string;
  fecha: string;
  comentario: string;
  estrellas: number;
};

type Props = {
  fuenteTexto?: string;
  fuenteBotones?: string;
};

export default function Resenas({
  fuenteTexto = "raleway",
  fuenteBotones = "poppins",
}: Props) {
  const [reseñas, setReseñas] = useState<Reseña[]>([]);
  const [comentario, setComentario] = useState("");
  const [estrellas, setEstrellas] = useState(5);
  const [user, setUser] = useState<any>(null);

  // Escuchar sesión Google
  useEffect(() => {
    const auth = getAuth();
    const unsub = onAuthStateChanged(auth, (usuario) => {
      setUser(usuario);
    });
    return () => unsub();
  }, []);

  // Cargar reseñas desde Firestore
  useEffect(() => {
    const cargarReseñas = async () => {
      const q = query(collection(db, "Reseñas"), orderBy("fecha", "desc"));
      const snap = await getDocs(q);
      const data = snap.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as Reseña),
        fecha: doc.data().fecha?.toDate().toLocaleDateString() || "",
      }));
      setReseñas(data);
    };
    cargarReseñas();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !comentario) return;

    const nuevaReseña = {
      nombre: user.displayName || "Usuario",
      foto: user.photoURL || "",
      fecha: serverTimestamp(),
      comentario,
      estrellas,
    };

    try {
      await addDoc(collection(db, "Reseñas"), nuevaReseña);
      setComentario("");
      setEstrellas(5);
      // refrescar lista
      setReseñas((prev) => [
        {
          ...nuevaReseña,
          fecha: new Date().toLocaleDateString(),
        } as Reseña,
        ...prev,
      ]);
    } catch (error) {
      console.error("Error al guardar reseña", error);
    }
  };

  return (
    <section className="py-5 px-6 md:px-12 lg:px-24 bg-white">
      {/* Encabezado */}
      <div className="mb-12">
        <span
          className={`uppercase text-sm tracking-widest text-black flex items-center ${fuentesMap[fuenteTexto]}`}
        >
          <span className="w-10 h-[2px] bg-black mr-2"></span>
          Reseñas de Google
        </span>
        <h2
          className={`text-3xl md:text-4xl font-bold mt-4 ${fuentesMap[fuenteTexto]}`}
        >
          Comentarios de nuestros clientes!
        </h2>
      </div>

      {/* Carrusel */}
<Swiper
  modules={[Navigation]}
  navigation={{
    nextEl: ".swiper-button-next-custom",
    prevEl: ".swiper-button-prev-custom",
  }}
  spaceBetween={24}
  slidesPerView={1}
  breakpoints={{
    640: { slidesPerView: 1 },
    768: { slidesPerView: 2 },
    1024: { slidesPerView: 3 },
  }}
>
  {reseñas.map((r, i) => (
    <SwiperSlide key={r.id || i}>
      <div className="relative w-72 bg-white rounded-2xl shadow-lg flex flex-col items-center overflow-hidden mx-auto">
        {/* Cabecera decorativa */}
        <div className="h-28 w-full bg-gradient-to-r from-black via-gray-800 to-gray-700"></div>

        {/* Avatar */}
        <div className="absolute top-14 w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-md">
          {r.foto ? (
            <img
              src={r.foto}
              alt={r.nombre}
              className="w-20 h-20 rounded-full object-cover"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-gray-300 flex items-center justify-center text-xl font-bold text-white">
              {r.nombre[0]}
            </div>
          )}
        </div>

        {/* Contenido */}
        <div className="mt-20 flex flex-col items-center px-6 pb-6 text-center">
          <h3 className={`font-semibold text-lg text-gray-800 ${fuentesMap[fuenteTexto]}`}>
            {r.nombre}
          </h3>
          <p className="text-sm text-gray-500">{r.fecha}</p>

          {/* Estrellas */}
          <div className="flex justify-center mt-3">
            {Array.from({ length: r.estrellas }).map((_, i) => (
              <span key={i} className="text-yellow-400 text-lg">★</span>
            ))}
            {Array.from({ length: 5 - r.estrellas }).map((_, i) => (
              <span key={i} className="text-gray-300 text-lg">★</span>
            ))}
          </div>

          {/* Comentario */}
          <p className={`mt-3 text-gray-700 text-sm ${fuentesMap[fuenteTexto]}`}>
            {r.comentario}
          </p>
        </div>
      </div>
    </SwiperSlide>
  ))}

  {/* Flechas personalizadas */}
  
 {/* Flecha izquierda */}
<div className="swiper-button-prev-custom absolute top-1/2 left-2 -translate-y-1/2 z-10 cursor-pointer bg-black shadow rounded-full p-2 hover:scale-110 transition">
  <img src={ArrowLeft} alt="Anterior" className="w-5 h-5 invert" />
</div>

{/* Flecha derecha */}
<div className="swiper-button-next-custom absolute top-1/2 right-2 -translate-y-1/2 z-10 cursor-pointer bg-black shadow rounded-full p-2 hover:scale-110 transition">
  <img src={ArrowRight} alt="Siguiente" className="w-5 h-5 invert" />
</div>

</Swiper>


      {/* Caja de comentarios */}
      {user ? (
        <div className="mt-12 bg-gray-50 p-6 rounded-lg shadow">
          <h3
            className={`text-lg font-semibold mb-4 ${fuentesMap[fuenteTexto]}`}
          >
            Dejá tu comentario
          </h3>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <textarea
              placeholder="Escribí tu comentario..."
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
              className={`w-full border border-gray-300 rounded px-4 py-2 h-24 ${fuentesMap[fuenteTexto]}`}
            />
            <div className="flex items-center gap-2">
              <span className={`text-sm text-gray-600 ${fuentesMap[fuenteTexto]}`}>
                Tu puntuación:
              </span>
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  type="button"
                  key={n}
                  onClick={() => setEstrellas(n)}
                  className={`text-2xl ${
                    n <= estrellas ? "text-yellow-500" : "text-gray-300"
                  }`}
                >
                  ★
                </button>
              ))}
            </div>
            <button
              type="submit"
              className={`bg-black text-white px-6 py-2 rounded-lg hover:bg-gray-800 transition ${fuentesMap[fuenteBotones]}`}
            >
              Enviar reseña
            </button>
          </form>
        </div>
      ) : (
        <p
          className={`mt-8 text-gray-500 text-sm ${fuentesMap[fuenteTexto]}`}
        >
          🔒 Inicia sesión con tu cuenta de Google para dejar una reseña.
        </p>
      )}
    </section>
  );
}
