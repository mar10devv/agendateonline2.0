// src/components/agenda/turnos-view.tsx
import { useCalendario } from "../../lib/useCalendario";

export default function TurnosView({ negocioId, empleados }: { negocioId: string; empleados: any[] }) {
  const empleadosList = Array.isArray(empleados) ? empleados : Object.values(empleados || {});
  
  if (empleadosList.length === 0) {
    return <p>No hay empleados cargados.</p>;
  }

  return (
    <div>
      <h2 className="text-lg font-bold mb-4">📅 Turnos disponibles</h2>
      <p className="text-gray-600">Aquí se mostrará el calendario simplificado.</p>
      {/* Aquí podés expandir la lógica con useCalendario */}
    </div>
  );
}
