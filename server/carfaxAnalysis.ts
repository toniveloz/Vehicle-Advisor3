import { TRPCError } from "@trpc/server";
import { invokeLLM } from "./_core/llm";
import { storageGetSignedUrl } from "./storage";
import type { InsertCarfaxAnalysis, Vehicle } from "../drizzle/schema";

export type PurchaseRecommendation = "strong_buy" | "buy" | "caution" | "avoid";

export interface CarfaxExtractedFacts {
  vehicleIdentification: string;
  accidentHistory: string;
  numberOfOwners: string;
  maintenanceSummary: string;
  odometerAssessment: string;
  titleAssessment: string;
  marketValueEvidence: string;
  residualValueEvidence: string;
  factualRiskSignals: string[];
}

export interface StructuredCarfaxAnalysis {
  viabilityScore: number;
  recommendation: PurchaseRecommendation;
  recommendationLabel: string;
  marketValueEstimate: string;
  residualValueEstimate: string;
  accidentHistory: string;
  numberOfOwners: string;
  maintenanceSummary: string;
  odometerAssessment: string;
  titleAssessment: string;
  profitabilityAnalysis: string;
  purchaseJustification: string;
  riskFactors: string[];
}

export class CarfaxAnalysisError extends Error {
  constructor(message: string, public readonly code = "CARFAX_ANALYSIS_FAILED") {
    super(message);
    this.name = "CarfaxAnalysisError";
  }
}

function normalizeStorageKey(urlOrKey: string): string {
  return urlOrKey.replace(/^\/manus-storage\//, "").replace(/^\/+/, "");
}

export async function resolveCarfaxPdfUrl(vehicle: Pick<Vehicle, "carfaxPdfUrl" | "carfaxPdfKey">): Promise<string> {
  const storedValue = vehicle.carfaxPdfKey || vehicle.carfaxPdfUrl;
  if (!storedValue) {
    throw new CarfaxAnalysisError("No hay PDF Carfax cargado para este vehículo.", "CARFAX_PDF_MISSING");
  }

  if (/^https?:\/\//i.test(storedValue)) {
    return storedValue;
  }

  const storageKey = normalizeStorageKey(storedValue);
  if (!storageKey) {
    throw new CarfaxAnalysisError("La referencia del PDF Carfax no contiene una clave de almacenamiento válida.", "CARFAX_STORAGE_KEY_INVALID");
  }

  try {
    const signedUrl = await storageGetSignedUrl(storageKey);
    if (!signedUrl || !/^https?:\/\//i.test(signedUrl)) {
      throw new Error("La URL firmada devuelta no es absoluta.");
    }
    return signedUrl;
  } catch (error) {
    const detail = error instanceof Error ? error.message : "error desconocido";
    throw new CarfaxAnalysisError(
      `No se pudo generar una URL firmada para que la IA acceda al PDF Carfax: ${detail}`,
      "CARFAX_SIGNED_URL_FAILED",
    );
  }
}

function requiredString(value: unknown, field: string, minLength: number = 8): string {
  if (typeof value !== "string" || value.trim().length < minLength) {
    throw new CarfaxAnalysisError(`La extracción del Carfax devolvió un campo incompleto o inválido: ${field}.`);
  }
  return value.trim();
}

function optionalString(value: unknown, minLength: number = 1): string {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  return trimmed.length >= minLength ? trimmed : "";
}

function parseJsonObject(content: unknown, stage: string): Record<string, unknown> {
  if (typeof content !== "string" || !content.trim()) {
    throw new CarfaxAnalysisError(`La IA no devolvió contenido analizable durante ${stage}.`);
  }

  try {
    const parsed = JSON.parse(content) as Record<string, unknown>;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("La respuesta no es un objeto JSON.");
    }
    return parsed;
  } catch (error) {
    const detail = error instanceof Error ? error.message : "JSON inválido";
    throw new CarfaxAnalysisError(`La respuesta de la IA no pudo interpretarse como JSON estructurado durante ${stage}: ${detail}`);
  }
}

