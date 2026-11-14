export const fullName = (p: { prenom: string; nom: string }) => `${p.prenom} ${p.nom}`.trim();

/** Normalize a phone number to `+216 XX XXX XXX` (Tunisian) or `+<digits>` (other international). */
export function normalizePhone(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  const international = /^(\+|00)/.test(trimmed);
  let digits = trimmed.replace(/\D/g, "").replace(/^00/, "");
  if (digits.startsWith("216") && (international || digits.length === 11)) {
    digits = digits.slice(3);
  } else if (international) {
    return `+${digits}`;
  }
  return digits.length === 8 ? `+216 ${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5)}` : trimmed;
}

export function isValidPhone(raw: string): boolean {
  const phone = normalizePhone(raw);
  return phone === "" || /^\+216 \d{2} \d{3} \d{3}$/.test(phone) || /^\+\d{8,15}$/.test(phone);
}

export const formatPhone = (raw?: string | null) => (raw ? normalizePhone(raw) : "—");

/** Form string -> number (accepts decimal comma), empty -> null. */
export function numOrNull(value: string): number | null {
  const text = value.trim().replace(",", ".");
  return text === "" ? null : Number(text);
}

export const numToStr = (value: number | null | undefined) => (value == null ? "" : String(value).replace(".", ","));

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}
