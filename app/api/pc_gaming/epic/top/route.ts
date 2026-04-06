import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const rawgKey = process.env.RAWG_API_KEY

    if (!rawgKey) {
      throw new Error('RAWG_API_KEY não configurada no .env.local')
    }

    // RAWG API: 
    // stores=11 (ID da Epic Games Store)
    // ordering=-added (Ordena pelos jogos mais adicionados/populares na base)
    // page_size=12 (Traz apenas a quantidade necessária para o frontend)
    const url = `https://api.rawg.io/api/games?key=${rawgKey}&stores=11&ordering=-added&page_size=12`

    const res = await fetch(url, {
      next: { revalidate: 3600 }, // Mantemos o cache de 1 hora para economizar a cota da API
    })

    if (!res.ok) {
      throw new Error(`Erro na API RAWG: ${res.statusText}`)
    }

    const data = await res.json()

    // Transformando o payload da RAWG para o contrato que o EpicGamesPanel espera
    const games = data.results.map((g: any) => ({
      appid: g.slug, // A Epic utiliza slugs textuais em vez de IDs numéricos
      title: g.name,
      // Usamos a métrica "added" (quantos usuários têm o jogo) como proxy de popularidade
      concurrent: g.added ? `${Number(g.added).toLocaleString('pt-BR')} interessados` : '—',
      tags: g.genres ? g.genres.map((genre: any) => genre.name).slice(0, 3) : [],
      image: g.background_image || '/placeholder-image.jpg', // Fallback de segurança
      // Padrão de URL moderno da loja da Epic
      storeUrl: `https://store.epicgames.com/pt-BR/p/${g.slug}`,
    }))

    return NextResponse.json({ games })
  } catch (err) {
    console.error('❌ Epic / RAWG API error:', err)
    return NextResponse.json(
      { error: 'Falha ao buscar top jogos da Epic Games' }, 
      { status: 500 }
    )
  }
}