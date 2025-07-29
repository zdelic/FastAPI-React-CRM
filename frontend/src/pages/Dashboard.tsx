import React, { useEffect, useState } from "react";
import { fetchProjects, createProject } from "../api/project";
import { useNavigate } from "react-router-dom";

const Dashboard: React.FC = () => {
  const [projects, setProjects] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const navigate = useNavigate();

  const loadProjects = async () => {
    const data = await fetchProjects();
    setProjects(data);
  };

  const handleCreate = async () => {
    if (!name) return;
    await createProject({ name, description });
    setName("");
    setDescription("");
    loadProjects();
  };

  useEffect(() => {
    loadProjects();
  }, []);

  return (
    <div>
      <h2>Meine Projekte</h2>
      <div>
        <input
          type="text"
          placeholder="Projektname"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          type="text"
          placeholder="Beschreibung"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <button onClick={handleCreate}>+ Neues Projekt</button>
      </div>
      <div>
        {projects.map((p) => (
          <div
            key={p.id}
            style={{
              border: "1px solid #ccc",
              padding: "10px",
              margin: "10px",
              cursor: "pointer",
            }}
            onClick={() => navigate(`/projekt/${p.id}`)}
          >
            <h3>{p.name}</h3>
            <p>{p.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;
