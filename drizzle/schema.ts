import { int, pgEnum, pgTable, text, timestamp, varchar, numeric } from "drizzle-orm/pg-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = pgTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: pgEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Vehículos: tabla principal para el asesor
 * El análisis Carfax ocurre en background, no bloquea la creación
 */
export const vehicles = pgTable("vehicles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  vin: varchar("vin", { length: 50 }).notNull().unique(),
  year: varchar("year", { length: 4 }).notNull(),
  brand: varchar("brand", { length: 128 }).notNull(),
  model: varchar("model", { length: 128 }).notNull(),
  trim: varchar("trim", { length: 128 }),
  mileage: varchar("mileage", { length: 50 }),
  askingPrice: numeric("askingPrice", { precision: 12, scale: 2 }),
  marketPrice: numeric("marketPrice", { precision: 12, scale: 2 }), // Para lógica de salvage
  notes: text("notes"),
  titleType: pgEnum("titleType", ["clean", "salvage", "rebuilt", "branded"]).default("clean"),
  viabilityScore: int("viabilityScore"),
  riskLevel: pgEnum("riskLevel", ["low", "medium", "high"]).default("low"),
  resaleScore: int("resaleScore"),
  carfaxPdfUrl: text("carfaxPdfUrl"),
  carfaxPdfKey: text("carfaxPdfKey"),
  analysisStatus: pgEnum("analysisStatus", ["not_started", "analyzing", "completed", "failed"])
    .default("not_started")
    .notNull(),
  analysisError: text("analysisError"),
  // Campos de logística
  pickupZipcode: varchar("pickupZipcode", { length: 10 }),
  pickupCity: varchar("pickupCity", { length: 128 }),
  pickupState: varchar("pickupState", { length: 2 }),
  deliveryZipcode: varchar("deliveryZipcode", { length: 10 }),
  deliveryCity: varchar("deliveryCity", { length: 128 }),
  deliveryState: varchar("deliveryState", { length: 2 }),
  distanceMiles: int("distanceMiles"),
  logisticsPriorityColor: pgEnum("logisticsPriorityColor", ["green", "yellow", "orange", "red"]),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Vehicle = typeof vehicles.$inferSelect;
export type InsertVehicle = typeof vehicles.$inferInsert;

/**
 * Fotos de vehículos: hasta 5 por vehículo, opcionales
 */
export const vehiclePhotos = pgTable("vehiclePhotos", {
  id: int("id").autoincrement().primaryKey(),
  vehicleId: int("vehicleId").notNull(),
  photoUrl: text("photoUrl").notNull(),
  photoKey: text("photoKey").notNull(),
  displayOrder: int("displayOrder").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type VehiclePhoto = typeof vehiclePhotos.$inferSelect;
export type InsertVehiclePhoto = typeof vehiclePhotos.$inferInsert;

/**
 * Análisis Carfax: se guarda en background, no bloquea UI
 * Contiene datos extraídos del PDF y análisis de viabilidad
 */
export const carfaxAnalyses = pgTable("carfaxAnalyses", {
  id: int("id").autoincrement().primaryKey(),
  vehicleId: int("vehicleId").notNull(),
  viabilityScore: int("viabilityScore"),
  recommendation: mysqlEnum("recommendation", ["strong_buy", "buy", "caution", "avoid"]),
  recommendationLabel: varchar("recommendationLabel", { length: 255 }),
  marketValueEstimate: varchar("marketValueEstimate", { length: 255 }),
  residualValueEstimate: varchar("residualValueEstimate", { length: 255 }),
  accidentHistory: text("accidentHistory"),
  numberOfOwners: text("numberOfOwners"),
  maintenanceSummary: text("maintenanceSummary"),
  odometerAssessment: text("odometerAssessment"),
  titleAssessment: text("titleAssessment"),
  profitabilityAnalysis: text("profitabilityAnalysis"),
  purchaseJustification: text("purchaseJustification"),
  riskFactorsJson: text("riskFactorsJson"),
  rawExtractedJson: text("rawExtractedJson"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CarfaxAnalysis = typeof carfaxAnalyses.$inferSelect;
export type InsertCarfaxAnalysis = typeof carfaxAnalyses.$inferInsert;

/**
 * Daños detectados: galería de daños específicos por tipo
 */
export const vehicleDamages = pgTable("vehicleDamages", {
  id: int("id").autoincrement().primaryKey(),
  vehicleId: int("vehicleId").notNull(),
  type: varchar("type", { length: 128 }).notNull(), // bumper, door, fender, suspension, airbags, etc.
  photoUrl: text("photoUrl"),
  photoKey: text("photoKey"),
  description: text("description"),
  displayOrder: int("displayOrder").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type VehicleDamage = typeof vehicleDamages.$inferSelect;
export type InsertVehicleDamage = typeof vehicleDamages.$inferInsert;

/**
 * Piezas a reemplazar: lista de piezas recomendadas con links y costos
 */
export const vehicleParts = pgTable("vehicleParts", {
  id: int("id").autoincrement().primaryKey(),
  vehicleId: int("vehicleId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  link: text("link"),
  estimatedCost: numeric("estimatedCost", { precision: 10, scale: 2 }),
  displayOrder: int("displayOrder").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type VehiclePart = typeof vehicleParts.$inferSelect;
export type InsertVehiclePart = typeof vehicleParts.$inferInsert;

/**
 * Resumen Carfax: información visual del reporte Carfax
 */
export const carfaxSummaries = pgTable("carfaxSummaries", {
  id: int("id").autoincrement().primaryKey(),
  vehicleId: int("vehicleId").notNull(),
  cleanTitle: int("cleanTitle").default(0), // 0 = false, 1 = true
  accidentsCount: int("accidentsCount"),
  previousOwners: int("previousOwners"),
  serviceHistory: int("serviceHistory").default(0),
  airbags: int("airbags").default(0),
  odometerIssues: int("odometerIssues").default(0),
  structuralDamage: int("structuralDamage").default(0),
  floodDamage: int("floodDamage").default(0),
  totalLoss: int("totalLoss").default(0),
  lemonHistory: int("lemonHistory").default(0),
  recordCount: int("recordCount"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CarfaxSummary = typeof carfaxSummaries.$inferSelect;
export type InsertCarfaxSummary = typeof carfaxSummaries.$inferInsert;
