type Store = {
  getItem: (k: string) => string | null
  setItem: (k: string, v: string) => void
  removeItem: (k: string) => void
  key: (i: number) => string | null
  length: () => number
  clear: () => void
}

const memory = new Map<string, string>()

const memoryStore: Store = {
  getItem: (k) => (memory.has(k) ? memory.get(k)! : null),
  setItem: (k, v) => { memory.set(k, v) },
  removeItem: (k) => { memory.delete(k) },
  key: (i) => Array.from(memory.keys())[i] ?? null,
  length: () => memory.size,
  clear: () => { memory.clear() },
}

function browserStore(): Store {
  try {
    // Access may throw SecurityError in sandboxed environments
    const ls = window.localStorage
    // Touch a method to ensure usable
    void ls.length
    return {
      getItem: (k) => ls.getItem(k),
      setItem: (k, v) => { ls.setItem(k, v) },
      removeItem: (k) => { ls.removeItem(k) },
      key: (i) => ls.key(i),
      length: () => ls.length,
      clear: () => { ls.clear() },
    }
  } catch {
    return memoryStore
  }
}

export const storage: Store = typeof window !== 'undefined' ? browserStore() : memoryStore

