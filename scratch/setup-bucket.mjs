import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function setupBucket() {
  const { data, error } = await supabase.storage.createBucket('receipts', {
    public: true,
    fileSizeLimit: 5242880 // 5MB
  });
  if (error) {
    if (error.message.includes('already exists')) {
      console.log('Bucket already exists.');
    } else {
      console.error('Error creating bucket:', error);
    }
  } else {
    console.log('Created receipts bucket:', data);
  }
}
setupBucket();
