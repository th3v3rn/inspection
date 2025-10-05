import { useState, useEffect, useCallback } from 'react';
import { supabase, type Database } from '../lib/supabase';

type Inspection = Database['public']['Tables']['inspections']['Row'];
type InspectionInsert = Database['public']['Tables']['inspections']['Insert'];
type InspectionUpdate = Database['public']['Tables']['inspections']['Update'];

// Mock data for development and testing
const MOCK_INSPECTIONS: Inspection[] = [
  {
    id: '1',
    address: '123 Main St, Anytown, USA',
    date: new Date().toISOString(),
    status: 'incomplete',
    sync_status: 'synced',
    categories: {
      exterior: true,
      interior: false,
      hvac: false,
      plumbing: false,
      electrical: false,
      hazards: false,
      other: false
    },
    inspector_id: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: '2',
    address: '456 Oak Ave, Springfield, USA',
    date: new Date().toISOString(),
    status: 'complete',
    sync_status: 'synced',
    categories: {
      exterior: true,
      interior: true,
      hvac: true,
      plumbing: true,
      electrical: true,
      hazards: false,
      other: false
    },
    inspector_id: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

export const useInspections = () => {
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch all inspections - use useCallback to prevent infinite loops
  const fetchInspections = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Check if Supabase is properly configured
      if (!supabase) {
        console.warn('Supabase client not available, using mock data');
        setInspections(MOCK_INSPECTIONS);
        setLoading(false);
        return;
      }
      
      // Try to fetch from Supabase
      const { data, error } = await supabase
        .from('inspections')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Falling back to mock data due to error:', error.message);
        setInspections(MOCK_INSPECTIONS);
      } else {
        console.log('Fetched inspections:', data);
        setInspections(data || MOCK_INSPECTIONS);
      }
    } catch (err) {
      console.error('Error fetching inspections:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
      setInspections(MOCK_INSPECTIONS);
    } finally {
      setLoading(false);
    }
  }, []); // Empty dependency array since this function doesn't depend on any props or state

  // Get inspection by ID - use useCallback
  const getInspectionById = useCallback(async (id: string) => {
    try {
      setLoading(true);
      
      if (!supabase) {
        const mockInspection = MOCK_INSPECTIONS.find(insp => insp.id === id);
        setLoading(false);
        return mockInspection || null;
      }
      
      const { data, error } = await supabase
        .from('inspections')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        const mockInspection = MOCK_INSPECTIONS.find(insp => insp.id === id);
        return mockInspection || null;
      }
      
      console.log('Fetched inspection by ID:', data);
      return data;
    } catch (err) {
      console.error('Error fetching inspection by ID:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch inspection');
      
      const mockInspection = MOCK_INSPECTIONS.find(insp => insp.id === id);
      return mockInspection || null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Create new inspection
  const createInspection = async (inspection: any) => {
    try {
      console.log('Creating inspection with data:', inspection);
      
      const formattedCategories = {
        exterior: Object.keys(inspection.categories?.Exterior || {}).length > 0,
        interior: Object.keys(inspection.categories?.Interior || {}).length > 0,
        hvac: Object.keys(inspection.categories?.HVAC || {}).length > 0,
        plumbing: Object.keys(inspection.categories?.Plumbing || {}).length > 0,
        electrical: Object.keys(inspection.categories?.Electrical || {}).length > 0,
        hazards: Object.keys(inspection.categories?.Hazards || {}).length > 0,
        other: Object.keys(inspection.categories?.Other || {}).length > 0
      };
      
      const insertData = {
        address: inspection.address,
        date: inspection.date || new Date().toISOString(),
        status: inspection.status || 'incomplete',
        sync_status: inspection.sync_status || 'synced',
        categories: formattedCategories
      };
      
      console.log('Formatted data for insertion:', insertData);
      
      if (!supabase) {
        const mockInspection = {
          id: `mock-${Date.now()}`,
          ...insertData,
          inspector_id: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        } as Inspection;
        
        setInspections(prev => [mockInspection, ...prev]);
        return mockInspection;
      }
      
      const { data, error } = await supabase
        .from('inspections')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.error('Supabase error:', error);
        
        const mockInspection = {
          id: `mock-${Date.now()}`,
          ...insertData,
          inspector_id: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        } as Inspection;
        
        setInspections(prev => [mockInspection, ...prev]);
        return mockInspection;
      }
      
      console.log('Successfully created inspection:', data);
      setInspections(prev => [data, ...prev]);
      return data;
    } catch (err) {
      console.error('Error creating inspection:', err);
      setError(err instanceof Error ? err.message : 'Failed to create inspection');
      
      const mockInspection = {
        id: `mock-${Date.now()}`,
        address: inspection.address,
        date: inspection.date || new Date().toISOString(),
        status: inspection.status || 'incomplete',
        sync_status: 'not-synced',
        categories: {
          exterior: false,
          interior: false,
          hvac: false,
          plumbing: false,
          electrical: false,
          hazards: false,
          other: false
        },
        inspector_id: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      } as Inspection;
      
      setInspections(prev => [mockInspection, ...prev]);
      return mockInspection;
    }
  };

  // Update inspection
  const updateInspection = async (id: string, updates: InspectionUpdate) => {
    try {
      if (!supabase) {
        const updatedInspections = inspections.map(inspection => 
          inspection.id === id 
            ? { ...inspection, ...updates, updated_at: new Date().toISOString() } 
            : inspection
        );
        setInspections(updatedInspections);
        return updatedInspections.find(i => i.id === id) || null;
      }
      
      const { data, error } = await supabase
        .from('inspections')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        const updatedInspections = inspections.map(inspection => 
          inspection.id === id 
            ? { ...inspection, ...updates, updated_at: new Date().toISOString() } 
            : inspection
        );
        setInspections(updatedInspections);
        return updatedInspections.find(i => i.id === id) || null;
      }
      
      setInspections(prev => 
        prev.map(inspection => 
          inspection.id === id ? data : inspection
        )
      );
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update inspection');
      
      const updatedInspections = inspections.map(inspection => 
        inspection.id === id 
          ? { ...inspection, ...updates, updated_at: new Date().toISOString() } 
          : inspection
      );
      setInspections(updatedInspections);
      return updatedInspections.find(i => i.id === id) || null;
    }
  };

  // Delete inspection
  const deleteInspection = async (id: string) => {
    try {
      if (!supabase) {
        setInspections(prev => prev.filter(inspection => inspection.id !== id));
        return true;
      }
      
      const { error } = await supabase
        .from('inspections')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setInspections(prev => prev.filter(inspection => inspection.id !== id));
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete inspection');
      
      setInspections(prev => prev.filter(inspection => inspection.id !== id));
      return true;
    }
  };

  // Subscribe to real-time changes - fix the useEffect dependency
  useEffect(() => {
    fetchInspections();

    if (!supabase) {
      return () => {};
    }

    try {
      const subscription = supabase
        .channel('inspections')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'inspections' },
          (payload) => {
            if (payload.eventType === 'INSERT') {
              setInspections(prev => [payload.new as Inspection, ...prev]);
            } else if (payload.eventType === 'UPDATE') {
              setInspections(prev => 
                prev.map(inspection => 
                  inspection.id === payload.new.id ? payload.new as Inspection : inspection
                )
              );
            } else if (payload.eventType === 'DELETE') {
              setInspections(prev => 
                prev.filter(inspection => inspection.id !== payload.old.id)
              );
            }
          }
        )
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    } catch (err) {
      console.error('Error setting up realtime subscription:', err);
      return () => {};
    }
  }, [fetchInspections]); // Now fetchInspections is stable due to useCallback

  return {
    inspections,
    loading,
    error,
    getInspectionById,
    createInspection,
    updateInspection,
    deleteInspection,
    refetch: fetchInspections,
  };
};