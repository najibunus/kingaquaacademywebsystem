import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import {
  CoachPaymentPdfDocument,
  CoachClassGroupSummary,
  CoachClassSessionPdfItem,
} from "@/lib/pdf/CoachPaymentPdf";
import { renderToBuffer } from "@react-pdf/renderer";
import React from "react";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function parseScheduleNotesServer(
  notes: string | null,
  createdAt?: string
): { startTime: string; endTime: string; remarks: string } {
  if (!notes) return { startTime: "", endTime: "", remarks: "" };

  if (notes.trim().startsWith("{")) {
    try {
      const parsed = JSON.parse(notes);
      return {
        startTime: parsed.startTime || "",
        endTime: parsed.endTime || "",
        remarks: parsed.remarks || "",
      };
    } catch {
      // fall through
    }
  }

  if (notes.startsWith("status:")) {
    let start = "";
    let end = "";
    if (createdAt) {
      const d = new Date(createdAt);
      if (!isNaN(d.getTime())) {
        start = `${String(d.getHours()).padStart(2, "0")}:${String(
          d.getMinutes()
        ).padStart(2, "0")}`;
      }
    }
    if (notes.includes("|")) {
      const part = notes.split("|")[1];
      const endD = new Date(part);
      if (!isNaN(endD.getTime())) {
        end = `${String(endD.getHours()).padStart(2, "0")}:${String(
          endD.getMinutes()
        ).padStart(2, "0")}`;
      }
    }
    return { startTime: start, endTime: end, remarks: "" };
  }

  if (notes.startsWith("Class Time:")) {
    return {
      startTime: notes.replace("Class Time:", "").trim(),
      endTime: "",
      remarks: "",
    };
  }

  return { startTime: "", endTime: "", remarks: notes };
}

