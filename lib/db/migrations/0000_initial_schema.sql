CREATE TYPE "public"."client_event_type" AS ENUM('case_created', 'invoice_issued', 'payment_received', 'document_signed', 'message_sent', 'note_added');--> statement-breakpoint
CREATE TYPE "public"."court_type" AS ENUM('cassation', 'appel', 'premiere_instance', 'cantonal', 'administratif', 'immobilier', 'prudhommes', 'autre');--> statement-breakpoint
CREATE TABLE "clients" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" integer NOT NULL,
	"name" text NOT NULL,
	"client_type" text DEFAULT 'individual',
	"legal_form" text,
	"phone" text,
	"email" text,
	"address" text,
	"cin" text,
	"tax_id" text,
	"commercial_register" text,
	"rib" text,
	"withholding_rate" numeric DEFAULT '0',
	"withholding_exempt" boolean DEFAULT false,
	"office_seq" text,
	"notes" text,
	"deleted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "client_contacts" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text DEFAULT '',
	"role" text,
	"phone" text,
	"email" text,
	"is_primary" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE "client_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"event_type" "client_event_type" NOT NULL,
	"payload" jsonb,
	"occurred_at" timestamp DEFAULT now() NOT NULL,
	"created_by" text
);
--> statement-breakpoint
CREATE TABLE "cases" (
	"id" serial PRIMARY KEY NOT NULL,
	"case_number" text,
	"court_case_number" text,
	"client_file_ref" text,
	"office_ref" text,
	"title" text NOT NULL,
	"org_id" integer NOT NULL,
	"client_id" integer NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"court" text,
	"division" text,
	"lawyer" text,
	"next_hearing" date,
	"opponent_name" text,
	"opponent_lawyer" text,
	"judgment_text" text,
	"description" text,
	"notes" text,
	"procedure_stage" text DEFAULT 'ابتدائي',
	"case_type" text,
	"litigation_degree" text,
	"procedure_type" text,
	"case_priority" text DEFAULT 'normal',
	"fee_method" text,
	"agreed_fees" numeric(12, 3),
	"hourly_rate" numeric(12, 3),
	"percentage" numeric(5, 2),
	"percentage_basis" text,
	"dispute_value" numeric(14, 3),
	"client_source" text,
	"judge_name" text,
	"first_hearing_date" date,
	"opened_at" date,
	"confidentiality_level" text DEFAULT 'normal',
	"internal_notes" text,
	"draft_data" text,
	"draft_last_step" integer DEFAULT 1,
	"archived_at" timestamp,
	"deleted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" integer NOT NULL,
	"invoice_number" text,
	"client_id" integer NOT NULL,
	"case_id" integer,
	"issue_date" date,
	"due_date" date,
	"status" text DEFAULT 'draft' NOT NULL,
	"subtotal_ht" numeric(12, 3) DEFAULT '0' NOT NULL,
	"vat_total" numeric(12, 3) DEFAULT '0' NOT NULL,
	"stamp_duty" numeric(12, 3) DEFAULT '1.000' NOT NULL,
	"withholding_tax" numeric(12, 3) DEFAULT '0' NOT NULL,
	"total_ttc" numeric(12, 3) DEFAULT '0' NOT NULL,
	"net_to_pay" numeric(12, 3) DEFAULT '0' NOT NULL,
	"amount_paid" numeric(12, 3) DEFAULT '0' NOT NULL,
	"balance_due" numeric(12, 3) DEFAULT '0' NOT NULL,
	"payment_terms" text,
	"notes" text,
	"locked_at" timestamp,
	"cancelled_by_invoice_id" integer,
	"deleted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "invoices_invoice_number_unique" UNIQUE("invoice_number")
);
--> statement-breakpoint
CREATE TABLE "invoice_lines" (
	"id" serial PRIMARY KEY NOT NULL,
	"invoice_id" integer NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"description" text NOT NULL,
	"unit" text DEFAULT 'forfait',
	"quantity" numeric(12, 3) DEFAULT '1' NOT NULL,
	"unit_price_ht" numeric(12, 3) DEFAULT '0' NOT NULL,
	"vat_rate" numeric(5, 2) DEFAULT '19' NOT NULL,
	"line_total_ht" numeric(12, 3) DEFAULT '0' NOT NULL,
	"line_vat" numeric(12, 3) DEFAULT '0' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoice_counters" (
	"year" integer PRIMARY KEY NOT NULL,
	"last_number" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cabinet_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"cabinet_name" text,
	"cabinet_tax_id" text,
	"cabinet_rib" text,
	"cabinet_rc" text,
	"cabinet_address" text,
	"cabinet_phone" text,
	"cabinet_email" text,
	"default_payment_terms" text,
	"invoice_footer_ar" text,
	"invoice_footer_fr" text,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"case_id" integer,
	"done" boolean DEFAULT false NOT NULL,
	"due_date" date,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" integer NOT NULL,
	"title" text NOT NULL,
	"case_id" integer,
	"date" date NOT NULL,
	"time" text,
	"location" text,
	"court" text,
	"division" text,
	"type" text DEFAULT 'other' NOT NULL,
	"objective" text,
	"result" text,
	"legal_status" text,
	"postponed_to" date,
	"notes" text,
	"duration" integer DEFAULT 60,
	"user_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"case_id" integer,
	"file_type" text,
	"url" text,
	"deleted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"conversation_id" integer NOT NULL,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"name" text NOT NULL,
	"role" text DEFAULT 'lawyer' NOT NULL,
	"phone" text,
	"status" text DEFAULT 'active' NOT NULL,
	"org_id" integer NOT NULL,
	"permissions" jsonb,
	"ical_token" text,
	"preferred_locale" text DEFAULT 'ar',
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_ical_token_unique" UNIQUE("ical_token")
);
--> statement-breakpoint
CREATE TABLE "opponents" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"lawyer_name" text,
	"phone" text,
	"address" text,
	"notes" text,
	"case_id" integer,
	"capacity" text,
	"opponent_lawyer_phone" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "consultations" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer,
	"subject" text NOT NULL,
	"date" date NOT NULL,
	"amount" numeric(12, 2),
	"status" text DEFAULT 'pending' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"type" text DEFAULT 'أخرى' NOT NULL,
	"content" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "courts" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"name_ar" text,
	"name_fr" text,
	"type" "court_type" DEFAULT 'premiere_instance',
	"parent_court_id" integer,
	"governorate" text,
	"division" text,
	"city" text,
	"address" text,
	"phone" text,
	"notes" text,
	"chambers" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "procedures" (
	"id" serial PRIMARY KEY NOT NULL,
	"case_id" integer NOT NULL,
	"stage" text DEFAULT 'ابتدائي' NOT NULL,
	"status" text DEFAULT 'جارية' NOT NULL,
	"notes" text,
	"started_at" date,
	"ended_at" date,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "deadlines" (
	"id" serial PRIMARY KEY NOT NULL,
	"case_id" integer NOT NULL,
	"title" text NOT NULL,
	"type" text DEFAULT 'custom' NOT NULL,
	"due_date" date NOT NULL,
	"reminder_date" date,
	"urgency" text DEFAULT 'normal' NOT NULL,
	"notes" text,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "legal_config_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"category" text NOT NULL,
	"value" text NOT NULL,
	"label" text NOT NULL,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "case_teams" (
	"id" serial PRIMARY KEY NOT NULL,
	"case_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"role" text DEFAULT 'مساعد' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "communications" (
	"id" serial PRIMARY KEY NOT NULL,
	"case_id" integer,
	"client_id" integer,
	"type" text DEFAULT 'call' NOT NULL,
	"date" date NOT NULL,
	"summary" text NOT NULL,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "insurance_companies" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"phone" text,
	"email" text,
	"address" text,
	"contact_person" text,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bank_accounts" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"account_number" text,
	"bank_name" text,
	"balance" numeric(14, 3) DEFAULT '0',
	"currency" text DEFAULT 'TND',
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" integer,
	"action" text NOT NULL,
	"old_value" text,
	"new_value" text,
	"user_id" integer,
	"user_name" text,
	"ip_address" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "case_relations" (
	"id" serial PRIMARY KEY NOT NULL,
	"case_id" integer NOT NULL,
	"related_case_id" integer NOT NULL,
	"relation_type" text DEFAULT 'مرتبطة' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "confidential_notes" (
	"id" serial PRIMARY KEY NOT NULL,
	"case_id" integer NOT NULL,
	"content" text NOT NULL,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "correspondances" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"case_id" integer,
	"type" text DEFAULT 'letter' NOT NULL,
	"direction" text DEFAULT 'outgoing' NOT NULL,
	"date" date NOT NULL,
	"subject" text NOT NULL,
	"content" text,
	"reference" text,
	"status" text DEFAULT 'sent' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"owner_id" integer,
	"subscription_plan" text DEFAULT 'solo' NOT NULL,
	"subscription_status" text DEFAULT 'trial' NOT NULL,
	"billing_cycle" text DEFAULT 'monthly' NOT NULL,
	"trial_start_date" timestamp DEFAULT now() NOT NULL,
	"trial_end_date" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "expenses" (
	"id" serial PRIMARY KEY NOT NULL,
	"case_id" integer NOT NULL,
	"date" date NOT NULL,
	"type_value" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"amount" numeric(12, 3) NOT NULL,
	"reimbursable" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invitations" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" integer NOT NULL,
	"email" text NOT NULL,
	"role" text DEFAULT 'lawyer' NOT NULL,
	"token" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"invited_by" integer NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "invitations_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "password_resets" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"used_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "password_resets_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "billing_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" integer NOT NULL,
	"amount" text NOT NULL,
	"currency" text DEFAULT 'TND' NOT NULL,
	"description" text NOT NULL,
	"status" text DEFAULT 'paid' NOT NULL,
	"billing_cycle" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "case_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"case_id" integer NOT NULL,
	"event_type" text NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"logged_at" timestamp with time zone DEFAULT now(),
	"title_ar" text NOT NULL,
	"title_fr" text,
	"description" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"actor_user_id" integer,
	"related_entity_type" text,
	"related_entity_id" integer,
	"is_system_generated" boolean DEFAULT true,
	"case_stage_id" integer,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "case_stages" (
	"id" serial PRIMARY KEY NOT NULL,
	"case_id" integer NOT NULL,
	"stage" text NOT NULL,
	"entered_at" timestamp with time zone DEFAULT now() NOT NULL,
	"exited_at" timestamp with time zone,
	"court_id" integer,
	"court_case_number" text,
	"decision_date" date,
	"decision_summary" text,
	"decision_outcome" text,
	"execution_status" text DEFAULT 'not_started',
	"execution_notes" text,
	"notes" text,
	"created_by" integer,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "legal_deadlines" (
	"id" serial PRIMARY KEY NOT NULL,
	"case_id" integer NOT NULL,
	"case_stage_id" integer,
	"deadline_type" text DEFAULT 'custom' NOT NULL,
	"name_ar" text NOT NULL,
	"start_date" date NOT NULL,
	"duration_days" integer NOT NULL,
	"end_date" date,
	"reminder_days_before" integer DEFAULT 7,
	"is_completed" boolean DEFAULT false,
	"completed_at" timestamp with time zone,
	"completed_notes" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"created_by" integer
);
--> statement-breakpoint
CREATE TABLE "conflict_checks" (
	"id" serial PRIMARY KEY NOT NULL,
	"case_id" integer NOT NULL,
	"conflict_type" text NOT NULL,
	"conflicting_entity_type" text NOT NULL,
	"conflicting_entity_id" integer NOT NULL,
	"conflicting_entity_name" text,
	"matched_on" text NOT NULL,
	"match_score" numeric,
	"other_case_id" integer,
	"other_case_name" text,
	"detected_at" timestamp DEFAULT now() NOT NULL,
	"resolved" boolean DEFAULT false NOT NULL,
	"resolved_at" timestamp,
	"resolved_by" integer,
	"resolution_justification" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "data_exports" (
	"id" serial PRIMARY KEY NOT NULL,
	"requested_by" integer NOT NULL,
	"export_type" text NOT NULL,
	"scope_id" integer,
	"status" text DEFAULT 'pending' NOT NULL,
	"started_at" timestamp,
	"completed_at" timestamp,
	"file_path" text,
	"file_size_bytes" bigint,
	"download_token" text,
	"download_expires_at" timestamp,
	"download_count" integer DEFAULT 0,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "clients" ADD CONSTRAINT "clients_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_contacts" ADD CONSTRAINT "client_contacts_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_events" ADD CONSTRAINT "client_events_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cases" ADD CONSTRAINT "cases_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cases" ADD CONSTRAINT "cases_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_lines" ADD CONSTRAINT "invoice_lines_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opponents" ADD CONSTRAINT "opponents_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consultations" ADD CONSTRAINT "consultations_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "procedures" ADD CONSTRAINT "procedures_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deadlines" ADD CONSTRAINT "deadlines_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_teams" ADD CONSTRAINT "case_teams_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_teams" ADD CONSTRAINT "case_teams_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "communications" ADD CONSTRAINT "communications_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "communications" ADD CONSTRAINT "communications_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_relations" ADD CONSTRAINT "case_relations_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_relations" ADD CONSTRAINT "case_relations_related_case_id_cases_id_fk" FOREIGN KEY ("related_case_id") REFERENCES "public"."cases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "confidential_notes" ADD CONSTRAINT "confidential_notes_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "correspondances" ADD CONSTRAINT "correspondances_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "correspondances" ADD CONSTRAINT "correspondances_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_events" ADD CONSTRAINT "case_events_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_events" ADD CONSTRAINT "case_events_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_stages" ADD CONSTRAINT "case_stages_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_stages" ADD CONSTRAINT "case_stages_court_id_courts_id_fk" FOREIGN KEY ("court_id") REFERENCES "public"."courts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_stages" ADD CONSTRAINT "case_stages_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "legal_deadlines" ADD CONSTRAINT "legal_deadlines_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "legal_deadlines" ADD CONSTRAINT "legal_deadlines_case_stage_id_case_stages_id_fk" FOREIGN KEY ("case_stage_id") REFERENCES "public"."case_stages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "legal_deadlines" ADD CONSTRAINT "legal_deadlines_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conflict_checks" ADD CONSTRAINT "conflict_checks_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conflict_checks" ADD CONSTRAINT "conflict_checks_other_case_id_cases_id_fk" FOREIGN KEY ("other_case_id") REFERENCES "public"."cases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conflict_checks" ADD CONSTRAINT "conflict_checks_resolved_by_users_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_exports" ADD CONSTRAINT "data_exports_requested_by_users_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "clients_org_deleted_idx" ON "clients" USING btree ("org_id","deleted_at");--> statement-breakpoint
CREATE INDEX "clients_org_created_idx" ON "clients" USING btree ("org_id","created_at");--> statement-breakpoint
CREATE INDEX "cases_org_status_idx" ON "cases" USING btree ("org_id","status","deleted_at");--> statement-breakpoint
CREATE INDEX "cases_org_client_idx" ON "cases" USING btree ("org_id","client_id");--> statement-breakpoint
CREATE INDEX "cases_org_created_idx" ON "cases" USING btree ("org_id","created_at");--> statement-breakpoint
CREATE INDEX "invoices_org_status_idx" ON "invoices" USING btree ("org_id","status","deleted_at");--> statement-breakpoint
CREATE INDEX "invoices_org_client_idx" ON "invoices" USING btree ("org_id","client_id");--> statement-breakpoint
CREATE INDEX "events_org_date_idx" ON "events" USING btree ("org_id","date");