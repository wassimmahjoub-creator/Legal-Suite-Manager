import { db, caseEventsTable } from "@workspace/db";
import { logger } from "../lib/logger.js";

export type CaseEventType =
  | "case_filed" | "case_updated" | "client_added" | "opponent_added" | "opponent_removed"
  | "team_member_added" | "team_member_removed" | "responsible_changed"
  | "hearing_scheduled" | "hearing_held" | "hearing_postponed"
  | "judgment_recorded" | "stage_transitioned"
  | "document_added" | "document_removed"
  | "invoice_issued" | "invoice_paid" | "invoice_partially_paid" | "payment_received"
  | "expense_recorded" | "time_entry_logged"
  | "legal_deadline_added" | "legal_deadline_approaching" | "legal_deadline_missed"
  | "confidentiality_changed" | "internal_note_added"
  | "case_archived" | "case_closed" | "case_reopened"
  | "manual_entry";

export type RelatedEntityType =
  | "invoice" | "document" | "hearing" | "payment" | "opponent"
  | "team_member" | "expense" | "time_entry" | "legal_deadline";

const DEFAULT_TITLES: Record<string, (m: Record<string, unknown>) => string> = {
  case_filed:                () => "تم رفع الدعوى",
  case_updated:              () => "تم تعديل بيانات الملف",
  opponent_added:            (m) => `إضافة الخصم ${m.opponent_name ?? ""}`,
  opponent_removed:          (m) => `إزالة الخصم ${m.opponent_name ?? ""}`,
  team_member_added:         (m) => `إضافة ${m.user_name ?? ""} للفريق`,
  team_member_removed:       (m) => `إزالة ${m.user_name ?? ""} من الفريق`,
  responsible_changed:       (m) => `تعيين ${m.user_name ?? ""} كمحامي مسؤول`,
  hearing_scheduled:         () => "برمجة جلسة",
  hearing_held:              () => "انعقاد الجلسة",
  hearing_postponed:         () => "تأخير الجلسة",
  judgment_recorded:         () => "تسجيل حكم",
  stage_transitioned:        (m) => `الانتقال إلى الطور ${m.new_stage_ar ?? ""}`,
  document_added:            (m) => `إضافة وثيقة: ${m.document_name ?? ""}`,
  document_removed:          (m) => `حذف وثيقة: ${m.document_name ?? ""}`,
  invoice_issued:            (m) => `إصدار الفاتورة ${m.invoice_number ?? ""}`,
  invoice_paid:              (m) => `تسديد الفاتورة ${m.invoice_number ?? ""}`,
  invoice_partially_paid:    (m) => `تسديد جزئي للفاتورة ${m.invoice_number ?? ""}`,
  payment_received:          (m) => `استلام دفعة ${m.amount ?? ""} د.ت`,
  expense_recorded:          (m) => `تسجيل مصروف ${m.amount ?? ""} د.ت`,
  time_entry_logged:         (m) => `تسجيل ${m.hours ?? ""} ساعة عمل`,
  legal_deadline_added:      (m) => `إضافة أجل قانوني: ${m.deadline_name ?? ""}`,
  legal_deadline_approaching:(m) => `اقتراب أجل قانوني: ${m.deadline_name ?? ""}`,
  legal_deadline_missed:     (m) => `فوات أجل قانوني: ${m.deadline_name ?? ""}`,
  confidentiality_changed:   (m) => `تغيير درجة الحساسية إلى ${m.new_level_ar ?? ""}`,
  internal_note_added:       () => "تحديث الملاحظات الداخلية",
  case_archived:             () => "أرشفة الملف",
  case_closed:               () => "غلق الملف",
  case_reopened:             () => "إعادة فتح الملف",
  manual_entry:              (m) => String(m.custom_title ?? "إجراء يدوي"),
};

interface LogParams {
  caseId: number;
  eventType: CaseEventType;
  occurredAt?: Date;
  titleAr?: string;
  titleFr?: string;
  description?: string;
  metadata?: Record<string, unknown>;
  actorUserId?: number | null;
  relatedEntityType?: RelatedEntityType | null;
  relatedEntityId?: number | null;
  isSystemGenerated?: boolean;
}

export class CaseEventLogger {
  static async log(params: LogParams): Promise<void> {
    try {
      const {
        caseId, eventType,
        occurredAt = new Date(),
        titleFr = null,
        description = null,
        metadata = {},
        actorUserId = null,
        relatedEntityType = null,
        relatedEntityId = null,
        isSystemGenerated = true,
      } = params;

      const titleAr = params.titleAr ??
        (DEFAULT_TITLES[eventType]?.(metadata) ?? "حدث");

      await db.insert(caseEventsTable).values({
        caseId,
        eventType,
        occurredAt,
        titleAr,
        titleFr,
        description,
        metadata,
        actorUserId,
        relatedEntityType,
        relatedEntityId,
        isSystemGenerated,
      });
    } catch (err) {
      logger.error({ err, caseId: params.caseId, eventType: params.eventType },
        "[CaseEventLogger] Failed to log event — action continues normally");
    }
  }
}
