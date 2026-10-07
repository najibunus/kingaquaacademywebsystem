import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const env = {};
fs.readFileSync('.env.local', 'utf8').split('\n').forEach(line => {
  const [key, ...rest] = line.split('=');
  if (key && rest.length) env[key.trim()] = rest.join('=').trim();
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

// 1. Check if migration already ran (locations table exists)
const { data: locations, error: locErr } = await supabase
  .from('locations')
  .select('id, name');

if (locErr) {
  console.log('❌ Locations table not found yet. Please run migration 014 in Supabase SQL Editor first.');
  process.exit(1);
}

console.log('✅ Locations table exists:');
locations.forEach(l => console.log(`   ${l.name} — id: ${l.id}`));

// 2. Insert the two missing private classes
const { data: inserted, error: insertErr } = await supabase
  .from('classes')
  .insert([
    {
      name: 'PURA PRIVATE ( PRV02 )',
      type: 'standard',
      is_active: true
    },
    {
      name: 'PONTIAN PRIVATE ( PRV03 )',
      type: 'standard',
      is_active: true
    }
  ])
  .select('id, name');

if (insertErr) {
  console.error('❌ Failed to insert classes:', insertErr.message);
  process.exit(1);
}

console.log('\n✅ New classes created:');
inserted.forEach(c => console.log(`   ${c.name} — id: ${c.id}`));

// 3. Print ALL classes for final reference
const { data: allClasses } = await supabase
  .from('classes')
  .select('id, name, type')
  .order('created_at');

console.log('\n=== ALL CLASSES (for pricing inserts) ===');
allClasses.forEach(c => console.log(`${c.name} — ${c.id}`));
