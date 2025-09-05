import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api/axios";
import {
  PlusCircle,
  Save,
  Trash2,
  Hammer,
  Workflow,
} from "lucide-react";

const ProcessModelEditor = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [modelName, setModelName] = useState("");
  const [steps, setSteps] = useState<any[]>([]);
  const [gewerke, setGewerke] = useState<any[]>([]);
  const [aktivitaetenMap, setAktivitaetenMap] = useState<{ [index: number]: any[] }>({});

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
        setSteps(res.data.steps);

        for (let i = 0; i < res.data.steps.length; i++) {
          const gewerkId = res.data.steps[i].gewerk_id;
          if (gewerkId) {
            const resAkt = await api.get(`/gewerke/${gewerkId}/aktivitaeten`);
            setAktivitaetenMap((prev) => ({ ...prev, [i]: resAkt.data }));
          }
        }
      } catch (err) {
        console.error("Fehler beim Laden des Modells:", err);
      }
    };
    loadModel();
  }, [id]);

  const fetchAktivitaeten = async (index: number, gewerk_id: number) => {
    if (!gewerk_id) return;
    const res = await api.get(`/gewerke/${gewerk_id}/aktivitaeten`);
    setAktivitaetenMap((prev) => ({ ...prev, [index]: res.data }));
  };

  const handleAddStep = () => {
    const newStep = {
      gewerk_id: 0,
      activity: "",
      duration_days: 5,
      parallel: false,
      order: steps.length,
    };
    setSteps([...steps, newStep]);
  };

  const handleRemoveStep = (index: number) => {
    setSteps(steps.filter((_, i) => i !== index));
  };

  const handleStepChange = (index: number, field: string, value: any) => {
    const updatedSteps = [...steps];
    const newValue = field === "duration_days" ? parseInt(value) : value;
    updatedSteps[index][field] = newValue;
    setSteps(updatedSteps);

    if (field === "gewerk_id") {
      fetchAktivitaeten(index, Number(value));
      updatedSteps[index].activity = "";
    }
  };

  const handleSubmit = async () => {
    try {
      const payload = {
        name: modelName,
        steps: steps.map((step, i) => ({ ...step, order: i })),
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
            height: "400px", // ili više, po potrebi
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
            key={index}
            className="rounded-lg shadow p-5 mb-4 space-y-4 border border-gray-200"
            style={{ backgroundColor: getGewerkColor(step.gewerk_id) }}
          >
            <div className="flex flex-col md:flex-row gap-4">
              <div className="w-full">
                <label className="block text-m text-inherit font-bold drop-shadow-[0_0_2px_white]">
                  Gewerk
                </label>
                <select
                  value={step.gewerk_id}
                  onChange={(e) => handleStepChange(index, "gewerk_id", parseInt(e.target.value))}
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
                <select
                  value={step.activity}
                  onChange={(e) => handleStepChange(index, "activity", e.target.value)}
                  className="w-full p-2 border rounded"
                >
                  <option value="">-- wählen --</option>
                  {(aktivitaetenMap[index] || []).map((a) => (
                    <option key={a.id} value={a.name}>
                      {a.name}
                    </option>
                  ))}
                </select>
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
                  onChange={(e) => handleStepChange(index, "duration_days", e.target.value)}
                  className="w-24 p-2 border rounded"
                />
              </div>

              <div className="flex items-center gap-2 mt-6">
                <input
                  type="checkbox"
                  checked={step.parallel}
                  onChange={(e) => handleStepChange(index, "parallel", e.target.checked)}
                />
                <label className="block text-m text-white font-bold drop-shadow-[0_0_2px_black]">gleichzeitig?</label>
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
