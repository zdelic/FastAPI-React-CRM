import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api/axios";

type Props = {
  // npr. { 12: "2025-11-03", 13: "2025-11-10" }
  startMapTop?: Record<number, string> | Record<string, string>;
};

const GenerateTasksButton: React.FC<Props> = ({ startMapTop }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = React.useState(false);

  const handleGenerateTasks = async () => {
    if (!id || loading) return;
    setLoading(true);

    // normalizuj u { [topId:string]: "YYYY-MM-DD" }
    const normalizedTopMap: Record<string, string> = {};
    if (startMapTop) {
      for (const [k, v] of Object.entries(startMapTop)) {
        if (v) normalizedTopMap[String(k)] = String(v).slice(0, 10);
      }
    }

    const body =
      Object.keys(normalizedTopMap).length > 0
        ? { start_map: { top: normalizedTopMap } }
        : {}; // pošalji prazno tijelo ako nema mape

    try {
      await api.post(`/projects/${id}/generate-tasks`, body, {
        meta: { showLoader: true },
      });
      alert("Aufgaben wurden generiert.");
      navigate(`/projekt/${id}/timeline`);
    } catch (err) {
      console.error("Fehler beim Generieren der Aufgaben:", err);
      alert("Es ist ein Fehler aufgetreten.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ marginTop: "2rem", textAlign: "center" }}>
      <button
        onClick={handleGenerateTasks}
        disabled={loading}
        style={{
          padding: "12px 24px",
          fontSize: "16px",
          backgroundColor: loading ? "#9ca3af" : "#1976d2",
          color: "white",
          border: "none",
          borderRadius: "8px",
          cursor: loading ? "not-allowed" : "pointer",
          boxShadow: "0px 4px 6px rgba(0, 0, 0, 0.1)",
          transition: "background-color 0.3s ease",
        }}
        onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "#115293")}
        onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "#1976d2")}
      >
        {loading ? "⏳ Generiere…" : "🛠 Generiere Tasks"}
      </button>
    </div>
  );
};

export default GenerateTasksButton;
