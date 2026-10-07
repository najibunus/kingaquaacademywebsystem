const fs = require('fs');

const path = 'app/parent/portal/ParentPortalClient.tsx';
let text = fs.readFileSync(path, 'utf8');

// 1. Extract the Evaluation Block
const evalStart = text.indexOf('{/* ⭐️ Evaluations (if any) ⭐️ */}');
if (evalStart === -1) {
  console.log("Evaluation block not found!");
  process.exit(1);
}

// 2. Find where the evaluation block ends. It's the `)}` before `<h3 style={{ fontSize: "1.25rem", margin: "0 0 16px 0"`
const nextSectionStart = text.indexOf('<h3 style={{ fontSize: "1.25rem", margin: "0 0 16px 0"');
if (nextSectionStart === -1) {
  console.log("Next section not found!");
  process.exit(1);
}

// 3. Extract the evaluation string exactly
const evalBlock = text.substring(evalStart, nextSectionStart);

// 4. Remove it from its original location
text = text.substring(0, evalStart) + text.substring(nextSectionStart);

// 5. Change its margin so it looks good at the bottom
let newEvalBlock = evalBlock.replace('marginBottom: "32px"', 'marginTop: "32px", marginBottom: "0"');

// 6. Find the end of the class progress block
// The class progress block is an IIFE `{(() => { ... })()}`
const classProgressEnd = text.indexOf('})()}');
if (classProgressEnd === -1) {
  console.log("End of class progress not found!");
  process.exit(1);
}

// Insert it right after the class progress block
const insertIndex = classProgressEnd + '})()}'.length;
text = text.substring(0, insertIndex) + '\n\n                ' + newEvalBlock + text.substring(insertIndex);

fs.writeFileSync(path, text);
console.log("Successfully moved!");
