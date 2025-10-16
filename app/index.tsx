import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Platform,
  AppState,
  StyleSheet,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Wifi, WifiOff, Plus, List, RefreshCw } from "lucide-react-native";
import { Image } from "expo-image";
import { useInspections } from "../hooks/useInspections";
import InspectionForm from "./components/InspectionForm";
import LoginScreen from "./components/LoginScreen";
import AdminDashboard from "./components/AdminDashboard";
import { PropertyProvider, useProperty } from "./contexts/PropertyContext";
import { supabase } from "../lib/supabase";
import { Database } from "../src/types/supabase";
import { lookupPropertyBySmarty } from "../lib/smartyPropertyService";
import AssignedPropertiesList from './components/AssignedPropertiesList';
import SavedInspectionsList from './components/SavedInspectionsList';

type User = Database['public']['Tables']['users']['Row'];

export default function Index() {
  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [currentView, setCurrentView] = useState<'dashboard' | 'inspection' | 'saved' | 'admin' | 'assigned'>('dashboard');
  const [selectedInspection, setSelectedInspection] = useState<any>(null);
  const [recentInspections, setRecentInspections] = useState<any[]>([]);

  useEffect(() => {
    console.log('=== Starting auth check ===');
    
    // Set a timeout to prevent infinite loading
    const timeout = setTimeout(() => {
      console.log('Auth check timeout - proceeding without session');
      setCheckingAuth(false);
    }, 5000); // 5 second timeout
    
    const checkUser = async () => {
      try {
        console.log('Calling getSession...');
        const { data: { session }, error } = await supabase.auth.getSession();
        
        console.log('getSession response:', { 
          hasSession: !!session, 
          hasUser: !!session?.user,
          error: error?.message 
        });
        
        if (error) {
          console.error('Auth error:', error);
        }
        
        setUser(session?.user ?? null);
        
        // Load user role from public.users table
        if (session?.user) {
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('role')
            .eq('id', session.user.id)
            .single();
          
          if (userError) {
            console.error('Error loading user role:', userError);
          } else {
            console.log('User role:', userData?.role);
            setUserRole(userData?.role || null);
          }
          
          loadRecentInspections(session.user.id);
        }
        
        console.log('Auth check complete, user:', session?.user?.email || 'none');
      } catch (err) {
        console.error('Exception during auth check:', err);
      } finally {
        clearTimeout(timeout);
        console.log('Setting checkingAuth to false');
        setCheckingAuth(false);
      }
    };

    checkUser();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        setUser(session.user);
        
        // Load user role
        const { data: userData } = await supabase
          .from('users')
          .select('role')
          .eq('id', session.user.id)
          .single();
        
        setUserRole(userData?.role || null);
        loadRecentInspections(session.user.id);
      } else {
        setUser(null);
        setUserRole(null);
        setRecentInspections([]);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadRecentInspections = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('inspections')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      setRecentInspections(data || []);
    } catch (error) {
      console.error('Error loading recent inspections:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setUserRole(null);
      setCurrentView('dashboard');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  if (checkingAuth) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#9ca3af" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (!user) {
    return <LoginScreen onLoginSuccess={() => setUser(user)} />;
  }

  // Show Admin Dashboard
  if (currentView === 'admin') {
    return (
      <AdminDashboard 
        currentUser={user}
        onBack={() => setCurrentView('dashboard')}
        onNavigateToPropertyLookup={() => setCurrentView('inspection')}
      />
    );
  }

  // Show Assigned Inspections List
  if (currentView === 'assigned') {
    return (
      <AssignedPropertiesList
        currentUser={user}
        onSelectInspection={(inspection) => {
          setSelectedInspection(inspection);
          setCurrentView('inspection');
        }}
        onBack={() => setCurrentView('dashboard')}
      />
    );
  }

  // Show Saved Inspections List
  if (currentView === 'saved') {
    return (
      <SavedInspectionsList
        currentUser={user}
        onSelectInspection={(inspection) => {
          setSelectedInspection(inspection);
          setCurrentView('inspection');
        }}
        onBack={() => {
          loadRecentInspections(user.id);
          setCurrentView('dashboard');
        }}
        onInspectionDeleted={() => {
          loadRecentInspections(user.id);
        }}
      />
    );
  }

  // Show Inspection Form (either new or editing)
  if (currentView === 'inspection') {
    return (
      <PropertyProvider>
        <InspectionForm
          currentUser={user}
          inspectionId={selectedInspection?.id}
          initialData={selectedInspection}
          onCancel={() => {
            setSelectedInspection(null);
            setCurrentView('dashboard');
          }}
          onComplete={() => {
            setSelectedInspection(null);
            setCurrentView('dashboard');
          }}
          onSave={() => {
            setSelectedInspection(null);
            setCurrentView('dashboard');
          }}
        />
      </PropertyProvider>
    );
  }

  // Default dashboard view
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#111827" />
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Pulse Inspections</Text>
          <Text style={styles.headerSubtitle}>Welcome, {user?.email}</Text>
          {userRole && (
            <Text style={styles.roleText}>Role: {userRole}</Text>
          )}
        </View>

        {/* Main Content */}
        <ScrollView style={styles.scrollView}>
          {/* Top 3 Buttons */}
          <View style={styles.topButtonsContainer}>
            <TouchableOpacity
              style={styles.topButton}
              onPress={() => {
                setSelectedInspection(null);
                setCurrentView('inspection');
              }}
            >
              <Text style={styles.topButtonText}>New Inspection</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.topButton}
              onPress={() => setCurrentView('assigned')}
            >
              <Text style={styles.topButtonText}>Assigned Inspections</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.topButton}
              onPress={() => setCurrentView('saved')}
            >
              <Text style={styles.topButtonText}>Saved Inspections</Text>
            </TouchableOpacity>
          </View>

          {/* Recent Inspections Section */}
          {recentInspections.length > 0 && (
            <View style={styles.recentSection}>
              <Text style={styles.sectionTitle}>Recent Inspections</Text>
              {recentInspections.map((inspection) => (
                <TouchableOpacity
                  key={inspection.id}
                  style={styles.recentInspectionCard}
                  onPress={() => {
                    setSelectedInspection(inspection);
                    setCurrentView('inspection');
                  }}
                >
                  <View style={styles.recentInspectionHeader}>
                    <Text style={styles.recentInspectionAddress} numberOfLines={1}>
                      {inspection.address}
                    </Text>
                    <View style={[
                      styles.statusBadge,
                      inspection.status === 'complete' ? styles.statusComplete : styles.statusIncomplete
                    ]}>
                      <Text style={[
                        styles.statusText,
                        inspection.status === 'complete' ? styles.statusCompleteText : styles.statusIncompleteText
                      ]}>
                        {inspection.status === 'complete' ? 'Complete' : 'In Progress'}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.recentInspectionDate}>
                    Last updated: {new Date(inspection.updated_at).toLocaleDateString()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Admin Dashboard Button (if admin) */}
          {(userRole === 'admin' || userRole === 'system_admin') && (
            <TouchableOpacity
              style={styles.adminButton}
              onPress={() => setCurrentView('admin')}
            >
              <Text style={styles.adminButtonText}>Admin Dashboard</Text>
            </TouchableOpacity>
          )}

          {/* Logout Button */}
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
          >
            <Text style={styles.logoutButtonText}>Logout</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#9ca3af',
    marginTop: 16,
    fontSize: 16,
  },
  container: {
    flex: 1,
    backgroundColor: '#111827',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  header: {
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#f3f4f6',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#9ca3af',
  },
  roleText: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  scrollView: {
    flex: 1,
  },
  topButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 8,
  },
  topButton: {
    flex: 1,
    backgroundColor: '#3b82f6',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    minHeight: 60,
    justifyContent: 'center',
  },
  topButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  primaryButton: {
    backgroundColor: '#3b82f6',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: '#1f2937',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#374151',
  },
  secondaryButtonText: {
    color: '#f3f4f6',
    fontSize: 16,
    fontWeight: '600',
  },
  adminButton: {
    backgroundColor: '#7c3aed',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#8b5cf6',
  },
  adminButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  logoutButton: {
    backgroundColor: '#991b1b',
    padding: 16,
    borderRadius: 8,
    marginTop: 24,
    alignItems: 'center',
  },
  logoutButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  recentSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#f3f4f6',
    marginBottom: 12,
  },
  recentInspectionCard: {
    backgroundColor: '#1f2937',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#374151',
  },
  recentInspectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  recentInspectionAddress: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f3f4f6',
    flex: 1,
    marginRight: 8,
  },
  recentInspectionDate: {
    fontSize: 14,
    color: '#9ca3af',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusComplete: {
    backgroundColor: '#064e3b',
    borderColor: '#047857',
  },
  statusIncomplete: {
    backgroundColor: '#78350f',
    borderColor: '#d97706',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusCompleteText: {
    color: '#6ee7b7',
  },
  statusIncompleteText: {
    color: '#fbbf24',
  },
});