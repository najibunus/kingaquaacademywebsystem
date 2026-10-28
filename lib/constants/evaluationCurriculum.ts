export interface LevelCriterion {
  id: string;
  number: number;
  text: string;
}

export interface EvaluationLevel {
  level: number;
  code: string;
  animal: string;
  title: string;
  shortTitle: string;
  accentColor: string;
  secondaryColor: string;
  badgeImagePath: string;
  criteria: LevelCriterion[];
  hasTimeTable?: boolean;
}

export interface TimeStandardRow {
  category: string;
  freestyle: string;
  breaststroke: string;
  backstroke: string;
}

export const LEVEL_6_TIME_STANDARDS: TimeStandardRow[] = [
  { category: "L12", freestyle: "0:40.00", breaststroke: "0:50.00", backstroke: "0:45.00" },
  { category: "P12", freestyle: "0:42.00", breaststroke: "0:52.00", backstroke: "0:47.00" },
  { category: "L15", freestyle: "0:35.00", breaststroke: "0:45.00", backstroke: "0:40.00" },
  { category: "P15", freestyle: "0:37.00", breaststroke: "0:47.00", backstroke: "0:42.00" },
  { category: "L18", freestyle: "0:33.00", breaststroke: "0:42.00", backstroke: "0:38.00" },
  { category: "P18", freestyle: "0:35.00", breaststroke: "0:45.00", backstroke: "0:40.00" },
];

export const EVALUATION_LEVELS: EvaluationLevel[] = [
  {
    level: 1,
    code: "L1",
    animal: "TURTLE",
    title: "Level 1 — King Aqua Turtle",
    shortTitle: "Level 1 (Turtle)",
    accentColor: "#16a34a",
    secondaryColor: "#dcfce7",
    badgeImagePath: "/images/badges/level-1-turtle.png",
    criteria: [
      { id: "L1_1", number: 1, text: "Enter and exit pool correctly." },
      { id: "L1_2", number: 2, text: "Blow bubble with fully submerge." },
      { id: "L1_3", number: 3, text: "Fast bubbling 10 times." },
      { id: "L1_4", number: 4, text: "Back float with aids for at least 10 seconds. Floating correctly." },
      { id: "L1_5", number: 5, text: "Gliding correctly." },
    ],
  },
  {
    level: 2,
    code: "L2",
    animal: "PENGUIN",
    title: "Level 2 — King Aqua Penguin",
    shortTitle: "Level 2 (Penguin)",
    accentColor: "#0284c7",
    secondaryColor: "#e0f2fe",
    badgeImagePath: "/images/badges/level-2-penguin.png",
    criteria: [
      { id: "L2_1", number: 1, text: "Blow bubble using nose for at least 10 seconds." },
      { id: "L2_2", number: 2, text: "Gliding for at least 3 meters." },
      { id: "L2_3", number: 3, text: "Flutter kick with breathing for at least 10 meters." },
      { id: "L2_4", number: 4, text: "Perform back float and front float for at least 10 seconds." },
    ],
  },
  {
    level: 3,
    code: "L3",
    animal: "OCTOPUS",
    title: "Level 3 — King Aqua Octopus",
    shortTitle: "Level 3 (Octopus)",
    accentColor: "#dc2626",
    secondaryColor: "#fee2e2",
    badgeImagePath: "/images/badges/level-3-octopus.png",
    criteria: [
      { id: "L3_1", number: 1, text: "Perform start jump." },
      { id: "L3_2", number: 2, text: "Perform dolphin kick for at least 5 meters." },
      { id: "L3_3", number: 3, text: "Perform 1 big pull." },
      { id: "L3_4", number: 4, text: "Perform breaststroke kick with breathing for at least 10 meters." },
      { id: "L3_5", number: 5, text: "Perform breaststroke pulling with breathing for at least 10 meters." },
      { id: "L3_6", number: 6, text: "Swim breaststroke for at least 10 meters." },
      { id: "L3_7", number: 7, text: "Perform open turn." },
    ],
  },
  {
    level: 4,
    code: "L4",
    animal: "DOLPHIN",
    title: "Level 4 — King Aqua Dolphin",
    shortTitle: "Level 4 (Dolphin)",
    accentColor: "#2563eb",
    secondaryColor: "#dbeafe",
    badgeImagePath: "/images/badges/level-4-dolphin.png",
    criteria: [
      { id: "L4_1", number: 1, text: "Perform start jump." },
      { id: "L4_2", number: 2, text: "Perform dolphin kick for at least 5 meters." },
      { id: "L4_3", number: 3, text: "Side breathing and kicking for at least 5 meters continuously." },
      { id: "L4_4", number: 4, text: "Perform freestyle pulling for at least 10 meters." },
      { id: "L4_5", number: 5, text: "Swim freestyle for at least 10 meters." },
      { id: "L4_6", number: 6, text: "Perform tumble turn." },
    ],
  },
  {
    level: 5,
    code: "L5",
    animal: "WHALE",
    title: "Level 5 — King Aqua Whale",
    shortTitle: "Level 5 (Whale)",
    accentColor: "#7c3aed",
    secondaryColor: "#ede9fe",
    badgeImagePath: "/images/badges/level-5-whale.png",
    criteria: [
      { id: "L5_1", number: 1, text: "Swim freestyle for at least 50 meters correctly." },
      { id: "L5_2", number: 2, text: "Swim breaststroke for at least 50 meters correctly." },
      { id: "L5_3", number: 3, text: "Perform start jump." },
      { id: "L5_4", number: 4, text: "Perform back gliding for at least 5 meters." },
      { id: "L5_5", number: 5, text: "Perform backstroke kicking with breathing for at least 50 meters." },
      { id: "L5_6", number: 6, text: "Perform backstroke pulling with breathing for at least 10 meters." },
      { id: "L5_7", number: 7, text: "Perform tumble turn." },
    ],
  },
  {
    level: 6,
    code: "L6",
    animal: "SHARK",
    title: "Level 6 — King Aqua Shark",
    shortTitle: "Level 6 (Shark)",
    accentColor: "#0f172a",
    secondaryColor: "#e2e8f0",
    badgeImagePath: "/images/badges/level-6-shark.png",
    hasTimeTable: true,
    criteria: [
      {
        id: "L6_1",
        number: 1,
        text: "Swim freestyle, breaststroke and backstroke for at least 50 meters based on time in the diagram below.",
      },
      { id: "L6_2", number: 2, text: "Perform start jump." },
      { id: "L6_3", number: 3, text: "Perform butterfly kicking with breathing for at least 50 meters." },
      { id: "L6_4", number: 4, text: "Perform butterfly pulling with breathing for at least 10 meters." },
      { id: "L6_5", number: 5, text: "Perform tumble turn." },
    ],
  },
];

