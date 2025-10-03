import React, { useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  SafeAreaView,
  Modal,
} from "react-native";
import { useInspections } from "../../hooks/useInspections";
import { useRouter } from "expo-router";

// Define the inspection type explicitly
interface Inspection {
  id: string;
  address: string;
  date: string;
  status: string;
  sync_status: string;
  categories: Record<string, boolean>;
  created_at: string;
  updated_at: string;
  inspector_id: string | null;
}

const SavedInspectionsList = () => {
  const router = useRouter();
  const { inspections, loading, error, deleteInspection, refetch } = useInspections();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "complete" | "incomplete">("all");
  const [filterSync, setFilterSync] = useState<"all" | "synced" | "not-synced">("all");
  const [refreshing, setRefreshing] = useState(false);
  
  // Modal states
  const [showViewModal, setShowViewModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedInspection, setSelectedInspection] = useState<Inspection | null>(null);

  // Filter inspections based on search query and filters
  const filteredInspections = inspections.filter((inspection) => {
    // Search filter
    const matchesSearch = inspection.address
      .toLowerCase()
      .includes(searchQuery.toLowerCase());

    // Status filter
    const matchesStatus =
      filterStatus === "all" || inspection.status === filterStatus;

    // Sync filter
    const matchesSync =
      filterSync === "all" || inspection.sync_status === filterSync;

    return matchesSearch && matchesStatus && matchesSync;
  });

  // Handle inspection deletion with confirmation
  const handleDeleteInspection = (id: string) => {
    console.log('Delete button pressed for inspection:', id);
    const inspection = inspections.find(i => i.id === id);
    
    if (inspection) {
      setSelectedInspection(inspection);
      setShowDeleteModal(true);
    }
  };

  // Confirm deletion
  const confirmDelete = async () => {
    if (selectedInspection) {
      try {
        console.log('Deleting inspection:', selectedInspection.id);
        await deleteInspection(selectedInspection.id);
        setShowDeleteModal(false);
        setSelectedInspection(null);
      } catch (err) {
        console.error('Delete error:', err);
      }
    }
  };

  // Handle refresh action
  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  // Navigate to view inspection details
  const handleViewInspection = (id: string) => {
    console.log('View button pressed for inspection:', id);
    const inspection = inspections.find(i => i.id === id);
    console.log('Found inspection:', inspection);
    
    if (inspection) {
      setSelectedInspection(inspection);
      setShowViewModal(true);
    }
  };

  // Navigate to edit inspection
  const handleEditInspection = (id: string) => {
    console.log('Edit button pressed for inspection:', id);
    // Navigate back to the main app with the inspection ID
    router.push(`/?inspectionId=${id}`);
  };

  // Navigate back to home
  const handleGoBack = () => {
    router.back();
  };

  // Render each inspection item
  const renderInspectionItem = ({ item }: { item: Inspection }) => {
    // Calculate progress percentage
    const completedCategories = Object.values(item.categories).filter(Boolean).length;
    const totalCategories = Object.keys(item.categories).length;
    const progressPercentage = Math.round(
      (completedCategories / totalCategories) * 100,
    );

    return (
      <View className="mb-4 bg-white rounded-lg shadow p-4 border border-gray-200">
        <View className="flex-row justify-between items-center mb-2">
          <Text className="text-lg font-bold text-gray-800 flex-1 mr-2">
            {item.address}
          </Text>
          <View className="flex-row items-center">
            <Text className="text-xs">
              {item.sync_status === "synced" ? "✓" : "⚠"}
            </Text>
          </View>
        </View>

        <View className="mb-3">
          <Text className="text-gray-600">
            Date: {new Date(item.date).toLocaleDateString()}
          </Text>
          <View className="flex-row items-center mt-1">
            <Text className="text-gray-600 mr-2">Status: </Text>
            <View
              className={`px-2 py-1 rounded-full ${
                item.status === "complete" ? "bg-green-100" : "bg-amber-100"
              }`}
            >
              <Text
                className={`text-xs font-medium ${
                  item.status === "complete" ? "text-green-800" : "text-amber-800"
                }`}
              >
                {item.status === "complete" ? "Complete" : "Incomplete"}
              </Text>
            </View>
          </View>
        </View>

        <View className="mb-3">
          <Text className="text-gray-600 mb-1">
            Progress: {progressPercentage}%
          </Text>
          <View className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <View
              className={`h-full ${
                progressPercentage === 100 ? "bg-green-500" : "bg-blue-500"
              }`}
              style={{ width: `${progressPercentage}%` }}
            />
          </View>
        </View>

        <View className="flex-row justify-end pt-2 border-t border-gray-100">
          <TouchableOpacity
            className="mr-4 p-3 rounded-lg bg-blue-50 min-w-[44] min-h-[44] items-center justify-center"
            onPress={() => handleViewInspection(item.id)}
            activeOpacity={0.7}
          >
            <Text className="text-blue-600 text-lg">👁</Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="mr-4 p-3 rounded-lg bg-amber-50 min-w-[44] min-h-[44] items-center justify-center"
            onPress={() => handleEditInspection(item.id)}
            activeOpacity={0.7}
          >
            <Text className="text-amber-600 text-lg">✏️</Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="p-3 rounded-lg bg-red-50 min-w-[44] min-h-[44] items-center justify-center"
            onPress={() => handleDeleteInspection(item.id)}
            activeOpacity={0.7}
          >
            <Text className="text-red-600 text-lg">🗑</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // Loading state
  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text className="mt-2 text-gray-600">Loading inspections...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Error state
  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <View className="flex-1 justify-center items-center p-4">
          <Text className="text-red-600 text-center mb-4">Error: {error}</Text>
          <TouchableOpacity
            className="bg-blue-500 px-4 py-2 rounded-lg"
            onPress={handleRefresh}
          >
            <Text className="text-white font-medium">Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Main content
  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white p-4 border-b border-gray-200 flex-row items-center">
        <TouchableOpacity onPress={handleGoBack} className="mr-3">
          <Text className="text-gray-600 text-lg">←</Text>
        </TouchableOpacity>
        <Text className="text-xl font-bold text-gray-800">Saved Inspections</Text>
      </View>

      <View className="flex-1 p-4">
        {/* Search bar */}
        <View className="mb-4">
          <View className="flex-row items-center bg-white rounded-lg px-3 py-2 border border-gray-200">
            <Text className="text-gray-400">🔍</Text>
            <TextInput
              className="flex-1 ml-2 text-gray-800"
              placeholder="Search inspections..."
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
        </View>

        {/* Filter header */}
        <View className="flex-row mb-4 justify-between">
          <View className="flex-row items-center">
            <Text className="text-gray-600">🔽 Filters:</Text>
          </View>

          <TouchableOpacity
            className="p-2 rounded-full bg-white border border-gray-200"
            onPress={handleRefresh}
            disabled={refreshing}
          >
            <Text className={refreshing ? "text-gray-400" : "text-gray-600"}>🔄</Text>
          </TouchableOpacity>
        </View>

        {/* Status filters */}
        <View className="flex-row mb-4 justify-between">
          <View className="flex-row">
            <TouchableOpacity
              className={`mr-2 px-3 py-1 rounded-full ${
                filterStatus === "all" ? "bg-gray-200" : "bg-white border border-gray-200"
              }`}
              onPress={() => setFilterStatus("all")}
            >
              <Text className="text-xs font-medium text-gray-700">All</Text>
            </TouchableOpacity>

            <TouchableOpacity
              className={`mr-2 px-3 py-1 rounded-full ${
                filterStatus === "complete" ? "bg-green-100" : "bg-white border border-gray-200"
              }`}
              onPress={() => setFilterStatus("complete")}
            >
              <Text className="text-xs font-medium text-gray-700">Complete</Text>
            </TouchableOpacity>

            <TouchableOpacity
              className={`px-3 py-1 rounded-full ${
                filterStatus === "incomplete" ? "bg-amber-100" : "bg-white border border-gray-200"
              }`}
              onPress={() => setFilterStatus("incomplete")}
            >
              <Text className="text-xs font-medium text-gray-700">
                Incomplete
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Sync status filters */}
        <View className="flex-row mb-4 justify-end">
          <TouchableOpacity
            className={`mr-2 px-3 py-1 rounded-full ${
              filterSync === "all" ? "bg-gray-200" : "bg-white border border-gray-200"
            }`}
            onPress={() => setFilterSync("all")}
          >
            <Text className="text-xs font-medium text-gray-700">All</Text>
          </TouchableOpacity>

          <TouchableOpacity
            className={`mr-2 px-3 py-1 rounded-full ${
              filterSync === "synced" ? "bg-green-100" : "bg-white border border-gray-200"
            }`}
            onPress={() => setFilterSync("synced")}
          >
            <Text className="text-xs font-medium text-gray-700">Synced</Text>
          </TouchableOpacity>

          <TouchableOpacity
            className={`px-3 py-1 rounded-full ${
              filterSync === "not-synced" ? "bg-amber-100" : "bg-white border border-gray-200"
            }`}
            onPress={() => setFilterSync("not-synced")}
          >
            <Text className="text-xs font-medium text-gray-700">Not Synced</Text>
          </TouchableOpacity>
        </View>

        {/* Inspection count */}
        <View className="flex-row justify-between items-center mb-2">
          <Text className="text-gray-700 font-medium">
            {filteredInspections.length} Inspections
          </Text>
          <View className="flex-row items-center">
            <View className="h-2 w-2 rounded-full bg-green-500 mr-1" />
            <Text className="text-xs text-gray-600">Online</Text>
          </View>
        </View>

        {/* Inspection list */}
        {filteredInspections.length > 0 ? (
          <FlatList
            data={filteredInspections}
            renderItem={renderInspectionItem}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            className="flex-1"
            refreshing={refreshing}
            onRefresh={handleRefresh}
          />
        ) : (
          <View className="flex-1 justify-center items-center bg-white rounded-lg p-8">
            <Text className="text-gray-500 text-center mb-2">
              No inspections found
            </Text>
            <Text className="text-gray-400 text-center text-sm">
              Try adjusting your search or filters
            </Text>
          </View>
        )}
      </View>

      {/* View Inspection Modal */}
      <Modal
        visible={showViewModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowViewModal(false)}
      >
        <View className="flex-1 bg-black/50 justify-center items-center p-4">
          <View className="bg-white rounded-lg p-6 w-full max-w-md">
            <Text className="text-xl font-bold text-gray-800 mb-4">Inspection Details</Text>
            
            {selectedInspection && (
              <View className="space-y-3">
                <View>
                  <Text className="text-gray-600 text-sm">Address</Text>
                  <Text className="text-gray-800 font-medium">{selectedInspection.address}</Text>
                </View>
                
                <View>
                  <Text className="text-gray-600 text-sm">Date</Text>
                  <Text className="text-gray-800">{new Date(selectedInspection.date).toLocaleDateString()}</Text>
                </View>
                
                <View>
                  <Text className="text-gray-600 text-sm">Status</Text>
                  <Text className="text-gray-800">{selectedInspection.status}</Text>
                </View>
                
                <View>
                  <Text className="text-gray-600 text-sm">Progress</Text>
                  <Text className="text-gray-800">
                    {Math.round((Object.values(selectedInspection.categories || {}).filter(Boolean).length / 
                    Object.keys(selectedInspection.categories || {}).length) * 100) || 0}%
                  </Text>
                </View>
                
                <View>
                  <Text className="text-gray-600 text-sm">Sync Status</Text>
                  <Text className="text-gray-800">{selectedInspection.sync_status}</Text>
                </View>
                
                <View>
                  <Text className="text-gray-600 text-sm">Created</Text>
                  <Text className="text-gray-800">{new Date(selectedInspection.created_at).toLocaleDateString()}</Text>
                </View>
              </View>
            )}
            
            <TouchableOpacity
              className="mt-6 bg-blue-500 py-3 rounded-lg"
              onPress={() => setShowViewModal(false)}
            >
              <Text className="text-white text-center font-medium">Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        visible={showDeleteModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDeleteModal(false)}
      >
        <View className="flex-1 bg-black/50 justify-center items-center p-4">
          <View className="bg-white rounded-lg p-6 w-full max-w-md">
            <Text className="text-xl font-bold text-gray-800 mb-4">Delete Inspection</Text>
            
            <Text className="text-gray-600 mb-6">
              Are you sure you want to delete this inspection? This action cannot be undone.
            </Text>
            
            {selectedInspection && (
              <Text className="text-gray-800 font-medium mb-6">
                {selectedInspection.address}
              </Text>
            )}
            
            <View className="flex-row space-x-3">
              <TouchableOpacity
                className="flex-1 bg-gray-200 py-3 rounded-lg"
                onPress={() => {
                  setShowDeleteModal(false);
                  setSelectedInspection(null);
                }}
              >
                <Text className="text-gray-800 text-center font-medium">Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                className="flex-1 bg-red-500 py-3 rounded-lg"
                onPress={confirmDelete}
              >
                <Text className="text-white text-center font-medium">Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default SavedInspectionsList;