function formatTime12h(time24: string): string {
  if (!time24) return "";
  const [hStr, mStr] = time24.split(":");
  const h = parseInt(hStr, 10);
  if (isNaN(h)) return time24;
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${mStr || "00"} ${period}`;
}

function formatTimeRange(startTime: string, endTime: string): string {
  if (startTime && endTime) {
    return `${formatTime12h(startTime)} - ${formatTime12h(endTime)}`;
  }
  if (startTime) {
    return formatTime12h(startTime);
  }
  return "Time TBD";
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const coachId = url.searchParams.get("coachId");
    const yearParam = url.searchParams.get("year");
    const monthParam = url.searchParams.get("month"); // 1-12
    const rateParam = url.searchParams.get("rate");
    const forceDownload = url.searchParams.get("download") === "1";

    if (!coachId || !yearParam || !monthParam) {
      return NextResponse.json(
        { error: "Missing required query parameters (coachId, year, month)." },
        { status: 400 }
      );
    }

    const year = parseInt(yearParam, 10);
    const month1 = parseInt(monthParam, 10); // 1 to 12

    if (isNaN(year) || isNaN(month1) || month1 < 1 || month1 > 12) {
      return NextResponse.json(
        { error: "Invalid year or month parameter." },
        { status: 400 }
      );
    }

    const monthLabel = MONTHS[month1 - 1];
    const monthPrefix = `${year}-${String(month1).padStart(2, "0")}`;

    const supabase = await createAdminClient();

    // 1. Fetch Coach Details
    const { data: coachRow, error: coachErr } = await supabase
      .from("users")
      .select("id, auth_id, display_name, phone")
      .eq("id", coachId)
      .single();

    if (coachErr || !coachRow) {
      return NextResponse.json({ error: "Coach not found." }, { status: 404 });
    }

    // 2. Determine Rate Per Class (and persist if provided in query)
    let ratePerClass = 0;
    if (coachRow.auth_id) {
      const { data: authUser } = await supabase.auth.admin.getUserById(
        coachRow.auth_id
      );
      const savedRate = Number(authUser?.user?.user_metadata?.rate_per_class);
      if (!isNaN(savedRate) && savedRate >= 0) {
        ratePerClass = savedRate;
      }

      if (rateParam !== null && rateParam !== "") {
        const parsedOverride = Number(rateParam);
        if (!isNaN(parsedOverride) && parsedOverride >= 0) {
          ratePerClass = parsedOverride;
          if (parsedOverride !== savedRate && authUser?.user) {
            await supabase.auth.admin.updateUserById(coachRow.auth_id, {
              user_metadata: {
                ...(authUser.user.user_metadata || {}),
                rate_per_class: parsedOverride,
              },
            });
          }
        }
      }
    } else if (rateParam !== null && rateParam !== "") {
      const parsedOverride = Number(rateParam);
      if (!isNaN(parsedOverride) && parsedOverride >= 0) {
        ratePerClass = parsedOverride;
      }
    }

    // 3. Fetch Coach Attendance / Schedule Records for the Month
    const startOfMonth = `${monthPrefix}-01`;
    const daysInMonth = new Date(year, month1, 0).getDate();
    const endOfMonth = `${monthPrefix}-${String(daysInMonth).padStart(2, "0")}`;

    const { data: records, error: recErr } = await supabase
      .from("coach_attendance")
      .select(
        `
        id,
        coach_id,
        class_id,
        date,
        status,
        notes,
        created_at,
        classes:class_id(id, name, type, locations(name))
      `
      )
      .eq("coach_id", coachId)
      .gte("date", startOfMonth)
      .lte("date", endOfMonth)
      .order("date", { ascending: true })
      .order("created_at", { ascending: true });

    if (recErr) {
      return NextResponse.json({ error: recErr.message }, { status: 500 });
    }

    const rawRecords = (records as any[]) || [];

    // Sort chronologically by date and startTime
    rawRecords.sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      const nA = parseScheduleNotesServer(a.notes, a.created_at);
      const nB = parseScheduleNotesServer(b.notes, b.created_at);
      return (nA.startTime || "").localeCompare(nB.startTime || "");
    });

    const totalScheduledCount = rawRecords.length;
    const attendedRecords = rawRecords.filter((r) => r.status === "present");
    const attendedClassesCount = attendedRecords.length;
    const absentClassesCount = totalScheduledCount - attendedClassesCount;
    const totalPaymentAmount = attendedClassesCount * ratePerClass;

    // Group attended classes by class_id for Table 1 Summary
    const groupMap = new Map<string, CoachClassGroupSummary>();
    for (const rec of attendedRecords) {
      const cls = rec.classes;
      const key = rec.class_id || cls?.name || "unknown";
      const className = cls?.name || "Swimming Class";
      const classType = cls?.type || "STANDARD";
      const locationName = cls?.locations?.name || undefined;

      const existing = groupMap.get(key);
      if (existing) {
        existing.attendedCount += 1;
        existing.subtotal = existing.attendedCount * ratePerClass;
      } else {
        groupMap.set(key, {
          className,
          locationName,
          classType,
          attendedCount: 1,
          ratePerClass,
          subtotal: ratePerClass,
        });
      }
    }

    const classSummaries = Array.from(groupMap.values());

    // Build detailed session rows for Table 2
    const sessions: CoachClassSessionPdfItem[] = rawRecords.map((rec) => {
      const [y, m, d] = rec.date.split("-").map(Number);
      const dateObj = new Date(y, m - 1, d);
      const dayName = dateObj.toLocaleDateString("en-MY", { weekday: "short" });
      const dateFormatted = dateObj.toLocaleDateString("en-MY", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });

      const { startTime, endTime, remarks } = parseScheduleNotesServer(
        rec.notes,
        rec.created_at
      );
      const cls = rec.classes;

      return {
        dateFormatted,
        dayName,
        timeRange: formatTimeRange(startTime, endTime),
        className: cls?.name || "Swimming Class",
        locationName: cls?.locations?.name || undefined,
        classType: cls?.type || "STANDARD",
        status: rec.status || "present",
        remarks: remarks || undefined,
      };
    });

    const coachName = coachRow.display_name || "Swimming Coach";
    const coachPhone = coachRow.phone || "";
    const shortCoachId = coachRow.id.slice(0, 6).toUpperCase();
    const statementId = `CPS-${year}${String(month1).padStart(2, "0")}-${shortCoachId}`;
    const issueDate = new Date().toLocaleDateString("en-MY", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });

    const doc = React.createElement(CoachPaymentPdfDocument, {
      statementId,
      issueDate,
      monthLabel,
      year,
      coachName,
      coachPhone,
      ratePerClass,
      totalScheduledCount,
      attendedClassesCount,
      absentClassesCount,
      totalPaymentAmount,
      classSummaries,
      sessions,
    });

    const pdfBuffer = await renderToBuffer(doc);

    const safeCoachName = coachName
      .replace(/[^A-Za-z0-9_-]/g, "_")
      .replace(/_+/g, "_");
    const safeFilename = `Coach-Payment-${safeCoachName}-${monthLabel}-${year}.pdf`;

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `${
          forceDownload ? "attachment" : "inline"
        }; filename="${safeFilename}"`,
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (err: any) {
    console.error("[GET /api/coach-payment-pdf] Error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to generate coach payment PDF." },
      { status: 500 }
    );
  }
}
