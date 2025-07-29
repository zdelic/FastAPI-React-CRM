import { useParams } from "react-router-dom";
import React, { useEffect, useState } from "react";
import { fetchStructure } from "../api/project";
import api from "../api/axios";

const ProjektDetail = () => {
  const { id } = useParams<{ id: string }>();
  
  const [bauteile, setBauteile] = useState<any[]>([]);
  const [newBauteil, setNewBauteil] = useState("");

  const loadStructure = async () => {
    if (!id) return;
    
    try {
      const data = await fetchStructure(Number(id));
      setBauteile(data);
    } catch (err) {
      console.error("Fehler beim Laden der Struktur:", err);
    }
  };


  useEffect(() => {
    loadStructure();
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

  return (
    <div>
      <h2>Projekt-Struktur</h2>

      <input
        type="text"
        value={newBauteil}
        onChange={(e) => setNewBauteil(e.target.value)}
        placeholder="Neuer Bauteil"
      />
      <button onClick={addBauteil}>+ Bauteil</button>

      <div>
        {bauteile.map((b) => (
          <div key={b.id}>
            <h3>{b.name}</h3>
            {/* Tu ćeš kasnije umetati Stiege, Ebene, itd. */}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProjektDetail;
