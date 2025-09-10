// src/lib/geocoding.ts
export async function obtenerDireccion(lat: number, lng: number): Promise<string> {
  const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=es`;
  const resp = await fetch(url);
  const data = await resp.json();

  const pais = data.address.country || "Desconocido";
  const departamento =
    data.address.state || data.address.region || "Desconocido";

  return `${pais} / ${departamento}`;
}
