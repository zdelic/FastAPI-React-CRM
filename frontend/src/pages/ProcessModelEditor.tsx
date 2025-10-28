import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api/axios";
import { PlusCircle, Save, Trash2, Workflow } from "lucide-react";

type Step = {
  id?: number;
  gewerk_id: number;
  activity: string;
  duration_days: number;
  parallel: boolean;
  order: number;
  /** stabilni ključ za DnD i mape aktivnosti (ne ide u backend) */
  _key: string;
};

const genKey = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const ProcessModelEditor = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [modelName, setModelName] = useState("");
  const [steps, setSteps] = useState<Step[]>([]);
  const [gewerke, setGewerke] = useState<any[]>([]);
  const [aktivitaetenMap, setAktivitaetenMap] = useState<{ [stableKey: string]: any[] }>({});

  // DnD refs
  const dragIndexRef = useRef<number | null>(null);
  const overIndexRef = useRef<number | null>(null);

  useEffect(() => {
    const loadGewerke = async () => {
      const res = await api.get("/gewerke");
      setGewerke(res.data);
    };
    loadGewerke();
  }, []);

  useEffect(() => {
    if (!id) return;
    const loadModel = async () => {
      try {
        const res = await api.get(`/process-models/${id}`);
        setModelName(res.data.name);

        // dodaj stabilni _key po koraku (preferiraj postojeći id)
        const loaded: Step[] = (res.data.steps || []).map((s: any, idx: number) => ({
          id: s.id,
          gewerk_id: s.gewerk_id ?? 0,
          activity: s.activity ?? "",
          duration_days: s.duration_days ?? 5,
          parallel: !!s.parallel,
          order: s.order ?? idx,
          _key: s.id ? `id-${s.id}` : genKey(),
        }));

        setSteps(loaded);

        // prefetch aktivnosti po gewerk_id
        for (const st of loaded) {
          if (st.gewerk_id) {
            const resAkt = await api.get(`/gewerke/${st.gewerk_id}/aktivitaeten`);
            setAktivitaetenMap((prev) => ({ ...prev, [st._key]: resAkt.data }));
          }
        }
      } catch (err) {
        console.error("Fehler beim Laden des Modells:", err);
      }
    };
    loadModel();
  }, [id]);

  const fetchAktivitaeten = async (stableKey: string, gewerk_id: number) => {
    if (!gewerk_id) return;
    const res = await api.get(`/gewerke/${gewerk_id}/aktivitaeten`);
    setAktivitaetenMap((prev) => ({ ...prev, [stableKey]: res.data }));
  };

  const handleAddStep = () => {
    const newStep: Step = {
      gewerk_id: 0,
      activity: "",
      duration_days: 5,
      parallel: false,
      order: steps.length,
      _key: genKey(),
    };
    setSteps((prev) => [...prev, newStep]);
  };

  const handleRemoveStep = (index: number) => {
    setSteps((prev) => prev.filter((_, i) => i !== index));
  };

  const handleStepChange = (index: number, field: keyof Step, value: any) => {
    setSteps((prev) => {
      const copy = [...prev];
      const step = { ...copy[index] };

      const newValue =
        field === "duration_days" ? parseInt(value as string, 10) : value;

      (step as any)[field] = newValue;
      copy[index] = step;

      // ako promijenimo gewerk, osvježi aktivnosti i resetiraj activity
      if (field === "gewerk_id") {
        fetchAktivitaeten(step._key, Number(newValue));
        step.activity = "";
      }
      return copy;
    });
  };

  const moveItem = (arr: Step[], from: number, to: number) => {
    const copy = [...arr];
    const [m] = copy.splice(from, 1);
    copy.splice(to, 0, m);
    return copy;
  };

  // DnD handlers
  const onDragStart = (index: number) => (e: React.DragEvent) => {
    dragIndexRef.current = index;
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(index)); // za kompatibilnost
  };

  const onDragOver = (index: number) => (e: React.DragEvent) => {
    e.preventDefault(); // omogućava drop
    overIndexRef.current = index;
  };

  const onDrop = (index: number) => (e: React.DragEvent) => {
    e.preventDefault();
    const from =
      dragIndexRef.current ??
      Number(e.dataTransfer.getData("text/plain") || NaN);
    const to = index;

    if (Number.isFinite(from) && Number.isFinite(to) && from !== to) {
      setSteps((prev) => moveItem(prev, from as number, to));
    }
    dragIndexRef.current = null;
    overIndexRef.current = null;
  };

  const onDragEnd = () => {
    dragIndexRef.current = null;
    overIndexRef.current = null;
  };

  const handleSubmit = async () => {
    try {
      // preračunaj order po trenutnom poretku
      const payload = {
        name: modelName,
        steps: steps.map((step, i) => {
          const { _key, ...rest } = step;
          return { ...rest, order: i };
        }),
      };

      if (id) {
        await api.put(`/process-models/${id}`, payload);
        alert("Modell aktualisiert.");
      } else {
        await api.post("/process-models", payload);
        alert("Prozessmodell gespeichert!");
      }
      navigate("/prozessmodelle");
    } catch (err) {
      console.error("Fehler beim Speichern:", err);
      alert("Fehler beim Speichern.");
    }
  };

  const getGewerkColor = (gewerk_id: number) => {
    const gewerk = gewerke.find((g) => g.id === gewerk_id);
    return gewerk?.color || "#ffffff";
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div
        className="w-full"
        style={{
          backgroundImage: "url('/images/Startseite-OfficePark-2_01.png')",
          backgroundSize: "contain",
          backgroundRepeat: "no-repeat",
          backgroundPosition: "center",
          height: "400px",
        }}
      >
        <div className="h-full w-full bg-opacity-40 flex items-center justify-center">
          <h1 className="text-white text-5xl md:text-5xl font-bold drop-shadow-[0_0_15px_black] border-black">
            {id ? `Modell ${modelName} bearbeiten` : "Neues Prozessmodell"}
          </h1>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center">
          <div className="mb-2 flex items-center gap-2 ml-auto">
            <button
              className="px-3 py-2 rounded bg-gray-200 text-gray-900 hover:bg-gray-300"
              onClick={() => navigate("/dashboard")}
            >
              ◀ Zurück zum 📁 Dashboard
            </button>

            <button
              onClick={() => navigate(`/prozessmodelle`)}
              className="px-3 py-2 rounded bg-gray-200 text-gray-900 hover:bg-gray-300"
            >
              ◀ Zurück zum 🧩 Prozessmodelle
            </button>
          </div>
        </div>

        <div className="mb-6">
          <input
            type="text"
            placeholder="Modellname"
            value={modelName}
            onChange={(e) => setModelName(e.target.value)}
            className="w-full p-3 rounded border text-xl font-semibold"
          />
        </div>

        {steps.map((step, index) => (
          <div
            key={step._key}
            className="rounded-lg shadow p-5 mb-4 space-y-4 border border-gray-200 relative"
            style={{ backgroundColor: getGewerkColor(step.gewerk_id) }}
            draggable
            onDragStart={onDragStart(index)}
            onDragOver={onDragOver(index)}
            onDrop={onDrop(index)}
            onDragEnd={onDragEnd}
          >
            {/* Drag handle / redni broj */}
            <div className="absolute -left-3 top-3 select-none">
              <div
                title="Zum Verschieben ziehen"
                className="cursor-grab active:cursor-grabbing bg-white/70 rounded-full px-2 py-1 text-xs font-semibold shadow"
              >
                #{index + 1}
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-4">
              <div className="w-full">
                <label className="block text-m text-inherit font-bold drop-shadow-[0_0_2px_white]">
                  Gewerk
                </label>
                <select
                  value={step.gewerk_id}
                  onChange={(e) =>
                    handleStepChange(
                      index,
                      "gewerk_id",
                      parseInt(e.target.value)
                    )
                  }
                  className="w-full p-2 border rounded"
                >
                  <option value={0}>-- wählen --</option>
                  {gewerke.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="w-full">
                <label className="block text-m text-inherit font-bold drop-shadow-[0_0_2px_white]">
                  Aktivität
                </label>
                {(() => {
                  const list = aktivitaetenMap[step._key] || [];
                  const hasMatch = !!list.find(
                    (a) =>
                      (a.name || "").trim() === (step.activity || "").trim()
                  );

                  return (
                    <select
                      value={step.activity}
                      onChange={(e) =>
                        handleStepChange(index, "activity", e.target.value)
                      }
                      className="w-full p-2 border rounded"
                    >
                      <option value="">-- wählen --</option>

                      {/* Fallback: ako spremljena aktivnost nema match u opcijama (još), dodaj je privremeno */}
                      {step.activity && !hasMatch && (
                        <option value={step.activity}>
                          {step.activity} {/* (bestehend) */}
                        </option>
                      )}

                      {list.map((a) => (
                        <option key={a.id} value={(a.name || "").trim()}>
                          {a.name}
                        </option>
                      ))}
                    </select>
                  );
                })()}
              </div>
            </div>

            <div className="flex gap-4 items-center">
              <div>
                <label className="block text-m text-inherit font-bold drop-shadow-[0_0_2px_white]">
                  Dauer (Tage)
                </label>
                <input
                  type="number"
                  value={step.duration_days}
                  onChange={(e) =>
                    handleStepChange(index, "duration_days", e.target.value)
                  }
                  className="w-24 p-2 border rounded"
                />
              </div>

              <div className="flex items-center gap-2 mt-6">
                <input
                  type="checkbox"
                  checked={step.parallel}
                  onChange={(e) =>
                    handleStepChange(index, "parallel", e.target.checked)
                  }
                />
                <label className="block text-m text-white font-bold drop-shadow-[0_0_2px_black]">
                  gleichzeitig?
                </label>
              </div>

              <button
                onClick={() => handleRemoveStep(index)}
                className="ml-auto hover:text-red-400 text-white drop-shadow-[0_0_2px_black]"
              >
                <Trash2 size={22} /> Entfernen
              </button>
            </div>
          </div>
        ))}

        <div className="flex items-center justify-between mt-6">
          <button
            onClick={handleAddStep}
            className="flex items-center gap-2 text-blue-600 hover:text-blue-800"
          >
            <PlusCircle size={18} /> Schritt hinzufügen
          </button>

          <button
            onClick={handleSubmit}
            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          >
            <Save size={18} /> {id ? "Aktualisieren" : "Speichern"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProcessModelEditor;
