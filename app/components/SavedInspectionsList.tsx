import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, SafeAreaView, StatusBar, StyleSheet, Platform, Alert, useColorScheme } from 'react-native';
import { supabase } from '../../lib/supabase';

interface SavedInspectionsListProps {
  currentUser: any;
  onSelectInspection: (inspection: any) => void;
  onBack: () => void;
  onInspectionDeleted?: () => void;
}

export default function SavedInspectionsList({ currentUser, onSelectInspection, onBack, onInspectionDeleted }: SavedInspectionsListProps) {
  // Use system color scheme
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';
  
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
        <Text style={[styles.loadingText, !isDarkMode && styles.loadingTextLight]}>Loading inspections...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, !isDarkMode && styles.containerLight]}>
      <StatusBar 
        barStyle={isDarkMode ? "light-content" : "dark-content"} 
        backgroundColor={isDarkMode ? "#111827" : "#ffffff"} 
      />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={[styles.backButtonText, !isDarkMode && styles.backButtonTextLight]}>← Back</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, !isDarkMode && styles.headerTitleLight]}>Saved Inspections</Text>
        <View style={styles.backButton} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={[styles.loadingText, !isDarkMode && styles.loadingTextLight]}>Loading inspections...</Text>
        </View>
      ) : inspections.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, !isDarkMode && styles.emptyTextLight]}>No saved inspections</Text>
        </View>
      ) : (
        <ScrollView style={styles.content}>
          {inspections.map((inspection) => (
            <View key={inspection.id} style={[styles.card, !isDarkMode && styles.cardLight]}>
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
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },
  containerLight: {
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1f2937',
  },
  backButton: {
    width: 60,
  },
  backButtonText: {
    color: '#3b82f6',
    fontSize: 16,
  },
  backButtonTextLight: {
    color: '#2563eb',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#f3f4f6',
  },
  headerTitleLight: {
    color: '#111827',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  card: {
    backgroundColor: '#1f2937',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  cardLight: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#9ca3af',
    marginTop: 12,
  },
  loadingTextLight: {
    color: '#6b7280',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: '#9ca3af',
    fontSize: 16,
  },
  emptyTextLight: {
    color: '#6b7280',
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