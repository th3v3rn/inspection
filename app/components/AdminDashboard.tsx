import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, SafeAreaView, StatusBar, StyleSheet, Platform, Alert, Modal } from 'react-native';
import { supabase } from '../../lib/supabase';
import { ChevronDown, UserPlus, Settings as SettingsIcon } from 'lucide-react-native';
import Settings from './Settings';

interface AdminDashboardProps {
  currentUser: any;
  onBack: () => void;
  onNavigateToPropertyLookup?: () => void;
  isDarkMode?: boolean;
  onToggleTheme?: (isDark: boolean) => void;
}

export default function AdminDashboard({ currentUser, onBack, onNavigateToPropertyLookup, isDarkMode = true, onToggleTheme }: AdminDashboardProps) {
  const [inspectors, setInspectors] = useState<any[]>([]);
  const [inspections, setInspections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [sending, setSending] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedInspection, setSelectedInspection] = useState<any>(null);
  const [selectedInspectorId, setSelectedInspectorId] = useState<string>('');
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Load inspectors
      const { data: inspectorsData, error: inspectorsError } = await supabase
        .from('users')
        .select('*')
        .eq('admin_id', currentUser.id)
        .eq('role', 'inspector');

      if (inspectorsError) throw inspectorsError;
      setInspectors(inspectorsData || []);

      // Load inspections
      const { data: inspectionsData, error: inspectionsError } = await supabase
        .from('inspections')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('updated_at', { ascending: false });

      if (inspectionsError) throw inspectionsError;
      setInspections(inspectionsData || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendInvite = async () => {
    if (!inviteEmail || !inviteName) {
      Alert.alert('Error', 'Please enter both name and email');
      return;
    }

    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('supabase-functions-send-inspector-invite', {
        body: {
          email: inviteEmail,
          name: inviteName,
          adminId: currentUser.id,
        },
      });

      if (error) throw error;

      Alert.alert('Success', 'Invitation sent successfully');
      setInviteEmail('');
      setInviteName('');
      loadData();
    } catch (error: any) {
      console.error('Error sending invite:', error);
      Alert.alert('Error', error.message || 'Failed to send invitation');
    } finally {
      setSending(false);
    }
  };

  const handleAssignInspection = async () => {
    if (!selectedInspectorId || !selectedInspection) {
      Alert.alert('Error', 'Please select an inspector');
      return;
    }

    try {
      // Create assignment record with inspection_id only
      const { error: assignmentError } = await supabase
        .from('assignments')
        .insert({
          admin_id: currentUser.id,
          inspector_id: selectedInspectorId,
          inspection_id: selectedInspection.id,
        });

      if (assignmentError) throw assignmentError;

      Alert.alert('Success', 'Inspection assigned successfully');
      setShowAssignModal(false);
      setSelectedInspection(null);
      setSelectedInspectorId('');
      loadData();
    } catch (error: any) {
      console.error('Error assigning inspection:', error);
      Alert.alert('Error', error.message || 'Failed to assign inspection');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  if (showSettings) {
    return (
      <Settings
        currentUser={currentUser}
        onClose={() => setShowSettings(false)}
        isDarkMode={isDarkMode}
        onToggleTheme={onToggleTheme || (() => {})}
      />
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#111827" />
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <TouchableOpacity onPress={onBack} style={styles.backButton}>
              <Text style={styles.backButtonText}>← Back</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Admin Dashboard</Text>
          </View>
          <TouchableOpacity onPress={() => setShowSettings(true)} style={styles.settingsButton}>
            <SettingsIcon size={24} color="#9ca3af" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scrollView}>
          {/* Invite Inspector Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Invite Inspector</Text>
            <TextInput
              style={styles.input}
              placeholder="Inspector Name"
              placeholderTextColor="#9ca3af"
              value={inviteName}
              onChangeText={setInviteName}
            />
            <TextInput
              style={styles.input}
              placeholder="Inspector Email"
              placeholderTextColor="#9ca3af"
              value={inviteEmail}
              onChangeText={setInviteEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <TouchableOpacity
              style={[styles.primaryButton, sending && styles.buttonDisabled]}
              onPress={handleSendInvite}
              disabled={sending}
            >
              <Text style={styles.primaryButtonText}>
                {sending ? 'Sending...' : 'Send Invitation'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Inspectors List */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>My Inspectors ({inspectors.length})</Text>
            {inspectors.length === 0 ? (
              <Text style={styles.emptyText}>No inspectors yet</Text>
            ) : (
              inspectors.map((inspector) => (
                <View key={inspector.id} style={styles.card}>
                  <Text style={styles.cardTitle}>{inspector.full_name || inspector.email}</Text>
                  <Text style={styles.cardSubtitle}>{inspector.email}</Text>
                </View>
              ))
            )}
          </View>

          {/* Inspections List */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>My Inspections ({inspections.length})</Text>
            {inspections.length === 0 ? (
              <Text style={styles.emptyText}>No inspections yet</Text>
            ) : (
              inspections.map((inspection) => (
                <View key={inspection.id} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle} numberOfLines={1}>
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
                  <Text style={styles.cardSubtitle}>
                    {new Date(inspection.updated_at).toLocaleDateString()}
                  </Text>
                  
                  {/* Assign Button */}
                  {inspectors.length > 0 && (
                    <TouchableOpacity
                      style={styles.assignButton}
                      onPress={() => {
                        setSelectedInspection(inspection);
                        setShowAssignModal(true);
                      }}
                    >
                      <UserPlus size={16} color="#3b82f6" />
                      <Text style={styles.assignButtonText}>Assign to Inspector</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))
            )}
          </View>
        </ScrollView>
      </View>

      {/* Assignment Modal */}
      <Modal
        visible={showAssignModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAssignModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Assign Inspection</Text>
            <Text style={styles.modalSubtitle} numberOfLines={2}>
              {selectedInspection?.address}
            </Text>

            <Text style={styles.modalLabel}>Select Inspector:</Text>
            <ScrollView style={styles.inspectorList}>
              {inspectors.map((inspector) => (
                <TouchableOpacity
                  key={inspector.id}
                  style={[
                    styles.inspectorOption,
                    selectedInspectorId === inspector.id && styles.inspectorOptionSelected
                  ]}
                  onPress={() => setSelectedInspectorId(inspector.id)}
                >
                  <View style={[
                    styles.radioButton,
                    selectedInspectorId === inspector.id && styles.radioButtonSelected
                  ]}>
                    {selectedInspectorId === inspector.id && (
                      <View style={styles.radioButtonInner} />
                    )}
                  </View>
                  <View style={styles.inspectorInfo}>
                    <Text style={styles.inspectorName}>
                      {inspector.full_name || inspector.email}
                    </Text>
                    <Text style={styles.inspectorEmail}>{inspector.email}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                onPress={() => {
                  setShowAssignModal(false);
                  setSelectedInspection(null);
                  setSelectedInspectorId('');
                }}
                style={styles.modalCancelButton}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleAssignInspection}
                style={[
                  styles.modalConfirmButton,
                  !selectedInspectorId && styles.buttonDisabled
                ]}
                disabled={!selectedInspectorId}
              >
                <Text style={styles.modalConfirmButtonText}>Assign</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  container: {
    flex: 1,
    backgroundColor: '#111827',
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
  backButton: {
    marginBottom: 12,
  },
  backButtonText: {
    color: '#3b82f6',
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#f3f4f6',
  },
  settingsButton: {
    padding: 8,
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
  input: {
    backgroundColor: '#1f2937',
    borderWidth: 1,
    borderColor: '#374151',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    color: '#f3f4f6',
    fontSize: 16,
  },
  primaryButton: {
    backgroundColor: '#3b82f6',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  emptyText: {
    color: '#9ca3af',
    fontSize: 14,
    fontStyle: 'italic',
  },
  card: {
    backgroundColor: '#1f2937',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#374151',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f3f4f6',
    flex: 1,
    marginRight: 8,
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#9ca3af',
    marginBottom: 8,
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
  assignButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e3a5f',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#3b82f6',
  },
  assignButtonText: {
    color: '#3b82f6',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: '#1f2937',
    borderRadius: 12,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: '#374151',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#f3f4f6',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#9ca3af',
    marginBottom: 16,
  },
  modalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#e5e7eb',
    marginBottom: 12,
  },
  inspectorList: {
    maxHeight: 300,
    marginBottom: 16,
  },
  inspectorOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#374151',
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  inspectorOptionSelected: {
    borderColor: '#3b82f6',
    backgroundColor: '#1e3a5f',
  },
  radioButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#6b7280',
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioButtonSelected: {
    borderColor: '#3b82f6',
  },
  radioButtonInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#3b82f6',
  },
  inspectorInfo: {
    flex: 1,
  },
  inspectorName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f3f4f6',
    marginBottom: 2,
  },
  inspectorEmail: {
    fontSize: 14,
    color: '#9ca3af',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  modalCancelButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#4b5563',
    borderRadius: 8,
  },
  modalCancelButtonText: {
    color: '#f3f4f6',
    fontWeight: '600',
    fontSize: 16,
  },
  modalConfirmButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#3b82f6',
    borderRadius: 8,
  },
  modalConfirmButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 16,
  },
});