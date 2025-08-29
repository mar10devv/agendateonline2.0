// src/components/barberia/Resenas.tsx
import React, { useState, useEffect } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import "swiper/css/navigation";
import { Navigation } from "swiper/modules";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { db } from "../../lib/firebase";
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
    <section className="py-20 px-6 md:px-12 lg:px-24 bg-white">
      {/* Encabezado */}
      <div className="mb-12">
        <span
          className={`uppercase text-sm tracking-widest text-black flex items-center ${fuentesMap[fuenteTexto]}`}
        >
          <span className="w-10 h-[2px] bg-black mr-2"></span>
          Testimonios
        </span>
        <h2
          className={`text-3xl md:text-4xl font-bold mt-4 ${fuentesMap[fuenteTexto]}`}
        >
          Reseñas de Google
        </h2>
      </div>

      {/* Carrusel */}
      <Swiper
        modules={[Navigation]}
        navigation
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
            <div className="bg-white border border-gray-200 rounded-lg shadow-md p-6 h-full flex flex-col">
              {/* Header */}
              <div className="flex items-center gap-3 mb-4">
                {r.foto ? (
                  <img
                    src={r.foto}
                    alt={r.nombre}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-sm font-bold text-white">
                    {r.nombre[0]}
                  </div>
                )}
                <div>
                  <h3 className={`font-semibold ${fuentesMap[fuenteTexto]}`}>
                    {r.nombre}
                  </h3>
                  <p className="text-xs text-gray-500">{r.fecha}</p>
                </div>
                <img
                  src="https://www.gstatic.com/images/branding/product/1x/googlelogo_light_color_42dp.png"
                  alt="Google"
                  className="ml-auto w-6 h-6"
                />
              </div>

              {/* Estrellas */}
              <div className="flex text-yellow-500 mb-3">
                {"★".repeat(r.estrellas)}
                <span className="text-gray-300">
                  {"★".repeat(5 - r.estrellas)}
                </span>
              </div>

              <p
                className={`text-gray-600 text-sm flex-grow ${fuentesMap[fuenteTexto]}`}
              >
                {r.comentario}
              </p>
            </div>
          </SwiperSlide>
        ))}
      </Swiper>

      {/* Caja de comentarios */}
      {user ? (
        <div className="mt-12 bg-gray-50 p-6 rounded-lg shadow">
          <h3
            className={`text-lg font-semibold mb-4 ${fuentesMap[fuenteTexto]}`}
          >
            Dejá tu reseña
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
