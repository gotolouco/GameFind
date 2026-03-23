import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // SteamSpy — top 100 jogos das últimas 2 semanas, sem precisar de chave
    const res = await fetch('https://steamspy.com/api.php?request=top100in2weeks', {
      next: { revalidate: 3600 }, // cache de 1 hora
    })
    const data = await res.json()

    const games = Object.values(data)
      .slice(0, 12)
      .map((g: any) => ({
        appid: g.appid,
        title: g.name,
        players2weeks: g.players_forever
          ? Number(g.players_forever).toLocaleString('pt-BR')
          : '—',
        concurrent: g.ccu ? Number(g.ccu).toLocaleString('pt-BR') : '—',
        score: g.score_rank || null,
        tags: g.tags ? Object.keys(g.tags).slice(0, 3) : [],
        image: `https://cdn.akamai.steamstatic.com/steam/apps/${g.appid}/header.jpg`,
        storeUrl: `https://store.steampowered.com/app/${g.appid}`,
      }))

    return NextResponse.json({ games })
  } catch (err) {
    console.error('❌ SteamSpy error:', err)
    return NextResponse.json({ error: 'Falha ao buscar top jogos' }, { status: 500 })
  }
}
