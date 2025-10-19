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
  StyleSheet,
  useColorScheme,
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
  inspectionId?: string;
}

const PropertyIDForm = ({
  onComplete,
  onCancel,
  onNext = () => {},
  onPrevious = () => {},
  isFirstCategory = true,
  isLastCategory = false,
  initialData = null,
  inspectionId,
}: PropertyIDFormProps) => {
  // Use system color scheme
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';
  
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
    
    // CRITICAL: Check if we have saved form data first (from categories or property_metadata)
    const hasSavedData = initialData && (
      initialData.acres || 
      initialData.parcelAccount || 
      initialData.parcel_account ||
      initialData.sqft ||
      initialData.yearBuilt ||
      initialData.year_built
    );
    
    if (hasSavedData) {
      // Load from saved data (highest priority)
      console.log("✅ Loading from saved data");
      
      const numberOfStories = initialData.numberOfStories || initialData.number_of_stories || "";
      const stories = parseInt(numberOfStories) || 0;
      const floorPercentages = stories > 1 
        ? Array.from({ length: stories }, (_, i) => ({
            floor: i + 1,
            percentage: initialData.floorPercentages?.[i]?.percentage || 
                       initialData.floor_percentages?.[i]?.percentage || ""
          }))
        : [];
      
      setFormData({
        address: initialData.address || "",
        acres: initialData.acres || "",
        parcelAccount: initialData.parcelAccount || initialData.parcel_account || "",
        parcelId: initialData.parcelId || initialData.parcel_id || "",
        numberOfStories,
        floorPercentages,
        sqft: initialData.sqft || "",
        yearBuilt: initialData.yearBuilt || initialData.year_built || "",
        structureType: initialData.structureType || initialData.structure_type || "",
        siteAccess: initialData.siteAccess || initialData.site_access || "",
        structureUse: initialData.structureUse || initialData.structure_use || "",
        overallQuality: initialData.overallQuality || initialData.overall_quality || "",
        detachedStructures: initialData.detachedStructures || initialData.detached_structures || [],
        beds: initialData.beds || "",
        bathrooms: initialData.bathrooms || "",
        notes: initialData.notes || "",
      });
      setAddressQuery(initialData.address || "");
      setIsLoadingPropertyData(false);
      return; // Exit early - don't check API data
    }
    
    // Priority: initialData.propertyApiData > globalPropertyData
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
      
      setFormData({
        address: initialData.address || "",
        acres: "",
        parcelAccount: "",
        parcelId: "",
        numberOfStories: "",
        floorPercentages: [],
        sqft: "",
        yearBuilt: "",
        structureType: "",
        siteAccess: "",
        structureUse: "",
        overallQuality: "",
        detachedStructures: [],
        beds: "",
        bathrooms: "",
        notes: "",
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

  const handleNext = async () => {
    console.log("=== PropertyIDForm handleNext ===");
    console.log("Saving form data before next:", JSON.stringify(formData, null, 2));
    console.log("Inspection ID:", inspectionId);
    
    try {
      const propertyMetadata = {
        acres: formData.acres,
        parcel_account: formData.parcelAccount,
        parcel_id: formData.parcelId,
        number_of_stories: formData.numberOfStories,
        floor_percentages: formData.floorPercentages,
        sqft: formData.sqft,
        year_built: formData.yearBuilt,
        structure_type: formData.structureType,
        site_access: formData.siteAccess,
        structure_use: formData.structureUse,
        overall_quality: formData.overallQuality,
        detached_structures: formData.detachedStructures,
        beds: formData.beds,
        bathrooms: formData.bathrooms,
        notes: formData.notes,
      };
      
      console.log("Property metadata to save:", JSON.stringify(propertyMetadata, null, 2));
      
      // Update inspection with property_metadata
      if (inspectionId) {
        console.log("Updating inspection with property_metadata...");
        
        const { data, error } = await supabase
          .from('inspections')
          .update({ property_metadata: propertyMetadata })
          .eq('id', inspectionId)
          .select();
        
        if (error) {
          console.error("Error updating inspection:", error);
        } else {
          console.log("✅ Inspection updated with property_metadata");
          console.log("Updated inspection data:", JSON.stringify(data, null, 2));
        }
      } else {
        console.warn("⚠️ No inspectionId provided, cannot save to database");
      }
      
      // CRITICAL: Save to parent's formData.categories.property_id
      console.log("Calling onComplete to save to categories...");
      await onComplete({
        category: "Property ID",
        ...formData,
        completed: false,
        timestamp: new Date().toISOString(),
      });
      
      console.log("✅ onComplete called, data should be in categories now");
      
      // Navigate to next category
      if (onNext) {
        console.log("Navigating to next category...");
        onNext();
      }
    } catch (error) {
      console.error("Error in handleNext:", error);
      // Still save and navigate even if database save fails
      await onComplete({
        category: "Property ID",
        ...formData,
        completed: false,
        timestamp: new Date().toISOString(),
      });
      if (onNext) {
        onNext();
      }
    }
  };

  const handleComplete = async () => {
    if (!formData.address) {
      Alert.alert("Error", "Address is required");
      return;
    }
    
    console.log("=== PropertyIDForm handleComplete ===");
    console.log("Sending form data:", JSON.stringify(formData, null, 2));
    console.log("Inspection ID:", inspectionId);
    
    try {
      const propertyMetadata = {
        acres: formData.acres,
        parcel_account: formData.parcelAccount,
        parcel_id: formData.parcelId,
        number_of_stories: formData.numberOfStories,
        floor_percentages: formData.floorPercentages,
        sqft: formData.sqft,
        year_built: formData.yearBuilt,
        structure_type: formData.structureType,
        site_access: formData.siteAccess,
        structure_use: formData.structureUse,
        overall_quality: formData.overallQuality,
        detached_structures: formData.detachedStructures,
        beds: formData.beds,
        bathrooms: formData.bathrooms,
        notes: formData.notes,
      };
      
      console.log("Property metadata to save:", JSON.stringify(propertyMetadata, null, 2));
      
      // Update inspection with property_metadata
      if (inspectionId) {
        console.log("Updating inspection with property_metadata...");
        
        const { data, error } = await supabase
          .from('inspections')
          .update({ property_metadata: propertyMetadata })
          .eq('id', inspectionId)
          .select();
        
        if (error) {
          console.error("Error updating inspection:", error);
          Alert.alert("Error", "Failed to save property data. Please try again.");
          return;
        }
        
        console.log("✅ Inspection updated with property_metadata");
        console.log("Updated inspection data:", JSON.stringify(data, null, 2));
      } else {
        console.warn("⚠️ No inspectionId provided, cannot save to database");
      }
      
      // CRITICAL: Save to parent's formData.categories.property_id
      console.log("Calling onComplete to save to categories...");
      await onComplete({
        category: "Property ID",
        ...formData,
        completed: true,
        timestamp: new Date().toISOString(),
      });
      
      console.log("✅ onComplete called with completed: true, should navigate back to category selection");
    } catch (error) {
      console.error("Error in handleComplete:", error);
      Alert.alert("Error", "Failed to save property data. Please try again.");
    }
  };

  const handlePrevious = async () => {
    console.log("=== PropertyIDForm handlePrevious ===");
    console.log("Saving form data before previous:", JSON.stringify(formData, null, 2));
    
    try {
      const propertyMetadata = {
        acres: formData.acres,
        parcel_account: formData.parcelAccount,
        parcel_id: formData.parcelId,
        number_of_stories: formData.numberOfStories,
        floor_percentages: formData.floorPercentages,
        sqft: formData.sqft,
        year_built: formData.yearBuilt,
        structure_type: formData.structureType,
        site_access: formData.siteAccess,
        structure_use: formData.structureUse,
        overall_quality: formData.overallQuality,
        detached_structures: formData.detachedStructures,
        beds: formData.beds,
        bathrooms: formData.bathrooms,
        notes: formData.notes,
      };
      
      // Update inspection with property_metadata
      if (inspectionId) {
        console.log("Updating inspection with property_metadata...");
        
        const { error } = await supabase
          .from('inspections')
          .update({ property_metadata: propertyMetadata })
          .eq('id', inspectionId);
        
        if (error) {
          console.error("Error updating inspection:", error);
        } else {
          console.log("✅ Inspection updated with property_metadata");
        }
      }
      
      // Save to parent's formData
      onComplete({
        category: "Property ID",
        ...formData,
        completed: false,
        timestamp: new Date().toISOString(),
      });
      
      // Navigate to previous category
      if (onPrevious) {
        onPrevious();
      }
    } catch (error) {
      console.error("Error in handlePrevious:", error);
      // Still save and navigate even if database save fails
      onComplete({
        category: "Property ID",
        ...formData,
        completed: false,
        timestamp: new Date().toISOString(),
      });
      if (onPrevious) {
        onPrevious();
      }
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
    <SafeAreaView style={[styles.container, !isDarkMode && styles.containerLight]}>
      <StatusBar 
        barStyle={isDarkMode ? "light-content" : "dark-content"} 
        backgroundColor={isDarkMode ? "#111827" : "#ffffff"} 
      />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={onCancel} style={styles.backButton}>
          <Text style={[styles.backButtonText, !isDarkMode && styles.backButtonTextLight]}>← Back</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, !isDarkMode && styles.headerTitleLight]}>Property ID</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView style={[styles.scrollView, !isDarkMode && styles.scrollViewLight]} {...panResponder.panHandlers}>
        <View style={styles.content}>
          {/* Address Search Section */}
          <View style={[styles.section, !isDarkMode && styles.sectionLight]}>
            <Text style={[styles.sectionTitle, !isDarkMode && styles.sectionTitleLight]}>Property Address</Text>
            
            <View style={styles.fieldContainer}>
              <Text style={[styles.fieldLabel, !isDarkMode && styles.fieldLabelLight]}>Address *</Text>
              <TextInput
                style={[styles.input, !isDarkMode && styles.inputLight]}
                value={addressQuery}
                onChangeText={handleAddressChange}
                onFocus={handleAddressFocus}
                placeholder="Start typing address..."
                placeholderTextColor="#9ca3af"
              />
              
              {/* Address Suggestions */}
              {addressSuggestions.length > 0 && (
                <View style={[styles.suggestionsContainer, !isDarkMode && styles.suggestionsContainerLight]}>
                  <FlatList
                    data={addressSuggestions}
                    keyExtractor={(item) => item.place_id}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        onPress={() => selectAddress(item)}
                        style={styles.suggestionItem}
                      >
                        <Text style={[styles.suggestionText, !isDarkMode && styles.suggestionTextLight]}>{item.description}</Text>
                      </TouchableOpacity>
                    )}
                  />
                </View>
              )}
              
              {isSearching && (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color={isDarkMode ? "#9ca3af" : "#3b82f6"} />
                </View>
              )}
            </View>
          </View>

          {/* Property Details Section */}
          <View style={[styles.section, !isDarkMode && styles.sectionLight]}>
            <Text style={[styles.sectionTitle, !isDarkMode && styles.sectionTitleLight]}>Property Details</Text>
            
            {/* Two Column Layout for Acres and Parcel Account */}
            <View style={styles.row}>
              <View style={[styles.fieldContainer, styles.halfWidth]}>
                <Text style={[styles.fieldLabel, !isDarkMode && styles.fieldLabelLight]}>Acres</Text>
                <TextInput
                  style={[styles.input, !isDarkMode && styles.inputLight]}
                  value={formData.acres}
                  onChangeText={(text) => handleFieldChange("acres", text)}
                  placeholder="e.g., 0.5"
                  placeholderTextColor="#9ca3af"
                  keyboardType="numeric"
                />
              </View>

              <View style={[styles.fieldContainer, styles.halfWidth]}>
                <Text style={[styles.fieldLabel, !isDarkMode && styles.fieldLabelLight]}>Year Built</Text>
                <TextInput
                  style={[styles.input, !isDarkMode && styles.inputLight]}
                  value={formData.yearBuilt}
                  onChangeText={(text) => handleFieldChange("yearBuilt", text)}
                  placeholder="e.g., 2021"
                  placeholderTextColor="#9ca3af"
                  keyboardType="numeric"
                />
              </View>
            </View>

            {/* Parcel Information Row */}
            <View style={styles.row}>
              <View style={[styles.fieldContainer, styles.halfWidth]}>
                <Text style={[styles.fieldLabel, !isDarkMode && styles.fieldLabelLight]}>Parcel Account</Text>
                <TextInput
                  style={[styles.input, !isDarkMode && styles.inputLight]}
                  value={formData.parcelAccount}
                  onChangeText={(text) => handleFieldChange("parcelAccount", text)}
                  placeholder="Account #"
                  placeholderTextColor="#9ca3af"
                />
              </View>

              <View style={[styles.fieldContainer, styles.halfWidth]}>
                <Text style={[styles.fieldLabel, !isDarkMode && styles.fieldLabelLight]}>Parcel ID</Text>
                <TextInput
                  style={[styles.input, !isDarkMode && styles.inputLight]}
                  value={formData.parcelId}
                  onChangeText={(text) => handleFieldChange("parcelId", text)}
                  placeholder="Parcel ID"
                  placeholderTextColor="#9ca3af"
                />
              </View>
            </View>

            {/* Square Footage and Stories Row */}
            <View style={styles.row}>
              <View style={[styles.fieldContainer, styles.halfWidth]}>
                <Text style={[styles.fieldLabel, !isDarkMode && styles.fieldLabelLight]}>Square Footage</Text>
                <TextInput
                  style={[styles.input, !isDarkMode && styles.inputLight]}
                  value={formData.sqft}
                  onChangeText={(text) => handleFieldChange("sqft", text)}
                  placeholder="e.g., 3475"
                  placeholderTextColor="#9ca3af"
                  keyboardType="numeric"
                />
              </View>

              <View style={[styles.fieldContainer, styles.halfWidth]}>
                <Text style={[styles.fieldLabel, !isDarkMode && styles.fieldLabelLight]}>Number of Stories</Text>
                <TextInput
                  style={[styles.input, !isDarkMode && styles.inputLight]}
                  value={formData.numberOfStories}
                  onChangeText={(text) => handleFieldChange("numberOfStories", text)}
                  placeholder="e.g., 2"
                  placeholderTextColor="#9ca3af"
                  keyboardType="numeric"
                />
              </View>
            </View>

            {/* Floor Percentages (only show if > 1 story) */}
            {parseInt(formData.numberOfStories) > 1 && (
              <View style={styles.fieldContainer}>
                <Text style={[styles.fieldLabel, !isDarkMode && styles.fieldLabelLight]}>Floor Percentages</Text>
                <View style={styles.floorPercentagesRow}>
                  {formData.floorPercentages.map((floor, index) => (
                    <View key={index} style={styles.floorPercentageItem}>
                      <Text style={[styles.floorLabel, !isDarkMode && styles.floorLabelLight]}>Floor {floor.floor}</Text>
                      <TextInput
                        style={[styles.floorInput, !isDarkMode && styles.floorInputLight]}
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

            {/* Beds and Bathrooms Row */}
            <View style={styles.row}>
              <View style={[styles.fieldContainer, styles.halfWidth]}>
                <Text style={[styles.fieldLabel, !isDarkMode && styles.fieldLabelLight]}>Bedrooms</Text>
                <TextInput
                  style={[styles.input, !isDarkMode && styles.inputLight]}
                  value={formData.beds}
                  onChangeText={(text) => handleFieldChange("beds", text)}
                  placeholder="e.g., 3"
                  placeholderTextColor="#9ca3af"
                  keyboardType="numeric"
                />
              </View>

              <View style={[styles.fieldContainer, styles.halfWidth]}>
                <Text style={[styles.fieldLabel, !isDarkMode && styles.fieldLabelLight]}>Bathrooms</Text>
                <TextInput
                  style={[styles.input, !isDarkMode && styles.inputLight]}
                  value={formData.bathrooms}
                  onChangeText={(text) => handleFieldChange("bathrooms", text)}
                  placeholder="e.g., 2.5"
                  placeholderTextColor="#9ca3af"
                  keyboardType="numeric"
                />
              </View>
            </View>
          </View>

          {/* Structure Information Section */}
          <View style={[styles.section, !isDarkMode && styles.sectionLight]}>
            <Text style={[styles.sectionTitle, !isDarkMode && styles.sectionTitleLight]}>Structure Information</Text>
            
            <View style={styles.fieldContainer}>
              <Text style={[styles.fieldLabel, !isDarkMode && styles.fieldLabelLight]}>Structure Type</Text>
              <TextInput
                style={[styles.input, !isDarkMode && styles.inputLight]}
                value={formData.structureType}
                onChangeText={(text) => handleFieldChange("structureType", text)}
                placeholder="e.g., Ranch, Colonial, Cape Cod"
                placeholderTextColor="#9ca3af"
              />
            </View>

            <View style={styles.fieldContainer}>
              <Text style={[styles.fieldLabel, !isDarkMode && styles.fieldLabelLight]}>Structure Use</Text>
              <TextInput
                style={[styles.input, !isDarkMode && styles.inputLight]}
                value={formData.structureUse}
                onChangeText={(text) => handleFieldChange("structureUse", text)}
                placeholder="e.g., Residential, Commercial"
                placeholderTextColor="#9ca3af"
              />
            </View>

            <View style={styles.fieldContainer}>
              <Text style={[styles.fieldLabel, !isDarkMode && styles.fieldLabelLight]}>Site Access</Text>
              <TextInput
                style={[styles.input, styles.textArea, !isDarkMode && styles.inputLight]}
                value={formData.siteAccess}
                onChangeText={(text) => handleFieldChange("siteAccess", text)}
                placeholder="Describe site access conditions"
                placeholderTextColor="#9ca3af"
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.fieldContainer}>
              <Text style={[styles.fieldLabel, !isDarkMode && styles.fieldLabelLight]}>Overall Quality</Text>
              <TextInput
                style={[styles.input, !isDarkMode && styles.inputLight]}
                value={formData.overallQuality}
                onChangeText={(text) => handleFieldChange("overallQuality", text)}
                placeholder="e.g., Excellent, Good, Fair, Poor"
                placeholderTextColor="#9ca3af"
              />
            </View>
          </View>

          {/* Detached Structures Section */}
          <View style={[styles.section, !isDarkMode && styles.sectionLight]}>
            <Text style={[styles.sectionTitle, !isDarkMode && styles.sectionTitleLight]}>Detached Structures</Text>
            <View style={styles.chipContainer}>
              {detachedStructureOptions.map((structure) => (
                <TouchableOpacity
                  key={structure}
                  onPress={() => toggleDetachedStructure(structure)}
                  style={[
                    styles.chip,
                    !isDarkMode && !formData.detachedStructures.includes(structure) && styles.chipLight,
                    formData.detachedStructures.includes(structure) && styles.chipSelected
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      !isDarkMode && !formData.detachedStructures.includes(structure) && styles.chipTextLight,
                      formData.detachedStructures.includes(structure) && styles.chipTextSelected
                    ]}
                  >
                    {structure}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Notes Section */}
          <View style={[styles.section, !isDarkMode && styles.sectionLight]}>
            <Text style={[styles.sectionTitle, !isDarkMode && styles.sectionTitleLight]}>Additional Notes</Text>
            <TextInput
              style={[styles.input, styles.textArea, !isDarkMode && styles.inputLight]}
              placeholder="Enter any additional notes about the property..."
              placeholderTextColor="#9ca3af"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              value={formData.notes}
              onChangeText={(text) => handleFieldChange("notes", text)}
            />
          </View>

          {/* Navigation Buttons */}
          <View style={styles.navigationButtons}>
            <TouchableOpacity
              onPress={handlePrevious}
              disabled={isFirstCategory}
              style={[
                styles.navButton,
                !isDarkMode && styles.navButtonLight,
                styles.navButtonLeft,
                isFirstCategory && styles.navButtonDisabled,
                isFirstCategory && !isDarkMode && styles.navButtonDisabledLight
              ]}
            >
              <Text style={[
                styles.navButtonText,
                !isDarkMode && styles.navButtonTextLight,
                isFirstCategory && styles.navButtonTextDisabled
              ]}>
                ← Previous
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleComplete}
              style={[styles.completeButton, !isDarkMode && styles.completeButtonLight]}
            >
              <Text style={[styles.completeButtonText, !isDarkMode && styles.completeButtonTextLight]}>
                Complete
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleNext}
              disabled={isLastCategory}
              style={[
                styles.navButton,
                !isDarkMode && styles.navButtonLight,
                styles.navButtonRight,
                isLastCategory && styles.navButtonDisabled
              ]}
            >
              <Text style={[
                styles.navButtonText,
                !isDarkMode && styles.navButtonTextLight,
                isLastCategory && styles.navButtonTextDisabled
              ]}>
                Next →
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

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
  scrollView: {
    flex: 1,
    backgroundColor: '#111827',
  },
  scrollViewLight: {
    backgroundColor: '#f9fafb',
  },
  content: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
    backgroundColor: '#1f2937',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#374151',
  },
  sectionLight: {
    backgroundColor: '#ffffff',
    borderColor: '#e5e7eb',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    color: '#f3f4f6',
  },
  sectionTitleLight: {
    color: '#111827',
  },
  fieldContainer: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
    color: '#e5e7eb',
  },
  fieldLabelLight: {
    color: '#374151',
  },
  input: {
    backgroundColor: '#374151',
    padding: 12,
    borderWidth: 1,
    borderColor: '#4b5563',
    borderRadius: 8,
    color: '#f3f4f6',
    fontSize: 16,
  },
  inputLight: {
    backgroundColor: '#ffffff',
    borderColor: '#d1d5db',
    color: '#111827',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfWidth: {
    flex: 1,
  },
  suggestionsContainer: {
    backgroundColor: '#374151',
    borderWidth: 1,
    borderColor: '#4b5563',
    borderRadius: 8,
    marginTop: 8,
    maxHeight: 200,
  },
  suggestionsContainerLight: {
    backgroundColor: '#ffffff',
    borderColor: '#d1d5db',
  },
  suggestionItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#4b5563',
  },
  suggestionText: {
    color: '#f3f4f6',
  },
  suggestionTextLight: {
    color: '#111827',
  },
  loadingContainer: {
    marginTop: 8,
  },
  floorPercentagesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  floorPercentageItem: {
    width: 80,
  },
  floorLabel: {
    color: '#d1d5db',
    fontSize: 12,
    marginBottom: 4,
    textAlign: 'center',
  },
  floorLabelLight: {
    color: '#6b7280',
  },
  floorInput: {
    backgroundColor: '#374151',
    borderWidth: 1,
    borderColor: '#4b5563',
    borderRadius: 8,
    padding: 8,
    color: '#f3f4f6',
    textAlign: 'center',
  },
  floorInputLight: {
    backgroundColor: '#ffffff',
    borderColor: '#d1d5db',
    color: '#111827',
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#374151',
    borderWidth: 1,
    borderColor: '#4b5563',
  },
  chipLight: {
    backgroundColor: '#ffffff',
    borderColor: '#d1d5db',
  },
  chipSelected: {
    backgroundColor: '#3b82f6',
    borderColor: '#2563eb',
  },
  chipText: {
    color: '#d1d5db',
    fontWeight: '500',
  },
  chipTextLight: {
    color: '#374151',
  },
  chipTextSelected: {
    color: '#ffffff',
    fontWeight: '600',
  },
  navigationButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 32,
  },
  navButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: '#4b5563',
    borderColor: '#6b7280',
  },
  navButtonLight: {
    backgroundColor: '#ffffff',
    borderColor: '#d1d5db',
  },
  navButtonLeft: {
    marginRight: 8,
  },
  navButtonRight: {
    marginLeft: 8,
  },
  navButtonDisabled: {
    backgroundColor: '#374151',
    borderColor: '#4b5563',
  },
  navButtonDisabledLight: {
    backgroundColor: '#f3f4f6',
    borderColor: '#e5e7eb',
  },
  navButtonText: {
    textAlign: 'center',
    fontWeight: '600',
    color: '#f3f4f6',
  },
  navButtonTextLight: {
    color: '#374151',
  },
  navButtonTextDisabled: {
    color: '#9ca3af',
  },
  completeButton: {
    backgroundColor: '#374151',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginHorizontal: 8,
    borderWidth: 1,
    borderColor: '#4b5563',
  },
  completeButtonLight: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  completeButtonText: {
    color: '#f3f4f6',
    textAlign: 'center',
    fontWeight: '600',
  },
  completeButtonTextLight: {
    color: '#ffffff',
  },
});

export default PropertyIDForm;