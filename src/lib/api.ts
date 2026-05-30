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
  sentimentDistribution: { positive: number; neutral: number; negative: number };
  qualityMetricsTrend: { date: string; empathy: number; clarity: number; objectivity: number; resolutiveness: number }[];
  recentAttendances: Attendance[];
}

export interface AnalysisResult extends Attendance {}

function traduzirSentimento(s: string): "positive" | "neutral" | "negative" {
  const lower = (s || "").toLowerCase();
  if (lower.includes("positiv")) return "positive";
  if (lower.includes("negativ")) return "negative";
  return "neutral";
}

function parsearResultadoGroq(resultado_groq: string | null): any {
  if (!resultado_groq) return {};
  try { return JSON.parse(resultado_groq); } catch {
    try {
      const fixed = resultado_groq.replace(/'/g, '"').replace(/True/g, "true").replace(/False/g, "false").replace(/None/g, "null");
      return JSON.parse(fixed);
    } catch { return {}; }
  }
}

function filaItemParaAttendance(item: any): Attendance {
  const resultado = parsearResultadoGroq(item.resultado_groq);
  const qualidade = resultado.qualidade || {};
  const classif = resultado.classificacao || {};
  return {
    id: item.id,
    category: classif.categoria || "Geral",
    sentiment: traduzirSentimento(classif.sentimento || ""),
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
}

export const api = {
  getDashboardOverview: async (): Promise<DashboardOverview> => {
    const response: any = await apiFetch("/dashboard/resumo");
    const dados = response.dados || {};
    const sentimentos = { positive: 0, neutral: 0, negative: 0 };
    if (dados.distribuicao_sentimento) {
      dados.distribuicao_sentimento.forEach((item: any) => {
        const s = (item.sentimento || "").toLowerCase();
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
    const recentes = (dados.recentes || []).map(filaItemParaAttendance);
    return {
      totalAttendances: dados.total_atendimentos || 0,
      averageScore: dados.media_score_final || 0,
      averageSlaMinutes: 0,
      sentimentDistribution: sentimentos,
      qualityMetricsTrend: trend,
      recentAttendances: recentes,
    };
  },

  listAttendances: async (params: { page?: number; limit?: number; sentiment?: string }): Promise<AttendanceListResponse> => {
    const filaRes: any = await apiFetch(`/atendimento/fila?status=concluido`);
    let itens: Attendance[] = (filaRes.itens || []).map(filaItemParaAttendance);
    if (params.sentiment && params.sentiment !== "all") {
      itens = itens.filter(item => item.sentiment === params.sentiment);
    }
    const page = params.page || 1;
    const limit = params.limit || 20;
    const total = itens.length;
    const start = (page - 1) * limit;
    const paginado = itens.slice(start, start + limit);
    return { data: paginado, total, page, limit, totalPages: Math.ceil(total / limit) };
  },

  analyzeAttendance: async (body: { transcript: string; category?: string; protocolo?: string }): Promise<AnalysisResult> => {
    const response: any = await apiFetch("/atendimento/avaliar", {
      method: "POST",
      body: JSON.stringify({ texto_conversa: body.transcript, protocolo: body.protocolo }),
    });
    if (response.sucesso && response.atendimento_id) {
      const detalhe: any = await apiFetch(`/atendimento/${response.atendimento_id}`);
      const dados = detalhe.dados;
      const classificacao = dados?.classificacao || {};
      const qualidade = dados?.qualidade || {};
      return {
        id: dados?.id || response.atendimento_id,
        category: classificacao.categoria || "N/A",
        sentiment: traduzirSentimento(classificacao.sentimento || ""),
        summary: dados?.resumo || "Resumo nao disponivel.",
        score: qualidade.score_final || response.score_final || 0,
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
