// src/components/ui/ComponenteMapa.tsx
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { obtenerDireccion } from "../../../lib/geocoding";
import { guardarUbicacionNegocio } from "../../agendaVirtual/backend/agenda-backend";

type Props = {
  ubicacion: {
    lat: number;
    lng: number;
    direccion?: string;
  } | null;

  modo: "dueño" | "cliente" | "admin";
  negocioSlug: string;

  onUbicacionActualizada: (u: {
    lat: number;
    lng: number;
    direccion: string;
  }) => void;

  height?: string; // por defecto: h-64
};

// Icono Leaflet original
const customIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

export default function ComponenteMapa({
  ubicacion,
  modo,
  negocioSlug,
  onUbicacionActualizada,
  height = "h-64",
}: Props) {
  if (!ubicacion) {
    return (
      <div className="text-[color:var(--color-texto)/0.7] text-sm">
        Ubicación no disponible.
      </div>
    );
  }

  return (
    <div className={`w-full rounded-md overflow-hidden border border-[color:var(--color-texto)/0.15] ${height}`}>
      <MapContainer
        key={`${ubicacion.lat}-${ubicacion.lng}`}
        center={[ubicacion.lat, ubicacion.lng]}
        zoom={16}
        style={{ width: "100%", height: "100%" }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; OpenStreetMap contributors'
        />

        <Marker
          position={[ubicacion.lat, ubicacion.lng]}
          icon={customIcon}
          draggable={modo === "dueño" || modo === "admin"}
          eventHandlers={
            (modo === "dueño" || modo === "admin")
              ? {
                  dragend: async (e) => {
                    const pos = e.target.getLatLng();
                    const direccion = await obtenerDireccion(pos.lat, pos.lng);

                    const nuevaUbicacion = {
                      lat: pos.lat,
                      lng: pos.lng,
                      direccion,
                    };

                    // Guardar en Firestore
                    await guardarUbicacionNegocio(negocioSlug, nuevaUbicacion);

                    // Devolver al padre
                    onUbicacionActualizada(nuevaUbicacion);
                  },
                }
              : {}
          }
        >
          {(modo === "dueño" || modo === "admin") && (
            <Popup>Mueve el pin si la ubicación no es correcta</Popup>
          )}
        </Marker>
      </MapContainer>
    </div>
  );
}
