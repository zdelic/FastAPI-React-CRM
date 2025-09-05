import React from "react";

interface ProcessModelFilterProps {
  allProcessModels: string[];
  selectedProcessModels: string[];
  setSelectedProcessModels: (val: string[]) => void;
}

const ProcessModelFilter: React.FC<ProcessModelFilterProps> = ({
  allProcessModels,
  selectedProcessModels,
  setSelectedProcessModels,
}) => {
  const toggle = (name: string, checked: boolean) => {
    if (checked) {
      setSelectedProcessModels([...selectedProcessModels, name]);
    } else {
      setSelectedProcessModels(selectedProcessModels.filter((n) => n !== name));
    }
  };

  return (
    <div className="mb-4 text-sm text-gray-800">
      <div className="flex gap-4 flex-wrap">
        {allProcessModels.map((name) => (
          <label key={name} className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={selectedProcessModels.includes(name)}
              onChange={(e) => toggle(name, e.target.checked)}
            />
            <span>{name}</span>
          </label>
        ))}
      </div>

      <div className="mt-2">
        <button
          className="px-3 py-1 text-xs bg-gray-200 hover:bg-gray-300 rounded"
          onClick={() => setSelectedProcessModels([])}
        >
          Reset Prozessmodell
        </button>
      </div>
    </div>
  );
};

export default ProcessModelFilter;
