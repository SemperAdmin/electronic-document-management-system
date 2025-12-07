import React, { useState, useMemo, useRef, useEffect } from 'react'
import { UNITS, Unit } from '../lib/units'

interface SearchableUnitSelectorProps {
  onUnitSelect: (unit: Unit | undefined) => void
  selectedUnit?: Unit
  placeholder?: string
}

export const SearchableUnitSelector: React.FC<SearchableUnitSelectorProps> = ({
  onUnitSelect,
  selectedUnit,
  placeholder = 'Search by UIC, RUC, MCC, or Unit Name'
}) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Filter units based on search query - show all only when dropdown is first opened
  const filteredUnits = useMemo(() => {
    const raw = searchQuery.trim()
    if (!raw || raw.length < 2) return []

    const q = raw.toLowerCase()
    const isNumeric = /^\d+$/.test(q)

    return UNITS.filter(unit => {
      const uic = String(unit.uic || '').toLowerCase()
      const ruc = String(unit.ruc || '').toLowerCase()
      const mcc = String(unit.mcc || '').toLowerCase()
      const name = String(unit.unitName || '').toLowerCase()

      if (isNumeric) {
        // Numeric queries should not match names; only numeric/id fields by prefix
        return uic.startsWith(q) || ruc.startsWith(q) || mcc.startsWith(q)
      }
      // Alpha queries: match by name or id prefixes
      return name.startsWith(q) || uic.startsWith(q) || ruc.startsWith(q) || mcc.startsWith(q)
    })
  }, [searchQuery])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelectUnit = (unit: Unit) => {
    onUnitSelect(unit)
    setSearchQuery('')
    setIsOpen(false)
  }

  const displayValue = selectedUnit
    ? `${selectedUnit.unitName} (UIC: ${selectedUnit.uic})`
    : ''

  return (
    <div className="relative" ref={dropdownRef}>
      <div className="relative">
        <input
          type="text"
          value={isOpen ? searchQuery : displayValue}
          onChange={(e) => {
            setSearchQuery(e.target.value)
            setIsOpen(true)
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className="w-full px-3 py-2 border border-brand-navy/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-gold"
        />
        {selectedUnit && !isOpen && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onUnitSelect(undefined)
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        )}
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 max-h-60 overflow-y-auto bg-white border border-brand-navy/30 rounded-lg shadow-lg">
          {filteredUnits.length > 0 ? (
            filteredUnits.map(unit => (
              <button
                key={unit.uic}
                type="button"
                onClick={() => handleSelectUnit(unit)}
                className="w-full text-left px-3 py-2 hover:bg-brand-cream transition-colors"
              >
                <div className="font-medium text-sm">{unit.unitName}</div>
                <div className="text-xs text-gray-600">
                  UIC: {unit.uic} | RUC: {unit.ruc} | MCC: {unit.mcc}
                </div>
              </button>
            ))
          ) : (
            <div className="px-3 py-2 text-sm text-gray-500">
              {searchQuery.trim() ? 'No units found' : 'Start typing to search...'}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
