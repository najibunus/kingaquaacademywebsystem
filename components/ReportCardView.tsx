"use client";

import React, { useState } from "react";
import {
  EVALUATION_LEVELS,
  LEVEL_6_TIME_STANDARDS,
  EvaluationLevel,
} from "@/lib/constants/evaluationCurriculum";

export interface ReportCardProps {
  studentName: string;
  acquiredLevel: number; // 1 to 6 — ONLY this badge is highlighted in full color
  scores: Record<string, number>; // e.g., { "L3_1": 4, "L3_2": 4, ... }
  notes: string;
  customWallpaperUrl?: string | null;
  wallpaperFit?: "cover" | "contain" | "fill";
  sheetOpacity?: number; // 0.8 to 1.0
  customBadges?: Record<number, string>; // optional custom badge image URLs per level 1..6
  interactive?: boolean;
  onSelectLevel?: (level: number) => void;
  onScoreChange?: (criterionId: string, score: number) => void;
  onNotesChange?: (notes: string) => void;
  cardRef?: React.RefObject<HTMLDivElement | null>;
}

/**
 * Opens a clean full-bleed A4 Landscape print/PDF window for the rendered Report Card DOM node.
 */
export function printReportCardElement(element: HTMLElement | null, studentName: string) {
  if (!element || typeof window === "undefined") return;

  const printWin = window.open("", "_blank", "width=1200,height=860");
  if (!printWin) {
    window.print();
    return;
  }

  const safeTitle = `Report_Card_${(studentName || "Student").replace(/\s+/g, "_")}`;
  const cloneHtml = element.outerHTML;

  printWin.document.open();
  printWin.document.write(`<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${safeTitle}</title>
    <style>
      @page {
        size: A4 landscape;
        margin: 0;
      }
      * {
        box-sizing: border-box;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      html, body {
        margin: 0;
        padding: 0;
        width: 1120px;
        height: 792px;
        background: #ffffff;
        font-family: 'Montserrat', 'Inter', 'Segoe UI', Arial, sans-serif;
      }
      #kingaqua-report-card {
        box-shadow: none !important;
        border-radius: 0 !important;
        width: 1120px !important;
        height: 792px !important;
      }
    </style>
  </head>
  <body>
    ${cloneHtml}
    <script>
      window.onload = function() {
        setTimeout(function() {
          window.focus();
          window.print();
        }, 350);
      };
    </script>
  </body>
</html>`);
  printWin.document.close();
}

/**
 * Renders the circular KING AQUA level badge.
 * Uses `/images/badges/level-X-*.png` (or custom uploaded badge) if available,
 * and falls back to a detailed circular KING AQUA vector emblem matching the physical card.
 * ONLY the badge that the student acquires (`isAcquired === true`) is rendered in full color;
 * all other badges are rendered in grayscale.
 */
