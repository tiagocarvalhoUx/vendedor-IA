# 🤖 PROMPT-COMANDO — Vendedor de IA / RAG · Unno Ambiental

> **Formato:** Prompt de engenharia (copiar e colar em builder de IA / Claude Code / Cursor)
> **Framework:** Regra de Ouro — 7 seções · Elite Web Designer
> **Stack:** Next.js 14 (App Router) + TypeScript + TailwindCSS + shadcn/ui + Supabase (Postgres + pgvector + RLS)
> **Escopo:** APENAS o Vendedor de IA (Fase 1). Roadmap de agentes = fora do escopo.
> **Nota técnica:** Vite foi removido — Next.js já possui bundler próprio; os dois são concorrentes.

---

## 🧩 COMANDO PRINCIPAL

> Você é um **engenheiro de software sênior** especialista em SaaS multi-tenant, sistemas RAG anti-alucinação e integrações REST. Construa o painel de controle e o backend de orquestração do **Vendedor de IA da Unno Ambiental** aplicando rigorosamente as 7 seções abaixo, as melhores práticas de UI/UX e arquitetura escalável horizontalmente. Entregue código limpo, tipado, comentado em pt-BR e pronto para produção.

---

## 1️⃣ FUNDAÇÃO — Contexto

**Persona da IA construtora:** engenheiro sênior full-stack + arquiteto de dados + especialista em UI/UX.

**Quem usa o sistema:**
- **Operador único** (Marcio / você) — papel de *"fiscal de robôs"*. Não é vendedor: supervisiona, aprova escalonamentos, acompanha metas.
- **Vendedores de IA** — agentes autônomos que consomem a base e disparam ligação/WhatsApp (integrações externas orquestradas pelo backend).

**Domínio:** distribuidora de produtos químicos para controle de pragas. Ticket médio R$15.000. Venda 100% por ligação + WhatsApp. Faturamento ~R$1,5M/mês.

**Limite da entrega (o que ESTE sistema é):**
- Painel de controle web (dashboard do operador)
- Base de conhecimento RAG (Supabase + pgvector) com regra anti-alucinação
- Backend de orquestração que conecta Twilio ↔ ElevenLabs ↔ WhatsApp ↔ Mercos ↔ Supabase
- Motor de carteira exclusiva por vendedor (wallet lock)
- Pipeline de pedidos espelhando o Mercos

**Fora do escopo:** treinar a voz do ElevenLabs, os 10 agentes do roadmap (§16 do briefing), a IA nativa do Mercos.

---

## 2️⃣ OBJETIVO DIRETO

Construir o **cérebro e o painel** de 1 vendedor de IA capaz de:
1. Puxar cliente + catálogo do **Mercos** (produtos, estoque, preço, desconto, condições).
2. Iniciar contato (ligação → autorização → WhatsApp) dentro do horário **7h30–18h**, em ritmo humano.
3. Tirar dúvidas técnicas **apenas com base no manual da Unno** (base fechada, zero alucinação).
4. Montar pedido no Mercos → financeiro → aprovação → pagamento → faturamento.
5. Manter o cliente informado de cada etapa do envio.

**Meta de validação (Fase 1):** R$100.000/mês validados (~7 pedidos). O sistema deve nascer pronto para **clonagem horizontal** (Fase 2: 4+ vendedores idênticos + orquestradora), mas sem construir a orquestradora agora.

---

## 3️⃣ ENTRADA & SAÍDA (I/O)

### Entradas do sistema
| Fonte | Dado | Como |
|---|---|---|
| Mercos (REST) | produtos, estoque, preço, desconto, pedidos, status, webhooks | ao vivo, nunca cacheado para preço/estoque |
| Omie (REST) | dados de ERP / financeiro | leitura |
| Manuais Unno | praga × produto × dosagem × modo de uso | ingestão → embeddings pgvector |
| Cliente | fala/mensagem (voz e texto) | Twilio/ElevenLabs/WhatsApp → transcrição |
| Operador | aprovações, config de vendedor, revisão de escalonamentos | painel web |

### Saídas do sistema
- Respostas **fundamentadas** (grounded) ao cliente, sempre citando a origem no manual.
- `"não sei"` + **escalonamento para humano** quando a resposta não estiver no manual.
- Pedidos criados/atualizados no Mercos.
- Dashboards de meta, carteira, conversas, pedidos e escalonamentos.

