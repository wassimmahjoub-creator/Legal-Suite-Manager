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

// ── Migration 0002 — Tables manquantes (case_stages, case_events, legal_deadlines, conflict_checks, data_exports) ──
// URL : GET /api/admin/migrate-0002?secret=MIGRATION_SECRET
router.get("/admin/migrate-0002", async (req, res) => {
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

  const tableExists = async (t: string) => {
    const r = await db.execute(sql`SELECT 1 FROM information_schema.tables WHERE table_name=${t}`);
    return (r.rows?.length ?? 0) > 0;
  };

  // ── Compléter l'enum service_type (idempotent via IF NOT EXISTS) ──
  const serviceTypeValues = [
    "lawsuit", "consultation", "contract", "company_creation", "debt_recovery",
    "legal_notice", "judgment_execution", "real_estate_file", "labor_file",
    "tax_file", "administrative", "mediation", "other",
  ];
  for (const val of serviceTypeValues) {
    await run(
      `ADD VALUE service_type '${val}'`,
      `ALTER TYPE service_type ADD VALUE IF NOT EXISTS '${val}'`,
      async () => false, // IF NOT EXISTS rend déjà l'opération idempotente
    );
  }

  // ── case_stages ──
  await run(
    "CREATE TABLE case_stages",
    `CREATE TABLE case_stages (
      id            serial PRIMARY KEY,
      case_id       integer NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
      stage         text NOT NULL,
      entered_at    timestamptz NOT NULL DEFAULT now(),
      exited_at     timestamptz,
      court_id      integer REFERENCES courts(id),
      court_case_number text,
      decision_date date,
      decision_summary  text,
      decision_outcome  text,
      execution_status  text DEFAULT 'not_started',
      execution_notes   text,
      notes         text,
      created_by    integer REFERENCES users(id),
      created_at    timestamptz DEFAULT now()
    )`,
    () => tableExists("case_stages"),
  );

  // ── legal_deadlines ──
  await run(
    "CREATE TABLE legal_deadlines",
    `CREATE TABLE legal_deadlines (
      id                   serial PRIMARY KEY,
      case_id              integer NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
      case_stage_id        integer REFERENCES case_stages(id) ON DELETE CASCADE,
      deadline_type        text NOT NULL DEFAULT 'custom',
      name_ar              text NOT NULL,
      start_date           date NOT NULL,
      duration_days        integer NOT NULL,
      end_date             date,
      reminder_days_before integer DEFAULT 7,
      is_completed         boolean DEFAULT false,
      completed_at         timestamptz,
      completed_notes      text,
      created_at           timestamptz DEFAULT now(),
      created_by           integer REFERENCES users(id)
    )`,
    () => tableExists("legal_deadlines"),
  );

  // ── case_events ──
  await run(
    "CREATE TABLE case_events",
    `CREATE TABLE case_events (
      id                   serial PRIMARY KEY,
      case_id              integer NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
      event_type           text NOT NULL,
      occurred_at          timestamptz NOT NULL,
      logged_at            timestamptz DEFAULT now(),
      title_ar             text NOT NULL,
      title_fr             text,
      description          text,
      metadata             jsonb DEFAULT '{}',
      actor_user_id        integer REFERENCES users(id),
      related_entity_type  text,
      related_entity_id    integer,
      is_system_generated  boolean DEFAULT true,
      case_stage_id        integer,
      created_at           timestamptz DEFAULT now()
    )`,
    () => tableExists("case_events"),
  );

  // ── conflict_checks ──
  await run(
    "CREATE TABLE conflict_checks",
    `CREATE TABLE conflict_checks (
      id                       serial PRIMARY KEY,
      case_id                  integer NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
      conflict_type            text NOT NULL,
      conflicting_entity_type  text NOT NULL,
      conflicting_entity_id    integer NOT NULL,
      conflicting_entity_name  text,
      matched_on               text NOT NULL,
      match_score              numeric,
      other_case_id            integer REFERENCES cases(id),
      other_case_name          text,
      detected_at              timestamp DEFAULT now() NOT NULL,
      resolved                 boolean DEFAULT false NOT NULL,
      resolved_at              timestamp,
      resolved_by              integer REFERENCES users(id),
      resolution_justification text,
      created_at               timestamp DEFAULT now() NOT NULL
    )`,
    () => tableExists("conflict_checks"),
  );

  // ── data_exports ──
  await run(
    "CREATE TABLE data_exports",
    `CREATE TABLE data_exports (
      id                  serial PRIMARY KEY,
      requested_by        integer NOT NULL REFERENCES users(id),
      export_type         text NOT NULL,
      scope_id            integer,
      status              text NOT NULL DEFAULT 'pending',
      started_at          timestamp,
      completed_at        timestamp,
      file_path           text,
      file_size_bytes     bigint,
      download_token      text,
      download_expires_at timestamp,
      download_count      integer DEFAULT 0,
      error_message       text,
      created_at          timestamp NOT NULL DEFAULT now()
    )`,
    () => tableExists("data_exports"),
  );

  // ── Correction numérotation factures ──
  await run(
    "Corriger numéros de factures (F-YYYY-NNNN)",
    `UPDATE invoices
     SET invoice_number = 'F-' || to_char(created_at, 'YYYY') || '-' || lpad(CAST(id AS text), 4, '0')
     WHERE invoice_number IS NULL OR invoice_number NOT LIKE 'F-%'`,
    async () => false, // toujours vérifier
  );

  const stepsHtml = steps.map(s => {
    const color = s.status === "ok" ? "#22c55e" : s.status === "skipped" ? "#94a3b8" : "#ef4444";
    const icon  = s.status === "ok" ? "✅" : s.status === "skipped" ? "⏭️" : "❌";
    return `<tr><td style="padding:6px 12px;color:${color}">${icon} ${s.name}</td><td style="padding:6px 12px;font-size:12px;color:#64748b">${s.detail ?? ""}</td></tr>`;
  }).join("");

  res.send(`<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head><meta charset="utf-8"><title>Migration 0002</title>
<style>body{font-family:sans-serif;padding:32px;background:#0f172a;color:#e2e8f0}h1{color:#38bdf8}h2{color:#94a3b8;margin-top:32px}table{border-collapse:collapse;width:100%}td,th{border:1px solid #334155;padding:6px 12px;text-align:right}th{background:#1e293b}</style>
</head><body>
<h1>Migration 0002 — Tables manquantes</h1>
<h2>Étapes</h2>
<table>${stepsHtml}</table>
</body></html>`);
});

