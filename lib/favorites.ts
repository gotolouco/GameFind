import { createClient } from './supabase'
import { ensureGame, findGameBySlug, slugifyGameTitle, toUiGame } from './games'
import { FavoriteWithGame, Game } from './types'

export type FavoriteGame = Game

const favoritesCache = new Map<string, FavoriteWithGame[]>()
const favoritesInFlight = new Map<string, Promise<FavoriteWithGame[]>>()

export async function getUserFavorites(userId: string, options: { force?: boolean } = {}): Promise<FavoriteWithGame[]> {
  if (!options.force && favoritesCache.has(userId)) {
    return favoritesCache.get(userId)!
  }

  if (!options.force && favoritesInFlight.has(userId)) {
    return favoritesInFlight.get(userId)!
  }

  const request = fetchUserFavorites(userId)
  favoritesInFlight.set(userId, request)

  try {
    const favorites = await request
    favoritesCache.set(userId, favorites)
    return favorites
  } finally {
    favoritesInFlight.delete(userId)
  }
}

async function fetchUserFavorites(userId: string): Promise<FavoriteWithGame[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('user_favorites')
    .select('user_id, game_id, note, score, why, created_at, games(*, game_tags(tags(*)))')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Erro ao buscar favoritos:', error)
    return []
  }

  return (data || [])
    .filter((row: any) => row.games)
    .map((row: any) => ({
      user_id: row.user_id,
      game_id: row.game_id,
      note: row.note,
      score: row.score,
      why: row.why,
      created_at: row.created_at,
      game: toUiGame(row.games, { score: row.score, why: row.why, note: row.note }),
    }))
}

export async function getFavorites(userId?: string): Promise<FavoriteGame[]> {
  if (!userId) return []

  const favorites = await getUserFavorites(userId)
  return favorites.map(favorite => favorite.game)
}

export async function addFavorite(game: Game, userId?: string): Promise<boolean> {
  if (!userId) return false
  const supabase = createClient()

  const savedGame = await ensureGame(game)
  if (!savedGame?.id) return false
  if (!game.id) game.id = savedGame.id

  const { error } = await supabase
    .from('user_favorites')
    .upsert({
      user_id: userId,
      game_id: savedGame.id,
      note: null,
      score: null,
      why: game.why ?? null,
    }, { onConflict: 'user_id,game_id' })

  if (error) {
    console.error('Erro ao favoritar:', error)
    return false
  }

  const cachedFavorites = favoritesCache.get(userId)
  if (cachedFavorites && !cachedFavorites.some(favorite => favorite.game_id === savedGame.id)) {
    favoritesCache.set(userId, [{
      user_id: userId,
      game_id: savedGame.id,
      note: null,
      score: null,
      why: game.why ?? null,
      created_at: new Date().toISOString(),
      game: savedGame,
    }, ...cachedFavorites])
  }

  return true
}

export async function removeFavorite(game: Game | string, userId?: string): Promise<boolean> {
  if (!userId) return false
  const supabase = createClient()

  let gameId = typeof game === 'string' ? null : game.id || null
  if (!gameId) {
    const slug = typeof game === 'string' ? slugifyGameTitle(game) : game.slug || slugifyGameTitle(game.title)
    const existingGame = await findGameBySlug(slug)
    gameId = existingGame?.id || null
  }

  if (!gameId) return true

  const { error } = await supabase
    .from('user_favorites')
    .delete()
    .eq('user_id', userId)
    .eq('game_id', gameId)

  if (error) {
    console.error('Erro ao desfavoritar:', error)
    return false
  }

  const cachedFavorites = favoritesCache.get(userId)
  if (cachedFavorites) {
    favoritesCache.set(userId, cachedFavorites.filter(favorite => favorite.game_id !== gameId))
  }

  return true
}

export async function isFavorited(game: Game | string, userId?: string): Promise<boolean> {
  if (!userId) return false
  const supabase = createClient()

  let gameId = typeof game === 'string' ? null : game.id || null
  if (!gameId) {
    return false
  }

  if (!gameId) return false

  const { data, error } = await supabase
    .from('user_favorites')
    .select('game_id')
    .eq('user_id', userId)
    .eq('game_id', gameId)
    .maybeSingle()

  if (error) {
    console.error('Erro ao verificar favorito:', error)
    return false
  }

  return !!data
}
