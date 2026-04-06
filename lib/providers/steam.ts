import { PlatformProvider, GameMetadata } from './index';

export class SteamProvider implements PlatformProvider {
  async getGameData(title: string): Promise<GameMetadata> {
    const fallbackUrl = `https://store.steampowered.com/search/?term=${encodeURIComponent(title)}`;
    try {
      const searchRes = await fetch(
        `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(title)}&l=latam&cc=BR`
      );
      const data = await searchRes.json();
      
      if (data?.items?.length > 0) {
        const appid = data.items[0].id;
        return {
          image: `https://cdn.akamai.steamstatic.com/steam/apps/${appid}/header.jpg`,
          storeUrl: `https://store.steampowered.com/app/${appid}`,
          score: data.items[0].metascore || null,
        };
      }
      return { image: null, storeUrl: fallbackUrl, score: null };
    } catch (error) {
      console.error(`Erro ao buscar dados na Steam para ${title}:`, error);
      return { image: null, storeUrl: fallbackUrl, score: null };
    }
  }
}