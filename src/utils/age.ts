import { differenceInDays, differenceInMonths, parseISO } from "date-fns";

export interface Age {
  years: number;
  months: number;
  days: number;
  totalMonths: number;
}

export function computeAge(dob: string | Date, ref: Date = new Date()): Age {
  const birth = typeof dob === "string" ? parseISO(dob) : dob;
  const totalMonths = differenceInMonths(ref, birth);
  return {
    years: Math.floor(totalMonths / 12),
    months: totalMonths % 12,
    days: differenceInDays(ref, birth),
    totalMonths,
  };
}

/** Pediatric age label: days (<1 month), months (<2 years), then years + months. */
export function formatAge(dob: string | Date, ref: Date = new Date()): string {
  const age = computeAge(dob, ref);
  if (age.totalMonths < 1) return `${age.days} ${age.days > 1 ? "jours" : "jour"}`;
  if (age.totalMonths < 24) return `${age.totalMonths} mois`;
  return age.months ? `${age.years} ans ${age.months} mois` : `${age.years} ans`;
}
