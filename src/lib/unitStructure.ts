export async function loadUnitStructureFromBundle(): Promise<Record<string, any>> {
  try {
    const modules = import.meta.glob('../unit-structure/*.json', { eager: true }) as Record<string, any>
    const merged: Record<string, any> = {}
    for (const [p, mod] of Object.entries(modules)) {
      const data = (mod as any)?.default ?? mod
      const uic = p.split('/').pop()?.replace(/\.json$/i, '') || ''
      if (uic) merged[uic] = data
    }
    return merged
  } catch {
    return {}
  }
}
