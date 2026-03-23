import { useState, useCallback, useEffect } from "react";
import { Booking, hasConflict } from "@/lib/booking-data";
import { supabase } from "@/integrations/supabase/client";

export function useBookings() {
  const [bookings, setBookings] = useState<Booking[]>([]);

  // Fetch all bookings on mount
  useEffect(() => {
    const fetchBookings = async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("*");
      if (!error && data) {
        setBookings(data.map((b) => ({ ...b, date: b.date })) as Booking[]);
      }
    };
    fetchBookings();

    // Subscribe to realtime changes
    const channel = supabase
      .channel("bookings-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings" }, () => {
        fetchBookings();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const getBookingsForDate = useCallback(
    (date: string) => bookings.filter((b) => b.date === date),
    [bookings]
  );

  const getDatesWithBookings = useCallback(() => {
    return new Set(bookings.map((b) => b.date));
  }, [bookings]);

  const addBooking = useCallback(
    async (booking: Omit<Booking, "id" | "status">) => {
      const dateBookings = bookings.filter((b) => b.date === booking.date);
      const tempBooking = { ...booking, id: "temp", status: "confirmed" as const };
      const conflict = hasConflict(tempBooking, dateBookings);
      const status = conflict ? "conflict" : "confirmed";

      const { error } = await supabase.from("bookings").insert({
        customer_name: booking.customer_name,
        number_of_people: booking.number_of_people,
        table_ids: booking.table_ids,
        start_time: booking.start_time,
        end_time: booking.end_time,
        note: booking.note,
        date: booking.date,
        status,
      });

      return { conflict: !!error ? false : conflict };
    },
    [bookings]
  );

  const updateBooking = useCallback(
    async (id: string, updates: Partial<Omit<Booking, "id">>) => {
      const current = bookings.find((b) => b.id === id);
      if (!current) return;
      const merged = { ...current, ...updates };
      const others = bookings.filter((x) => x.id !== id && x.date === merged.date);
      const conflict = hasConflict(merged, others);
      const status = conflict ? "conflict" : merged.status === "conflict" ? "confirmed" : merged.status;

      await supabase.from("bookings").update({
        ...updates,
        status,
      }).eq("id", id);
    },
    [bookings]
  );

  const deleteBooking = useCallback(async (id: string) => {
    await supabase.from("bookings").delete().eq("id", id);
  }, []);

  return { bookings, getBookingsForDate, getDatesWithBookings, addBooking, updateBooking, deleteBooking };
}