export function KingAquaBadgeEmblem({
  levelData,
  isAcquired,
  customBadgeUrl,
  size = 82,
  onClick,
  interactive = false,
}: {
  levelData: EvaluationLevel;
  isAcquired: boolean;
  customBadgeUrl?: string;
  size?: number;
  onClick?: () => void;
  interactive?: boolean;
}) {
  const [imgFailed, setImgFailed] = useState(false);
  const srcToTry = customBadgeUrl || levelData.badgeImagePath;

  // Color palette when highlighted vs grayscale
  const ringBg = isAcquired ? "#1e88e5" : "#757575";
  const innerBg = isAcquired ? "#e3f2fd" : "#e5e5e5";

  // Animal mascot colors when highlighted
  const animalColors: Record<number, { primary: string; secondary: string; ring: string }> = {
    1: { primary: "#22c55e", secondary: "#15803d", ring: "#0284c7" }, // Turtle
    2: { primary: "#1e293b", secondary: "#f59e0b", ring: "#0284c7" }, // Penguin
    3: { primary: "#dc2626", secondary: "#f97316", ring: "#0284c7" }, // Octopus (Red/Orange in photo!)
    4: { primary: "#0ea5e9", secondary: "#0369a1", ring: "#0284c7" }, // Dolphin
    5: { primary: "#3b82f6", secondary: "#1d4ed8", ring: "#0284c7" }, // Whale
    6: { primary: "#475569", secondary: "#0f172a", ring: "#0284c7" }, // Shark
  };

  const palette = animalColors[levelData.level] || animalColors[3];

  return (
    <div
      onClick={onClick}
      title={
        interactive
          ? `Click to select ${levelData.title} as Acquired Badge`
          : levelData.title
      }
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: interactive ? "pointer" : "default",
        filter: isAcquired ? "none" : "grayscale(100%)",
        opacity: isAcquired ? 1 : 0.78,
        transform: isAcquired ? "scale(1.05)" : "scale(1)",
        boxShadow: isAcquired
          ? "0 0 0 3px #f59e0b, 0 4px 12px rgba(220, 38, 38, 0.35)"
          : "0 1px 3px rgba(0,0,0,0.18)",
        transition: "all 0.2s ease",
        userSelect: "none",
        flexShrink: 0,
      }}
    >
      {!imgFailed && srcToTry ? (
        <img
          src={srcToTry}
          alt={levelData.title}
          onError={() => setImgFailed(true)}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
            borderRadius: "50%",
            display: "block",
          }}
        />
      ) : (
        <svg
          viewBox="0 0 120 120"
          width={size}
          height={size}
          style={{ display: "block", borderRadius: "50%" }}
        >
          {/* Outer White + Black Border Ring */}
          <circle cx="60" cy="60" r="58" fill="#ffffff" stroke="#111111" strokeWidth="3.5" />
          {/* Colored/Tinted Ring */}
          <circle
            cx="60"
            cy="60"
            r="51"
            fill={isAcquired ? palette.ring : ringBg}
            stroke="#111111"
            strokeWidth="2.5"
          />
          {/* Inner Circle */}
          <circle cx="60" cy="60" r="39" fill={innerBg} stroke="#111111" strokeWidth="2" />

          {/* Top Arc Text: LEVEL X */}
          <rect
            x="33"
            y="6"
            width="54"
            height="14"
            rx="7"
            fill="#ffffff"
            stroke="#111111"
            strokeWidth="1.5"
          />
          <text
            x="60"
            y="16"
            textAnchor="middle"
            fontSize="8.5"
            fontWeight="900"
            fontFamily="Arial, sans-serif"
            fill="#111111"
            letterSpacing="0.5"
          >
            LEVEL {levelData.level}
          </text>

          {/* Gold Crown at Top of Mascot */}
          <polygon
            points="48,30 53,23 60,28 67,23 72,30"
            fill={isAcquired ? "#facc15" : "#9ca3af"}
            stroke="#111111"
            strokeWidth="1.5"
          />

          {/* Animal Mascot Silhouette/Illustration */}
          {levelData.level === 1 && (
            /* Turtle */
            <g>
              <ellipse cx="60" cy="70" rx="22" ry="15" fill={palette.secondary} stroke="#111" strokeWidth="2" />
              <circle cx="60" cy="84" r="7" fill={palette.primary} stroke="#111" strokeWidth="1.8" />
              <circle cx="40" cy="76" r="5" fill={palette.primary} stroke="#111" strokeWidth="1.5" />
              <circle cx="80" cy="76" r="5" fill={palette.primary} stroke="#111" strokeWidth="1.5" />
            </g>
          )}
          {levelData.level === 2 && (
            /* Penguin */
            <g>
              <ellipse cx="60" cy="72" rx="18" ry="18" fill={palette.primary} stroke="#111" strokeWidth="2" />
              <ellipse cx="60" cy="75" rx="11" ry="13" fill="#ffffff" />
              <polygon points="56,67 64,67 60,73" fill={palette.secondary} stroke="#111" strokeWidth="1" />
            </g>
          )}
          {levelData.level === 3 && (
            /* Octopus */
            <g>
              <circle cx="60" cy="68" r="16" fill={palette.primary} stroke="#111" strokeWidth="2" />
              <path
                d="M42,78 Q36,88 45,90 Q52,82 54,88 Q60,95 66,88 Q70,82 75,90 Q84,88 78,78"
                fill={palette.primary}
                stroke="#111"
                strokeWidth="2"
              />
              <circle cx="54" cy="67" r="3" fill="#fff" stroke="#111" strokeWidth="1" />
              <circle cx="66" cy="67" r="3" fill="#fff" stroke="#111" strokeWidth="1" />
            </g>
          )}
          {levelData.level === 4 && (
            /* Dolphin */
            <g>
              <path
                d="M38,76 Q55,55 82,70 Q70,74 78,85 Q60,76 38,76 Z"
                fill={palette.primary}
                stroke="#111"
                strokeWidth="2"
              />
              <polygon points="56,63 63,53 66,64" fill={palette.secondary} stroke="#111" strokeWidth="1.5" />
            </g>
          )}
          {levelData.level === 5 && (
            /* Whale */
            <g>
              <ellipse cx="58" cy="72" rx="22" ry="14" fill={palette.primary} stroke="#111" strokeWidth="2" />
              <path d="M40,74 Q58,84 76,74" fill="#ffffff" stroke="#111" strokeWidth="1.5" />
            </g>
          )}
          {levelData.level === 6 && (
            /* Shark */
            <g>
              <path
                d="M36,74 Q60,56 84,74 Q68,84 36,74 Z"
                fill={palette.primary}
                stroke="#111"
                strokeWidth="2"
              />
              <polygon points="55,63 62,50 67,64" fill={palette.secondary} stroke="#111" strokeWidth="1.8" />
              <path d="M48,74 L52,78 L56,74 L60,78 L64,74" fill="#ffffff" stroke="#111" strokeWidth="1.2" />
            </g>
          )}

          {/* Bold Center Stacked Text: KING AQUA */}
          <text
            x="60"
            y="45"
            textAnchor="middle"
            fontSize="17"
            fontWeight="900"
            fontFamily="Impact, Arial Black, sans-serif"
            fill="#111111"
            stroke="#ffffff"
            strokeWidth="3"
            paintOrder="stroke"
            letterSpacing="0.5"
          >
            KING
          </text>
          <text
            x="60"
            y="61"
            textAnchor="middle"
            fontSize="16"
            fontWeight="900"
            fontFamily="Impact, Arial Black, sans-serif"
            fill="#111111"
            stroke="#ffffff"
            strokeWidth="3"
            paintOrder="stroke"
            letterSpacing="0.5"
          >
            AQUA
          </text>

          {/* Bottom Label: TURTLE / PENGUIN / OCTOPUS / DOLPHIN / WHALE / SHARK */}
          <rect
            x="24"
            y="98"
            width="72"
            height="15"
            rx="7.5"
            fill="#ffffff"
            stroke="#111111"
            strokeWidth="1.8"
          />
          <text
            x="60"
            y="109"
            textAnchor="middle"
            fontSize="9.5"
            fontWeight="900"
            fontFamily="Arial Black, Arial, sans-serif"
            fill="#111111"
            letterSpacing="0.6"
          >
            {levelData.animal}
          </text>
        </svg>
      )}
    </div>
  );
}

