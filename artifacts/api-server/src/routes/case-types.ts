import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

const router: IRouter = Router();

// ─── Helpers ─────────────────────────────────────
function actor(req: any) { return req.user as { orgId?: number; id?: number }; }

async function caseOrgCheck(caseId: number, orgId: number): Promise<boolean> {
  const r = await db.execute(sql`SELECT 1 FROM cases WHERE id=${caseId} AND org_id=${orgId}`);
  return (r.rows?.length ?? 0) > 0;
}

// ══════════════════════════════════════════════════
// CONTRAT — /api/cases/:id/contract
// ══════════════════════════════════════════════════

router.get("/cases/:id/contract", async (req, res): Promise<void> => {
  const caseId = Number(req.params.id);
  const { orgId } = actor(req);
  if (!orgId || !(await caseOrgCheck(caseId, orgId))) { res.status(404).json({ error: "Not found" }); return; }
  const contract = await db.execute(sql`
    SELECT c.*, json_agg(
      json_build_object('id',v.id,'version_number',v.version_number,'notes',v.notes,'created_at',v.created_at)
      ORDER BY v.version_number DESC
    ) FILTER (WHERE v.id IS NOT NULL) AS versions
    FROM contracts c
    LEFT JOIN contract_versions v ON v.contract_id = c.id
    WHERE c.case_id = ${caseId}
    GROUP BY c.id
  `);
  res.json(contract.rows?.[0] ?? null);
});

router.patch("/cases/:id/contract", async (req, res): Promise<void> => {
  const caseId = Number(req.params.id);
  const { orgId } = actor(req);
  if (!orgId || !(await caseOrgCheck(caseId, orgId))) { res.status(404).json({ error: "Not found" }); return; }
  try {
    const { contractType, partyOneName, partyOneTaxId, partyTwoName, partyTwoTaxId,
            contractValue, status, startDate, endDate, signingDate, notes } = req.body;
    await db.execute(sql`
      INSERT INTO contracts (case_id, contract_type, party_one_name, party_one_tax_id,
        party_two_name, party_two_tax_id, contract_value, status,
        start_date, end_date, signing_date, notes)
      VALUES (${caseId}, ${contractType ?? 'other'}, ${partyOneName ?? null},
        ${partyOneTaxId ?? null}, ${partyTwoName ?? null}, ${partyTwoTaxId ?? null},
        ${contractValue ?? null}, ${status ?? 'draft'},
        ${startDate ?? null}, ${endDate ?? null}, ${signingDate ?? null}, ${notes ?? null})
      ON CONFLICT (case_id) DO UPDATE SET
        contract_type = EXCLUDED.contract_type,
        party_one_name = EXCLUDED.party_one_name,
        party_one_tax_id = EXCLUDED.party_one_tax_id,
        party_two_name = EXCLUDED.party_two_name,
        party_two_tax_id = EXCLUDED.party_two_tax_id,
        contract_value = EXCLUDED.contract_value,
        status = EXCLUDED.status,
        start_date = EXCLUDED.start_date,
        end_date = EXCLUDED.end_date,
        signing_date = EXCLUDED.signing_date,
        notes = EXCLUDED.notes,
        updated_at = now()
    `);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: String(err) }); }
});

router.post("/cases/:id/contract/versions", async (req, res): Promise<void> => {
  const caseId = Number(req.params.id);
  const { orgId, id: userId } = actor(req);
  if (!orgId || !(await caseOrgCheck(caseId, orgId))) { res.status(404).json({ error: "Not found" }); return; }
  try {
    const contractRow = await db.execute(sql`SELECT id FROM contracts WHERE case_id=${caseId}`);
    if (!contractRow.rows?.length) { res.status(400).json({ error: "أنشئ العقد أولاً" }); return; }
    const contractId = (contractRow.rows[0] as any).id;
    const maxRow = await db.execute(sql`SELECT COALESCE(MAX(version_number),0)+1 AS next FROM contract_versions WHERE contract_id=${contractId}`);
    const nextVersion = (maxRow.rows?.[0] as any)?.next ?? 1;
    const result = await db.execute(sql`
      INSERT INTO contract_versions (contract_id, version_number, notes, created_by)
      VALUES (${contractId}, ${nextVersion}, ${req.body.notes ?? null}, ${userId ?? null})
      RETURNING *
    `);
    res.status(201).json(result.rows?.[0]);
  } catch (err) { res.status(500).json({ error: String(err) }); }
});

router.delete("/cases/:id/contract/versions/:vid", async (req, res): Promise<void> => {
  const caseId = Number(req.params.id);
  const vid = Number(req.params.vid);
  const { orgId } = actor(req);
  if (!orgId || !(await caseOrgCheck(caseId, orgId))) { res.status(404).json({ error: "Not found" }); return; }
  await db.execute(sql`
    DELETE FROM contract_versions WHERE id=${vid}
    AND contract_id IN (SELECT id FROM contracts WHERE case_id=${caseId})
  `);
  res.json({ ok: true });
});

