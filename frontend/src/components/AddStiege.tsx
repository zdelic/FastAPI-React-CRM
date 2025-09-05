import React, { useState } from "react";
import api from "../api/axios";

const AddStiege = ({ bauteilId, onAdded }: { bauteilId: number; onAdded: () => void }) => {
  const [name, setName] = useState("");

  const handleAdd = async () => {
    if (!name) return;
    await api.post("/stiegen", { name, bauteil_id: bauteilId });
    setName("");
    onAdded();
  };

  return (
    <div>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Neue Stiege"
      />
      <button onClick={handleAdd}>+ Stiege</button>
    </div>
  );
};

export default AddStiege;
