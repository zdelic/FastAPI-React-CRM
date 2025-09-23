import React, { useEffect, useState } from "react";
import api from "../api/axios";

interface ProcessModel { id: number; name: string; }

interface Props {
  itemId: number;
  type: "bauteil" | "stiege" | "ebene" | "top";
  selectedId: number | null;
  selectedName?: string;
  disabled?: boolean;

  // IMMEDIATE mod (backward compatible): odmah piše u DB
  onUpdated?: () => void | Promise<void>;

  // PREVIEW mod: ne piše u DB, samo vrati izbor roditelju
  onSelect?: (newId: number | null) => void;

  // Ako je true => PREVIEW; ako false/undefined => IMMEDIATE
  deferCommit?: boolean;
}

const typeToPath: Record<Props["type"], string> = {
  bauteil: "bauteile",        // prilagodi ako je /bauteile
  stiege:  "stiegen",
  ebene:   "ebenen",
  top:     "tops",
};

const ProcessModelDropdown: React.FC<Props> = ({
  itemId,
  type,
  selectedId,
  selectedName,
  disabled = false,
  onUpdated,    // IMMEDIATE
  onSelect,     // PREVIEW
  deferCommit = false,
}) => {
  const [models, setModels] = useState<ProcessModel[]>([]);
  const [selected, setSelected] = useState<number | null>(selectedId ?? null);

  useEffect(() => setSelected(selectedId ?? null), [selectedId]);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get("/process-models");
        const list = (res.data ?? []).map((m: any) => ({
          id: Number(m.id), name: String(m.name ?? "")
        }));
        setModels(list);
      } catch (err) {
        console.error("Fehler beim Laden der Modelle:", err);
      }
    })();
  }, []);

  // READ ONLY
  if (disabled) {
    const label = selectedName
      ?? models.find(m => m.id === Number(selected))?.name
      ?? "—";
    return (
      <div className="inline-flex items-center rounded-md bg-slate-800/70 px-3 py-1.5 text-sm text-slate-200 border border-slate-600" aria-disabled="true">
        {label}
      </div>
    );
  }

  // EDIT
  const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const raw = e.target.value;
    const newId = raw === "" ? null : Number(raw);
    setSelected(newId);

    // PREVIEW (deferred commit): samo javi roditelju
    if (deferCommit) {
      onSelect?.(newId);
      return;
    }

    // IMMEDIATE (stari način): odmah piši u DB pa refetchaj
    try {
      const collection = typeToPath[type];
      // Ako server traži full-update s name:
      const res = await api.get(`/${collection}/${itemId}`);
      const name = res.data?.name ?? "";
      await api.put(`/${collection}/${itemId}`, {
        name,                 // ukloni ako backend prima partial
        process_model_id: newId,
      });
      await onUpdated?.();
    } catch (err) {
      console.error("Greška pri ažuriranju modela:", err);
    }
  };

  return (
    <select
      value={selected === null ? "" : String(selected)}
      onChange={handleChange}
      className="rounded-md bg-slate-800 text-slate-100 px-3 py-1.5 text-sm border border-slate-600 hover:border-slate-500"
    >
      <option value="">-- PM wählen --</option>
      {models.map(m => (
        <option key={m.id} value={String(m.id)}>{m.name}</option>
      ))}
    </select>
  );
};

export default ProcessModelDropdown;
