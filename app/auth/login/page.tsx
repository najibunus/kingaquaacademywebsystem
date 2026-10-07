"use client";

import { useActionState, useState } from "react";
import Image from "next/image";
import styles from "./login.module.css";
import { loginAction } from "@/lib/actions/auth";

// Replace public/images/login-banner-v2.png with your own image (landscape, about 1920px wide, PNG or WebP).
const BANNER_IMAGE = "/images/login-banner-v2.png";

export default function LoginPage() {
  const [state, action, pending] = useActionState(loginAction, undefined);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className={styles.loginWrapper}>
      {/* Left Banner Panel (Brand/Info) */}
      <div className={styles.bannerPanel} aria-hidden="true">
        <Image
          src={BANNER_IMAGE}
          alt="Kingaqua Academy Banner"
          fill
          priority
          sizes="(max-width: 900px) 0px, calc(100vw - 500px)"
          style={{ objectFit: "cover", objectPosition: "center" }}
          className={styles.bannerImage}
        />
        <div className={styles.bannerOverlay} />
      </div>

      {/* Right Panel: login form */}
      <main className={styles.rightPanel} role="main">
        <div className={styles.formContainer}>
          {/* Mobile Logo */}
          <div className={styles.logoMobile} aria-hidden="true">
            <div className={styles.logoIcon}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M4 14c2-2 4-3 6-2l4 2c2 1 4 1 6-1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <path d="M6 18c1.5-1 3-1.5 4.5-1l2 1c1.5.5 3 .5 4.5-1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
                <circle cx="15" cy="7" r="2.5" fill="currentColor" />
                <path d="M9 13l4-4 3 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h1 className={styles.logoName}>Kingaqua</h1>
          </div>

          {/* Heading */}
          <div className={styles.heading}>
            <h2 className={styles.title}>Welcome back</h2>
            <p className={styles.subtitle}>Sign in to your account to continue</p>
          </div>

          {/* Form */}
          <form action={action} className={styles.form} noValidate>
            {/* Global Error */}
            {state?.error && (
              <div className={styles.errorAlert} role="alert" aria-live="polite">
                <span aria-hidden="true">&#9888;&#65039;</span>
                <span>{state.error}</span>
              </div>
            )}

            {/* Email */}
            <div className="form-group">
              <label htmlFor="login-email" className="form-label">
                Email address
              </label>
              <div className={styles.inputWrapper}>
                <span className={styles.inputIcon} aria-hidden="true">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="20" height="16" x="2" y="4" rx="2" />
                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                  </svg>
                </span>
                <input
                  id="login-email"
                  name="email"
                  type="email"
                  className={`form-input ${styles.inputWithIcon}`}
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                  disabled={pending}
                />
              </div>
              {state?.fieldErrors?.email && (
                <p className="text-danger text-sm mt-1">{state.fieldErrors.email[0]}</p>
              )}
            </div>

            {/* Password */}
            <div className="form-group">
              <div className={styles.labelRow}>
                <label htmlFor="login-password" className="form-label">
                  Password
                </label>
                <a href="/auth/reset-password" className={styles.forgotLink}>
                  Forgot password?
                </a>
              </div>
              <div className={styles.inputWrapper}>
                <span className={styles.inputIcon} aria-hidden="true">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </span>
                <input
                  id="login-password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  className={`form-input ${styles.inputWithIcon} ${styles.inputWithToggle}`}
                  placeholder="&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;"
                  required
                  autoComplete="current-password"
                  disabled={pending}
                />
                <button
                  type="button"
                  className={styles.passwordToggle}
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
              {state?.fieldErrors?.password && (
                <p className="text-danger text-sm mt-1">{state.fieldErrors.password[0]}</p>
              )}
            </div>

            {/* Submit */}
            <button
              id="login-submit"
              type="submit"
              className={`btn btn-primary btn-full btn-lg ${styles.submitBtn}`}
              disabled={pending}
            >
              {pending ? (
                <>
                  <span className="spinner" />
                  Signing in...
                </>
              ) : (
                "Sign in"
              )}
            </button>
          </form>

          {/* Role indicator */}
          <div className={styles.roles}>
            <p className={styles.rolesLabel}>System Access Levels</p>
            <div className={styles.rolesList}>
              {["Superadmin", "Admin", "Staff", "Coach", "Parent"].map((role) => (
                <span key={role} className="badge badge-secondary">
                  {role}
                </span>
              ))}
            </div>
          </div>

          <p className={styles.footer}>
            &copy; {new Date().getFullYear()} Kingaqua Academy
          </p>
        </div>
      </main>
    </div>
  );
}