### Contrato RAG (regra de ouro do domínio)
```
resposta = f(pergunta, contexto_recuperado)
SE contexto_recuperado.score < THRESHOLD  →  resposta = "não sei" + escalonar
NUNCA  →  gerar dosagem/recomendação fora do contexto recuperado
SEMPRE →  anexar {fonte, trecho, id_manual} à resposta
```

---

## 4️⃣ FORMATO DE SAÍDA (entregável de código)

Estrutura de pastas Next.js App Router:

```
/app
  /(dashboard)
    /overview          → metas, faturamento vs R$100k, comissão projetada
    /carteira          → clientes por vendedor, status, próximo toque
    /conversas         → transcrições + resumo + sentimento
    /pedidos           → pipeline kanban espelhando Mercos
    /base-conhecimento → CRUD manuais + status de embeddings
    /escalonamentos    → fila "não sei" para revisão humana
    /vendedores        → config persona, número, horário, chip/IP
  /api
    /mercos/*          → proxy tipado da REST do Mercos
    /rag/query         → retrieval + grounding + threshold
    /webhooks/mercos   → status de pedido
    /webhooks/whatsapp → mensagens recebidas
    /orchestrator/*    → wallet lock, agendamento de toques
/lib
  supabase.ts · mercos.ts · rag.ts · embeddings.ts · wallet-lock.ts
/components/ui         → shadcn/ui
/types                 → tipos de domínio (Cliente, Pedido, VendedorIA, etc.)
/supabase/migrations   → schema + RLS + pgvector
```

### Schema Supabase (tabelas mínimas)
```sql
vendedores_ia    (id, nome, persona, numero_whatsapp, chip, ip,
                  horario_inicio, horario_fim, status, created_at)

clientes         (id, mercos_id, nome, empresa, telefone, whatsapp,
                  status, -- frio | morno | quente
                  intervalo_contato_dias DEFAULT 30,
                  ultimo_contato, vendedor_ia_id, -- WALLET LOCK (FK único ativo)
                  preferencias jsonb, opt_out boolean DEFAULT false)

base_conhecimento (id, tipo, -- manual | argumento | objecao
                  praga, produto, dosagem, modo_uso, conteudo,
                  fonte, embedding vector(1536))

interacoes       (id, cliente_id, vendedor_ia_id, canal, -- ligacao | whatsapp
                  transcricao, resumo, sentimento, created_at)

pedidos          (id, cliente_id, vendedor_ia_id, mercos_pedido_id,
                  status, -- rascunho|enviado_financeiro|aprovado|
                          -- aguardando_pagamento|pago|faturado|enviado
                  itens jsonb, valor_total, frete, created_at)

escalonamentos   (id, cliente_id, vendedor_ia_id, pergunta, motivo,
                  status, -- aberto | resolvido
                  humano_responsavel, resposta, created_at)
```
- **RLS obrigatório** em todas as tabelas.
- **Índice IVFFlat/HNSW** em `base_conhecimento.embedding`.
- **Constraint de wallet lock:** um `cliente` só pode ter 1 `vendedor_ia_id` ativo → duas IAs nunca falam com o mesmo cliente.

---

## 5️⃣ GUARD RAILS — Critérios de aceite

Uma entrega correta atende **todos**:

- [ ] **Anti-alucinação real:** toda resposta técnica passa pelo `/api/rag/query` com threshold; sem contexto → `"não sei"` + escalonamento automático. Testar com pergunta fora do manual e verificar o fallback.
- [ ] **Preço/estoque sempre ao vivo** no Mercos — nunca persistidos como fonte de verdade.
- [ ] **Wallet lock** provado: tentar atribuir cliente já ativo a outra IA → bloqueio.
- [ ] **Janela 7h30–18h** respeitada pelo agendador; fora disso, sem contato ativo.
- [ ] **Toque de manutenção a cada 30 dias** (ou intervalo do cliente) para não perder cliente pela regra dos 90 dias da casa.
- [ ] **Pipeline de pedido** reflete o ciclo completo (§9 do briefing), com sync bidirecional Mercos ↔ painel.
- [ ] **Escalonamento** vira fila revisável pelo operador.
- [ ] **LGPD:** consentimento registrado, `opt_out` honrado em todos os canais, base de dados de contato tratada com finalidade e retenção.
- [ ] **UI/UX:** responsivo, dark/light, pt-BR, data-dense mas limpo, acessível (contraste AA, navegação por teclado), loading/empty/error states em cada view.
- [ ] **Código:** TypeScript estrito, sem `any`, funções puras testáveis no core do RAG e do wallet lock, comentários em pt-BR.

