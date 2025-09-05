import React from "react";

interface TabMenuProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  tabs: string[];
}

const TabMenu: React.FC<TabMenuProps> = ({ activeTab, setActiveTab, tabs }) => {
  return (
    <div className="flex space-x-4 border-b mb-4">
      {tabs.map((tab) => (
        <button
          key={tab}
          className={`px-4 py-2 text-sm font-medium ${
            activeTab === tab
              ? "border-b-2 border-cyan-600 text-cyan-600"
              : "text-gray-500 hover:text-cyan-600"
          }`}
          onClick={() => setActiveTab(tab)}
        >
          {tab}
        </button>
      ))}
    </div>
  );
};

export default TabMenu;
