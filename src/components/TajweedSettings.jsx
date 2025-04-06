import React, { useState } from "react";

const TajweedSettings = ({ tajweedRules, onToggleRule, onToggleAll }) => {
  const [showSettings, setShowSettings] = useState(false);

  return (
    <div className="mb-4">
      <button
        onClick={() => setShowSettings(!showSettings)}
        className="w-full flex items-center justify-between py-2 px-4 bg-green-100 hover:bg-green-200 rounded transition-colors"
      >
        <span className="font-medium text-green-800">Tajweed Highlighting Settings</span>
        <svg
          className={`w-4 h-4 transition-transform ${showSettings ? 'transform rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {showSettings && (
        <div className="p-4 bg-green-50 rounded-b-lg shadow-inner">
          <div className="flex justify-between mb-4">
            <button
              onClick={() => onToggleAll(true)}
              className="px-3 py-1 bg-green-500 hover:bg-green-600 text-white rounded text-sm transition-colors"
            >
              Enable All
            </button>
            <button
              onClick={() => onToggleAll(false)}
              className="px-3 py-1 bg-gray-500 hover:bg-gray-600 text-white rounded text-sm transition-colors"
            >
              Disable All
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {tajweedRules.map(rule => (
              <div key={rule.id} className="flex items-center">
                <input
                  type="checkbox"
                  id={`tajweed-${rule.id}`}
                  checked={rule.enabled}
                  onChange={() => onToggleRule(rule.id)}
                  className="rounded text-green-600 focus:ring-green-500 mr-2"
                />
                <label htmlFor={`tajweed-${rule.id}`} className="flex items-center cursor-pointer">
                  <span
                    className="inline-block w-3 h-3 rounded-full mr-1"
                    style={{ backgroundColor: rule.color }}
                  ></span>
                  <span className="text-sm">{rule.name}</span>
                </label>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TajweedSettings;