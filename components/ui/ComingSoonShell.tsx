/**
 * ComingSoonShell — Generic placeholder for dashboard pages.
 * Used in Phase 0 to establish all routes and show the visual shell.
 * Each page will be progressively replaced in Phases 2–7.
 */

interface ComingSoonShellProps {
  role: string;
  phase: number;
  title: string;
  description: string;
  icon: string;
  accentColor?: string;
}

export default function ComingSoonShell({
  role,
  phase,
  title,
  description,
  icon,
  accentColor = "var(--aqua-500)",
}: ComingSoonShellProps) {
  return (
    <div
      style={{
        minHeight: "100dvh",
        background: "var(--bg-app)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "var(--space-6)",
      }}
    >
      <div
        style={{
          textAlign: "center",
          maxWidth: 520,
          animation: "fadeInUp 0.4s ease both",
        }}
      >
        {/* Role badge */}
        <span
          className="badge"
          style={{
            background: `${accentColor}20`,
            color: accentColor,
            border: `1px solid ${accentColor}40`,
            marginBottom: "var(--space-6)",
            display: "inline-flex",
          }}
        >
          🏊 {role} Portal
        </span>

        {/* Icon */}
        <div
          style={{
            fontSize: 72,
            lineHeight: 1,
            marginBottom: "var(--space-6)",
            animation: "float 4s ease-in-out infinite",
          }}
          aria-hidden="true"
        >
          {icon}
        </div>

        {/* Title */}
        <h1
          className="page-title"
          style={{
            fontSize: "var(--text-3xl)",
            marginBottom: "var(--space-3)",
          }}
        >
          {title}
        </h1>

        {/* Description */}
        <p
          className="text-secondary"
          style={{
            fontSize: "var(--text-base)",
            lineHeight: "var(--leading-relaxed)",
            marginBottom: "var(--space-8)",
          }}
        >
          {description}
        </p>

        {/* Phase indicator */}
        <div
          className="card"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "var(--space-3)",
            padding: "var(--space-4) var(--space-6)",
            borderLeft: `4px solid ${accentColor}`,
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: "var(--radius-full)",
              background: `${accentColor}15`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <span style={{ fontSize: 16 }}>⚙️</span>
          </div>
          <div style={{ textAlign: "left" }}>
            <p
              style={{
                fontSize: "var(--text-xs)",
                fontWeight: 700,
                color: accentColor,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                marginBottom: 2,
              }}
            >
              Phase {phase}
            </p>
            <p
              style={{
                fontSize: "var(--text-sm)",
                color: "var(--text-secondary)",
                margin: 0,
              }}
            >
              This section is being built
            </p>
          </div>
        </div>

        {/* Wave decoration */}
        <div style={{ marginTop: "var(--space-10)", opacity: 0.15 }}>
          <svg viewBox="0 0 400 40" style={{ width: "100%" }}>
            <path
              d="M0,20 C50,5 100,35 150,20 C200,5 250,35 300,20 C350,5 400,35 400,20"
              fill="none"
              stroke="var(--aqua-400)"
              strokeWidth="3"
              strokeLinecap="round"
            />
          </svg>
        </div>
      </div>
    </div>
  );
}
