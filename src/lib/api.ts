const BASE = "/api";

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `HTTP ${res.status}`);
  }
  return res.json();
}

export interface Attendance {
  id: number;
  category: string;
  sentiment: "positive" | "neutral" | "negative";
  score: number;
  empathy: number;
  clarity: number;
  objectivity: number;
  resolutiveness: number;
  summary: string;
  sla_time_minutes: number;
  created_at: string;
  numero_protocolo?: string;
  cliente_nome?: string;
  atendente_nome?: string;
}

export interface AttendanceListResponse {
  data: Attendance[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface DashboardOverview {
  totalAttendances: number;
  averageScore: number;
  averageSlaMinutes: number;
  sentimentDistribution: {
    positive: number;
    neutral: number;
    negative: number;
  };
  qualityMetricsTrend: {
    date: string;
    empathy: number;
    clarity: number;
    objectivity: number;
    resolutiveness: number;
  }[];
  recentAttendances: Attendance[];
}

export interface AnalysisResult extends Attendance {}

export const api = {
  getDashboardOverview: async (): Promise<DashboardOverview> => {
    const response: any = await apiFetch("/dashboard/resumo");
    const dados = response.dados || {};

    const sentimentos = { positive: 0, neutral: 0, negative: 0 };
    if (dados.distribuicao_sentimento) {
      dados.distribuicao_sentimento.forEach((item: any) => {
        const s = item.sentimento.toLowerCase();
        if (s === "positivo") sentimentos.positive = item.total;
        if (s === "neutro") sentimentos.neutral = item.total;
        if (s === "negativo") sentimentos.negative = item.total;
      });
    }

    const trend = (dados.evolucao_score_diaria || []).map((item: any) => ({
      date: item.date,
      empathy: item.empathy || item.media_score || 0,
      clarity: item.clarity || item.media_score || 0,
      objectivity: item.objectivity || item.media_score || 0,
      resolutiveness: item.resolutiveness || item.media_score || 0,
    }));

    const recentes = (dados.recentes || []).map((item: any) => ({
      id: item.id,
      category: item.category || "Geral",
      sentiment: item.sentiment || "neutral",
      score: item.score || 0,
      summary: item.summary || "",
      created_at: item.created_at || new Date().toISOString(),
      empathy: item.empathy || 0,
      clarity: item.clarity || 0,
      objectivity: item.objectivity || 0,
      resolutiveness: item.resolutiveness || 0,
      sla_time_minutes: 0,
      numero_protocolo: item.numero_protocolo || "",
      cliente_nome: item.cliente_nome || "",
      atendente_nome: item.atendente_nome || "",
    }));

    return {
      totalAttendances: dados.total_atendimentos || 0,
      averageScore: dados.media_score_final || 0,
      averageSlaMinutes: 0,
      sentimentDistribution: sentimentos,
      qualityMetricsTrend: trend,
      recentAttendances: recentes,
    };
  },

  listAttendances: async (params: {
    page?: number;
    limit?: number;
    sentiment?: string;
  }): Promise<AttendanceListResponse> => {
    const q = new URLSearchParams();
    if (params.page) q.set("page", String(params.page));
    if (params.limit) q.set("per_page", String(params.limit));

    // Constrói URL com filtro de sentimento
    let url = `/atendimento/fila?status=concluido`;
    if (params.sentiment && params.sentiment !== "all") {
      const sentimentoPt =
        params.sentiment === "positive"
          ? "positivo"
          : params.sentiment === "negative"
            ? "negativo"
            : "neutro";
      url += `&sentimento=${sentimentoPt}`;
    }

    // Busca da fila de avaliação (concluídos)
    const filaRes: any = await apiFetch(url);
    const itens = (filaRes.itens || [])
      .map((item: any) => {
        let resultado: any = {};
        if (item.resultado_groq) {
          try {
            resultado = JSON.parse(item.resultado_groq);
          } catch {
            try {
              resultado = eval("(" + item.resultado_groq + ")");
            } catch {
              resultado = {};
            }
          }
        }
        const qualidade = resultado.qualidade || {};
        const classif = resultado.classificacao || {};
        const sentimento = (classif.sentimento || "").toLowerCase();

        return {
          id: item.id,
          category: classif.categoria || "Geral",
          sentiment: sentimento.includes("positiv")
            ? "positive"
            : sentimento.includes("negativ")
              ? "negative"
              : "neutral",
          score: qualidade.score_final || 0,
          summary: resultado.resumo || "",
          created_at: item.criado_em || new Date().toISOString(),
          empathy: qualidade.empatia || 0,
          clarity: qualidade.clareza || 0,
          objectivity: qualidade.objetividade || 0,
          resolutiveness: qualidade.resolutividade || 0,
          sla_time_minutes: 0,
          numero_protocolo: item.numero_protocolo || "",
          cliente_nome: item.cliente_nome || "",
          atendente_nome: item.atendente_nome || "",
        };
      })
      .filter((item: Attendance) => {
        // Filtra por sentimento no frontend também
        if (params.sentiment && params.sentiment !== "all") {
          return item.sentiment === params.sentiment;
        }
        return true;
      });

    // Paginação
    const page = params.page || 1;
    const limit = params.limit || 20;
    const total = itens.length;
    const start = (page - 1) * limit;
    const paginado = itens.slice(start, start + limit);

    return {
      data: paginado,
      total: total,
      page: page,
      limit: limit,
      totalPages: Math.ceil(total / limit),
    };
  },

  analyzeAttendance: async (body: {
    transcript: string;
    category?: string;
  }): Promise<AnalysisResult> => {
    const response: any = await apiFetch("/atendimento/avaliar", {
      method: "POST",
      body: JSON.stringify({ texto_conversa: body.transcript }),
    });

    if (response.sucesso && response.atendimento_id) {
      const detalhe: any = await apiFetch(
        `/atendimento/${response.atendimento_id}`,
      );
      const dados = detalhe.dados;
      const classificacao = dados?.classificacao || {};
      const qualidade = dados?.qualidade || {};

      const sentimentoTraduzido = classificacao.sentimento
        ?.toLowerCase()
        .includes("positiv")
        ? "positive"
        : classificacao.sentimento?.toLowerCase().includes("negativ")
          ? "negative"
          : "neutral";

      return {
        id: dados?.id || response?.atendimento_id || 0,
        category: classificacao.categoria || "N/A",
        sentiment: sentimentoTraduzido as "positive" | "neutral" | "negative",
        summary: dados?.resumo || "Resumo não disponível.",
        score: qualidade.score_final || response?.score_final || 0,
        empathy: qualidade.empatia || 0,
        clarity: qualidade.clareza || 0,
        objectivity: qualidade.objetividade || 0,
        resolutiveness: qualidade.resolutividade || 0,
        sla_time_minutes: 0,
        created_at: dados?.data_criacao || new Date().toISOString(),
      };
    }

    return response;
  },
};
