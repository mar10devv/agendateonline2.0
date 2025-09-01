// src/components/barberia/UbicacionBarberia.tsx
import React from "react";

type Ubicacion = {
  lat: number;
  lng: number;
  direccion?: string;
};

type Props = {
  nombre?: string;
  ubicacion?: Ubicacion;
};

export default function UbicacionBarberia({ nombre, ubicacion }: Props) {
  if (!ubicacion) {
    return (
      <section className="py-20 px-6 md:px-12 lg:px-24 bg-gray-50 text-center">
        <h2 className="text-3xl font-bold mb-4">Ubicación</h2>
        <p className="text-gray-600">📍 Este negocio todavía no configuró su ubicación.</p>
      </section>
    );
  }

  return (
    <section className="py-20 px-6 md:px-12 lg:px-24 bg-gray-50">
      <h2 className="text-3xl font-bold text-center mb-8">Ubicación</h2>

      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-xl p-6">
        {nombre && (
          <p className="text-lg font-medium mb-1 text-center">{nombre}</p>
        )}
        {ubicacion.direccion && (
          <p className="text-gray-700 mb-4 text-center">{ubicacion.direccion}</p>
        )}

        {/* Mapa Google embebido */}
        <div className="w-full h-[400px] rounded-lg overflow-hidden shadow">
          <iframe
            title="Mapa ubicación barbería"
            src={`https://www.google.com/maps?q=${ubicacion.lat},${ubicacion.lng}&hl=es&z=16&output=embed`}
            width="100%"
            height="100%"
            style={{ border: 0 }}
            allowFullScreen
            loading="lazy"
          ></iframe>
        </div>
      </div>
    </section>
  );
}
