import React, { useEffect, useState } from "react";
import { fetchProjects, createProject } from "../api/project";
import { useNavigate, Link, NavLink } from "react-router-dom";

import { PlusCircle, FolderKanban, AlertCircle, CalendarDays, Home, Users } from "lucide-react";

type Role = "admin" | "bauleiter" | "polier" | "sub";

function getRoleFromToken(): Role | null {
  const token = localStorage.getItem("token");
  if (!token) return null;
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const json = atob(base64);
    const payload = JSON.parse(json) as { role?: Role };
    return (payload.role ?? null) as Role | null;
  } catch {
    return null;
  }
}


const Dashboard: React.FC = () => {
  const [projects, setProjects] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const [showForm, setShowForm] = useState(false);
  const isAdmin = React.useMemo(() => getRoleFromToken() === "admin", []);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const data = await fetchProjects();
      setProjects(data);
    } catch (err) {
      setError("Fehler beim Laden der Projekte.");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return null;

    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();

    return `${day}.${month}.${year}`;
  };


  const handleCreate = async () => {
    if (!name.trim()) {
      setError("Projektname ist erforderlich.");
      return;
    }

    if (description.length < 10) {
      setError("Beschreibung muss mindestens 10 Zeichen lang sein.");
      return;
    }

    try {
      await createProject({ name, description, start_date: startDate });
      setName("");
      setDescription("");
      setStartDate("");
      setError("");
      loadProjects();
    } catch {
      setError("Fehler beim Erstellen des Projekts.");
    }
  };

  useEffect(() => {
    loadProjects();
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
          <h1 className="text-white text-3xl md:text-4xl font-bold drop-shadow">📁 Projektübersicht</h1>
        </div>
      </div>
      
      <div className="max-w-4xl mx-auto p-6">
        {/* Error */}
        {error && (
          <div className="flex items-center text-red-600 mb-4 text-sm">
            <AlertCircle className="w-4 h-4 mr-2" />
            {error}
          </div>
        )}

        {/* Toggle Header with "Zu den Prozessmodellen" */}
  {isAdmin && (
    <nav className="mb-4">
      <div className="flex items-center justify-between rounded-2xl border bg-white/80 backdrop-blur px-3 py-2 shadow-sm">
        {/* lijeva strana: linkovi */}
        <div className="flex items-center gap-1">
          <NavLink
            to="/dashboard"
            className={({ isActive }) =>
              [
                "inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition",
                isActive
                  ? "bg-blue-50 text-blue-700"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50",
              ].join(" ")
            }
          >
            <Home size={18} />
            <span></span>
          </NavLink>

          <NavLink
            to="/users"
            className={({ isActive }) =>
              [
                "inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition",
                isActive
                  ? "bg-blue-50 text-blue-700"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50",
              ].join(" ")
            }
          >
            <Users size={18} />
            <span>Users</span>
          </NavLink>

          <NavLink
            to="/prozessmodelle"
            className={({ isActive }) =>
              [
                "inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition",
                isActive
                  ? "bg-blue-50 text-blue-700"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50",
              ].join(" ")
            }
          >
            <FolderKanban size={18} />
            <span>Prozessmodelle</span>
          </NavLink>
        </div>

        {/* desna strana: akcijsko dugme */}
        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow hover:bg-blue-700 active:scale-[0.99]"
        >
          <PlusCircle size={18} />
          Neues Projekt
        </button>
      </div>
    </nav>
  )}

  {/* Animated Form */}
  <div
    className={`transition-all duration-500 overflow-hidden ${
      showForm ? "max-h-[1000px] opacity-100" : "max-h-0 opacity-0"
    }`}
  >
    <div className="bg-white rounded-lg shadow-md p-6 space-y-4 mb-8">
      <div className="flex gap-4 flex-col md:flex-row">
        <input
          type="text"
          placeholder="Projektname"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full border p-2 rounded"
        />
        <div className="w-full">
          <label className="block text-sm text-gray-600 mb-1">Startdatum</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full border p-2 rounded"
          />
        </div>
      </div>

      <textarea
        placeholder="Beschreibung (min. 10 Zeichen)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="w-full border p-2 rounded"
      />

      <div className="flex items-center justify-between">
        <button
          onClick={handleCreate}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
        >
          <PlusCircle size={18} /> Projekt erstellen
        </button>
        
      </div>
    </div>
  </div>


        {loading ? (
          <p className="text-gray-600">Lade Projekte...</p>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {projects.map((p) => (
              <div
                key={p.id}
                onClick={() => navigate(`/projekt/${p.id}`)}
                className="relative group rounded-2xl overflow-hidden shadow-xl cursor-pointer transform hover:scale-[1.02] transition duration-300 min-h-[220px]"
              >
                {/* Background image */}
                <div
                  className="absolute inset-0 bg-cover bg-center"
                  style={{ backgroundImage: "url('/images/Startseite-Winarsky_01.png')" }}
                ></div>

                {/* Dark gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent group-hover:via-black/70 transition duration-300"></div>

                {/* Content */}
                <div className="relative z-10 p-6 text-white flex flex-col h-full justify-between">
                  <div>
                    <h3 className="text-2xl font-bold mb-2 drop-shadow-lg">{p.name}</h3>
                    <p className="text-base font-medium text-gray-100 drop-shadow-sm line-clamp-3">
                      {p.description}
                    </p>
                  </div>
                  <div className="flex items-center text-sm text-gray-200 mt-4 font-semibold">
                    <CalendarDays size={22} className="mr-2" />
                    {formatDate(p.start_date) || "Kein Datum"}

                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
};

export default Dashboard;
