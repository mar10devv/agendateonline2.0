import React from "react";

type Props = {
  slugGenerado: string | null;
};

function RegistroPaso7Confirmacion({ slugGenerado }: Props) {
  const urlAgenda = slugGenerado
    ? `https://agendateonline.com/agenda/${slugGenerado}`
    : "/panel/paneldecontrol";

  return (
    <div className="flex flex-col items-center text-center space-y-6 py-6 text-gray-900">
      {/* Icono / badge */}
      <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center shadow-sm">
        <span className="text-3xl">🎉</span>
      </div>

      {/* Texto principal */}
      <div className="space-y-2 max-w-md">
        <h1 className="text-2xl font-bold text-gray-900">
          ¡Tu agenda ya está lista!
        </h1>
        <p className="text-sm text-gray-700">
          Guardamos todos los datos de tu negocio y activamos tu agenda en
          AgendateOnline. Ya podés compartir el enlace con tus clientes y
          empezar a recibir turnos.
        </p>
      </div>



      {/* Botón principal */}
      <a
        href={urlAgenda}
        className="mt-2 inline-flex items-center justify-center px-6 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition shadow-sm"
      >
        Continuar a mi agenda
      </a>

      {/* Texto chiquito */}
      <p className="text-xs text-gray-500">
        Siempre vas a poder cambiar la configuración desde tu panel.
      </p>
    </div>
  );
}

export default RegistroPaso7Confirmacion;
