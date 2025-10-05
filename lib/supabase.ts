import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

console.log("=== Supabase Client Initialization ===");
console.log("EXPO_PUBLIC_SUPABASE_URL exists:", !!supabaseUrl);
console.log("EXPO_PUBLIC_SUPABASE_ANON_KEY exists:", !!supabaseAnonKey);

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("CRITICAL: Supabase environment variables are missing!");
  console.error("supabaseUrl:", supabaseUrl);
  console.error("supabaseAnonKey:", supabaseAnonKey ? "[REDACTED]" : "undefined");
}

// Create client - throw error if environment variables are missing
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

console.log("Supabase client created successfully");

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