import React from "react";
import ProgressCurve from "./ProgressCurve";
import { Pie, Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
} from "chart.js";

// Registracija chart.js elemenata (radi unutar ove komponente)
ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

export interface StatsByGewerk {
  gewerk: string;
  done?: number;
  in_progress?: number;
  offen?: number;
}

export interface ProjectStats {
  total: number;
  done: number;
  in_progress: number;
  offen: number;
  percent_done: number;
  by_gewerk: StatsByGewerk[];
}

interface ProjektStatistikProps {
  stats: ProjectStats | null;
  projectId: number;
  className?: string; // npr. za promjenu col-span-a izvana
}

const ProjektStatistik: React.FC<ProjektStatistikProps> = ({ stats, projectId, className }) => {
  const wrapperClass = className ?? "col-span-2 space-y-8";

  if (!stats) return <div className={wrapperClass} />;

  return (
    <div className={wrapperClass}>
      <div className="bg-gradient-to-br from-gray-900 via-slate-800 to-gray-900 rounded-2xl p-6 shadow-2xl text-white border border-gray-700">
        <h3 className="text-2xl font-bold text-cyan-400 flex items-center gap-2 mb-4">
          📊 Aufgaben-Statistik
        </h3>

        <div className="grid grid-cols-1 lg:grid-cols-[0.6fr_1.4fr] gap-4">
          {/* Lijevo: tekstualna statistika */}
          <div className="space-y-4">
            <ul className="list-disc list-inside text-sm text-gray-200 space-y-1">
              <li>
                <span className="text-cyan-300">Gesamt:</span> {stats.total}
              </li>
              <li>
                <span className="text-green-400">Erledigt:</span> {stats.done}
              </li>
              <li>
                <span className="text-yellow-400">In Bearbeitung:</span> {stats.in_progress}
              </li>
              <li>
                <span className="text-red-400">Offen:</span> {stats.offen}
              </li>
              <li>
                <span className="text-blue-300">Fertigstellungsgrad:</span> {stats.percent_done}%
              </li>
            </ul>

            <div>
              <h4 className="text-lg font-semibold text-purple-300 mb-1">📁 Nach Gewerk:</h4>
              <ul className="list-disc list-inside text-sm text-gray-300 space-y-1">
                {stats.by_gewerk.map((g) => {
                  const total = (g.done || 0) + (g.in_progress || 0) + (g.offen || 0);
                  return (
                    <li key={g.gewerk}>
                      {g.gewerk}: <span className="text-cyan-200">{total}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>

          {/* Desno: grafikoni */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <div className="bg-black/20 p-4 rounded-xl shadow-inner border border-slate-700">
              <h4 className="text-center mb-2 text-sm text-gray-300">📈 Kreisdiagramm</h4>
              <Pie
                data={{
                  labels: ["Erledigt", "In Bearbeitung", "Offen"],
                  datasets: [
                    {
                      data: [stats.done, stats.in_progress, stats.offen],
                      backgroundColor: ["#22c55e", "#eab308", "#ef4444"],
                    },
                  ],
                }}
                options={{
                  plugins: {
                    legend: {
                      labels: {
                        color: "#cbd5e1",
                      },
                    },
                  },
                }}
              />
            </div>

            <div className="bg-black/20 p-4 rounded-xl shadow-inner border border-slate-700">
              <h4 className="text-center mb-2 text-sm text-gray-300">📊 Balkendiagramm</h4>
              <Bar
                height={200}
                data={{
                  labels: stats.by_gewerk.map((g) => g.gewerk),
                  datasets: [
                    {
                      label: "Erledigt",
                      data: stats.by_gewerk.map((g) => g.done || 0),
                      backgroundColor: "#22c55e",
                    },
                    {
                      label: "In Bearbeitung",
                      data: stats.by_gewerk.map((g) => g.in_progress || 0),
                      backgroundColor: "#facc15",
                    },
                    {
                      label: "Offen",
                      data: stats.by_gewerk.map((g) => g.offen || 0),
                      backgroundColor: "#ef4444",
                    },
                  ],
                }}
                options={{
                  responsive: true,
                  plugins: {
                    legend: {
                      labels: { color: "#cbd5e1" },
                    },
                  },
                  scales: {
                    x: {
                      stacked: true,
                      ticks: { color: "#cbd5e1" },
                      grid: { color: "#334155" },
                    },
                    y: {
                      stacked: true,
                      beginAtZero: true,
                      suggestedMax: 15,
                      ticks: { color: "#cbd5e1" },
                      grid: { color: "#334155" },
                    },
                  },
                }}
              />
            </div>
          </div>
        </div>

        <div>
          <ProgressCurve projectId={projectId} />
        </div>
      </div>
    </div>
  );
};

export default React.memo(ProjektStatistik);
