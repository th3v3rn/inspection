import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../lib/supabase";

export const useInspections = (userId: string, userRole: string) => {
  const [inspections, setInspections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isFetchingRef = useRef(false);

  const fetchInspections = useCallback(async () => {
    if (isFetchingRef.current) {
      console.log("Fetch already in progress, skipping...");
      return;
    }

    try {
      isFetchingRef.current = true;
      setLoading(true);
      setError(null);
      
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        console.log("No user found, skipping fetch");
        setInspections([]);
        return;
      }

      console.log("Fetching inspections for user:", user.id);

      // Simplified query - just fetch inspections where inspector_id matches
      const { data, error: fetchError } = await supabase
        .from("inspections")
        .select("*")
        .eq("inspector_id", user.id)
        .order("created_at", { ascending: false });

      if (fetchError) {
        console.error("Error fetching inspections:", fetchError);
        setError(fetchError.message);
        throw fetchError;
      }

      console.log("Fetched inspections:", data?.length || 0);
      setInspections(data || []);
    } catch (err) {
      console.error("Error in fetchInspections:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch inspections");
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, []);

  const createInspection = useCallback(async (inspectionData: any) => {
    try {
      console.log("Creating inspection with data:", inspectionData);
      
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("No user found");
      }

      const { data, error } = await supabase
        .from("inspections")
        .insert({
          ...inspectionData,
          inspector_id: user.id,
        })
        .select()
        .single();

      if (error) {
        console.error("Error creating inspection:", error);
        throw error;
      }

      console.log("Inspection created successfully:", data);
      
      // Refresh inspections list
      await fetchInspections();
      
      return data;
    } catch (err) {
      console.error("Error in createInspection:", err);
      throw err;
    }
  }, [fetchInspections]);

  const updateInspection = useCallback(async (id: string, inspectionData: any) => {
    try {
      console.log("Updating inspection:", id, "with data:", inspectionData);
      
      const { data, error } = await supabase
        .from("inspections")
        .update(inspectionData)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        console.error("Error updating inspection:", error);
        throw error;
      }

      console.log("Inspection updated successfully:", data);
      
      // Refresh inspections list
      await fetchInspections();
      
      return data;
    } catch (err) {
      console.error("Error in updateInspection:", err);
      throw err;
    }
  }, [fetchInspections]);

  const deleteInspection = useCallback(async (id: string) => {
    try {
      console.log("Deleting inspection:", id);
      
      const { error } = await supabase
        .from("inspections")
        .delete()
        .eq("id", id);

      if (error) {
        console.error("Error deleting inspection:", error);
        throw error;
      }

      console.log("Inspection deleted successfully");
      
      await fetchInspections();
    } catch (err) {
      console.error("Error in deleteInspection:", err);
      throw err;
    }
  }, [fetchInspections]);

  useEffect(() => {
    fetchInspections();
  }, [fetchInspections]);

  return {
    inspections,
    loading,
    error,
    refetch: fetchInspections,
    createInspection,
    updateInspection,
    deleteInspection,
  };
};