export interface StructuredEvaluationPayload {
  acquiredLevel: number; // 1 to 6
  scores: Record<string, number>; // e.g., { "L3_1": 4, "L3_2": 4, ... }
  notes: string;
  customCriteriaText?: Record<string, string>; // e.g., { "L1_1": "Personalized text for this student" }
  customWallpaperUrl?: string | null;
  wallpaperFit?: "cover" | "contain" | "fill";
  sheetOpacity?: number;
}

const DELIMITER = "|||";

/**
 * Encodes the structured report card evaluation into `skill_tag` while keeping
 * `skill_tag.split("|||")[0]` as a clean human-readable label (e.g. "Level 3 — King Aqua Octopus").
 */
export function encodeEvaluationSkillTag(payload: StructuredEvaluationPayload): string {
  const levelObj = EVALUATION_LEVELS.find((l) => l.level === payload.acquiredLevel) || EVALUATION_LEVELS[0];
  const jsonPart = JSON.stringify({
    acquiredLevel: payload.acquiredLevel,
    scores: payload.scores,
    customCriteriaText: payload.customCriteriaText || {},
    customWallpaperUrl: payload.customWallpaperUrl || null,
    wallpaperFit: payload.wallpaperFit || "cover",
    sheetOpacity: payload.sheetOpacity !== undefined ? payload.sheetOpacity : 0.93,
  });
  return `${levelObj.title}${DELIMITER}${jsonPart}`;
}

/**
 * Parses an evaluation row from `student_evaluations` into structured report card data.
 * Gracefully handles both new structured evaluations and legacy evaluations.
 */
export function parseEvaluationRecord(ev: {
  id?: string;
  star_rating?: number | null;
  comments?: string | null;
  skill_tag?: string | null;
  created_at?: string;
}): {
  displayLabel: string;
  acquiredLevel: number;
  scores: Record<string, number>;
  customCriteriaText: Record<string, string>;
  notes: string;
  customWallpaperUrl: string | null;
  wallpaperFit: "cover" | "contain" | "fill";
  sheetOpacity: number;
  isStructured: boolean;
} {
  const rawTag = ev.skill_tag || "";
  const rawComments = ev.comments || "";

  if (rawTag.includes(DELIMITER)) {
    const [label, jsonStr] = rawTag.split(DELIMITER);
    try {
      const parsed = JSON.parse(jsonStr);
      const level = Number(parsed.acquiredLevel) || 1;
      const scores = parsed.scores && typeof parsed.scores === "object" ? parsed.scores : {};
      const customCriteriaText =
        parsed.customCriteriaText && typeof parsed.customCriteriaText === "object"
          ? parsed.customCriteriaText
          : {};
      return {
        displayLabel: label || `Level ${level}`,
        acquiredLevel: level,
        scores,
        customCriteriaText,
        notes: rawComments,
        customWallpaperUrl: parsed.customWallpaperUrl || null,
        wallpaperFit: parsed.wallpaperFit || "cover",
        sheetOpacity: typeof parsed.sheetOpacity === "number" ? parsed.sheetOpacity : 0.93,
        isStructured: true,
      };
    } catch {
      // Fallback if JSON is malformed
    }
  }

  // Fallback for legacy evaluations
  const matchedLevel = EVALUATION_LEVELS.find(
    (l) =>
      rawTag.toLowerCase().includes(l.animal.toLowerCase()) ||
      rawTag.toLowerCase().includes(`level ${l.level}`)
  );
  const acquiredLevel = matchedLevel ? matchedLevel.level : 1;
  const fallbackRating = ev.star_rating && ev.star_rating >= 1 && ev.star_rating <= 5 ? ev.star_rating : 4;
  const levelCriteria = EVALUATION_LEVELS.find((l) => l.level === acquiredLevel)?.criteria || [];
  const defaultScores: Record<string, number> = {};
  levelCriteria.forEach((c) => {
    defaultScores[c.id] = fallbackRating;
  });

  return {
    displayLabel: rawTag || "Level 1 — King Aqua Turtle",
    acquiredLevel,
    scores: defaultScores,
    customCriteriaText: {},
    notes: rawComments,
    customWallpaperUrl: null,
    wallpaperFit: "cover",
    sheetOpacity: 0.93,
    isStructured: false,
  };
}
