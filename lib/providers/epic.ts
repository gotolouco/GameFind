import { PlatformProvider, GameMetadata } from './index';

export class EpicProvider implements PlatformProvider {
  async getGameData(title: string): Promise<GameMetadata> {
    const fallbackUrl = `https://store.epicgames.com/pt-PT/browse?q=${encodeURIComponent(title)}`;

    try {
      const response = await fetch('https://graphql.epicgames.com/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `
            query searchStoreQuery($keywords: String, $country: String!, $locale: String, $count: Int) {
              Catalog {
                searchStore(keywords: $keywords, country: $country, locale: $locale, count: $count) {
                  elements {
                    title
                    urlSlug
                    catalogNs {
                      mappings(pageType: "productHome") {
                        pageSlug
                      }
                    }
                    keyImages {
                      type
                      url
                    }
                  }
                }
              }
            }
          `,
          variables: {
            keywords: title,
            country: "BR",
            locale: "pt-PT",
            count: 1
          }
        }),
      });

      if (!response.ok) throw new Error(`Erro HTTP: ${response.status}`);

      const json = await response.json();
      const game = json.data?.Catalog?.searchStore?.elements?.[0];

      if (game) {
        const slug = game.catalogNs?.mappings?.[0]?.pageSlug || game.urlSlug;
        const storeUrl = slug 
          ? `https://store.epicgames.com/pt-PT/p/${slug}` 
          : fallbackUrl;

        // --- NOVO SISTEMA DE RESOLUÇÃO DE IMAGEM ---
        let imageUrl = null;
        if (game.keyImages && game.keyImages.length > 0) {
          // 1. Tenta achar os formatos "Widescreen" (Ideais para o GameCard)
          const preferredImage = game.keyImages.find((img: any) => 
            ['OfferImageWide', 'DieselStoreFrontWide', 'Thumbnail'].includes(img.type)
          );

          // 2. Se não achar, pega a primeira imagem que a Epic mandar (melhor que sem foto)
          imageUrl = preferredImage ? preferredImage.url : game.keyImages[0].url;
        }
        // ------------------------------------------

        return {
          image: imageUrl,
          storeUrl: storeUrl,
          score: null, 
        };
      }

      return { image: null, storeUrl: fallbackUrl, score: null };
      
    } catch (error) {
      console.error(`❌ Erro ao buscar dados na Epic para "${title}":`, error);
      return { image: null, storeUrl: fallbackUrl, score: null };
    }
  }
}