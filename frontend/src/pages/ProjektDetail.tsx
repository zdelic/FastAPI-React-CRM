import { useNavigate, useParams } from "react-router-dom";
import React, { useEffect, useState } from "react";
import { fetchStructure } from "../api/project";
import api from "../api/axios";
import ProjektStatistik from "../components/ProjektStatistik";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
} from "chart.js";
import ProjektStruktur from "../components/ProjektStruktur";
import ProjectUsersCard from "../components/ProjectUsersCard";


type Role = "admin" | "bauleiter" | "polier" | "sub";

function getRoleFromToken(): Role | null {
  const token = localStorage.getItem("token");
  if (!token) return null;
  try {
    // JWT payload (base64url)
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const json = atob(base64);
    const payload = JSON.parse(json) as { role?: Role };
    return (payload.role ?? null) as Role | null;
  } catch {
    return null;
  }
}

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);



const ProjektDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [bauteile, setBauteile] = useState<any[]>([]);
  const [newBauteil, setNewBauteil] = useState("");
  const [startDate, setStartDate] = useState<string | null>(null);
  const [formattedDate, setFormattedDate] = useState<string>("");
  const [isEditingStartDate, setIsEditingStartDate] = useState(false);
  const [hasTasks, setHasTasks] = useState<boolean | null>(null);
  const [projectName, setProjectName] = useState<string>("");
  const role = React.useMemo(getRoleFromToken, []);
  const isAdmin = role === "admin";

  
  
  const loadStructure = async () => {
    if (!id) return;
    try {
      const data = await fetchStructure(Number(id));
      setBauteile(data);
      
      if (data.length > 0 && data[0].project_id) {
        try {
          const res = await api.get(`/projects/${data[0].project_id}`);
          setStartDate(res.data.start_date);
          setProjectName(res.data.name);

          const parsed = new Date(res.data.start_date);
          const formatted = parsed.toLocaleDateString("de-DE"); // dd.mm.yyyy
          setFormattedDate(formatted);

          setStartDate(res.data.start_date);
        } catch (err) {
          console.error("Fehler beim Laden des Projektstartdatums:", err);
        }
      }
    } catch (err) {
      console.error("Fehler beim Laden der Struktur:", err);
    }
  };



  useEffect(() => {
    loadStructure();
  }, []);

  useEffect(() => {
  const checkTasks = async () => {
    try {
      const res = await api.get(`/projects/${id}/has-tasks`);
      setHasTasks(res.data); // true ili false
    } catch (err) {
      console.error("Greška pri proveri taskova:", err);
      setHasTasks(false); // fallback da prikaže dugme
    }
  };

  if (id) checkTasks();
}, [id]);

  const addBauteil = async () => {
    if (!newBauteil || !id) return;
    try {
      await api.post(`/projects/${id}/bauteil`, { name: newBauteil });
      setNewBauteil("");
      loadStructure();
    } catch (err) {
      console.error("Fehler beim Hinzufügen des Bauteils:", err);
    }
  };

  const [newStiegen, setNewStiegen] = useState<{ [key: number]: string }>({});
  const [newEbenen, setNewEbenen] = useState<{ [key: number]: string }>({});
  const [newTops, setNewTops] = useState<{ [key: number]: string }>({});
  const [editingNames, setEditingNames] = useState<{ [key: string]: string }>({});


  const addStiege = async (bauteilId: number) => {
    const name = newStiegen[bauteilId];
    if (!name) return;
    try {
      await api.post("/stiegen", { name, bauteil_id: bauteilId });
      setNewStiegen((prev) => ({ ...prev, [bauteilId]: "" }));
      loadStructure();
    } catch (err) {
      console.error("Fehler beim Hinzufügen der Stiege:", err);
    }
  };

const addEbene = async (stiegeId: number) => {
  const name = newEbenen[stiegeId];
  if (!name) return;
  try {
    await api.post("/ebenen", { name, stiege_id: stiegeId });
    setNewEbenen((prev) => ({ ...prev, [stiegeId]: "" }));
    loadStructure();
  } catch (err) {
    console.error("Fehler beim Hinzufügen der Ebene:", err);
  }
};

const addTop = async (ebeneId: number) => {
  const name = newTops[ebeneId];
  if (!name) return;
  try {
    await api.post("/tops", { name, ebene_id: ebeneId });
    setNewTops((prev) => ({ ...prev, [ebeneId]: "" }));
    loadStructure();
  } catch (err) {
    console.error("Fehler beim Hinzufügen des Tops:", err);
  }
};

