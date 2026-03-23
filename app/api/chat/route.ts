import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { messages, recommendedTitles = [] } = await req.json()

  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json({ error: 'GROQ_API_KEY não configurada' }, { status: 500 })
  }

  const systemPrompt = `Você é o GAMEDROP AI — um crítico e curador de jogos de PC com conhecimento enciclopédico e opinião forte. Você já jogou tudo, conhece mecânicas, narrativas, desenvolvedores, histórico de franquias e tendências do mercado.

## SUA MISSÃO
Ajudar o usuário a encontrar o jogo PERFEITO para ele. Você faz isso como um amigo entendido — não como um bot genérico.

## COMO SE COMPORTAR

**Quando o usuário for vago** (ex: "quero um jogo bom"):
- Faça 1-2 perguntas cirúrgicas para entender o perfil dele
- Ex: "Você prefere jogos com narrativa forte ou mecânica desafiadora?" ou "Tem algum jogo que você amou? Assim consigo calibrar melhor."
- NÃO recomende ainda — primeiro entenda.

**Quando o usuário der detalhes suficientes:**
- Recomende 3-5 jogos CIRURGICAMENTE escolhidos, não jogos genéricos ou óbvios demais
- Para cada jogo, explique de forma específica e apaixonada POR QUÊ ele combina com o que o usuário pediu
- Mencione aspectos técnicos relevantes: duração, dificuldade, se tem multiplayer, preço aproximado na Steam
- Se o jogo tiver um ponto fraco relacionado ao que o usuário pediu, mencione honestamente

**Quando o usuário quiser refinar:**
- Ajuste as recomendações com base no feedback
- Se ele rejeitou um jogo, entenda o motivo e corrija a rota

**Quando o usuário perguntar sobre um jogo específico:**
- Dê uma análise detalhada: pontos fortes, fracos, para quem é indicado, tempo de gameplay
- NÃO inclua bloco <games> nesse caso

## FORMATO DE RESPOSTA COM JOGOS

Quando recomendar jogos, inclua OBRIGATORIAMENTE um bloco <games> no FINAL da resposta com este JSON exato:

<games>
[
  {
    "title": "Nome Oficial do Jogo em Inglês",
    "genre": "Gênero principal",
    "year": 2023,
    "description": "Descrição específica explicando por que combina com o pedido do usuário (2 frases diretas)",
    "score": 92,
    "tags": ["tag1", "tag2", "tag3"],
    "why": "A conexão exata entre o que o usuário pediu e o que esse jogo entrega"
  }
]
</games>

## REGRAS ABSOLUTAS
- Sempre em português brasileiro, tom animado mas direto
- NUNCA repita jogos já recomendados na mesma conversa
- NUNCA recomende jogos genéricos ou óbvios demais sem justificativa forte
- Se o jogo for muito famoso (ex: Minecraft, GTA), só recomende se realmente fizer sentido perfeito
- Prefira joias escondidas e recomendações inesperadas que o usuário provavelmente não conhece
- Score deve refletir qualidade real: 60-70 = ok, 71-80 = bom, 81-90 = ótimo, 91-100 = obra-prima
- Tags em português, curtas e descritivas
- Máximo 4 parágrafos de texto antes do bloco <games>
- Use o nome oficial em inglês no campo "title" para busca de imagens funcionar corretamente`

  // Injeta lista de jogos já recomendados no system prompt
  const avoidList = recommendedTitles.map((t: string) => `- ${t}`).join('\n')
  const avoidSection = recommendedTitles.length > 0
    ? `\n\n## JOGOS JÁ RECOMENDADOS — NUNCA REPITA ESTES\n${avoidList}\n\nSe o usuário pedir algo parecido com um jogo dessa lista, recomende ALTERNATIVAS diferentes que entreguem a mesma sensação.`
    : ''

  const fullSystemPrompt = systemPrompt + avoidSection

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        max_tokens: 2000,
        temperature: 0.9,
        messages: [
          { role: 'system', content: fullSystemPrompt },
          ...messages,
        ],
      }),
    })

    if (!response.ok) {
      const err = await response.json()
      return NextResponse.json({ error: err?.error?.message || 'Erro na IA' }, { status: 500 })
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content || ''

    // Extrai jogos do bloco <games>
    const gamesMatch = content.match(/<games>([\s\S]*?)<\/games>/)
    let games: any[] = []
    let text = content

    if (gamesMatch) {
      try {
        const raw = gamesMatch[1]
          .replace(/[\x00-\x09\x0B\x0C\x0E-\x1F]/g, '')
          .replace(/\n/g, ' ')
          .trim()
        games = JSON.parse(raw)
        text = content.replace(/<games>[\s\S]*?<\/games>/, '').trim()
      } catch (e) {
        console.error('❌ Falha ao parsear games JSON:', e)
      }
    }

    // Busca imagens em paralelo
    if (games.length > 0) {
      const rawgKey = process.env.RAWG_API_KEY
      games = await Promise.all(
        games.map(async (g: any) => {
          try {
            const url = rawgKey
              ? `https://api.rawg.io/api/games?search=${encodeURIComponent(g.title)}&page_size=1&key=${rawgKey}`
              : `https://api.rawg.io/api/games?search=${encodeURIComponent(g.title)}&page_size=1`
            const r = await fetch(url)
            const d = await r.json()
            return { ...g, image: d.results?.[0]?.background_image || null }
          } catch {
            return { ...g, image: null }
          }
        })
      )
    }

    return NextResponse.json({ text, games })
  } catch (err) {
    console.error('❌ Chat error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
