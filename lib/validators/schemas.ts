/**
 * Zod validation schemas — Phase 0 stubs.
 * 
 * Full schemas will be added per-entity in Phases 1–8 as each
 * feature is built. This file is the single import point for all
 * validation — import from here, not directly from zod.
 *
 * Usage:
 *   import { loginSchema, studentSchema } from "@/lib/validators/schemas";
 */
import { z } from "zod";

// ── Auth ──────────────────────────────────────────────────────────
export const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const resetPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

// ── TODO: Add schemas in respective phases ─────────────────────────
// Phase 1: userSchema, roleSchema
// Phase 4: studentSchema, csvImportSchema, attendanceSchema
// Phase 5: invoiceSchema, invoiceItemSchema
// Phase 6: coachAttendanceSchema, evaluationSchema
// Phase 8: whatsappSendSchema

export type LoginInput = z.infer<typeof loginSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
