import { useState } from "react";
import { format } from "date-fns";
import { Plus } from "lucide-react";
import { DateNav } from "@/components/DateNav";
import { CalendarView } from "@/components/CalendarView";
import { TimelineView } from "@/components/TimelineView";
import { BookingModal } from "@/components/BookingModal";
import { useBookings } from "@/hooks/use-bookings";
import { Booking } from "@/lib/booking-data";

const Index = () => {
  const [date, setDate] = useState(new Date());
  const [view, setView] = useState<"calendar" | "timeline">("timeline");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);

  const { getBookingsForDate, getDatesWithBookings, addBooking, updateBooking, deleteBooking } =
    useBookings();

  const dateStr = format(date, "yyyy-MM-dd");
  const dayBookings = getBookingsForDate(dateStr);

  const handleSelectCalendarDate = (d: Date) => {
    setDate(d);
    setView("timeline");
  };

  const handleBookingClick = (booking: Booking) => {
    setEditingBooking(booking);
    setModalOpen(true);
  };

  const handleSave = (data: Omit<Booking, "id" | "status">) => {
    if (editingBooking) {
      updateBooking(editingBooking.id, data);
      return;
    }
    return addBooking(data);
  };

  const openNewBooking = () => {
    setEditingBooking(null);
    setModalOpen(true);
  };

  return (
    <div className="flex h-dvh flex-col bg-background">
      <DateNav date={date} onDateChange={setDate} view={view} onViewChange={setView} />

      {view === "calendar" ? (
        <CalendarView
          date={date}
          onSelectDate={handleSelectCalendarDate}
          datesWithBookings={getDatesWithBookings()}
        />
      ) : (
        <TimelineView date={date} bookings={dayBookings} onBookingClick={handleBookingClick} />
      )}

      {/* FAB */}
      <button
        onClick={openNewBooking}
        className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform active:scale-90"
      >
        <Plus className="h-6 w-6" />
      </button>

      <BookingModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        onDelete={deleteBooking}
        booking={editingBooking}
        date={dateStr}
      />
    </div>
  );
};

export default Index;
