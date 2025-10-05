import React, { useState, useEffect } from "react";
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
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Wifi, WifiOff, Plus, List, RefreshCw } from "lucide-react-native";
import { Image } from "expo-image";
import { useInspections } from "../hooks/useInspections";
import InspectionForm from "./components/InspectionForm";
import { PropertyProvider } from "./contexts/PropertyContext";

function HomeScreenContent() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const inspectionId = params.inspectionId as string;
  
  const { inspections, loading, refetch } = useInspections();
  const [isOnline, setIsOnline] = useState(true);
  const [syncing, setSyncing] = useState(false);

  // If inspectionId is provided, show the InspectionForm directly
  if (inspectionId) {
    return (
      <InspectionForm 
        onCancel={() => router.replace("/")}
        onSave={() => router.replace("/")}
      />
    );
  }

  // Get recent inspections (last 3)
  const recentInspections = inspections.slice(0, 3).map(inspection => ({
    id: inspection.id,
    address: inspection.address,
    date: new Date(inspection.date).toLocaleDateString(),
    status: inspection.status === 'complete' ? 'Complete' : 'In Progress',
    synced: inspection.sync_status === 'synced',
  }));

  // Fetch inspections on mount
  useEffect(() => {
    console.log("Home screen mounted, fetching inspections...");
    refetch();
  }, []);

  // More stable network status check
  useEffect(() => {
    // Set initial state to online
    setIsOnline(true);
    
    // Only check network status when app comes to foreground
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'active') {
        // In a real app, this would use NetInfo or similar to check actual connectivity
        // For now, we'll just assume online for demo purposes
        setIsOnline(true);
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const handleNewInspection = () => {
    router.push("/components/InspectionForm");
  };

  const handleViewSavedInspections = () => {
    router.push("/components/SavedInspectionsList");
  };

  const handleSyncData = async () => {
    setSyncing(true);
    await refetch();
    // Simulate sync delay
    setTimeout(() => {
      setSyncing(false);
    }, 1000);
  };

  const handleInspectionPress = (id) => {
    // Use replace instead of push to prevent navigation stacking
    router.replace(`/components/InspectionForm?id=${id}`);
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-100">
      <StatusBar barStyle="dark-content" />
      <View className="flex-1 p-4">
        {/* Header with logo and connection status */}
        <View className="flex-row justify-between items-center mb-6">
          <View className="flex-row items-center">
            <Image
              source={require("../assets/images/icon.png")}
              style={{ width: 40, height: 40 }}
              className="rounded-md"
            />
            <Text className="text-2xl font-bold ml-2 text-blue-800">
              Home Inspection Pro
            </Text>
          </View>
          <View className="flex-row items-center">
            {isOnline ? (
              <Wifi size={20} color="#10b981" />
            ) : (
              <WifiOff size={20} color="#ef4444" />
            )}
            <Text
              className={`ml-1 ${isOnline ? "text-green-600" : "text-red-500"}`}
            >
              {isOnline ? "Online" : "Offline"}
            </Text>
          </View>
        </View>

        {/* Main action buttons */}
        <View className="flex-row justify-between mb-8">
          <TouchableOpacity
            className="bg-blue-600 rounded-xl py-4 px-6 flex-1 mr-2 items-center"
            onPress={handleNewInspection}
          >
            <Plus size={24} color="#ffffff" />
            <Text className="text-white font-bold mt-2">New Inspection</Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="bg-gray-700 rounded-xl py-4 px-6 flex-1 ml-2 items-center"
            onPress={handleViewSavedInspections}
          >
            <List size={24} color="#ffffff" />
            <Text className="text-white font-bold mt-2">Saved Inspections</Text>
          </TouchableOpacity>
        </View>

        {/* Sync button */}
        <TouchableOpacity
          className={`rounded-xl py-3 px-6 mb-6 items-center flex-row justify-center ${isOnline ? "bg-green-600" : "bg-gray-400"}`}
          onPress={handleSyncData}
          disabled={!isOnline || syncing}
        >
          {syncing ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <RefreshCw size={20} color="#ffffff" />
          )}
          <Text className="text-white font-bold ml-2">
            {syncing ? "Syncing..." : "Sync Data"}
          </Text>
        </TouchableOpacity>

        {/* Recent inspections */}
        <View className="flex-1 bg-white rounded-xl p-4 shadow-sm">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-lg font-bold text-gray-800">
              Recent Inspections
            </Text>
            <TouchableOpacity onPress={refetch}>
              <RefreshCw size={16} color="#3b82f6" />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View className="items-center justify-center py-8">
              <ActivityIndicator size="large" color="#3b82f6" />
            </View>
          ) : (
            <ScrollView className="flex-1">
              {recentInspections.map((inspection) => (
                <TouchableOpacity
                  key={inspection.id}
                  className="border-b border-gray-200 py-3"
                  onPress={() => handleInspectionPress(inspection.id)}
                >
                  <Text className="font-medium text-gray-800">
                    {inspection.address}
                  </Text>
                  <View className="flex-row justify-between mt-1">
                    <Text className="text-gray-500">{inspection.date}</Text>
                    <View className="flex-row">
                      <Text
                        className={`mr-2 ${inspection.status === "Complete" ? "text-green-600" : "text-amber-500"}`}
                      >
                        {inspection.status}
                      </Text>
                      {inspection.synced ? (
                        <Text className="text-green-600">Synced</Text>
                      ) : (
                        <Text className="text-red-500">Not Synced</Text>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              ))}

              {recentInspections.length === 0 && (
                <View className="items-center justify-center py-8">
                  <Text className="text-gray-500">No recent inspections</Text>
                </View>
              )}
            </ScrollView>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

export default function HomeScreen() {
  return (
    <PropertyProvider>
      <HomeScreenContent />
    </PropertyProvider>
  );
}