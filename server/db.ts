import { desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import {
  carfaxAnalyses,
  carfaxSummaries,
  InsertCarfaxAnalysis,
  InsertVehicle,
  InsertVehiclePhoto,
  InsertVehicleDamage,
  InsertVehiclePart,
  InsertCarfaxSummary,
  users,
  vehicles,
  vehiclePhotos,
  vehicleDamages,
  vehicleParts,
  type CarfaxAnalysis,
  type Vehicle,
  type VehiclePhoto,
  type VehicleDamage,
  type VehiclePart,
  type CarfaxSummary,
  type InsertUser,
} from "../drizzle/schema";
import { ENV } from "./_core/env";
import { storageRemove } from "./storage";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  const existing = await getUserByOpenId(user.openId);
  const values: InsertUser = {
    openId: user.openId,
    name: user.name ?? null,
    email: user.email ?? null,
    loginMethod: user.loginMethod ?? null,
    lastSignedIn: user.lastSignedIn ?? new Date(),
    role: user.role ?? (user.openId === ENV.ownerOpenId ? "admin" : null),
  };

  if (!existing) {
    await db.insert(users).values(values);
    return;
  }

  const updateData: Partial<InsertUser> = {};
  if (user.name !== undefined) updateData.name = user.name;
  if (user.email !== undefined) updateData.email = user.email;
  if (user.loginMethod !== undefined) updateData.loginMethod = user.loginMethod;
  if (user.lastSignedIn !== undefined) updateData.lastSignedIn = user.lastSignedIn;
  if (user.role !== undefined) updateData.role = user.role;
  if (existing.openId === ENV.ownerOpenId && updateData.role === undefined) {
    updateData.role = "admin";
  }
  if (Object.keys(updateData).length > 0) {
    await db.update(users).set(updateData).where(eq(users.openId, user.openId));
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getVehicleByVin(vin: string): Promise<Vehicle | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(vehicles).where(eq(vehicles.vin, vin)).limit(1);
  return result[0];
}

export async function getVehicleById(id: number): Promise<Vehicle | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(vehicles).where(eq(vehicles.id, id)).limit(1);
  return result[0];
}

export async function getUserVehicles(userId: number): Promise<Vehicle[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(vehicles).where(eq(vehicles.userId, userId)).orderBy(desc(vehicles.updatedAt));
}

export async function createVehicle(userId: number, data: Omit<InsertVehicle, "id" | "userId">): Promise<Vehicle> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.insert(vehicles).values({ ...data, userId });
  const created = await getVehicleByVin(data.vin);
  if (!created) throw new Error("Failed to create vehicle");
  return created;
}

export async function updateVehicle(id: number, data: Partial<Omit<InsertVehicle, "id" | "userId">>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(vehicles).set(data).where(eq(vehicles.id, id));
}

export async function getLatestAnalysis(vehicleId: number): Promise<CarfaxAnalysis | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(carfaxAnalyses)
    .where(eq(carfaxAnalyses.vehicleId, vehicleId))
    .orderBy(desc(carfaxAnalyses.createdAt))
    .limit(1);
  return result[0];
}

export async function saveCarfaxAnalysis(data: InsertCarfaxAnalysis): Promise<CarfaxAnalysis> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.insert(carfaxAnalyses).values(data);
  const created = await getLatestAnalysis(data.vehicleId);
  if (!created) throw new Error("Failed to save Carfax analysis");
  return created;
}

export async function getVehicleBundle(vehicleId: number, userId: number) {
  const vehicle = await getVehicleById(vehicleId);
  if (!vehicle) return undefined;
  const analysis = await getLatestAnalysis(vehicleId);
  const photos = await getVehiclePhotos(vehicleId);
  const damages = await getVehicleDamages(vehicleId);
  const parts = await getVehicleParts(vehicleId);
  const carfaxSummary = await getCarfaxSummary(vehicleId);
  return { vehicle, analysis, photos, damages, parts, carfaxSummary };
}

export async function saveVehiclePhoto(
  vehicleId: number,
  photoUrl: string,
  photoKey: string,
  displayOrder: number
): Promise<VehiclePhoto> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.insert(vehiclePhotos).values({
    vehicleId,
    photoUrl,
    photoKey,
    displayOrder,
  });

  const result = await db
    .select()
    .from(vehiclePhotos)
    .where(eq(vehiclePhotos.vehicleId, vehicleId))
    .orderBy(desc(vehiclePhotos.displayOrder))
    .limit(1);

  if (!result[0]) throw new Error("Failed to save vehicle photo");
  return result[0];
}

export async function getVehiclePhotos(vehicleId: number): Promise<VehiclePhoto[]> {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(vehiclePhotos)
    .where(eq(vehiclePhotos.vehicleId, vehicleId))
    .orderBy(vehiclePhotos.displayOrder);
}

export async function getVehiclePhotoKeys(vehicleId: number): Promise<string[]> {
  const db = await getDb();
  if (!db) return [];

  const rows = await db
    .select({ photoKey: vehiclePhotos.photoKey })
    .from(vehiclePhotos)
    .where(eq(vehiclePhotos.vehicleId, vehicleId));

  return rows.map((row) => row.photoKey).filter((key): key is string => typeof key === "string" && key.trim().length > 0);
}

