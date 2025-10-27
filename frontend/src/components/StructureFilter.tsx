import React, { useEffect, useMemo, useState } from "react";

/** === TIPOVI === */
interface Task {
  bauteil: string | null;
  stiege: string | null;
  ebene: string | null;
  top: string | null;

  // ključno: ID-jevi koji već dolaze iz backend timeline payload-a
  top_id: number | null;
  stiege_id?: number | null;
  ebene_id?: number | null;
  bauteil_id?: number | null;
}

interface StructureFilterProps {
  tasks: Task[];
  /** iz parenta dolazi skup odabranih TOP ID-jeva */
  selectedTopIds: number[];
  setSelectedTopIds: (val: number[]) => void;
}

/** Helperi */
const uniq = <T,>(arr: T[]) => Array.from(new Set(arr));
const byNat = (a: string, b: string) =>
  a.localeCompare(b, undefined, { numeric: true });

type TopItem = { id: number; label: string };
type Structure = Record<string, Record<string, Record<string, TopItem[]>>>;

/** === GRAĐENJE HIJERARHIJE === */
const buildStructure = (tasks: Task[]): Structure => {
  const acc: Structure = {};
  for (const t of tasks) {
    const b = t.bauteil ?? "—";
    const s = t.stiege ?? "—";
    const e = t.ebene ?? "—";
    const id = t.top_id ?? -1;
    const label = t.top ?? `Top-${id}`;

    if (id === -1) continue; // bez TOP-a nema smisla

    if (!acc[b]) acc[b] = {};
    if (!acc[b][s]) acc[b][s] = {};
    if (!acc[b][s][e]) acc[b][s][e] = [];

    // spriječi duplikate istog ID-a
    if (!acc[b][s][e].some((x) => x.id === id)) {
      acc[b][s][e].push({ id, label });
    }
  }

  // sortiranje po prirodnom poretku naziva (samo za prikaz)
  for (const b of Object.keys(acc)) {
    for (const s of Object.keys(acc[b])) {
      for (const e of Object.keys(acc[b][s])) {
        acc[b][s][e].sort((A, B) => byNat(A.label, B.label));
      }
    }
  }
  return acc;
};

const mergeAdd = (base: number[], add: number[]) => uniq(base.concat(add));
const mergeRemove = (base: number[], remove: number[]) =>
  base.filter((t) => !remove.includes(t));

/** Status nad skupom TOP-ova: checked/indeterminate */
const selectionStatus = (descTopIds: number[], selected: number[]) => {
  const total = descTopIds.length;
  if (total === 0) return { checked: false, indeterminate: false };
  const selectedCount = descTopIds.reduce(
    (n, id) => n + (selected.includes(id) ? 1 : 0),
    0
  );
  return {
    checked: selectedCount === total,
    indeterminate: selectedCount > 0 && selectedCount < total,
  };
};

const sameSet = (a: number[], b: number[]) => {
  if (a.length !== b.length) return false;
  const A = new Set(a);
  for (const x of b) if (!A.has(x)) return false;
  return true;
};

