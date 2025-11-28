import { useState, useEffect } from "react";
import {
  doc,
  collection,
  onSnapshot,
  setDoc,
  addDoc,
  deleteDoc,
  query,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../../lib/firebase";
import ModalBase from "../ui/modalGenerico";
import InputAnimado from "../ui/InputAnimado";
import LoaderSpinner from "../ui/loaderSpinner";
import AddIcon from "../../assets/add.svg?url";

type Servicio = {
  id?: string;
  servicio: string;
  precio: number | string;
  duracion: number;
  createdAt?: any;
};

type Props = {
  abierto: boolean;
  onCerrar: () => void;
  negocioId: string;
};

export default function ModalAgregarServicios({
  abierto,
  onCerrar,
  negocioId,
}: Props) {
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [cargando, setCargando] = useState(true);
  const [estadoBoton, setEstadoBoton] = useState<
    "normal" | "guardando" | "exito" | "error"
  >("normal");

  const [abiertoIndex, setAbiertoIndex] = useState<number | null>(null);

  // ============================================
  // Duraciones predefinidas (EN MINUTOS)
  // ============================================
  const duraciones = [
    10, 20, 30, 40, 50,
    60, 70, 80, 90,
    120, 150, 180, 210, 240
  ];

  const formatearDuracion = (min: number) => {
    const h = Math.floor(min / 60);
    const m = min % 60;
    if (h === 0) return `${m} min`;
    if (m === 0) return `${h} hr`;
    return `${h} hr ${m} min`;
  };

  // ============================================
  // Detectar servicio vacío
  // ============================================
  const esServicioVacio = (s: Servicio) => {
    return (
      (s.servicio.trim() === "") &&
      (s.precio === "" || s.precio === 0) &&
      s.duracion === 30
    );
  };

  // ============================================
  // Eliminar TODOS los servicios nuevos vacíos
  // ============================================
  const limpiarServiciosVacios = () => {
    setServicios((prev) =>
      prev.filter((s) => s.id || !esServicioVacio(s))
    );
  };

  // ============================================
  // Expandir/minimizar y eliminar vacíos
  // ============================================
  const toggleExpand = (i: number) => {
    setServicios((prevServicios) => {
      let nuevaLista = [...prevServicios];

      if (abiertoIndex !== null && abiertoIndex !== i) {
        const anterior = nuevaLista[abiertoIndex];

        if (!anterior.id && esServicioVacio(anterior)) {
          nuevaLista.splice(abiertoIndex, 1);
          if (i > abiertoIndex) i--;
        }
      }

      setAbiertoIndex((prev) => (prev === i ? null : i));
      return nuevaLista;
    });
  };

  // ============================================
  // Carga en tiempo real
  // ============================================
  useEffect(() => {
    if (!abierto || !negocioId) return;

    const negocioRef = doc(db, "Negocios", negocioId);
    const preciosRef = collection(negocioRef, "Precios");
    const q = query(preciosRef, orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(q, (snap) => {
      const data = snap.docs.map(
        (d) =>
          ({
            id: d.id,
            servicio: d.data().servicio || "",
            precio: d.data().precio || 0,
            duracion: d.data().duracion || 30,
            createdAt: d.data().createdAt,
          } as Servicio)
      );

      setServicios(data);
      setCargando(false);
      setAbiertoIndex(null);
    });

    return () => unsubscribe();
  }, [abierto, negocioId]);

  const handleChange = (index: number, field: keyof Servicio, value: any) => {
    setServicios((prev) =>
      prev.map((s, i) => (i === index ? { ...s, [field]: value } : s))
    );
  };

  // ============================================
  // Agregar servicio
  // ============================================
  const handleAgregar = () => {
    limpiarServiciosVacios();
    setServicios((prev) => [{ servicio: "", precio: "", duracion: 30 }, ...prev]);
    setAbiertoIndex(0);
  };

  // ============================================
  // Eliminar manualmente
  // ============================================
  const handleEliminar = async (index: number) => {
    const servicio = servicios[index];
    try {
      if (servicio.id) {
        const negocioRef = doc(db, "Negocios", negocioId);
        const preciosRef = collection(negocioRef, "Precios");
        await deleteDoc(doc(preciosRef, servicio.id));
      }

      setServicios((prev) => prev.filter((_, i) => i !== index));

      if (abiertoIndex === index) setAbiertoIndex(null);
    } catch (err) {
      console.error("❌ Error eliminando servicio:", err);
    }
  };

  // ============================================
  // Guardar
  // ============================================
  const handleGuardar = async () => {
    limpiarServiciosVacios();

    try {
      setEstadoBoton("guardando");

      const negocioRef = doc(db, "Negocios", negocioId);
      const preciosRef = collection(negocioRef, "Precios");

      for (const s of servicios) {
        if (s.servicio.trim() !== "") {
          const precioFinal = s.precio === "" ? 0 : Number(s.precio);

          if (s.id) {
            await setDoc(
              doc(preciosRef, s.id),
              {
                servicio: s.servicio,
                precio: precioFinal,
                duracion: s.duracion,
              },
              { merge: true }
            );
          } else {
            await addDoc(preciosRef, {
              servicio: s.servicio,
              precio: precioFinal,
              duracion: s.duracion,
              createdAt: serverTimestamp(),
            });
          }
        }
      }

      setEstadoBoton("exito");
      setTimeout(() => setEstadoBoton("normal"), 3000);
    } catch (err) {
      console.error("❌ Error guardando servicios:", err);
      setEstadoBoton("error");
      setTimeout(() => setEstadoBoton("normal"), 3000);
    }
  };

  const cerrarModal = () => {
    limpiarServiciosVacios();
    onCerrar();
  };

  if (!abierto) return null;

  return (
    <ModalBase
      abierto={abierto}
      onClose={cerrarModal}
      titulo="Servicios del negocio"
      maxWidth="max-w-3xl"
    >
      <div
        className="flex flex-col max-h-[90vh] rounded-2xl p-4 transition-colors duration-300 overflow-hidden"
        style={{ backgroundColor: "var(--color-fondo)", color: "#fff" }}
      >
        <div className="flex-1 overflow-y-auto space-y-4 pr-2">
          {cargando ? (
            <p className="text-gray-300">Cargando servicios...</p>
          ) : servicios.length === 0 ? (
            <p className="text-gray-400 text-sm">No hay servicios cargados aún.</p>
          ) : (
            servicios.map((serv, i) => (
              <div
                key={serv.id || i}
                className="rounded-xl border border-white/10 bg-black/20"
              >
                <button
                  onClick={() => toggleExpand(i)}
                  className="w-full text-left px-4 py-3 flex justify-between items-center text-white font-medium"
                >
                  <span>{serv.servicio || "Nuevo servicio"}</span>
                  <span className="text-xl">
                    {abiertoIndex === i ? "▲" : "▼"}
                  </span>
                </button>

                {abiertoIndex === i && (
  <div className="p-4 flex flex-col gap-4 bg-black/30 rounded-b-xl">

    <InputAnimado
      label="Nombre del servicio"
      id={`nombre-${i}`}
      value={serv.servicio}
      onChange={(e) => handleChange(i, "servicio", e.target.value)}
    />

    <InputAnimado
      label="Precio"
      id={`precio-${i}`}
      value={serv.precio === 0 ? "" : String(serv.precio)}
      onChange={(e) => {
        const val = e.target.value;
        handleChange(i, "precio", val === "" ? "" : Number(val));
      }}
    />

    {/* SLIDER DURACIÓN */}
    <div className="flex flex-col gap-1">
      <label className="text-sm text-gray-300">Duración</label>

      <input
        type="range"
        min={0}
        max={duraciones.length - 1}
        step={1}
        value={duraciones.indexOf(serv.duracion)}
        onChange={(e) => {
          const index = Number(e.target.value);
          const nuevaDuracion = duraciones[index];
          handleChange(i, "duracion", nuevaDuracion);
        }}
        className="w-full accent-green-500"
      />

      <p className="text-gray-200 text-sm font-medium mt-1">
        {formatearDuracion(serv.duracion)}
      </p>
    </div>

    {/* BOTÓN ELIMINAR */}
<div className="w-[calc(100%+2rem)] -ml-4 mt-3 pt-3 border-t border-white/10">
  <button
    onClick={() => handleEliminar(i)}
    className="w-full py-2 rounded-b-xl bg-red-600 hover:bg-red-700 text-white font-semibold shadow-md transition text-center"
  >
    ✕
  </button>
</div>


  </div>
)}

              </div>
            ))
          )}
        </div>

        <div className="mt-4">
          <button
            onClick={handleAgregar}
            className="w-full sm:w-auto px-4 py-2 rounded-lg shadow font-medium transition flex items-center justify-center gap-2"
            style={{
              backgroundColor: "var(--color-primario)",
              color: "#fff",
            }}
          >
            <img src={AddIcon} alt="Añadir" className="w-4 h-4 invert" />
            Añadir servicio
          </button>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={cerrarModal}
            className="px-5 py-2 rounded-lg bg-black/40 text-gray-200 hover:bg-black/60 transition"
          >
            Cancelar
          </button>

          <button
            onClick={handleGuardar}
            disabled={estadoBoton === "guardando"}
            className={`px-6 py-2 rounded-lg text-white font-medium transition flex items-center justify-center gap-2
              ${
                estadoBoton === "guardando"
                  ? "bg-gray-500 cursor-not-allowed"
                  : estadoBoton === "exito"
                  ? "bg-green-600 hover:bg-green-700"
                  : estadoBoton === "error"
                  ? "bg-red-600 hover:bg-red-700"
                  : "bg-green-600 hover:bg-green-700"
              }`}
          >
            {estadoBoton === "guardando" && <LoaderSpinner size={18} />}

            {estadoBoton === "guardando"
              ? "Guardando cambios..."
              : estadoBoton === "exito"
              ? "✅ Se guardó correctamente"
              : estadoBoton === "error"
              ? "❌ Se produjo un error"
              : "Guardar cambios"}
          </button>
        </div>
      </div>
    </ModalBase>
  );
}
