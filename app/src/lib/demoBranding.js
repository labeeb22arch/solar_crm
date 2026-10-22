export const PRODUCT_NAME = 'Solar CRM';
// Normalize saved demo wording without modifying stored agreement/signature records.
export function demoBrandText(value) {
  return String(value ?? '').replace(/\bsunpay(?:s)?(?:\s+renewable\s+energy(?:\s+llp)?)?\b/gi, PRODUCT_NAME);
}
