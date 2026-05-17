import { Router } from "express";
import { db, courtsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.get("/courts", requireAuth, async (req, res) => {
  const { search, type, governorate } = req.query as Record<string, string>;

  let rows = await db.select().from(courtsTable).orderBy(courtsTable.nameAr);

  if (search) {
    const s = search.toLowerCase();
    rows = rows.filter(r =>
      (r.nameAr ?? r.name).toLowerCase().includes(s) ||
      (r.nameFr ?? "").toLowerCase().includes(s) ||
      (r.governorate ?? "").toLowerCase().includes(s) ||
      (r.city ?? "").toLowerCase().includes(s)
    );
  }
  if (type) rows = rows.filter(r => r.type === type);
  if (governorate) rows = rows.filter(r => r.governorate === governorate);

  res.json(rows);
});

router.get("/courts/:id", requireAuth, async (req, res): Promise<void> => {
  const [row] = await db.select().from(courtsTable).where(eq(courtsTable.id, Number(req.params.id)));
  if (!row) { res.status(404).json({ error: "غير موجود" }); return; }
  res.json(row);
});

router.post("/courts/seed", requireAuth, async (_req, res) => {
  const COURTS = [
    { name: "محكمة التعقيب", nameAr: "محكمة التعقيب", nameFr: "Cour de cassation", type: "cassation", governorate: "تونس", city: "تونس" },
    { name: "محكمة الاستئناف بتونس", nameAr: "محكمة الاستئناف بتونس", nameFr: "Cour d'appel de Tunis", type: "appel", governorate: "تونس", city: "تونس" },
    { name: "محكمة الاستئناف بسوسة", nameAr: "محكمة الاستئناف بسوسة", nameFr: "Cour d'appel de Sousse", type: "appel", governorate: "سوسة", city: "سوسة" },
    { name: "محكمة الاستئناف بصفاقس", nameAr: "محكمة الاستئناف بصفاقس", nameFr: "Cour d'appel de Sfax", type: "appel", governorate: "صفاقس", city: "صفاقس" },
    { name: "محكمة الاستئناف بمدنين", nameAr: "محكمة الاستئناف بمدنين", nameFr: "Cour d'appel de Médenine", type: "appel", governorate: "مدنين", city: "مدنين" },
    { name: "المحكمة الإدارية", nameAr: "المحكمة الإدارية", nameFr: "Tribunal administratif", type: "administratif", governorate: "تونس", city: "تونس" },
    { name: "المحكمة العقارية", nameAr: "المحكمة العقارية", nameFr: "Tribunal immobilier", type: "immobilier", governorate: "تونس", city: "تونس" },
    { name: "المحكمة الابتدائية بتونس", nameAr: "المحكمة الابتدائية بتونس", nameFr: "Tribunal de première instance de Tunis", type: "premiere_instance", governorate: "تونس", city: "تونس" },
    { name: "المحكمة الابتدائية بأريانة", nameAr: "المحكمة الابتدائية بأريانة", nameFr: "Tribunal de première instance d'Ariana", type: "premiere_instance", governorate: "أريانة", city: "أريانة" },
    { name: "المحكمة الابتدائية ببن عروس", nameAr: "المحكمة الابتدائية ببن عروس", nameFr: "Tribunal de première instance de Ben Arous", type: "premiere_instance", governorate: "بن عروس", city: "بن عروس" },
    { name: "المحكمة الابتدائية بمنوبة", nameAr: "المحكمة الابتدائية بمنوبة", nameFr: "Tribunal de première instance de La Manouba", type: "premiere_instance", governorate: "منوبة", city: "منوبة" },
    { name: "المحكمة الابتدائية بنابل", nameAr: "المحكمة الابتدائية بنابل", nameFr: "Tribunal de première instance de Nabeul", type: "premiere_instance", governorate: "نابل", city: "نابل" },
    { name: "المحكمة الابتدائية بزغوان", nameAr: "المحكمة الابتدائية بزغوان", nameFr: "Tribunal de première instance de Zaghouan", type: "premiere_instance", governorate: "زغوان", city: "زغوان" },
    { name: "المحكمة الابتدائية ببنزرت", nameAr: "المحكمة الابتدائية ببنزرت", nameFr: "Tribunal de première instance de Bizerte", type: "premiere_instance", governorate: "بنزرت", city: "بنزرت" },
    { name: "المحكمة الابتدائية بباجة", nameAr: "المحكمة الابتدائية بباجة", nameFr: "Tribunal de première instance de Béja", type: "premiere_instance", governorate: "باجة", city: "باجة" },
    { name: "المحكمة الابتدائية بجندوبة", nameAr: "المحكمة الابتدائية بجندوبة", nameFr: "Tribunal de première instance de Jendouba", type: "premiere_instance", governorate: "جندوبة", city: "جندوبة" },
    { name: "المحكمة الابتدائية بالكاف", nameAr: "المحكمة الابتدائية بالكاف", nameFr: "Tribunal de première instance du Kef", type: "premiere_instance", governorate: "الكاف", city: "الكاف" },
    { name: "المحكمة الابتدائية بسليانة", nameAr: "المحكمة الابتدائية بسليانة", nameFr: "Tribunal de première instance de Siliana", type: "premiere_instance", governorate: "سليانة", city: "سليانة" },
    { name: "المحكمة الابتدائية بسوسة", nameAr: "المحكمة الابتدائية بسوسة", nameFr: "Tribunal de première instance de Sousse", type: "premiere_instance", governorate: "سوسة", city: "سوسة" },
    { name: "المحكمة الابتدائية بالمنستير", nameAr: "المحكمة الابتدائية بالمنستير", nameFr: "Tribunal de première instance de Monastir", type: "premiere_instance", governorate: "المنستير", city: "المنستير" },
    { name: "المحكمة الابتدائية بالمهدية", nameAr: "المحكمة الابتدائية بالمهدية", nameFr: "Tribunal de première instance de Mahdia", type: "premiere_instance", governorate: "المهدية", city: "المهدية" },
    { name: "المحكمة الابتدائية بصفاقس", nameAr: "المحكمة الابتدائية بصفاقس", nameFr: "Tribunal de première instance de Sfax", type: "premiere_instance", governorate: "صفاقس", city: "صفاقس" },
    { name: "المحكمة الابتدائية بالقيروان", nameAr: "المحكمة الابتدائية بالقيروان", nameFr: "Tribunal de première instance de Kairouan", type: "premiere_instance", governorate: "القيروان", city: "القيروان" },
    { name: "المحكمة الابتدائية بالقصرين", nameAr: "المحكمة الابتدائية بالقصرين", nameFr: "Tribunal de première instance de Kasserine", type: "premiere_instance", governorate: "القصرين", city: "القصرين" },
    { name: "المحكمة الابتدائية بسيدي بوزيد", nameAr: "المحكمة الابتدائية بسيدي بوزيد", nameFr: "Tribunal de première instance de Sidi Bouzid", type: "premiere_instance", governorate: "سيدي بوزيد", city: "سيدي بوزيد" },
    { name: "المحكمة الابتدائية بقابس", nameAr: "المحكمة الابتدائية بقابس", nameFr: "Tribunal de première instance de Gabès", type: "premiere_instance", governorate: "قابس", city: "قابس" },
    { name: "المحكمة الابتدائية بمدنين", nameAr: "المحكمة الابتدائية بمدنين", nameFr: "Tribunal de première instance de Médenine", type: "premiere_instance", governorate: "مدنين", city: "مدنين" },
    { name: "المحكمة الابتدائية بتطاوين", nameAr: "المحكمة الابتدائية بتطاوين", nameFr: "Tribunal de première instance de Tataouine", type: "premiere_instance", governorate: "تطاوين", city: "تطاوين" },
    { name: "المحكمة الابتدائية بقفصة", nameAr: "المحكمة الابتدائية بقفصة", nameFr: "Tribunal de première instance de Gafsa", type: "premiere_instance", governorate: "قفصة", city: "قفصة" },
    { name: "المحكمة الابتدائية بتوزر", nameAr: "المحكمة الابتدائية بتوزر", nameFr: "Tribunal de première instance de Tozeur", type: "premiere_instance", governorate: "توزر", city: "توزر" },
    { name: "المحكمة الابتدائية بقبلي", nameAr: "المحكمة الابتدائية بقبلي", nameFr: "Tribunal de première instance de Kébili", type: "premiere_instance", governorate: "قبلي", city: "قبلي" },
  ];
  const existing = await db.select({ name: courtsTable.name, nameAr: courtsTable.nameAr })
    .from(courtsTable);
  const existingNames = new Set([
    ...existing.map(r => r.name),
    ...existing.map(r => r.nameAr).filter(Boolean),
  ]);

  let inserted = 0;
  for (const court of COURTS) {
    if (existingNames.has(court.name) || existingNames.has(court.nameAr)) continue;
    try {
      await db.insert(courtsTable).values({
        name: court.name,
        nameAr: court.nameAr,
        nameFr: court.nameFr,
        type: court.type as "cassation" | "appel" | "premiere_instance" | "cantonal" | "administratif" | "immobilier" | "prudhommes" | "autre",
        governorate: court.governorate,
        city: court.city,
        updatedAt: new Date(),
      });
      existingNames.add(court.name);
      inserted++;
    } catch (_e) { /* skip */ }
  }
  res.json({ message: `${inserted} محكمة أضيفت`, total: COURTS.length });
});

router.post("/courts/import-csv", requireAuth, async (req, res): Promise<void> => {
  const rows = req.body as Array<Record<string, string>>;
  if (!Array.isArray(rows) || rows.length === 0) {
    res.status(400).json({ error: "بيانات فارغة" }); return;
  }
  let imported = 0;
  const errors: string[] = [];
  for (const row of rows) {
    const displayName = row.name_ar || row.nameAr || row.name;
    if (!displayName) continue;
    try {
      await db.insert(courtsTable).values({
        name: displayName,
        nameAr: row.name_ar || row.nameAr || displayName,
        nameFr: row.name_fr || row.nameFr || undefined,
        type: (row.type as "cassation" | "appel" | "premiere_instance" | "cantonal" | "administratif" | "immobilier" | "prudhommes" | "autre") || "premiere_instance",
        governorate: row.governorate || undefined,
        city: row.city || undefined,
        address: row.address || undefined,
        phone: row.phone || undefined,
        updatedAt: new Date(),
      });
      imported++;
    } catch (e: unknown) {
      errors.push(displayName + ": " + String(e));
    }
  }
  res.json({ imported, total: rows.length, errors });
});

router.post("/courts", requireAuth, async (req, res): Promise<void> => {
  const { name, nameAr, nameFr, type, governorate, division, city, address, phone, notes, parentCourtId } = req.body as Record<string, string>;
  const displayName = nameAr || name;
  if (!displayName) { res.status(400).json({ error: "الاسم مطلوب" }); return; }
  const [row] = await db.insert(courtsTable).values({
    name: displayName,
    nameAr: nameAr || displayName,
    nameFr: nameFr || undefined,
    type: (type as "cassation" | "appel" | "premiere_instance" | "cantonal" | "administratif" | "immobilier" | "prudhommes" | "autre") || "premiere_instance",
    governorate: governorate || undefined,
    division: division || undefined,
    city: city || undefined,
    address: address || undefined,
    phone: phone || undefined,
    notes: notes || undefined,
    parentCourtId: parentCourtId ? Number(parentCourtId) : undefined,
    updatedAt: new Date(),
  }).returning();
  res.status(201).json(row);
});

router.put("/courts/:id", requireAuth, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const { name, nameAr, nameFr, type, governorate, division, city, address, phone, notes, parentCourtId } = req.body as Record<string, string>;
  const displayName = nameAr || name;
  const [row] = await db.update(courtsTable).set({
    name: displayName,
    nameAr: nameAr || displayName,
    nameFr: nameFr || undefined,
    type: type ? (type as "cassation" | "appel" | "premiere_instance" | "cantonal" | "administratif" | "immobilier" | "prudhommes" | "autre") : undefined,
    governorate: governorate || undefined,
    division: division || undefined,
    city: city || undefined,
    address: address || undefined,
    phone: phone || undefined,
    notes: notes || undefined,
    parentCourtId: parentCourtId ? Number(parentCourtId) : undefined,
    updatedAt: new Date(),
  }).where(eq(courtsTable.id, id)).returning();
  if (!row) { res.status(404).json({ error: "غير موجود" }); return; }
  res.json(row);
});

router.delete("/courts/:id", requireAuth, async (req, res) => {
  await db.delete(courtsTable).where(eq(courtsTable.id, Number(req.params.id)));
  res.status(204).send();
});

export default router;
