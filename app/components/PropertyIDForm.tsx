import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useProperty } from "../contexts/PropertyContext";

interface PropertyIDFormProps {
  onComplete: (data: any) => void;
  onCancel: () => void;
  onNext?: () => void;
  onPrevious?: () => void;
  isFirstCategory?: boolean;
  isLastCategory?: boolean;
  initialData?: any;
}

const PropertyIDForm = ({
  onComplete,
  onCancel,
  onNext = () => {},
  onPrevious = () => {},
  isFirstCategory = true,
  isLastCategory = false,
  initialData = null,
}: PropertyIDFormProps) => {
  const { propertyData: globalPropertyData } = useProperty();
  const [isLoadingPropertyData, setIsLoadingPropertyData] = useState(true);
  
  // Initialize form data from global property data or initial data
  const [formData, setFormData] = useState({
    address: "",
    numberOfStories: "",
    sqft: "",
    yearBuilt: "",
    structureType: "",
    structureUse: "",
    overallQuality: "",
    notes: "",
  });

  // Auto-populate fields when component mounts or when data changes
  useEffect(() => {
    console.log("=== PropertyIDForm Debug ===");
    console.log("initialData:", JSON.stringify(initialData, null, 2));
    console.log("globalPropertyData:", JSON.stringify(globalPropertyData, null, 2));
    
    // Priority: initialData.propertyApiData > globalPropertyData > initialData
    const propertyApiData = initialData?.propertyApiData?.propertyData?.attributes || 
                           globalPropertyData?.propertyData?.propertyData?.attributes;
    
    if (propertyApiData) {
      console.log("✅ Found property API data");
      console.log("Extracted propertyApiData:", JSON.stringify(propertyApiData, null, 2));
      console.log("year_built:", propertyApiData?.year_built);
      console.log("building_sqft:", propertyApiData?.building_sqft);
      
      const fullAddress = initialData?.propertyApiData?.fullAddress || 
                         globalPropertyData?.fullAddress || 
                         globalPropertyData?.propertyAddress || 
                         initialData?.address || 
                         "";
      
      const newFormData = {
        address: fullAddress,
        numberOfStories: propertyApiData?.building_sqft ? "2" : "", // Smarty doesn't provide stories directly
        sqft: propertyApiData?.building_sqft?.toString() || "",
        yearBuilt: propertyApiData?.year_built?.toString() || "",
        structureType: propertyApiData?.land_use_standard?.replace(/_/g, " ") || "",
        structureUse: propertyApiData?.land_use_group || "",
        overallQuality: "",
        notes: "",
      };
      
      console.log("Setting form data to:", JSON.stringify(newFormData, null, 2));
      setFormData(newFormData);
      setIsLoadingPropertyData(false);
    } else if (initialData?.address) {
      // Fallback to initialData if no Smarty data available
      console.log("Using initialData fallback");
      setFormData({
        address: initialData.address || "",
        numberOfStories: initialData.numberOfStories || "",
        sqft: initialData.sqft || "",
        yearBuilt: initialData.yearBuilt || "",
        structureType: initialData.structureType || "",
        structureUse: initialData.structureUse || "",
        overallQuality: initialData.overallQuality || "",
        notes: initialData.notes || "",
      });
      
      // Keep loading for a bit to wait for API
      const timer = setTimeout(() => {
        setIsLoadingPropertyData(false);
      }, 2000);
      
      return () => clearTimeout(timer);
    } else {
      setIsLoadingPropertyData(false);
    }
  }, [globalPropertyData, initialData?.propertyApiData]);

  const handleFieldChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleComplete = () => {
    if (!formData.address) {
      Alert.alert("Error", "Address is required");
      return;
    }
    
    onComplete({
      category: "Property ID",
      ...formData,
      completed: true
    });
  };

  const handleNext = () => {
    handleComplete();
    if (onNext) {
      onNext();
    }
  };

  const handlePrevious = () => {
    handleComplete();
    if (onPrevious) {
      onPrevious();
    }
  };

  const handleBackToCategories = () => {
    handleComplete();
    if (onCancel) {
      onCancel();
    }
  };

  if (isLoadingPropertyData && !globalPropertyData) {
    return (
      <View className="flex-1 bg-gray-50 justify-center items-center">
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text className="mt-4 text-gray-600">Loading property data...</Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-gray-50">
      <View className="p-4">
        <Text className="text-2xl font-bold text-gray-800 mb-6">
          Property Identification
        </Text>

        {/* Property Information Form */}
        <View className="bg-white p-4 rounded-lg shadow-sm mb-6">
          <Text className="text-lg font-semibold mb-4">Property Details</Text>
          
          {/* Address */}
          <View className="mb-4">
            <Text className="text-sm font-medium text-gray-700 mb-2">Address</Text>
            <TextInput
              className="border border-gray-300 rounded-lg p-3 bg-gray-50"
              value={formData.address}
              onChangeText={(text) => handleFieldChange("address", text)}
              placeholder="Property address"
            />
          </View>

          {/* Number of Stories */}
          <View className="mb-4">
            <Text className="text-sm font-medium text-gray-700 mb-2">Number of Stories</Text>
            <TextInput
              className="border border-gray-300 rounded-lg p-3"
              value={formData.numberOfStories}
              onChangeText={(text) => handleFieldChange("numberOfStories", text)}
              placeholder="e.g., 2"
              keyboardType="numeric"
            />
          </View>

          {/* Square Footage */}
          <View className="mb-4">
            <Text className="text-sm font-medium text-gray-700 mb-2">Square Footage</Text>
            <TextInput
              className="border border-gray-300 rounded-lg p-3"
              value={formData.sqft}
              onChangeText={(text) => handleFieldChange("sqft", text)}
              placeholder="e.g., 3475"
              keyboardType="numeric"
            />
          </View>

          {/* Year Built */}
          <View className="mb-4">
            <Text className="text-sm font-medium text-gray-700 mb-2">Year Built</Text>
            <TextInput
              className="border border-gray-300 rounded-lg p-3"
              value={formData.yearBuilt}
              onChangeText={(text) => handleFieldChange("yearBuilt", text)}
              placeholder="e.g., 2021"
              keyboardType="numeric"
            />
          </View>

          {/* Structure Type */}
          <View className="mb-4">
            <Text className="text-sm font-medium text-gray-700 mb-2">Structure Type</Text>
            <TextInput
              className="border border-gray-300 rounded-lg p-3"
              value={formData.structureType}
              onChangeText={(text) => handleFieldChange("structureType", text)}
              placeholder="e.g., Single Family, Multi-Family"
            />
          </View>

          {/* Structure Use */}
          <View className="mb-4">
            <Text className="text-sm font-medium text-gray-700 mb-2">Structure Use</Text>
            <TextInput
              className="border border-gray-300 rounded-lg p-3"
              value={formData.structureUse}
              onChangeText={(text) => handleFieldChange("structureUse", text)}
              placeholder="e.g., Residential, Commercial"
            />
          </View>

          {/* Overall Quality */}
          <View className="mb-4">
            <Text className="text-sm font-medium text-gray-700 mb-2">Overall Quality</Text>
            <TextInput
              className="border border-gray-300 rounded-lg p-3"
              value={formData.overallQuality}
              onChangeText={(text) => handleFieldChange("overallQuality", text)}
              placeholder="e.g., Excellent, Good, Fair, Poor"
            />
          </View>
        </View>

        {/* Notes Section */}
        <View className="bg-white p-4 rounded-lg shadow-sm mb-6">
          <Text className="text-lg font-semibold mb-4">Additional Notes</Text>
          <TextInput
            className="border border-gray-300 rounded-lg p-3 min-h-[100px]"
            placeholder="Enter any additional notes about the property..."
            multiline
            textAlignVertical="top"
            value={formData.notes}
            onChangeText={(text) => handleFieldChange("notes", text)}
          />
        </View>

        {/* Navigation Buttons */}
        <View className="flex-row justify-between items-center mt-6 mb-8">
          {/* Previous Button */}
          <TouchableOpacity
            onPress={handlePrevious}
            disabled={isFirstCategory}
            className={`flex-1 py-3 px-4 rounded-lg mr-2 ${
              isFirstCategory ? "bg-gray-300" : "bg-blue-500"
            }`}
          >
            <Text
              className={`text-center font-semibold ${
                isFirstCategory ? "text-gray-500" : "text-white"
              }`}
            >
              ← Previous
            </Text>
          </TouchableOpacity>

          {/* Complete/Back Button */}
          <TouchableOpacity
            onPress={handleBackToCategories}
            className="bg-green-500 py-3 px-6 rounded-lg mx-2"
          >
            <Text className="text-white text-center font-semibold">
              Complete
            </Text>
          </TouchableOpacity>

          {/* Next Button */}
          <TouchableOpacity
            onPress={handleNext}
            disabled={isLastCategory}
            className={`flex-1 py-3 px-4 rounded-lg ml-2 ${
              isLastCategory ? "bg-gray-300" : "bg-blue-500"
            }`}
          >
            <Text
              className={`text-center font-semibold ${
                isLastCategory ? "text-gray-500" : "text-white"
              }`}
            >
              Next →
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

export default PropertyIDForm;