import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// Create client only if environment variables are available
export const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export type Database = {
  public: {
    Tables: {
      inspections: {
        Row: {
          id: string;
          address: string;
          date: string;
          status: 'complete' | 'incomplete';
          sync_status: 'synced' | 'not-synced';
          categories: {
            exterior: boolean;
            interior: boolean;
            hvac: boolean;
            plumbing: boolean;
            electrical: boolean;
            hazards: boolean;
            other: boolean;
          };
          inspector_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          address: string;
          date?: string;
          status?: 'complete' | 'incomplete';
          sync_status?: 'synced' | 'not-synced';
          categories?: {
            exterior: boolean;
            interior: boolean;
            hvac: boolean;
            plumbing: boolean;
            electrical: boolean;
            hazards: boolean;
            other: boolean;
          };
          inspector_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          address?: string;
          date?: string;
          status?: 'complete' | 'incomplete';
          sync_status?: 'synced' | 'not-synced';
          categories?: {
            exterior: boolean;
            interior: boolean;
            hvac: boolean;
            plumbing: boolean;
            electrical: boolean;
            hazards: boolean;
            other: boolean;
          };
          inspector_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
};