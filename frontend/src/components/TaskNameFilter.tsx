import React from "react";

interface TaskNameFilterProps {
  taskName: string;
  setTaskName: (name: string) => void;
}

const TaskNameFilter: React.FC<TaskNameFilterProps> = ({ taskName, setTaskName }) => {
  return (
    <div className="mb-4">
      <input
        type="text"
        value={taskName}
        onChange={(e) => setTaskName(e.target.value)}
        placeholder="🔍 Suche nach Task-Name..."
        className="border px-3 py-2 rounded shadow-sm w-full max-w-md text-sm"
      />

      <div className="mt-2">
        <button
            className="px-3 py-1 text-xs bg-gray-200 hover:bg-gray-300 rounded"
            onClick={() => setTaskName("")}
        >
            Reset Suche
        </button>
        </div>

    </div>
  );
};

export default TaskNameFilter;
