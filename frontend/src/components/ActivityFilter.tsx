import React from "react";

interface ActivityFilterProps {
  allActivities: string[];
  selectedActivities: string[];
  setSelectedActivities: (val: string[]) => void;
}

const ActivityFilter: React.FC<ActivityFilterProps> = ({
  allActivities,
  selectedActivities,
  setSelectedActivities,
}) => {
  const toggleActivity = (activity: string, checked: boolean) => {
    if (checked) {
      setSelectedActivities([...selectedActivities, activity]);
    } else {
      setSelectedActivities(selectedActivities.filter((a) => a !== activity));
    }
  };

  return (
    <div className="mb-4 text-sm text-gray-800">
      <div className="flex gap-4 flex-wrap">
        {allActivities.map((activity) => (
          <label key={activity} className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={selectedActivities.includes(activity)}
              onChange={(e) => toggleActivity(activity, e.target.checked)}
            />
            <span>{activity}</span>
          </label>
        ))}
      </div>
      <div className="mt-2">
        <button
            className="px-3 py-1 text-xs bg-gray-200 hover:bg-gray-300 rounded"
            onClick={() => setSelectedActivities([])}
        >
            Reset Aktivität
        </button>
        </div>

    </div>
  );
};

export default ActivityFilter;
