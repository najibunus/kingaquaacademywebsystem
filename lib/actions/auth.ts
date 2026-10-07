"use server";

import { createClient } from "@/lib/supabase/server";
import { loginSchema } from "@/lib/validators/schemas";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export type AuthState = {
  error?: string;
  fieldErrors?: {
    email?: string[];
    password?: string[];
  };
};

export async function loginAction(
  prevState: AuthState | undefined,
  formData: FormData
): Promise<AuthState> {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  // Validate fields
  const validatedFields = loginSchema.safeParse({ email, password });
  
  if (!validatedFields.success) {
    return {
      fieldErrors: validatedFields.error.flatten().fieldErrors,
    };
  }

  const supabase = await createClient();

  // Attempt sign in
  const { error } = await supabase.auth.signInWithPassword({
    email: validatedFields.data.email,
    password: validatedFields.data.password,
  });

  if (error) {
    return { error: error.message };
  }

  // Next.js 16 requires us to await any mutations before redirecting.
  // The middleware/proxy will handle routing the user to the correct dashboard based on role.
  revalidatePath("/", "layout");
  redirect("/");
}

export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  
  revalidatePath("/", "layout");
  redirect("/auth/login");
}