/**
 * Renders a single Level block row inside either the Left or Right table column.
 */
function LevelTableBlock({
  levelData,
  isAcquired,
  scores,
  customBadgeUrl,
  interactive,
  onSelectLevel,
  onScoreChange,
}: {
  levelData: EvaluationLevel;
  isAcquired: boolean;
  scores: Record<string, number>;
  customBadgeUrl?: string;
  interactive?: boolean;
  onSelectLevel?: (level: number) => void;
  onScoreChange?: (criterionId: string, score: number) => void;
}) {
  const scales = [5, 4, 3, 2, 1];

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "98px 1fr 125px",
        borderBottom: "1.5px solid #cbd5e1",
        backgroundColor: isAcquired ? "rgba(254, 249, 195, 0.22)" : "transparent",
      }}
    >
      {/* Column 1: Badge */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "8px 4px",
          borderRight: "1.5px solid #cbd5e1",
        }}
      >
        <KingAquaBadgeEmblem
          levelData={levelData}
          isAcquired={isAcquired}
          customBadgeUrl={customBadgeUrl}
          size={78}
          interactive={interactive}
          onClick={() => onSelectLevel?.(levelData.level)}
        />
      </div>

      {/* Column 2: Criteria List (+ Level 6 Time Table) */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          borderRight: "1.5px solid #cbd5e1",
        }}
      >
        <div>
          {levelData.criteria.map((criterion, idx) => (
            <div
              key={criterion.id}
              style={{
                padding: "3.5px 8px",
                fontSize: "10.2px",
                lineHeight: "1.28",
                color: "#0f172a",
                fontWeight: 600,
                borderBottom:
                  idx < levelData.criteria.length - 1 || levelData.hasTimeTable
                    ? "1px solid #e2e8f0"
                    : "none",
                minHeight: "22px",
                display: "flex",
                alignItems: "center",
              }}
            >
              <span>
                {criterion.number}.{criterion.text}
              </span>
            </div>
          ))}
        </div>

        {/* Level 6 Time Standards Sub-Table */}
        {levelData.hasTimeTable && (
          <div style={{ padding: "6px 8px 8px 8px", backgroundColor: "rgba(241, 245, 249, 0.6)" }}>
            <div
              style={{
                textAlign: "center",
                fontSize: "9.5px",
                fontWeight: 700,
                color: "#0f172a",
                marginBottom: "3px",
              }}
            >
              Time:
            </div>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "9.2px",
                color: "#0f172a",
                textAlign: "center",
              }}
            >
              <thead>
                <tr style={{ fontWeight: 700 }}>
                  <th style={{ padding: "1px 3px", textAlign: "left" }}></th>
                  <th style={{ padding: "1px 3px" }}>
                    Freestyle
                    <br />
                    (FR)
                  </th>
                  <th style={{ padding: "1px 3px" }}>
                    Breaststroke
                    <br />
                    (BR)
                  </th>
                  <th style={{ padding: "1px 3px" }}>
                    Backstroke
                    <br />
                    (BK)
                  </th>
                </tr>
              </thead>
              <tbody>
                {LEVEL_6_TIME_STANDARDS.map((row) => (
                  <tr key={row.category}>
                    <td style={{ padding: "1px 3px", fontWeight: 700, textAlign: "left" }}>
                      {row.category}
                    </td>
                    <td style={{ padding: "1px 3px" }}>{row.freestyle}</td>
                    <td style={{ padding: "1px 3px" }}>{row.breaststroke}</td>
                    <td style={{ padding: "1px 3px" }}>{row.backstroke}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Column 3: Scale 5 4 3 2 1 Grid */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
        }}
      >
        {levelData.criteria.map((criterion, idx) => {
          const currentScore = scores[criterion.id] || 0;
          return (
            <div
              key={criterion.id}
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(5, 1fr)",
                flex: levelData.hasTimeTable ? "0 0 auto" : 1,
                minHeight: "22px",
                borderBottom:
                  idx < levelData.criteria.length - 1 || levelData.hasTimeTable
                    ? "1px solid #cbd5e1"
                    : "none",
                backgroundColor: "rgba(226, 232, 240, 0.45)",
              }}
            >
              {scales.map((scaleVal, sIdx) => {
                const isMarked = currentScore === scaleVal;
                return (
                  <div
                    key={scaleVal}
                    onClick={() => {
                      if (interactive && onScoreChange) {
                        onScoreChange(
                          criterion.id,
                          currentScore === scaleVal ? 0 : scaleVal
                        );
                      }
                    }}
                    title={
                      interactive
                        ? `Set score ${scaleVal} for "${criterion.text}"`
                        : undefined
                    }
                    style={{
                      borderRight: sIdx < 4 ? "1px solid #cbd5e1" : "none",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: interactive ? "pointer" : "default",
                      fontWeight: 900,
                      fontSize: "14px",
                      color: "#0f172a",
                      backgroundColor: isMarked
                        ? "rgba(255, 255, 255, 0.75)"
                        : "transparent",
                      userSelect: "none",
                    }}
                  >
                    {isMarked && (
                      <span
                        style={{
                          display: "inline-block",
                          fontWeight: 900,
                          fontSize: "15px",
                          lineHeight: 1,
                          color: "#111111",
                          transform: "rotate(-15deg)",
                        }}
                      >
                        \
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}

        {/* Empty filler grid alongside Level 6 Time Table */}
        {levelData.hasTimeTable && (
          <div
            style={{
              flex: 1,
              display: "grid",
              gridTemplateColumns: "repeat(5, 1fr)",
              backgroundColor: "rgba(226, 232, 240, 0.45)",
            }}
          >
            {scales.map((s, sIdx) => (
              <div
                key={s}
                style={{
                  borderRight: sIdx < 4 ? "1px solid #cbd5e1" : "none",
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Full Landscape KingAqua Academy Report Card Component
 * Matches the uploaded physical report card layout.
 */
export default function ReportCardView({
  studentName,
  acquiredLevel,
  scores,
  notes,
  customWallpaperUrl,
  wallpaperFit = "cover",
  sheetOpacity = 0.93,
  customBadges = {},
  interactive = false,
  onSelectLevel,
  onScoreChange,
  onNotesChange,
  cardRef,
}: ReportCardProps) {
  const leftLevels = EVALUATION_LEVELS.slice(0, 4); // Levels 1, 2, 3, 4
  const rightLevels = EVALUATION_LEVELS.slice(4, 6); // Levels 5, 6
  const scales = [5, 4, 3, 2, 1];

  return (
    <div
      ref={cardRef}
      id="kingaqua-report-card"
      style={{
        width: "1120px",
        minHeight: "792px",
        position: "relative",
        backgroundColor: "#ffffff",
        backgroundImage: customWallpaperUrl ? `url(${customWallpaperUrl})` : undefined,
        backgroundSize: wallpaperFit,
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        fontFamily: "'Montserrat', 'Inter', 'Segoe UI', Arial, sans-serif",
        color: "#0f172a",
        boxSizing: "border-box",
        padding: "24px 48px 26px 36px",
        overflow: "hidden",
        boxShadow: "0 12px 36px rgba(15, 23, 42, 0.16)",
        borderRadius: "4px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
      }}
    >
      {/* ── DEFAULT GRAPHIC SPLATTER WALLPAPER (When no custom wallpaper is uploaded) ── */}
      {!customWallpaperUrl && (
        <svg
          viewBox="0 0 1120 792"
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            pointerEvents: "none",
            zIndex: 0,
          }}
        >
          {/* Top-Left Red & Black Ink Splatter Decoration */}
          <path
            d="M0,0 L290,0 Q260,35 210,28 Q165,22 140,55 Q110,90 65,70 Q35,58 22,120 Q15,175 0,210 Z"
            fill="#7f1d1d"
          />
          <path
            d="M0,0 L180,0 Q150,25 110,18 Q70,12 52,55 Q35,95 0,130 Z"
            fill="#111111"
          />
          <circle cx="220" cy="48" r="9" fill="#991b1b" />
          <circle cx="245" cy="32" r="5" fill="#111111" />
          <circle cx="168" cy="68" r="6" fill="#7f1d1d" />
          <circle cx="48" cy="145" r="11" fill="#991b1b" />
          <circle cx="28" cy="185" r="6" fill="#111111" />

          {/* Bottom-Left Red & Black Splatter */}
          <path
            d="M0,560 Q28,595 18,645 Q12,695 55,725 Q95,750 165,738 Q220,728 265,768 L295,792 L0,792 Z"
            fill="#7f1d1d"
          />
          <path
            d="M0,650 Q25,685 45,730 Q75,765 145,792 L0,792 Z"
            fill="#111111"
          />
          <circle cx="62" cy="690" r="12" fill="#991b1b" />
          <circle cx="95" cy="715" r="7" fill="#111111" />
          <circle cx="195" cy="725" r="14" fill="#7f1d1d" />
          <circle cx="240" cy="742" r="8" fill="#111111" />

          {/* Bottom-Right Red & Black Splatter */}
          <path
            d="M840,792 Q885,745 945,758 Q1010,770 1055,715 Q1088,675 1120,620 L1120,792 Z"
            fill="#7f1d1d"
          />
          <path
            d="M930,792 Q980,760 1035,748 Q1085,735 1120,685 L1120,792 Z"
            fill="#111111"
          />
          <circle cx="890" cy="740" r="10" fill="#991b1b" />
          <circle cx="965" cy="730" r="7" fill="#111111" />
          <circle cx="1055" cy="675" r="12" fill="#991b1b" />
        </svg>
      )}

      {/* ── RIGHT VERTICAL "KING AQUA" WATERMARK ── */}
      <div
        style={{
          position: "absolute",
          right: "-115px",
          top: "52%",
          transform: "translateY(-50%) rotate(90deg)",
          fontSize: "64px",
          fontWeight: 900,
          fontFamily: "Impact, Arial Black, sans-serif",
          color: "rgba(100, 116, 139, 0.22)",
          letterSpacing: "0.08em",
          pointerEvents: "none",
          zIndex: 1,
          whiteSpace: "nowrap",
          lineHeight: 0.9,
          textAlign: "center",
        }}
      >
        KING AQUA
      </div>

      {/* ── TOP HEADER BAR: NAMA & KINGAQUA ACADEMY REPORT CARD BANNER ── */}
      <div
        style={{
          position: "relative",
          zIndex: 2,
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          marginBottom: "10px",
          paddingLeft: "85px",
          paddingRight: "10px",
        }}
      >
        {/* Left: NAMA : [STUDENT NAME] */}
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: "12px",
            flex: 1,
            maxWidth: "560px",
          }}
        >
          <span
            style={{
              fontSize: "15px",
              fontWeight: 900,
              color: "#000000",
              letterSpacing: "0.04em",
              whiteSpace: "nowrap",
            }}
          >
            NAMA :
          </span>
          <div
            style={{
              flex: 1,
              borderBottom: "2.5px solid #111111",
              paddingBottom: "2px",
              fontSize: "16px",
              fontWeight: 900,
              color: "#000000",
              textTransform: "uppercase",
              letterSpacing: "0.03em",
              textAlign: "center",
            }}
          >
            {studentName || "STUDENT NAME"}
          </div>
        </div>

        {/* Right: Emblem + KINGAQUA ACADEMY / REPORT CARD Banners */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            position: "relative",
          }}
        >
          {/* Academy Round Emblem */}
          <div
            style={{
              width: "62px",
              height: "62px",
              borderRadius: "50%",
              backgroundColor: "#ffffff",
              border: "2.5px solid #111111",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 3,
              marginRight: "-14px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
              overflow: "hidden",
            }}
          >
            <img
              src="/logo.png"
              alt="KingAqua Academy"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = "none";
              }}
              style={{ width: "90%", height: "90%", objectFit: "contain" }}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
            <div
              style={{
                backgroundColor: "#6d1b2d",
                color: "#ffffff",
                padding: "5px 28px 5px 26px",
                fontSize: "17px",
                fontWeight: 900,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                lineHeight: 1.1,
              }}
            >
              KINGAQUA ACADEMY
            </div>
            <div
              style={{
                backgroundColor: "#111111",
                color: "#ffffff",
                padding: "4px 22px",
                fontSize: "16px",
                fontWeight: 900,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                lineHeight: 1.1,
                marginTop: "-2px",
                marginRight: "-10px",
              }}
            >
              REPORT CARD
            </div>
          </div>
        </div>
      </div>

      {/* ── MAIN TWO-COLUMN REPORT CARD TABLE ── */}
      <div
        style={{
          position: "relative",
          zIndex: 2,
          backgroundColor: `rgba(255, 255, 255, ${sheetOpacity})`,
          border: "2px solid #94a3b8",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          flex: 1,
        }}
      >
        {/* ══════════ LEFT HALF (LEVELS 1 - 4) ══════════ */}
        <div
          style={{
            borderRight: "2px solid #94a3b8",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Maroon Table Header */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "98px 1fr 125px",
              backgroundColor: "#6d1b2d",
              color: "#ffffff",
              fontWeight: 800,
              fontSize: "12.5px",
              letterSpacing: "0.05em",
              textAlign: "center",
            }}
          >
            <div style={{ padding: "6px 4px", borderRight: "1.5px solid rgba(255,255,255,0.25)" }}>
              BADGE
            </div>
            <div style={{ padding: "6px 8px", borderRight: "1.5px solid rgba(255,255,255,0.25)" }}>
              CRITERIA
            </div>
            <div style={{ padding: "6px 4px" }}>SCALE</div>
          </div>

          {/* Scale Numbers Sub-header (5 4 3 2 1) */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "98px 1fr 125px",
              borderBottom: "1.5px solid #cbd5e1",
              backgroundColor: "#f8fafc",
            }}
          >
            <div style={{ borderRight: "1.5px solid #cbd5e1" }} />
            <div style={{ borderRight: "1.5px solid #cbd5e1" }} />
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(5, 1fr)",
                backgroundColor: "#d1d5db",
                fontWeight: 900,
                fontSize: "11px",
                textAlign: "center",
                color: "#000000",
              }}
            >
              {scales.map((s, idx) => (
                <div
                  key={s}
                  style={{
                    padding: "2px 0",
                    borderRight: idx < 4 ? "1px solid #9ca3af" : "none",
                  }}
                >
                  {s}
                </div>
              ))}
            </div>
          </div>

          {/* Levels 1 to 4 Rows */}
          <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
            {leftLevels.map((lvl) => (
              <LevelTableBlock
                key={lvl.level}
                levelData={lvl}
                isAcquired={acquiredLevel === lvl.level}
                scores={scores}
                customBadgeUrl={customBadges[lvl.level]}
                interactive={interactive}
                onSelectLevel={onSelectLevel}
                onScoreChange={onScoreChange}
              />
            ))}
          </div>
        </div>

        {/* ══════════ RIGHT HALF (LEVELS 5 - 6 + NOTES) ══════════ */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Maroon Table Header */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "98px 1fr 125px",
              backgroundColor: "#6d1b2d",
              color: "#ffffff",
              fontWeight: 800,
              fontSize: "12.5px",
              letterSpacing: "0.05em",
              textAlign: "center",
            }}
          >
            <div style={{ padding: "6px 4px", borderRight: "1.5px solid rgba(255,255,255,0.25)" }}>
              BADGE
            </div>
            <div style={{ padding: "6px 8px", borderRight: "1.5px solid rgba(255,255,255,0.25)" }}>
              CRITERIA
            </div>
            <div style={{ padding: "6px 4px" }}>SCALE</div>
          </div>

          {/* Scale Numbers Sub-header (5 4 3 2 1) */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "98px 1fr 125px",
              borderBottom: "1.5px solid #cbd5e1",
              backgroundColor: "#f8fafc",
            }}
          >
            <div style={{ borderRight: "1.5px solid #cbd5e1" }} />
            <div style={{ borderRight: "1.5px solid #cbd5e1" }} />
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(5, 1fr)",
                backgroundColor: "#d1d5db",
                fontWeight: 900,
                fontSize: "11px",
                textAlign: "center",
                color: "#000000",
              }}
            >
              {scales.map((s, idx) => (
                <div
                  key={s}
                  style={{
                    padding: "2px 0",
                    borderRight: idx < 4 ? "1px solid #9ca3af" : "none",
                  }}
                >
                  {s}
                </div>
              ))}
            </div>
          </div>

          {/* Levels 5 and 6 Rows */}
          <div>
            {rightLevels.map((lvl) => (
              <LevelTableBlock
                key={lvl.level}
                levelData={lvl}
                isAcquired={acquiredLevel === lvl.level}
                scores={scores}
                customBadgeUrl={customBadges[lvl.level]}
                interactive={interactive}
                onSelectLevel={onSelectLevel}
                onScoreChange={onScoreChange}
              />
            ))}
          </div>

          {/* Bottom Notes Box (Matches gray Notes box in photo) */}
          <div
            style={{
              flex: 1,
              minHeight: "86px",
              backgroundColor: "#d1d5db",
              padding: "8px 12px",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              style={{
                fontSize: "11px",
                fontWeight: 700,
                color: "#1e293b",
                marginBottom: "4px",
              }}
            >
              Notes:
            </div>
            {interactive && onNotesChange ? (
              <textarea
                value={notes}
                onChange={(e) => onNotesChange(e.target.value)}
                placeholder="Type evaluation remarks or notes for the student here..."
                style={{
                  flex: 1,
                  width: "100%",
                  background: "rgba(255,255,255,0.65)",
                  border: "1px dashed #64748b",
                  borderRadius: "4px",
                  padding: "6px 8px",
                  fontSize: "11.5px",
                  fontWeight: 600,
                  color: "#0f172a",
                  fontFamily: "inherit",
                  resize: "none",
                  boxSizing: "border-box",
                }}
              />
            ) : (
              <div
                style={{
                  fontSize: "11.5px",
                  fontWeight: 600,
                  color: "#0f172a",
                  lineHeight: 1.4,
                  whiteSpace: "pre-wrap",
                }}
              >
                {notes || ""}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── BOTTOM FOOTER: PRESIDENT SIGNATURE ── */}
      <div
        style={{
          position: "relative",
          zIndex: 2,
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          marginTop: "6px",
          paddingLeft: "6px",
        }}
      >
        <div
          style={{
            backgroundColor: "rgba(255, 255, 255, 0.85)",
            padding: "4px 14px",
            borderRadius: "6px",
            textAlign: "center",
          }}
        >
          {/* Cursive Vector Signature */}
          <svg
            width="150"
            height="34"
            viewBox="0 0 180 42"
            style={{ display: "block", margin: "0 auto -4px auto" }}
          >
            <path
              d="M22,34 C32,10 42,6 44,28 C46,16 56,14 62,26 C68,20 78,20 84,26 C95,8 106,8 102,32 C110,20 124,18 134,26 C144,22 154,20 164,24"
              fill="none"
              stroke="#0f172a"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
            <path
              d="M32,24 L148,20"
              fill="none"
              stroke="#0f172a"
              strokeWidth="1.2"
              strokeLinecap="round"
            />
          </svg>
          <div
            style={{
              fontSize: "13px",
              fontWeight: 800,
              color: "#000000",
              lineHeight: 1.15,
            }}
          >
            Abu Sufian bin Supa&apos;at
          </div>
          <div
            style={{
              fontSize: "11px",
              fontWeight: 500,
              color: "#1e293b",
            }}
          >
            President of KingAqua Academy
          </div>
        </div>
      </div>
    </div>
  );
}
