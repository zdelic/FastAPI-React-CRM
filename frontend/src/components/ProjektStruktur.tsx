import React from "react";
import ProcessModelDropdown from "./ProcessModelDropdown";
import GenerateTasksButton from "./GenerateTasksButton";
import { useLoading } from "../context/LoadingContext";

type EntityType = 'bauteil' | 'stiege' | 'ebene' | 'top';

interface ProjektStrukturProps {
  newBauteil: string;
  setNewBauteil: React.Dispatch<React.SetStateAction<string>>;
  addBauteil: () => void | Promise<void>;
  bauteile: any[];
  editingNames: Record<string, string>;
  handleNameChange: (type: EntityType, id: number, value: string) => void;
  saveEdit: (type: EntityType, id: number) => void | Promise<void>;
  startEditing: (item: any, type: EntityType) => void;
  deleteItem: (type: EntityType, id: number) => void | Promise<void>;
  newStiegen: Record<number, string>;
  setNewStiegen: React.Dispatch<React.SetStateAction<Record<number, string>>>;
  addStiege: (bauteilId: number) => void | Promise<void>;
  newEbenen: Record<number, string>;
  setNewEbenen: React.Dispatch<React.SetStateAction<Record<number, string>>>;
  addEbene: (stiegeId: number) => void | Promise<void>;
  newTops: Record<number, string>;
  setNewTops: React.Dispatch<React.SetStateAction<Record<number, string>>>;
  addTop: (ebeneId: number) => void | Promise<void>;
  loadStructure: () => void | Promise<void>;
  hasTasks: boolean | null;
  handleSyncTasks: () => void | Promise<void>;
}

