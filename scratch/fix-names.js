import fs from 'fs';

let text = fs.readFileSync('app/parent/portal/ParentPortalClient.tsx', 'utf8');

// Insert the helper function right before the component export
text = text.replace(
  'export default function ParentPortalClient',
  `function formatClassName(rawName: string) {
  if (!rawName) return { name: "No Class", code: null };
  const match = rawName.match(/^(.*?)\\s*(\\([^\\)]+\\))\\s*$/);
  if (match) {
    return { name: match[1].trim(), code: match[2].trim() };
  }
  return { name: rawName, code: null };
}

export default function ParentPortalClient`
);

// Replace the tab rendering
const tabOld = /<div style=\{\{ marginBottom: "2px" \}\}>\{child\.classes\?\.name \?\? "No Class"\}<\/div>\s*\{child\.classes\?\.type && <div>\( \{child\.classes\.type\.toUpperCase\(\)\} \)<\/div>\}/g;
const tabNew = `{(() => {
                      const { name, code } = formatClassName(child.classes?.name || "No Class");
                      return (
                        <>
                          <div style={{ marginBottom: "2px" }}>{name}</div>
                          {code && <div style={{ fontSize: "0.7rem", fontWeight: 600 }}>{code}</div>}
                        </>
                      );
                    })()}`;
text = text.replace(tabOld, tabNew);

// Replace the header rendering
const headerOld = /<span className=\{styles\.childClassName\} style=\{\{ display: "flex", flexDirection: "column", gap: "2px" \}\}>\s*<span>\{selectedChild\.classes\?\.name \?\? "Unassigned"\}<\/span>\s*\{selectedChild\.classes\?\.type && \(\s*<span style=\{\{ fontSize: "0\.85rem", fontWeight: 600 \}\}>\s*\( \{selectedChild\.classes\.type\.toUpperCase\(\)\} \)\s*<\/span>\s*\)\}\s*<\/span>/g;
const headerNew = `{(() => {
                      const { name, code } = formatClassName(selectedChild.classes?.name || "Unassigned");
                      return (
                        <span className={styles.childClassName} style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                          <span>{name}</span>
                          {code && (
                            <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>
                              {code}
                            </span>
                          )}
                        </span>
                      );
                    })()}`;
text = text.replace(headerOld, headerNew);

fs.writeFileSync('app/parent/portal/ParentPortalClient.tsx', text);
console.log('Done');
