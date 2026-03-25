import { NextRequest, NextResponse } from 'next/server'

// Busca o AppID real na Steam para garantir link e imagem corretos
async function getSteamData(title: string) {
  try {
    // Busca na API de busca da Steam
    const searchRes = await fetch(
      `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(title)}&l=latam&cc=BR`
    )
    const data = await searchRes.json()

    if (data && data.items && data.items.length > 0) {
      const game = data.items[0]
      const appid = game.id

      return {
        // Imagem oficial da CDN da Steam (Header horizontal padrão)
        image: `https://cdn.akamai.steamstatic.com/steam/apps/${appid}/header.jpg`,
        // Link direto e garantido para a página do jogo
        steamUrl: `https://store.steampowered.com/app/${appid}`,
        // Caso queira usar o score real da Steam em vez do da IA
        steamScore: game.metascore || null
      }
    }
    
    // Fallback caso não encontre o jogo específico
    return {
      image: null,
      steamUrl: `https://store.steampowered.com/search/?term=${encodeURIComponent(title)}`
    }
  } catch (error) {
    console.error(`Erro ao buscar Steam Data para ${title}:`, error)
    return {
      image: null,
      steamUrl: `https://store.steampowered.com/search/?term=${encodeURIComponent(title)}`
    }
  }
}

export async function POST(req: NextRequest) {
  try {
    const { genre, previousTitles = [] } = await req.json()

    const genrePrompt =
      genre === 'qualquer'
        ? 'de qualquer gênero (misture bastante os gêneros)'
        : `do gênero ${genre} (pode incluir subgêneros relacionados)`

    const avoidList = previousTitles.length > 0
      ? `\n\nIMPORTANTE: NÃO recomende nenhum destes jogos: ${previousTitles.join(', ')}.`
      : ''

    const angles = [
      'Foque em jogos indie surpreendentes',
      'Foque em clássicos essenciais',
      'Foque em lançamentos recentes (últimos 2 anos)',
      'Foque em narrativa marcante',
      'Foque em alto fator replay',
      'Misture AAA com independentes'
    ]
    const angle = angles[Math.floor(Math.random() * angles.length)]

    const prompt = `Você é um especialista em jogos de PC. Recomende 6 jogos ${genrePrompt} que estejam disponíveis na Steam. ${angle}.${avoidList}

Responda APENAS em JSON puro, seguindo este formato:
{
  "games": [
    {
      "title": "Nome Exato do Jogo em Inglês",
      "genre": "Gênero principal",
      "year": 2023,
      "description": "Descrição curta em português",
      "score": 85,
      "tags": ["tag1", "tag2"],
      "why": "Frase motivadora em português"
    }
  ]
}

Regras:
- Use obrigatoriamente o nome oficial em INGLÊS no campo "title".
- Certifique-se de que o jogo existe na Steam.`

    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json({ error: 'GROQ_API_KEY não configurada' }, { status: 500 })
    }

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        max_tokens: 1200,
        temperature: 0.8, // Temperatura levemente menor para evitar nomes inventados
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    const data = await response.json()
    const text = data.choices?.[0]?.message?.content
    
    if (!text) throw new Error('Groq sem conteúdo')

    const clean = text.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(clean)

    // Aqui integramos os dados REAIS da Steam para cada recomendação da IA
    const gamesWithSteamData = await Promise.all(
      parsed.games.map(async (game: any) => {
        const steamDetails = await getSteamData(game.title)
        return {
          ...game,
          image: steamDetails.image,
          steamUrl: steamDetails.steamUrl,
          // Opcional: usar o score real da Steam se disponível
          score: steamDetails.steamScore || game.score 
        }
      })
    )

    return NextResponse.json({ games: gamesWithSteamData })

  } catch (err) {
    console.error('❌ Erro na rota:', err)
    return NextResponse.json({ error: 'Erro ao gerar recomendações' }, { status: 500 })
  }
}