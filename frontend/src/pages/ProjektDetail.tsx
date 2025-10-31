import { useNavigate, useParams, useSearchParams } from "react-router-dom";
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
import ProgressCurve from "../components/ProgressCurve";

type TabKey = "struktur" | "mitglieder" | "statistik" | "kurve";

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
  const [searchParams, setSearchParams] = useSearchParams();
  const [bauteile, setBauteile] = useState<any[]>([]);
  const [newBauteil, setNewBauteil] = useState("");
  const [startDate, setStartDate] = useState<string | null>(null);
  const [formattedDate, setFormattedDate] = useState<string>("");
  const [hasTasks, setHasTasks] = useState<boolean | null>(null);
  const [projectName, setProjectName] = useState<string>("");
  const role = React.useMemo(getRoleFromToken, []);
  const isAdmin = role === "admin";


  const changeTab = (t: TabKey) => {
    setActiveTab(t);
    const sp = new URLSearchParams(searchParams);
    sp.set("tab", t);
    setSearchParams(sp, { replace: true });
  };
  
  const tabs: { key: TabKey; label: string; show: boolean }[] = [
    { key: "struktur",   label: "Projektstruktur",    show: true },
    { key: "mitglieder", label: "Projekt-Mitglieder", show: true },
    { key: "statistik",  label: "Projektstatistik",   show: true },
    { key: "kurve",      label: "Soll–Ist Kurve",    show: true },
  ];
  
  const loadStructure = async () => {
    if (!id) return;
    try {
      const data = await fetchStructure(Number(id), { hideLoader: true });
      setBauteile(data);
      
      if (data.length > 0 && data[0].project_id) {
        try {
          const res = await api.get(`/projects/${data[0].project_id}`, {
            hideLoader: true,
          });
          setStartDate(res.data.start_date);
          setProjectName(res.data.name);

          const parsed = new Date(res.data.start_date);
          const formatted = parsed.toLocaleDateString("de-DE"); // dd.mm.yyyy
          setFormattedDate(formatted);

          
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
  }, [id]);

  useEffect(() => {
  const checkTasks = async () => {
    try {
      const res = await api.get(`/projects/${id}/has-tasks`, {
        hideLoader: true,
      });

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
      await api.post(
        `/projects/${id}/bauteil`,
        { name: newBauteil },
        { hideLoader: true }
      );

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
      await api.post(
        "/stiegen",
        { name, bauteil_id: bauteilId },
        { hideLoader: true }
      );

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
    await api.post(
      "/ebenen",
      { name, stiege_id: stiegeId },
      { hideLoader: true }
    );

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
    await api.post("/tops", { name, ebene_id: ebeneId }, { hideLoader: true });
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
  stiege: "stiegen",
  ebene: "ebenen",
  top: "tops",
};
const saveEdit = async (type: EntityType, id: number) => {
  const name = editingNames[`${type}-${id}`];
  if (!name) return;

  const path = typeToPath[type];
  if (!path) return;

  try {
    await api.put(`/${path}/${id}`, { name }, { hideLoader: true });

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
    await api.delete(`/${path}/${id}`, { hideLoader: true });
    loadStructure();
  } catch (err) {
    console.error(`Fehler beim Löschen von ${type}:`, err);
  }

};

const handleSyncTasks = async () => {
  try {
    await api.post(`/projects/${id}/sync-tasks`, undefined, {
      hideLoader: true,
    });
    // ili: await api.post(`/projects/${id}/sync-tasks`, {}, { hideLoader: true });

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
      const res = await api.get(`/projects/${id}/task-stats`, {
        hideLoader: true,
      });

      setStats(res.data);
    } catch (err) {
      console.error("Fehler beim Laden der Statistik:", err);
    }
  };
  if (id) fetchStats();
}, [id]);

const asTab = (v: string | null): TabKey =>
  v === "struktur" || v === "mitglieder" || v === "statistik" || v === "kurve"
    ? v
    : "statistik";

const urlTab = asTab(searchParams.get("tab"));
const [activeTab, setActiveTab] = React.useState<TabKey>(urlTab);

useEffect(() => setActiveTab(asTab(searchParams.get("tab"))), [searchParams]);



return (
  <div className="p-6 space-y-6">
    <div
      className="h-24 md:h-30 bg-cover bg-center"
      style={{
        backgroundImage: "url('/images/Startseite-OfficePark-2_01.png')",
      }}
    >
      <div className="h-full w-full bg-black bg-opacity-40 flex items-center justify-between px-6">
        <h1 className="text-white text-3xl md:text-3xl font-bold drop-shadow">
          🏢 Projekt-Dashboard: {projectName}{" "}
          {formattedDate ? `(${formattedDate})` : ""}
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

    {/* ---- NOVO: TOP MENI (tabs) ---- */}
    <div className="border-b border-gray-700">
      <nav className="flex gap-2">
        {tabs
          .filter((t) => t.show)
          .map((t) => (
            <button
              key={t.key}
              onClick={() => changeTab(t.key)}
              className={[
                "px-4 py-2 rounded-t-lg",
                activeTab === t.key
                  ? "bg-gray-800 text-white border-x border-t border-gray-700"
                  : "text-gray-700 hover:text-gray-300",
              ].join(" ")}
            >
              {t.label}
            </button>
          ))}
      </nav>
    </div>

    {/* ---- NOVO: SADRŽAJ PO TABU ---- */}
    {activeTab === "struktur" && (
      <div className="w-full flex justify-center">
        <div className="w-full max-w-4xl">
          <ProjektStruktur
            isAdmin={isAdmin}
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
        </div>
      </div>
    )}

    {activeTab === "mitglieder" && id && (
      <div className="w-full flex justify-center">
        <section className="w-full max-w-3xl md:max-w-4xl px-4">
          {/* px-4 da ne lijepi uz rubove na mobitelu */}
          <ProjectUsersCard projectId={Number(id)} isAdmin={isAdmin} />
        </section>
      </div>
    )}

    {activeTab === "statistik" && (
      <div>
        <ProjektStatistik stats={stats} projectId={Number(id)} />
      </div>
    )}

    {activeTab === "kurve" && id && (
      <div className="w-full flex justify-center">
        <section className="w-full max-w-6xl">
          {/* isti vizual kao u Statistik tabu */}
          <div className="rounded-xl border border-gray-700 bg-gray-900 p-6 shadow-lg">
            {/* visina kontejnera da Chart.js ima prostor */}
            <div className="h-[520px]">
              <ProgressCurve projectId={Number(id)} />
            </div>
          </div>
        </section>
      </div>
    )}
  </div>
);
};

export default ProjektDetail;