/**
 * Route de migration 0001 — Multi-types de dossiers juridiques
 * URL : GET /api/admin/migrate-0001?secret=MIGRATION_SECRET
 *
 * Cette route est idempotente : elle vérifie chaque étape avant de l'exécuter.
 * Résultat affiché en HTML dans le navigateur pour faciliter la lecture.
 */
import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

const router: IRouter = Router();

router.get("/admin/migrate-0001", async (req, res) => {
  // ── Protection par token ──────────────────────────────────────────────────
  const secret = process.env["MIGRATION_SECRET"] ?? "migrate-legal-2026";
  if (req.query["secret"] !== secret) {
    return res.status(403).json({ error: "Token invalide. Ajoute ?secret=<MIGRATION_SECRET> à l'URL." });
  }

  const steps: { name: string; status: "ok" | "skipped" | "error"; detail?: string }[] = [];

  async function run(name: string, query: string, skipCheck?: () => Promise<boolean>) {
    try {
      if (skipCheck && await skipCheck()) {
        steps.push({ name, status: "skipped", detail: "déjà appliqué" });
        return;
      }
      await db.execute(sql.raw(query));
      steps.push({ name, status: "ok" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      steps.push({ name, status: "error", detail: msg });
    }
  }

  // ────────────────────────────────────────────────────────────────────────────
  // ÉTAPE 1 — Enum service_type
  // ────────────────────────────────────────────────────────────────────────────
  await run(
    "CREATE ENUM service_type",
    `CREATE TYPE service_type AS ENUM (
      'lawsuit','consultation','contract','company_creation','debt_recovery',
      'legal_notice','judgment_execution','real_estate_file','labor_file',
      'tax_file','administrative','mediation','other'
    )`,
    async () => {
      const r = await db.execute(sql`SELECT 1 FROM pg_type WHERE typname = 'service_type'`);
      return (r.rows?.length ?? 0) > 0;
    },
  );

  await run(
    "ALTER cases ADD service_type",
    `ALTER TABLE cases ADD COLUMN service_type service_type NOT NULL DEFAULT 'lawsuit'`,
    async () => {
      const r = await db.execute(sql`
        SELECT 1 FROM information_schema.columns
        WHERE table_name='cases' AND column_name='service_type'`);
      return (r.rows?.length ?? 0) > 0;
    },
  );

  await run(
    "ALTER cases ADD type_specific_data",
    `ALTER TABLE cases ADD COLUMN type_specific_data jsonb DEFAULT '{}'`,
    async () => {
      const r = await db.execute(sql`
        SELECT 1 FROM information_schema.columns
        WHERE table_name='cases' AND column_name='type_specific_data'`);
      return (r.rows?.length ?? 0) > 0;
    },
  );

  // ────────────────────────────────────────────────────────────────────────────
  // ÉTAPE 2 — Enums pour contracts
  // ────────────────────────────────────────────────────────────────────────────
  await run(
    "CREATE ENUM contract_type",
    `CREATE TYPE contract_type AS ENUM (
      'sale','rental','service','employment','partnership',
      'loan','guarantee','agency','franchise','other'
    )`,
    async () => {
      const r = await db.execute(sql`SELECT 1 FROM pg_type WHERE typname = 'contract_type'`);
      return (r.rows?.length ?? 0) > 0;
    },
  );

  await run(
    "CREATE ENUM contract_status",
    `CREATE TYPE contract_status AS ENUM (
      'draft','under_review','ready_to_sign','signed','expired','terminated'
    )`,
    async () => {
      const r = await db.execute(sql`SELECT 1 FROM pg_type WHERE typname = 'contract_status'`);
      return (r.rows?.length ?? 0) > 0;
    },
  );

  // ────────────────────────────────────────────────────────────────────────────
  // ÉTAPE 3 — Table contracts
  // ────────────────────────────────────────────────────────────────────────────
  await run(
    "CREATE TABLE contracts",
    `CREATE TABLE contracts (
      id              serial PRIMARY KEY,
      case_id         integer NOT NULL UNIQUE REFERENCES cases(id) ON DELETE CASCADE,
      contract_type   contract_type NOT NULL DEFAULT 'other',
      party_one_name  text,
      party_one_tax_id text,
      party_two_name  text,
      party_two_tax_id text,
      contract_value  numeric(14,3),
      contract_currency text NOT NULL DEFAULT 'TND',
      status          contract_status NOT NULL DEFAULT 'draft',
      start_date      date,
      end_date        date,
      signing_date    date,
      notes           text,
      created_at      timestamptz NOT NULL DEFAULT now(),
      updated_at      timestamptz NOT NULL DEFAULT now()
    )`,
    async () => {
      const r = await db.execute(sql`
        SELECT 1 FROM information_schema.tables WHERE table_name='contracts'`);
      return (r.rows?.length ?? 0) > 0;
    },
  );

  await run(
    "CREATE TABLE contract_versions",
    `CREATE TABLE contract_versions (
      id           serial PRIMARY KEY,
      contract_id  integer NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
      version_number integer NOT NULL DEFAULT 1,
      document_id  integer REFERENCES documents(id) ON DELETE SET NULL,
      notes        text,
      created_by   integer REFERENCES users(id) ON DELETE SET NULL,
      created_at   timestamptz NOT NULL DEFAULT now(),
      UNIQUE(contract_id, version_number)
    )`,
    async () => {
      const r = await db.execute(sql`
        SELECT 1 FROM information_schema.tables WHERE table_name='contract_versions'`);
      return (r.rows?.length ?? 0) > 0;
    },
  );

  // ────────────────────────────────────────────────────────────────────────────
  // ÉTAPE 4 — Enum company_type + Table company_files
  // ────────────────────────────────────────────────────────────────────────────
  await run(
    "CREATE ENUM company_type",
    `CREATE TYPE company_type AS ENUM ('sarl','suarl','sa','single_person_company','other')`,
    async () => {
      const r = await db.execute(sql`SELECT 1 FROM pg_type WHERE typname = 'company_type'`);
      return (r.rows?.length ?? 0) > 0;
    },
  );

  await run(
    "CREATE TABLE company_files",
    `CREATE TABLE company_files (
      id               serial PRIMARY KEY,
      case_id          integer NOT NULL UNIQUE REFERENCES cases(id) ON DELETE CASCADE,
      company_type     company_type NOT NULL DEFAULT 'sarl',
      proposed_name    text,
      capital          numeric(14,3),
      activity         text,
      tax_id           text,
      rne_number       text,
      procedure_status text,
      notes            text,
      created_at       timestamptz NOT NULL DEFAULT now(),
      updated_at       timestamptz NOT NULL DEFAULT now()
    )`,
    async () => {
      const r = await db.execute(sql`
        SELECT 1 FROM information_schema.tables WHERE table_name='company_files'`);
      return (r.rows?.length ?? 0) > 0;
    },
  );

  await run(
    "CREATE TABLE company_partners",
    `CREATE TABLE company_partners (
      id                serial PRIMARY KEY,
      company_file_id   integer NOT NULL REFERENCES company_files(id) ON DELETE CASCADE,
      partner_name      text NOT NULL,
      partner_tax_id    text,
      shares_percentage numeric(5,2),
      position          text,
      position_order    integer NOT NULL DEFAULT 0
    )`,
    async () => {
      const r = await db.execute(sql`
        SELECT 1 FROM information_schema.tables WHERE table_name='company_partners'`);
      return (r.rows?.length ?? 0) > 0;
    },
  );

  await run(
    "CREATE TABLE company_creation_steps",
    `CREATE TABLE company_creation_steps (
      id               serial PRIMARY KEY,
      company_file_id  integer NOT NULL REFERENCES company_files(id) ON DELETE CASCADE,
      step_name_ar     text NOT NULL,
      step_order       integer NOT NULL DEFAULT 0,
      is_completed     boolean NOT NULL DEFAULT false,
      completed_at     timestamptz,
      notes            text
    )`,
    async () => {
      const r = await db.execute(sql`
        SELECT 1 FROM information_schema.tables WHERE table_name='company_creation_steps'`);
      return (r.rows?.length ?? 0) > 0;
    },
  );

  // ────────────────────────────────────────────────────────────────────────────
  // ÉTAPE 5 — Enum debt_stage + Table debt_recovery_files
  // ────────────────────────────────────────────────────────────────────────────
  await run(
    "CREATE ENUM debt_stage",
    `CREATE TYPE debt_stage AS ENUM ('notice','negotiation','lawsuit','execution','completed')`,
    async () => {
      const r = await db.execute(sql`SELECT 1 FROM pg_type WHERE typname = 'debt_stage'`);
      return (r.rows?.length ?? 0) > 0;
    },
  );

  await run(
    "CREATE TABLE debt_recovery_files",
    `CREATE TABLE debt_recovery_files (
      id               serial PRIMARY KEY,
      case_id          integer NOT NULL UNIQUE REFERENCES cases(id) ON DELETE CASCADE,
      debtor_name      text NOT NULL,
      debtor_tax_id    text,
      debtor_phone     text,
      debtor_address   text,
      debt_amount      numeric(14,3) NOT NULL DEFAULT 0,
      recovered_amount numeric(14,3) NOT NULL DEFAULT 0,
      debt_reason      text,
      due_date         date,
      current_stage    debt_stage NOT NULL DEFAULT 'notice',
      notes            text,
      created_at       timestamptz NOT NULL DEFAULT now(),
      updated_at       timestamptz NOT NULL DEFAULT now()
    )`,
    async () => {
      const r = await db.execute(sql`
        SELECT 1 FROM information_schema.tables WHERE table_name='debt_recovery_files'`);
      return (r.rows?.length ?? 0) > 0;
    },
  );

  await run(
    "CREATE TABLE debt_recovery_payments",
    `CREATE TABLE debt_recovery_payments (
      id                    serial PRIMARY KEY,
      debt_recovery_file_id integer NOT NULL REFERENCES debt_recovery_files(id) ON DELETE CASCADE,
      received_at           date NOT NULL DEFAULT CURRENT_DATE,
      amount                numeric(14,3) NOT NULL,
      payment_method        text,
      reference             text,
      notes                 text,
      recorded_by           integer REFERENCES users(id) ON DELETE SET NULL,
      created_at            timestamptz NOT NULL DEFAULT now()
    )`,
    async () => {
      const r = await db.execute(sql`
        SELECT 1 FROM information_schema.tables WHERE table_name='debt_recovery_payments'`);
      return (r.rows?.length ?? 0) > 0;
    },
  );

  // ────────────────────────────────────────────────────────────────────────────
  // ÉTAPE 6 — Migration consultations → cases
  // ────────────────────────────────────────────────────────────────────────────
  await run(
    "Migrer consultations → cases",
    `DO $$
DECLARE
  rec           RECORD;
  v_org_id      integer;
  v_year        text;
  v_count       integer;
  v_case_number text;
  v_status      text;
BEGIN
  FOR rec IN
    SELECT c.*, cl.org_id
    FROM consultations c
    LEFT JOIN clients cl ON cl.id = c.client_id
    WHERE cl.org_id IS NOT NULL
    ORDER BY c.date ASC, c.id ASC
  LOOP
    -- Skip already migrated
    IF EXISTS (
      SELECT 1 FROM cases
      WHERE (type_specific_data->>'original_consultation_id')::int = rec.id
    ) THEN
      CONTINUE;
    END IF;

    v_org_id := rec.org_id;
    v_year   := to_char(COALESCE(rec.date::date, CURRENT_DATE), 'YYYY');

    SELECT count(*)::int INTO v_count
    FROM cases
    WHERE org_id = v_org_id
      AND case_number LIKE (v_year || '-%');

    v_case_number := v_year || '-' || lpad((v_count + 1)::text, 4, '0');

    v_status := CASE rec.status
      WHEN 'done'      THEN 'closed'
      WHEN 'cancelled' THEN 'archived'
      ELSE 'active'
    END;

    INSERT INTO cases (
      case_number, title, org_id, client_id, status,
      service_type, opened_at, type_specific_data, created_at
    ) VALUES (
      v_case_number,
      rec.subject,
      v_org_id,
      rec.client_id,
      v_status,
      'consultation',
      rec.date,
      jsonb_build_object(
        'consultation_date',           rec.date,
        'consultation_fees',           COALESCE(rec.amount, 0),
        'result',                      rec.notes,
        'migrated_from_consultations', true,
        'original_consultation_id',    rec.id
      ),
      rec.created_at
    );
  END LOOP;
END;
$$`,
    async () => false, // toujours exécuter (la boucle gère les doublons avec CONTINUE)
  );

  // ────────────────────────────────────────────────────────────────────────────
  // RAPPORT DE VÉRIFICATION
  // ────────────────────────────────────────────────────────────────────────────
  const report: Record<string, unknown> = {};
  try {
    const [total, consultations, migrated, dupCheck, dist] = await Promise.all([
      db.execute(sql`SELECT count(*) AS n FROM cases`),
      db.execute(sql`SELECT count(*) AS n FROM consultations`),
      db.execute(sql`SELECT count(*) AS n FROM cases WHERE service_type = 'consultation'`),
      db.execute(sql`
        SELECT case_number, count(*) AS cnt FROM cases
        GROUP BY case_number HAVING count(*) > 1`),
      db.execute(sql`
        SELECT service_type::text, count(*) AS cnt
        FROM cases GROUP BY service_type ORDER BY cnt DESC`),
    ]);
    report["1_cases_total"]          = total.rows?.[0];
    report["2_consultations_total"]  = consultations.rows?.[0];
    report["3_migrated_consultations"] = migrated.rows?.[0];
    report["4_duplicate_case_numbers"] = dupCheck.rows ?? [];
    report["5_service_type_distribution"] = dist.rows ?? [];
  } catch (err) {
    report["error"] = err instanceof Error ? err.message : String(err);
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Réponse HTML lisible dans le navigateur
  // ────────────────────────────────────────────────────────────────────────────
  const stepsHtml = steps.map(s => {
    const color = s.status === "ok" ? "#22c55e" : s.status === "skipped" ? "#94a3b8" : "#ef4444";
    const icon  = s.status === "ok" ? "✅" : s.status === "skipped" ? "⏭️" : "❌";
    return `<tr>
      <td style="padding:6px 12px;color:${color}">${icon} ${s.name}</td>
      <td style="padding:6px 12px;font-size:12px;color:#64748b">${s.detail ?? ""}</td>
    </tr>`;
  }).join("");

  res.send(`<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head><meta charset="utf-8"><title>Migration 0001</title>
<style>
  body { font-family: sans-serif; padding: 32px; background: #0f172a; color: #e2e8f0; }
  h1 { color: #38bdf8; } h2 { color: #94a3b8; margin-top: 32px; }
  table { border-collapse: collapse; width: 100%; }
  td, th { border: 1px solid #334155; padding: 6px 12px; text-align: right; }
  th { background: #1e293b; }
  pre { background: #1e293b; padding: 16px; border-radius: 8px; overflow-x: auto; font-size: 13px; }
</style></head>
<body>
<h1>Migration 0001 — Multi-types de dossiers</h1>
<h2>Étapes</h2>
<table>${stepsHtml}</table>
<h2>Rapport de vérification</h2>
<pre>${JSON.stringify(report, null, 2)}</pre>
</body></html>`);
});

export default router;
