import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const query = searchParams.get('q')

  if (!query) {
    return NextResponse.json({ error: 'Query obrigatória' }, { status: 400 })
  }

  try {
    const url = `https://api.rawg.io/api/games?search=${encodeURIComponent(query)}&page_size=6&key=${process.env.RAWG_API_KEY}`
    const response = await fetch(url)
    const data = await response.json()

    const games = (data.results || []).map((g: any) => ({
      title: g.name,
      genre: g.genres?.[0]?.name || 'N/A',
      year: g.released ? new Date(g.released).getFullYear() : null,
      score: g.metacritic || Math.round(g.rating * 20) || null,
      tags: g.genres?.slice(0, 3).map((x: any) => x.name) || [],
      image: g.background_image || null,
      description: `Avaliado por ${g.ratings_count?.toLocaleString('pt-BR') || 0} jogadores. Plataformas: ${g.platforms?.slice(0, 3).map((p: any) => p.platform.name).join(', ') || 'PC'}.`,
      why: `${g.rating.toFixed(1)}/5 estrelas na comunidade RAWG`,
    }))

    return NextResponse.json({ games })
  } catch (err) {
    console.error('RAWG error:', err)
    return NextResponse.json({ error: 'Falha na busca' }, { status: 500 })
  }
}
