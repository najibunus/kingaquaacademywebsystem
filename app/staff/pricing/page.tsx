import { createAdminClient } from "@/lib/supabase/server";
import StaffPricingClient from "./StaffPricingClient";

export default async function StaffPricingPage() {
  const supabase = await createAdminClient();

  // Fetch all class pricing along with class and location names
  const { data: pricingData, error: pricingError } = await supabase
    .from("class_pricing")
    .select("*, classes(name), locations(name)")
    .order("created_at", { ascending: false });

  // Fetch classes and locations for the 'Add New' form
  const { data: classes } = await supabase.from("classes").select("id, name").eq("is_active", true).order("name");
  const { data: locations } = await supabase.from("locations").select("id, name").order("name");

  if (pricingError) {
    return <div className="animate-fade-in-up p-6 text-red-500">Error loading pricing: {pricingError.message}</div>;
  }

  return (
    <StaffPricingClient 
      pricingData={pricingData as any[]} 
      classes={classes as any[]} 
      locations={locations as any[]} 
    />
  );
}
