import { db, conflictChecksTable, casesTable, clientsTable, opponentsTable } from "@workspace/db";
import { eq, and, isNull, isNotNull, sql } from "drizzle-orm";
import { CaseEventLogger } from "./caseEventLogger.js";

type ConflictRow = typeof conflictChecksTable.$inferSelect;

interface DetectedConflict {
  conflictType: string;
  conflictingEntityType: string;
  conflictingEntityId: number;
  conflictingEntityName: string | null;
  matchedOn: string;
  matchScore: number;
  otherCaseId: number | null;
  otherCaseName: string | null;
}

export class ConflictDetectionService {
  static async checkForCase(caseId: number): Promise<DetectedConflict[]> {
    const [caseRow] = await db.select().from(casesTable).where(eq(casesTable.id, caseId));
    if (!caseRow) return [];

    const opponents = await db.select().from(opponentsTable).where(eq(opponentsTable.caseId, caseId));

    const clients = caseRow.clientId
      ? await db.select().from(clientsTable).where(
          and(eq(clientsTable.id, caseRow.clientId), isNull(clientsTable.deletedAt))
        )
      : [];
    const clientRow = clients[0] ?? null;

    const found: DetectedConflict[] = [];
    const seen = new Set<string>();
    const dedup = (key: string) => { if (seen.has(key)) return false; seen.add(key); return true; };

    for (const opp of opponents) {
      if (!opp.name?.trim()) continue;

      const matchingClients = await db.select().from(clientsTable).where(
        and(
          isNull(clientsTable.deletedAt),
          sql`LOWER(${clientsTable.name}) = LOWER(${opp.name})`
        )
      );

      for (const mc of matchingClients) {
        const key = `oic-${mc.id}`;
        if (dedup(key)) {
          found.push({
            conflictType: "opponent_is_client",
            conflictingEntityType: "client",
            conflictingEntityId: mc.id,
            conflictingEntityName: mc.name,
            matchedOn: "name_exact",
            matchScore: 0.9,
            otherCaseId: null,
            otherCaseName: null,
          });
        }
      }
    }

    if (clientRow) {
      const otherOpp = await db
        .select({
          id: opponentsTable.id,
          name: opponentsTable.name,
          caseId: opponentsTable.caseId,
          caseTitle: casesTable.title,
        })
        .from(opponentsTable)
        .leftJoin(casesTable, eq(opponentsTable.caseId, casesTable.id))
        .where(
          and(
            isNotNull(opponentsTable.caseId),
            sql`${opponentsTable.caseId} != ${caseId}`,
            sql`LOWER(${opponentsTable.name}) = LOWER(${clientRow.name})`
          )
        );

      for (const oo of otherOpp) {
        const key = `cioe-${oo.id}`;
        if (dedup(key)) {
          found.push({
            conflictType: "client_is_opponent_elsewhere",
            conflictingEntityType: "opponent",
            conflictingEntityId: oo.id,
            conflictingEntityName: oo.name,
            matchedOn: "name_exact",
            matchScore: 0.9,
            otherCaseId: oo.caseId ?? null,
            otherCaseName: oo.caseTitle ?? null,
          });
        }
      }
    }

    return found;
  }

  static async detectAndStore(caseId: number, actorUserId: number | null = null): Promise<ConflictRow[]> {
    const found = await this.checkForCase(caseId);

    await db.delete(conflictChecksTable).where(
      and(eq(conflictChecksTable.caseId, caseId), eq(conflictChecksTable.resolved, false))
    );

    if (found.length === 0) return [];

    const rows = await db
      .insert(conflictChecksTable)
      .values(
        found.map((f) => ({
          caseId,
          conflictType: f.conflictType,
          conflictingEntityType: f.conflictingEntityType,
          conflictingEntityId: f.conflictingEntityId,
          conflictingEntityName: f.conflictingEntityName ?? null,
          matchedOn: f.matchedOn,
          matchScore: String(f.matchScore),
          otherCaseId: f.otherCaseId ?? null,
          otherCaseName: f.otherCaseName ?? null,
          resolved: false,
        }))
      )
      .returning();

    void CaseEventLogger.log({
      caseId,
      eventType: "conflict_detected",
      actorUserId,
      metadata: {
        conflicts_count: rows.length,
        conflict_types: [...new Set(found.map((f) => f.conflictType))],
      },
    });

    return rows;
  }

  static async resolveAll(
    caseId: number,
    justification: string,
    resolvedByUserId: number | null
  ): Promise<number> {
    const now = new Date();
    const updated = await db
      .update(conflictChecksTable)
      .set({
        resolved: true,
        resolvedAt: now,
        resolvedBy: resolvedByUserId,
        resolutionJustification: justification,
      })
      .where(and(eq(conflictChecksTable.caseId, caseId), eq(conflictChecksTable.resolved, false)))
      .returning({ id: conflictChecksTable.id });

    if (updated.length > 0) {
      void CaseEventLogger.log({
        caseId,
        eventType: "conflict_resolved",
        actorUserId: resolvedByUserId,
        metadata: { resolved_count: updated.length, justification },
      });
    }

    return updated.length;
  }

  static async backfillAll(actorUserId: number | null = null): Promise<{ caseId: number; found: number }[]> {
    const allCases = await db.select({ id: casesTable.id }).from(casesTable);
    const results: { caseId: number; found: number }[] = [];
    for (const c of allCases) {
      const rows = await this.detectAndStore(c.id, actorUserId);
      if (rows.length > 0) results.push({ caseId: c.id, found: rows.length });
    }
    return results;
  }
}