// ── Migration 0003 — Seed dossiers de démonstration (org_id=2) ──
// URL : GET /api/admin/migrate-0003?secret=MIGRATION_SECRET
router.get("/admin/migrate-0003", async (req, res) => {
  const secret = process.env["MIGRATION_SECRET"] ?? "migrate-legal-2026";
  if (req.query["secret"] !== secret) {
    return res.status(403).json({ error: "Token invalide." });
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

  // ── Clients manquants pour org_id=2 ──
  await run(
    "INSERT client — عميل تجريبي",
    `INSERT INTO clients (name, client_type, org_id, office_seq) VALUES ('عميل تجريبي', 'individual', 2, '2026/003') ON CONFLICT DO NOTHING`,
    async () => {
      const r = await db.execute(sql`SELECT 1 FROM clients WHERE name='عميل تجريبي' AND org_id=2`);
      return (r.rows?.length ?? 0) > 0;
    },
  );

  // ── Dossiers de démonstration ──
  await run(
    "INSERT dossiers de démonstration (13 dossiers)",
    `DO $$
DECLARE
  v_org integer := 2;
  v_c   integer := 1;
  v_cnt integer;
BEGIN
  SELECT COUNT(*) INTO v_cnt FROM cases WHERE org_id = v_org AND deleted_at IS NULL;
  IF v_cnt > 5 THEN
    RAISE NOTICE 'Already seeded';
    RETURN;
  END IF;

  INSERT INTO cases (title, client_id, status, court, lawyer, next_hearing, description,
    case_number, procedure_stage, court_case_number, opponent_name, opponent_lawyer,
    case_type, litigation_degree, procedure_type, case_priority, fee_method,
    agreed_fees, hourly_rate, percentage, percentage_basis, dispute_value,
    client_source, judge_name, first_hearing_date, opened_at, confidentiality_level,
    internal_notes, org_id, service_type, type_specific_data)
  VALUES
    ('دعوى مدنية — استرداد مبالغ مالية', v_c, 'active', 'المحكمة الابتدائية بتونس', 'المحامي أحمد بن سالم', '2026-06-15',
     'نزاع حول استرداد مبالغ مدفوعة مقابل عقار لم يُسلَّم في الأجل المتفق عليه',
     '2026-0006', 'ابتدائي', '2026/154', 'شركة النور للتجارة', 'المحامي خالد المنصوري',
     'civil', 'first_instance', 'main_action', 'important', 'fixed',
     4500.000, NULL, NULL, NULL, 35000.000,
     'referral', 'القاضي محمد الكريمي', '2026-03-10', '2026-03-01', 'normal',
     'ملف ذو أولوية — الموكّل ينتظر استرداد عربون عقاري', v_org, 'lawsuit', '{}'),

    ('ملف عقاري — تسوية رسم عقاري', v_c, 'active', 'المحكمة العقارية بتونس', 'المحامية فاطمة الزواري', '2026-07-03',
     'نزاع في رسم عقاري — قطعة أرضية بالمرسى، مساحة 450م²، مطعون في الحدود',
     '2026-0007', 'ابتدائي', '2026/ع/88', 'ورثة بن علي', NULL,
     'real_estate', 'first_instance', 'main_action', 'normal', 'percentage',
     NULL, NULL, 2.50, 'قيمة العقار', 180000.000,
     'google', 'القاضية سامية بلحاج', '2026-04-20', '2026-04-05', 'confidential',
     NULL, v_org, 'real_estate_file', '{}'),

    ('ملف شغل — إعادة إدماج موكّل مُطرود', v_c, 'active', 'المحكمة الابتدائية بصفاقس', 'المحامي رضا الحمامي', '2026-06-22',
     'طرد تعسفي — موكّل أُعفي من منصبه دون إشعار مسبق ودون استيفاء حقوقه القانونية',
     '2026-0008', 'ابتدائي', '2026/ش/42', 'مؤسسة البناء الحديث', 'المحامية نور الهدى',
     'labor', 'first_instance', 'main_action', 'urgent', 'fixed',
     3200.000, NULL, NULL, NULL, 28000.000,
     'returning_client', 'القاضي توفيق السعداوي', '2026-02-14', '2026-02-01', 'normal',
     NULL, v_org, 'labor_file', '{}'),

    ('ملف جبائي — طعن في مراجعة ضريبية', v_c, 'active', 'المحكمة الإدارية بتونس', 'المحامية لمياء الشابي', '2026-08-10',
     'طعن في قرار مراجعة جبائية — مبالغ مطالب بها 95.000 دينار',
     '2026-0009', 'ابتدائي', NULL, 'المديرية العامة للضرائب', NULL,
     'tax', 'first_instance', 'appeal', 'urgent', 'hourly',
     NULL, 200.000, NULL, NULL, 95000.000,
     'partner', NULL, NULL, '2026-01-15', 'sensitive',
     NULL, v_org, 'tax_file', '{}'),

    ('تنفيذ حكم — استخلاص تعويض', v_c, 'active', 'كتابة الجلسات — محكمة تونس', 'المحامي بلحسن الغربي', NULL,
     'تنفيذ حكم نهائي بالتعويض — المدّعى عليه يماطل في التسديد منذ 3 أشهر',
     '2026-0010', 'ابتدائي', NULL, 'شركة التأمين الوطنية', 'المحامي سامي النفاتي',
     NULL, NULL, NULL, 'important', 'percentage',
     NULL, NULL, 10.00, 'المبالغ المستخلصة', 42000.000,
     NULL, NULL, NULL, '2026-03-20', 'normal',
     NULL, v_org, 'judgment_execution', '{}'),

    ('إنذار — مطالبة بالإخلاء', v_c, 'active', 'كتابة الجلسات الاستعجالية', 'المحامية إيمان بن يوسف', NULL,
     'إنذار بالإخلاء لعدم دفع الكراء منذ 6 أشهر — عقار بالمنار',
     '2026-0011', 'ابتدائي', NULL, 'المستأجر مراد الحاج', NULL,
     NULL, NULL, NULL, 'important', 'fixed',
     800.000, NULL, NULL, NULL, NULL,
     NULL, NULL, NULL, '2026-05-10', 'normal',
     NULL, v_org, 'legal_notice', '{}'),

    ('ملف إداري — طعن في قرار سحب الترخيص', v_c, 'active', 'المحكمة الإدارية بتونس', 'المحامي وليد المسعدي', '2026-09-05',
     'طعن في قرار إداري بسحب الترخيص التجاري — المنشأة تعمل منذ 12 سنة',
     '2026-0012', 'ابتدائي', NULL, 'وزارة الشغل', NULL,
     'administrative', 'first_instance', 'opposition', 'normal', 'fixed',
     2800.000, NULL, NULL, NULL, NULL,
     NULL, NULL, NULL, '2026-02-20', 'normal',
     NULL, v_org, 'administrative', '{}'),

    ('وساطة — نزاع بين شركاء', v_c, 'active', NULL, 'المحامي عماد بن صالح', NULL,
     'وساطة بين شريكين في شركة ذات مسؤولية محدودة — خلاف حول توزيع الأرباح',
     '2026-0013', 'ابتدائي', NULL, 'الشريك حسام الطرابلسي', NULL,
     NULL, NULL, NULL, 'normal', 'hourly',
     NULL, 250.000, NULL, NULL, 75000.000,
     NULL, NULL, NULL, '2026-04-01', 'confidential',
     NULL, v_org, 'mediation', '{}'),

    ('استشارة — هيكلة عقد شراكة', v_c, 'active', NULL, 'المحامية سلمى القاسمي', NULL,
     'استشارة قانونية حول هيكلة عقد شراكة بين شركتين — مراجعة البنود والضمانات',
     '2026-0014', 'ابتدائي', NULL, NULL, NULL,
     NULL, NULL, NULL, 'normal', 'fixed',
     1500.000, NULL, NULL, NULL, NULL,
     NULL, NULL, NULL, '2026-05-05', 'normal',
     NULL, v_org, 'consultation', '{}'),

    ('تحرير عقد — عقد مقاولة كبرى', v_c, 'active', NULL, 'المحامي كمال بوعزيزي', NULL,
     'صياغة عقد مقاولة لأشغال بناء — قيمة المشروع 1.2 مليون دينار',
     '2026-0015', 'ابتدائي', NULL, 'شركة الإنشاءات الحديثة', NULL,
     NULL, NULL, NULL, 'normal', 'fixed',
     2200.000, NULL, NULL, NULL, NULL,
     NULL, NULL, NULL, '2026-03-15', 'normal',
     NULL, v_org, 'contract', '{}'),

    ('تأسيس شركة — شركة ذ.م.م تجارية', v_c, 'active', NULL, 'المحامي أنيس العيّاري', NULL,
     'تأسيس شركة ذات مسؤولية محدودة في قطاع التجارة الإلكترونية — رأس مال 50.000 دينار',
     '2026-0016', 'ابتدائي', NULL, NULL, NULL,
     NULL, NULL, NULL, 'normal', 'fixed',
     3500.000, NULL, NULL, NULL, NULL,
     NULL, NULL, NULL, '2026-05-12', 'normal',
     NULL, v_org, 'company_creation', '{}'),

    ('استخلاص ديون — فواتير متأخرة', v_c, 'active', NULL, 'المحامية ريم بن عيسى', NULL,
     'استخلاص مبالغ مالية متأخرة — فواتير غير مسددة منذ 14 شهراً',
     '2026-0017', 'ابتدائي', NULL, 'مؤسسة الأمل للصناعة', 'المحامي زياد الرمضاني',
     NULL, NULL, NULL, 'urgent', 'percentage',
     NULL, NULL, 15.00, 'المبالغ المستخلصة', 67000.000,
     NULL, NULL, NULL, '2026-01-10', 'normal',
     NULL, v_org, 'debt_recovery', '{}'),

    ('ملف متنوع — متابعة خبرة قضائية', v_c, 'active', 'المحكمة الابتدائية ببنزرت', 'المحامي هشام التليلي', NULL,
     'متابعة خبرة قضائية أُذن بها في إطار نزاع عقاري — تقييم قيمة العقار',
     '2026-0018', 'ابتدائي', NULL, NULL, NULL,
     NULL, NULL, NULL, 'normal', 'fixed',
     1800.000, NULL, NULL, NULL, NULL,
     NULL, NULL, NULL, '2026-04-18', 'normal',
     NULL, v_org, 'other', '{}');
END;
$$`,
    async () => {
      const r = await db.execute(sql`SELECT COUNT(*) AS n FROM cases WHERE org_id=2 AND deleted_at IS NULL`);
      const n = Number((r.rows?.[0] as Record<string, unknown>)?.n ?? 0);
      return n > 5;
    },
  );

  const report: Record<string, unknown> = {};
  try {
    const total = await db.execute(sql`SELECT COUNT(*) AS n FROM cases WHERE org_id=2 AND deleted_at IS NULL`);
    report["cases_org2"] = (total.rows?.[0] as Record<string, unknown>)?.n;
  } catch (err) {
    report["error"] = err instanceof Error ? err.message : String(err);
  }

  const stepsHtml = steps.map(s => {
    const color = s.status === "ok" ? "#22c55e" : s.status === "skipped" ? "#94a3b8" : "#ef4444";
    const icon  = s.status === "ok" ? "✅" : s.status === "skipped" ? "⏭️" : "❌";
    return `<tr><td style="padding:6px 12px;color:${color}">${icon} ${s.name}</td><td style="padding:6px 12px;font-size:12px;color:#64748b">${s.detail ?? ""}</td></tr>`;
  }).join("");

  res.send(`<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head><meta charset="utf-8"><title>Migration 0003</title>
<style>body{font-family:sans-serif;padding:32px;background:#0f172a;color:#e2e8f0}h1{color:#f59e0b}h2{color:#94a3b8;margin-top:32px}table{border-collapse:collapse;width:100%}td,th{border:1px solid #334155;padding:6px 12px;text-align:right}th{background:#1e293b}pre{background:#1e293b;padding:16px;border-radius:8px;overflow-x:auto;font-size:13px}</style>
</head><body>
<h1>Migration 0003 — Dossiers de démonstration</h1>
<h2>Étapes</h2>
<table>${stepsHtml}</table>
<h2>Résultat</h2>
<pre>${JSON.stringify(report, null, 2)}</pre>
</body></html>`);
});

export default router;

