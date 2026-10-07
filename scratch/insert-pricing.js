import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const env = {};
fs.readFileSync('.env.local', 'utf8').split('\n').forEach(line => {
  const [key, ...rest] = line.split('=');
  if (key && rest.length) env[key.trim()] = rest.join('=').trim();
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

// ── Location IDs ──────────────────────────────────────────
const UTHM     = '10951fec-ab75-478c-a1ea-5806c9839d72';
const PURA     = 'fb256801-3321-4dd0-93d3-9bd43ac1cf26';
const PONTIAN  = 'cad19387-ae78-494a-ae88-1cb5d7c0e02d';

// ── Class IDs ─────────────────────────────────────────────
const KID01  = '8eda8d76-01b2-437d-ad85-a6f55ad4cb79'; // UTHM KIDDIES
const KID02  = '05bd2c34-c0f7-46b4-a9ce-e6c8f3c0f299'; // PURA KIDDIES
const BEG01  = 'abdcaabe-e181-4123-acdb-df374647fe72'; // BEGINNER UTHM
const BEG02  = '1e21dfb6-a37b-4087-857e-106c2bb2c2ef'; // PURA BEGINNER
const BEG03  = '31f8328a-69b3-4349-838f-8bf74cb9f2a5'; // PONTIAN BEGINNER
const NV01   = 'f5d8dd08-7bf9-44a9-971d-e3ba07d6f801'; // UTHM NOVICE
const ADV01  = '9b4cabca-09f5-422f-b01d-12094a70206d'; // UTHM ADVANCE
const LDS01  = '902c805f-91e9-49ce-8340-28dc34d317dd'; // UTHM LADIES
const MEN01  = '1e417292-cb3b-4ba3-80fd-817b3fdbaf6a'; // UTHM MEN
const PRV01  = '677bfa0a-5f9f-47d2-a3bd-d815751133ba'; // UTHM PRIVATE
const PRV02  = 'ce8f2124-b9ef-4323-886e-29b969439358'; // PURA PRIVATE
const PRV03  = 'ef5b526d-5e0e-4870-b1ae-9c501d85e0b0'; // PONTIAN PRIVATE
const AQP02  = '55143aba-be81-49eb-982f-c660c3486d09'; // AQUAPLAY (Pura Kencana)

// ── Full pricing matrix from price table ──────────────────
const rows = [
  // KIDDIES
  { class_id: KID01, location_id: UTHM,    price: 170, billing_type: 'per_student', tier: 'Standard' },
  { class_id: KID01, location_id: UTHM,    price: 120, billing_type: 'per_student', tier: 'Staff/Students' },
  { class_id: KID02, location_id: PURA,    price: 150, billing_type: 'per_student', tier: 'Standard' },

  // BEGINNER
  { class_id: BEG01, location_id: UTHM,    price: 150, billing_type: 'per_student', tier: 'Standard' },
  { class_id: BEG01, location_id: UTHM,    price: 120, billing_type: 'per_student', tier: 'Staff/Students' },
  { class_id: BEG02, location_id: PURA,    price: 120, billing_type: 'per_student', tier: 'Standard' },
  { class_id: BEG03, location_id: PONTIAN, price: 120, billing_type: 'per_student', tier: 'Standard' },

  // NOVICE
  { class_id: NV01,  location_id: UTHM,    price: 200, billing_type: 'per_student', tier: 'Standard' },

  // ADVANCE
  { class_id: ADV01, location_id: UTHM,    price: 250, billing_type: 'per_student', tier: 'Standard' },

  // LADIES
  { class_id: LDS01, location_id: UTHM,    price: 150, billing_type: 'per_student', tier: 'Standard' },
  { class_id: LDS01, location_id: UTHM,    price:  80, billing_type: 'per_student', tier: 'Mommy' },
  { class_id: LDS01, location_id: UTHM,    price: 120, billing_type: 'per_student', tier: 'Staff/Students' },

  // MENS
  { class_id: MEN01, location_id: UTHM,    price: 150, billing_type: 'per_student', tier: 'Standard' },
  { class_id: MEN01, location_id: UTHM,    price: 120, billing_type: 'per_student', tier: 'Staff/Students' },

  // PRIVATE — 1 person (per_student)
  { class_id: PRV01, location_id: UTHM,    price: 250, billing_type: 'per_student', tier: '1 Person' },
  { class_id: PRV02, location_id: PURA,    price: 250, billing_type: 'per_student', tier: '1 Person' },
  { class_id: PRV03, location_id: PONTIAN, price: 250, billing_type: 'per_student', tier: '1 Person' },

  // PRIVATE — 2 people (per_group flat RM300)
  { class_id: PRV01, location_id: UTHM,    price: 300, billing_type: 'per_group',   tier: '2 People' },
  { class_id: PRV02, location_id: PURA,    price: 300, billing_type: 'per_group',   tier: '2 People' },
  { class_id: PRV03, location_id: PONTIAN, price: 300, billing_type: 'per_group',   tier: '2 People' },

  // PRIVATE — 3-5 people (RM150 per person)
  { class_id: PRV01, location_id: UTHM,    price: 150, billing_type: 'per_student', tier: '3-5 People' },
  { class_id: PRV02, location_id: PURA,    price: 150, billing_type: 'per_student', tier: '3-5 People' },
  { class_id: PRV03, location_id: PONTIAN, price: 150, billing_type: 'per_student', tier: '3-5 People' },

  // AQUA PLAY (Special Needs) — Pura Kencana only
  { class_id: AQP02, location_id: PURA,    price: 200, billing_type: 'per_student', tier: 'Special Needs' },
];

console.log(`Inserting ${rows.length} pricing rows...`);

const { data, error } = await supabase
  .from('class_pricing')
  .insert(rows)
  .select('id');

if (error) {
  console.error('❌ Insert failed:', error.message);
  process.exit(1);
}

console.log(`✅ Successfully inserted ${data.length} pricing rows into class_pricing.`);
