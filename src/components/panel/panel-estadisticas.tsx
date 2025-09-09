// src/components/ControlPanel/PanelEstadisticas.tsx
import React, { useEffect, useState } from "react";
import { db } from "../../lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer
} from "recharts";

type Estadisticas = {
  turnosSemana: number;
  turnosMes: number;
  turnosAnio: number;
  cancelaciones: number;
  ingresosSemana: number;
  ingresosMes: number;
  ingresosAnio: number;
  serviciosMasSolicitados: Record<string, number>;
  usuariosFrecuentes: Record<string, number>;
  barberosTop: Record<string, number>;
};

export default function PanelEstadisticas() {
  const [stats, setStats] = useState<Estadisticas | null>(null);

  useEffect(() => {
    // ⚠️ Reemplaza por el negocioId actual
    const negocioId = "hycp0nS5NycAYP32NfNf3wI6fhg2";

    const ref = doc(db, "Negocios", negocioId, "Estadisticas", "resumen");
    const unsub = onSnapshot(ref, (docSnap) => {
      if (docSnap.exists()) {
        setStats(docSnap.data() as Estadisticas);
      }
    });

    return () => unsub();
  }, []);

  if (!stats) {
    return <p className="p-6">Cargando estadísticas...</p>;
  }

  // 🔹 Preparamos datos para gráficos
  const dataServicios = Object.entries(stats.serviciosMasSolicitados || {}).map(
    ([name, cantidad]) => ({ name, cantidad })
  );

  const dataUsuarios = Object.entries(stats.usuariosFrecuentes || {})
    .map(([name, cantidad]) => ({ name, cantidad }))
    .sort((a, b) => b.cantidad - a.cantidad)
    .slice(0, 5);

  const dataBarberos = Object.entries(stats.barberosTop || {})
    .map(([name, cantidad]) => ({ name, cantidad }))
    .sort((a, b) => b.cantidad - a.cantidad)
    .slice(0, 5);

  return (
    <div className="p-6 space-y-8">
      <h2 className="text-3xl font-bold mb-6">📊 Panel de Estadísticas</h2>

      {/* 🔹 Cards Resumen */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white shadow rounded-lg p-4 text-center">
          <h3 className="text-lg font-semibold">Turnos Semana</h3>
          <p className="text-2xl font-bold">{stats.turnosSemana}</p>
        </div>
        <div className="bg-white shadow rounded-lg p-4 text-center">
          <h3 className="text-lg font-semibold">Turnos Mes</h3>
          <p className="text-2xl font-bold">{stats.turnosMes}</p>
        </div>
        <div className="bg-white shadow rounded-lg p-4 text-center">
          <h3 className="text-lg font-semibold">Turnos Año</h3>
          <p className="text-2xl font-bold">{stats.turnosAnio}</p>
        </div>
        <div className="bg-white shadow rounded-lg p-4 text-center">
          <h3 className="text-lg font-semibold">Cancelaciones</h3>
          <p className="text-2xl font-bold">{stats.cancelaciones}</p>
        </div>
      </div>

      {/* 🔹 Cards Ingresos */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white shadow rounded-lg p-4 text-center">
          <h3 className="text-lg font-semibold">Ingresos Día</h3>
          <p className="text-2xl font-bold">${stats.ingresosSemana / 7}</p>
        </div>
        <div className="bg-white shadow rounded-lg p-4 text-center">
          <h3 className="text-lg font-semibold">Ingresos Semana</h3>
          <p className="text-2xl font-bold">${stats.ingresosSemana}</p>
        </div>
        <div className="bg-white shadow rounded-lg p-4 text-center">
          <h3 className="text-lg font-semibold">Ingresos Mes</h3>
          <p className="text-2xl font-bold">${stats.ingresosMes}</p>
        </div>
        <div className="bg-white shadow rounded-lg p-4 text-center">
          <h3 className="text-lg font-semibold">Ingresos Año</h3>
          <p className="text-2xl font-bold">${stats.ingresosAnio}</p>
        </div>
      </div>

      {/* 🔹 Gráfico Servicios más solicitados */}
      <div className="bg-white shadow rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-2">Servicios más solicitados</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={dataServicios}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="cantidad" fill="#3b82f6" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* 🔹 Usuarios más frecuentes */}
      <div className="bg-white shadow rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-2">Usuarios más frecuentes</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={dataUsuarios}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="cantidad" fill="#10b981" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* 🔹 Barberos más solicitados */}
      <div className="bg-white shadow rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-2">Barberos con más reservas</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={dataBarberos}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="cantidad" fill="#f59e0b" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
