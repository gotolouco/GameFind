export interface Game {
  title: string
  genre: string
  year: number
  description: string
  score: number
  tags: string[]
  why: string
}

export interface HistorySession {
  id: string
  date: string
  genre: string
  games: Game[]
}

const HISTORY_KEY = 'gamedrop_history'
const MAX_SESSIONS = 10

export function saveSession(genre: string, games: Game[]): void {
  if (typeof window === 'undefined') return
  const history = getHistory()
  const session: HistorySession = {
    id: Date.now().toString(),
    date: new Date().toLocaleDateString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    }),
    genre,
    games,
  }
  const updated = [session, ...history].slice(0, MAX_SESSIONS)
  localStorage.setItem(HISTORY_KEY, JSON.stringify(updated))
}

export function getHistory(): HistorySession[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function clearHistory(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(HISTORY_KEY)
}
