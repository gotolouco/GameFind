import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'

type InputGame = {
  id?: string
  slug?: string
  title: string
  genre?: string | null
  release_year?: number | null
  year?: number | null
  description?: string | null
  image_url?: string | null
  image?: string | null
  store_url?: string | null
  storeUrl?: string | null
  metadata?: Record<string, unknown> | null
  score?: number | null
  tags?: string[]
  why?: string | null
}

function slugifyGameTitle(title: string) {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'game'
}

function toGameInsert(game: InputGame) {
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
      ...(game.metadata || {}),
      score: game.score ?? null,
      tags: game.tags || [],
      why: game.why ?? null,
      year: releaseYear,
      image: game.image || game.image_url || null,
      storeUrl: game.storeUrl || game.store_url || null,
    },
  }
}

async function syncGameTags(supabase: SupabaseClient<any>, gameId: string, tags: string[] = []) {
  const cleanTags = Array.from(new Set(tags.map(tag => tag.trim()).filter(Boolean)))
  if (cleanTags.length === 0) return

  const { data: savedTags, error: tagError } = await supabase
    .from('tags')
    .upsert(cleanTags.map(name => ({ name })), { onConflict: 'name' })
    .select('id')

  if (tagError) throw tagError

  const relations = (savedTags || []).map(tag => ({
    game_id: gameId,
    tag_id: tag.id,
  }))

  if (relations.length === 0) return

  const { error: relationError } = await supabase
    .from('game_tags')
    .upsert(relations, { onConflict: 'game_id,tag_id' })

  if (relationError) throw relationError
}

export async function POST(request: Request) {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      { error: 'SUPABASE_SERVICE_ROLE_KEY nao configurada no servidor.' },
      { status: 500 }
    )
  }

  const game = await request.json() as InputGame
  if (!game?.title) {
    return NextResponse.json({ error: 'Jogo sem titulo.' }, { status: 400 })
  }

  const supabase = createClient<any>(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data, error } = await supabase
    .from('games')
    .upsert(toGameInsert(game), { onConflict: 'slug' })
    .select('*, game_tags(tags(*))')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message, code: error.code }, { status: 500 })
  }

  try {
    await syncGameTags(supabase, data.id, game.tags || [])
  } catch (error) {
    console.error('Erro ao salvar tags do jogo:', error)
    return NextResponse.json({
      game: data,
      warning: error instanceof Error ? error.message : 'Jogo salvo, mas as tags nao foram sincronizadas.',
    })
  }

  return NextResponse.json({ game: data })
}
