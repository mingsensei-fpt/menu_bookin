import { useState, useCallback } from "react";
import { Booking, DEMO_BOOKINGS, hasConflict } from "@/lib/booking-data";

export function useBookings() {
  const [bookings, setBookings] = useState<Booking[]>(DEMO_BOOKINGS);

  const getBookingsForDate = useCallback(
    (date: string) => bookings.filter((b) => b.date === date),
    [bookings]
  );

  const getDatesWithBookings = useCallback(() => {
    const dates = new Set(bookings.map((b) => b.date));
    return dates;
  }, [bookings]);

  const addBooking = useCallback(
    (booking: Omit<Booking, "id" | "status">) => {
      const newBooking: Booking = {
        ...booking,
        id: crypto.randomUUID(),
        status: "confirmed",
      };
      const dateBookings = bookings.filter(
        (b) => b.date === booking.date
      );
      const conflict = hasConflict(newBooking, dateBookings);
      if (conflict) newBooking.status = "conflict";
      setBookings((prev) => [...prev, newBooking]);
      return { conflict };
    },
    [bookings]
  );

  const updateBooking = useCallback(
    (id: string, updates: Partial<Omit<Booking, "id">>) => {
      setBookings((prev) => {
        const updated = prev.map((b) => {
          if (b.id !== id) return b;
          const merged = { ...b, ...updates };
          const others = prev.filter((x) => x.id !== id && x.date === merged.date);
          merged.status = hasConflict(merged, others) ? "conflict" : 
            (merged.status === "conflict" ? "confirmed" : merged.status);
          return merged;
        });
        return updated;
      });
    },
    []
  );

  const deleteBooking = useCallback((id: string) => {
    setBookings((prev) => prev.filter((b) => b.id !== id));
  }, []);

  return { bookings, getBookingsForDate, getDatesWithBookings, addBooking, updateBooking, deleteBooking };
}
