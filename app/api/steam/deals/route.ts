import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = 12

  try {
    const rawgKey = process.env.RAWG_API_KEY
    const today = new Date().toISOString().split('T')[0]
    const oneYearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    // RAWG — lançamentos recentes e próximos, ordenados por data, plataforma PC
    const url = rawgKey
      ? `https://api.rawg.io/api/games?key=${rawgKey}&platforms=4&ordering=-released&dates=${oneYearAgo},${today}&page=${page}&page_size=${pageSize}&exclude_additions=true`
      : `https://api.rawg.io/api/games?platforms=4&ordering=-released&dates=${oneYearAgo},${today}&page=${page}&page_size=${pageSize}&exclude_additions=true`

    const res = await fetch(url, { next: { revalidate: 3600 } })
    const data = await res.json()

    console.log(`🆕 RAWG: ${data.results?.length ?? 'erro'} jogos | Total: ${data.count ?? 'erro'} | Página ${page} | Keys: ${Object.keys(data)}`)

    const releases = (data.results || []).map((g: any) => ({
      appid: g.id,
      title: g.name,
      releaseDate: g.released
        ? new Date(g.released).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
        : null,
      comingSoon: false,
      price: 'Ver na Steam',
      discount: 0,
      originalPrice: null,
      image: g.background_image,
      storeUrl: `https://store.steampowered.com/search/?term=${encodeURIComponent(g.name)}`,
      genres: g.genres?.slice(0, 2).map((x: any) => x.name) || [],
      rating: g.metacritic || null,
      reviewScore: g.ratings_count
        ? `${g.ratings_count.toLocaleString('pt-BR')} avaliações`
        : null,
      rawgRating: g.rating ? `${g.rating.toFixed(1)}/5` : null,
    }))

    const totalPages = Math.ceil((data.count || 0) / pageSize)

    return NextResponse.json({ releases, page, pageSize, totalPages, total: data.count })
  } catch (err) {
    console.error('❌ RAWG releases error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