const startEditing = (item: any, type: string) => {
  setEditingNames((prev) => ({ ...prev, [`${type}-${item.id}`]: item.name }));
};

const handleNameChange = (type: string, id: number, value: string) => {
  setEditingNames((prev) => ({ ...prev, [`${type}-${id}`]: value }));
};

type EntityType = 'bauteil' | 'stiege' | 'ebene' | 'top';

const typeToPath: Record<EntityType, string> = {
  bauteil: "bauteils",
  stiege: "stieges",
  ebene: "ebenen",
  top: "tops",
};
const saveEdit = async (type: EntityType, id: number) => {
  const name = editingNames[`${type}-${id}`];
  if (!name) return;

  const path = typeToPath[type];
  if (!path) return;

  try {
    await api.put(`/${path}/${id}`, { name });
    setEditingNames((prev) => {
      const copy = { ...prev };
      delete copy[`${type}-${id}`];
      return copy;
    });
    loadStructure();
  } catch (err) {
    console.error(`Fehler beim Aktualisieren von ${type}:`, err);
  }
};

const deleteItem = async (type: EntityType, id: number) => {
  const path = typeToPath[type];
  if (!path) return;

  try {
    await api.delete(`/${path}/${id}`);
    loadStructure();
  } catch (err) {
    console.error(`Fehler beim Löschen von ${type}:`, err);
  }

};

const handleSyncTasks = async () => {
  try {
    await api.post(`/projects/${id}/sync-tasks`);
    alert("Aufgaben werden synchronisiert.");
    // Po želji: reloaduj podatke ili redirectuj
  } catch (err) {
    console.error("Synchronisierungsfehler:", err);
    alert("Synchronisierungsfehler.");
  }
};

const [stats, setStats] = useState<any | null>(null);

useEffect(() => {
  const fetchStats = async () => {
    try {
      const res = await api.get(`/projects/${id}/task-stats`);
      setStats(res.data);
    } catch (err) {
      console.error("Fehler beim Laden der Statistik:", err);
    }
  };
  if (id) fetchStats();
}, [id]);


return (
  <div className="p-6 space-y-6">
    
    <div className="h-24 md:h-30 bg-cover bg-center" style={{ backgroundImage: "url('/images/Startseite-OfficePark-2_01.png')" }}>
        <div className="h-full w-full bg-black bg-opacity-40 flex items-center justify-between px-6">
          <h1 className="text-white text-3xl md:text-3xl font-bold drop-shadow">
            🏢 Projekt: {projectName}
          </h1>

          {/* desna grupa dugmadi */}
          <div className="flex items-center gap-2">
            <button
              className="px-3 py-2 rounded bg-gray-200 text-gray-900 hover:bg-gray-300"
              onClick={() => navigate("/dashboard")}
            >
              ◀ Zurück zum Dashboard
            </button>

            <button
              onClick={() => navigate(`/projekt/${id}/timeline`)}
              className="btn bg-cyan-500 hover:bg-cyan-600 text-white px-4 py-2 rounded"
            >
              Timeline
            </button>
          </div>
        </div>

    </div>


      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        {/* Lijevi stupac 1/3: Struktur + Mitglieder BEZ razmaka */}
        <div className="md:col-span-1 flex flex-col gap-0">  
        
          <ProjektStruktur
            newBauteil={newBauteil}
            setNewBauteil={setNewBauteil}
            addBauteil={addBauteil}
            bauteile={bauteile}
            editingNames={editingNames}
            handleNameChange={handleNameChange}
            saveEdit={saveEdit}
            startEditing={startEditing}
            deleteItem={deleteItem}
            newStiegen={newStiegen}
            setNewStiegen={setNewStiegen}
            addStiege={addStiege}
            newEbenen={newEbenen}
            setNewEbenen={setNewEbenen}
            addEbene={addEbene}
            newTops={newTops}
            setNewTops={setNewTops}
            addTop={addTop}
            loadStructure={loadStructure}
            hasTasks={hasTasks}
            handleSyncTasks={handleSyncTasks}
          />
        
          {isAdmin && id && (
            <ProjectUsersCard projectId={Number(id)} />
          )}
         </div>
        <div className="md:col-span-2">
          <ProjektStatistik stats={stats} projectId={Number(id)} />
        </div>

      </div>
  </div>
);

};

export default ProjektDetail;