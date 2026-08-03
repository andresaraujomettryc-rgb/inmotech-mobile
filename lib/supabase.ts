import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import 'react-native-url-polyfill/auto';

const supabaseUrl = 'https://jfkcbgqxhrbymczvthjc.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impma2NiZ3F4aHJieW1jenZ0aGpjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTE5NjM5MCwiZXhwIjoyMDk2NzcyMzkwfQ.C0Ea7YmT6yEf7giPeo8sCxKGMWn8ssA6CFfgcbiE58g';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Si estamos en un entorno web/Node (compilación), ignoramos AsyncStorage
    storage: Platform.OS === 'web' ? undefined : AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, 
  },
});