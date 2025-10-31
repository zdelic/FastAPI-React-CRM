import React, { useEffect, useState, useMemo, useRef } from "react";
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
import api from "../api/axios";
import { Calendar as CalendarIcon } from "lucide-react";

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement
);

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
  className?: string;
}

const formatDDMMYYYY = (iso: string) => {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}`;
};

const formatDate = (d: Date) => {
  const pad = (n: number) => (n < 10 ? `0${n}` : String(n));
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

/** --- Normalizacija i grupiranje po gewerk-u --- */
const normRow = (x: any) => ({
  // naziv gewerka – pokrij različita imena polja iz backenda
  gewerk: (
    x.gewerk ??
    x.name ??
    x.gewerk_name ??
    x.trade ??
    x.trade_name ??
    ""
  ).toString(),
  // brojevi – pokrij različite ključeve
  done: Number(x.done ?? x.erledigt ?? x.completed ?? 0),
  in_progress: Number(x.in_progress ?? x.inBearbeitung ?? x.running ?? 0),
  offen: Number(x.offen ?? x.open ?? x.todo ?? 0),
});

const groupByGewerk = (
  rows: Array<{
    gewerk: string;
    done: number;
    in_progress: number;
    offen: number;
  }>
) => {
  const map = new Map<
    string,
    { gewerk: string; done: number; in_progress: number; offen: number }
  >();
  for (const r of rows) {
    const key = (r.gewerk ?? "").toString().trim() || "Allgemein";
    const cur = map.get(key);
    if (cur) {
      cur.done += r.done;
      cur.in_progress += r.in_progress;
      cur.offen += r.offen;
    } else {
      map.set(key, { ...r, gewerk: key });
    }
  }
  return [...map.values()];
};
/** --------------------------------------------- */

const ProjektStatistik: React.FC<ProjektStatistikProps> = ({
  stats,
  projectId,
  className,
}) => {
  const wrapperClass = className ?? "col-span-2 space-y-8";
  const [untilDate, setUntilDate] = useState<string>("");
  const [data, setData] = useState<ProjectStats>(
    stats || {
      total: 0,
      done: 0,
      in_progress: 0,
      offen: 0,
      percent_done: 0,
      by_gewerk: [],
    }
  );

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const dateRef = useRef<HTMLInputElement>(null);
  // selekcija gewerka (null = svi)
  const [selectedGewerk, setSelectedGewerk] = useState<string | null>(null);

  // sinkronizacija početnih propsa
  useEffect(() => {
    if (stats) setData(stats);
  }, [stats]);

  // dohvat statistike do datuma
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const res = await api.get(`/projects/${projectId}/stats`, {
          params: untilDate ? { until: untilDate } : undefined,
        });
        
        if (!cancelled) {
          const s = res.data || {};
          const rawByGewerk = Array.isArray(s.by_gewerk) ? s.by_gewerk : [];
          const normalizedByGewerk = groupByGewerk(rawByGewerk.map(normRow));

          const normalized: ProjectStats = {
            total: s.total ?? s.tasks_total ?? 0,
            done: s.done ?? s.tasks_done ?? 0,
            in_progress: s.in_progress ?? 0,
            offen: s.offen ?? s.tasks_open ?? 0,
            percent_done:
              s.percent_done ??
              (s.tasks_total
                ? Math.round(((s.tasks_done || 0) / s.tasks_total) * 10000) /
                  100
                : 0),
            by_gewerk: normalizedByGewerk,
          };
          setData(normalized);
        }
      } catch (e) {
        if (!cancelled) setErr("Greška pri dohvaćanju statistike.");
        console.error(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId, untilDate]);

  // izračun “view modela” – ukupno ili samo za odabrani gewerk
  const view = useMemo(() => {
    if (!data) return null;

    if (selectedGewerk) {
      const row = data.by_gewerk.find((g) => g.gewerk === selectedGewerk);
      if (row) {
        const done = row.done || 0;
        const ip = row.in_progress || 0;
        const offen = row.offen || 0;
        const total = done + ip + offen;
        return {
          scopeLabel: selectedGewerk,
          total,
          done,
          in_progress: ip,
          offen,
          percent_done: total ? Math.round((done / total) * 10000) / 100 : 0,
          // bar labels & rows za “jedan gewerk”
          barLabels: [selectedGewerk],
          barRows: [row],
        };
      }
      // ako nije nađen – fallback na ukupno
    }

    // prikaz “svi gewerke”
    return {
      scopeLabel: null as string | null,
      total: data.total,
      done: data.done,
      in_progress: data.in_progress,
      offen: data.offen,
      percent_done: data.percent_done,
      barLabels: (data.by_gewerk ?? []).map((g) => g.gewerk),
      barRows: data.by_gewerk ?? [],
    };
  }, [data, selectedGewerk]);

  if (!data || !view) return <div className={wrapperClass} />;

  // sortiraj listu gewerka za prikaz (A–Z)
  const gewerkeSorted = [...(data.by_gewerk ?? [])].sort((a, b) =>
    (a.gewerk || "").localeCompare(b.gewerk || "", undefined, {
      sensitivity: "base",
    })
  );

  return (
    <div className={wrapperClass}>
      <div className="bg-gradient-to-br from-gray-900 via-slate-800 to-gray-900 rounded-2xl p-6 shadow-2xl text-white border border-gray-700">
        <div className="flex items-center justify-between gap-4 mb-4">
          <h3 className="text-2xl font-bold text-cyan-400">
            📊 Aufgaben-Statistik
            {view.scopeLabel ? ` — ${view.scopeLabel}` : ""}
          </h3>

          <div className="flex items-center gap-3">
            {selectedGewerk && (
              <button
                className="text-xs bg-slate-700 hover:bg-slate-600 px-2 py-1 rounded"
                onClick={() => setSelectedGewerk(null)}
                title="Filter entfernen"
              >
                Alle Gewerke
              </button>
            )}
            <label className="flex items-center gap-2 text-sm">
              <span className="text-gray-300">Bis Datum:</span>
              <div className="relative">
                <input
                  ref={dateRef}
                  type="date"
                  value={untilDate}
                  onChange={(e) => setUntilDate(e.target.value)}
                  className="bg-slate-900 border border-slate-600 rounded px-2 py-1 text-gray-100 pr-10"
                  placeholder="—"
                />
                <button
                  type="button"
                  onClick={() =>
                    dateRef.current?.showPicker
                      ? dateRef.current.showPicker()
                      : dateRef.current?.focus()
                  }
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-300 hover:text-white"
                  aria-label="Datum wählen"
                  title="Datum wählen"
                >
                  <CalendarIcon size={18} />
                </button>
              </div>
            </label>

            {/* NOVO: prečice */}
            <button
              type="button"
              className="text-xs bg-slate-700 hover:bg-slate-600 px-2 py-1 rounded"
              onClick={() => setUntilDate(formatDate(new Date()))}
              title="Bis heute"
            >
              Heute
            </button>
            <button
              type="button"
              className="text-xs bg-slate-700 hover:bg-slate-600 px-2 py-1 rounded"
              onClick={() => setUntilDate("")}
              title="Alle Daten (ohne Stichtag)"
            >
              Alle
            </button>
          </div>
        </div>

        {loading ? (
          <div className="py-8 text-center text-gray-300">Laden…</div>
        ) : err ? (
          <div className="py-8 text-center text-red-400">{err}</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[0.6fr_1.4fr] gap-4">
            {/* Lijeva kolona: sažetak + lista gewerka (klikabilni linkovi) */}
            <div className="space-y-4">
              <ul className="list-disc list-inside text-sm text-gray-200 space-y-1">
                <li>
                  <span className="text-cyan-300">Gesamt:</span> {view.total}
                </li>
                <li>
                  <span className="text-green-400">Erledigt:</span> {view.done}
                </li>
                <li>
                  <span className="text-yellow-400">In Bearbeitung:</span>{" "}
                  {view.in_progress}
                </li>
                <li>
                  <span className="text-red-400">Offen:</span> {view.offen}
                </li>
                <li>
                  <span className="text-blue-300">Fertigstellungsgrad:</span>{" "}
                  {view.percent_done}%
                </li>
              </ul>

              <div>
                <h4 className="text-lg font-semibold text-purple-300 mb-2">
                  📁 Nach Gewerk:
                </h4>

                {/* manji razmak i zbijeniji redovi */}
                <ul className="space-y-0.5 leading-tight text-[13px]">
                  {/* RESET na Gesamt */}
                  <li>
                    <button
                      type="button"
                      onClick={() => setSelectedGewerk(null)}
                      className={
                        "text-left w-full px-2 py-0.5 rounded transition " +
                        (selectedGewerk === null
                          ? "bg-cyan-900/40 text-cyan-200"
                          : "hover:bg-white/5 text-gray-300 hover:text-white")
                      }
                      title="Gesamt-Ansicht (Reset)"
                    >
                      <span className="underline decoration-dotted">
                        Gesamt (Reset)
                      </span>
                    </button>
                  </li>

                  {gewerkeSorted.map((g) => {
                    const total =
                      (g.done || 0) + (g.in_progress || 0) + (g.offen || 0);
                    const active = selectedGewerk === g.gewerk;
                    return (
                      <li key={g.gewerk}>
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedGewerk(active ? null : g.gewerk)
                          }
                          className={
                            "text-left w-full px-2 py-0.5 rounded transition " +
                            (active
                              ? "bg-cyan-900/40 text-cyan-200"
                              : "hover:bg-white/5 text-gray-300 hover:text-white")
                          }
                          title="Nur diesen Gewerk anzeigen"
                        >
                          <span className="underline decoration-dotted">
                            {g.gewerk}
                          </span>
                          <span className="text-cyan-200">: {total}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>

            {/* Desno: 2 grafikona – filtrirani po view (svi ili jedan gewerk) */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              <div className="bg-black/20 p-4 rounded-xl shadow-inner border border-slate-700">
                <h4 className="text-center mb-2 text-sm text-gray-300">
                  📈 Kreisdiagramm
                  {view.scopeLabel ? ` — ${view.scopeLabel}` : ""} (
                  {untilDate
                    ? `bis ${formatDDMMYYYY(untilDate)}`
                    : "ohne Stichtag"}
                  )
                </h4>

                <Pie
                  data={{
                    labels: ["Erledigt", "In Bearbeitung", "Offen"],
                    datasets: [
                      {
                        data: [view.done, view.in_progress, view.offen],
                        backgroundColor: ["#22c55e", "#eab308", "#ef4444"],
                      },
                    ],
                  }}
                  options={{
                    plugins: { legend: { labels: { color: "#cbd5e1" } } },
                  }}
                />
              </div>

              <div className="bg-black/20 p-4 rounded-xl shadow-inner border border-slate-700">
                <h4 className="text-center mb-2 text-sm text-gray-300">
                  📊 Balkendiagramm
                  {view.scopeLabel ? ` — ${view.scopeLabel}` : ""} (bis{" "}
                  {formatDDMMYYYY(untilDate)})
                </h4>

                <Bar
                  height={200}
                  data={{
                    labels: view.barLabels,
                    datasets: [
                      {
                        label: "Erledigt",
                        data: view.barRows.map((g) => g.done || 0),
                        backgroundColor: "#22c55e",
                      },
                      {
                        label: "In Bearbeitung",
                        data: view.barRows.map((g) => g.in_progress || 0),
                        backgroundColor: "#facc15",
                      },
                      {
                        label: "Offen",
                        data: view.barRows.map((g) => g.offen || 0),
                        backgroundColor: "#ef4444",
                      },
                    ],
                  }}
                  options={{
                    responsive: true,
                    plugins: { legend: { labels: { color: "#cbd5e1" } } },
                    scales: {
                      x: {
                        stacked: true,
                        ticks: { color: "#cbd5e1" },
                        grid: { color: "#334155" },
                      },
                      y: {
                        stacked: true,
                        beginAtZero: true,
                        ticks: { color: "#cbd5e1" },
                        grid: { color: "#334155" },
                      },
                    },
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default React.memo(ProjektStatistik);
