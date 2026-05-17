import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

export async function generateInvoiceNumber(): Promise<string> {
  const year = new Date().getFullYear();

  const rows = await db.transaction(async (tx) => {
    await tx.execute(sql`
      INSERT INTO invoice_counters (year, last_number)
      VALUES (${year}, 0)
      ON CONFLICT (year) DO NOTHING
    `);

    return await tx.execute(sql`
      UPDATE invoice_counters
      SET last_number = last_number + 1
      WHERE year = ${year}
      RETURNING last_number
    `);
  });

  const lastNumber = (rows[0] as { last_number: number }).last_number;
  return `F-${year}-${String(lastNumber).padStart(4, "0")}`;
}
