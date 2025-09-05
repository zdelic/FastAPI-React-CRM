
import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api/axios";

const GenerateTasksButton: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const handleGenerateTasks = async () => {
    if (!id) return;
    try {
      await api.post(`/projects/${id}/generate-tasks`, undefined, { meta: { showLoader: true } });
      alert("Aufgaben wurden generiert.");
      navigate(`/projekt/${id}/timeline`);
    } catch (err) {
      console.error("Fehler beim Generieren der Aufgaben:", err);
      alert("Es ist ein Fehler aufgetreten.");
    }
  };

  return (
    <div style={{ marginTop: "2rem", textAlign: "center" }}>
      <button
        onClick={handleGenerateTasks}
        style={{
          padding: "12px 24px",
          fontSize: "16px",
          backgroundColor: "#1976d2",
          color: "white",
          border: "none",
          borderRadius: "8px",
          cursor: "pointer",
          boxShadow: "0px 4px 6px rgba(0, 0, 0, 0.1)",
          transition: "background-color 0.3s ease"
        }}
        onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "#115293")}
        onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "#1976d2")}
      >
        🛠 Generiere Tasks
      </button>
    </div>
  );
};

export default GenerateTasksButton;
