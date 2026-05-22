import { pgEnum } from "drizzle-orm/pg-core";

export const serviceTypeEnum = pgEnum("service_type", [
  "lawsuit",
  "consultation",
  "contract",
  "company_creation",
  "debt_recovery",
  "legal_notice",
  "judgment_execution",
  "real_estate_file",
  "labor_file",
  "tax_file",
  "administrative",
  "mediation",
  "other",
]);

export type ServiceType = typeof serviceTypeEnum.enumValues[number];
