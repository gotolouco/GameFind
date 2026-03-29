# 🎮 GAMEFIND

> Plataforma web de recomendação de jogos de PC impulsionada por Inteligência Artificial.

O **GAMEFIND** combina uma interface moderna com múltiplas fontes de dados (Steam, RAWG, SteamSpy) e um chatbot especializado para oferecer recomendações personalizadas e relevantes.

---

## ✨ Funcionalidades

- **Recomendações com IA:** Sugestões inteligentes e personalizadas utilizando a API do Groq (LLAMA 3.3 70B).
- **Chatbot Especializado:** Assistente conversacional focado em curadoria de jogos, com múltiplas camadas de segurança e conformidade com a LGPD (anonimização de IP via hash SHA-256).
- **Integração de Dados em Tempo Real:** Conexão direta com as APIs da Steam, SteamSpy e RAWG para buscar lançamentos, top jogados e metadados oficiais.
- **Autenticação Segura:** Login via Email/Senha e OAuth (Google) gerenciado pelo Supabase Auth.
- **Cloud Sync:** Sincronização e armazenamento de favoritos na nuvem utilizando Supabase (PostgreSQL) com Row Level Security (RLS).
- **Histórico Local:** Acompanhamento das últimas sessões de recomendação e avaliações.

---

## 🛠️ Stack Tecnológica

| Camada | Tecnologia | Finalidade |
| :--- | :--- | :--- |
| **Frontend** | Next.js 14 + TypeScript | Interface React com App Router |
| **Estilização** | CSS Puro | Design system customizado global |
| **IA / LLM** | Groq API (LLAMA 3) | Geração de recomendações |
| **Banco de Dados** | Supabase (PostgreSQL) | Armazenamento de favoritos |
| **Autenticação** | Supabase Auth | Gestão de usuários e sessões |
| **Deploy** | Vercel | Hospedagem e CI/CD |

---

## 🚀 Como rodar localmente

### 1. Clone o projeto
```bash
git clone [https://github.com/seu-usuario/gamefind.git](https://github.com/seu-usuario/gamefind.git)
cd gamefind
npm install
```
### 2. Configuração de Variáveis de Ambiente
```bash
.env.local

# IA - Groq (gratuito em console.groq.com)
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Imagens e busca de jogos - RAWG (gratuito em rawg.io/apidocs)
RAWG_API_KEY=sua_chave_rawg

# Steam Web API (gratuito em [steamcommunity.com/dev/apikey](https://steamcommunity.com/dev/apikey))
STEAM_API_KEY=sua_chave_steam

# Supabase - banco de dados e autenticação (gratuito em supabase.com)
NEXT_PUBLIC_SUPABASE_URL=[https://xxxx.supabase.co](https://xxxx.supabase.co)
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_anonima

# URL de produção necessário para OAuth funcionar na Vercel
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Salt para anonimização de IPs (segurança/LGPD)
IP_HASH_SALT=string_aleatoria_e_longa_aqui
```

### 3. Rodar o Servidor
```bash
npm run dev
```
## 🌐 Deploy
https://gamefind.vercel.app

## 🗂️ Estrutura do Projeto (App Router)
```bash
gamefind/
├── app/
│   ├── api/
│   │   ├── chat/route.ts        # Chatbot com segurança LGPD
│   │   ├── recommend/route.ts   # Recomendações aleatórias por gênero
│   │   ├── search/route.ts      # Busca de jogos via RAWG
│   │   └── steam/               # Lançamentos, novidades e top jogados
│   ├── auth/callback/route.ts   # Callback OAuth (Google)
│   ├── globals.css              # Design system completo
│   ├── layout.tsx               # Layout raiz com AuthProvider 
│   └── page.tsx                 # Página principal
├── components/
│   ├── AuthModal.tsx            # Modal login/cadastro/recuperação
│   ├── ChatPanel.tsx            # Interface do chatbot
│   ├── GameCard.tsx             # Card de jogo com avaliação
│   ├── SteamPanel.tsx           # Painel de integração Steam
│   └── ...                      # Outros componentes de UI
├── lib/
│   ├── favorites.ts             # CRUD de favoritos (Supabase)
│   ├── history.ts               # Histórico (Supabase)
|   ├── ModalContext.ts          
│   ├── supabase.ts              # Cliente Supabase
│   └── prompts.ts               # system prompt
└── .env.local.example           # Template de variáveis
```
## 🛡️ Segurança e Banco de Dados

- Row Level Security (RLS): A tabela favorites no Supabase possui políticas rigorosas garantindo que cada usuário acesse, modifique ou delete apenas seus próprios dados (auth.uid() = user_id).

- Conformidade LGPD: O chatbot opera com anonimização de IP (hash SHA-256 com salt) e não armazena logs com dados pessoais. O histórico de sessões é local (localStorage).

- Rate Limiting: A API do chatbot limita requisições (20 req/min por IP) para evitar abusos.

## 🗺️ Roadmap Futuro

- Alta Prioridade: Perfil do usuário (Avatar, bio, lista pública de favoritos), Exportar favoritos (JSON ou CSV) e Otimização Mobile (UI perfeita em dispositivos móveis).


- Média Prioridade: Compartilhar lista (Link público) e Filtros avançados (preço, ano, nota Metacritic).


- Baixa Prioridade: PWA (App instalável), Notificações de promoções, Integração GOG e um pequeno Assistente virtual.