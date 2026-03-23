export type BookingStatus = "confirmed" | "pending" | "conflict";

export interface Booking {
  id: string;
  customer_name: string;
  number_of_people: number;
  table_ids: string[]; // multiple tables
  start_time: string; // HH:mm
  end_time: string;   // HH:mm
  note: string;
  status: BookingStatus;
  date: string; // YYYY-MM-DD
}

export interface Table {
  id: string;
  capacity: number;
}

export const TABLES: Table[] = Array.from({ length: 10 }, (_, i) => ({
  id: `T${i + 1}`,
  capacity: 2,
}));

export const TIME_SLOTS: string[] = [];
for (let h = 17; h <= 22; h++) {
  for (let m = 0; m < 60; m += 30) {
    if (h === 22 && m > 0) break;
    TIME_SLOTS.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
  }
}

export const SLOT_WIDTH = 80; // px per 30 min

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export function minutesToTime(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function getBookingLeft(startTime: string): number {
  const startMins = timeToMinutes(startTime);
  const originMins = timeToMinutes("17:00");
  return ((startMins - originMins) / 30) * SLOT_WIDTH;
}

export function getBookingWidth(startTime: string, endTime: string): number {
  const startMins = timeToMinutes(startTime);
  const endMins = timeToMinutes(endTime);
  return ((endMins - startMins) / 30) * SLOT_WIDTH;
}

export function hasConflict(booking: Booking, others: Booking[]): boolean {
  return others.some(
    (b) =>
      b.id !== booking.id &&
      b.date === booking.date &&
      b.table_ids.some((tid) => booking.table_ids.includes(tid)) &&
      timeToMinutes(booking.start_time) < timeToMinutes(b.end_time) &&
      timeToMinutes(booking.end_time) > timeToMinutes(b.start_time)
  );
}

export function addHours(time: string, hours: number): string {
  let mins = timeToMinutes(time) + hours * 60;
  if (mins > 22 * 60) mins = 22 * 60;
  return minutesToTime(mins);
}

// Demo data removed — bookings are now stored in the database
