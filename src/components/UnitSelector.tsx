import React, { useState } from 'react';
import { UNITS, Unit } from '../lib/units';

interface UnitSelectorProps {
  onUnitSelect: (unit: Unit) => void;
  selectedUnit?: Unit;
}

export const UnitSelector: React.FC<UnitSelectorProps> = ({ onUnitSelect, selectedUnit }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const filteredUnits = UNITS.filter(unit =>
    unit.unitName.toLowerCase().startsWith(searchTerm.toLowerCase()) ||
    unit.uic.toLowerCase().startsWith(searchTerm.toLowerCase()) ||
    unit.ruc.toLowerCase().startsWith(searchTerm.toLowerCase())
  );

  const handleUnitSelect = (unit: Unit) => {
    onUnitSelect(unit);
    setIsOpen(false);
    setSearchTerm('');
  };

  return (
    <div className="relative w-full max-w-md">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Select Unit
      </label>
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2 text-left focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          {selectedUnit ? (
            <div>
              <div className="font-medium">{selectedUnit.unitName}</div>
              <div className="text-sm text-gray-500">UIC: {selectedUnit.uic} | RUC: {selectedUnit.ruc}</div>
            </div>
          ) : (
            <span className="text-gray-500">Choose a unit...</span>
          )}
          <svg
            className="w-5 h-5 absolute right-3 top-3 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {isOpen && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto">
            <div className="p-2">
              <input
                type="text"
                placeholder="Search units..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="max-h-48 overflow-y-auto">
              {filteredUnits.map((unit) => (
                <button
                  key={unit.uic}
                  type="button"
                  onClick={() => handleUnitSelect(unit)}
                  className="w-full px-4 py-3 text-left hover:bg-gray-50 focus:outline-none focus:bg-gray-50 border-b border-gray-100 last:border-b-0"
                >
                  <div className="font-medium text-sm">{unit.unitName}</div>
                  <div className="text-xs text-gray-500">
                    UIC: {unit.uic} | RUC: {unit.ruc} | MCC: {unit.mcc}
                  </div>
                  <div className="text-xs text-gray-400">
                    {unit.streetAddress}, {unit.cityState} {unit.zip}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};