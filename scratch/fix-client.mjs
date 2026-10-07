import fs from 'fs';
import path from 'path';

const p = path.resolve('app/parent/portal/ParentPortalClient.tsx');
let text = fs.readFileSync(p, 'utf8');

const regex = /\{blocks\.map\(\(block, idx\) => \{[\s\S]*?<div style=\{\{ padding: "16px 20px", backgroundColor: "var\(--bg-light\)" \}\}>/;

const newBlock = `{blocks.map((block, idx) => {
                        const classNamesStr = Array.from(block.classNames).join(" → ") || "Unknown Class";
                        const showDivider = idx > 0 && classNamesStr !== Array.from(blocks[idx - 1].classNames).join(" → ");
                        
                        const isStandard = block.type === "standard";
                        const isComplete = isStandard ? block.presentCount === 4 : false;
                        const isAdvComplete = !isStandard && block.presentCount >= 6;
                        const showPayButton = (block.invoice && block.invoice.payment_status === "unpaid") ||
                                              ((isStandard && isComplete || isAdvComplete) && (!block.invoice || block.invoice.payment_status === "unpaid"));
                        
                        return (
                          <div key={block.id} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                            {showDivider && (
                              <div style={{ 
                                display: "flex", 
                                alignItems: "center", 
                                gap: "12px",
                                margin: "8px 0" 
                              }}>
                                <div style={{ flex: 1, height: "1px", backgroundColor: "var(--border-gray)" }}></div>
                                <span style={{ fontSize: "0.75rem", fontWeight: "bold", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Class Transition</span>
                                <div style={{ flex: 1, height: "1px", backgroundColor: "var(--border-gray)" }}></div>
                              </div>
                            )}
                            <details className="card" style={{ padding: 0, margin: 0, overflow: "hidden" }} open={idx === 0}>
                              <summary style={{
                                padding: "20px", 
                                cursor: "pointer", 
                                listStyle: "none",
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                borderBottom: "1px solid var(--border-gray)",
                                backgroundColor: ((isStandard && isComplete) || isAdvComplete) ? "var(--ka-white)" : "var(--bg-tint)"
                              }}>
                                <div>
                                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                                    <h4 style={{ margin: 0, fontSize: "1.1rem" }}>
                                      {isStandard ? \`Package \${block.pkgIndex}\` : \`\${block.monthKey} (Advance)\`}
                                    </h4>
                                    {block.invoice && (
                                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                        <span className="badge" style={{
                                          fontSize: "0.7rem", padding: "2px 6px",
                                          backgroundColor: block.invoice.payment_status === "confirmed_paid" ? "var(--color-success)" : 
                                                           block.invoice.payment_status === "unpaid" ? "var(--color-danger)" : "var(--color-warning)",
                                          color: "white", textTransform: "uppercase"
                                        }}>
                                          {block.invoice.payment_status === "confirmed_paid" ? "Paid" : 
                                           block.invoice.payment_status === "unpaid" ? "Unpaid" : "Pending Verification"}
                                        </span>
                                        {block.invoice.payment_status === "confirmed_paid" && block.invoice.payment_date && (
                                          <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", fontWeight: 500 }}>
                                            (Paid on {new Date(block.invoice.payment_date).toLocaleDateString("en-MY", { day: 'numeric', month: 'short', year: 'numeric' })})
                                          </span>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                  <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                                    {isStandard ? (
                                      <span style={{ 
                                        fontSize: "0.85rem", 
                                        color: isComplete ? "var(--color-success)" : "var(--ka-blue)",
                                        fontWeight: "bold"
                                      }}>
                                        {block.presentCount} / 4 Sessions Completed
                                      </span>
                                    ) : (
                                      <span style={{ 
                                        fontSize: "0.85rem", 
                                        color: isAdvComplete ? "var(--color-success)" : "var(--color-warning)",
                                        fontWeight: "bold"
                                      }}>
                                        {block.presentCount} Sessions • Est. Fee: RM {getAdvanceFee(block.presentCount)}
                                      </span>
                                    )}
                                    <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)", backgroundColor: "var(--bg-light)", padding: "2px 8px", borderRadius: "4px" }}>
                                      {classNamesStr}
                                    </span>
                                  </div>
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                  {showPayButton && (
                                    <Link 
                                      href="/parent/invoices" 
                                      onClick={(e) => e.stopPropagation()} 
                                      style={{
                                        backgroundColor: "var(--ka-blue)",
                                        color: "white",
                                        padding: "6px 12px",
                                        borderRadius: "6px",
                                        fontSize: "0.85rem",
                                        fontWeight: "bold",
                                        textDecoration: "none",
                                        boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
                                      }}
                                    >
                                      Pay
                                    </Link>
                                  )}
                                  <div style={{
                                    width: "32px", height: "32px", 
                                    borderRadius: "50%", 
                                    backgroundColor: "var(--bg-light)",
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                    color: "var(--text-secondary)"
                                  }}>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
                                  </div>
                                </div>
                              </summary>
                              
                              <div style={{ padding: "16px 20px", backgroundColor: "var(--bg-light)" }}>`;

if (!regex.test(text)) {
  console.log('Regex did not match.');
  process.exit(1);
}

const newContent = text.replace(regex, newBlock);
fs.writeFileSync(p, newContent, 'utf8');
console.log('Successfully fixed ParentPortalClient.tsx');
