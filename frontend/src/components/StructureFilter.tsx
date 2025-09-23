import React, { useEffect, useMemo, useState } from "react";

interface Task {
  bauteil: string;
  stiege: string;
  ebene: string;
  top: string;
}

interface StructureFilterProps {
  tasks: Task[];
  selectedTops: string[];
  setSelectedTops: (val: string[]) => void;
}

/** Helperi */
const uniq = <T,>(arr: T[]) => Array.from(new Set(arr));
const byNat = (a: string, b: string) => a.localeCompare(b, undefined, { numeric: true });

type Structure = Record<string, Record<string, Record<string, string[]>>>;

const buildStructure = (tasks: Task[]): Structure => {
  const acc: Structure = {};
  for (const t of tasks) {
    const b = t.bauteil || "—";
    const s = t.stiege || "—";
    const e = t.ebene || "—";
    const top = t.top;
    if (!acc[b]) acc[b] = {};
    if (!acc[b][s]) acc[b][s] = {};
    if (!acc[b][s][e]) acc[b][s][e] = [];
    if (top && !acc[b][s][e].includes(top)) acc[b][s][e].push(top);
  }
  for (const b of Object.keys(acc)) {
    for (const s of Object.keys(acc[b])) {
      for (const e of Object.keys(acc[b][s])) {
        acc[b][s][e].sort(byNat);
      }
    }
  }
  return acc;
};

const mergeAdd = (base: string[], add: string[]) => uniq(base.concat(add));
const mergeRemove = (base: string[], remove: string[]) => base.filter((t) => !remove.includes(t));

/** Status nad skupom TOP-ova: checked/indeterminate */
const selectionStatus = (descTops: string[], selected: string[]) => {
  const total = descTops.length;
  if (total === 0) return { checked: false, indeterminate: false };
  const selectedCount = descTops.reduce((n, t) => n + (selected.includes(t) ? 1 : 0), 0);
  return {
    checked: selectedCount === total,
    indeterminate: selectedCount > 0 && selectedCount < total,
  };
};

const sameSet = (a: string[], b: string[]) => {
  if (a.length !== b.length) return false;
  const A = new Set(a);
  for (const x of b) if (!A.has(x)) return false;
  return true;
};

