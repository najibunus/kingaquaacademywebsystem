import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function run() {
  const { data: parents, error } = await supabase.from('users').select('id, auth_id').eq('role', 'parent');
  if (error) {
    console.error(error);
    return;
  }
  
  if (!parents || parents.length === 0) {
    console.log("No parents found.");
    return;
  }
  
  console.log(`Found ${parents.length} parents. Deleting...`);
  
  for (const parent of parents) {
    // Delete from auth.users (which should cascade to public.users and public.students if cascade is set, 
    // but to be safe we might need to delete from public.users if not)
    const { error: authError } = await supabase.auth.admin.deleteUser(parent.auth_id);
    if (authError) {
      console.error(`Failed to delete auth user ${parent.auth_id}:`, authError);
      
      // If auth user wasn't found or couldn't be deleted, let's at least delete the public.users record
      console.log(`Attempting to delete from public.users for ${parent.id}...`);
      await supabase.from('users').delete().eq('id', parent.id);
    } else {
      console.log(`Successfully deleted parent ${parent.id}`);
    }
  }
  console.log("Finished deleting parents.");
}

run();
