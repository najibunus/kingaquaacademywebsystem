/**
 * Billing logic stubs — Phase 0.
 *
 * Full implementations in Phase 5.
 */

/**
 * 4-Session Invoice Rule
 * Triggers for all classes EXCEPT ADV01.
 *
 * @param currentSessionCount — total present sessions for this student
 * @returns true if an invoice should be generated
 */
export function shouldTrigger4SessionInvoice(currentSessionCount: number): boolean {
  if (currentSessionCount <= 0) return false;
  return currentSessionCount % 4 === 0;
}

/**
 * ADV01 Monthly Rule
 * Invoice is generated on the 1st of each month by cron.
 * This helper checks if today is an ADV01 invoice date.
 */
export function isAdv01InvoiceDay(): boolean {
  return new Date().getDate() === 1;
}
