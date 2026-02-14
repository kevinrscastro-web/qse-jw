# Quem Sou Eu Biblico - Edicao JW

Stack:
- Frontend: React + TypeScript (Vite)
- Backend opcional: Node.js + TypeScript + Express

## Estrutura
- `frontend/` app web (pronto para Vercel)
- `backend/` API + SQLite (opcional)

## Rodar localmente
Na raiz:

```bash
npm run dev
```

## Deploy no Vercel (somente frontend)
1. Importe o repositorio no Vercel.
2. Em **Project Settings** defina:
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
3. Deploy.

### Estatisticas no Vercel
- Sem backend, o jogo salva estatisticas no `localStorage` do navegador.
- Se quiser usar API, configure no Vercel a env var:
  - `VITE_API_BASE_URL=https://sua-api.com/api`

## Deploy no Render (backend + frontend)
- O arquivo `render.yaml` continua disponivel para deploy completo no Render.
