import { useEffect, useMemo, useState } from "react";
import "./App.css";
import { personagens, type Personagem } from "./data";

type Tela = "home" | "game" | "result";

type Stats = {
  partidas: number;
  vitorias: number;
  derrotas: number;
  melhorPontuacao: number;
};

const API_BASE = import.meta.env.VITE_API_BASE_URL;
const STATS_STORAGE_KEY = "jw_game_stats";
const STATS_INICIAIS: Stats = { partidas: 0, vitorias: 0, derrotas: 0, melhorPontuacao: 0 };
const MAX_TENTATIVAS = 5;
const PONTOS_INICIAIS = 120;
const CUSTO_DICAS = { dificil: 6, media: 12, facil: 20 };

const normalizar = (texto: string) =>
  texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();

function escolherPersonagem(): Personagem {
  return personagens[Math.floor(Math.random() * personagens.length)];
}

function carregarStatsLocais(): Stats {
  try {
    const bruto = localStorage.getItem(STATS_STORAGE_KEY);
    if (!bruto) return STATS_INICIAIS;
    const data = JSON.parse(bruto) as Partial<Stats>;
    return {
      partidas: data.partidas ?? 0,
      vitorias: data.vitorias ?? 0,
      derrotas: data.derrotas ?? 0,
      melhorPontuacao: data.melhorPontuacao ?? 0,
    };
  } catch {
    return STATS_INICIAIS;
  }
}

function salvarStatsLocais(stats: Stats): void {
  localStorage.setItem(STATS_STORAGE_KEY, JSON.stringify(stats));
}

function atualizarStatsLocais(venceu: boolean, pontos: number): Stats {
  const atual = carregarStatsLocais();
  const proximas: Stats = {
    partidas: atual.partidas + 1,
    vitorias: atual.vitorias + (venceu ? 1 : 0),
    derrotas: atual.derrotas + (venceu ? 0 : 1),
    melhorPontuacao: Math.max(atual.melhorPontuacao, pontos),
  };
  salvarStatsLocais(proximas);
  return proximas;
}