function validateFacts(data: Record<string, unknown>): CarfaxExtractedFacts {
  const factualRiskSignals = data.factualRiskSignals;
  if (!Array.isArray(factualRiskSignals) || factualRiskSignals.length === 0) {
    throw new CarfaxAnalysisError("La IA no extrajo señales de riesgo factuales del PDF Carfax.");
  }

  return {
    vehicleIdentification: requiredString(data.vehicleIdentification, "vehicleIdentification"),
    accidentHistory: requiredString(data.accidentHistory, "accidentHistory"),
    numberOfOwners: requiredString(data.numberOfOwners, "numberOfOwners"),
    maintenanceSummary: requiredString(data.maintenanceSummary, "maintenanceSummary"),
    odometerAssessment: requiredString(data.odometerAssessment, "odometerAssessment"),
    titleAssessment: requiredString(data.titleAssessment, "titleAssessment"),
    marketValueEvidence: requiredString(data.marketValueEvidence, "marketValueEvidence"),
    residualValueEvidence: requiredString(data.residualValueEvidence, "residualValueEvidence"),
    factualRiskSignals: factualRiskSignals.map((risk) => String(risk).trim()).filter(Boolean),
  };
}

function validateAnalysis(data: Record<string, unknown>, facts: CarfaxExtractedFacts): StructuredCarfaxAnalysis {
  const viabilityScore = Number(data.viabilityScore);
  if (!Number.isFinite(viabilityScore) || viabilityScore < 0 || viabilityScore > 100) {
    throw new CarfaxAnalysisError("La IA no devolvió una puntuación de viabilidad válida entre 0 y 100.");
  }

  const recommendation = String(data.recommendation);
  if (!["strong_buy", "buy", "caution", "avoid"].includes(recommendation)) {
    throw new CarfaxAnalysisError("La IA no devolvió una recomendación de compra válida.");
  }

  const riskFactors = data.riskFactors;
  if (!Array.isArray(riskFactors) || riskFactors.length === 0) {
    throw new CarfaxAnalysisError("La IA no identificó factores de riesgo concretos del Carfax.");
  }

  return {
    viabilityScore: Math.round(viabilityScore),
    recommendation: recommendation as PurchaseRecommendation,
    recommendationLabel: optionalString(data.recommendationLabel, 1) || "Análisis completado",
    marketValueEstimate: optionalString(data.marketValueEstimate, 1) || "No disponible",
    residualValueEstimate: optionalString(data.residualValueEstimate, 1) || "No disponible",
    accidentHistory: facts.accidentHistory,
    numberOfOwners: facts.numberOfOwners,
    maintenanceSummary: facts.maintenanceSummary,
    odometerAssessment: facts.odometerAssessment,
    titleAssessment: facts.titleAssessment,
    profitabilityAnalysis: optionalString(data.profitabilityAnalysis, 1) || "Análisis en progreso",
    purchaseJustification: optionalString(data.purchaseJustification, 1) || "Justificación no disponible",
    riskFactors: riskFactors.map((risk) => String(risk).trim()).filter(Boolean),
  };
}

const factsResponseFormat = {
  type: "json_schema",
  json_schema: {
    name: "carfax_factual_extraction",
    strict: true,
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        vehicleIdentification: { type: "string" },
        accidentHistory: { type: "string" },
        numberOfOwners: { type: "string" },
        maintenanceSummary: { type: "string" },
        odometerAssessment: { type: "string" },
        titleAssessment: { type: "string" },
        marketValueEvidence: { type: "string" },
        residualValueEvidence: { type: "string" },
        factualRiskSignals: { type: "array", minItems: 1, items: { type: "string" } },
      },
      required: [
        "vehicleIdentification",
        "accidentHistory",
        "numberOfOwners",
        "maintenanceSummary",
        "odometerAssessment",
        "titleAssessment",
        "marketValueEvidence",
        "residualValueEvidence",
        "factualRiskSignals",
      ],
    },
  },
} as const;

const analysisResponseFormat = {
  type: "json_schema",
  json_schema: {
    name: "carfax_profitability_analysis",
    strict: true,
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        viabilityScore: { type: "number", minimum: 0, maximum: 100 },
        recommendation: { type: "string", enum: ["strong_buy", "buy", "caution", "avoid"] },
        recommendationLabel: { type: "string" },
        marketValueEstimate: { type: "string" },
        residualValueEstimate: { type: "string" },
        profitabilityAnalysis: { type: "string" },
        purchaseJustification: { type: "string" },
        riskFactors: { type: "array", minItems: 1, items: { type: "string" } },
      },
      required: [
        "viabilityScore",
        "recommendation",
        "recommendationLabel",
        "marketValueEstimate",
        "residualValueEstimate",
        "profitabilityAnalysis",
        "purchaseJustification",
        "riskFactors",
      ],
    },
  },
} as const;

