# Vendedor de IA · Unno Ambiental

Painel de controle e backend de orquestração de **1 vendedor de IA** para a
Unno Ambiental (distribuidora de químicos para controle de pragas). Fase 1 —
projetado para clonagem horizontal (frota de vendedores) sem retrabalho.

> Stack: **Next.js 14 (App Router) · TypeScript estrito · TailwindCSS ·
> shadcn/ui · Supabase (Postgres + pgvector + RLS) · OpenAI embeddings**.

## O que já está implementado (fundação + núcleo testável)

| Área | Arquivo(s) | Guard rail (§5) |
|---|---|---|
| **RAG anti-alucinação** | [lib/rag.ts](lib/rag.ts) | Sem contexto acima do threshold → `"não sei"` + escalonamento automático |
| **Embeddings** | [lib/embeddings.ts](lib/embeddings.ts) | OpenAI `text-embedding-3-small` (1536 dims), server-only |
| **Wallet lock** | [lib/wallet-lock.ts](lib/wallet-lock.ts) + [0002](supabase/migrations/0002_wallet_lock.sql) | Duas IAs nunca no mesmo cliente (atômico no banco) |
| **Agendador** | [lib/agendador.ts](lib/agendador.ts) | Janela 7h30–18h · toque a cada 30 dias · `opt_out` honrado |
| **Mercos** | [lib/mercos.ts](lib/mercos.ts) | Preço/estoque sempre ao vivo, nunca cacheados; retry/backoff |
| **Schema + RLS + pgvector** | [supabase/migrations](supabase/migrations) | RLS em todas as tabelas; índice IVFFlat |
| **Painel (shell)** | [app/(dashboard)](app/\(dashboard\)) | Sidebar + topbar com meta do mês |

O **núcleo puro** (decisão do RAG, wallet lock, janela/cadência) é testado sem
banco nem rede — ver [tests/](tests). Rode `npm test`.

### Camada de API (Route Handlers)

| Rota | Método | Função |
|---|---|---|
| [/api/rag/query](app/api/rag/query/route.ts) | POST | Retrieval + grounding; "não sei" abre escalonamento |
| [/api/mercos/produtos](app/api/mercos/produtos/route.ts) | GET | Catálogo ao vivo (preço/estoque nunca cacheados) |
| /api/mercos/produtos/[id] | GET | Produto ao vivo |
| [/api/orchestrator/atribuir](app/api/orchestrator/atribuir/route.ts) | POST | Wallet lock — conflito → **409** |
| [/api/orchestrator/elegiveis](app/api/orchestrator/elegiveis/route.ts) | GET | Fila de toques do dia (janela + cadência + opt-out) |
| [/api/webhooks/mercos](app/api/webhooks/mercos/route.ts) | POST | Espelha status de pedido no pipeline |
| [/api/webhooks/whatsapp](app/api/webhooks/whatsapp/route.ts) | GET/POST | Handshake de verificação + mensagens recebidas |

Erros de domínio têm status consistentes ([lib/http.ts](lib/http.ts)): Zod → 400,
conflito de carteira → 409, Mercos fora do ar → 503.

## Setup

```bash
npm install
cp .env.example .env.local   # preencha os segredos (nunca commite)
npm run typecheck            # TypeScript estrito, zero `any`
npm test                     # núcleo puro (RAG / wallet-lock / agendador)
npm run dev                  # http://localhost:3000 → /overview
```

### Banco (Supabase)

Aplique as migrations em ordem (`0001` → `0004`) via SQL Editor, CLI
(`supabase db push`) ou MCP. Elas criam extensões (`vector`, `pgcrypto`),
tabelas, RLS, o índice vetorial e as funções `atribuir_cliente` /
`match_base_conhecimento`.

## Próximas rodadas

- Telas com dados reais: carteira, conversas, kanban de pedidos, base de conhecimento, escalonamentos, vendedores.
- Ingestão de manuais → embeddings, com status na UI.
- Geração da resposta ao cliente (LLM) usando SOMENTE o contexto grounded do `/api/rag/query`.
- Roteamento do webhook de WhatsApp → interação → RAG.
- Autenticação do operador (Supabase Auth) protegendo o painel e as rotas.

## Deploy na Vercel

O projeto está pronto para deploy. Passos:

1. Suba o código para um repositório Git (GitHub/GitLab) e importe na Vercel,
   **ou** use a CLI: `npx vercel` (preview) / `npx vercel --prod` (produção).
2. Em **Project → Settings → Environment Variables**, configure (mesmos nomes do
   [.env.example](.env.example)):
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (secreta — server only)
   - `OPENAI_API_KEY`, `MERCOS_*`, `OMIE_*`, `WHATSAPP_VERIFY_TOKEN`
   - `NEXT_PUBLIC_SITE_URL` = domínio final (para OG/Twitter absolutos)
3. Deploy. O build (`next build`) já passa localmente.

**Marca / social:** logo em [app/icon.png](app/icon.png) (favicon) e imagem de
compartilhamento em [app/opengraph-image.jpeg](app/opengraph-image.jpeg) +
[app/twitter-image.jpeg](app/twitter-image.jpeg) — Next injeta as tags OG/Twitter
automaticamente. Valide depois em [opengraph.xyz](https://www.opengraph.xyz).

> Dica: sempre pare o `next dev` antes de rodar `next build` no mesmo diretório
> — rodar os dois juntos corrompe a pasta `.next`.

## Conformidade

Opt-out e registro de consentimento são **nativos** do schema (LGPD/CDC).
Validar a política de identificação com o jurídico antes de escalar volume.
```
