export async function loadHQMCStructureFromBundle(): Promise<Array<{ division_code: string; division_name: string; branch: string; description?: string }>> {
  try {
    const modules = import.meta.glob('../hqmc-structure/*.json', { eager: true }) as Record<string, any>
    const rows: Array<{ division_code: string; division_name: string; branch: string; description?: string }> = []
    for (const mod of Object.values(modules)) {
      const data = (mod as any)?.default ?? mod
      if (data && typeof data === 'object') {
        const division_code = String((data as any).division_code || '')
        const division_name = String((data as any).division_name || '')
        const branch = String((data as any).branch || '')
        const description = (data as any).description ? String((data as any).description) : undefined
        if (division_code && branch) rows.push({ division_code, division_name, branch, description })
      }
    }
    return rows
  } catch {
    return []
  }
}
