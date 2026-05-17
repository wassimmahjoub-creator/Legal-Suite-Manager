import { Router } from "express";
import { db, cabinetSettingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/cabinet-settings", async (_req, res) => {
  const [row] = await db.select().from(cabinetSettingsTable).orderBy(cabinetSettingsTable.id).limit(1);
  if (!row) {
    const [created] = await db.insert(cabinetSettingsTable).values({}).returning();
    return res.json(created);
  }
  res.json(row);
});

router.put("/cabinet-settings", async (req, res) => {
  const body = req.body as Record<string, string>;
  const str = (k: string) => typeof body[k] === "string" ? body[k] || null : null;

  const fields = {
    cabinetName: str("cabinetName"),
    cabinetTaxId: str("cabinetTaxId"),
    cabinetRib: str("cabinetRib"),
    cabinetRc: str("cabinetRc"),
    cabinetAddress: str("cabinetAddress"),
    cabinetPhone: str("cabinetPhone"),
    cabinetEmail: str("cabinetEmail"),
    defaultPaymentTerms: str("defaultPaymentTerms"),
    invoiceFooterAr: str("invoiceFooterAr"),
    invoiceFooterFr: str("invoiceFooterFr"),
    updatedAt: new Date(),
  };

  const [existing] = await db.select({ id: cabinetSettingsTable.id }).from(cabinetSettingsTable).limit(1);
  if (!existing) {
    const [row] = await db.insert(cabinetSettingsTable).values(fields).returning();
    return res.json(row);
  }
  const [row] = await db.update(cabinetSettingsTable).set(fields).where(eq(cabinetSettingsTable.id, existing.id)).returning();
  res.json(row);
});

export default router;
