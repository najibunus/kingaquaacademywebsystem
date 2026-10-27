"use client";

import { useActionState, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import BrandLogo from "@/components/BrandLogo";
import styles from "./resetPassword.module.css";
import { requestPasswordResetAction } from "@/lib/actions/auth";

const BANNER_IMAGE = "/images/login-banner-v2.png";
const SUPERADMIN_WHATSAPP_PHONE = "60195177001"; // 019-517 7001

export default function ResetPasswordClient() {
  const searchParams = useSearchParams();
  const initialEmail = searchParams.get("email") || "";

  const [state, formAction, pending] = useActionState(
    requestPasswordResetAction,
    undefined
  );

  const [email, setEmail] = useState(initialEmail);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (initialEmail && !email) {
      setEmail(initialEmail);
    }
  }, [initialEmail]);

  // Dynamic WhatsApp prefill message based on what user has entered
  const trimmedEmail = email.trim();
  const trimmedName = name.trim();
  let waMessage = "Hello KingAqua Academy Superadmin, I forgot my portal account password. Could you please assist me with resetting it?";
  if (trimmedEmail && trimmedName) {
    waMessage = `Hello KingAqua Academy Superadmin, I would like to request a password reset for my account (${trimmedEmail}, Name: ${trimmedName}). Could you please assist me?`;
  } else if (trimmedEmail) {
    waMessage = `Hello KingAqua Academy Superadmin, I would like to request a password reset for my account (${trimmedEmail}). Could you please assist me?`;
  }

  const whatsappHref = `https://wa.me/${SUPERADMIN_WHATSAPP_PHONE}?text=${encodeURIComponent(waMessage)}`;

  return (
    <div className={styles.resetWrapper}>
      {/* Left Banner Panel (Desktop Brand/Info) */}
      <div className={styles.bannerPanel} aria-hidden="true">
        <Image
          src={BANNER_IMAGE}
          alt="Kingaqua Academy Banner"
          fill
          priority
          sizes="(max-width: 900px) 0px, calc(100vw - 540px)"
          style={{ objectFit: "cover", objectPosition: "center" }}
          className={styles.bannerImage}
        />
        <div className={styles.bannerOverlay} />
      </div>

      {/* Right Panel */}
      <main className={styles.rightPanel} role="main">
        {/* Top Navigation */}
        <div className={styles.topBar}>
          <Link href="/auth/login" className={styles.backBtn}>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="m15 18-6-6 6-6" />
            </svg>
            <span>Back to Login</span>
          </Link>
          <Link href="/" className={styles.backBtn} style={{ fontSize: "0.8rem", padding: "6px 12px" }}>
            <span>Home</span>
          </Link>
        </div>

        {/* Center Card */}
        <div className={styles.formContainer}>
          {/* Brand Header */}
          <div className={styles.brandHeader}>
            <BrandLogo size={44} textSize="1.2rem" textColor="#0f172a" />
            <span className={styles.portalBadge}>Password Help</span>
          </div>

          {/* Heading */}
          <div className={styles.heading}>
            <h1 className={styles.title}>Reset Password</h1>
            <p className={styles.subtitle}>
              Choose how you would like to reach our superadmin to update your credentials.
            </p>
          </div>

          {/* Option 1: Direct WhatsApp to Superadmin */}
          <div className={styles.whatsappBox}>
            <div className={styles.whatsappHeader}>
              <h2 className={styles.whatsappTitle}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2z" />
                </svg>
                Chat Superadmin via WhatsApp
              </h2>
              <span className={styles.whatsappBadge}>Instant Resolution</span>
            </div>
            <p className={styles.whatsappDesc}>
              Chat directly with our superadmin (019-517 7001) on WhatsApp to verify and reset your password immediately.
            </p>
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.btnWhatsapp}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2zm5.78 14.15c-.24.68-1.2 1.25-1.76 1.32-.48.06-1.11.08-3.21-.79-2.52-1.04-4.14-3.6-4.27-3.77-.12-.17-1.02-1.36-1.02-2.59 0-1.23.64-1.84.87-2.09.23-.25.5-.31.67-.31.17 0 .34 0 .49.01.15.01.36-.06.56.43.21.5.71 1.73.77 1.86.06.13.1.28.02.44-.08.17-.12.28-.24.42-.12.15-.26.33-.37.44-.12.12-.25.26-.11.5.14.25.64 1.05 1.37 1.7 1.01.89 1.86 1.17 2.13 1.3.26.13.42.11.58-.07.16-.18.68-.79.86-1.06.18-.27.36-.23.61-.13.25.09 1.58.74 1.85.88.27.13.45.2.52.31.06.12.06.69-.18 1.37z" />
              </svg>
              <span>Open WhatsApp Chat</span>
            </a>
          </div>

          {/* Divider */}
          <div className={styles.dividerRow}>
            <span className={styles.dividerLine} />
            <span className={styles.dividerText}>Or Notify Superadmin in System</span>
            <span className={styles.dividerLine} />
          </div>

          {/* Option 2: Notify Superadmin Form */}
          {state?.success ? (
            <div className={styles.successBox}>
              <h3 className={styles.successTitle}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                Request Sent to Superadmin!
              </h3>
              <p className={styles.successText}>
                {state.message}
              </p>
              <p className={styles.successText} style={{ marginTop: "4px", fontSize: "0.8rem", color: "#15803d" }}>
                Our superadmin team has logged your ticket. If you need immediate assistance, feel free to also reach us via the WhatsApp button above.
              </p>
            </div>
          ) : (
            <form action={formAction} className={styles.form} noValidate>
              {/* Global Error */}
              {state?.error && (
                <div className={styles.errorAlert} role="alert">
                  <span aria-hidden="true">&#9888;&#65039;</span>
                  <span>{state.error}</span>
                </div>
              )}

              {/* Email Address */}
              <div className={styles.fieldGroup}>
                <label htmlFor="reset-email" className={styles.fieldLabel}>
                  Account Email Address <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <div className={styles.inputWrapper}>
                  <span className={styles.inputIcon} aria-hidden="true">
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect width="20" height="16" x="2" y="4" rx="2" />
                      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                    </svg>
                  </span>
                  <input
                    id="reset-email"
                    name="email"
                    type="email"
                    className={`form-input ${styles.inputWithIcon}`}
                    placeholder="parent@example.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={pending}
                  />
                </div>
                {state?.fieldErrors?.email && (
                  <p className={styles.fieldError}>{state.fieldErrors.email[0]}</p>
                )}
              </div>

              {/* Name / Student Name */}
              <div className={styles.fieldGroup}>
                <label htmlFor="reset-name" className={styles.fieldLabel}>
                  Your Name or Student&apos;s Name <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 400 }}>(Optional)</span>
                </label>
                <div className={styles.inputWrapper}>
                  <span className={styles.inputIcon} aria-hidden="true">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  </span>
                  <input
                    id="reset-name"
                    name="name"
                    type="text"
                    className={`form-input ${styles.inputWithIcon}`}
                    placeholder="e.g. Sarah / Adam"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={pending}
                  />
                </div>
              </div>

              {/* Phone */}
              <div className={styles.fieldGroup}>
                <label htmlFor="reset-phone" className={styles.fieldLabel}>
                  Contact Phone Number <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 400 }}>(Optional)</span>
                </label>
                <div className={styles.inputWrapper}>
                  <span className={styles.inputIcon} aria-hidden="true">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                    </svg>
                  </span>
                  <input
                    id="reset-phone"
                    name="phone"
                    type="tel"
                    className={`form-input ${styles.inputWithIcon}`}
                    placeholder="e.g. 012-3456789"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    disabled={pending}
                  />
                </div>
              </div>

              {/* Note */}
              <div className={styles.fieldGroup}>
                <label htmlFor="reset-note" className={styles.fieldLabel}>
                  Additional Note <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 400 }}>(Optional)</span>
                </label>
                <textarea
                  id="reset-note"
                  name="note"
                  className={styles.textareaInput}
                  placeholder="Any extra details to help superadmin identify your account..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  disabled={pending}
                  rows={2}
                />
              </div>

              {/* Submit */}
              <button
                type="submit"
                className={styles.submitBtn}
                disabled={pending}
              >
                {pending ? (
                  <>
                    <span className="spinner" />
                    <span>Notifying Superadmin...</span>
                  </>
                ) : (
                  <>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="22" y1="2" x2="11" y2="13" />
                      <polygon points="22 2 15 22 11 13 2 9 22 2" />
                    </svg>
                    <span>Notify Superadmin for Password Reset</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* Back to Login Link */}
          <div className={styles.backRow}>
            <span>Remember your password?</span>
            <Link href="/auth/login" className={styles.loginLink}>
              Sign In
            </Link>
          </div>
        </div>

        <p className={styles.footer}>
          &copy; {new Date().getFullYear()} Kingaqua Academy &bull; All rights reserved
        </p>
      </main>
    </div>
  );
}
