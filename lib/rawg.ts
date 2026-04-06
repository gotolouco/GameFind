/* Este arquivo contém a função genérica para buscar jogos de uma loja usando a API RAWG.*/

/* FetchStoreGamesParams é a interface que define os parâmetros necessários para a função fetchStoreGames. Ela inclui:
- page: o número da página a ser buscada.
- storeId: o ID da loja
- platformIds: os IDs das plataformas
- generateStoreUrl: uma função que recebe o nome do jogo e retorna a URL da loja para esse jogo. */

interface FetchStoreGamesParams {
  page: number
  storeId: string
  platformIds: string
  generateStoreUrl: (gameName: string) => string
}

/* A função fetchStoreGames é uma função assíncrona que busca jogos de uma loja específica usando a API RAWG. 
Ela recebe um objeto com os parâmetros definidos na interface FetchStoreGamesParams e retorna um objeto contendo os jogos encontrados, 
informações de paginação e o total de jogos. */
export async function fetchStoreGames({
  page,
  storeId,
  platformIds,
  generateStoreUrl
}: FetchStoreGamesParams) {
  const pageSize = 12
  const rawgKey = process.env.RAWG_API_KEY
  
  const today = new Date().toISOString().split('T')[0]
  const sixMonthsAgo = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const baseUrl = 'https://api.rawg.io/api/games'
    
  const query = new URLSearchParams({
    platforms: platformIds,
    stores: storeId, 
    ordering: '-released',
    dates: `${sixMonthsAgo},${today}`,
    page: page.toString(),
    page_size: pageSize.toString(),
    exclude_additions: 'true'
  })

  if (rawgKey) {
    query.append('key', rawgKey)
  }

  const url = `${baseUrl}?${query.toString()}`

  const res = await fetch(url, { next: { revalidate: 3600 } })
  
  if (!res.ok) {
    throw new Error(`A API RAWG falhou com o status: ${res.status}`)
  }
  
  const data = await res.json()

  const releases = (data.results || []).map((g: any) => ({
    appid: g.id,
    title: g.name,
    releaseDate: g.released
      ? new Date(g.released).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
      : 'Data desconhecida',
    comingSoon: g.released ? new Date(g.released) > new Date() : false,
    price: 'Ver na Loja',
    discount: 0,
    originalPrice: null,
    image: g.background_image || 'https://placehold.co/600x400/1f2937/ffffff?text=Sem+Imagem',
    storeUrl: generateStoreUrl(g.name),
    genres: g.genres?.slice(0, 3).map((x: any) => x.name) || [],
    rating: g.metacritic || null,
    reviewScore: g.ratings_count
      ? `${g.ratings_count.toLocaleString('pt-BR')} avaliações`
      : null,
    rawgRating: g.rating ? `${g.rating.toFixed(1)}/5` : null,
  }))

  const totalPages = Math.ceil((data.count || 0) / pageSize)

  return { releases, page, pageSize, totalPages, total: data.count }
}

export async function getRawgMetadata(title: string) {
  const rawgKey = process.env.RAWG_API_KEY;
  if (!rawgKey) {
    console.warn('RAWG_API_KEY não configurada no .env.local');
    return { image: null, score: null };
  }

  try {
    // Fazemos uma query focada no título (search) e limitamos a 1 resultado
    const url = `https://api.rawg.io/api/games?search=${encodeURIComponent(title)}&key=${rawgKey}&page_size=1`;
    
    // Podemos manter o revalidate (cache) alto, pois capas e notas antigas raramente mudam
    const res = await fetch(url, { next: { revalidate: 86400 } }); 
    
    if (!res.ok) {
      throw new Error(`RAWG search falhou: ${res.status}`);
    }

    const data = await res.json();

    if (data.results && data.results.length > 0) {
      const game = data.results[0];
      return {
        image: game.background_image || null,
        score: game.metacritic || null 
      };
    }
    
    return { image: null, score: null };
  } catch (err) {
    console.error(`❌ Erro na API RAWG ao buscar metadados para "${title}":`, err);
    return { image: null, score: null };
  }
}