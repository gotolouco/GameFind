import { createClient } from './supabase'
import { Game } from './history'

export interface FavoriteGame extends Game {
  id?: string
  user_id?: string
  created_at?: string
}

// Busca todos os favoritos do usuário logado
export async function getFavorites(): Promise<FavoriteGame[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('favorites')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Erro ao buscar favoritos:', error)
    return []
  }
  return data || []
}

// Adiciona um jogo aos favoritos
export async function addFavorite(game: FavoriteGame): Promise<boolean> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const { error } = await supabase.from('favorites').insert({
    user_id: user.id,
    title: game.title,
    genre: game.genre,
    year: game.year,
    description: game.description,
    score: game.score,
    tags: game.tags,
    why: game.why,
    image: game.image || null,
  })

  if (error) {
    console.error('Erro ao favoritar:', error)
    return false
  }
  return true
}

// Remove um jogo dos favoritos pelo título
export async function removeFavorite(title: string): Promise<boolean> {
  const supabase = createClient()
  const { error } = await supabase
    .from('favorites')
    .delete()
    .eq('title', title)

  if (error) {
    console.error('Erro ao desfavoritar:', error)
    return false
  }
  return true
}

// Verifica se um jogo já está nos favoritos
export async function isFavorited(title: string): Promise<boolean> {
  const supabase = createClient()
  const { data } = await supabase
    .from('favorites')
    .select('id')
    .eq('title', title)
    .maybeSingle()

  return !!data
}
