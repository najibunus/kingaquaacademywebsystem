import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const env = {};
fs.readFileSync('.env.local', 'utf8').split('\n').forEach(line => {
  const [key, ...rest] = line.split('=');
  if (key && rest.length) env[key.trim()] = rest.join('=').trim();
});

// Use the REST API to execute NOTIFY pgrst, 'reload schema'
// Supabase exposes this via the /rest/v1/rpc endpoint using pg_notify
const url = `${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/pg_notify`;
const res = await fetch(url, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
    'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`
  },
  body: JSON.stringify({ channel: 'pgrst', payload: 'reload schema' })
});

if (res.ok) {
  console.log('✅ Schema reload notification sent.');
} else {
  const text = await res.text();
  console.log(`Response ${res.status}: ${text}`);
  console.log('\n⚠️  Please run this manually in Supabase SQL Editor:');
  console.log('NOTIFY pgrst, \'reload schema\';');
}
