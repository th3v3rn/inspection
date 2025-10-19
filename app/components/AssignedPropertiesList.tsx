import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, SafeAreaView, StatusBar, StyleSheet, Platform, useColorScheme } from 'react-native';
import { supabase } from '../../lib/supabase';

interface AssignedPropertiesListProps {
  currentUser: any;
  onSelectInspection: (inspection: any) => void;
  onBack: () => void;
}

export default function AssignedPropertiesList({ currentUser, onSelectInspection, onBack }: AssignedPropertiesListProps) {
  // Use system color scheme
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';
  
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAssignments();
  }, []);

  const loadAssignments = async () => {
    try {
      // Query the assignments_with_inspections view
      const { data, error } = await supabase
        .from('assignments_with_inspections')
        .select('*')
        .eq('inspector_id', currentUser.id)
        .order('assignment_id', { ascending: false });

      if (error) throw error;
      
      // Transform the data to match the expected format
      const transformedData = (data || []).map(assignment => ({
        assignment_id: assignment.assignment_id,
        inspection_id: assignment.inspection_id,
        property_id: assignment.inspection_id, // Use inspection_id as property_id
        address: assignment.address || 'No address',
        inspection_status: assignment.inspection_status || 'pending',
      }));
      
      setAssignments(transformedData);
    } catch (error) {
      console.error('Error loading assignments:', error);
    } finally {
      setLoading(false)
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
    <SafeAreaView style={[styles.container, !isDarkMode && styles.containerLight]}>
      <StatusBar 
        barStyle={isDarkMode ? "light-content" : "dark-content"} 
        backgroundColor={isDarkMode ? "#111827" : "#ffffff"} 
      />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={[styles.backButtonText, !isDarkMode && styles.backButtonTextLight]}>← Back</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, !isDarkMode && styles.headerTitleLight]}>Assigned Properties</Text>
        <View style={styles.backButton} />
      </View>

      <View style={styles.content}>
        {/* Assignments List */}
        <ScrollView style={styles.scrollView}>
          {assignments.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No assigned inspections</Text>
            </View>
          ) : (
            assignments.map((assignment) => (
              <TouchableOpacity
                key={assignment.assignment_id}
                style={styles.assignmentCard}
                onPress={() => {
                  // Create inspection object from the assignment data
                  const inspection = {
                    id: assignment.inspection_id, // Use the actual inspection ID
                    address: assignment.address,
                    property_id: assignment.property_id,
                    status: assignment.inspection_status,
                  };
                  onSelectInspection(inspection);
                }}
              >
                <View style={styles.assignmentHeader}>
                  <Text style={styles.assignmentAddress} numberOfLines={1}>
                    {assignment.address || 'No address'}
                  </Text>
                  <View style={[
                    styles.statusBadge,
                    assignment.inspection_status === 'complete' ? styles.statusComplete : styles.statusPending
                  ]}>
                    <Text style={[
                      styles.statusText,
                      assignment.inspection_status === 'complete' ? styles.statusCompleteText : styles.statusPendingText
                    ]}>
                      {assignment.inspection_status === 'complete' ? 'Complete' : 'In Progress'}
                    </Text>
                  </View>
                </View>
                <Text style={styles.assignmentDate}>
                  Assigned inspection
                </Text>
              </TouchableOpacity>
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
  assignmentCard: {
    backgroundColor: '#1f2937',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#374151',
  },
  assignmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  assignmentAddress: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f3f4f6',
    flex: 1,
    marginRight: 8,
  },
  assignmentDate: {
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
  statusPending: {
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
  statusPendingText: {
    color: '#fbbf24',
  },
});