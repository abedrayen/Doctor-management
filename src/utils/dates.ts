import { format, isAfter, isValid, parseISO, startOfDay } from "date-fns";

/** All dates are stored/exchanged as ISO (`yyyy-MM-dd`, `yyyy-MM-ddTHH:mm`) and displayed as DD/MM/YYYY, 24h. */

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

export const isIsoDate = (value: string) => ISO_DATE.test(value) && isValid(parseISO(value));
export const isTime = (value: string) => TIME.test(value);
export const isFutureDate = (iso: string) => isAfter(startOfDay(parseISO(iso)), startOfDay(new Date()));

export const toIsoDate = (date: Date) => format(date, "yyyy-MM-dd");
export const todayIso = () => toIsoDate(new Date());

const formatWith = (value: string | null | undefined, pattern: string) => {
  if (!value) return "—";
  const date = parseISO(value);
  return isValid(date) ? format(date, pattern) : "—";
};

export const formatDate = (value?: string | null) => formatWith(value, "dd/MM/yyyy");
export const formatDateTime = (value?: string | null) => formatWith(value, "dd/MM/yyyy HH:mm");
export const formatTime = (value?: string | null) => formatWith(value, "HH:mm");

export const joinDateTime = (date: string, time: string) => `${date}T${time}`;
export const splitDateTime = (iso: string) => ({ date: iso.slice(0, 10), time: iso.slice(11, 16) });
export const nowParts = () => splitDateTime(format(new Date(), "yyyy-MM-dd'T'HH:mm"));

/** Mask free typing into `JJ/MM/AAAA`. */
export function maskDate(text: string) {
  const d = text.replace(/\D/g, "").slice(0, 8);
  return [d.slice(0, 2), d.slice(2, 4), d.slice(4)].filter(Boolean).join("/");
}

/** `JJ/MM/AAAA` -> ISO, or null when incomplete/invalid. */
export function frDateToIso(text: string) {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text);
  if (!match) return null;
  const iso = `${match[3]}-${match[2]}-${match[1]}`;
  return isIsoDate(iso) ? iso : null;
}

/** Mask free typing into `HH:mm`. */
export function maskTime(text: string) {
  const d = text.replace(/\D/g, "").slice(0, 4);
  return d.length > 2 ? `${d.slice(0, 2)}:${d.slice(2)}` : d;
}
