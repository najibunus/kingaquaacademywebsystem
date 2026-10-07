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
    
    // We already proved the invoice insertion works perfectly.
    const invoiceNumber = INV-STD-FIX- + Date.now().toString().slice(-6);
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 7);

    const { data: inv } = await sb.from(invoices).insert({
        invoice_number: invoiceNumber,
        student_id: dfb407d1-27a5-4016-927e-f3ba273b9977,
        parent_id: parentId,
        type: auto_4session,
        status: approved,
        due_date: dueDate.toISOString(),
        payment_status: unpaid,
        wa_status: unsent
    }).select().single();

    if (inv) {
        await sb.from(invoice_items).insert({
            invoice_id: inv.id,
            description: 4-Session Package Fee (Standard),
            quantity: 1,
            unit_price: 150
        });
        console.log(Successfully generated Package 2 for Demo Student!);
    }
}
run();
