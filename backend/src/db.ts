import sqlite3 from "sqlite3";

export type MatchPayload = {
  personagemId: number;
  nomePersonagem: string;
  venceu: boolean;
  pontos: number;
  tentativasRestantes: number;
  dicasUsadas: string[];
};

export type Stats = {
  partidas: number;
  vitorias: number;
  derrotas: number;
  melhorPontuacao: number;
};

const dbPath = process.env.DB_PATH ?? "./jw_game.db";
const db = new sqlite3.Database(dbPath);

function run(sql: string, params: unknown[] = []): Promise<void> {
  return new Promise((resolve, reject) => {
    db.run(sql, params, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

function get<T>(sql: string, params: unknown[] = []): Promise<T> {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row as T);
    });
  });
}

export async function initDb(): Promise<void> {
  await run(`
    CREATE TABLE IF NOT EXISTS partidas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      personagem_id INTEGER NOT NULL,
      nome_personagem TEXT NOT NULL,
      venceu INTEGER NOT NULL,
      pontos INTEGER NOT NULL,
      tentativas_restantes INTEGER NOT NULL,
      dicas_usadas TEXT,
      criado_em TEXT NOT NULL
    )
  `);
}

export async function saveMatch(payload: MatchPayload): Promise<void> {
  await run(
    `
    INSERT INTO partidas (
      personagem_id,
      nome_personagem,
      venceu,
      pontos,
      tentativas_restantes,
      dicas_usadas,
      criado_em
    ) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
  `,
    [
      payload.personagemId,
      payload.nomePersonagem,
      payload.venceu ? 1 : 0,
      payload.pontos,
      payload.tentativasRestantes,
      payload.dicasUsadas.join(","),
    ]
  );
}

export async function getStats(): Promise<Stats> {
  const row = await get<{
    partidas: number;
    vitorias: number | null;
    derrotas: number | null;
    melhorPontuacao: number | null;
  }>(`
    SELECT
      COUNT(*) AS partidas,
      SUM(CASE WHEN venceu = 1 THEN 1 ELSE 0 END) AS vitorias,
      SUM(CASE WHEN venceu = 0 THEN 1 ELSE 0 END) AS derrotas,
      COALESCE(MAX(pontos), 0) AS melhorPontuacao
    FROM partidas
  `);

  return {
    partidas: row?.partidas ?? 0,
    vitorias: row?.vitorias ?? 0,
    derrotas: row?.derrotas ?? 0,
    melhorPontuacao: row?.melhorPontuacao ?? 0,
  };
}

