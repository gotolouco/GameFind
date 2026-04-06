import { NextRequest, NextResponse } from 'next/server';
import { GAMEFIND_SYSTEM_PROMPT } from '@/lib/prompts';
import { getPlatformProvider } from '@/lib/providers';
import { getRawgMetadata } from '@/lib/rawg';

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

export async function POST(req: NextRequest) {

  const { topGames, previousTitles = [], platform = 'epic' } = await req.json();

  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json({ error: 'GROQ_API_KEY não configurada' }, { status: 500 });
  }

  // Define dinamicamente o provedor com base na requisição
  const storeProvider = getPlatformProvider(platform);

  const randomGames = shuffle(topGames).slice(0, 5);
  const gameList = randomGames.map((g: any) => g.title).join(', ');

  const avoidList = previousTitles.length > 0
    ? `\nIMPORTANTE: NUNCA recomende estes jogos (já foram sugeridos): ${previousTitles.join(', ')}.`
    : '';

  const angles = [
    'Foque em jogos indie surpreendentes e joias escondidas.',
    'Foque em clássicos que todo gamer deveria ter jogado.',
    'Foque em lançamentos recentes dos últimos 2 anos.',
    'Foque em jogos com narrativa e história marcante.',
    'Foque em jogos com muitas horas de conteúdo e replay.',
    'Foque em jogos cooperativos ou multiplayer.',
    'Foque em gêneros diferentes dos jogos listados.',
    'Misture AAA com pequenas produções independentes.',
  ];
  const angle = angles[Math.floor(Math.random() * angles.length)];

  const userContextPrompt = `Aqui está o contexto para a sua curadoria:
  1. Jogos populares no momento: ${gameList}.
  2. Direcionamento criativo: ${angle}${avoidList}
  3. Plataforma para recomendação: ${platform.toLowerCase()}
  
  Gere exatamente 6 recomendações baseadas nesse perfil. 
  Lembre-se de retornar APENAS o bloco <games> com os dados em JSON, sem textos adicionais antes ou depois.`;

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        max_tokens: 1500,
        temperature: 0.9,
        messages: [
          { role: 'system', content: GAMEFIND_SYSTEM_PROMPT },
          { role: 'user', content: userContextPrompt }
        ],
      }),
    });

    if (!response.ok) {
      const errBody = await response.json();
      console.error('❌ Groq API erro:', response.status, errBody);
      return NextResponse.json({ error: 'Erro na IA' }, { status: 500 });
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || '';

    const match = text.match(/<games>\s*([\s\S]*?)\s*<\/games>/i);
    if (!match) {
      console.error('Retorno inesperado:', text);
      throw new Error('A IA não retornou o bloco <games> esperado.');
    }

    const cleanJson = match[1].replace(/[\x00-\x09\x0B\x0C\x0E-\x1F]/g, '').trim();
    const parsedGamesArray = JSON.parse(cleanJson);

    // O enriquecimento agora combina a Loja escolhida com a RAWG
    const enrichedGames = await Promise.all(
      parsedGamesArray.map(async (game: any) => {
        
        // 1. Vai à Epic/Steam buscar o Link da Loja
        const storeData = await storeProvider.getGameData(game.title);
        
        // 2. Vai à RAWG garantir os metadados visuais
        const rawgData = await getRawgMetadata(game.title);

        return { 
            ...game, 
            // Prefere a imagem da loja; mas se vier null (como na Epic), usa a da RAWG
            image: storeData.image || rawgData.image, 
            
            storeUrl: storeData.storeUrl,
            
            // A Epic não tem notas no endpoint; a RAWG preenche automaticamente essa lacuna
            storeScore: storeData.score || rawgData.score 
        };
      })
    );

    return NextResponse.json({ games: enrichedGames });
  } catch (err) {
    console.error(`❌ Recommendation error for platform [${platform}]:`, err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}