import { createClient } from './supabase'
import { ensureGame, findGameBySlug, slugifyGameTitle, toUiGame } from './games'
import { Game, RatingWithGame, RecommendationSessionWithGames } from './types'

export type { Game, RatingWithGame, RecommendationSessionWithGames } from './types'
export type HistorySession = RecommendationSessionWithGames

const ratingsCache = new Map<string, RatingWithGame[]>()
const ratingsInFlight = new Map<string, Promise<RatingWithGame[]>>()
const historyCache = new Map<string, RecommendationSessionWithGames[]>()
const historyInFlight = new Map<string, Promise<RecommendationSessionWithGames[]>>()

export async function saveSession(genre: string, games: Game[], prompt: string | null = null, userId?: string): Promise<boolean> {
  if (!userId) return false
  const supabase = createClient()

  const savedGames = await Promise.all(games.map(game => ensureGame(game)))
  const validGames = savedGames.filter((game): game is Game & { id: string } => !!game?.id)

  const { data: session, error: sessionError } = await supabase
    .from('recommendation_sessions')
    .insert({
      user_id: userId,
      genre,
      prompt,
      raw_response: { games },
    })
    .select('id')
    .single()

  if (sessionError || !session) {
    console.error('Erro ao salvar sessao:', sessionError)
    return false
  }

  if (validGames.length === 0) return true

  const { error: gamesError } = await supabase
    .from('recommendation_session_games')
    .insert(validGames.map((game, index) => ({
      session_id: session.id,
      game_id: game.id,
      position: index + 1,
      reason: games[index]?.why ?? null,
    })))

  if (gamesError) {
    console.error('Erro ao salvar jogos da sessao:', gamesError)
    return false
  }

  historyCache.delete(userId)
  return true
}

export async function getRecommendationHistory(userId: string, options: { force?: boolean } = {}): Promise<RecommendationSessionWithGames[]> {
  if (!options.force && historyCache.has(userId)) {
    return historyCache.get(userId)!
  }

  if (!options.force && historyInFlight.has(userId)) {
    return historyInFlight.get(userId)!
  }

  const request = fetchRecommendationHistory(userId)
  historyInFlight.set(userId, request)

  try {
    const history = await request
    historyCache.set(userId, history)
    return history
  } finally {
    historyInFlight.delete(userId)
  }
}