export function toInsertAnalysis(vehicleId: number, analysis: StructuredCarfaxAnalysis, rawExtractedJson: string): InsertCarfaxAnalysis {
  return {
    vehicleId,
    viabilityScore: analysis.viabilityScore,
    recommendation: analysis.recommendation,
    recommendationLabel: analysis.recommendationLabel,
    marketValueEstimate: analysis.marketValueEstimate,
    residualValueEstimate: analysis.residualValueEstimate,
    accidentHistory: analysis.accidentHistory,
    numberOfOwners: analysis.numberOfOwners,
    maintenanceSummary: analysis.maintenanceSummary,
    odometerAssessment: analysis.odometerAssessment,
    titleAssessment: analysis.titleAssessment,
    profitabilityAnalysis: analysis.profitabilityAnalysis,
    purchaseJustification: analysis.purchaseJustification,
    riskFactorsJson: JSON.stringify(analysis.riskFactors),
    rawExtractedJson,
  };
}

export function parseRiskFactors(riskFactorsJson: string | null | undefined): string[] {
  if (!riskFactorsJson) return [];
  try {
    const parsed = JSON.parse(riskFactorsJson);
    return Array.isArray(parsed) ? parsed.map((item) => String(item)) : [];
  } catch {
    return [];
  }
}

export async function extractFactsFromPdf(signedPdfUrl: string): Promise<{ facts: CarfaxExtractedFacts; rawJson: string }> {
  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content:
          "Eres un extractor factual de reportes Carfax. Debes leer únicamente el PDF adjunto y devolver JSON válido. No uses conocimiento externo ni datos proporcionados fuera del PDF. Si el PDF no contiene una cifra exacta, dilo explícitamente en el campo correspondiente.",
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text:
              "Extrae del PDF Carfax adjunto los hechos relevantes para evaluar rentabilidad y viabilidad de compra: identificación del vehículo, accidentes, propietarios, mantenimiento, odómetro, título, evidencia de valor de mercado si aparece, evidencia de valor residual si aparece y señales factuales de riesgo. No inventes datos y no agregues recomendaciones.",
          },
          {
            type: "file_url",
            file_url: {
              url: signedPdfUrl,
              mime_type: "application/pdf",
            },
          },
        ],
      },
    ],
    response_format: factsResponseFormat,
  } as any);

  const rawJson = String(response.choices?.[0]?.message?.content ?? "");
  const facts = validateFacts(parseJsonObject(rawJson, "la extracción factual del PDF"));
  return { facts, rawJson };
}

export async function analyzeExtractedFacts(facts: CarfaxExtractedFacts): Promise<{ analysis: StructuredCarfaxAnalysis; rawJson: string }> {
  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content:
          "Eres un analista de rentabilidad de vehículos usados. Debes basar tu análisis exclusivamente en el JSON factual extraído del Carfax que recibes. No agregues datos externos. Si el Carfax no contiene suficiente evidencia para estimar valor de mercado o residual, indícalo claramente en vez de inventar cifras.",
      },
      {
        role: "user",
        content: `Hechos extraídos del Carfax en JSON:\n${JSON.stringify(facts, null, 2)}\n\nGenera un análisis de rentabilidad y viabilidad de compra. Usa únicamente estos hechos.`,
      },
    ],
    response_format: analysisResponseFormat,
  } as any);

  const rawJson = String(response.choices?.[0]?.message?.content ?? "");
  const analysis = validateAnalysis(parseJsonObject(rawJson, "el análisis de viabilidad"), facts);
  return { analysis, rawJson };
}

export async function analyzeCarfaxPdf(vehicle: Vehicle): Promise<{ analysis: StructuredCarfaxAnalysis; rawJson: string }> {
  const signedPdfUrl = await resolveCarfaxPdfUrl(vehicle);
  const { facts, rawJson: factsRawJson } = await extractFactsFromPdf(signedPdfUrl);
  const { analysis, rawJson: analysisRawJson } = await analyzeExtractedFacts(facts);
  return {
    analysis,
    rawJson: JSON.stringify({ extractedFacts: JSON.parse(factsRawJson), profitabilityAnalysis: JSON.parse(analysisRawJson) }),
  };
}

export function toPublicAnalysisError(error: unknown): TRPCError {
  if (error instanceof CarfaxAnalysisError) {
    return new TRPCError({ code: "BAD_REQUEST", message: error.message });
  }
  const message = error instanceof Error ? error.message : "Error desconocido durante el análisis Carfax.";
  return new TRPCError({ code: "INTERNAL_SERVER_ERROR", message });
}
