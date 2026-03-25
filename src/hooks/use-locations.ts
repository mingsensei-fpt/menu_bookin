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

  const fetchLocations = useCallback(async () => {
    const { data, error } = await supabase
      .from("locations")
      .select("*")
      .order("name");
    if (!error && data) {
      setLocations(data as Location[]);
      if (!selectedLocationId && data.length > 0) {
        setSelectedLocationId(data[0].id);
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
