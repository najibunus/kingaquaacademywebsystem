const VENUE_PRIORITY = ["UTHM", "Pura Kencana", "Pontian"];

export function getVenuePriority(name?: string | null): number {
  if (!name) return 999;
  const upper = name.toUpperCase();
  const idx = VENUE_PRIORITY.findIndex((v) => upper.includes(v.toUpperCase()));
  return idx >= 0 ? idx : 999;
}

export function sortByVenuePriority<T>(
  items: T[],
  getName: (item: T) => string | null | undefined
): T[] {
  return [...items].sort((a, b) => {
    const nameA = getName(a) || "";
    const nameB = getName(b) || "";
    const pA = getVenuePriority(nameA);
    const pB = getVenuePriority(nameB);
    if (pA !== pB) return pA - pB;
    return nameA.localeCompare(nameB);
  });
}

export function sortGroupedByVenue<T>(
  grouped: Record<string, T[]>
): [string, T[]][] {
  return sortByVenuePriority(Object.entries(grouped), ([locName]) => locName);
}

export function groupClassesByVenue<T extends { locations?: { name: string } | null }>(
  classes: T[],
  fallbackLabel = "Other"
): Record<string, T[]> {
  const raw = classes.reduce((acc, cls) => {
    const loc = cls.locations?.name || fallbackLabel;
    if (!acc[loc]) acc[loc] = [];
    acc[loc].push(cls);
    return acc;
  }, {} as Record<string, T[]>);

  const ordered: Record<string, T[]> = {};
  for (const [locName, list] of sortGroupedByVenue(raw)) {
    ordered[locName] = list;
  }
  return ordered;
}
