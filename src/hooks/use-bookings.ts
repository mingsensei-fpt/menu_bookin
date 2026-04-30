import { useState, useCallback, useEffect } from "react";
import { Booking, hasConflict } from "@/lib/booking-data";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface DeletedBooking extends Booking {
  deleted_at: string;
  deleted_by_ip: string | null;
  history_id: string;
}

async function getClientIp(): Promise<string | null> {
  try {
    const res = await fetch("https://api.ipify.org?format=json");
    if (!res.ok) return null;
    const data = await res.json();
    return data.ip ?? null;
  } catch {
    return null;
  }
}

export function useBookings() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [deletedBookings, setDeletedBookings] = useState<DeletedBooking[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    // Active bookings (del_flg = false)
    const activeQuery = supabase
      .from("bookings")
      .select("*")
      .eq("del_flg", false);
    // Deleted bookings (del_flg = true) joined with history for IP / timestamp
    const deletedQuery = supabase
      .from("bookings")
      .select("*")
      .eq("del_flg", true);
    const historyQuery = supabase
      .from("booking_delete_history")
      .select("*")
      .order("deleted_at", { ascending: false });

    const [activeRes, deletedRes, historyRes] = await Promise.all([
      activeQuery,
      deletedQuery,
      historyQuery,
    ]);

    if (activeRes.error) {
      console.error("Failed to fetch bookings:", activeRes.error);
      toast.error("Failed to load bookings");
    } else if (activeRes.data) {
      setBookings(activeRes.data as Booking[]);
    }

    if (deletedRes.error || historyRes.error) {
      console.error("Failed to fetch deleted bookings:", deletedRes.error || historyRes.error);
    } else if (deletedRes.data && historyRes.data) {
      // Latest history entry per booking_id
      const latestByBooking = new Map<string, { id: string; deleted_at: string; deleted_by_ip: string | null }>();
      for (const h of historyRes.data as any[]) {
        if (!latestByBooking.has(h.booking_id)) {
          latestByBooking.set(h.booking_id, {
            id: h.id,
            deleted_at: h.deleted_at,
            deleted_by_ip: h.deleted_by_ip,
          });
        }
      }
      const merged: DeletedBooking[] = (deletedRes.data as any[]).map((b) => {
        const h = latestByBooking.get(b.id);
        return {
          ...(b as Booking),
          deleted_at: h?.deleted_at ?? b.updated_at ?? "",
          deleted_by_ip: h?.deleted_by_ip ?? null,
          history_id: h?.id ?? "",
        };
      });
      // Sort by deleted_at desc
      merged.sort((a, b) => (b.deleted_at || "").localeCompare(a.deleted_at || ""));
      setDeletedBookings(merged);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchBookings();

    const channel = supabase
      .channel("bookings-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings" }, () => {
        fetchBookings();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "booking_delete_history" }, () => {
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
    async (booking: Omit<Booking, "id" | "status"> & { location_id?: string }) => {
      const dateBookings = bookings.filter((b) => b.date === booking.date);

      // Deduplication: prevent identical booking (same name, date, time, tables, location) being created twice
      const sortedTableIds = [...booking.table_ids].sort().join(",");
      const duplicate = dateBookings.find(
        (b) =>
          b.customer_name.trim().toLowerCase() === booking.customer_name.trim().toLowerCase() &&
          b.start_time === booking.start_time &&
          b.end_time === booking.end_time &&
          (b.location_id || null) === (booking.location_id || null) &&
          [...b.table_ids].sort().join(",") === sortedTableIds
      );
      if (duplicate) {
        toast.error("Duplicate booking — this booking already exists");
        return { conflict: false };
      }

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
        location_id: booking.location_id || null,
        del_flg: false,
      } as any);

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
      if (!current) {
        toast.error("Cannot update a deleted booking");
        return { conflict: false };
      }
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
        .eq("id", id)
        .eq("del_flg", false);

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
    // Soft delete: set del_flg = true and log history entry
    const ip = await getClientIp();

    const { error: updErr } = await supabase
      .from("bookings")
      .update({ del_flg: true } as any)
      .eq("id", id);

    if (updErr) {
      console.error("Failed to delete booking:", updErr);
      toast.error("Failed to delete booking: " + updErr.message);
      return;
    }

    const { error: histErr } = await supabase
      .from("booking_delete_history")
      .insert({ booking_id: id, deleted_by_ip: ip } as any);

    if (histErr) {
      console.error("Failed to log delete history:", histErr);
      // Non-fatal — booking is already soft-deleted
    }

    toast.success("Booking deleted");
    await fetchBookings();
  }, [fetchBookings]);

  const restoreBooking = useCallback(async (id: string) => {
    const { error } = await supabase
      .from("bookings")
      .update({ del_flg: false } as any)
      .eq("id", id);

    if (error) {
      console.error("Failed to restore booking:", error);
      toast.error("Failed to restore booking: " + error.message);
      return;
    }

    toast.success("Booking restored");
    await fetchBookings();
  }, [fetchBookings]);

  // Super-admin only: hard-delete booking + its history rows
  const permanentDeleteBooking = useCallback(async (id: string) => {
    // Delete history first (FK-less but conceptually related)
    const { error: histErr } = await supabase
      .from("booking_delete_history")
      .delete()
      .eq("booking_id", id);
    if (histErr) {
      console.error("Failed to delete history:", histErr);
    }
    const { error } = await supabase.from("bookings").delete().eq("id", id);
    if (error) {
      console.error("Failed to permanently delete booking:", error);
      toast.error("Failed to permanently delete: " + error.message);
      return;
    }
    toast.success("Booking permanently deleted");
    await fetchBookings();
  }, [fetchBookings]);

  // Toggle "sealed" state. Sealing requires admin; un-sealing requires super_admin (enforced by RLS).
  const toggleSeal = useCallback(
    async (id: string, seal: boolean, currentUserId: string | null) => {
      const payload = seal
        ? { is_sealed: true, sealed_at: new Date().toISOString(), sealed_by: currentUserId }
        : { is_sealed: false, sealed_at: null, sealed_by: null };
      const { error } = await supabase
        .from("bookings")
        .update(payload as any)
        .eq("id", id);
      if (error) {
        console.error("Failed to toggle seal:", error);
        toast.error((seal ? "Failed to seal: " : "Failed to unseal: ") + error.message);
        return false;
      }
      toast.success(seal ? "Booking sealed 🔒" : "Booking unsealed 🔓");
      await fetchBookings();
      return true;
    },
    [fetchBookings]
  );

  return {
    bookings,
    deletedBookings,
    loading,
    getBookingsForDate,
    getDatesWithBookings,
    addBooking,
    updateBooking,
    deleteBooking,
    restoreBooking,
    permanentDeleteBooking,
    toggleSeal,
    refetch: fetchBookings,
  };
}
