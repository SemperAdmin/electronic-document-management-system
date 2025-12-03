export async function loadUnitStructureFromBundle(): Promise<Record<string, any>> {
  try {
    const modules = import.meta.glob('../unit-structure/*.json', { eager: true }) as Record<string, any>
    const merged: Record<string, any> = {}
    for (const [p, mod] of Object.entries(modules)) {
      const data = (mod as any)?.default ?? mod
      const filename = p.split('/').pop()?.replace(/\.json$/i, '') || ''
      // Extract UIC from filename pattern: {UIC}__{MCC}__{name}.json
      // Example: M11110__V11__1-1-1st-mardiv.json -> M11110
      const uic = filename.split('__')[0] || filename
      if (uic) merged[uic] = data
    }
    return merged
  } catch {
    return {}
  }
}