// ══════════════════════════════════════════════════
// RECOUVREMENT — /api/cases/:id/debt-recovery
// ══════════════════════════════════════════════════

router.get("/cases/:id/debt-recovery", async (req, res): Promise<void> => {
  const caseId = Number(req.params.id);
  const { orgId } = actor(req);
  if (!orgId || !(await caseOrgCheck(caseId, orgId))) { res.status(404).json({ error: "Not found" }); return; }
  const result = await db.execute(sql`
    SELECT d.*, json_agg(
      json_build_object('id',p.id,'received_at',p.received_at,'amount',p.amount,
        'payment_method',p.payment_method,'reference',p.reference,'notes',p.notes)
      ORDER BY p.received_at DESC
    ) FILTER (WHERE p.id IS NOT NULL) AS payments
    FROM debt_recovery_files d
    LEFT JOIN debt_recovery_payments p ON p.debt_recovery_file_id = d.id
    WHERE d.case_id = ${caseId}
    GROUP BY d.id
  `);
  res.json(result.rows?.[0] ?? null);
});

router.patch("/cases/:id/debt-recovery", async (req, res): Promise<void> => {
  const caseId = Number(req.params.id);
  const { orgId } = actor(req);
  if (!orgId || !(await caseOrgCheck(caseId, orgId))) { res.status(404).json({ error: "Not found" }); return; }
  try {
    const { debtorName, debtorTaxId, debtorPhone, debtorAddress,
            debtAmount, debtReason, dueDate, currentStage, notes } = req.body;
    await db.execute(sql`
      INSERT INTO debt_recovery_files (case_id, debtor_name, debtor_tax_id, debtor_phone,
        debtor_address, debt_amount, debt_reason, due_date, current_stage, notes)
      VALUES (${caseId}, ${debtorName ?? ''}, ${debtorTaxId ?? null},
        ${debtorPhone ?? null}, ${debtorAddress ?? null}, ${debtAmount ?? 0},
        ${debtReason ?? null}, ${dueDate ?? null}, ${currentStage ?? 'notice'}, ${notes ?? null})
      ON CONFLICT (case_id) DO UPDATE SET
        debtor_name = EXCLUDED.debtor_name,
        debtor_tax_id = EXCLUDED.debtor_tax_id,
        debtor_phone = EXCLUDED.debtor_phone,
        debtor_address = EXCLUDED.debtor_address,
        debt_amount = EXCLUDED.debt_amount,
        debt_reason = EXCLUDED.debt_reason,
        due_date = EXCLUDED.due_date,
        current_stage = EXCLUDED.current_stage,
        notes = EXCLUDED.notes,
        updated_at = now()
    `);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: String(err) }); }
});

router.post("/cases/:id/debt-recovery/payments", async (req, res): Promise<void> => {
  const caseId = Number(req.params.id);
  const { orgId, id: userId } = actor(req);
  if (!orgId || !(await caseOrgCheck(caseId, orgId))) { res.status(404).json({ error: "Not found" }); return; }
  try {
    const fileRow = await db.execute(sql`SELECT id FROM debt_recovery_files WHERE case_id=${caseId}`);
    if (!fileRow.rows?.length) { res.status(400).json({ error: "أنشئ ملف التحصيل أولاً" }); return; }
    const fileId = (fileRow.rows[0] as any).id;
    const { amount, receivedAt, paymentMethod, reference, notes } = req.body;
    const result = await db.execute(sql`
      INSERT INTO debt_recovery_payments
        (debt_recovery_file_id, amount, received_at, payment_method, reference, notes, recorded_by)
      VALUES (${fileId}, ${amount}, ${receivedAt ?? 'now()'}, ${paymentMethod ?? null},
              ${reference ?? null}, ${notes ?? null}, ${userId ?? null})
      RETURNING *
    `);
    await db.execute(sql`
      UPDATE debt_recovery_files
      SET recovered_amount = (SELECT COALESCE(SUM(amount),0) FROM debt_recovery_payments WHERE debt_recovery_file_id=${fileId})
      WHERE id=${fileId}
    `);
    res.status(201).json(result.rows?.[0]);
  } catch (err) { res.status(500).json({ error: String(err) }); }
});

router.delete("/cases/:id/debt-recovery/payments/:pid", async (req, res): Promise<void> => {
  const caseId = Number(req.params.id);
  const pid = Number(req.params.pid);
  const { orgId } = actor(req);
  if (!orgId || !(await caseOrgCheck(caseId, orgId))) { res.status(404).json({ error: "Not found" }); return; }
  await db.execute(sql`
    DELETE FROM debt_recovery_payments WHERE id=${pid}
    AND debt_recovery_file_id IN (SELECT id FROM debt_recovery_files WHERE case_id=${caseId})
  `);
  res.json({ ok: true });
});

