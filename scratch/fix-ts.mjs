import fs from 'fs';

function replaceAny(filePath) {
  let text = fs.readFileSync(filePath, 'utf8');
  text = text.replace(/\.from\("tournaments"\)/g, '.from("tournaments" as any)');
  text = text.replace(/\.from\("tournament_results"\)/g, '.from("tournament_results" as any)');
  fs.writeFileSync(filePath, text, 'utf8');
}

replaceAny('app/staff/games/page.tsx');
replaceAny('app/parent/games/page.tsx');
replaceAny('lib/actions/games.ts');
console.log('Fixed TS casting.');
