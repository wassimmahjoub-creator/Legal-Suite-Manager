-- ══════════════════════════════════════════════════════════════════════════════
-- Verification script for migration 0001
-- Run AFTER applying 0001_multi_type_files.sql
-- ══════════════════════════════════════════════════════════════════════════════

-- 1. Count cases before migration (should match prior total, excluding consultations)
SELECT 'cases_total' AS check_name, count(*) AS value FROM cases;

-- 2. Count consultations
SELECT 'consultations_total' AS check_name, count(*) AS value FROM consultations;

-- 3. Count migrated consultations in cases
SELECT 'cases_with_consultation_type' AS check_name, count(*) AS value
FROM cases WHERE service_type = 'consultation';

-- 4. Verify counts match (should return 0 rows if migration is correct)
SELECT 'migration_count_mismatch' AS check_name,
  (SELECT count(*) FROM consultations) - (SELECT count(*) FROM cases WHERE service_type = 'consultation') AS delta;

-- 5. No duplicate caseNumbers
SELECT case_number, count(*) AS cnt
FROM cases
GROUP BY case_number
HAVING count(*) > 1;

-- 6. All migrated consultations have valid client_id
SELECT 'consultations_without_valid_client' AS check_name, count(*) AS value
FROM cases
WHERE service_type = 'consultation'
  AND (client_id IS NULL OR client_id NOT IN (SELECT id FROM clients));

-- 7. Service type distribution
SELECT service_type, count(*) AS cnt FROM cases GROUP BY service_type ORDER BY cnt DESC;

-- 8. Sample migrated consultation
SELECT id, case_number, title, service_type, status, type_specific_data
FROM cases
WHERE service_type = 'consultation'
LIMIT 3;
