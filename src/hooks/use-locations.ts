import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Location {
  id: string;
  name: string;
  table_prefix: string;
}

export interface RestaurantTable {
  id: string;
  location_id: string;
  table_name: string;
  capacity: number;
  sort_order: number;
}

export function useLocations() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const LOCATION_ORDER = ["Terrace", "Roma", "Verona", "Sorrento"];

  const fetchLocations = useCallback(async () => {
    const { data, error } = await supabase
      .from("locations")
      .select("*");
    if (!error && data) {
      const sorted = [...(data as Location[])].sort((a, b) => {
        const ai = LOCATION_ORDER.indexOf(a.name);
        const bi = LOCATION_ORDER.indexOf(b.name);
        return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
      });
      setLocations(sorted);
      if (!selectedLocationId && sorted.length > 0) {
        setSelectedLocationId(sorted[0].id);
      }
    }
  }, [selectedLocationId]);

  const fetchTables = useCallback(async () => {
    if (!selectedLocationId) return;
    const { data, error } = await supabase
      .from("restaurant_tables")
      .select("*")
      .eq("location_id", selectedLocationId)
      .order("sort_order");
    if (!error && data) {
      setTables(data as RestaurantTable[]);
    }
  }, [selectedLocationId]);

  useEffect(() => {
    setLoading(true);
    fetchLocations().finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (selectedLocationId) {
      fetchTables();
    }
  }, [selectedLocationId, fetchTables]);

  const tablesForTimeline = tables.map((t) => ({
    id: t.table_name,
    capacity: t.capacity,
  }));

  return {
    locations,
    tables: tablesForTimeline,
    selectedLocationId,
    setSelectedLocationId,
    loading,
  };
}
