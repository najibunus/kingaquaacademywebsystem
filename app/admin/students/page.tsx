import Link from "next/link";
import styles from "./students.module.css";

export default function AdminStudentsPage() {
  return (
    <div className="animate-fade-in-up">
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Student Management</h1>
          <p className={styles.subtitle}>Search, enroll, and manage all Kingaqua Academy students.</p>
        </div>
        <Link href="/admin/students/import" className="btn btn-primary">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{marginRight: "0.5rem"}}>
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="17 8 12 3 7 8"></polyline>
            <line x1="12" y1="3" x2="12" y2="15"></line>
          </svg>
          Import CSV
        </Link>
      </div>

      {/* Quick Actions */}
      <div className={styles.actionGrid}>
        <Link href="/admin/students/import" className={styles.actionCard}>
          <div className={styles.actionIconWrap}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="17 8 12 3 7 8"></polyline>
              <line x1="12" y1="3" x2="12" y2="15"></line>
            </svg>
          </div>
          <div>
            <h3 className={styles.actionTitle}>Import from CSV</h3>
            <p className={styles.actionDesc}>Bulk-import existing student records from your Excel/CSV file.</p>
          </div>
          <div className={styles.actionArrow}>
            Go to Importer
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
          </div>
        </Link>

        <Link href="/admin/students/new" className={styles.actionCard}>
          <div className={styles.actionIconWrap}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="8.5" cy="7" r="4"></circle>
              <line x1="20" y1="8" x2="20" y2="14"></line>
              <line x1="23" y1="11" x2="17" y2="11"></line>
            </svg>
          </div>
          <div>
            <h3 className={styles.actionTitle}>New Enrolment</h3>
            <p className={styles.actionDesc}>Register a single new student and create their parent account.</p>
          </div>
          <div className={styles.actionArrow}>
            Add Student
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
          </div>
        </Link>

        <Link href="/admin/students/search" className={styles.actionCard}>
          <div className={styles.actionIconWrap}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
          </div>
          <div>
            <h3 className={styles.actionTitle}>Search Students</h3>
            <p className={styles.actionDesc}>Find a student by name, IC number, or class group.</p>
          </div>
          <div className={styles.actionArrow}>
            Search Directory
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
          </div>
        </Link>
      </div>

      {/* Empty State for Student Table */}
      <div className={styles.emptyCard}>
        <svg className={styles.emptyIcon} width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
        <h3 className={styles.emptyTitle}>No Students in the Directory</h3>
        <p className={styles.emptyText}>
          The live student directory will appear here once you connect the database query.
          For now, use the Import CSV tool to migrate your existing student records.
        </p>
        <Link href="/admin/students/import" className="btn btn-primary">
          Go to CSV Importer
        </Link>
      </div>
    </div>
  );
}
