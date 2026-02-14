# Quem Sou Eu Bíblico - Edição JW

Stack atual:
- Frontend: React + TypeScript (Vite)
- Backend: Node.js + TypeScript + Express
- Banco: SQLite (`jw_game.db`)

## Estrutura
- `frontend/` interface web
- `backend/` API + SQLite
- `render.yaml` blueprint de deploy no Render

## Rodar localmente
Na raiz `quem_sou_eu_jw`:

```bash
npm run dev
```

URLs locais:
- Frontend: `http://localhost:5173`
- API: `http://localhost:3001`

## Build
```bash
npm run build
```

## Deploy no Render
1. Suba este projeto para um repositório GitHub.
2. No Render, escolha **New +** > **Blueprint** e selecione o repositório.
3. O Render vai ler `render.yaml` e criar:
   - `jw-biblico-api` (Web Service)
   - `jw-biblico-web` (Static Site)
4. Após criar, ajuste se necessário:
   - `ALLOWED_ORIGINS` (backend) para a URL final do frontend.
   - `VITE_API_BASE_URL` (frontend) para a URL final da API + `/api`.

## Observação de persistência
- A API usa disco persistente em `/data` no Render.
- O SQLite fica em `/data/jw_game.db`.
