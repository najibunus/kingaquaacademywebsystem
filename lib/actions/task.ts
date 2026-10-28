"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export interface CreateTaskInput {
  title: string;
  description?: string | null;
  assignedTo?: string | null; // users.id or null for all staff
  dueDate?: string | null;
  isPinned?: boolean;
}

export interface UpdateTaskInput {
  id: string;
  title: string;
  description?: string | null;
  assignedTo?: string | null;
  dueDate?: string | null;
  isPinned?: boolean;
  status?: "pending" | "in_progress" | "done";
}

/**
 * Creates a new task assigned to a specific staff member or to the general staff pool.
 * Can be called by Admin, Superadmin, or Staff.
 */
export async function createTaskAction(input: CreateTaskInput) {
  try {
    const { title, description, assignedTo, dueDate, isPinned } = input;

    if (!title || !title.trim()) {
      return { error: "Please enter a task title." };
    }

    const authClient = await createClient();
    const {
      data: { user },
    } = await authClient.auth.getUser();
    if (!user) return { error: "You must be logged in to assign tasks." };

    const supabase = await createAdminClient();

    // Resolve creator's user ID
    let creatorUserId: string | null = null;
    const { data: userRow } = await supabase
      .from("users")
      .select("id, role")
      .eq("auth_id", user.id)
      .maybeSingle();

    if (userRow?.id) {
      creatorUserId = userRow.id;
    } else {
      const { data: fallbackUser } = await supabase
        .from("users")
        .select("id")
        .limit(1)
        .maybeSingle();
      creatorUserId = fallbackUser?.id ?? null;
    }

    if (!creatorUserId) {
      return { error: "Creator user profile not found." };
    }

    // Verify assigned user if specified
    let targetAssigneeId: string | null = null;
    if (assignedTo && assignedTo.trim() !== "" && assignedTo !== "unassigned") {
      targetAssigneeId = assignedTo.trim();
    }

    const { data: newTask, error: insertError } = await supabase
      .from("tasks")
      .insert({
        title: title.trim(),
        description: description?.trim() || null,
        created_by: creatorUserId,
        assigned_to: targetAssigneeId,
        due_date: dueDate ? new Date(dueDate).toISOString() : null,
        is_pinned: Boolean(isPinned),
        status: "pending",
      })
      .select("id, title, status, due_date, assigned_to")
      .single();

    if (insertError) {
      console.error("[createTaskAction insert error]", insertError.message);
      return { error: insertError.message };
    }

    revalidatePath("/admin/dashboard");
    revalidatePath("/admin/staff");
    revalidatePath("/staff/dashboard");

    return { success: true, task: newTask };
  } catch (err: any) {
    console.error("[createTaskAction]", err);
    return { error: err.message || "Failed to create task." };
  }
}

/**
 * Updates a task's status (pending, in_progress, done).
 */
export async function updateTaskStatusAction(taskId: string, status: "pending" | "in_progress" | "done") {
  try {
    if (!taskId) return { error: "Task ID is required." };

    const supabase = await createAdminClient();

    const { error: updateError } = await supabase
      .from("tasks")
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", taskId);

    if (updateError) {
      console.error("[updateTaskStatusAction error]", updateError.message);
      return { error: updateError.message };
    }

    revalidatePath("/admin/dashboard");
    revalidatePath("/admin/staff");
    revalidatePath("/staff/dashboard");

    return { success: true };
  } catch (err: any) {
    console.error("[updateTaskStatusAction]", err);
    return { error: err.message || "Failed to update task status." };
  }
}

/**
 * Deletes a task.
 */
export async function deleteTaskAction(taskId: string) {
  try {
    if (!taskId) return { error: "Task ID is required." };

    const supabase = await createAdminClient();

    const { error: deleteError } = await supabase
      .from("tasks")
      .delete()
      .eq("id", taskId);

    if (deleteError) {
      console.error("[deleteTaskAction error]", deleteError.message);
      return { error: deleteError.message };
    }

    revalidatePath("/admin/dashboard");
    revalidatePath("/admin/staff");
    revalidatePath("/staff/dashboard");

    return { success: true };
  } catch (err: any) {
    console.error("[deleteTaskAction]", err);
    return { error: err.message || "Failed to delete task." };
  }
}

/**
 * Updates task fields (title, description, assignee, due date, pinned status, status).
 */
export async function updateTaskAction(input: UpdateTaskInput) {
  try {
    const { id, title, description, assignedTo, dueDate, isPinned, status } = input;
    if (!id) return { error: "Task ID is required." };
    if (!title || !title.trim()) return { error: "Task title is required." };

    const supabase = await createAdminClient();

    let targetAssigneeId: string | null = null;
    if (assignedTo && assignedTo.trim() !== "" && assignedTo !== "unassigned") {
      targetAssigneeId = assignedTo.trim();
    }

    const updatePayload: Record<string, any> = {
      title: title.trim(),
      description: description?.trim() || null,
      assigned_to: targetAssigneeId,
      due_date: dueDate ? new Date(dueDate).toISOString() : null,
      is_pinned: Boolean(isPinned),
      updated_at: new Date().toISOString(),
    };

    if (status) {
      updatePayload.status = status;
    }

    const { error: updateError } = await supabase
      .from("tasks")
      .update(updatePayload)
      .eq("id", id);

    if (updateError) {
      console.error("[updateTaskAction error]", updateError.message);
      return { error: updateError.message };
    }

    revalidatePath("/admin/dashboard");
    revalidatePath("/admin/staff");
    revalidatePath("/staff/dashboard");

    return { success: true };
  } catch (err: any) {
    console.error("[updateTaskAction]", err);
    return { error: err.message || "Failed to update task." };
  }
}
