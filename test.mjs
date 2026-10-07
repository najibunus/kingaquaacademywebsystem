import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf8').split('\n').reduce((acc, line) => { 
    const [k, ...v] = line.split('='); 
    if(k && v.length) acc[k.trim()] = v.join('=').trim(); 
    return acc; 
}, {});

const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    const parentId = '861dcbbc-dc23-476b-82f7-5d1dd20637cc';
    const { data: students } = await sb
        .from(students)
        .select(id, name, session_count, parent_id, pricing_tier, classes(id, name, type, location_id), invoices(id, payment_status, created_at, type), attendance(status, date, classes(type)))
        .eq(parent_id, parentId)
        .eq(status, active);
    
    console.log(JSON.stringify(students.find(s => s.name === 'Demo Student'), null, 2));
}
run();
