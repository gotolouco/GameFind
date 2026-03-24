import { createClient } from './supabase'

export interface Game {
  title: string;
  genre: string;
  year: number;
  description: string;
  score: number;
  tags: string[];
  why: string;
  image: string;
}

export interface HistorySession {
  id: string;
  user_id: string;
  genre: string;
  games: Game[];
  created_at: string;
}

// ==========================================
// HISTÓRICO DE SESSÕES (history_sessions)
// ==========================================

export async function saveSession(genre: string, games: Game[]): Promise<boolean> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const { error } = await supabase
    .from('history_sessions')
    .insert([{ user_id: user.id, genre, games }]);
    
  if (error) {
    console.error("Erro ao salvar sessão:", error);
    return false;
  }
  return true;
}

export async function getHistory(): Promise<HistorySession[]> {
  const supabase = createClient()
  // O Supabase filtra automaticamente pelo usuário logado devido ao RLS
  const { data, error } = await supabase
    .from('history_sessions')
    .select('id, user_id, genre, games, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Erro ao buscar histórico:", error);
    return [];
  }
  return data || [];
}

export async function clearHistory(): Promise<boolean> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const { error } = await supabase
    .from('history_sessions')
    .delete()
    .eq('user_id', user.id);
    
  if (error) {
    console.error("Erro ao limpar histórico:", error);
    return false;
  }
  return true;
}

// ==========================================
// AVALIAÇÕES (ratings)
// ==========================================

export async function saveRating(title: string, rating: number): Promise<boolean> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
  
  // Verifica se já existe avaliação
  const { data: existing } = await supabase
    .from('ratings')
    .select('id')
    .eq('game_title', title)
    .single();

  if (existing) {
    const { error } = await supabase
      .from('ratings')
      .update({ rating })
      .eq('id', existing.id);
    if (error) return false;
  } else {
    const { error } = await supabase
      .from('ratings')
      .insert([{ user_id: user.id, game_title: title, rating }]);
    if (error) return false;
  }
  return true;
}

export async function getRatings(): Promise<Record<string, number>> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('ratings')
    .select('game_title, rating');

  if (error) {
    console.error("Erro ao buscar avaliações:", error);
    return {};
  }

  const ratingsMap: Record<string, number> = {};
  data?.forEach(r => {
    ratingsMap[r.game_title] = r.rating;
  });
  return ratingsMap;
}

export async function removeRating(title: string): Promise<boolean> {
  const supabase = createClient()
  const { error } = await supabase
    .from('ratings')
    .delete()
    .eq('game_title', title);
    
  if (error) {
    console.error("Erro ao remover avaliação:", error);
    return false;
  }
  return true;
}

export async function clearAllRatings(): Promise<boolean> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const { error } = await supabase
    .from('ratings')
    .delete()
    .eq('user_id', user.id);
    
  if (error) {
    console.error("Erro ao limpar avaliações:", error);
    return false;
  }
  return true;
}