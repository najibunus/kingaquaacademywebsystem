import fs from 'fs';

let text = fs.readFileSync('app/parent/games/page.tsx', 'utf8');
text = text.replace(/from\(students\)/g, 'from(students).select(id, name, tournament_results(id, stroke, distance, time_record, created_at, tournaments(id, name, date)) as any)');
// actually I'll just rewrite app/parent/games/page.tsx using write_to_file to be safe.
