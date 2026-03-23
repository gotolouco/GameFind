# 🎮 GAMEDROP

Recomendador de jogos de PC com IA. Usa **Groq** (gratuito) para gerar recomendações aleatórias e a **RAWG API** para buscar jogos específicos.

---

## ✨ Funcionalidades

- 🎲 Recomendações aleatórias por gênero via IA (Groq + LLaMA 3)
- 🔍 Busca de jogos específicos com imagens e notas (RAWG API)
- 📜 Histórico das últimas 10 sessões (localStorage)
- ❤️ Favoritar jogos na sessão atual
- 🚀 Pronto para deploy na Vercel

---

## 🚀 Como rodar

### 1. Clone o projeto
```bash
git clone https://github.com/seu-usuario/gamedrop.git
cd gamedrop
```

### 2. Instale as dependências
```bash
npm install
```

### 3. Configure as variáveis de ambiente
```bash
cp .env.local.example .env.local
```

Edite o `.env.local` com suas chaves:

```env
GROQ_API_KEY=sua_chave_groq_aqui
RAWG_API_KEY=sua_chave_rawg_aqui
```

#### Onde pegar as chaves (ambas gratuitas):
- **Groq**: [console.groq.com](https://console.groq.com) → API Keys → Create Key
- **RAWG**: [rawg.io/apidocs](https://rawg.io/apidocs) → Get API Key

### 4. Rode localmente
```bash
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000)

---

## 🌐 Deploy na Vercel

1. Suba o código no GitHub
2. Acesse [vercel.com](https://vercel.com) e conecte o repositório
3. Em **Settings → Environment Variables**, adicione:
   - `GROQ_API_KEY`
   - `RAWG_API_KEY`
4. Clique em **Deploy**

Seu site ficará disponível em `gamedrop.vercel.app` (ou domínio personalizado).

---

## 🗂️ Estrutura do projeto

```
gamedrop/
├── app/
│   ├── page.tsx               ← página principal
│   ├── layout.tsx             ← layout global
│   ├── globals.css            ← todos os estilos
│   └── api/
│       ├── recommend/route.ts ← Groq API (recomendações)
│       └── search/route.ts    ← RAWG API (busca)
├── components/
│   ├── GameCard.tsx           ← card de jogo
│   ├── GenrePills.tsx         ← seletor de gênero
│   ├── SearchBar.tsx          ← busca de jogos
│   └── HistoryPanel.tsx       ← histórico de sessões
├── lib/
│   └── history.ts             ← lógica de histórico (localStorage)
├── .env.local.example         ← modelo de variáveis de ambiente
└── README.md
```

---

## 🛠️ Stack

- **Next.js 14** (App Router)
- **TypeScript**
- **Groq API** (LLaMA 3 70B) — recomendações por IA
- **RAWG API** — banco de dados de jogos
- **CSS puro** — sem Tailwind, estilo próprio
