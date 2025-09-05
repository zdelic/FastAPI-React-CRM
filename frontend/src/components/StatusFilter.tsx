import React from "react";

interface StatusFilterProps {
  selectedStatus: string[];
  setSelectedStatus: (status: string[]) => void;
  showOnlyDelayed: boolean;
  setShowOnlyDelayed: (val: boolean) => void;
}

const StatusFilter: React.FC<StatusFilterProps> = ({
  selectedStatus,
  setSelectedStatus,
  showOnlyDelayed,
  setShowOnlyDelayed,
}) => {
  const statusOptions = ["Offen", "In Bearbeitung", "Erledigt"];

  const handleChange = (status: string, checked: boolean) => {
    if (checked) {
      setSelectedStatus([...selectedStatus, status]);
    } else {
      setSelectedStatus(selectedStatus.filter((s) => s !== status));
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-6 mb-4 text-sm text-gray-800">

      <div className="flex gap-4 flex-wrap">
        {statusOptions.map((status) => (
          <label key={status} className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={selectedStatus.includes(status)}
              onChange={(e) => handleChange(status, e.target.checked)}
            />
            <span>{status}</span>
          </label>
        ))}
      </div>

      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          checked={showOnlyDelayed}
          onChange={(e) => setShowOnlyDelayed(e.target.checked)}
        />
        <span>Nur verspätete Tasks</span>
      </div>
      <div className="mt-2">
        <button
            className="px-3 py-1 text-xs bg-gray-200 hover:bg-gray-300 rounded"
            onClick={() => {
            setSelectedStatus([]);
            setShowOnlyDelayed(false);
            }}
        >
            Reset Status
        </button>
        </div>

    </div>
  );
};

export default StatusFilter;

