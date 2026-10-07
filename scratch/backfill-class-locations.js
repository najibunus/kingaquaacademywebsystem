import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const env = {};
fs.readFileSync('.env.local', 'utf8').split('\n').forEach(line => {
  const [key, ...rest] = line.split('=');
  if (key && rest.length) env[key.trim()] = rest.join('=').trim();
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

// Location IDs seeded in migration 014
const UTHM    = '10951fec-ab75-478c-a1ea-5806c9839d72';
const PURA    = 'fb256801-3321-4dd0-93d3-9bd43ac1cf26';
const PONTIAN = 'cad19387-ae78-494a-ae88-1cb5d7c0e02d';

// --- Step 0: verify the columns exist ---
const { data: col, error: colErr } = await supabase
  .from('classes')
  .select('location_id')
  .limit(1);

if (colErr && colErr.message.includes('location_id')) {
  console.error('❌ Column location_id not found. Please run migration 015 in Supabase SQL Editor first.');
  process.exit(1);
}

// --- Step 1: fetch all classes ---
const { data: classes, error: fetchErr } = await supabase
  .from('classes')
  .select('id, name');

if (fetchErr) { console.error('Fetch error:', fetchErr.message); process.exit(1); }

// --- Step 2: derive location from class code suffix (01=UTHM, 02=PURA, 03=PONTIAN)
//             and from explicit venue keywords in the name
function deriveLocation(name) {
  const upper = name.toUpperCase();
  // Check explicit venue keywords first
  if (upper.includes('PURA') || upper.includes('AQP02') || upper.includes('KID02') || upper.includes('BEG02') || upper.includes('PRV02')) return PURA;
  if (upper.includes('PONTIAN') || upper.includes('BEG03') || upper.includes('PRV03')) return PONTIAN;
  // UTHM / default
  return UTHM;
}

// --- Step 3: bulk update ---
let successCount = 0;
for (const cls of classes) {
  const locationId = deriveLocation(cls.name);
  const { error: updateErr } = await supabase
    .from('classes')
    .update({ location_id: locationId })
    .eq('id', cls.id);

  if (updateErr) {
    console.error(`  ❌ Failed to update ${cls.name}: ${updateErr.message}`);
  } else {
    successCount++;
    const label = locationId === UTHM ? 'UTHM' : locationId === PURA ? 'Pura Kencana' : 'Pontian';
    console.log(`  ✅ ${cls.name}  →  ${label}`);
  }
}

console.log(`\n✅ Done. ${successCount}/${classes.length} classes updated with location_id.`);