async function fetchRecommendationHistory(userId: string): Promise<RecommendationSessionWithGames[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('recommendation_sessions')
    .select(`
      id,
      user_id,
      genre,
      prompt,
      raw_response,
      created_at,
      recommendation_session_games(
        session_id,
        game_id,
        position,
        reason,
        created_at,
        games(*, game_tags(tags(*)))
      )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Erro ao buscar historico:', error)
    return []
  }

  return (data || []).map((session: any) => ({
    id: session.id,
    user_id: session.user_id,
    genre: session.genre,
    prompt: session.prompt,
    raw_response: session.raw_response,
    created_at: session.created_at,
    games: (session.recommendation_session_games || [])
      .filter((item: any) => item.games)
      .sort((a: any, b: any) => (a.position || 0) - (b.position || 0))
      .map((item: any) => ({
        session_id: item.session_id,
        game_id: item.game_id,
        position: item.position,
        reason: item.reason,
        created_at: item.created_at,
        game: toUiGame(item.games, { reason: item.reason }),
      })),
  }))
}

export async function getHistory(userId?: string): Promise<RecommendationSessionWithGames[]> {
  return userId ? getRecommendationHistory(userId) : []
}

export async function clearHistory(userId?: string): Promise<boolean> {
  if (!userId) return false
  const supabase = createClient()

  const { data: sessions, error: fetchError } = await supabase
    .from('recommendation_sessions')
    .select('id')
    .eq('user_id', userId)

  if (fetchError) {
    console.error('Erro ao buscar sessoes para limpar:', fetchError)
    return false
  }

  const sessionIds = (sessions || []).map(session => session.id)
  if (sessionIds.length > 0) {
    const { error: relationError } = await supabase
      .from('recommendation_session_games')
      .delete()
      .in('session_id', sessionIds)

    if (relationError) {
      console.error('Erro ao limpar jogos do historico:', relationError)
      return false
    }
  }

  const { error } = await supabase
    .from('recommendation_sessions')
    .delete()
    .eq('user_id', userId)

  if (error) {
    console.error('Erro ao limpar historico:', error)
    return false
  }

  historyCache.set(userId, [])
  return true
}

export async function saveRating(game: Game, rating: number, review: string | null = null, userId?: string): Promise<boolean> {
  if (!userId) return false
  const supabase = createClient()

  const savedGame = await ensureGame(game)
  if (!savedGame?.id) return false
  if (!game.id) game.id = savedGame.id

  const { error } = await supabase
    .from('user_game_ratings')
    .upsert({
      user_id: userId,
      game_id: savedGame.id,
      rating,
      review,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,game_id' })

  if (error) {
    console.error('Erro ao salvar avaliacao:', error)
    return false
  }

  const cachedRatings = ratingsCache.get(userId)
  if (cachedRatings) {
    const now = new Date().toISOString()
    const nextRating: RatingWithGame = {
      id: `${userId}-${savedGame.id}`,
      user_id: userId,
      game_id: savedGame.id,
      rating,
      review,
      created_at: now,
      updated_at: now,
      game: savedGame,
    }
    ratingsCache.set(userId, [
      nextRating,
      ...cachedRatings.filter(item => item.game_id !== savedGame.id),
    ])
  }

  return true
}

export async function getUserRatings(userId: string, options: { force?: boolean } = {}): Promise<RatingWithGame[]> {
  if (!options.force && ratingsCache.has(userId)) {
    return ratingsCache.get(userId)!
  }

  if (!options.force && ratingsInFlight.has(userId)) {
    return ratingsInFlight.get(userId)!
  }

  const request = fetchUserRatings(userId)
  ratingsInFlight.set(userId, request)

  try {
    const ratings = await request
    ratingsCache.set(userId, ratings)
    return ratings
  } finally {
    ratingsInFlight.delete(userId)
  }
}

async function fetchUserRatings(userId: string): Promise<RatingWithGame[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('user_game_ratings')
    .select('id, user_id, game_id, rating, review, created_at, updated_at, games(*, game_tags(tags(*)))')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })

  if (error) {
    console.error('Erro ao buscar avaliacoes:', error)
    return []
  }

  return (data || [])
    .filter((row: any) => row.games)
    .map((row: any) => ({
      id: row.id,
      user_id: row.user_id,
      game_id: row.game_id,
      rating: row.rating,
      review: row.review,
      created_at: row.created_at,
      updated_at: row.updated_at,
      game: toUiGame(row.games),
    }))
}

export async function getRatings(userId?: string): Promise<Record<string, number>> {
  if (!userId) return {}

  const ratings = await getUserRatings(userId)
  return ratings.reduce<Record<string, number>>((acc, item) => {
    acc[item.game_id] = item.rating
    if (item.game.slug) acc[item.game.slug] = item.rating
    return acc
  }, {})
}

export async function removeRating(game: Game | string, userId?: string): Promise<boolean> {
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
    .from('user_game_ratings')
    .delete()
    .eq('user_id', userId)
    .eq('game_id', gameId)

  if (error) {
    console.error('Erro ao remover avaliacao:', error)
    return false
  }

  const cachedRatings = ratingsCache.get(userId)
  if (cachedRatings) {
    ratingsCache.set(userId, cachedRatings.filter(item => item.game_id !== gameId))
  }

  return true
}

export async function clearAllRatings(userId?: string): Promise<boolean> {
  if (!userId) return false
  const supabase = createClient()

  const { error } = await supabase
    .from('user_game_ratings')
    .delete()
    .eq('user_id', userId)

  if (error) {
    console.error('Erro ao limpar avaliacoes:', error)
    return false
  }

  ratingsCache.set(userId, [])
  return true
}
