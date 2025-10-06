// src/components/ui/SelectorTema.tsx
import { aplicarTema, temas } from "../../../lib/temaColores";

export default function SelectorTema() {
  return (
    <div className="flex gap-2 p-3 justify-center">
      {Object.entries(temas).map(([nombre, { primario }]) => (
        <button
          key={nombre}
          onClick={() => aplicarTema(nombre as keyof typeof temas)}
          className="w-7 h-7 rounded-full border-2 border-white hover:scale-110 transition"
          style={{ backgroundColor: primario }}
          title={`Tema ${nombre}`}
        />
      ))}
    </div>
  );
}
