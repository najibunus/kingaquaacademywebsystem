"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function updatePricingAction(id: string, price: number, tier: string, billingType: string) {
  try {
    const supabase = await createAdminClient();
    const { error } = await supabase
      .from("class_pricing")
      .update({ price, tier, billing_type: billingType })
      .eq("id", id);
      
    if (error) throw error;
    
    revalidatePath("/admin/pricing");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function addPricingAction(classId: string, locationId: string, price: number, tier: string, billingType: string) {
  try {
    const supabase = await createAdminClient();
    const { data, error } = await supabase
      .from("class_pricing")
      .insert({
        class_id: classId,
        location_id: locationId,
        price,
        tier,
        billing_type: billingType
      })
      .select()
      .single();
      
    if (error) throw error;
    
    revalidatePath("/admin/pricing");
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function deletePricingAction(id: string) {
  try {
    const supabase = await createAdminClient();
    const { error } = await supabase
      .from("class_pricing")
      .delete()
      .eq("id", id);
      
    if (error) throw error;
    
    revalidatePath("/admin/pricing");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
