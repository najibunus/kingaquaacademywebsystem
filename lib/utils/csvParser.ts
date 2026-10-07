// ── Shared Smart CSV Parsing Logic ───────────────────────────────────────────
// This is a pure utility module (no "use server" / "use client").
// It can be safely imported by both client components and server actions.

export interface ParsedStudent {
  name: string;
  sessionCount: number;
}

export interface ParseStats {
  headerRowIndex: number;
  nameIndex: number;
  classStartIndex: number;
}

export interface ParseResult {
  students?: ParsedStudent[];
  stats?: ParseStats;
  error?: string;
}

export function smartParseCSV(csvText: string): ParseResult {
  // Split into a 2-D grid; strip surrounding quotes from cells
  const rawLines = csvText.split(/\r?\n/);
  const rows: string[][] = rawLines.map((line) =>
    line.split(",").map((cell) => cell.trim().replace(/^"|"$/g, ""))
  );

  // 1. Scan for the header row containing "STUDENT NAME"
  let headerRowIndex = -1;
  let nameIndex = -1;
  let classStartIndex = -1;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const nameCol = row.findIndex(
      (cell) => cell.replace(/\s+/g, " ").toUpperCase() === "STUDENT NAME"
    );
    if (nameCol !== -1) {
      headerRowIndex = i;
      nameIndex = nameCol;

      // Find the CLASS column in the same header row
      // Accepts: "CLASS", "CLASS 1", "CLASS 2", or any cell starting with "CLASS"
      const classCol = row.findIndex((cell) =>
        cell.toUpperCase().replace(/\s+/g, " ").startsWith("CLASS")
      );
      // Fall back to the column right after STUDENT NAME if CLASS not found
      classStartIndex = classCol !== -1 ? classCol : nameCol + 1;
      break;
    }
  }

  if (headerRowIndex === -1) {
    return {
      error:
        'Could not find a "STUDENT NAME" column header. ' +
        'Ensure one of your CSV rows contains the exact text "STUDENT NAME".',
    };
  }

  // 2. Data starts exactly 2 rows below the header row
  const dataStartIndex = headerRowIndex + 2;
  if (dataStartIndex >= rows.length) {
    return { error: "No data rows found after the header." };
  }

  // 3. Extract students
  const students: ParsedStudent[] = [];
  for (let i = dataStartIndex; i < rows.length; i++) {
    const row = rows[i];
    const name = row[nameIndex]?.trim() ?? "";
    if (!name) continue; // skip blank / spacer rows

    // Count non-empty cells across the 4 class columns
    let sessionCount = 0;
    if (classStartIndex !== -1) {
      for (let j = classStartIndex; j < classStartIndex + 4; j++) {
        if (row[j] !== undefined && row[j].trim() !== "") {
          sessionCount++;
        }
      }
    }

    students.push({ name, sessionCount });
  }

  if (students.length === 0) {
    return { error: "Header row found but no valid student rows detected below it." };
  }

  return {
    students,
    stats: { headerRowIndex, nameIndex, classStartIndex },
  };
}
