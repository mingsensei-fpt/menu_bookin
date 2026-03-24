import { useState, useCallback, useEffect } from "react";
import { Booking, hasConflict } from "@/lib/booking-data";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function useBookings() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBookings = useCallback(async () => {
    const { data, error } = await supabase.from("bookings").select("*");
    if (error) {
      console.error("Failed to fetch bookings:", error);
      toast.error("Failed to load bookings");
      return;
    }
    if (data) {
      setBookings(data as Booking[]);
    }
  }, []);

  useEffect(() => {
    fetchBookings();

    const channel = supabase
      .channel("bookings-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings" }, () => {
        fetchBookings();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchBookings]);

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
        note: booking.note || "",
        date: booking.date,
        status,
      });

      if (error) {
        console.error("Failed to add booking:", error);
        toast.error("Failed to create booking: " + error.message);
        return { conflict: false };
      }

      toast.success(conflict ? "Booking created with conflict" : "Booking created");
      await fetchBookings();
      return { conflict };
    },
    [bookings, fetchBookings]
  );

  const updateBooking = useCallback(
    async (id: string, updates: Partial<Omit<Booking, "id">>) => {
      const current = bookings.find((b) => b.id === id);
      if (!current) return { conflict: false };
      const merged = { ...current, ...updates };
      const others = bookings.filter((x) => x.id !== id && x.date === merged.date);
      const conflict = hasConflict(merged, others);
      const status = conflict ? "conflict" : merged.status === "conflict" ? "confirmed" : merged.status;

      const { error } = await supabase
        .from("bookings")
        .update({
          customer_name: merged.customer_name,
          number_of_people: merged.number_of_people,
          table_ids: merged.table_ids,
          start_time: merged.start_time,
          end_time: merged.end_time,
          note: merged.note || "",
          date: merged.date,
          status,
        })
        .eq("id", id);

      if (error) {
        console.error("Failed to update booking:", error);
        toast.error("Failed to update booking: " + error.message);
        return { conflict: false };
      }

      toast.success("Booking updated");
      await fetchBookings();
      return { conflict };
    },
    [bookings, fetchBookings]
  );

  const deleteBooking = useCallback(async (id: string) => {
    const { error } = await supabase.from("bookings").delete().eq("id", id);
    if (error) {
      console.error("Failed to delete booking:", error);
      toast.error("Failed to delete booking: " + error.message);
      return;
    }
    toast.success("Booking deleted");
    await fetchBookings();
  }, [fetchBookings]);

  return { bookings, getBookingsForDate, getDatesWithBookings, addBooking, updateBooking, deleteBooking };
}
