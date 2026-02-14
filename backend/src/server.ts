import cors from "cors";
import express from "express";

import { getStats, initDb, saveMatch } from "./db";

const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 3001;
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS ?? "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || ALLOWED_ORIGINS.length === 0 || ALLOWED_ORIGINS.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error("Origem não permitida pelo CORS."));
    },
  })
);
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/api/stats", async (_req, res) => {
  try {
    const stats = await getStats();
    res.json(stats);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Falha ao carregar estatísticas." });
  }
});

app.post("/api/matches", async (req, res) => {
  try {
    const body = req.body;
    if (
      typeof body?.personagemId !== "number" ||
      typeof body?.nomePersonagem !== "string" ||
      typeof body?.venceu !== "boolean" ||
      typeof body?.pontos !== "number" ||
      typeof body?.tentativasRestantes !== "number" ||
      !Array.isArray(body?.dicasUsadas)
    ) {
      res.status(400).json({ error: "Payload inválido." });
      return;
    }

    await saveMatch(body);
    res.status(201).json({ ok: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Falha ao salvar partida." });
  }
});

initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`API rodando em http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Falha ao iniciar banco:", error);
    process.exit(1);
  });
