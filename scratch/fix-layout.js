import fs from 'fs';

let text = fs.readFileSync('app/parent/portal/ParentPortalClient.tsx', 'utf8');

// 1. Fix the Header Row
const headerRegex = /<div style=\{\{\s*padding: "16px 20px",\s*borderBottom: "1px solid var\(--border-gray\)",\s*display: "flex", justifyContent: "space-between", alignItems: "center",\s*backgroundColor: isComplete \? "var\(--bg-tint\)" : "transparent"\s*\}\}>/g;
const newHeader = `<div style={{ 
                              padding: "16px 20px", 
                              borderBottom: "1px solid var(--border-gray)",
                              display: "flex", justifyContent: "space-between", alignItems: "center",
                              flexWrap: "wrap", gap: "16px",
                              backgroundColor: isComplete ? "var(--bg-tint)" : "transparent"
                            }}>`;
text = text.replace(headerRegex, newHeader);

// 2. Fix the Accordion Summary Row
const summaryRegex = /<summary className=\{styles\.accordionSummary\} style=\{\{\s*padding: "12px 20px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", outline: "none", userSelect: "none"\s*\}\}>/g;
const newSummary = `<summary className={styles.accordionSummary} style={{ padding: "12px 20px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px", outline: "none", userSelect: "none" }}>`;
text = text.replace(summaryRegex, newSummary);

fs.writeFileSync('app/parent/portal/ParentPortalClient.tsx', text);
console.log('Done');
