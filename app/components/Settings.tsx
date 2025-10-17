import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Switch, Alert, SafeAreaView, StatusBar, StyleSheet, Platform, TextInput } from 'react-native';
import { supabase } from '../../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface SettingsProps {
  currentUser: any;
  onClose: () => void;
  isDarkMode: boolean;
  onToggleTheme: (isDark: boolean) => void;
}

export default function Settings({ currentUser, onClose, isDarkMode, onToggleTheme }: SettingsProps) {
  const [resettingPassword, setResettingPassword] = useState(false);
  const [fullName, setFullName] = useState('');
  const [saving, setSaving] = useState(false);
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', currentUser.id)
        .single();

      if (error) throw error;

      setUserData(data);
      setFullName(data.full_name || '');
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRoleDisplay = () => {
    if (!userData) return 'User';
    
    if (userData.role === 'admin' || userData.role === 'system_admin') {
      return 'Admin';
    } else if (userData.role === 'inspector') {
      return 'Inspector';
    }
    return 'User';
  };

  const handleSaveProfile = async () => {
    try {
      setSaving(true);
      const { error } = await supabase
        .from('users')
        .update({ full_name: fullName })
        .eq('id', currentUser.id);

      if (error) throw error;

      Alert.alert('Success', 'Profile updated successfully');
      
      // Update local userData
      setUserData({ ...userData, full_name: fullName });
    } catch (error: any) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', error.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordReset = async () => {
    try {
      setResettingPassword(true);
      const { error } = await supabase.auth.resetPasswordForEmail(currentUser.email, {
        redirectTo: 'https://3621be4e-ba60-4a22-93e8-efd8b5b7134c.canvases.tempo.build',
      });

      if (error) throw error;

      Alert.alert(
        'Password Reset Email Sent',
        `A password reset link has been sent to ${currentUser.email}. Please check your email.`,
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      console.error('Error sending password reset:', error);
      Alert.alert('Error', error.message || 'Failed to send password reset email');
    } finally {
      setResettingPassword(false);
    }
  };

  const handleThemeToggle = async (value: boolean) => {
    try {
      await AsyncStorage.setItem('theme', value ? 'dark' : 'light');
      onToggleTheme(value);
    } catch (error) {
      console.error('Error saving theme preference:', error);
    }
  };

  return (
    <SafeAreaView style={[styles.container, !isDarkMode && styles.containerLight]}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} backgroundColor={isDarkMode ? "#111827" : "#ffffff"} />
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, !isDarkMode && styles.headerTitleLight]}>Settings</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={[styles.closeButtonText, !isDarkMode && styles.closeButtonTextLight]}>✕</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <Text style={[styles.loadingText, !isDarkMode && styles.loadingTextLight]}>Loading...</Text>
          </View>
        ) : (
          <ScrollView style={styles.scrollView}>
            {/* User Info Section */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, !isDarkMode && styles.sectionTitleLight]}>Account Information</Text>
              <View style={[styles.infoCard, !isDarkMode && styles.infoCardLight]}>
                <View style={styles.infoColumn}>
                  <Text style={[styles.infoLabel, !isDarkMode && styles.infoLabelLight]}>Name</Text>
                  <TextInput
                    style={[styles.input, !isDarkMode && styles.inputLight]}
                    value={fullName}
                    onChangeText={setFullName}
                    placeholder="Enter your name"
                    placeholderTextColor={isDarkMode ? '#6b7280' : '#9ca3af'}
                  />
                </View>
                <View style={styles.infoRow}>
                  <Text style={[styles.infoLabel, !isDarkMode && styles.infoLabelLight]}>Email</Text>
                  <Text style={[styles.infoValue, !isDarkMode && styles.infoValueLight]}>
                    {currentUser.email}
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={[styles.infoLabel, !isDarkMode && styles.infoLabelLight]}>Role</Text>
                  <Text style={[styles.infoValue, !isDarkMode && styles.infoValueLight]}>
                    {getRoleDisplay()}
                  </Text>
                </View>
              </View>
              
              {/* Save Button */}
              <TouchableOpacity
                style={[styles.saveButton, !isDarkMode && styles.saveButtonLight]}
                onPress={handleSaveProfile}
                disabled={saving}
              >
                <Text style={styles.saveButtonText}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Appearance Section */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, !isDarkMode && styles.sectionTitleLight]}>Appearance</Text>
              <View style={[styles.settingCard, !isDarkMode && styles.settingCardLight]}>
                <View style={styles.settingRow}>
                  <View style={styles.settingInfo}>
                    <Text style={[styles.settingLabel, !isDarkMode && styles.settingLabelLight]}>Dark Mode</Text>
                    <Text style={[styles.settingDescription, !isDarkMode && styles.settingDescriptionLight]}>
                      Use dark theme throughout the app
                    </Text>
                  </View>
                  <Switch
                    value={isDarkMode}
                    onValueChange={handleThemeToggle}
                    trackColor={{ false: '#d1d5db', true: '#3b82f6' }}
                    thumbColor={isDarkMode ? '#ffffff' : '#f3f4f6'}
                  />
                </View>
              </View>
            </View>

            {/* Security Section */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, !isDarkMode && styles.sectionTitleLight]}>Security</Text>
              <TouchableOpacity
                style={[styles.actionButton, !isDarkMode && styles.actionButtonLight]}
                onPress={handlePasswordReset}
                disabled={resettingPassword}
              >
                <Text style={[styles.actionButtonText, !isDarkMode && styles.actionButtonTextLight]}>
                  {resettingPassword ? 'Sending...' : 'Reset Password'}
                </Text>
              </TouchableOpacity>
              <Text style={[styles.helperText, !isDarkMode && styles.helperTextLight]}>
                A password reset link will be sent to your email
              </Text>
            </View>

            {/* Sign Out Section */}
            <View style={styles.section}>
              <TouchableOpacity
                style={[styles.signOutButton, !isDarkMode && styles.signOutButtonLight]}
                onPress={async () => {
                  await supabase.auth.signOut();
                }}
              >
                <Text style={styles.signOutButtonText}>Sign Out</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  containerLight: {
    backgroundColor: '#ffffff',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#f3f4f6',
  },
  headerTitleLight: {
    color: '#111827',
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    fontSize: 24,
    color: '#9ca3af',
    fontWeight: '600',
  },
  closeButtonTextLight: {
    color: '#6b7280',
  },
  scrollView: {
    flex: 1,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#f3f4f6',
    marginBottom: 12,
  },
  sectionTitleLight: {
    color: '#111827',
  },
  infoCard: {
    backgroundColor: '#1f2937',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#374151',
    marginBottom: 12,
  },
  infoCardLight: {
    backgroundColor: '#f9fafb',
    borderColor: '#e5e7eb',
  },
  infoColumn: {
    paddingVertical: 8,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: '#9ca3af',
    fontWeight: '500',
    marginBottom: 8,
  },
  infoLabelLight: {
    color: '#6b7280',
  },
  infoValue: {
    fontSize: 14,
    color: '#f3f4f6',
    fontWeight: '600',
  },
  infoValueLight: {
    color: '#111827',
  },
  input: {
    backgroundColor: '#374151',
    borderWidth: 1,
    borderColor: '#4b5563',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#f3f4f6',
  },
  inputLight: {
    backgroundColor: '#ffffff',
    borderColor: '#d1d5db',
    color: '#111827',
  },
  saveButton: {
    backgroundColor: '#10b981',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonLight: {
    backgroundColor: '#10b981',
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  settingCard: {
    backgroundColor: '#1f2937',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#374151',
  },
  settingCardLight: {
    backgroundColor: '#f9fafb',
    borderColor: '#e5e7eb',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f3f4f6',
    marginBottom: 4,
  },
  settingLabelLight: {
    color: '#111827',
  },
  settingDescription: {
    fontSize: 14,
    color: '#9ca3af',
  },
  settingDescriptionLight: {
    color: '#6b7280',
  },
  actionButton: {
    backgroundColor: '#3b82f6',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 8,
  },
  actionButtonLight: {
    backgroundColor: '#3b82f6',
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  actionButtonTextLight: {
    color: '#ffffff',
  },
  helperText: {
    fontSize: 12,
    color: '#9ca3af',
    fontStyle: 'italic',
  },
  helperTextLight: {
    color: '#6b7280',
  },
  signOutButton: {
    backgroundColor: '#991b1b',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#dc2626',
  },
  signOutButtonLight: {
    backgroundColor: '#dc2626',
    borderColor: '#b91c1c',
  },
  signOutButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  loadingText: {
    fontSize: 16,
    color: '#9ca3af',
  },
  loadingTextLight: {
    color: '#6b7280',
  },
});