const StructureFilter: React.FC<StructureFilterProps> = ({
  tasks,
  selectedTops,
  setSelectedTops,
}) => {
  // 0) LOKALNI DRAFT: klikovi mijenjaju samo draft; “Primijeni” šalje parentu
  const [draft, setDraft] = useState<string[]>(selectedTops);
  useEffect(() => {
    // sinkronizuj kad parent promijeni (npr. Reset alle Filter)
    setDraft(selectedTops);
  }, [selectedTops]);

  /** 1) Hijerarhija */
  const structure = useMemo(() => buildStructure(tasks), [tasks]);

  /** 2) Helperi: skup potomaka (TOP-ova) */
  const topsInEbene = (b: string, s: string, e: string) => structure[b]?.[s]?.[e] ?? [];
  const topsInStiege = (b: string, s: string) => Object.values(structure[b]?.[s] ?? {}).flat();
  const topsInBauteil = (b: string) =>
    Object.values(structure[b] ?? {}).flatMap((e) => Object.values(e).flat());

  /** 3) Toggle handleri — rade nad draftom */
  const toggleBauteil = (b: string, checked: boolean) => {
    const tops = topsInBauteil(b);
    setDraft((prev) => (checked ? mergeAdd(prev, tops) : mergeRemove(prev, tops)));
  };

  const toggleStiege = (b: string, s: string, checked: boolean) => {
    const tops = topsInStiege(b, s);
    setDraft((prev) => (checked ? mergeAdd(prev, tops) : mergeRemove(prev, tops)));
  };

  const toggleEbene = (b: string, s: string, e: string, checked: boolean) => {
    const tops = topsInEbene(b, s, e);
    setDraft((prev) => (checked ? mergeAdd(prev, tops) : mergeRemove(prev, tops)));
  };

  const toggleTop = (top: string, checked: boolean) => {
    setDraft((prev) => (checked ? mergeAdd(prev, [top]) : prev.filter((t) => t !== top)));
  };

  // helper za indeterminate checkbox ref
  const setIndeterminate =
    (val: boolean): React.RefCallback<HTMLInputElement> =>
    (el) => {
      if (el) el.indeterminate = val;
    };

  // 4) UI akcije
  const apply = () => setSelectedTops(draft);
  const cancel = () => setDraft(selectedTops);
  const clearLocal = () => setDraft([]);

  const dirty = !sameSet(draft, selectedTops);

  /** 5) Render */
  return (
    <div className="space-y-4 text-sm">
      {/* Kontrole za serijsko biranje bez refetcha */}
      <div className="flex items-center gap-2">
        <button
          className={"px-3 py-1 text-xs rounded border " + (dirty ? "bg-blue-600 text-white border-blue-600" : "hover:bg-gray-100")}
          onClick={apply}
          disabled={!dirty}
          title={dirty ? "Ausgewählte Elemente anwenden" : "Keine Änderungen"}
        >
          Anwenden
        </button>
        <button
          className="px-3 py-1 text-xs rounded border hover:bg-gray-100"
          onClick={cancel}
          disabled={!dirty}
          title="Zurück zur aktuell aktiven Auswahl"
        >
          Stornieren
        </button>
        <button
          className="px-3 py-1 text-xs rounded border hover:bg-gray-100"
          onClick={clearLocal}
          title="Lokale Auswahl löschen (Filter nicht sofort senden)"
        >
          Lokal löschen
        </button>
        {!dirty && <span className="text-xs text-gray-500 ml-2">Alle Auswahlen angewendet.</span>}
      </div>

      {Object.keys(structure).sort(byNat).map((bauteil) => {
        const bTops = topsInBauteil(bauteil);
        const bState = selectionStatus(bTops, draft);

        return (
          <div key={bauteil}>
            <label className="font-bold text-cyan-700 mb-1 flex items-center gap-2">
              <input
                type="checkbox"
                checked={bState.checked}
                ref={setIndeterminate(bState.indeterminate)}
                onChange={(e) => toggleBauteil(bauteil, e.target.checked)}
              />
              <span>🏗 {bauteil}</span>
            </label>

            {Object.keys(structure[bauteil]).sort(byNat).map((stiege) => {
              const sTops = topsInStiege(bauteil, stiege);
              const sState = selectionStatus(sTops, draft);

              return (
                <div key={stiege} className="ml-6">
                  <label className="text-cyan-600 font-semibold mb-1 flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={sState.checked}
                      ref={setIndeterminate(sState.indeterminate)}
                      onChange={(e) => toggleStiege(bauteil, stiege, e.target.checked)}
                    />
                    <span>🧱 {stiege}</span>
                  </label>

                  {Object.keys(structure[bauteil][stiege]).sort(byNat).map((ebene) => {
                    const eTops = topsInEbene(bauteil, stiege, ebene);
                    const eState = selectionStatus(eTops, draft);

                    return (
                      <div key={ebene} className="ml-8">
                        <label className="text-cyan-500 font-medium mb-1 flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={eState.checked}
                            ref={setIndeterminate(eState.indeterminate)}
                            onChange={(ev) => toggleEbene(bauteil, stiege, ebene, ev.target.checked)}
                          />
                          <span>🏢 {ebene}</span>
                        </label>

                        <div className="ml-6 flex flex-wrap gap-4">
                          {eTops.map((top) => (
                            <label key={top} className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={draft.includes(top)}
                                onChange={(ev) => toggleTop(top, ev.target.checked)}
                              />
                              <span>{top}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
};

export default StructureFilter;
