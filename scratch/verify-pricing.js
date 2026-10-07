import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const env = {};
fs.readFileSync('.env.local', 'utf8').split('\n').forEach(line => {
  const [key, ...rest] = line.split('=');
  if (key && rest.length) env[key.trim()] = rest.join('=').trim();
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const { data, error } = await supabase
  .from('class_pricing')
  .select(`
    tier,
    price,
    billing_type,
    classes ( name ),
    locations ( name )
  `)
  .order('created_at');

if (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}

console.log(`\n✅ ${data.length} pricing rows found:\n`);
console.log('CLASS'.padEnd(30), 'LOCATION'.padEnd(16), 'TIER'.padEnd(16), 'PRICE'.padEnd(10), 'BILLING');
console.log('─'.repeat(95));

data.forEach(row => {
  const className = row.classes?.name?.trim().padEnd(30) ?? '?'.padEnd(30);
  const location  = row.locations?.name?.padEnd(16) ?? '?'.padEnd(16);
  const tier      = row.tier.padEnd(16);
  const price     = `RM ${row.price}`.padEnd(10);
  const billing   = row.billing_type;
  console.log(className, location, tier, price, billing);
});
