import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, SafeAreaView, StatusBar, StyleSheet, Platform, Alert } from 'react-native';
import { supabase } from '../../lib/supabase';

interface SavedInspectionsListProps {
  currentUser: any;
  onSelectInspection: (inspection: any) => void;
  onBack: () => void;
  onInspectionDeleted?: () => void;
  isDarkMode?: boolean;
  onToggleTheme?: (isDark: boolean) => void;
}

export default function SavedInspectionsList({ currentUser, onSelectInspection, onBack, onInspectionDeleted, isDarkMode = true, onToggleTheme }: SavedInspectionsListProps) {
  const [inspections, setInspections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInspections();
  }, []);

  const loadInspections = async () => {
    try {
      const { data, error } = await supabase
        .from('inspections')
        .select('*')
        .eq('inspector_id', currentUser.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setInspections(data || []);
    } catch (error) {
      console.error('Error loading inspections:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('inspections')
        .delete()
        .eq('id', id);

      if (error) throw error;
      loadInspections();
      
      // Notify parent that an inspection was deleted
      if (onInspectionDeleted) {
        onInspectionDeleted();
      }
    } catch (error) {
      console.error('Error deleting inspection:', error);
    }
  };

  const handleExport = async (inspection: any) => {
    try {
      const { data, error } = await supabase.functions.invoke('supabase-functions-export-inspection', {
        body: { inspectionId: inspection.id },
      });

      if (error) throw error;
      
      // In a real app, you'd handle the export data here
      console.log('Export data:', data);
      Alert.alert('Success', 'Inspection exported successfully');
    } catch (error: any) {
      console.error('Error exporting inspection:', error);
      Alert.alert('Error', 'Failed to export inspection');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
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
            <Text style={styles.headerTitle}>Saved Inspections</Text>
          </View>
        </View>

        {/* Inspections List */}
        <ScrollView style={styles.scrollView}>
          {inspections.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No saved inspections yet</Text>
            </View>
          ) : (
            inspections.map((inspection) => (
              <View key={inspection.id} style={styles.inspectionCard}>
                <TouchableOpacity
                  style={styles.inspectionContent}
                  onPress={() => onSelectInspection(inspection)}
                >
                  <View style={styles.inspectionHeader}>
                    <Text style={styles.inspectionAddress} numberOfLines={1}>
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
                  <Text style={styles.inspectionDate}>
                    Last updated: {new Date(inspection.updated_at).toLocaleDateString()}
                  </Text>
                </TouchableOpacity>
                
                {/* Action Buttons */}
                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={styles.editButton}
                    onPress={() => onSelectInspection(inspection)}
                  >
                    <Text style={styles.editButtonText}>Edit</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={styles.exportButton}
                    onPress={() => handleExport(inspection)}
                  >
                    <Text style={styles.exportButtonText}>Export</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => handleDelete(inspection.id)}
                  >
                    <Text style={styles.deleteButtonText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
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
  scrollView: {
    flex: 1,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyStateText: {
    color: '#9ca3af',
    fontSize: 16,
  },
  inspectionCard: {
    backgroundColor: '#1f2937',
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#374151',
    overflow: 'hidden',
  },
  inspectionContent: {
    padding: 16,
  },
  inspectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  inspectionAddress: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f3f4f6',
    flex: 1,
    marginRight: 8,
  },
  inspectionDate: {
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
  deleteButton: {
    flex: 1,
    backgroundColor: '#991b1b',
    padding: 12,
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#374151',
  },
  editButton: {
    flex: 1,
    backgroundColor: '#1f2937',
    padding: 12,
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: '#374151',
  },
  editButtonText: {
    color: '#3b82f6',
    fontSize: 14,
    fontWeight: '600',
  },
  exportButton: {
    flex: 1,
    backgroundColor: '#1f2937',
    padding: 12,
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: '#374151',
  },
  exportButtonText: {
    color: '#10b981',
    fontSize: 14,
    fontWeight: '600',
  },
});