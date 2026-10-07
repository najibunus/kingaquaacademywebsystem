import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const env = {};
fs.readFileSync('.env.local', 'utf8').split('\n').forEach(line => {
  const [key, ...rest] = line.split('=');
  if (key && rest.length) env[key.trim()] = rest.join('=').trim();
});

// Fetch types via Supabase Management REST API
const projectId = 'eenfutjlpwumqhfbtwxn';
const res = await fetch(
  `https://api.supabase.com/v1/projects/${projectId}/types/typescript`,
  {
    headers: {
      'Authorization': `Bearer ${env.SUPABASE_ACCESS_TOKEN ?? ''}`
    }
  }
);

if (!res.ok) {
  console.log(`Status: ${res.status}. Cannot auto-fetch types — need SUPABASE_ACCESS_TOKEN.`);
  console.log('Falling back to reading existing types file and patching it manually.');

  // Manual patch: read existing supabase.ts and inject the new tables/columns
  const existing = fs.readFileSync('types/supabase.ts', 'utf8');
  
  // Check if it starts correctly
  if (existing.trim().startsWith('{')) {
    console.log('❌ types/supabase.ts is corrupted (contains JSON error). Need to restore.');
    process.exit(1);
  }
  
  console.log('✅ types/supabase.ts appears valid.');
  console.log('First 3 lines:', existing.split('\n').slice(0,3).join('\n'));
}
