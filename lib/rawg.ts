// Interfaces para garantir o Type Safety da resposta da API da RAWG
interface RawgGenre {
  id: number;
  name: string;
  slug: string;
}

interface RawgGame {
  id: number;
  name: string;
  released: string | null;
  background_image: string | null;
  genres?: RawgGenre[];
  metacritic: number | null;
  ratings_count: number;
  rating: number;
}

interface FetchStoreGamesParams {
  page: number;
  storeId: string;
  platformIds: string;
  generateStoreUrl: (gameName: string) => string;
}

/*Tags Banidas */
const BANNED_TERMS = [
  'nsfw', 'adult', 'sexual-content', 'hentai', 'gore',
  'erotic', 'sexual', 'porn', 'sex'
];

export async function fetchStoreGames({
  page,
  storeId,
  platformIds,
  generateStoreUrl
}: FetchStoreGamesParams) {
  
  // A RAWG tem um limite de 20 itens por página, mas para garantir que tenhamos pelo menos 12 jogos "seguros" para mostrar, pedimos 18.
  const FRONTEND_PAGE_SIZE = 12; 
  const RAWG_PAGE_SIZE = 18;     
  
  const rawgKey = process.env.RAWG_API_KEY;
  const today = new Date().toISOString().split('T')[0];
  const sixMonthsAgo = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const baseUrl = 'https://api.rawg.io/api/games';
    
  const query = new URLSearchParams({
    platforms: platformIds,
    stores: storeId, 
    ordering: '-released',
    dates: `${sixMonthsAgo},${today}`,
    page: page.toString(),
    page_size: RAWG_PAGE_SIZE.toString(), // Pedindo 18
    exclude_additions: 'true',
    exclude_tags: BANNED_TERMS.join(',')
  });

  if (rawgKey) query.append('key', rawgKey);

  const url = `${baseUrl}?${query.toString()}`;

  const res = await fetch(url, { next: { revalidate: 3600 } });
  
  if (!res.ok) throw new Error(`A API RAWG falhou com o status: ${res.status}`);
  
  const data = await res.json();

  // Aplica o filtro da malha fina (segurança)
  const safeResults = (data.results || []).filter((game: any) => {
    const titleLower = game.name.toLowerCase();
    const hasBannedWordInTitle = BANNED_TERMS.some(term => titleLower.includes(term));
    if (hasBannedWordInTitle) return false;

    if (game.tags && Array.isArray(game.tags)) {
      const hasBannedTag = game.tags.some((tag: any) => 
        BANNED_TERMS.includes(tag.slug.toLowerCase()) || 
        BANNED_TERMS.includes(tag.name.toLowerCase())
      );
      if (hasBannedTag) return false;
    }
    return true;
  });

  const slicedResults = safeResults.slice(0, FRONTEND_PAGE_SIZE);

  const releases = slicedResults.map((g: any) => ({
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
  }));

  const totalPages = Math.ceil((data.count || 0) / RAWG_PAGE_SIZE);

  return { 
    releases, 
    page, 
    pageSize: FRONTEND_PAGE_SIZE, 
    totalPages, 
    total: data.count 
  };
}

export async function getRawgMetadata(title: string) {
  const rawgKey = process.env.RAWG_API_KEY;
  if (!rawgKey) {
    console.warn('RAWG_API_KEY não configurada no .env.local');
    return { image: null, score: null };
  }

  try {
    const url = `https://api.rawg.io/api/games?search=${encodeURIComponent(title)}&key=${rawgKey}&page_size=1`;
    
    const res = await fetch(url, { next: { revalidate: 86400 } }); 
    
    if (!res.ok) {
      throw new Error(`RAWG search falhou: ${res.status}`);
    }

    const data = await res.json();

    if (data.results && data.results.length > 0) {
      const game = data.results[0] as RawgGame;
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