---

## 6️⃣ AMBIGUIDADE & ERROS

- **Entrada incompleta do cliente** (dados faltando no Mercos) → não inventar; sinalizar no painel e pausar o pedido.
- **Mercos/Omie fora do ar** → retry com backoff; se persistir, marcar interação como `pendente_integracao` e alertar operador. Nunca prosseguir venda sem preço/estoque confirmados.
- **Baixa confiança do RAG** → `"não sei"` + escalonamento (nunca "melhor palpite").
- **Ban de número WhatsApp** → isolar o vendedor afetado; os demais continuam (modelo horizontal, frota de caminhões). Marcar `vendedor_ia.status = banido`.
- **Conflito de carteira** → wallet lock resolve na base; se detectar corrida, transação atômica vence.
- **Pergunta fora do domínio** (não é sobre produto/pedido) → responder cordialmente que não é o escopo e, se relevante, escalar.

---

## 7️⃣ PROIBIÇÕES

- ❌ **Nunca alucinar dosagem, praga ou recomendação química.** Produto químico não admite chute. Fora do manual = `"não sei"`.
- ❌ **Nunca usar o número principal da empresa** — cada IA com número, chip e IP próprios.
- ❌ **Nunca disparar em rajada / discagem em massa** — ritmo humano, volume de humano.
- ❌ **Nunca contatar fora de 7h30–18h** de forma ativa.
- ❌ **Nunca ignorar `opt_out`** nem contatar cliente que pediu intervalo maior.
- ❌ **Nunca persistir preço/estoque** como verdade — sempre ao vivo no Mercos.
- ❌ **Nunca duas IAs no mesmo cliente** — wallet lock é inegociável.
- ❌ **Não usar `any` em TypeScript**, não deixar segredos no client, não expor chaves do Mercos/Omie/ElevenLabs no frontend (tudo via API routes/server).

---

## 🔧 CONFIG TÉCNICA COMPLEMENTAR

**Frontend:** Next.js 14 App Router · TypeScript · TailwindCSS · shadcn/ui · lucide-react · Recharts (gráficos de meta) · TanStack Query (data fetching) · Zod (validação).

**Backend:** Next.js Server Actions + Route Handlers · Supabase JS · pgvector · OpenAI/Anthropic embeddings.

**Integrações externas (orquestradas, não construídas aqui):** Mercos REST · Omie REST · Twilio (número BR — exige Regulatory Bundle Anatel) · ElevenLabs (voz) · WhatsApp Cloud API (frio/volume) + não-oficial (dia a dia quente).

**UI/UX direcionada:**
- Layout de SaaS admin: sidebar fixa + topbar com meta do mês em destaque.
- Overview com "velocímetro" de faturamento vs R$100k e comissão projetada (5%).
- Kanban de pedidos com o ciclo de 9 etapas.
- Fila de escalonamentos estilo inbox (revisar/responder/resolver).
- Tabelas densas com filtros por vendedor/status/próximo-toque.
- Paleta sóbria (verde/âmbar Unno), tipografia legível, zero ruído visual.

---

## ⚖️ NOTA DE CONFORMIDADE (ler antes de operar)

O briefing (§14) prevê a IA se comportar "como um vendedor humano". **Contato ativo por IA sem identificação, com base de dados de clientes, envolve LGPD e CDC** (transparência, finalidade, opt-out, consentimento). Recomendação de engenharia: manter o **opt-out e o registro de consentimento nativos no sistema** (já previstos no schema) e validar com jurídico a política de identificação antes de escalar volume. O sistema foi projetado para suportar disclosure e opt-out sem retrabalho.

---

**FIM DO PROMPT-COMANDO** · Elite Web Designer · Regra de Ouro aplicada ✅
