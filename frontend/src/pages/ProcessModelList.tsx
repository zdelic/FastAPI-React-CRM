import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import { PlusCircle, Trash2, PencilLine, Workflow } from "lucide-react";

const ProcessModelList = () => {
  const [models, setModels] = useState<any[]>([]);
  const navigate = useNavigate();

  const loadModels = async () => {
    try {
      const res = await api.get("/process-models");
      setModels(res.data);
    } catch (err) {
      console.error("Fehler beim Laden:", err);
    }
  };

  const deleteModel = async (id: number) => {
    if (!window.confirm("Wirklich löschen?")) return;
    try {
      await api.delete(`/process-models/${id}`);
      loadModels();
    } catch (err) {
      console.error("Fehler beim Löschen:", err);
    }
  };

  useEffect(() => {
    loadModels();
  }, []);

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header image */}
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
          
          <h1 className="text-white text-5xl md:text-5xl font-bold drop-shadow-[0_0_15px_black] border-black">🧩 Prozessmodelle</h1>
        </div>
      </div>
      

      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold flex items-center gap-2 text-gray-800">
            <Workflow size={26} className="text-blue-600" />
            Modelle Übersicht
          </h2>
          <button
            className="px-3 py-2 rounded bg-gray-200 text-gray-900 hover:bg-gray-300"
            onClick={() => navigate("/dashboard")}
          >
            ◀ Zurück zum 📁 Dashboard
          </button>
          <button
            onClick={() => navigate("/prozessmodell")}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
          >
            <PlusCircle size={18} /> Neues Modell
          </button>
        </div>

        {/* Model list */}
        <div className="grid md:grid-cols-2 gap-6">
          {models.map((model) => (
            <div
              key={model.id}
              className="bg-white rounded-lg shadow p-5 hover:shadow-md transition flex flex-col justify-between"
            >
              <div>
                <h3 className="text-lg font-bold text-gray-800 mb-1">{model.name}</h3>
                <p className="text-sm text-gray-600">
                  {model.steps.length} Schritt{model.steps.length !== 1 && "e"}
                </p>
              </div>
              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => navigate(`/prozessmodell/${model.id}`)}
                  className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm"
                >
                  <PencilLine size={16} /> Bearbeiten
                </button>
                <button
                  onClick={() => deleteModel(model.id)}
                  className="flex items-center gap-1 text-red-600 hover:text-red-800 text-sm"
                >
                  <Trash2 size={16} /> Löschen
                </button>
              </div>
            </div>
          ))}
        </div>

        {models.length === 0 && (
          <p className="text-gray-500 text-center mt-8">Keine Modelle gefunden.</p>
        )}
      </div>
    </div>
  );
};

export default ProcessModelList;
