import React, { useEffect, useMemo, useRef, useState } from 'react'
import { loadUnitStructureFromBundle } from '@/lib/unitStructure'

interface HierarchicalDropdownProps {
  value: { company?: string; platoon?: string }
  unitUic?: string
  selectionMode?: 'company' | 'platoon'
  onChange: (next: { company?: string; platoon?: string }) => void
}

type UnitStructure = Record<string, Record<string, string[]>>

export const HierarchicalDropdown: React.FC<HierarchicalDropdownProps> = ({ value, unitUic, selectionMode = 'platoon', onChange }) => {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [data, setData] = useState<UnitStructure>({})
  const [error, setError] = useState<string>('')
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [activeIndex, setActiveIndex] = useState<number>(-1)
  const listRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const load = async () => {
      setError('')
      try {
        const merged = await loadUnitStructureFromBundle()
        setData(merged as any)
      } catch (e) {
        setError('Unable to load structure')
      }
    }
    load()
  }, [])

  const companies = useMemo(() => {
    if (!unitUic) return []
    const map = data[unitUic] || {}
    return Object.keys(map)
  }, [data, unitUic])

  const filteredCompanies = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return companies
    return companies.filter(c => c.toLowerCase().includes(q) || (data[unitUic || '']?.[c] || []).some(p => p.toLowerCase().includes(q)))
  }, [companies, query, data, unitUic])

  const visibleItems = useMemo(() => {
    const items: { type: 'company' | 'platoon'; company: string; platoon?: string }[] = []
    for (const c of filteredCompanies) {
      items.push({ type: 'company', company: c })
      if (selectionMode === 'platoon') {
        const plats = data[unitUic || '']?.[c] || []
        const ex = expanded[c]
        if (ex) for (const p of plats) items.push({ type: 'platoon', company: c, platoon: p })
      }
    }
    return items
  }, [filteredCompanies, expanded, data, unitUic, selectionMode])

  const selectCompany = (c: string) => {
    if (selectionMode === 'company') {
      onChange({ company: c, platoon: undefined })
      setOpen(false)
    } else {
      setExpanded(prev => ({ ...prev, [c]: !prev[c] }))
      onChange({ company: c, platoon: undefined })
    }
  }

  const selectPlatoon = (c: string, p: string) => {
    onChange({ company: c, platoon: p })
    setOpen(false)
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex(i => Math.min(i + 1, visibleItems.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const item = visibleItems[activeIndex]
      if (!item) return
      if (item.type === 'company') selectCompany(item.company)
      else if (item.type === 'platoon' && item.platoon) selectPlatoon(item.company, item.platoon)
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setOpen(false)
    }
  }

  useEffect(() => {
    if (open) setActiveIndex(0)
  }, [open])

  const label = useMemo(() => {
    if (selectionMode === 'company') {
      return value.company || 'Select Company'
    }
    if (!value.company && !value.platoon) return 'Select Company/Platoon'
    if (value.company && !value.platoon) return value.company
    return `${value.company || ''} / ${value.platoon || ''}`
  }, [value, selectionMode])

  return (
    <div className="relative" onKeyDown={onKeyDown}>
      <button
        aria-haspopup="listbox"
        aria-expanded={open}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-left flex items-center justify-between"
        onClick={() => setOpen(o => !o)}
      >
        <span className="truncate">{label}</span>
        <span className="ml-2 text-gray-500">▾</span>
      </button>
      {open && (
        <div ref={listRef} role="listbox" aria-label="Company and Platoon" className="absolute z-50 mt-1 w-full max-h-64 overflow-auto border border-gray-300 rounded-lg bg-white shadow">
          <div className="p-2">
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search..."
              className="w-full px-2 py-1 border border-gray-300 rounded"
              aria-label="Search"
            />
          </div>
          {error ? (
            <div className="px-3 py-2 text-sm text-red-700">{error}</div>
          ) : filteredCompanies.length === 0 ? (
            <div className="px-3 py-2 text-sm text-gray-500">No results</div>
          ) : (
            <div>
              {visibleItems.map((item, idx) => (
                <div
                  key={`${item.type}-${item.company}-${item.platoon || ''}-${idx}`}
                  role="option"
                  aria-selected={idx === activeIndex}
                  className={`px-3 py-2 cursor-pointer ${idx === activeIndex ? 'bg-blue-50' : ''}`}
                  onMouseEnter={() => setActiveIndex(idx)}
                  onClick={() => {
                    if (item.type === 'company') selectCompany(item.company)
                    else if (item.type === 'platoon' && item.platoon) selectPlatoon(item.company, item.platoon)
                  }}
                >
                  {item.type === 'company' ? (
                    <div className="flex items-center">
                      <span className="mr-2 text-gray-500">🏢</span>
                      <span className="font-medium">{item.company}</span>
                      <span className="ml-auto text-gray-500">{expanded[item.company] ? '▴' : '▾'}</span>
                    </div>
                  ) : (
                    <div className="flex items-center pl-6">
                      <span className="mr-2 text-gray-400">•</span>
                      <span>{item.platoon}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
