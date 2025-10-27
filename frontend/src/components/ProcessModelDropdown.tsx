// src/components/ProcessModelDropdown.tsx
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
  selectedName?: string;
  disabled?: boolean;

  // IMMEDIATE mod (backward compatible): odmah piše u DB
  onUpdated?: () => void | Promise<void>;

  // PREVIEW mod: ne piše u DB, samo vrati izbor roditelju
  onSelect?: (newId: number | null) => void;

  // Ako je true => PREVIEW; ako false/undefined => IMMEDIATE
  deferCommit?: boolean;

  // 🆕 floating label i širina/wrap
  label?: string;
  widthClass?: string; // npr. "w-[220px]" ili "w-full"
  className?: string; // dodatne klase za <select>
}

const typeToPath: Record<Props["type"], string> = {
  bauteil: "bauteile",
  stiege: "stiegen",
  ebene: "ebenen",
  top: "tops",
};

const ProcessModelDropdown: React.FC<Props> = ({
  itemId,
  type,
  selectedId,
  selectedName,
  disabled = false,
  onUpdated,
  onSelect,
  deferCommit = false,
  label, // 🆕
  widthClass = "w-[220px]", // 🆕
  className = "", // 🆕
}) => {
  const [models, setModels] = useState<ProcessModel[]>([]);
  const [selected, setSelected] = useState<number | null>(selectedId ?? null);

  useEffect(() => setSelected(selectedId ?? null), [selectedId]);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get("/process-models");
        const list = (res.data ?? []).map((m: any) => ({
          id: Number(m.id),
          name: String(m.name ?? ""),
        }));
        setModels(list);
      } catch (err) {
        console.error("Fehler beim Laden der Modelle:", err);
      }
    })();
  }, []);

  // prikaz labele (isti stil kao kod datepickera)
  const LabelEl = label ? (
    <span className="pointer-events-none absolute left-3 top-1 text-[10px] leading-none tracking-wide text-slate-400 z-10">
      {label}
    </span>
  ) : null;

  // READ ONLY
  if (disabled) {
    const readLabel =
      selectedName ??
      models.find((m) => m.id === Number(selected))?.name ??
      "—";

      return (
        <div className={`relative inline-block ${widthClass}`}>
          {LabelEl}
          <div
            className="inline-flex w-full items-center rounded-md bg-slate-800/70 px-3 pr-9 py-1.5 text-sm text-slate-200 border border-slate-600 pt-5"
            aria-disabled="true"
            style={{ minHeight: 32 }}
          >
            {readLabel}
          </div>
        </div>
      );
      
  }

  // EDIT
  const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const raw = e.target.value;
    const newId = raw === "" ? null : Number(raw);
    setSelected(newId);

    if (deferCommit) {
      onSelect?.(newId);
      return;
    }

    try {
      const collection = typeToPath[type];
      const res = await api.get(`/${collection}/${itemId}`);
      const name = res.data?.name ?? "";
      await api.put(`/${collection}/${itemId}`, {
        name,
        process_model_id: newId,
      });
      await onUpdated?.();
    } catch (err) {
      console.error("Greška pri ažuriranju modela:", err);
    }
  };

  return (
    <div className={`relative inline-block ${widthClass}`}>
      {LabelEl}
      <select
        value={selected === null ? "" : String(selected)}
        onChange={handleChange}
        className={
          "w-full rounded-md bg-slate-800/60 text-slate-100 px-3 pr-9 text-sm " +
          "border border-slate-600 hover:border-slate-500 " +
          "pt-5 pb-1.5" + // 👈 prostor za “floating” label UNUTRA
          (className ? " " + className : "")
        }
        style={{ minHeight: 30 }}
      >
        <option value="">-- PM wählen --</option>
        {models.map((m) => (
          <option key={m.id} value={String(m.id)}>
            {m.name}
          </option>
        ))}
      </select>
    </div>
  );
  
};

export default ProcessModelDropdown;
