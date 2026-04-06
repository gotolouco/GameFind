export interface GameMetadata {
  image: string | null;
  storeUrl: string;
  score: number | null;
}

export interface PlatformProvider {
  getGameData(title: string): Promise<GameMetadata>;
}

import { SteamProvider } from '../providers/steam';
import { EpicProvider } from '../providers/epic';
// import { XboxProvider } from './xbox';
// import { PSNProvider } from './psn';

export function getPlatformProvider(platform: string): PlatformProvider {
  switch (platform.toLowerCase()) {
    case 'steam':
      return new SteamProvider();
    case 'epic':
      return new EpicProvider();
    // case 'xbox':
    //   return new XboxProvider();
    // case 'psn':
    //   return new PSNProvider();
    default:
      console.warn(`Plataforma ${platform} não suportada. Usando Steam como fallback.`);
      return new SteamProvider();
  }
}