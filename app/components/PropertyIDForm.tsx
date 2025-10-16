import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  Platform,
  FlatList,
  PanResponder,
} from "react-native";
import { useProperty } from "../contexts/PropertyContext";
import { supabase } from "@/lib/supabase";

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
  const [isLoadingPropertyData, setIsLoadingPropertyData] = useState(false);
  const [addressQuery, setAddressQuery] = useState("");
  const [addressSuggestions, setAddressSuggestions] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Swipe-back gesture handler
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: (evt, gestureState) => {
        // Only activate if swipe starts from left edge (first 50px)
        return evt.nativeEvent.pageX < 50;
      },
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        // Activate if horizontal swipe from left edge
        return evt.nativeEvent.pageX < 50 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy);
      },
      onPanResponderRelease: (evt, gestureState) => {
        // If swiped right more than 100px, trigger back
        if (gestureState.dx > 100) {
          onCancel();
        }
      },
    })
  ).current;
  
  // Initialize form data with new fields
  const [formData, setFormData] = useState({
    address: "",
    acres: "",
    parcelAccount: "",
    parcelId: "",
    numberOfStories: "",
    floorPercentages: [] as { floor: number; percentage: string }[],
    sqft: "",
    yearBuilt: "",
    structureType: "",
    siteAccess: "",
    structureUse: "",
    overallQuality: "",
    detachedStructures: [] as string[],
    beds: "",
    bathrooms: "",
    notes: "",
  });

  // Detached structure options
  const detachedStructureOptions = ["Garage", "Shed", "Pool", "Barn", "Workshop", "Guest House"];

  // Fetch current user
  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: userData } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single();
        setCurrentUser(userData);
      }
    };
    fetchUser();
  }, []);

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
      
      const numberOfStories = propertyApiData?.building_sqft ? "2" : "";
      const stories = parseInt(numberOfStories) || 0;
      const floorPercentages = stories > 1 
        ? Array.from({ length: stories }, (_, i) => ({
            floor: i + 1,
            percentage: ""
          }))
        : [];
      
      const newFormData = {
        address: fullAddress,
        acres: propertyApiData?.acres?.toString() || "",
        parcelAccount: propertyApiData?.parcel_account_number?.toString() || "",
        parcelId: propertyApiData?.parcel_raw_number?.toString() || "",
        numberOfStories,
        floorPercentages,
        sqft: propertyApiData?.building_sqft?.toString() || "",
        yearBuilt: propertyApiData?.year_built?.toString() || "",
        structureType: propertyApiData?.land_use_standard?.replace(/_/g, " ") || "",
        siteAccess: "",
        structureUse: propertyApiData?.land_use_group || "",
        overallQuality: "",
        detachedStructures: [],
        beds: propertyApiData?.bedrooms?.toString() || "",
        bathrooms: propertyApiData?.bathrooms_total?.toString() || "",
        notes: "",
      };
      
      console.log("Setting form data to:", JSON.stringify(newFormData, null, 2));
      setFormData(newFormData);
      setAddressQuery(fullAddress);
      setIsLoadingPropertyData(false);
    } else if (initialData?.address) {
      // Fallback to initialData if no Smarty data available
      console.log("Using initialData fallback");
      
      const numberOfStories = initialData.numberOfStories || "";
      const stories = parseInt(numberOfStories) || 0;
      const floorPercentages = stories > 1 
        ? Array.from({ length: stories }, (_, i) => ({
            floor: i + 1,
            percentage: initialData.floorPercentages?.[i]?.percentage || ""
          }))
        : [];
      
      setFormData({
        address: initialData.address || "",
        acres: initialData.acres || "",
        parcelAccount: initialData.parcelAccount || "",
        parcelId: initialData.parcelId || "",
        numberOfStories,
        floorPercentages,
        sqft: initialData.sqft || "",
        yearBuilt: initialData.yearBuilt || "",
        structureType: initialData.structureType || "",
        siteAccess: "",
        structureUse: initialData.structureUse || "",
        overallQuality: initialData.overallQuality || "",
        detachedStructures: [],
        beds: initialData.beds || "",
        bathrooms: initialData.bathrooms || "",
        notes: initialData.notes || "",
      });
      setAddressQuery(initialData.address || "");
      setIsLoadingPropertyData(false);
    } else {
      setIsLoadingPropertyData(false);
    }
  }, [globalPropertyData, initialData]);

  // Google Places API autocomplete with debounce
  const searchAddress = async (query: string) => {
    console.log("Searching for address:", query);
    
    if (query.length < 3) {
      setAddressSuggestions([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    try {
      const { data, error } = await supabase.functions.invoke('supabase-functions-google-places-proxy', {
        body: { query }
      });

      if (error) {
        console.error('Error searching address:', error);
        setIsSearching(false);
        return;
      }

      if (data?.predictions) {
        setAddressSuggestions(data.predictions);
      }
    } catch (error) {
      console.error('Error searching address:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddressChange = (text: string) => {
    setAddressQuery(text);
    
    // Clear existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    // Set searching state immediately for UI feedback
    if (text.length >= 3) {
      setIsSearching(true);
    } else {
      setIsSearching(false);
      setAddressSuggestions([]);
    }
    
    // Debounce search by 500ms
    searchTimeoutRef.current = setTimeout(() => {
      searchAddress(text);
    }, 500);
  };

  const handleAddressFocus = () => {
    // Re-trigger search when input is focused if there's text
    if (addressQuery.length >= 3) {
      searchAddress(addressQuery);
    }
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  const selectAddress = (suggestion: any) => {
    const selectedAddress = suggestion.description;
    setAddressQuery(selectedAddress);
    setFormData(prev => ({ ...prev, address: selectedAddress }));
    setAddressSuggestions([]);
  };

  const handleFieldChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // If number of stories changes, update floor percentages array
    if (field === "numberOfStories") {
      const stories = parseInt(value) || 0;
      if (stories > 1) {
        const newPercentages = Array.from({ length: stories }, (_, i) => ({
          floor: i + 1,
          percentage: formData.floorPercentages[i]?.percentage || ""
        }));
        setFormData(prev => ({ ...prev, floorPercentages: newPercentages }));
      } else {
        setFormData(prev => ({ ...prev, floorPercentages: [] }));
      }
    }
  };

  const handleFloorPercentageChange = (floorIndex: number, value: string) => {
    const newPercentages = [...formData.floorPercentages];
    newPercentages[floorIndex] = { ...newPercentages[floorIndex], percentage: value };
    setFormData(prev => ({ ...prev, floorPercentages: newPercentages }));
  };

  const toggleDetachedStructure = (structure: string) => {
    setFormData(prev => ({
      ...prev,
      detachedStructures: prev.detachedStructures.includes(structure)
        ? prev.detachedStructures.filter(s => s !== structure)
        : [...prev.detachedStructures, structure]
    }));
  };

  const handleNext = () => {
    // Save data to parent's formData before navigating
    console.log("=== PropertyIDForm handleNext ===");
    console.log("Saving form data before next:", JSON.stringify(formData, null, 2));
    
    // Call onComplete to save the data to parent's formData
    onComplete({
      category: "Property ID",
      ...formData,
      completed: false, // Mark as not fully completed
      timestamp: new Date().toISOString(),
    });
    
    // Then navigate to next category
    if (onNext) {
      onNext();
    }
  };

  const handleComplete = () => {
    if (!formData.address) {
      Alert.alert("Error", "Address is required");
      return;
    }
    
    console.log("=== PropertyIDForm handleComplete ===");
    console.log("Sending form data:", JSON.stringify(formData, null, 2));
    
    onComplete({
      category: "Property ID",
      ...formData,
      completed: true,
      timestamp: new Date().toISOString(),
    });
  };

  const handlePrevious = () => {
    if (onPrevious) {
      onPrevious();
    }
  };

  const handleBackToCategories = () => {
    // Save data before going back to category selection
    console.log("=== PropertyIDForm handleBackToCategories ===");
    console.log("Saving form data before back:", JSON.stringify(formData, null, 2));
    
    onComplete({
      category: "Property ID",
      ...formData,
      completed: true,
      timestamp: new Date().toISOString(),
    });
    
    // Call onCancel to go back to category selection
    onCancel();
  };

  if (isLoadingPropertyData && !globalPropertyData) {
    return (
      <SafeAreaView className="flex-1 bg-gray-900" style={{ paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 }}>
        <StatusBar barStyle="light-content" backgroundColor="#111827" />
        <View className="flex-1 bg-gray-900 justify-center items-center">
          <ActivityIndicator size="large" color="#9ca3af" />
          <Text className="mt-4 text-gray-300">Loading property data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-900" style={{ paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 }}>
      <StatusBar barStyle="light-content" backgroundColor="#111827" />
      
      {/* Header with Back Button */}
      <View className="bg-gray-800 p-4 border-b border-gray-700 flex-row items-center">
        <TouchableOpacity onPress={onCancel} className="mr-3 p-2">
          <Text className="text-gray-300 text-2xl">←</Text>
        </TouchableOpacity>
        <Text className="text-xl font-bold text-gray-100">Property Search</Text>
      </View>

      <ScrollView className="flex-1 bg-gray-900" {...panResponder.panHandlers}>
        <View className="p-4">
          <Text className="text-2xl font-bold text-gray-100 mb-6">
            Property Identification
          </Text>

          {/* Property Information Form */}
          <View className="bg-gray-800 p-4 rounded-lg border border-gray-600 mb-6">
            <Text className="text-lg font-semibold mb-4 text-gray-100">Property Details</Text>
            
            {/* Address Search with Google Places */}
            <View className="mb-4">
              <Text className="text-sm font-medium text-gray-200 mb-2">Address *</Text>
              <TextInput
                className="bg-gray-700 border border-gray-600 rounded-lg p-3 text-gray-100 placeholder-gray-400"
                value={addressQuery}
                onChangeText={handleAddressChange}
                onFocus={handleAddressFocus}
                placeholder="Start typing address..."
                placeholderTextColor="#9ca3af"
              />
              
              {/* Address Suggestions */}
              {addressSuggestions.length > 0 && (
                <View className="bg-gray-700 border border-gray-600 rounded-lg mt-2 max-h-48">
                  <FlatList
                    data={addressSuggestions}
                    keyExtractor={(item) => item.place_id}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        onPress={() => selectAddress(item)}
                        className="p-3 border-b border-gray-600"
                      >
                        <Text className="text-gray-100">{item.description}</Text>
                      </TouchableOpacity>
                    )}
                  />
                </View>
              )}
              
              {isSearching && (
                <View className="mt-2">
                  <ActivityIndicator size="small" color="#9ca3af" />
                </View>
              )}
            </View>

            {/* Acres */}
            <View className="mb-4">
              <Text className="text-sm font-medium text-gray-200 mb-2">Acres</Text>
              <TextInput
                className="bg-gray-700 border border-gray-600 rounded-lg p-3 text-gray-100 placeholder-gray-400"
                value={formData.acres}
                onChangeText={(text) => handleFieldChange("acres", text)}
                placeholder="e.g., 0.5"
                placeholderTextColor="#9ca3af"
                keyboardType="numeric"
              />
            </View>

            {/* Parcel Account */}
            <View className="mb-4">
              <Text className="text-sm font-medium text-gray-200 mb-2">Parcel Account</Text>
              <TextInput
                className="bg-gray-700 border border-gray-600 rounded-lg p-3 text-gray-100 placeholder-gray-400"
                value={formData.parcelAccount}
                onChangeText={(text) => handleFieldChange("parcelAccount", text)}
                placeholder="Enter parcel account number"
                placeholderTextColor="#9ca3af"
              />
            </View>

            {/* Parcel ID */}
            <View className="mb-4">
              <Text className="text-sm font-medium text-gray-200 mb-2">Parcel ID</Text>
              <TextInput
                className="bg-gray-700 border border-gray-600 rounded-lg p-3 text-gray-100 placeholder-gray-400"
                value={formData.parcelId}
                onChangeText={(text) => handleFieldChange("parcelId", text)}
                placeholder="Enter parcel ID"
                placeholderTextColor="#9ca3af"
              />
            </View>

            {/* Number of Stories */}
            <View className="mb-4">
              <Text className="text-sm font-medium text-gray-200 mb-2">Number of Stories</Text>
              <TextInput
                className="bg-gray-700 border border-gray-600 rounded-lg p-3 text-gray-100 placeholder-gray-400"
                value={formData.numberOfStories}
                onChangeText={(text) => handleFieldChange("numberOfStories", text)}
                placeholder="e.g., 2"
                placeholderTextColor="#9ca3af"
                keyboardType="numeric"
              />
            </View>

            {/* Floor Percentages (only show if > 1 story) */}
            {parseInt(formData.numberOfStories) > 1 && (
              <View className="mb-4">
                <Text className="text-sm font-medium text-gray-200 mb-3">Floor Percentages</Text>
                <View className="flex-row flex-wrap">
                  {formData.floorPercentages.map((floor, index) => (
                    <View key={index} className="mr-3 mb-2" style={{ width: 80 }}>
                      <Text className="text-gray-300 text-xs mb-1 text-center">Floor {floor.floor}</Text>
                      <TextInput
                        className="bg-gray-700 border border-gray-600 rounded-lg p-2 text-gray-100 placeholder-gray-400 text-center"
                        value={floor.percentage}
                        onChangeText={(text) => handleFloorPercentageChange(index, text)}
                        placeholder="%"
                        placeholderTextColor="#9ca3af"
                        keyboardType="numeric"
                      />
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Square Footage */}
            <View className="mb-4">
              <Text className="text-sm font-medium text-gray-200 mb-2">Square Footage</Text>
              <TextInput
                className="bg-gray-700 border border-gray-600 rounded-lg p-3 text-gray-100 placeholder-gray-400"
                value={formData.sqft}
                onChangeText={(text) => handleFieldChange("sqft", text)}
                placeholder="e.g., 3475"
                placeholderTextColor="#9ca3af"
                keyboardType="numeric"
              />
            </View>

            {/* Year Built */}
            <View className="mb-4">
              <Text className="text-sm font-medium text-gray-200 mb-2">Year Built</Text>
              <TextInput
                className="bg-gray-700 border border-gray-600 rounded-lg p-3 text-gray-100 placeholder-gray-400"
                value={formData.yearBuilt}
                onChangeText={(text) => handleFieldChange("yearBuilt", text)}
                placeholder="e.g., 2021"
                placeholderTextColor="#9ca3af"
                keyboardType="numeric"
              />
            </View>

            {/* Structure Type */}
            <View className="mb-4">
              <Text className="text-sm font-medium text-gray-200 mb-2">Structure Type</Text>
              <TextInput
                className="bg-gray-700 border border-gray-600 rounded-lg p-3 text-gray-100 placeholder-gray-400"
                value={formData.structureType}
                onChangeText={(text) => handleFieldChange("structureType", text)}
                placeholder="e.g., Ranch, Colonial, Cape Cod"
                placeholderTextColor="#9ca3af"
              />
            </View>

            {/* Site Access */}
            <View className="mb-4">
              <Text className="text-sm font-medium text-gray-200 mb-2">Site Access</Text>
              <TextInput
                className="bg-gray-700 border border-gray-600 rounded-lg p-3 text-gray-100 placeholder-gray-400"
                value={formData.siteAccess}
                onChangeText={(text) => handleFieldChange("siteAccess", text)}
                placeholder="Describe site access conditions"
                placeholderTextColor="#9ca3af"
                multiline
              />
            </View>

            {/* Structure Use */}
            <View className="mb-4">
              <Text className="text-sm font-medium text-gray-200 mb-2">Structure Use</Text>
              <TextInput
                className="bg-gray-700 border border-gray-600 rounded-lg p-3 text-gray-100 placeholder-gray-400"
                value={formData.structureUse}
                onChangeText={(text) => handleFieldChange("structureUse", text)}
                placeholder="e.g., Residential, Commercial"
                placeholderTextColor="#9ca3af"
              />
            </View>

            {/* Overall Quality */}
            <View className="mb-4">
              <Text className="text-sm font-medium text-gray-200 mb-2">Overall Quality</Text>
              <TextInput
                className="bg-gray-700 border border-gray-600 rounded-lg p-3 text-gray-100 placeholder-gray-400"
                value={formData.overallQuality}
                onChangeText={(text) => handleFieldChange("overallQuality", text)}
                placeholder="e.g., Excellent, Good, Fair, Poor"
                placeholderTextColor="#9ca3af"
              />
            </View>

            {/* Detached Structures */}
            <View className="mb-4">
              <Text className="text-sm font-medium text-gray-200 mb-3">Detached Structures</Text>
              <View className="flex-row flex-wrap">
                {detachedStructureOptions.map((structure) => (
                  <TouchableOpacity
                    key={structure}
                    onPress={() => toggleDetachedStructure(structure)}
                    className={`mr-2 mb-2 px-4 py-2 rounded-lg border ${
                      formData.detachedStructures.includes(structure)
                        ? "bg-blue-600 border-blue-500"
                        : "bg-gray-700 border-gray-600"
                    }`}
                  >
                    <Text
                      className={
                        formData.detachedStructures.includes(structure)
                          ? "text-white font-semibold"
                          : "text-gray-300"
                      }
                    >
                      {structure}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Bedrooms */}
            <View className="mb-4">
              <Text className="text-sm font-medium text-gray-200 mb-2">Bedrooms</Text>
              <TextInput
                className="bg-gray-700 border border-gray-600 rounded-lg p-3 text-gray-100 placeholder-gray-400"
                value={formData.beds}
                onChangeText={(text) => handleFieldChange("beds", text)}
                placeholder="e.g., 3"
                placeholderTextColor="#9ca3af"
                keyboardType="numeric"
              />
            </View>

            {/* Bathrooms */}
            <View className="mb-4">
              <Text className="text-sm font-medium text-gray-200 mb-2">Bathrooms</Text>
              <TextInput
                className="bg-gray-700 border border-gray-600 rounded-lg p-3 text-gray-100 placeholder-gray-400"
                value={formData.bathrooms}
                onChangeText={(text) => handleFieldChange("bathrooms", text)}
                placeholder="e.g., 2.5"
                placeholderTextColor="#9ca3af"
                keyboardType="numeric"
              />
            </View>
          </View>

          {/* Notes Section */}
          <View className="bg-gray-800 p-4 rounded-lg border border-gray-600 mb-6">
            <Text className="text-lg font-semibold mb-4 text-gray-100">Additional Notes</Text>
            <TextInput
              className="bg-gray-700 border border-gray-600 rounded-lg p-3 min-h-[100px] text-gray-100 placeholder-gray-400"
              placeholder="Enter any additional notes about the property..."
              placeholderTextColor="#9ca3af"
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
              className={`flex-1 py-3 px-4 rounded-lg mr-2 border ${
                isFirstCategory ? "bg-gray-700 border-gray-600" : "bg-gray-600 border-gray-500"
              }`}
            >
              <Text
                className={`text-center font-semibold ${
                  isFirstCategory ? "text-gray-400" : "text-gray-100"
                }`}
              >
                ← Previous
              </Text>
            </TouchableOpacity>

            {/* Complete/Back Button */}
            <TouchableOpacity
              onPress={handleBackToCategories}
              className="bg-gray-700 py-3 px-6 rounded-lg mx-2 border border-gray-600"
            >
              <Text className="text-gray-100 text-center font-semibold">
                Complete
              </Text>
            </TouchableOpacity>

            {/* Next Button */}
            <TouchableOpacity
              onPress={handleNext}
              disabled={isLastCategory}
              className={`flex-1 py-3 px-4 rounded-lg ml-2 border ${
                isLastCategory ? "bg-gray-700 border-gray-600" : "bg-gray-600 border-gray-500"
              }`}
            >
              <Text
                className={`text-center font-semibold ${
                  isLastCategory ? "text-gray-400" : "text-gray-100"
                }`}
              >
                Next →
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default PropertyIDForm;