"use client";

import { useState, useEffect, useRef } from "react";
import styles from "./import.module.css";
import {
  importStudentsAction,
  getClassesForImport,
} from "@/lib/actions/migration";
import {
  smartParseCSV,
  type ParsedStudent,
  type ParseStats,
} from "@/lib/utils/csvParser";


interface ClassOption {
  id: string;
  name: string;
  type: string;
}

export default function StudentImportPage() {
  // ── State ──────────────────────────────────────────────────────
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [isLoadingClasses, setIsLoadingClasses] = useState(true);
  const [classError, setClassError] = useState<string | null>(null);
  const [classId, setClassId] = useState("");

  const [file, setFile] = useState<File | null>(null);
  const [previewStudents, setPreviewStudents] = useState<ParsedStudent[]>([]);
  const [parseStats, setParseStats] = useState<ParseStats | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Load classes on mount ──────────────────────────────────────
  useEffect(() => {
    setIsLoadingClasses(true);
    getClassesForImport()
      .then(({ classes: c, error }) => {
        if (error) {
          console.error("[ImportPage] Failed to load classes:", error);
          setClassError(error);
          setClasses([]);
        } else {
          console.log("[ImportPage] Loaded classes:", c);
          setClasses(c ?? []);
          setClassError(null);
        }
      })
      .catch((err) => {
        console.error("[ImportPage] Unexpected error loading classes:", err);
        setClassError("Failed to connect to the database.");
        setClasses([]);
      })
      .finally(() => {
        setIsLoadingClasses(false);
      });
  }, []);


  // ── File processing ────────────────────────────────────────────
  const processFile = (selectedFile: File) => {
    if (!selectedFile.name.toLowerCase().endsWith(".csv")) {
      setStatus({ type: "error", message: "Please upload a file ending in .csv" });
      return;
    }
    setFile(selectedFile);
    setStatus(null);
    setPreviewStudents([]);
    setParseStats(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      const csvText = e.target?.result as string;
      if (!csvText) return;
      const result = smartParseCSV(csvText);
      if (result.error) {
        setStatus({ type: "error", message: result.error });
        setFile(null);
      } else {
        setPreviewStudents(result.students ?? []);
        setParseStats(result.stats ?? null);
      }
    };
    reader.readAsText(selectedFile);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) processFile(f);
  };

  // ── Drag events ────────────────────────────────────────────────
  const handleDragEnter = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); };
  const handleDragOver  = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) processFile(f);
  };

  // ── Reset ──────────────────────────────────────────────────────
  const handleReset = () => {
    setFile(null);
    setPreviewStudents([]);
    setParseStats(null);
    setStatus(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ── Submit ─────────────────────────────────────────────────────
  const handleImport = async () => {
    if (!file) return;
    if (!classId) {
      setStatus({ type: "error", message: "Please select a class before importing." });
      return;
    }
    setIsSubmitting(true);
    setStatus(null);
    try {
      const formData = new FormData();
      formData.append("csvFile", file);
      formData.append("classId", classId);
      const result = await importStudentsAction(formData);
      if (result.error) {
        setStatus({ type: "error", message: result.error });
      } else {
        setStatus({
          type: "success",
          message: `✓ Successfully imported ${result.count} student${result.count !== 1 ? "s" : ""} into the selected class!`,
        });
        handleReset();
      }
    } catch {
      setStatus({ type: "error", message: "An unexpected error occurred during import." });
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────
  return (
    <div className="animate-fade-in-up">
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Smart CSV Importer</h1>
          <p className={styles.subtitle}>
            Automatically detects the student list regardless of row/column offset. Supports
            Beginner, Kiddies, Ladies Night, and Men&apos;s formats.
          </p>
        </div>
      </div>

      <div className={styles.importCard}>
        {status && (
          <div
            className={`${styles.statusMessage} ${
              status.type === "success" ? styles.statusSuccess : styles.statusError
            }`}
          >
            {status.message}
          </div>
        )}

        {/* Step 1 — Class Selector */}
        <div className={styles.stepBlock}>
          <p className={styles.stepLabel}>
            <span className={styles.stepNumber}>1</span>
            Select Target Class
          </p>

          {classError && (
            <div className={`${styles.statusMessage} ${styles.statusError}`} style={{marginBottom: "var(--space-3)", padding: "var(--space-3)"}}>
              ⚠ Could not load classes: {classError}
              <br />
              <small>Check the browser console and ensure SUPABASE_SERVICE_ROLE_KEY is set in .env.local</small>
            </div>
          )}


          <select
            className={styles.classSelect}
            value={classId}
            onChange={(e) => setClassId(e.target.value)}
            disabled={isLoadingClasses}
          >
            {isLoadingClasses ? (
              <option value="">Loading classes…</option>
            ) : classes.length === 0 ? (
              <option value="">— No active classes found —</option>
            ) : (
              <>
                <option value="">— Choose a class —</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.type})
                  </option>
                ))}
              </>
            )}
          </select>

          {!isLoadingClasses && classes.length === 0 && !classError && (
            <p className={styles.classNote}>
              No active classes found. Add a class in Supabase (set is_active = true) or use the Classes section.
            </p>
          )}
        </div>


        {/* Step 2 — File Upload */}
        <div className={styles.stepBlock}>
          <p className={styles.stepLabel}>
            <span className={styles.stepNumber}>2</span>
            Upload CSV File
          </p>

          {/* Hidden input wired via label */}
          <input
            ref={fileInputRef}
            id="csvFileInput"
            type="file"
            accept=".csv"
            className={styles.fileInput}
            onChange={handleFileInputChange}
          />
          <label
            htmlFor="csvFileInput"
            className={`${styles.dropzone} ${isDragging ? styles.dropzoneActive : ""}`}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            <svg className={styles.dropzoneIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <div>
              <p className={styles.dropzoneText}>
                {file ? `✓ ${file.name}` : "Click to upload or drag and drop"}
              </p>
              <p className={styles.dropzoneSubtext}>CSV files only</p>
            </div>
          </label>
        </div>

        {/* Requirements */}
        <div className={styles.reqBox}>
          <h4 className={styles.reqTitle}>Smart Parsing Rules</h4>
          <ul className={styles.reqList}>
            <li>Parser scans every row until it finds a cell containing <span className={styles.codeSpan}>STUDENT NAME</span> (case-insensitive).</li>
            <li>The <span className={styles.codeSpan}>CLASS</span> column is auto-detected in the same header row.</li>
            <li>Student data begins <strong>2 rows below</strong> the header row.</li>
            <li>Session count = number of non-empty cells across the 4 class columns.</li>
            <li>IC numbers and parent contacts are <strong>not required</strong>.</li>
          </ul>
        </div>

        {/* Step 3 — Preview & Confirm */}
        {previewStudents.length > 0 && (
          <div className={styles.previewSection}>
            <div className={styles.previewHeader}>
              <h3 className={styles.previewTitle}>
                Preview: {previewStudents.length} students detected
              </h3>
              {parseStats && (
                <div className={styles.parseStatsBadges}>
                  <span className="badge badge-secondary">Header row: {parseStats.headerRowIndex + 1}</span>
                  <span className="badge badge-secondary">Name col: {parseStats.nameIndex + 1}</span>
                  <span className="badge badge-secondary">Class col: {parseStats.classStartIndex + 1}</span>
                </div>
              )}
            </div>

            <div className={styles.tableContainer}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Student Name</th>
                    <th>Sessions</th>
                  </tr>
                </thead>
                <tbody>
                  {previewStudents.map((s, i) => (
                    <tr key={i}>
                      <td className={styles.rowNum}>{i + 1}</td>
                      <td>{s.name}</td>
                      <td>
                        <span
                          className="badge"
                          style={{
                            backgroundColor: s.sessionCount === 4 ? "var(--color-success)" : s.sessionCount === 0 ? "#e5e7eb" : "var(--ka-blue)",
                            color: s.sessionCount === 0 ? "var(--text-secondary)" : "white",
                          }}
                        >
                          {s.sessionCount} / 4
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className={styles.confirmRow}>
              <button className="btn btn-secondary" onClick={handleReset} disabled={isSubmitting}>
                ← Change File
              </button>
              <button
                className="btn btn-primary"
                onClick={handleImport}
                disabled={isSubmitting || !classId}
                title={!classId ? "Select a class first (Step 1)" : ""}
              >
                {isSubmitting
                  ? "Importing…"
                  : `Import ${previewStudents.length} Students`}
              </button>
            </div>

            {!classId && (
              <p className={styles.classNote} style={{ textAlign: "right", marginTop: "0.5rem" }}>
                ⚠ Please select a class in Step 1 before importing.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
