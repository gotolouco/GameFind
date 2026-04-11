import { createClient } from './supabase'
import { Game } from './types'

export function slugifyGameTitle(title: string) {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'game'
}

export function toUiGame(dbGame: any, relation?: { score?: number | null; why?: string | null; note?: string | null; reason?: string | null }): Game {
  const metadata = (dbGame?.metadata ?? {}) as Record<string, any>
  const relationTags = Array.isArray(dbGame?.game_tags)
    ? dbGame.game_tags.map((item: any) => item.tags?.name).filter(Boolean)
    : []
  return {
    id: dbGame.id,
    slug: dbGame.slug,
    title: dbGame.title,
    genre: dbGame.genre || metadata.genre || 'PC',
    release_year: dbGame.release_year ?? null,
    year: dbGame.release_year ?? metadata.year ?? null,
    description: dbGame.description || '',
    image_url: dbGame.image_url ?? null,
    image: dbGame.image_url || metadata.image || null,
    store_url: dbGame.store_url ?? null,
    storeUrl: dbGame.store_url || metadata.storeUrl || null,
    metadata,
    score: relation?.score ?? metadata.score ?? null,
    tags: relationTags.length > 0 ? relationTags : Array.isArray(metadata.tags) ? metadata.tags : [],
    why: relation?.why ?? relation?.reason ?? metadata.why ?? null,
    created_at: dbGame.created_at,
    updated_at: dbGame.updated_at,
  }
}

export function toGameInsert(game: Game) {
  const releaseYear = game.release_year ?? game.year ?? null
  return {
    slug: game.slug || slugifyGameTitle(game.title),
    title: game.title,
    genre: game.genre || 'PC',
    release_year: releaseYear,
    description: game.description || '',
    image_url: game.image_url || game.image || null,
    store_url: game.store_url || game.storeUrl || null,
    metadata: {
      score: game.score ?? null,
      tags: game.tags || [],
      why: game.why ?? null,
      year: releaseYear,
      image: game.image || game.image_url || null,
      storeUrl: game.storeUrl || game.store_url || null,
    },
  }
}

export async function ensureGame(game: Game): Promise<Game | null> {
  if (game.id) return game

  const existingGame = await findGameBySlug(game.slug || slugifyGameTitle(game.title))
  if (existingGame) return {
    ...existingGame,
    score: game.score ?? existingGame.score ?? null,
    why: game.why ?? existingGame.why ?? null,
  }

  const response = await fetch('/api/games/ensure', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(game),
  })

  const payload = await response.json().catch(() => null)
  if (!response.ok || !payload?.game) {
    console.error('Erro ao salvar jogo:', payload?.error || response.statusText)
    return null
  }

  return toUiGame(payload.game, { score: game.score ?? null, why: game.why ?? null })
}

export async function findGameBySlug(slug: string): Promise<Game | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('games')
    .select('*, game_tags(tags(*))')
    .eq('slug', slug)
    .maybeSingle()

  if (error) {
    console.error('Erro ao buscar jogo:', error)
    return null
  }

  return data ? toUiGame(data) : null
}

export async function syncGameTags(gameId: string, tags: string[] = []) {
  const cleanTags = Array.from(new Set(tags.map(tag => tag.trim()).filter(Boolean)))
  if (cleanTags.length === 0) return

  const supabase = createClient()
  const { data: savedTags, error: tagError } = await supabase
    .from('tags')
    .upsert(cleanTags.map(name => ({ name })), { onConflict: 'name' })
    .select('id, name')

  if (tagError) {
    console.error('Erro ao salvar tags:', tagError)
    return
  }

  const relations = (savedTags || []).map((tag: any) => ({
    game_id: gameId,
    tag_id: tag.id,
  }))

  if (relations.length === 0) return

  const { error: relationError } = await supabase
    .from('game_tags')
    .upsert(relations, { onConflict: 'game_id,tag_id' })

  if (relationError) {
    console.error('Erro ao relacionar tags do jogo:', relationError)
  }
}
