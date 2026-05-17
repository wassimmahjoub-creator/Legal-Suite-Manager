/**
 * Seed script — Tunisian courts (idempotent: ON CONFLICT DO NOTHING on name).
 * Run: pnpm --filter @workspace/db run seed:courts
 *
 * Values marked TODO_VERIFY: need manual verification of exact address/phone.
 */
import { db, courtsTable } from "../index.js";
import { sql } from "drizzle-orm";

type CourtSeed = {
  name: string;
  nameAr: string;
  nameFr: string;
  type: "cassation" | "appel" | "premiere_instance" | "cantonal" | "administratif" | "immobilier" | "prudhommes" | "autre";
  governorate: string;
  city: string;
  address?: string;
  phone?: string;
};

const COURTS: CourtSeed[] = [
  // ── Cour de cassation ────────────────────────────────────────────────────
  {
    name: "محكمة التعقيب",
    nameAr: "محكمة التعقيب",
    nameFr: "Cour de cassation",
    type: "cassation",
    governorate: "تونس",
    city: "تونس",
    address: "TODO_VERIFY: Boulevard du 9 Avril 1938, Tunis",
    phone: "TODO_VERIFY: +216 71 000 000",
  },

  // ── Cours d'appel ────────────────────────────────────────────────────────
  {
    name: "محكمة الاستئناف بتونس",
    nameAr: "محكمة الاستئناف بتونس",
    nameFr: "Cour d'appel de Tunis",
    type: "appel",
    governorate: "تونس",
    city: "تونس",
    address: "TODO_VERIFY: Tunis",
  },
  {
    name: "محكمة الاستئناف بسوسة",
    nameAr: "محكمة الاستئناف بسوسة",
    nameFr: "Cour d'appel de Sousse",
    type: "appel",
    governorate: "سوسة",
    city: "سوسة",
    address: "TODO_VERIFY: Sousse",
  },
  {
    name: "محكمة الاستئناف بصفاقس",
    nameAr: "محكمة الاستئناف بصفاقس",
    nameFr: "Cour d'appel de Sfax",
    type: "appel",
    governorate: "صفاقس",
    city: "صفاقس",
    address: "TODO_VERIFY: Sfax",
  },
  {
    name: "محكمة الاستئناف بمدنين",
    nameAr: "محكمة الاستئناف بمدنين",
    nameFr: "Cour d'appel de Médenine",
    type: "appel",
    governorate: "مدنين",
    city: "مدنين",
    address: "TODO_VERIFY: Médenine",
  },

  // ── Tribunal administratif ───────────────────────────────────────────────
  {
    name: "المحكمة الإدارية",
    nameAr: "المحكمة الإدارية",
    nameFr: "Tribunal administratif",
    type: "administratif",
    governorate: "تونس",
    city: "تونس",
    address: "TODO_VERIFY: Boulvard du 9 Avril, Tunis",
    phone: "TODO_VERIFY: +216 71 000 000",
  },

  // ── Tribunal immobilier ──────────────────────────────────────────────────
  {
    name: "المحكمة العقارية",
    nameAr: "المحكمة العقارية",
    nameFr: "Tribunal immobilier",
    type: "immobilier",
    governorate: "تونس",
    city: "تونس",
    address: "TODO_VERIFY: Tunis",
  },

  // ── 24 Tribunaux de première instance (un par gouvernorat) ───────────────
  { name: "المحكمة الابتدائية بتونس",       nameAr: "المحكمة الابتدائية بتونس",       nameFr: "Tribunal de première instance de Tunis",         type: "premiere_instance", governorate: "تونس",       city: "تونس",       address: "TODO_VERIFY: Tunis" },
  { name: "المحكمة الابتدائية بأريانة",      nameAr: "المحكمة الابتدائية بأريانة",      nameFr: "Tribunal de première instance d'Ariana",        type: "premiere_instance", governorate: "أريانة",     city: "أريانة",     address: "TODO_VERIFY: Ariana" },
  { name: "المحكمة الابتدائية ببن عروس",    nameAr: "المحكمة الابتدائية ببن عروس",    nameFr: "Tribunal de première instance de Ben Arous",    type: "premiere_instance", governorate: "بن عروس",   city: "بن عروس",   address: "TODO_VERIFY: Ben Arous" },
  { name: "المحكمة الابتدائية بمنوبة",      nameAr: "المحكمة الابتدائية بمنوبة",      nameFr: "Tribunal de première instance de La Manouba",   type: "premiere_instance", governorate: "منوبة",      city: "منوبة",      address: "TODO_VERIFY: La Manouba" },
  { name: "المحكمة الابتدائية بنابل",       nameAr: "المحكمة الابتدائية بنابل",       nameFr: "Tribunal de première instance de Nabeul",       type: "premiere_instance", governorate: "نابل",       city: "نابل",       address: "TODO_VERIFY: Nabeul" },
  { name: "المحكمة الابتدائية بزغوان",      nameAr: "المحكمة الابتدائية بزغوان",      nameFr: "Tribunal de première instance de Zaghouan",     type: "premiere_instance", governorate: "زغوان",      city: "زغوان",      address: "TODO_VERIFY: Zaghouan" },
  { name: "المحكمة الابتدائية ببنزرت",      nameAr: "المحكمة الابتدائية ببنزرت",      nameFr: "Tribunal de première instance de Bizerte",      type: "premiere_instance", governorate: "بنزرت",      city: "بنزرت",      address: "TODO_VERIFY: Bizerte" },
  { name: "المحكمة الابتدائية بباجة",       nameAr: "المحكمة الابتدائية بباجة",       nameFr: "Tribunal de première instance de Béja",         type: "premiere_instance", governorate: "باجة",       city: "باجة",       address: "TODO_VERIFY: Béja" },
  { name: "المحكمة الابتدائية بجندوبة",     nameAr: "المحكمة الابتدائية بجندوبة",     nameFr: "Tribunal de première instance de Jendouba",     type: "premiere_instance", governorate: "جندوبة",     city: "جندوبة",     address: "TODO_VERIFY: Jendouba" },
  { name: "المحكمة الابتدائية بالكاف",      nameAr: "المحكمة الابتدائية بالكاف",      nameFr: "Tribunal de première instance du Kef",          type: "premiere_instance", governorate: "الكاف",      city: "الكاف",      address: "TODO_VERIFY: Le Kef" },
  { name: "المحكمة الابتدائية بسليانة",     nameAr: "المحكمة الابتدائية بسليانة",     nameFr: "Tribunal de première instance de Siliana",      type: "premiere_instance", governorate: "سليانة",     city: "سليانة",     address: "TODO_VERIFY: Siliana" },
  { name: "المحكمة الابتدائية بسوسة",       nameAr: "المحكمة الابتدائية بسوسة",       nameFr: "Tribunal de première instance de Sousse",       type: "premiere_instance", governorate: "سوسة",       city: "سوسة",       address: "TODO_VERIFY: Sousse" },
  { name: "المحكمة الابتدائية بالمنستير",   nameAr: "المحكمة الابتدائية بالمنستير",   nameFr: "Tribunal de première instance de Monastir",     type: "premiere_instance", governorate: "المنستير",   city: "المنستير",   address: "TODO_VERIFY: Monastir" },
  { name: "المحكمة الابتدائية بالمهدية",    nameAr: "المحكمة الابتدائية بالمهدية",    nameFr: "Tribunal de première instance de Mahdia",       type: "premiere_instance", governorate: "المهدية",    city: "المهدية",    address: "TODO_VERIFY: Mahdia" },
  { name: "المحكمة الابتدائية بصفاقس",      nameAr: "المحكمة الابتدائية بصفاقس",      nameFr: "Tribunal de première instance de Sfax",         type: "premiere_instance", governorate: "صفاقس",      city: "صفاقس",      address: "TODO_VERIFY: Sfax" },
  { name: "المحكمة الابتدائية بالقيروان",   nameAr: "المحكمة الابتدائية بالقيروان",   nameFr: "Tribunal de première instance de Kairouan",     type: "premiere_instance", governorate: "القيروان",   city: "القيروان",   address: "TODO_VERIFY: Kairouan" },
  { name: "المحكمة الابتدائية بالقصرين",   nameAr: "المحكمة الابتدائية بالقصرين",   nameFr: "Tribunal de première instance de Kasserine",    type: "premiere_instance", governorate: "القصرين",   city: "القصرين",   address: "TODO_VERIFY: Kasserine" },
  { name: "المحكمة الابتدائية بسيدي بوزيد", nameAr: "المحكمة الابتدائية بسيدي بوزيد", nameFr: "Tribunal de première instance de Sidi Bouzid",  type: "premiere_instance", governorate: "سيدي بوزيد", city: "سيدي بوزيد", address: "TODO_VERIFY: Sidi Bouzid" },
  { name: "المحكمة الابتدائية بقابس",       nameAr: "المحكمة الابتدائية بقابس",       nameFr: "Tribunal de première instance de Gabès",        type: "premiere_instance", governorate: "قابس",       city: "قابس",       address: "TODO_VERIFY: Gabès" },
  { name: "المحكمة الابتدائية بمدنين",      nameAr: "المحكمة الابتدائية بمدنين",      nameFr: "Tribunal de première instance de Médenine",     type: "premiere_instance", governorate: "مدنين",      city: "مدنين",      address: "TODO_VERIFY: Médenine" },
  { name: "المحكمة الابتدائية بتطاوين",     nameAr: "المحكمة الابتدائية بتطاوين",     nameFr: "Tribunal de première instance de Tataouine",    type: "premiere_instance", governorate: "تطاوين",     city: "تطاوين",     address: "TODO_VERIFY: Tataouine" },
  { name: "المحكمة الابتدائية بقفصة",       nameAr: "المحكمة الابتدائية بقفصة",       nameFr: "Tribunal de première instance de Gafsa",        type: "premiere_instance", governorate: "قفصة",       city: "قفصة",       address: "TODO_VERIFY: Gafsa" },
  { name: "المحكمة الابتدائية بتوزر",       nameAr: "المحكمة الابتدائية بتوزر",       nameFr: "Tribunal de première instance de Tozeur",       type: "premiere_instance", governorate: "توزر",       city: "توزر",       address: "TODO_VERIFY: Tozeur" },
  { name: "المحكمة الابتدائية بقبلي",       nameAr: "المحكمة الابتدائية بقبلي",       nameFr: "Tribunal de première instance de Kébili",       type: "premiere_instance", governorate: "قبلي",       city: "قبلي",       address: "TODO_VERIFY: Kébili" },
];

async function seed() {
  console.log(`Seeding ${COURTS.length} courts...`);
  let inserted = 0;
  for (const court of COURTS) {
    const result = await db.execute(sql`
      INSERT INTO courts (name, name_ar, name_fr, type, governorate, city, address, phone, updated_at)
      VALUES (
        ${court.name},
        ${court.nameAr},
        ${court.nameFr},
        ${court.type}::court_type,
        ${court.governorate},
        ${court.city},
        ${court.address ?? null},
        ${court.phone ?? null},
        NOW()
      )
      ON CONFLICT (name) DO NOTHING
    `);
    if ((result as unknown as { rowCount: number }).rowCount > 0) inserted++;
  }
  console.log(`Done: ${inserted} inserted, ${COURTS.length - inserted} already existed.`);
  process.exit(0);
}

seed().catch(e => { console.error(e); process.exit(1); });