const StructureFilter: React.FC<StructureFilterProps> = ({
  tasks,
  selectedTopIds,
  setSelectedTopIds,
}) => {
  // 0) LOKALNI DRAFT
  const [draft, setDraft] = useState<number[]>(selectedTopIds);
  useEffect(() => {
    setDraft(selectedTopIds);
  }, [selectedTopIds]);

  /** 1) Hijerarhija */
  const structure = useMemo(() => buildStructure(tasks), [tasks]);

  /** 2) Helperi: skup potomaka (TOP ID-jevi) */
  const topIdsInEbene = (b: string, s: string, e: string) =>
    (structure[b]?.[s]?.[e] ?? []).map((t) => t.id);

  const topIdsInStiege = (b: string, s: string) =>
    Object.values(structure[b]?.[s] ?? {})
      .flat()
      .map((t) => t.id);

  const topIdsInBauteil = (b: string) =>
    Object.values(structure[b] ?? {})
      .flatMap((e) => Object.values(e).flat())
      .map((t) => t.id);

  /** 3) Toggle handleri — rade nad draftom (po ID-ju) */
  const toggleBauteil = (b: string, checked: boolean) => {
    const ids = topIdsInBauteil(b);
    setDraft((prev) =>
      checked ? mergeAdd(prev, ids) : mergeRemove(prev, ids)
    );
  };

  const toggleStiege = (b: string, s: string, checked: boolean) => {
    const ids = topIdsInStiege(b, s);
    setDraft((prev) =>
      checked ? mergeAdd(prev, ids) : mergeRemove(prev, ids)
    );
  };

  const toggleEbene = (b: string, s: string, e: string, checked: boolean) => {
    const ids = topIdsInEbene(b, s, e);
    setDraft((prev) =>
      checked ? mergeAdd(prev, ids) : mergeRemove(prev, ids)
    );
  };

  const toggleTop = (id: number, checked: boolean) => {
    setDraft((prev) =>
      checked ? mergeAdd(prev, [id]) : prev.filter((x) => x !== id)
    );
  };

  // helper za indeterminate
  const setIndeterminate =
    (val: boolean): React.RefCallback<HTMLInputElement> =>
    (el) => {
      if (el) el.indeterminate = val;
    };

  // 4) UI akcije
  const apply = () => setSelectedTopIds(draft);
  const cancel = () => setDraft(selectedTopIds);
  const clearLocal = () => setDraft([]);

  const dirty = !sameSet(draft, selectedTopIds);

  /** 5) Render */
  return (
    <div className="space-y-4 text-sm">
      {/* Kontrole */}
      <div className="flex items-center gap-2">
        <button
          className={
            "px-3 py-1 text-xs rounded border " +
            (dirty
              ? "bg-blue-600 text-white border-blue-600"
              : "hover:bg-gray-100")
          }
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
        {!dirty && (
          <span className="text-xs text-gray-500 ml-2">
            Alle Auswahlen angewendet.
          </span>
        )}
      </div>

      {Object.keys(structure)
        .sort(byNat)
        .map((bauteil) => {
          const bIds = topIdsInBauteil(bauteil);
          const bState = selectionStatus(bIds, draft);

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

              {Object.keys(structure[bauteil])
                .sort(byNat)
                .map((stiege) => {
                  const sIds = topIdsInStiege(bauteil, stiege);
                  const sState = selectionStatus(sIds, draft);

                  return (
                    <div key={stiege} className="ml-6">
                      <label className="text-cyan-600 font-semibold mb-1 flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={sState.checked}
                          ref={setIndeterminate(sState.indeterminate)}
                          onChange={(e) =>
                            toggleStiege(bauteil, stiege, e.target.checked)
                          }
                        />
                        <span>🧱 {stiege}</span>
                      </label>

                      {Object.keys(structure[bauteil][stiege])
                        .sort(byNat)
                        .map((ebene) => {
                          const eIds = topIdsInEbene(bauteil, stiege, ebene);
                          const eState = selectionStatus(eIds, draft);

                          return (
                            <div key={ebene} className="ml-8">
                              <label className="text-cyan-500 font-medium mb-1 flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={eState.checked}
                                  ref={setIndeterminate(eState.indeterminate)}
                                  onChange={(ev) =>
                                    toggleEbene(
                                      bauteil,
                                      stiege,
                                      ebene,
                                      ev.target.checked
                                    )
                                  }
                                />
                                <span>🏢 {ebene}</span>
                              </label>

                              <div className="ml-6 flex flex-wrap gap-4">
                                {(structure[bauteil][stiege][ebene] ?? []).map(
                                  (t) => (
                                    <label
                                      key={t.id}
                                      className="flex items-center gap-2"
                                    >
                                      <input
                                        type="checkbox"
                                        checked={draft.includes(t.id)}
                                        onChange={(ev) =>
                                          toggleTop(t.id, ev.target.checked)
                                        }
                                      />
                                      <span>{t.label}</span>
                                    </label>
                                  )
                                )}
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
