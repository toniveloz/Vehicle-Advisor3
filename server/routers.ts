import { COOKIE_NAME } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { nanoid } from "nanoid";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import {
  createVehicle,
  getLatestAnalysis,
  getUserVehicles,
  getVehicleBundle,
  getVehicleById,
  getVehicleByVin,
  saveCarfaxAnalysis,
  updateVehicle,
} from "./db";
import {
  analyzeCarfaxPdf,
  analyzeExtractedFacts,
  extractFactsFromPdf,
  parseRiskFactors,
  resolveCarfaxPdfUrl,
  toInsertAnalysis,
  toPublicAnalysisError,
  type CarfaxExtractedFacts,
} from "./carfaxAnalysis";
import { storagePut } from "./storage";
import {
  calculateDistance,
  classifyLogisticsPriority,
  getZipCodeInfo,
  extractStateAbbreviation,
  getAllowedStateAbbreviations,
  searchZipCodes,
} from "./logisticsService";

const MAX_PDF_SIZE = 50 * 1024 * 1024;

const vehicleInput = z.object({
  year: z.string().min(4).max(4),
  brand: z.string().min(1).max(128),
  model: z.string().min(1).max(128),
  trim: z.string().max(128).optional().nullable(),
  vin: z.string().min(5).max(50),
  mileage: z.string().max(50).optional().nullable(),
  askingPrice: z.string().max(64).optional().nullable(),
  marketPrice: z.string().max(64).optional().nullable(),
  titleType: z.enum(["clean", "salvage", "rebuilt", "branded"]).default("clean"),
  notes: z.string().optional().nullable(),
  photosBase64: z.array(z.string()).optional().default([]),
  viabilityScore: z.number().min(0).max(100).optional(),
  riskLevel: z.enum(["low", "medium", "high"]).optional(),
  resaleScore: z.number().min(0).max(100).optional(),
  damages: z.array(z.object({
    type: z.string(),
    photoBase64: z.string().optional(),
    description: z.string().optional(),
  })).optional().default([]),
  parts: z.array(z.object({
    name: z.string(),
    link: z.string().optional(),
    estimatedCost: z.string().optional(),
  })).optional().default([]),
  carfaxSummary: z.object({
    cleanTitle: z.boolean().default(true),
    accidentsCount: z.number().default(0),
    previousOwners: z.number().default(0),
    serviceHistory: z.boolean().default(true),
    airbags: z.boolean().default(true),
    odometerIssues: z.boolean().default(false),
    structuralDamage: z.boolean().default(false),
    floodDamage: z.boolean().default(false),
    totalLoss: z.boolean().default(false),
    lemonHistory: z.boolean().default(false),
  }).optional(),
});

const pdfInput = z.object({
  fileName: z.string().min(1),
  mimeType: z.literal("application/pdf"),
  data: z.string().min(1),
});

const extractedFactsInput = z.object({
  vehicleIdentification: z.string().min(8),
  accidentHistory: z.string().min(8),
  numberOfOwners: z.string().min(8),
  maintenanceSummary: z.string().min(8),
  odometerAssessment: z.string().min(8),
  titleAssessment: z.string().min(8),
  marketValueEvidence: z.string().min(8),
  residualValueEvidence: z.string().min(8),
  factualRiskSignals: z.array(z.string().min(1)).min(1),
});

function decodePdf(input: z.infer<typeof pdfInput>): Buffer {
  if (!input.fileName.toLowerCase().endsWith(".pdf")) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "El archivo Carfax debe tener extensión .pdf." });
  }

  const buffer = Buffer.from(input.data, "base64");
  if (buffer.length === 0) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "El PDF Carfax está vacío." });
  }
  if (buffer.length > MAX_PDF_SIZE) {
    throw new TRPCError({ code: "PAYLOAD_TOO_LARGE", message: "El PDF Carfax no debe superar 50 MB." });
  }

  return buffer;
}

function publicAnalysis(analysis: Awaited<ReturnType<typeof getLatestAnalysis>>) {
  if (!analysis) return null;
  return {
    ...analysis,
    riskFactors: parseRiskFactors(analysis.riskFactorsJson),
  };
}

