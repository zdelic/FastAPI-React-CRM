import React, { useEffect, useState } from "react";
import { Line } from "react-chartjs-2";
import api from "../api/axios";
import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Filler,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(LineElement, PointElement, LinearScale, CategoryScale, Filler, Tooltip, Legend);

interface ProgressData {
  labels: string[]; // ISO datumi: "YYYY-MM-DD"
  soll: number[];   // per-day ili već kumulativno (mi ćemo ih kumulirati za svaki slučaj)
  ist: number[];
}

const toCumulative = (arr: number[]) =>
  arr.reduce<number[]>((acc, v) => {
    const prev = acc.length ? acc[acc.length - 1] : 0;
    acc.push(prev + (Number.isFinite(v) ? v : 0));
    return acc;
  }, []);

const ProgressCurve: React.FC<{ projectId: number }> = ({ projectId }) => {
  const [progress, setProgress] = useState<ProgressData | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.get(`/projects/${projectId}/progress-curve`);
        setProgress(res.data);
      } catch (err) {
        console.error("Fehler beim Laden der Fortschrittskurve:", err);
      }
    };
    fetchData();
  }, [projectId]);

  if (!progress) return null;

  // 1) osiguraj kumulativne nizove
  const cumSoll = toCumulative(progress.soll || []);
  const cumIst  = toCumulative(progress.ist || []);

  // 2) izračun postotka na temelju zadnje točke (ne zbroja)
  const lastSoll = cumSoll[cumSoll.length - 1] ?? 0;
  const lastIst  = cumIst[cumIst.length - 1] ?? 0;
  const percent  = lastSoll > 0 ? Math.round((lastIst / lastSoll) * 100) : 0;

  // 3) y-max možemo “zaključati” na ukupni broj planiranih (posljednja soll)
  const yMax = Math.max(lastSoll, lastIst);

  return (
    <div className="bg-black/20 p-6 rounded-xl shadow-inner border border-slate-700 text-white mt-10">
      <h3 className="text-lg font-bold text-cyan-300 mb-4">📈 Soll-Ist-Vergleich (Zeitverlauf)</h3>

      <Line
        height={100}
        data={{
          labels: progress.labels,
          datasets: [
            {
              label: "Soll (kumulativ geplant)",
              data: cumSoll,
              borderColor: "#facc15",
              backgroundColor: "transparent",
              fill: false,
              tension: 0.35,           // stepen krivljenja
              cubicInterpolationMode: "monotone",
              pointRadius: 0,
            },
            {
              label: "Ist (kumulativ erledigt)",
              data: cumIst,
              borderColor: "#22c55e",
              backgroundColor: "rgba(34,197,94,0.15)",
              fill: true,
              tension: 0.35,
              cubicInterpolationMode: "monotone",
              pointRadius: 0,
            },
          ],
        }}
        options={{
          responsive: true,
          plugins: {
            legend: { labels: { color: "#cbd5e1" } },
            tooltip: { mode: "index", intersect: false },
          },
          interaction: { mode: "index", intersect: false },
          scales: {
            x: {
              ticks: { color: "#cbd5e1", maxRotation: 90, minRotation: 45 },
              grid: { color: "#334155" },
            },
            y: {
              beginAtZero: true,
              suggestedMax: yMax,
              ticks: { color: "#cbd5e1" },
              grid: { color: "#334155" },
            },
          },
        }}
      />

      <p className="text-sm text-gray-300 mt-4">
        🎯 Aktueller Erfüllungsgrad:{" "}
        <span className="font-semibold text-green-400">{percent}%</span>
      </p>
    </div>
  );
};

export default ProgressCurve;
