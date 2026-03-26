import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const page = parseInt(searchParams.get('page') || '1', 10)
  const pageSize = 12

  try {
    const rawgKey = process.env.RAWG_API_KEY
    
    // Captura a data de hoje e a data de 6 meses atrás (~180 dias)
    const today = new Date().toISOString().split('T')[0]
    const sixMonthsAgo = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    // Construção robusta da URL usando URLSearchParams
    const baseUrl = 'https://api.rawg.io/api/games'
    const query = new URLSearchParams({
      platforms: '4', // Plataforma PC
      ordering: '-released', // Ordena do mais recente para o mais antigo
      dates: `${sixMonthsAgo},${today}`, // Apenas jogos dos últimos 6 meses
      page: page.toString(),
      page_size: pageSize.toString(),
      exclude_additions: 'true' // Ignora DLCs
    })

    // Só anexa a chave de API se ela existir no ambiente
    if (rawgKey) {
      query.append('key', rawgKey)
    }

    const url = `${baseUrl}?${query.toString()}`

    // Faz o fetch com revalidação de 1 hora para economizar requisições e garantir performance
    const res = await fetch(url, { next: { revalidate: 3600 } })
    
    if (!res.ok) {
      throw new Error(`A API RAWG falhou com o status: ${res.status}`)
    }
    
    const data = await res.json()

    // Mantive o seu console.log para debug no terminal
    console.log(`🆕 RAWG: ${data.results?.length ?? 0} jogos | Total: ${data.count ?? 0} | Página ${page}`)

    // Mapeamento defensivo dos dados
    const releases = (data.results || []).map((g: any) => ({
      appid: g.id,
      title: g.name,
      releaseDate: g.released
        ? new Date(g.released).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
        : 'Data desconhecida',
      
      // Avalia dinamicamente se o jogo ainda vai lançar (baseado na data)
      comingSoon: g.released ? new Date(g.released) > new Date() : false,
      
      price: 'Ver na Loja',
      discount: 0,
      originalPrice: null,
      
      // Prevenção contra quebra de layout caso o jogo não tenha capa
      image: g.background_image || 'https://placehold.co/600x400/1f2937/ffffff?text=Sem+Imagem',
      
      storeUrl: `https://store.steampowered.com/search/?term=${encodeURIComponent(g.name)}`,
      
      // Aumentei a exibição de gêneros de 2 para 3 para enriquecer a UI
      genres: g.genres?.slice(0, 3).map((x: any) => x.name) || [],
      
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