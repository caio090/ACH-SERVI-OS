import type { CategoryRow } from "@/lib/database.types";
import { normalizeSearchText } from "@/lib/categoryIcons";

/**
 * Busca de TIPO DE SERVIÇO (não de profissionais): o cliente descreve o que
 * precisa resolver e recebe as categorias relacionadas. As categorias vêm do
 * banco; aqui só há palavras de problema comuns associadas a cada slug do
 * seed (0006). Slug desconhecido continua encontrável pelo nome.
 */
const PROBLEM_KEYWORDS: Record<string, string[]> = {
  eletricista: ["tomada", "chuveiro", "disjuntor", "luz", "lampada", "fiacao", "curto", "energia", "interruptor", "quadro"],
  encanador: ["vazamento", "pia", "vaso", "descarga", "cano", "torneira", "entupido", "esgoto", "registro", "agua"],
  "refrigeracao-ar-condicionado": ["ar condicionado", "split", "geladeira", "freezer", "gas", "climatizacao"],
  pedreiro: ["parede", "reboco", "piso", "reforma", "obra", "rachadura", "muro", "concreto"],
  pintor: ["pintura", "parede", "tinta", "textura", "massa corrida"],
  "servicos-gerais-faz-tudo": ["conserto", "reparo", "instalar", "quadro", "prateleira", "cortina", "pequenos reparos"],
  "montador-de-moveis": ["montar", "movel", "guarda-roupa", "armario", "cama", "estante", "desmontar"],
  chaveiro: ["chave", "fechadura", "trancado", "cadeado", "porta", "copia de chave"],
  "mecanico-socorro-leve": ["carro", "bateria", "pneu", "pane", "moto", "motor", "socorro"],
  "tecnico-eletrodomesticos": ["maquina de lavar", "geladeira", "microondas", "fogao", "lava-loucas", "secadora"],
  "diarista-limpeza": ["faxina", "limpeza", "diarista", "limpar", "pos-obra", "passar roupa"],
  jardinagem: ["jardim", "grama", "poda", "planta", "arvore", "quintal"],
  "manicure-pedicure": ["unha", "manicure", "pedicure", "esmalte"],
  "cabeleireiro-barbeiro-domicilio": ["cabelo", "corte", "barba", "escova", "barbeiro", "penteado"],
  "costureira-ajustes": ["costura", "barra", "ajuste", "roupa", "bainha", "ziper", "conserto de roupa"],
};

export type ServiceSearchResult = {
  category: CategoryRow;
  /** Termo de problema que levou ao resultado, quando não foi o próprio nome. */
  matchedKeyword: string | null;
};

export function searchServiceCategories(query: string, categories: CategoryRow[]): ServiceSearchResult[] {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) {
    return categories.map((category) => ({ category, matchedKeyword: null }));
  }

  const byName: ServiceSearchResult[] = [];
  const byKeyword: ServiceSearchResult[] = [];

  for (const category of categories) {
    const label = normalizeSearchText(`${category.name} ${category.slug.replace(/-/g, " ")}`);
    if (label.includes(normalizedQuery)) {
      byName.push({ category, matchedKeyword: null });
      continue;
    }
    const keyword = (PROBLEM_KEYWORDS[category.slug] ?? []).find((term) => {
      const normalizedTerm = normalizeSearchText(term);
      return normalizedTerm.includes(normalizedQuery) || normalizedQuery.includes(normalizedTerm);
    });
    if (keyword) byKeyword.push({ category, matchedKeyword: keyword });
  }

  return [...byName, ...byKeyword];
}