async function uploadPdfToStorage(input: z.infer<typeof pdfInput>) {
  const buffer = decodePdf(input);
  const safeName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const fileId = nanoid();
  const { key, url } = await storagePut(`carfax/${fileId}-${safeName}`, buffer, "application/pdf");
  return { fileId, key, url };
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  pdf: router({
    uploadCarfax: publicProcedure.input(pdfInput).mutation(async ({ input }) => uploadPdfToStorage(input)),
  }),

  vehicles: router({
    list: publicProcedure.query(async ({ ctx }) => {
      const { getAllVehicles } = await import("./db");
      const rows = await getAllVehicles();
      return Promise.all(
        rows.map(async (vehicle) => ({
          vehicle,
          analysis: publicAnalysis(await getLatestAnalysis(vehicle.id)),
        })),
      );
    }),

    detail: publicProcedure.input(z.object({ id: z.number() })).query(async ({ ctx, input }) => {
      const { getVehicleBundle: getVehicleBundlePublic } = await import("./db");
      const bundle = await getVehicleBundlePublic(input.id, 0);
      if (!bundle) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Vehículo no encontrado." });
      }
      return {
        vehicle: bundle.vehicle,
        analysis: publicAnalysis(bundle.analysis),
        photos: bundle.photos || [],
        damages: bundle.damages || [],
        parts: bundle.parts || [],
        carfaxSummary: bundle.carfaxSummary,
      };
    }),

    create: publicProcedure.input(vehicleInput).mutation(async ({ ctx, input }) => {
      const existing = await getVehicleByVin(input.vin);
      if (existing) {
        throw new TRPCError({ code: "CONFLICT", message: "Ya existe un vehículo con ese VIN." });
      }

      const { photosBase64, damages, parts, carfaxSummary } = input;
      const rawPickup = (input as any).pickupState;
      const rawDelivery = (input as any).deliveryState;
      const pickupAbbrev = extractStateAbbreviation(rawPickup, true);
      if (rawPickup !== undefined && rawPickup !== null && String(rawPickup).trim().length > 0 && pickupAbbrev === null) {
        const allowed = getAllowedStateAbbreviations().join(", ");
        throw new TRPCError({ code: "BAD_REQUEST", message: `pickupState inválido; use abreviatura de 2 letras o nombre de estado conocido. Valores aceptados: ${allowed}` });
      }
      const deliveryAbbrev = extractStateAbbreviation(rawDelivery, true);
      if (rawDelivery !== undefined && rawDelivery !== null && String(rawDelivery).trim().length > 0 && deliveryAbbrev === null) {
        const allowed = getAllowedStateAbbreviations().join(", ");
        throw new TRPCError({ code: "BAD_REQUEST", message: `deliveryState inválido; use abreviatura de 2 letras o nombre de estado conocido. Valores aceptados: ${allowed}` });
      }
      const sanitizedInput = {
        ...input,
        pickupState: pickupAbbrev ?? null,
        deliveryState: deliveryAbbrev ?? null,
      } as typeof input;
      const vehicle = await createVehicle(1, sanitizedInput);
      
      // Guardar fotos si hay
      if (photosBase64 && photosBase64.length > 0) {
        const { saveVehiclePhoto } = await import("./db");
        for (let i = 0; i < photosBase64.length; i++) {
          const photoBase64 = photosBase64[i];
          const buffer = Buffer.from(photoBase64.split(",")[1] || photoBase64, "base64");
          const fileId = nanoid();
          const { url, key } = await storagePut(`vehicles/${vehicle.id}/${fileId}.jpg`, buffer, "image/jpeg");
          await saveVehiclePhoto(vehicle.id, url, key, i);
        }
      }
      
      // Guardar daños si hay
      if (damages && damages.length > 0) {
        const { saveDamage } = await import("./db");
        for (const damage of damages) {
          let damagePhotoUrl = null;
          if (damage.photoBase64) {
            const buffer = Buffer.from(damage.photoBase64.split(",")[1] || damage.photoBase64, "base64");
            const fileId = nanoid();
            const { url } = await storagePut(`vehicles/${vehicle.id}/damages/${fileId}.jpg`, buffer, "image/jpeg");
            damagePhotoUrl = url;
          }
          await saveDamage(vehicle.id, damage.type, damagePhotoUrl, damage.description);
        }
      }
      
      // Guardar piezas si hay
      if (parts && parts.length > 0) {
        const { savePart } = await import("./db");
        for (const part of parts) {
          await savePart(vehicle.id, part.name, part.link, part.estimatedCost);
        }
      }
      
      // Guardar resumen Carfax si hay
      if (carfaxSummary) {
        const { saveCarfaxSummary } = await import("./db");
        await saveCarfaxSummary({
          vehicleId: vehicle.id,
          cleanTitle: carfaxSummary.cleanTitle ? 1 : 0,
          accidentsCount: carfaxSummary.accidentsCount,
          previousOwners: carfaxSummary.previousOwners,
          serviceHistory: carfaxSummary.serviceHistory ? 1 : 0,
          airbags: carfaxSummary.airbags ? 1 : 0,
          odometerIssues: carfaxSummary.odometerIssues ? 1 : 0,
          structuralDamage: carfaxSummary.structuralDamage ? 1 : 0,
          floodDamage: carfaxSummary.floodDamage ? 1 : 0,
          totalLoss: carfaxSummary.totalLoss ? 1 : 0,
          lemonHistory: carfaxSummary.lemonHistory ? 1 : 0,
        });
      }
      
      return vehicle;
    }),

    createWithCarfax: publicProcedure
      .input(z.object({ vehicle: vehicleInput, pdf: pdfInput }))
      .mutation(async ({ ctx, input }) => {
        const existing = await getVehicleByVin(input.vehicle.vin);
        if (existing) {
          throw new TRPCError({ code: "CONFLICT", message: "Ya existe un vehículo con ese VIN." });
        }

        const uploaded = await uploadPdfToStorage(input.pdf);
        const rawPickupV = (input.vehicle as any).pickupState;
        const rawDeliveryV = (input.vehicle as any).deliveryState;
        const pickupAbbrevV = extractStateAbbreviation(rawPickupV, true);
        if (rawPickupV !== undefined && rawPickupV !== null && String(rawPickupV).trim().length > 0 && pickupAbbrevV === null) {
          const allowed = getAllowedStateAbbreviations().join(", ");
          throw new TRPCError({ code: "BAD_REQUEST", message: `pickupState inválido; use abreviatura de 2 letras o nombre de estado conocido. Valores aceptados: ${allowed}` });
        }
        const deliveryAbbrevV = extractStateAbbreviation(rawDeliveryV, true);
        if (rawDeliveryV !== undefined && rawDeliveryV !== null && String(rawDeliveryV).trim().length > 0 && deliveryAbbrevV === null) {
          const allowed = getAllowedStateAbbreviations().join(", ");
          throw new TRPCError({ code: "BAD_REQUEST", message: `deliveryState inválido; use abreviatura de 2 letras o nombre de estado conocido. Valores aceptados: ${allowed}` });
        }

        const sanitizedVehicleInput = {
          ...input.vehicle,
          pickupState: pickupAbbrevV ?? null,
          deliveryState: deliveryAbbrevV ?? null,
          trim: input.vehicle.trim || null,
          mileage: input.vehicle.mileage || null,
          askingPrice: input.vehicle.askingPrice || null,
          notes: input.vehicle.notes || null,
          carfaxPdfUrl: uploaded.url,
          carfaxPdfKey: uploaded.key,
          analysisStatus: "not_started",
          analysisError: null,
        } as typeof input.vehicle;

        const vehicle = await createVehicle(1, sanitizedVehicleInput);

        return { vehicle, analysis: null };
      }),

    extractCarfaxFacts: publicProcedure.input(z.object({ vehicleId: z.number() })).mutation(async ({ ctx, input }) => {
      const vehicle = await getVehicleById(input.vehicleId);
      if (!vehicle) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Vehículo no encontrado." });
      }
      if (!vehicle.carfaxPdfKey && !vehicle.carfaxPdfUrl) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Este vehículo no tiene PDF Carfax cargado." });
      }

      await updateVehicle(vehicle.id, { analysisStatus: "analyzing", analysisError: null });
      try {
        const signedPdfUrl = await resolveCarfaxPdfUrl(vehicle);
        const extracted = await extractFactsFromPdf(signedPdfUrl);
        return { vehicleId: vehicle.id, facts: extracted.facts, rawFactsJson: extracted.rawJson };
      } catch (error) {
        const publicError = toPublicAnalysisError(error);
        await updateVehicle(vehicle.id, { analysisStatus: "failed", analysisError: publicError.message });
        throw publicError;
      }
    }),

    analyzeExtractedCarfax: publicProcedure
      .input(z.object({ vehicleId: z.number(), facts: extractedFactsInput, rawFactsJson: z.string().min(2) }))
      .mutation(async ({ ctx, input }) => {
        const vehicle = await getVehicleById(input.vehicleId);
        if (!vehicle) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Vehículo no encontrado." });
        }

        try {
          const facts = input.facts as CarfaxExtractedFacts;
          const { analysis, rawJson: analysisRawJson } = await analyzeExtractedFacts(facts);
          const rawJson = JSON.stringify({ extractedFacts: JSON.parse(input.rawFactsJson), profitabilityAnalysis: JSON.parse(analysisRawJson) });
          const saved = await saveCarfaxAnalysis(toInsertAnalysis(vehicle.id, analysis, rawJson));
          await updateVehicle(vehicle.id, { analysisStatus: "completed", analysisError: null });
          const refreshed = await getVehicleById(vehicle.id);
          return { vehicle: refreshed ?? vehicle, analysis: publicAnalysis(saved) };
        } catch (error) {
          const publicError = toPublicAnalysisError(error);
          await updateVehicle(vehicle.id, { analysisStatus: "failed", analysisError: publicError.message });
          throw publicError;
        }
      }),

    analyzeCarfax: publicProcedure.input(z.object({ vehicleId: z.number() })).mutation(async ({ ctx, input }) => {
      const vehicle = await getVehicleById(input.vehicleId);
      if (!vehicle) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Vehículo no encontrado." });
      }
      if (!vehicle.carfaxPdfKey && !vehicle.carfaxPdfUrl) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Este vehículo no tiene PDF Carfax cargado." });
      }

      await updateVehicle(vehicle.id, { analysisStatus: "analyzing", analysisError: null });
      const updatedVehicle = (await getVehicleById(vehicle.id)) ?? vehicle;

      try {
        const { analysis, rawJson } = await analyzeCarfaxPdf(updatedVehicle);
        const saved = await saveCarfaxAnalysis(toInsertAnalysis(updatedVehicle.id, analysis, rawJson));
        await updateVehicle(updatedVehicle.id, { analysisStatus: "completed", analysisError: null });
        const refreshed = await getVehicleById(updatedVehicle.id);
        return { vehicle: refreshed ?? updatedVehicle, analysis: publicAnalysis(saved) };
      } catch (error) {
        const publicError = toPublicAnalysisError(error);
        await updateVehicle(updatedVehicle.id, { analysisStatus: "failed", analysisError: publicError.message });
        throw publicError;
      }
    }),

    attachCarfaxAndAnalyze: publicProcedure
      .input(z.object({ vehicleId: z.number(), pdf: pdfInput }))
      .mutation(async ({ ctx, input }) => {
        const vehicle = await getVehicleById(input.vehicleId);
        if (!vehicle) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Vehículo no encontrado." });
        }

        const uploaded = await uploadPdfToStorage(input.pdf);
        await updateVehicle(vehicle.id, {
          carfaxPdfUrl: uploaded.url,
          carfaxPdfKey: uploaded.key,
          analysisStatus: "analyzing",
          analysisError: null,
        });

        const updatedVehicle = await getVehicleById(vehicle.id);
        if (!updatedVehicle) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Vehículo no encontrado después de guardar el PDF." });
        }

        try {
          const { analysis, rawJson } = await analyzeCarfaxPdf(updatedVehicle);
          const saved = await saveCarfaxAnalysis(toInsertAnalysis(updatedVehicle.id, analysis, rawJson));
          await updateVehicle(updatedVehicle.id, { analysisStatus: "completed", analysisError: null });
          const refreshed = await getVehicleById(updatedVehicle.id);
          return { vehicle: refreshed ?? updatedVehicle, analysis: publicAnalysis(saved) };
        } catch (error) {
          const publicError = toPublicAnalysisError(error);
          await updateVehicle(updatedVehicle.id, { analysisStatus: "failed", analysisError: publicError.message });
          throw publicError;
        }
      }),

    searchByVin: publicProcedure.input(z.object({ vin: z.string().min(5) })).query(async ({ ctx, input }) => {
      const vehicle = await getVehicleByVin(input.vin);
      if (!vehicle) return null;
      
      const { getVehiclePhotos } = await import("./db");
      const photos = await getVehiclePhotos(vehicle.id);
      const analysis = await getLatestAnalysis(vehicle.id);
      
      return {
        ...vehicle,
        photos,
        analysis: publicAnalysis(analysis),
      };
    }),

    listWithPhotos: publicProcedure.query(async ({ ctx }) => {
      const { getVehiclePhotos } = await import("./db");
      const { getAllVehicles } = await import("./db");
      const rows = await getAllVehicles();
      return Promise.all(
        rows.map(async (vehicle) => ({
          ...vehicle,
          photos: await getVehiclePhotos(vehicle.id),
          analysis: publicAnalysis(await getLatestAnalysis(vehicle.id)),
        })),
      );
    }),

    listAll: publicProcedure.query(async () => {
      const { getVehiclePhotos, getAllVehicles } = await import("./db");
      const rows = await getAllVehicles();
      return Promise.all(
        rows.map(async (vehicle) => ({
          ...vehicle,
          photos: await getVehiclePhotos(vehicle.id),
          analysis: publicAnalysis(await getLatestAnalysis(vehicle.id)),
        })),
      );
    }),

    delete: publicProcedure.input(z.object({ id: z.number() })).mutation(async ({ ctx, input }) => {
      const { deleteVehicle: deleteVehicleDb } = await import("./db");
      const vehicle = await getVehicleById(input.id);
      if (!vehicle) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Vehiculo no encontrado." });
      }
      await deleteVehicleDb(input.id);
      return { success: true };
    }),

    analyzeCarfaxOnly: publicProcedure
      .input(z.object({ pdf: pdfInput }))
      .mutation(async ({ ctx, input }) => {
        try {
          const tempVehicle = {
            id: 0,
            year: "0000",
            brand: "Temporal",
            model: "Analisis",
            vin: "TEMP" + nanoid(10),
            trim: null,
            mileage: null,
            askingPrice: null,
            marketPrice: null,
            titleType: "clean" as const,
            viabilityScore: null,
            riskLevel: "low" as const,
            resaleScore: null,
            notes: null,
            carfaxPdfUrl: null as string | null,
            carfaxPdfKey: null as string | null,
            analysisStatus: "analyzing" as const,
            analysisError: null,
            userId: ctx.user?.id || 0,
            pickupZipcode: null,
            pickupCity: null,
            pickupState: null,
            deliveryZipcode: null,
            deliveryCity: null,
            deliveryState: null,
            distanceMiles: null,
            logisticsPriorityColor: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          const uploaded = await uploadPdfToStorage(input.pdf);
          tempVehicle.carfaxPdfUrl = uploaded.url;
          tempVehicle.carfaxPdfKey = uploaded.key;

          const { analysis, rawJson } = await analyzeCarfaxPdf(tempVehicle);
          
          return {
            analysis: {
              riskFactors: analysis.riskFactors || [],
              accidentHistory: analysis.accidentHistory || null,
              numberOfOwners: analysis.numberOfOwners || null,
              viabilityScore: analysis.viabilityScore || null,
              rawExtractedJson: rawJson || null,
            },
            success: true,
          };
        } catch (error) {
          const publicError = toPublicAnalysisError(error);
          throw publicError;
        }
      }),




    update: publicProcedure.input(z.object({ id: z.number(), data: vehicleInput.partial() })).mutation(async ({ ctx, input }) => {
      const { updateVehicleData, saveVehiclePhoto, saveVehicleDamage, saveVehiclePart, getDb } = await import("./db");
      const { storagePut } = await import("./storage");
      const { vehiclePhotos, vehicleDamages, vehicleParts } = await import("../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      
      const vehicle = await getVehicleById(input.id);
      if (!vehicle) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Vehiculo no encontrado." });
      }
      
      const { photosBase64, damages, parts, carfaxSummary, ...vehicleData } = input.data;
      // Normalizar abreviaturas de estado a 2 caracteres antes de guardar
      if ((vehicleData as any).pickupState !== undefined) {
        const raw = (vehicleData as any).pickupState;
        const abbr = extractStateAbbreviation(raw, true);
        if (raw !== null && String(raw).trim().length > 0 && abbr === null) {
          const allowed = getAllowedStateAbbreviations().join(", ");
          throw new TRPCError({ code: "BAD_REQUEST", message: `pickupState inválido; use abreviatura de 2 letras o nombre de estado conocido. Valores aceptados: ${allowed}` });
        }
        (vehicleData as any).pickupState = abbr ?? null;
      }
      if ((vehicleData as any).deliveryState !== undefined) {
        const raw = (vehicleData as any).deliveryState;
        const abbr = extractStateAbbreviation(raw, true);
        if (raw !== null && String(raw).trim().length > 0 && abbr === null) {
          const allowed = getAllowedStateAbbreviations().join(", ");
          throw new TRPCError({ code: "BAD_REQUEST", message: `deliveryState inválido; use abreviatura de 2 letras o nombre de estado conocido. Valores aceptados: ${allowed}` });
        }
        (vehicleData as any).deliveryState = abbr ?? null;
      }
      await updateVehicleData(input.id, vehicleData);
      
      // Procesar fotos principales
      if (photosBase64 && photosBase64.length > 0) {
        const db = await getDb();
        if (db) {
          await db.delete(vehiclePhotos).where(eq(vehiclePhotos.vehicleId, input.id));
        }
        
        for (let i = 0; i < photosBase64.length; i++) {
          const photoBase64 = photosBase64[i];
          if (photoBase64.startsWith('data:')) {
            const base64Data = photoBase64.split(',')[1];
            const buffer = Buffer.from(base64Data, 'base64');
            const { url, key } = await storagePut(`vehicle-${input.id}-photo-${i}`, buffer, 'image/jpeg');
            await saveVehiclePhoto(input.id, url, key, i);
          } else if (photoBase64.startsWith('http')) {
            await saveVehiclePhoto(input.id, photoBase64, `vehicle-${input.id}-photo-${i}`, i);
          }
        }
      }
      
      // Procesar daños
      if (damages && damages.length > 0) {
        const db = await getDb();
        if (db) {
          await db.delete(vehicleDamages).where(eq(vehicleDamages.vehicleId, input.id));
        }
        
        for (let i = 0; i < damages.length; i++) {
          const damage = damages[i];
          let photoUrl = null;
          let photoKey = null;
          
          if (damage.photoBase64) {
            if (damage.photoBase64.startsWith('data:')) {
              const base64Data = damage.photoBase64.split(',')[1];
              const buffer = Buffer.from(base64Data, 'base64');
              const result = await storagePut(`vehicle-${input.id}-damage-${i}`, buffer, 'image/jpeg');
              photoUrl = result.url;
              photoKey = result.key;
            } else if (damage.photoBase64.startsWith('http')) {
              photoUrl = damage.photoBase64;
              photoKey = `vehicle-${input.id}-damage-${i}`;
            }
          }
          
          await saveVehicleDamage({
            vehicleId: input.id,
            type: damage.type || 'Unknown',
            photoUrl,
            photoKey,
            description: damage.description,
            displayOrder: i,
          });
        }
      }
      
      // Procesar piezas
      if (parts && parts.length > 0) {
        const db = await getDb();
        if (db) {
          await db.delete(vehicleParts).where(eq(vehicleParts.vehicleId, input.id));
        }
        
        for (let i = 0; i < parts.length; i++) {
          const part = parts[i];
          await saveVehiclePart({
            vehicleId: input.id,
            name: part.name || 'Unknown',
            link: part.link,
            estimatedCost: part.estimatedCost,
            displayOrder: i,
          });
        }
      }
      
      const updated = await getVehicleById(input.id);
      return updated;
    }),
  }),

  logistics: router({
    searchZipCodes: publicProcedure
      .input(z.object({ query: z.string().min(1) }))
      .query(async ({ input }) => {
        try {
          const results = await searchZipCodes(input.query);
          return results;
        } catch (error) {
          console.warn("Zip code search error:", error);
          return [];
        }
      }),
    
    getZipInfo: publicProcedure
      .input(z.object({ zipCode: z.string().min(1) }))
      .query(async ({ input }) => {
        try {
          const info = await getZipCodeInfo(input.zipCode);
          return info;
        } catch (error) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid ZIP code" });
        }
      }),
    
    calculateDistance: publicProcedure
      .input(z.object({ fromZip: z.string().min(1), toZip: z.string().min(1) }))
      .query(async ({ input }) => {
        try {
          const distance = await calculateDistance(input.fromZip, input.toZip);
          return distance;
        } catch (error) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Could not calculate distance" });
        }
      }),
  }),
});

export type AppRouter = typeof appRouter;
