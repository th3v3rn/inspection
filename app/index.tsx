import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  StyleSheet,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useLocalSearchParams } from "expo-router";
import { Wifi, WifiOff, Plus, List, RefreshCw, Settings as SettingsIcon } from "lucide-react-native";
import { Image } from "expo-image";
import { useInspections } from "../hooks/useInspections";
import InspectionForm from "./components/InspectionForm";
import LoginScreen from "./components/LoginScreen";
import AdminDashboard from "./components/AdminDashboard";
import Settings from "./components/Settings";
import { PropertyProvider, useProperty } from "./contexts/PropertyContext";
import { supabase } from "../lib/supabase";
import { Database } from "../src/types/supabase";
import { lookupPropertyBySmarty } from "../lib/smartyPropertyService";
import AssignedPropertiesList from './components/AssignedPropertiesList';
import SavedInspectionsList from './components/SavedInspectionsList';
import AsyncStorage from '@react-native-async-storage/async-storage';

type User = Database['public']['Tables']['users']['Row'];

export default function Index() {
  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [currentView, setCurrentView] = useState<'dashboard' | 'inspection' | 'saved' | 'admin' | 'assigned' | 'settings'>('dashboard');
  const [selectedInspection, setSelectedInspection] = useState<any>(null);
  const [recentInspections, setRecentInspections] = useState<any[]>([]);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [userFullName, setUserFullName] = useState<string | null>(null);

  const handleToggleTheme = async (newTheme: boolean) => {
    setIsDarkMode(newTheme);
    try {
      await AsyncStorage.setItem('theme', newTheme ? 'dark' : 'light');
    } catch (error) {
      console.error('Error saving theme:', error);
    }
  };

  useEffect(() => {
    // Load theme preference
    const loadTheme = async () => {
      try {
        const theme = await AsyncStorage.getItem('theme');
        if (theme) {
          setIsDarkMode(theme === 'dark');
        } else {
          // Default to light mode if no preference saved
          setIsDarkMode(false);
        }
      } catch (error) {
        console.error('Error loading theme:', error);
        setIsDarkMode(false); // Default to light mode on error
      }
    };
    
    loadTheme();
    
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
            .select('role, full_name')
            .eq('id', session.user.id)
            .single();
          
          if (userError) {
            console.error('Error loading user role:', userError);
          } else {
            console.log('User role:', userData?.role);
            setUserRole(userData?.role || null);
            setUserFullName(userData?.full_name || null);
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
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('=== Auth State Change ===');
      console.log('Event:', event);
      console.log('Has session:', !!session);
      console.log('User email:', session?.user?.email);
      
      if (session?.user) {
        setUser(session.user);
        
        // Load user role
        console.log('Loading user role for ID:', session.user.id);
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('role, full_name')
          .eq('id', session.user.id)
          .single();
        
        if (userError) {
          console.error('❌ Error loading user role:', userError);
          console.error('Error details:', JSON.stringify(userError, null, 2));
        } else {
          console.log('✅ Loaded user role:', userData?.role);
          setUserRole(userData?.role || null);
          setUserFullName(userData?.full_name || null);
        }
        
        console.log('Loading recent inspections...');
        await loadRecentInspections(session.user.id);
        console.log('✅ Recent inspections loaded');
      } else {
        console.log('No session - clearing user state');
        setUser(null);
        setUserRole(null);
        setRecentInspections([]);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadRecentInspections = async (userId: string) => {
    try {
      console.log('Querying inspections for user ID:', userId);
      const { data, error } = await supabase
        .from('inspections')
        .select('*')
        .eq('inspector_id', userId)
        .order('updated_at', { ascending: false })
        .limit(5);

      if (error) {
        console.error('❌ Error loading recent inspections:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        throw error;
      }
      
      console.log('✅ Inspections query result:', data?.length || 0, 'inspections found');
      setRecentInspections(data || []);
    } catch (error) {
      console.error('�� Exception loading recent inspections:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setUserRole(null);
      setUserFullName(null);
      setCurrentView('dashboard');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const getWelcomeMessage = () => {
    if (userFullName) {
      const firstName = userFullName.trim().split(' ')[0];
      return `Welcome, ${firstName}`;
    }
    return `Welcome, ${user?.email}`;
  };

  if (checkingAuth) {
    return (
      <View style={[styles.loadingContainer, !isDarkMode && styles.loadingContainerLight]}>
        <StatusBar style={isDarkMode ? "light" : "dark"} />
        <ActivityIndicator size="large" color="#9ca3af" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  // Show Admin Dashboard
  if (currentView === 'admin') {
    return (
      <View style={[styles.rootContainer, !isDarkMode && styles.rootContainerLight]}>
        <StatusBar style={isDarkMode ? "light" : "dark"} />
        <AdminDashboard 
          currentUser={user}
          onBack={() => setCurrentView('dashboard')}
          onNavigateToPropertyLookup={() => setCurrentView('inspection')}
          isDarkMode={isDarkMode}
          onToggleTheme={handleToggleTheme}
        />
      </View>
    );
  }

  // Show Assigned Inspections List
  if (currentView === 'assigned') {
    return (
      <View style={[styles.rootContainer, !isDarkMode && styles.rootContainerLight]}>
        <StatusBar style={isDarkMode ? "light" : "dark"} />
        <AssignedPropertiesList
          currentUser={user}
          onSelectInspection={(inspection) => {
            setSelectedInspection(inspection);
            setCurrentView('inspection');
          }}
          onBack={() => setCurrentView('dashboard')}
          isDarkMode={isDarkMode}
        />
      </View>
    );
  }

  // Show Saved Inspections List
  if (currentView === 'saved') {
    return (
      <View style={[styles.rootContainer, !isDarkMode && styles.rootContainerLight]}>
        <StatusBar style={isDarkMode ? "light" : "dark"} />
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
          isDarkMode={isDarkMode}
        />
      </View>
    );
  }

  // Show Inspection Form (either new or editing)
  if (currentView === 'inspection') {
    return (
      <PropertyProvider>
        <View style={[styles.rootContainer, !isDarkMode && styles.rootContainerLight]}>
          <StatusBar style={isDarkMode ? "light" : "dark"} />
          <InspectionForm
            currentUser={user}
            inspectionId={selectedInspection?.id}
            initialData={selectedInspection}
            onCancel={() => {
              setSelectedInspection(null);
              loadRecentInspections(user.id);
              setCurrentView('dashboard');
            }}
            onComplete={() => {
              setSelectedInspection(null);
              loadRecentInspections(user.id);
              setCurrentView('dashboard');
            }}
            onSave={() => {
              setSelectedInspection(null);
              loadRecentInspections(user.id);
              setCurrentView('dashboard');
            }}
            isDarkMode={isDarkMode}
          />
        </View>
      </PropertyProvider>
    );
  }

  // Show Settings
  if (currentView === 'settings') {
    return (
      <View style={[styles.rootContainer, !isDarkMode && styles.rootContainerLight]}>
        <StatusBar style={isDarkMode ? "light" : "dark"} />
        <Settings
          currentUser={user}
          onClose={() => setCurrentView('dashboard')}
          isDarkMode={isDarkMode}
          onToggleTheme={handleToggleTheme}
        />
      </View>
    );
  }

  // Default dashboard view
  return (
    <View style={[styles.rootBackground, !isDarkMode && styles.rootBackgroundLight]}>
      <StatusBar style={isDarkMode ? "light" : "dark"} />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={[styles.headerTitle, !isDarkMode && styles.headerTitleLight]}>Pulse Inspections</Text>
              <Text style={[styles.headerSubtitle, !isDarkMode && styles.headerSubtitleLight]}>{getWelcomeMessage()}</Text>
              {userRole && (
                <Text style={[styles.roleText, !isDarkMode && styles.roleTextLight]}>Role: {userRole}</Text>
              )}
            </View>
            <TouchableOpacity onPress={() => setCurrentView('settings')} style={styles.settingsButton}>
              <SettingsIcon size={24} color={isDarkMode ? "#9ca3af" : "#6b7280"} />
            </TouchableOpacity>
          </View>

          {/* Main Content */}
          <ScrollView style={styles.scrollView}>
            {/* Top 3 Buttons */}
            <View style={styles.topButtonsContainer}>
              <TouchableOpacity
                style={[styles.topButton, !isDarkMode && styles.topButtonLight]}
                onPress={() => {
                  setSelectedInspection(null);
                  setCurrentView('inspection');
                }}
              >
                <Text style={styles.topButtonText}>New Inspection</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.topButton, !isDarkMode && styles.topButtonLight]}
                onPress={() => setCurrentView('assigned')}
              >
                <Text style={styles.topButtonText}>Assigned Inspections</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.topButton, !isDarkMode && styles.topButtonLight]}
                onPress={() => setCurrentView('saved')}
              >
                <Text style={styles.topButtonText}>Saved Inspections</Text>
              </TouchableOpacity>
            </View>

            {/* Recent Inspections Section */}
            {recentInspections.length > 0 && (
              <View style={styles.recentSection}>
                <View style={styles.recentSectionHeader}>
                  <Text style={[styles.sectionTitle, !isDarkMode && styles.sectionTitleLight]}>Recent Inspections</Text>
                  <TouchableOpacity 
                    onPress={() => loadRecentInspections(user.id)}
                    style={styles.refreshButton}
                  >
                    <RefreshCw size={20} color={isDarkMode ? "#9ca3af" : "#6b7280"} />
                  </TouchableOpacity>
                </View>
                {recentInspections.map((inspection) => (
                  <TouchableOpacity
                    key={inspection.id}
                    style={[styles.recentInspectionCard, !isDarkMode && styles.recentInspectionCardLight]}
                    onPress={() => {
                      setSelectedInspection(inspection);
                      setCurrentView('inspection');
                    }}
                  >
                    <View style={styles.recentInspectionHeader}>
                      <Text style={[styles.recentInspectionAddress, !isDarkMode && styles.recentInspectionAddressLight]} numberOfLines={1}>
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
                    <Text style={[styles.recentInspectionDate, !isDarkMode && styles.recentInspectionDateLight]}>
                      Last updated: {new Date(inspection.updated_at).toLocaleDateString()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Admin Dashboard Button (if admin) */}
            {(userRole === 'admin' || userRole === 'system_admin') && (
              <TouchableOpacity
                style={[styles.adminButton, !isDarkMode && styles.adminButtonLight]}
                onPress={() => setCurrentView('admin')}
              >
                <Text style={styles.adminButtonText}>Admin Dashboard</Text>
              </TouchableOpacity>
            )}

            {/* Logout Button */}
            <TouchableOpacity
              style={[styles.logoutButton, !isDarkMode && styles.logoutButtonLight]}
              onPress={handleLogout}
            >
              <Text style={styles.logoutButtonText}>Logout</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainerLight: {
    backgroundColor: '#ffffff',
  },
  loadingText: {
    color: '#9ca3af',
    marginTop: 16,
    fontSize: 16,
  },
  rootBackground: {
    flex: 1,
    backgroundColor: '#111827',
  },
  rootBackgroundLight: {
    backgroundColor: '#ffffff',
  },
  safeArea: {
    flex: 1,
  },
  rootContainer: {
    flex: 1,
    backgroundColor: '#111827',
  },
  rootContainerLight: {
    backgroundColor: '#ffffff',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  header: {
    marginBottom: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#f3f4f6',
    marginBottom: 8,
  },
  headerTitleLight: {
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#9ca3af',
  },
  headerSubtitleLight: {
    color: '#6b7280',
  },
  roleText: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  roleTextLight: {
    color: '#9ca3af',
  },
  settingsButton: {
    padding: 8,
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
  topButtonLight: {
    backgroundColor: '#3b82f6',
  },
  topButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
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
  adminButtonLight: {
    backgroundColor: '#7c3aed',
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
  logoutButtonLight: {
    backgroundColor: '#dc2626',
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
  },
  sectionTitleLight: {
    color: '#111827',
  },
  recentSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  refreshButton: {
    padding: 8,
  },
  recentInspectionCard: {
    backgroundColor: '#1f2937',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#374151',
  },
  recentInspectionCardLight: {
    backgroundColor: '#f9fafb',
    borderColor: '#e5e7eb',
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
  recentInspectionAddressLight: {
    color: '#111827',
  },
  recentInspectionDate: {
    fontSize: 14,
    color: '#9ca3af',
  },
  recentInspectionDateLight: {
    color: '#6b7280',
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