export async function getVehicleDamageKeys(vehicleId: number): Promise<string[]> {
  const db = await getDb();
  if (!db) return [];

  const rows = await db
    .select({ photoKey: vehicleDamages.photoKey })
    .from(vehicleDamages)
    .where(eq(vehicleDamages.vehicleId, vehicleId));

  return rows.map((row) => row.photoKey).filter((key): key is string => typeof key === "string" && key.trim().length > 0);
}

export async function getVehicleCarfaxKey(vehicleId: number): Promise<string | null> {
  const db = await getDb();
  if (!db) return null;

  const row = await db.select({ carfaxPdfKey: vehicles.carfaxPdfKey })
    .from(vehicles)
    .where(eq(vehicles.id, vehicleId))
    .limit(1);

  return row.length > 0 && typeof row[0].carfaxPdfKey === "string" && row[0].carfaxPdfKey.trim().length > 0 ? row[0].carfaxPdfKey : null;
}

export async function saveVehicleDamage(data: InsertVehicleDamage): Promise<VehicleDamage> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.insert(vehicleDamages).values(data);
  const result = await db
    .select()
    .from(vehicleDamages)
    .where(eq(vehicleDamages.vehicleId, data.vehicleId))
    .orderBy(desc(vehicleDamages.createdAt))
    .limit(1);

  if (!result[0]) throw new Error("Failed to save vehicle damage");
  return result[0];
}

export async function getVehicleDamages(vehicleId: number): Promise<VehicleDamage[]> {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(vehicleDamages)
    .where(eq(vehicleDamages.vehicleId, vehicleId))
    .orderBy(vehicleDamages.displayOrder);
}

export async function saveVehiclePart(data: InsertVehiclePart): Promise<VehiclePart> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.insert(vehicleParts).values(data);
  const result = await db
    .select()
    .from(vehicleParts)
    .where(eq(vehicleParts.vehicleId, data.vehicleId))
    .orderBy(desc(vehicleParts.createdAt))
    .limit(1);

  if (!result[0]) throw new Error("Failed to save vehicle part");
  return result[0];
}

export async function getVehicleParts(vehicleId: number): Promise<VehiclePart[]> {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(vehicleParts)
    .where(eq(vehicleParts.vehicleId, vehicleId))
    .orderBy(vehicleParts.displayOrder);
}

export async function saveCarfaxSummary(data: InsertCarfaxSummary): Promise<CarfaxSummary> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.insert(carfaxSummaries).values(data);
  const result = await db
    .select()
    .from(carfaxSummaries)
    .where(eq(carfaxSummaries.vehicleId, data.vehicleId))
    .orderBy(desc(carfaxSummaries.createdAt))
    .limit(1);

  if (!result[0]) throw new Error("Failed to save Carfax summary");
  return result[0];
}

export async function getCarfaxSummary(vehicleId: number): Promise<CarfaxSummary | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(carfaxSummaries)
    .where(eq(carfaxSummaries.vehicleId, vehicleId))
    .orderBy(desc(carfaxSummaries.createdAt))
    .limit(1);

  return result[0];
}


export async function saveDamage(vehicleId: number, type: string, photoUrl: string | null, description: string | undefined): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.insert(vehicleDamages).values({
    vehicleId,
    type,
    photoUrl,
    description: description || null,
  });
}

export async function savePart(vehicleId: number, name: string, link: string | undefined, estimatedCost: string | undefined): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.insert(vehicleParts).values({
    vehicleId,
    name,
    link: link || null,
    estimatedCost: estimatedCost || null,
  });
}


export async function getAllVehicles(): Promise<typeof vehicles.$inferSelect[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db.select().from(vehicles).orderBy(desc(vehicles.createdAt));
}

export async function deleteVehicle(vehicleId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const photoKeys = await getVehiclePhotoKeys(vehicleId);
  const damageKeys = await getVehicleDamageKeys(vehicleId);
  const carfaxKey = await getVehicleCarfaxKey(vehicleId);
  const keysToDelete = [...photoKeys, ...damageKeys];
  if (carfaxKey) keysToDelete.push(carfaxKey);

  for (const key of keysToDelete) {
    try {
      await storageRemove(key);
    } catch (error) {
      console.warn("Failed to remove storage object during vehicle delete:", key, error);
    }
  }
  
  // Delete related records first
  await db.delete(vehiclePhotos).where(eq(vehiclePhotos.vehicleId, vehicleId));
  await db.delete(vehicleDamages).where(eq(vehicleDamages.vehicleId, vehicleId));
  await db.delete(vehicleParts).where(eq(vehicleParts.vehicleId, vehicleId));
  await db.delete(carfaxSummaries).where(eq(carfaxSummaries.vehicleId, vehicleId));
  await db.delete(carfaxAnalyses).where(eq(carfaxAnalyses.vehicleId, vehicleId));
  
  // Delete the vehicle itself
  await db.delete(vehicles).where(eq(vehicles.id, vehicleId));
}

export async function updateVehicleData(vehicleId: number, data: Partial<typeof vehicles.$inferInsert>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(vehicles).set(data).where(eq(vehicles.id, vehicleId));
}
