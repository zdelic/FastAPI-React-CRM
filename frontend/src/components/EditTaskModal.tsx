import React, { useEffect, useState } from "react";

interface EditTaskModalProps {
  task: any | null;
  onClose: () => void;
  onSave: (updated: any) => Promise<void> | void;
  onDelete?: (taskId: number | string) => Promise<void> | void;
}

const EditTaskModal: React.FC<EditTaskModalProps> = ({ task, onClose, onSave, onDelete }) => {
  const [startIst, setStartIst] = useState("");
  const [endIst, setEndIst] = useState("");
  const [startSoll, setStartSoll] = useState("");
  const [endSoll, setEndSoll] = useState("");
  const [beschreibung, setBeschreibung] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (task) {
      setStartIst(task.start_ist || "");
      setEndIst(task.end_ist || "");
      setStartSoll(task.start_soll || "");
      setEndSoll(task.end_soll || "");
      setBeschreibung(task.beschreibung || "");
    }
  }, [task]);

  const handleSubmit = async () => {
    if (!task) return;
    const updatedTask = {
      ...task,
      start_ist: startIst || null,
      end_ist: endIst || null,
      start_soll: startSoll || null,
      end_soll: endSoll || null,
      beschreibung: beschreibung || "",
      status: endIst ? "done" : startIst ? "in_progress" : "offen",
    };
    await Promise.resolve(onSave(updatedTask));
    onClose();
  };

  const handleDelete = async () => {
    if (!task?.id || !onDelete) return;
    const name = task?.title ?? task?.name ?? `#${task.id}`;
    if (!window.confirm(`Task "${name}" wirklich löschen?`)) return;

    try {
      setDeleting(true);
      await onDelete(task.id);
      onClose();
    } catch (e) {
      console.error("Delete failed:", e);
      alert("Löschen fehlgeschlagen.");
    } finally {
      setDeleting(false);
    }
  };

  if (!task) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50" />
      <div
        className="relative z-10 w-full max-w-lg rounded-lg bg-white p-6 shadow"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Schließen"
          className="absolute right-3 top-3 text-gray-500 hover:text-gray-700"
          title="Schließen"
        >
          ×
        </button>

        <h2 className="mb-4 break-words text-xl font-bold" title={task?.title ?? task?.name ?? ""}>
          📝 {task?.title ?? task?.name ?? "Task"}
        </h2>

        <label className="mb-2 block">Start Soll</label>
        <input type="date" value={startSoll} onChange={(e) => setStartSoll(e.target.value)} className="mb-4 w-full rounded border p-2" />

        <label className="mb-2 block">End Soll</label>
        <input type="date" value={endSoll} onChange={(e) => setEndSoll(e.target.value)} className="mb-4 w-full rounded border p-2" />

        <label className="mb-2 block">Start Ist</label>
        <input type="date" value={startIst} onChange={(e) => setStartIst(e.target.value)} className="mb-4 w-full rounded border p-2" />

        <label className="mb-2 block">End Ist</label>
        <input type="date" value={endIst} onChange={(e) => setEndIst(e.target.value)} className="mb-4 w-full rounded border p-2" />

        <label className="mb-2 block">Beschreibung</label>
        <textarea
          value={beschreibung}
          onChange={(e) => setBeschreibung(e.target.value)}
          rows={3}
          className="mb-4 w-full resize-y rounded border p-2"
          placeholder="Optionaler Kommentar / Beschreibung…"
        />

        <div className="mt-4 flex items-center justify-between">
          <button
            type="button"
            onClick={handleDelete}
            disabled={!onDelete || !task?.id || deleting}
            className="rounded bg-red-600 px-4 py-2 text-white disabled:opacity-50"
          >
            {deleting ? "Lösche..." : "Löschen"}
          </button>

          <div className="flex gap-3">
            <button onClick={onClose} className="rounded bg-gray-300 px-4 py-2">
              Abbrechen
            </button>
            <button onClick={handleSubmit} className="rounded bg-cyan-600 px-4 py-2 text-white">
              Speichern
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditTaskModal;