const ProjektStruktur: React.FC<ProjektStrukturProps> = ({
  newBauteil,
  setNewBauteil,
  addBauteil,
  bauteile,
  editingNames,
  handleNameChange,
  saveEdit,
  startEditing,
  deleteItem,
  newStiegen,
  setNewStiegen,
  addStiege,
  newEbenen,
  setNewEbenen,
  addEbene,
  newTops,
  setNewTops,
  addTop,
  loadStructure,
  hasTasks,
  handleSyncTasks,
}) => {
  return (
    // {/* Struktur - 1/3 stranice */}
    <div className="col-span-1 overflow-y-auto max-h-[80vh] pr-2">
        <div className="space-y-8">
          {/* Neues Bauteil */}
          <div className="mb-4 flex items-center gap-2">
            <input
              type="text"
              value={newBauteil}
              onChange={(e) => setNewBauteil(e.target.value)}
              placeholder="Neuer Bauteil"
              className="bg-gray-800 text-white border border-cyan-500 rounded px-3 py-1 text-sm"
            />
            <button onClick={addBauteil} className="text-cyan-400 hover:text-cyan-200">
              + Bauteil
            </button>
          </div>

          {bauteile.map((b) => (
            <div
              key={b.id}
              className="bg-gradient-to-r from-blue-950 via-slate-900 to-gray-900 text-white rounded-2xl p-6 shadow-xl backdrop-blur-md border border-blue-800/30 transition hover:scale-[1.01]"
            >
              {/* Bauteil Header */}
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <div className="flex items-center gap-3 text-xl font-bold text-cyan-300">
                    🏗
                    {editingNames[`bauteil-${b.id}`] !== undefined ? (
                      <>
                        <input
                          value={editingNames[`bauteil-${b.id}`]}
                          onChange={(e) => handleNameChange("bauteil", b.id, e.target.value)}
                          className="bg-gray-800 text-white border border-cyan-500 rounded px-3 py-1 text-sm focus:outline-none"
                        />
                        <button onClick={() => saveEdit("bauteil", b.id)}>💾</button>
                      </>
                    ) : (
                      <>
                        <span>{b.name}</span>
                        <button onClick={() => startEditing(b, "bauteil")}>✏️</button>
                      </>
                    )}
                    <button
                      onClick={() => deleteItem("bauteil", b.id)}
                      className="text-red-400 hover:text-red-600 text-xl"
                    >
                      🗑
                    </button>
                  </div>

                  <div className="text-sm text-slate-300">
                    <label className="block text-xs mb-1">Prozessmodell</label>
                    <ProcessModelDropdown
                      itemId={b.id}
                      type="bauteil"
                      selectedId={b.process_model_id}
                      onUpdated={loadStructure}
                    />
                  </div>
                </div>
              </div>

              {/* Neue Stiege */}
              <div className="mt-4 flex items-center gap-2">
                <input
                  type="text"
                  value={newStiegen[b.id] || ""}
                  onChange={(e) => setNewStiegen((prev) => ({ ...prev, [b.id]: e.target.value }))}
                  placeholder="Neue Stiege"
                  className="bg-gray-800 text-white border border-cyan-500 rounded px-3 py-1 text-sm"
                />
                <button onClick={() => addStiege(b.id)} className="text-cyan-400 hover:text-cyan-200">
                  + Stiege
                </button>
              </div>

              {/* Stiegen */}
              <div className="mt-4 space-y-4 ml-4 border-l border-cyan-700 pl-4">
                {b.stiegen?.map((s: any) => (
                  <div key={s.id}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 font-semibold text-purple-300">
                        🪜
                        {editingNames[`stiege-${s.id}`] !== undefined ? (
                          <>
                            <input
                              value={editingNames[`stiege-${s.id}`]}
                              onChange={(e) => handleNameChange("stiege", s.id, e.target.value)}
                              className="bg-gray-800 text-white border border-purple-400 rounded px-3 py-1 text-sm"
                            />
                            <button onClick={() => saveEdit("stiege", s.id)}>💾</button>
                          </>
                        ) : (
                          <>
                            <span>{s.name}</span>
                            <ProcessModelDropdown
                              itemId={s.id}
                              type="stiege"
                              selectedId={s.process_model_id}
                              onUpdated={loadStructure}
                            />
                            <button onClick={() => startEditing(s, "stiege")}>✏️</button>
                          </>
                        )}
                        <button onClick={() => deleteItem("stiege", s.id)} className="text-red-400">
                          🗑
                        </button>
                      </div>
                    </div>

                    {/* Neue Ebene */}
                    <div className="mt-2 flex items-center gap-2 ml-4">
                      <input
                        type="text"
                        value={newEbenen[s.id] || ""}
                        onChange={(e) => setNewEbenen((prev) => ({ ...prev, [s.id]: e.target.value }))}
                        placeholder="Neue Ebene"
                        className="bg-gray-800 text-white border border-indigo-400 rounded px-3 py-1 text-sm"
                      />
                      <button onClick={() => addEbene(s.id)} className="text-indigo-400 hover:text-indigo-300">
                        + Ebene
                      </button>
                    </div>

                    {/* Ebenen */}
                    <div className="mt-2 ml-4 space-y-3 border-l border-indigo-500 pl-4">
                      {s.ebenen?.map((e: any) => (
                        <div key={e.id}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-emerald-300">
                              🏢
                              {editingNames[`ebene-${e.id}`] !== undefined ? (
                                <>
                                  <input
                                    value={editingNames[`ebene-${e.id}`]}
                                    onChange={(ev) => handleNameChange("ebene", e.id, ev.target.value)}
                                    className="bg-gray-800 text-white border border-emerald-500 rounded px-3 py-1 text-sm"
                                  />
                                  
                                  <button onClick={() => saveEdit("ebene", e.id)}>💾</button>
                                </>
                              ) : (
                                <>
                                  <span>{e.name}</span>
                                  <ProcessModelDropdown
                                    itemId={e.id}
                                    type="ebene"
                                    selectedId={e.process_model_id}
                                    onUpdated={loadStructure}
                                  />
                                  <button onClick={() => startEditing(e, "ebene")}>✏️</button>
                                </>
                              )}
                              <button onClick={() => deleteItem("ebene", e.id)} className="text-red-400">
                                🗑
                              </button>
                            </div>
                          </div>

                          {/* Neue Tops */}
                          <div className="mt-2 flex items-center gap-2 ml-4">
                            <input
                              type="text"
                              value={newTops[e.id] || ""}
                              onChange={(ev) => setNewTops((prev) => ({ ...prev, [e.id]: ev.target.value }))}
                              placeholder="Neuer Top"
                              className="bg-gray-800 text-white border border-pink-400 rounded px-3 py-1 text-sm"
                            />
                            <button onClick={() => addTop(e.id)} className="text-pink-300 hover:text-pink-200">
                              + Top
                            </button>
                          </div>

                          {/* Tops */}
                          <div className="mt-2 ml-4 space-y-2 border-l border-pink-500 pl-4">
                            {e.tops?.map((t: any) => (
                              <div key={t.id} className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-pink-200">
                                  🚪
                                  {editingNames[`top-${t.id}`] !== undefined ? (
                                    <>
                                      <input
                                        value={editingNames[`top-${t.id}`]}
                                        onChange={(ev) => handleNameChange("top", t.id, ev.target.value)}
                                        className="bg-gray-800 text-white border border-pink-300 rounded px-3 py-1 text-sm"
                                      />
                                      <button onClick={() => saveEdit("top", t.id)}>💾</button>
                                    </>
                                  ) : (
                                    <>
                                      <span>{t.name}</span>
                                      <ProcessModelDropdown
                                        itemId={t.id}
                                        type="top"
                                        selectedId={t.process_model_id}
                                        onUpdated={loadStructure}
                                      />
                                      <button onClick={() => startEditing(t, "top")}>✏️</button>
                                    </>
                                  )}
                                  <button onClick={() => deleteItem("top", t.id)} className="text-red-400">
                                    🗑
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Task Kontrole */}
        <div className="mt-8 flex flex-wrap gap-4">
          {hasTasks === false && (
            <div className="bg-gradient-to-r from-emerald-500 to-cyan-500 text-white px-5 py-2 rounded-xl shadow hover:scale-105 transition cursor-pointer">
              <GenerateTasksButton />
            </div>
          )}

          <button
            onClick={handleSyncTasks}
            className="bg-gradient-to-r from-yellow-500 to-amber-400 text-black font-semibold px-6 py-2 rounded-xl shadow hover:shadow-lg hover:scale-105 transition active:scale-100"
          >
            🔄 Aufgaben synchronisieren
          </button>
        </div>
      </div>
  );
};

export default React.memo(ProjektStruktur);
