import { useState, useRef, useCallback } from "react";
import { format } from "date-fns";
import { Plus, LogIn, LogOut, Download, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { DateNav } from "@/components/DateNav";
import { LocationSwitcher } from "@/components/LocationSwitcher";
import { CalendarView } from "@/components/CalendarView";
import { TimelineView, TimelineViewHandle } from "@/components/TimelineView";
import { BookingModal } from "@/components/BookingModal";
import { ReservationList } from "@/components/ReservationList";
import { DeletedBookingsList } from "@/components/DeletedBookingsList";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useBookings } from "@/hooks/use-bookings";
import { useLocations } from "@/hooks/use-locations";
import { useAuth } from "@/hooks/use-auth";
import { Booking } from "@/lib/booking-data";

const Index = () => {
  const { isLoggedIn, isSuperAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const [date, setDate] = useState(new Date());
  const [view, setView] = useState<"calendar" | "timeline">("timeline");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [exporting, setExporting] = useState(false);
  const [reloading, setReloading] = useState(false);
  const timelineRef = useRef<TimelineViewHandle>(null);

  const { locations, tables, selectedLocationId, setSelectedLocationId } = useLocations();
  const {
    loading,
    deletedBookings,
    getBookingsForDate,
    getDatesWithBookings,
    addBooking,
    updateBooking,
    deleteBooking,
    restoreBooking,
    permanentDeleteBooking,
    toggleSeal,
    refetch,
  } = useBookings();

  const dateStr = format(date, "yyyy-MM-dd");
  const allDayBookings = getBookingsForDate(dateStr);
  const dayBookings = allDayBookings.filter(
    (b) => !selectedLocationId || b.location_id === selectedLocationId
  );
  const dayDeletedBookings = deletedBookings.filter((b) => b.date === dateStr);

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

  const handleExport = async () => {
    if (timelineRef.current) {
      setExporting(true);
      await timelineRef.current.handleExport();
      setExporting(false);
    }
  };

  const handleReload = useCallback(async () => {
    setReloading(true);
    await refetch();
    setReloading(false);
  }, [refetch]);

  return (
    <div className="flex h-dvh flex-col bg-background pt-[env(safe-area-inset-top)]">
      <DateNav date={date} onDateChange={setDate} view={view} onViewChange={setView}>
        <button
          onClick={handleExport}
          disabled={exporting}
          className="flex items-center gap-1 rounded-lg border border-border bg-muted px-2 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent transition-colors disabled:opacity-60"
          title="Export Timeline as PNG"
        >
          {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
          Export
        </button>
        {isLoggedIn ? (
          <button
            onClick={logout}
            className="flex items-center gap-1 rounded-lg border border-border bg-muted px-2 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" />
            Out
          </button>
        ) : (
          <button
            onClick={() => navigate("/login")}
            className="flex items-center gap-1 rounded-lg bg-primary px-2.5 py-1.5 text-xs font-semibold text-primary-foreground shadow-sm transition-transform active:scale-95"
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
        onReload={handleReload}
        reloading={reloading}
      />

      <TimelineView
        ref={timelineRef}
        date={date}
        bookings={dayBookings}
        tables={tables}
        onBookingClick={handleBookingClick}
        loading={loading}
      />

      {/* Reservation list below timeline */}
      <div className="flex-1 min-h-0 border-t border-border overflow-y-auto bg-background">
        <Tabs defaultValue="active" className="w-full">
          <div className="sticky top-0 z-10 bg-card border-b border-border px-4 py-2">
            <TabsList className="h-9">
              <TabsTrigger value="active" className="text-xs">
                Active ({allDayBookings.length})
              </TabsTrigger>
              <TabsTrigger value="deleted" className="text-xs relative">
                Deleted
                {dayDeletedBookings.length > 0 && (
                  <span className="ml-1.5 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
                    {dayDeletedBookings.length}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="active" className="mt-0">
            <ReservationList bookings={allDayBookings} onBookingClick={handleBookingClick} />
          </TabsContent>
          <TabsContent value="deleted" className="mt-0">
            <DeletedBookingsList
              bookings={dayDeletedBookings}
              onRestore={restoreBooking}
              onPermanentDelete={permanentDeleteBooking}
              canRestore={isLoggedIn}
              canPermanentDelete={isSuperAdmin}
            />
          </TabsContent>
        </Tabs>
      </div>

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