function App() {
  const [tela, setTela] = useState<Tela>("home");
  const [stats, setStats] = useState<Stats>(STATS_INICIAIS);

  const [personagem, setPersonagem] = useState<Personagem | null>(null);
  const [nomeNormalizado, setNomeNormalizado] = useState("");
  const [letrasCorretas, setLetrasCorretas] = useState<Set<string>>(new Set());
  const [letrasErradas, setLetrasErradas] = useState<Set<string>>(new Set());
  const [tentativas, setTentativas] = useState(MAX_TENTATIVAS);
  const [pontos, setPontos] = useState(PONTOS_INICIAIS);
  const [dicasUsadas, setDicasUsadas] = useState<Set<string>>(new Set());
  const [mensagem, setMensagem] = useState("Escolha uma letra no teclado virtual.");
  const [dicaAtual, setDicaAtual] = useState("Use as dicas com estratégia.");
  const [venceu, setVenceu] = useState(false);

  useEffect(() => {
    carregarStats();
  }, []);

  const mascaraNome = useMemo(() => {
    return nomeNormalizado
      .split("")
      .map((c) => {
        if (c === " ") return "   ";
        if (!/[A-Z]/.test(c)) return c;
        return letrasCorretas.has(c) ? c : "_";
      })
      .join(" ");
  }, [nomeNormalizado, letrasCorretas]);

  const letrasNome = useMemo(() => {
    return new Set(nomeNormalizado.split("").filter((c) => /[A-Z]/.test(c)));
  }, [nomeNormalizado]);

  useEffect(() => {
    if (tela !== "game" || !personagem) return;

    const ganhou = [...letrasNome].every((c) => letrasCorretas.has(c));
    if (ganhou) {
      finalizarPartida(true);
      return;
    }
    if (tentativas <= 0) {
      finalizarPartida(false);
    }
  }, [letrasCorretas, tentativas, tela, personagem, letrasNome]);

  async function carregarStats() {
    if (!API_BASE) {
      setStats(carregarStatsLocais());
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/stats`);
      if (!res.ok) {
        setStats(carregarStatsLocais());
        return;
      }
      const data = (await res.json()) as Stats;
      setStats(data);
    } catch {
      setStats(carregarStatsLocais());
    }
  }

  function iniciarJogo() {
    const p = escolherPersonagem();
    setPersonagem(p);
    setNomeNormalizado(normalizar(p.nome));
    setLetrasCorretas(new Set());
    setLetrasErradas(new Set());
    setTentativas(MAX_TENTATIVAS);
    setPontos(PONTOS_INICIAIS);
    setDicasUsadas(new Set());
    setMensagem("Escolha uma letra no teclado virtual.");
    setDicaAtual("");
    setTela("game");
  }

  async function finalizarPartida(ganhou: boolean) {
    setVenceu(ganhou);
    setTela("result");

    if (!personagem) return;

    const fallbackStats = atualizarStatsLocais(ganhou, pontos);
    setStats(fallbackStats);

    if (!API_BASE) {
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/matches`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          personagemId: personagem.id,
          nomePersonagem: personagem.nome,
          venceu: ganhou,
          pontos,
          tentativasRestantes: tentativas,
          dicasUsadas: [...dicasUsadas],
        }),
      });
      if (res.ok) {
        await carregarStats();
      }
    } catch {
      // sem API ativa: mantém localStorage
    }
  }

  function tentarLetra(letra: string) {
    if (tela !== "game") return;
    const l = normalizar(letra);
    if (letrasCorretas.has(l) || letrasErradas.has(l)) return;

    if (nomeNormalizado.includes(l)) {
      const next = new Set(letrasCorretas);
      next.add(l);
      setLetrasCorretas(next);
      setPontos((p) => Math.min(PONTOS_INICIAIS, p + 2));
      setMensagem("Acertou uma letra.");
      return;
    }

    const next = new Set(letrasErradas);
    next.add(l);
    setLetrasErradas(next);
    setTentativas((t) => t - 1);
    setPontos((p) => Math.max(0, p - 5));
    setMensagem("Letra incorreta.");
  }

  function usarDica(nivel: keyof typeof CUSTO_DICAS) {
    if (!personagem) return;
    if (dicasUsadas.has(nivel)) {
      setMensagem("Essa dica já foi usada.");
      return;
    }

    const custo = CUSTO_DICAS[nivel];
    if (pontos < custo) {
      setMensagem("Pontos insuficientes para essa dica.");
      return;
    }

    const next = new Set(dicasUsadas);
    next.add(nivel);
    setDicasUsadas(next);
    setPontos((p) => p - custo);

    const texto =
      nivel === "dificil" ? personagem.dica_dificil : nivel === "media" ? personagem.dica_media : personagem.dica_facil;
    setDicaAtual(texto);
    setMensagem("Dica aplicada.");
  }

  if (tela === "home") {
    return (
      <main className="screen">
        <section className="card home-card">
          <h1>QUEM SOU EU BÍBLICO</h1>
          <span className="badge">Edição JW</span>
          <img className="avatar" src="/assets/mascote_kevin.png" alt="Mascote" />
          <p className="stats">Partidas: {stats.partidas} | Vitórias: {stats.vitorias} | Recorde: {stats.melhorPontuacao}</p>
          <button className="btn btn-primary" onClick={iniciarJogo}>Iniciar Jogo</button>
        </section>
      </main>
    );
  }

  if (tela === "result" && personagem) {
    return (
      <main className="screen">
        <section className="card result-card">
          <h2 className={venceu ? "win" : "lose"}>{venceu ? "Vitória!" : "Derrota"}</h2>
          <img className="avatar" src="/assets/mascote_kevin.png" alt="Mascote" />
          {venceu ? (
            <p className="result-text">
              Personagem: {personagem.nome}
              <br />
              Referência: {personagem.referencia}
              <br />
              Curiosidade: {personagem.curiosidade}
            </p>
          ) : (
            <p className="result-text">
              Personagem: {personagem.nome}
              <br />
              Referência: {personagem.referencia}
            </p>
          )}
          <p className="score">Pontuação final: {pontos}</p>
          <div className="row">
            <button className="btn btn-primary" onClick={iniciarJogo}>Jogar Novamente</button>
            <button
              className="btn"
              onClick={() => {
                setTela("home");
                void carregarStats();
              }}
            >
              Menu
            </button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="screen">
      <section className="card game-card">
        <header className="topbar">
          <button className="icon-btn" onClick={() => setTela("home")}>←</button>
          <strong>Quem Sou Eu Bíblico</strong>
          <button className="icon-btn" onClick={iniciarJogo}>↻</button>
        </header>

        <div className="status">
          <span>Pontos: {pontos}</span>
          <span>Tentativas: {tentativas}/{MAX_TENTATIVAS}</span>
        </div>
        <progress value={tentativas} max={MAX_TENTATIVAS} className="life" />

        <div className="character-area">
          <img className="mini-avatar" src="/assets/mascote_kevin.png" alt="Mascote" />
          <div>
            <p className="label">Quem sou eu?</p>
            <p className="word">{mascaraNome}</p>
          </div>
        </div>

        <div className="hint-buttons">
          <button className="btn hint" disabled={dicasUsadas.has("dificil")} onClick={() => usarDica("dificil")}>Difícil (-6)</button>
          <button className="btn hint" disabled={dicasUsadas.has("media")} onClick={() => usarDica("media")}>Média (-12)</button>
          <button className="btn hint" disabled={dicasUsadas.has("facil")} onClick={() => usarDica("facil")}>Fácil (-20)</button>
        </div>

        <div className="hint-box">{dicaAtual || "Sem dica por enquanto."}</div>
        <p className="message">{mensagem}</p>

        <div className="keyboard">
          {"ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map((letra) => {
            const used = letrasCorretas.has(letra) || letrasErradas.has(letra);
            const status = letrasCorretas.has(letra) ? "ok" : letrasErradas.has(letra) ? "bad" : "";
            return (
              <button
                key={letra}
                className={`key ${status}`}
                disabled={used}
                onClick={() => tentarLetra(letra)}
              >
                {letra}
              </button>
            );
          })}
        </div>
      </section>
    </main>
  );
}

export default App;
