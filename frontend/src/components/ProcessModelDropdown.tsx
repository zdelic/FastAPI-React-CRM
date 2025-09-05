
import React, { useEffect, useState } from "react";
import api from "../api/axios";

interface ProcessModel {
  id: number;
  name: string;
}

interface Props {
  itemId: number;
  type: "bauteil" | "stiege" | "ebene" | "top";
  selectedId: number | null;
  onUpdated: () => void;
}

const ProcessModelDropdown: React.FC<Props> = ({
  itemId,
  type,
  selectedId,
  onUpdated,
}) => {
  const [models, setModels] = useState<ProcessModel[]>([]);
  const [selected, setSelected] = useState<number | null>(selectedId ?? null);

  useEffect(() => {
    setSelected(selectedId ?? null);
  }, [selectedId]);

  const fetchModels = async () => {
    try {
      const res = await api.get("/process-models");
      setModels(res.data);
    } catch (err) {
      console.error("Fehler beim Laden der Modelle:", err);
    }
  };

  const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newId = parseInt(e.target.value);
    try {
      const res = await api.get(`/${type}s/${itemId}`);
      const name = res.data.name;

      await api.put(`/${type}s/${itemId}`, {
        name: name,
        process_model_id: isNaN(newId) ? null : newId,
      });

      setSelected(isNaN(newId) ? null : newId);
      onUpdated();
    } catch (err) {
      console.error("Greška pri ažuriranju modela:", err);
    }
  };

  useEffect(() => {
    fetchModels();
  }, []);

  return (
    <select value={selected?.toString() ?? ""} onChange={handleChange}>
      <option value="">-- PM wählen --</option>
      {models.map((m) => (
        <option key={m.id} value={m.id.toString()}>
          {m.name}
        </option>
      ))}
    </select>
  );
};

export default ProcessModelDropdown;