// ══════════════════════════════════════════════════
// SOCIÉTÉ — /api/cases/:id/company-creation
// ══════════════════════════════════════════════════

router.get("/cases/:id/company-creation", async (req, res): Promise<void> => {
  const caseId = Number(req.params.id);
  const { orgId } = actor(req);
  if (!orgId || !(await caseOrgCheck(caseId, orgId))) { res.status(404).json({ error: "Not found" }); return; }
  const result = await db.execute(sql`
    SELECT
      cf.*,
      COALESCE(json_agg(DISTINCT jsonb_build_object('id',p.id,'partner_name',p.partner_name,
        'partner_tax_id',p.partner_tax_id,'shares_percentage',p.shares_percentage,
        'position',p.position,'position_order',p.position_order))
        FILTER (WHERE p.id IS NOT NULL), '[]') AS partners,
      COALESCE(json_agg(DISTINCT jsonb_build_object('id',s.id,'step_name_ar',s.step_name_ar,
        'step_order',s.step_order,'is_completed',s.is_completed,
        'completed_at',s.completed_at,'notes',s.notes))
        FILTER (WHERE s.id IS NOT NULL), '[]') AS steps
    FROM company_files cf
    LEFT JOIN company_partners p ON p.company_file_id = cf.id
    LEFT JOIN company_creation_steps s ON s.company_file_id = cf.id
    WHERE cf.case_id = ${caseId}
    GROUP BY cf.id
  `);
  res.json(result.rows?.[0] ?? null);
});

router.patch("/cases/:id/company-creation", async (req, res): Promise<void> => {
  const caseId = Number(req.params.id);
  const { orgId } = actor(req);
  if (!orgId || !(await caseOrgCheck(caseId, orgId))) { res.status(404).json({ error: "Not found" }); return; }
  try {
    const { companyType, proposedName, capital, activity, taxId, rneNumber, procedureStatus, notes } = req.body;
    await db.execute(sql`
      INSERT INTO company_files (case_id, company_type, proposed_name, capital, activity,
        tax_id, rne_number, procedure_status, notes)
      VALUES (${caseId}, ${companyType ?? 'sarl'}, ${proposedName ?? null},
        ${capital ?? null}, ${activity ?? null}, ${taxId ?? null},
        ${rneNumber ?? null}, ${procedureStatus ?? null}, ${notes ?? null})
      ON CONFLICT (case_id) DO UPDATE SET
        company_type = EXCLUDED.company_type,
        proposed_name = EXCLUDED.proposed_name,
        capital = EXCLUDED.capital,
        activity = EXCLUDED.activity,
        tax_id = EXCLUDED.tax_id,
        rne_number = EXCLUDED.rne_number,
        procedure_status = EXCLUDED.procedure_status,
        notes = EXCLUDED.notes,
        updated_at = now()
    `);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: String(err) }); }
});

router.patch("/cases/:id/company-creation/steps/:stepId", async (req, res): Promise<void> => {
  const caseId = Number(req.params.id);
  const stepId = Number(req.params.stepId);
  const { orgId } = actor(req);
  if (!orgId || !(await caseOrgCheck(caseId, orgId))) { res.status(404).json({ error: "Not found" }); return; }
  const { isCompleted } = req.body as { isCompleted: boolean };
  await db.execute(sql`
    UPDATE company_creation_steps SET
      is_completed = ${isCompleted},
      completed_at = ${isCompleted ? sql`now()` : sql`NULL`}
    WHERE id = ${stepId}
    AND company_file_id IN (SELECT id FROM company_files WHERE case_id = ${caseId})
  `);
  res.json({ ok: true });
});

router.post("/cases/:id/company-creation/steps", async (req, res): Promise<void> => {
  const caseId = Number(req.params.id);
  const { orgId } = actor(req);
  if (!orgId || !(await caseOrgCheck(caseId, orgId))) { res.status(404).json({ error: "Not found" }); return; }
  try {
    const fileRow = await db.execute(sql`SELECT id FROM company_files WHERE case_id=${caseId}`);
    if (!fileRow.rows?.length) { res.status(400).json({ error: "أنشئ ملف الشركة أولاً" }); return; }
    const fileId = (fileRow.rows[0] as any).id;
    const maxRow = await db.execute(sql`SELECT COALESCE(MAX(step_order),0)+1 AS next FROM company_creation_steps WHERE company_file_id=${fileId}`);
    const stepOrder = (maxRow.rows?.[0] as any)?.next ?? 1;
    const result = await db.execute(sql`
      INSERT INTO company_creation_steps (company_file_id, step_name_ar, step_order)
      VALUES (${fileId}, ${req.body.stepNameAr ?? 'خطوة جديدة'}, ${stepOrder})
      RETURNING *
    `);
    res.status(201).json(result.rows?.[0]);
  } catch (err) { res.status(500).json({ error: String(err) }); }
});

export default router;
