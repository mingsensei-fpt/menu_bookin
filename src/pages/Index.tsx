import { useState } from "react";
import { format } from "date-fns";
import { Plus, LogIn, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { DateNav } from "@/components/DateNav";
import { LocationSwitcher } from "@/components/LocationSwitcher";
import { CalendarView } from "@/components/CalendarView";
import { TimelineView } from "@/components/TimelineView";
import { BookingModal } from "@/components/BookingModal";
import { useBookings } from "@/hooks/use-bookings";
import { useLocations } from "@/hooks/use-locations";
import { useAuth } from "@/hooks/use-auth";
import { Booking } from "@/lib/booking-data";

const Index = () => {
  const { isLoggedIn, logout } = useAuth();
  const navigate = useNavigate();
  const [date, setDate] = useState(new Date());
  const [view, setView] = useState<"calendar" | "timeline">("timeline");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);

  const { locations, tables, selectedLocationId, setSelectedLocationId } = useLocations();
  const { loading, getBookingsForDate, getDatesWithBookings, addBooking, updateBooking, deleteBooking } =
    useBookings();

  const dateStr = format(date, "yyyy-MM-dd");
  // Filter bookings by selected location
  const dayBookings = getBookingsForDate(dateStr).filter(
    (b) => !selectedLocationId || b.location_id === selectedLocationId
  );

  const handleSelectCalendarDate = (d: Date) => {
    setDate(d);
    setView("timeline");
  };

  const handleBookingClick = (booking: Booking) => {
    if (!isLoggedIn) return;
    setEditingBooking(booking);
    setModalOpen(true);
  };

  const handleSave = async (data: Omit<Booking, "id" | "status">) => {
    if (editingBooking) {
      return await updateBooking(editingBooking.id, data);
    }
    return await addBooking({ ...data, location_id: selectedLocationId || undefined });
  };

  const openNewBooking = () => {
    setEditingBooking(null);
    setModalOpen(true);
  };

  return (
    <div className="flex h-dvh flex-col bg-background pt-[env(safe-area-inset-top)]">
      <DateNav date={date} onDateChange={setDate} view={view} onViewChange={setView}>
        {isLoggedIn ? (
          <button
            onClick={logout}
            className="flex items-center gap-1 rounded-lg border border-border bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground hover:bg-accent transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" />
            Logout
          </button>
        ) : (
          <button
            onClick={() => navigate("/login")}
            className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-sm transition-transform active:scale-95"
          >
            <LogIn className="h-3.5 w-3.5" />
            Login
          </button>
        )}
      </DateNav>

      <LocationSwitcher
        locations={locations}
        selectedId={selectedLocationId}
        onChange={setSelectedLocationId}
      />

      <TimelineView
        date={date}
        bookings={dayBookings}
        tables={tables}
        onBookingClick={handleBookingClick}
        loading={loading}
      />

      {view === "calendar" && (
        <CalendarView
          date={date}
          onSelectDate={handleSelectCalendarDate}
          onClose={() => setView("timeline")}
          datesWithBookings={getDatesWithBookings()}
        />
      )}

      {isLoggedIn && (
        <button
          onClick={openNewBooking}
          className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform active:scale-90"
        >
          <Plus className="h-6 w-6" />
        </button>
      )}

      {isLoggedIn && (
        <BookingModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          onSave={handleSave}
          onDelete={deleteBooking}
          booking={editingBooking}
          date={dateStr}
          tables={tables}
        />
      )}
    </div>
  );
};

export default Index;
