import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

// Access environment variables from Expo Constants
// EAS secrets with EXPO_PUBLIC_ prefix are automatically available
const supabaseUrl = Constants.expoConfig?.extra?.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = Constants.expoConfig?.extra?.EXPO_PUBLIC_SUPABASE_ANON_KEY;

console.log("=== Supabase Client Initialization ===");
console.log("EXPO_PUBLIC_SUPABASE_URL exists:", !!supabaseUrl);
console.log("EXPO_PUBLIC_SUPABASE_ANON_KEY exists:", !!supabaseAnonKey);
console.log("URL value:", supabaseUrl);

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("CRITICAL: Supabase environment variables are missing!");
  console.error("supabaseUrl:", supabaseUrl);
  console.error("supabaseAnonKey:", supabaseAnonKey ? "[REDACTED]" : "undefined");
  throw new Error('Missing Supabase environment variables. Please check EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

console.log("Supabase client created successfully");