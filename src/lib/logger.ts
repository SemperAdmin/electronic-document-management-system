type LogEntry = {
  id: string
  level: 'info' | 'warn' | 'error'
  event: string
  data?: any
  ts: number
}

const KEY = 'client_logs'
const MAX = 200

function read(): LogEntry[] {
  try {
    const raw = localStorage.getItem(KEY) || '[]'
    const arr = JSON.parse(raw)
    return Array.isArray(arr) ? arr : []
  } catch { return [] }
}

function write(entries: LogEntry[]) {
  try { localStorage.setItem(KEY, JSON.stringify(entries.slice(-MAX))) } catch {}
}

export function logEvent(event: string, data?: any, level: 'info' | 'warn' | 'error' = 'info'): string {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const entry: LogEntry = { id, level, event, data, ts: Date.now() }
  const cur = read()
  cur.push(entry)
  write(cur)
  try {
    if (level === 'error') console.error(event, data)
    else if (level === 'warn') console.warn(event, data)
    else console.log(event, data)
  } catch {}
  return id
}

export function getLogs(): LogEntry[] { return read() }
