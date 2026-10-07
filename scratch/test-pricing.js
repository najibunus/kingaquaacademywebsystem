import fs from 'fs';
import { createAdminClient } from './lib/supabase/server.js'; // Can't easily use next's ts setup in a raw node script without tsx/esbuild
import { createClient } from '@supabase/supabase-js';

const env = {};
fs.readFileSync('.env.local', 'utf8').split('\n').forEach(line => {
  const [key, ...rest] = line.split('=');
  if (key && rest.length) env[key.trim()] = rest.join('=').trim();
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const email = 'testparent@kingaqua.test';

async function main() {
  // 1. Get user
  const { data: users, error: listUserErr } = await supabase.auth.admin.listUsers();
  const authUser = users?.users?.find(u => u.email === email);
  if (!authUser) {
    console.log(`❌ Parent user not found for email: ${email}`);
    process.exit(1);
  }

  const { data: publicUser } = await supabase
    .from('users')
    .select('id')
    .eq('auth_id', authUser.id)
    .single();

  const parentId = publicUser.id;
  console.log(`✅ Found parent_id: ${parentId} for ${email}`);

  // 2. Delete existing invoices
  const { data: deleted, error: delErr } = await supabase
    .from('invoices')
    .delete()
    .eq('parent_id', parentId)
    .select('id');
    
  if (delErr) {
    console.error('Error deleting invoices:', delErr.message);
  } else {
    console.log(`✅ Deleted ${deleted?.length ?? 0} old invoices for testing.`);
  }

  // 3. We cannot easily import ensureInvoicesGenerated here since it's TS and uses Next.js aliases.
  // Instead we'll simulate the user visiting the portal page which calls it.
  // We can do this by just calling the local dev server API or we just re-implement a minimal trigger.
  // Or better, let's just trigger it by making a request to the server, but wait, the server isn't running.
}
main();
