import React from "react";

export default function AgendateOnlineInfo() {
  return (
    <section className="bg-white py-20 relative">
      <div className="max-w-4xl mx-auto px-6 text-center relative">
        {/* Título con pelotita rebotando */}
        <h2 className="text-3xl md:text-4xl font-bold mb-10 text-gray-800 text-center">
  ¿Qué es{" "}
  <span className="text-blue-600">
    Ag<span className="relative inline-block">
      é
      {/* Pelotita justo sobre la "é" */}
      <span className="absolute -top-6 left-[10%] -translate-x-1/2 w-5 h-5 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full animate-bounce"></span>
    </span>
    ndateOnline
  </span>
  ?
</h2>



        {/* Texto explicativo */}
        <div className="text-left max-w-2xl mx-auto">
          <p className="text-lg text-gray-600 mb-4">
            Es una plataforma donde tus clientes pueden reservar turnos de forma
            rápida y sencilla desde cualquier dispositivo 📱💻.
          </p>
          <p className="text-lg text-gray-600 mb-4">
            Los negocios gestionan sus empleados, horarios y servicios en un solo
            lugar. Todo organizado y disponible en línea, sin complicaciones.
          </p>
          <p className="text-lg text-gray-600">
            <strong>AgéndateOnline</strong> conecta a clientes con negocios locales
            en segundos 🚀.
          </p>
        </div>
      </div>
    </section>
  );
}
