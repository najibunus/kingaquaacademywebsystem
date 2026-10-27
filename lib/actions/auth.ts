"use server";

import { createAdminClient, createClient } from "@/lib/supabase/server";
import { loginSchema, resetPasswordSchema } from "@/lib/validators/schemas";
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

export type PasswordResetState = {
  success?: boolean;
  message?: string;
  error?: string;
  fieldErrors?: {
    email?: string[];
  };
};

export async function requestPasswordResetAction(
  prevState: PasswordResetState | undefined,
  formData: FormData
): Promise<PasswordResetState> {
  const email = ((formData.get("email") as string) || "").trim().toLowerCase();
  const name = ((formData.get("name") as string) || "").trim();
  const phone = ((formData.get("phone") as string) || "").trim();
  const note = ((formData.get("note") as string) || "").trim();

  // Validate fields
  const validatedFields = resetPasswordSchema.safeParse({ email });
  if (!validatedFields.success) {
    return {
      fieldErrors: validatedFields.error.flatten().fieldErrors,
      error: "Please enter a valid email address.",
    };
  }

  try {
    const admin = await createAdminClient();

    let matchedUserId: string | null = null;
    let matchedRole: string = "guest";
    let matchedName: string = name;

    // Check if phone was provided and matches a user
    if (phone) {
      const { data: usersByPhone } = await admin
        .from("users")
        .select("id, display_name, role, phone")
        .eq("phone", phone)
        .limit(1);

      if (usersByPhone && usersByPhone.length > 0) {
        matchedUserId = usersByPhone[0].id;
        matchedRole = usersByPhone[0].role;
        if (!matchedName) matchedName = usersByPhone[0].display_name;
      }
    }

    // Try finding by email via auth.admin.listUsers()
    try {
      const { data: authData } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      const foundAuth = authData?.users?.find(
        (u) => u.email?.toLowerCase() === email
      );
      if (foundAuth) {
        const { data: profile } = await admin
          .from("users")
          .select("id, display_name, role")
          .eq("auth_id", foundAuth.id)
          .single();
        if (profile) {
          matchedUserId = profile.id;
          matchedRole = profile.role;
          if (!matchedName) matchedName = profile.display_name;
        }
      }
    } catch (e) {
      console.warn("Could not list auth users:", e);
    }

    // Attempt native Supabase reset email if configured (fails silently if SMTP is not active)
    try {
      const supabase = await createClient();
      await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/auth/reset-password`,
      });
    } catch {}

    // 1. Insert into audit_logs so superadmins/admins see the event in their ledger
    await admin.from("audit_logs").insert({
      actor_role: matchedRole,
      actor_id: matchedUserId,
      action: "user.password_reset_request",
      entity_type: "user",
      entity_id: matchedUserId,
      new_data: {
        email,
        name: matchedName || null,
        phone: phone || null,
        user_role: matchedRole,
        note: note || null,
        status: "pending_admin_action",
        requested_at: new Date().toISOString(),
      },
    });

    // 2. Create a task in tasks table for staff & admin dashboard
    try {
      const { data: adminUsers } = await admin
        .from("users")
        .select("id")
        .in("role", ["superadmin", "admin"])
        .limit(1);

      const creatorId = adminUsers?.[0]?.id || matchedUserId;
      if (creatorId) {
        await admin.from("tasks").insert({
          title: `Password Reset: ${matchedName || email}`,
          description: `User requested a password reset.\nEmail: ${email}\nName: ${matchedName || "Not provided"}\nPhone: ${phone || "Not provided"}\nRole: ${matchedRole}${note ? `\nNote: ${note}` : ""}`,
          created_by: creatorId,
          status: "pending",
          is_pinned: true,
        });
      }
    } catch (taskErr) {
      console.warn("Could not insert staff task for password reset:", taskErr);
    }

    revalidatePath("/superadmin/audit");
    revalidatePath("/superadmin");
    revalidatePath("/admin/dashboard");
    revalidatePath("/staff/dashboard");

    return {
      success: true,
      message: "Your password reset request has been sent to our administration team! An admin will review and update your credentials shortly. You can also chat directly with an admin via WhatsApp.",
    };
  } catch (err: any) {
    console.error("Password reset action error:", err);
    return {
      error: err.message || "Failed to notify admin. Please use the WhatsApp option to contact admin directly.",
    };
  }
}
