-- ══════════════════════════════════════════════════════════════════════════════
-- Migration 0001 — Multi-type files: service_type, contracts, company_files,
--                  debt_recovery_files, consultation migration
-- ══════════════════════════════════════════════════════════════════════════════

BEGIN;

-- ─── 1. service_type enum ────────────────────────────────────────────────────

CREATE TYPE service_type AS ENUM (
  'lawsuit', 'consultation', 'contract', 'company_creation', 'debt_recovery',
  'legal_notice', 'judgment_execution', 'real_estate_file', 'labor_file',
  'tax_file', 'administrative', 'mediation', 'other'
);

-- ─── 2. Add columns to cases ──────────────────────────────────────────────────

ALTER TABLE cases
  ADD COLUMN service_type service_type NOT NULL DEFAULT 'lawsuit',
  ADD COLUMN type_specific_data jsonb DEFAULT '{}';

-- ─── 3. contract_type enum ───────────────────────────────────────────────────

CREATE TYPE contract_type AS ENUM (
  'sale', 'rental', 'service', 'employment', 'partnership',
  'loan', 'guarantee', 'agency', 'franchise', 'other'
);

CREATE TYPE contract_status AS ENUM (
  'draft', 'under_review', 'ready_to_sign', 'signed', 'expired', 'terminated'
);

-- ─── 4. contracts table ───────────────────────────────────────────────────────

CREATE TABLE contracts (
  id                serial PRIMARY KEY,
  case_id           integer NOT NULL UNIQUE REFERENCES cases(id) ON DELETE CASCADE,
  contract_type     contract_type NOT NULL DEFAULT 'other',
  party_one_name    text,
  party_one_tax_id  text,
  party_two_name    text,
  party_two_tax_id  text,
  contract_value    numeric(14,3),
  contract_currency text NOT NULL DEFAULT 'TND',
  status            contract_status NOT NULL DEFAULT 'draft',
  start_date        date,
  end_date          date,
  signing_date      date,
  notes             text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX contracts_case_idx ON contracts(case_id);

CREATE TABLE contract_versions (
  id              serial PRIMARY KEY,
  contract_id     integer NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  version_number  integer NOT NULL,
  document_id     integer,
  notes           text,
  created_by      integer,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE(contract_id, version_number)
);

-- ─── 5. company_type enum ─────────────────────────────────────────────────────

CREATE TYPE company_type AS ENUM (
  'sarl', 'suarl', 'sa', 'single_person_company', 'other'
);

-- ─── 6. company_files tables ─────────────────────────────────────────────────

CREATE TABLE company_files (
  id                serial PRIMARY KEY,
  case_id           integer NOT NULL UNIQUE REFERENCES cases(id) ON DELETE CASCADE,
  company_type      company_type NOT NULL DEFAULT 'sarl',
  proposed_name     text,
  capital           numeric(14,3),
  activity          text,
  tax_id            text,
  rne_number        text,
  procedure_status  text,
  notes             text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX company_files_case_idx ON company_files(case_id);

CREATE TABLE company_partners (
  id                serial PRIMARY KEY,
  company_file_id   integer NOT NULL REFERENCES company_files(id) ON DELETE CASCADE,
  partner_name      text NOT NULL,
  partner_tax_id    text,
  shares_percentage numeric(5,2),
  position          text,
  position_order    integer DEFAULT 0,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE company_creation_steps (
  id               serial PRIMARY KEY,
  company_file_id  integer NOT NULL REFERENCES company_files(id) ON DELETE CASCADE,
  step_name_ar     text NOT NULL,
  step_order       integer NOT NULL,
  is_completed     integer NOT NULL DEFAULT 0,
  completed_at     timestamptz,
  notes            text,
  created_at       timestamptz NOT NULL DEFAULT now()
);

-- ─── 7. debt_stage enum ──────────────────────────────────────────────────────

CREATE TYPE debt_stage AS ENUM (
  'notice', 'negotiation', 'lawsuit', 'execution', 'completed'
);

-- ─── 8. debt_recovery tables ─────────────────────────────────────────────────

CREATE TABLE debt_recovery_files (
  id                serial PRIMARY KEY,
  case_id           integer NOT NULL UNIQUE REFERENCES cases(id) ON DELETE CASCADE,
  debtor_name       text NOT NULL,
  debtor_tax_id     text,
  debtor_phone      text,
  debtor_address    text,
  debt_amount       numeric(14,3) NOT NULL,
  recovered_amount  numeric(14,3) NOT NULL DEFAULT 0,
  debt_reason       text,
  due_date          date,
  current_stage     debt_stage NOT NULL DEFAULT 'notice',
  notes             text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX debt_recovery_case_idx ON debt_recovery_files(case_id);

CREATE TABLE debt_recovery_payments (
  id                      serial PRIMARY KEY,
  debt_recovery_file_id   integer NOT NULL REFERENCES debt_recovery_files(id) ON DELETE CASCADE,
  received_at             timestamptz NOT NULL,
  amount                  numeric(14,3) NOT NULL,
  payment_method          text,
  reference               text,
  notes                   text,
  recorded_by             integer,
  created_at              timestamptz NOT NULL DEFAULT now()
);

-- ─── 9. Migrate consultations → cases ────────────────────────────────────────
-- Maps each consultation to a new case with service_type='consultation'.
-- caseNumber generated as YYYY-NNNN per org, continuing from existing sequence.
-- Status mapping: done→closed, cancelled→archived, pending→active
-- org_id resolved via clients table.

DO $$
DECLARE
  rec          RECORD;
  v_org_id     integer;
  v_year       text;
  v_count      integer;
  v_case_number text;
  v_status     text;
BEGIN
  FOR rec IN
    SELECT
      c.id,
      c.client_id,
      c.subject,
      c.date,
      c.amount,
      c.status,
      c.notes,
      c.created_at,
      cl.org_id
    FROM consultations c
    LEFT JOIN clients cl ON cl.id = c.client_id
    WHERE cl.org_id IS NOT NULL
    ORDER BY c.date ASC, c.id ASC
  LOOP
    v_org_id := rec.org_id;
    v_year   := to_char(COALESCE(rec.date::date, CURRENT_DATE), 'YYYY');

    -- Count existing cases for this org+year (same logic as the Node.js route)
    SELECT count(*)::int INTO v_count
    FROM cases
    WHERE org_id = v_org_id
      AND case_number LIKE (v_year || '-%');

    v_case_number := v_year || '-' || lpad((v_count + 1)::text, 4, '0');

    -- Map status
    v_status := CASE rec.status
      WHEN 'done'      THEN 'closed'
      WHEN 'cancelled' THEN 'archived'
      ELSE                  'active'
    END;

    INSERT INTO cases (
      case_number,
      title,
      org_id,
      client_id,
      status,
      service_type,
      opened_at,
      type_specific_data,
      created_at
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
$$;

COMMIT;
