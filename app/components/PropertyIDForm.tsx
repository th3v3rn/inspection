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

  const handleComplete = async () => {
    if (!formData.address) {
      Alert.alert("Error", "Address is required");
      return;
    }
    
    console.log("=== PropertyIDForm handleComplete ===");
    console.log("Sending form data:", JSON.stringify(formData, null, 2));
    
    try {
      // Create property record in database
      console.log("Creating property record...");
      
      const propertyData = {
        address: formData.address,
        admin_id: currentUser?.role === 'admin' ? currentUser.id : currentUser?.admin_id,
        property_data: {
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
        },
      };
      
      const { data: property, error } = await supabase
        .from('properties')
        .insert([propertyData])
        .select()
        .single();
      
      if (error) {
        console.error("Error creating property:", error);
        Alert.alert("Error", "Failed to create property record. Please try again.");
        return;
      }
      
      console.log("✅ Property created with ID:", property.id);
      
      // Pass the property_id back to the parent
      onComplete({
        category: "Property ID",
        ...formData,
        property_id: property.id,
        completed: true,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error in handleComplete:", error);
      Alert.alert("Error", "Failed to save property data. Please try again.");
    }
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
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={{ marginTop: 16, color: '#6b7280' }}>Loading property data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      {/* Header with Back Button */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onCancel} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Property Identification</Text>
      </View>

      <ScrollView style={styles.scrollView} {...panResponder.panHandlers}>
        <View style={styles.content}>
          {/* Address Search Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Property Address</Text>
            
            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Address *</Text>
              <TextInput
                style={styles.input}
                value={addressQuery}
                onChangeText={handleAddressChange}
                onFocus={handleAddressFocus}
                placeholder="Start typing address..."
                placeholderTextColor="#9ca3af"
              />
              
              {/* Address Suggestions */}
              {addressSuggestions.length > 0 && (
                <View style={styles.suggestionsContainer}>
                  <FlatList
                    data={addressSuggestions}
                    keyExtractor={(item) => item.place_id}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        onPress={() => selectAddress(item)}
                        style={styles.suggestionItem}
                      >
                        <Text style={styles.suggestionText}>{item.description}</Text>
                      </TouchableOpacity>
                    )}
                  />
                </View>
              )}
              
              {isSearching && (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color="#9ca3af" />
                </View>
              )}
            </View>
          </View>

          {/* Property Details Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Property Details</Text>
            
            {/* Two Column Layout for Acres and Parcel Account */}
            <View style={styles.row}>
              <View style={[styles.fieldContainer, styles.halfWidth]}>
                <Text style={styles.fieldLabel}>Acres</Text>
                <TextInput
                  style={styles.input}
                  value={formData.acres}
                  onChangeText={(text) => handleFieldChange("acres", text)}
                  placeholder="e.g., 0.5"
                  placeholderTextColor="#9ca3af"
                  keyboardType="numeric"
                />
              </View>

              <View style={[styles.fieldContainer, styles.halfWidth]}>
                <Text style={styles.fieldLabel}>Year Built</Text>
                <TextInput
                  style={styles.input}
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
                <Text style={styles.fieldLabel}>Parcel Account</Text>
                <TextInput
                  style={styles.input}
                  value={formData.parcelAccount}
                  onChangeText={(text) => handleFieldChange("parcelAccount", text)}
                  placeholder="Account #"
                  placeholderTextColor="#9ca3af"
                />
              </View>

              <View style={[styles.fieldContainer, styles.halfWidth]}>
                <Text style={styles.fieldLabel}>Parcel ID</Text>
                <TextInput
                  style={styles.input}
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
                <Text style={styles.fieldLabel}>Square Footage</Text>
                <TextInput
                  style={styles.input}
                  value={formData.sqft}
                  onChangeText={(text) => handleFieldChange("sqft", text)}
                  placeholder="e.g., 3475"
                  placeholderTextColor="#9ca3af"
                  keyboardType="numeric"
                />
              </View>

              <View style={[styles.fieldContainer, styles.halfWidth]}>
                <Text style={styles.fieldLabel}>Number of Stories</Text>
                <TextInput
                  style={styles.input}
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
                <Text style={styles.fieldLabel}>Floor Percentages</Text>
                <View style={styles.floorPercentagesRow}>
                  {formData.floorPercentages.map((floor, index) => (
                    <View key={index} style={styles.floorPercentageItem}>
                      <Text style={styles.floorLabel}>Floor {floor.floor}</Text>
                      <TextInput
                        style={styles.floorInput}
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
                <Text style={styles.fieldLabel}>Bedrooms</Text>
                <TextInput
                  style={styles.input}
                  value={formData.beds}
                  onChangeText={(text) => handleFieldChange("beds", text)}
                  placeholder="e.g., 3"
                  placeholderTextColor="#9ca3af"
                  keyboardType="numeric"
                />
              </View>

              <View style={[styles.fieldContainer, styles.halfWidth]}>
                <Text style={styles.fieldLabel}>Bathrooms</Text>
                <TextInput
                  style={styles.input}
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
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Structure Information</Text>
            
            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Structure Type</Text>
              <TextInput
                style={styles.input}
                value={formData.structureType}
                onChangeText={(text) => handleFieldChange("structureType", text)}
                placeholder="e.g., Ranch, Colonial, Cape Cod"
                placeholderTextColor="#9ca3af"
              />
            </View>

            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Structure Use</Text>
              <TextInput
                style={styles.input}
                value={formData.structureUse}
                onChangeText={(text) => handleFieldChange("structureUse", text)}
                placeholder="e.g., Residential, Commercial"
                placeholderTextColor="#9ca3af"
              />
            </View>

            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Site Access</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
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
              <Text style={styles.fieldLabel}>Overall Quality</Text>
              <TextInput
                style={styles.input}
                value={formData.overallQuality}
                onChangeText={(text) => handleFieldChange("overallQuality", text)}
                placeholder="e.g., Excellent, Good, Fair, Poor"
                placeholderTextColor="#9ca3af"
              />
            </View>
          </View>

          {/* Detached Structures Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Detached Structures</Text>
            <View style={styles.chipContainer}>
              {detachedStructureOptions.map((structure) => (
                <TouchableOpacity
                  key={structure}
                  onPress={() => toggleDetachedStructure(structure)}
                  style={[
                    styles.chip,
                    formData.detachedStructures.includes(structure) && styles.chipSelected
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
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
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Additional Notes</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
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
                styles.navButtonLeft,
                isFirstCategory && styles.navButtonDisabled
              ]}
            >
              <Text style={[
                styles.navButtonText,
                isFirstCategory && styles.navButtonTextDisabled
              ]}>
                ← Previous
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleComplete}
              style={styles.completeButton}
            >
              <Text style={styles.completeButtonText}>
                Complete
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleNext}
              disabled={isLastCategory}
              style={[
                styles.navButton,
                styles.navButtonRight,
                isLastCategory && styles.navButtonDisabled
              ]}
            >
              <Text style={[
                styles.navButtonText,
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
    backgroundColor: '#ffffff',
  },
  header: {
    backgroundColor: '#f9fafb',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 12,
    padding: 8,
  },
  backButtonText: {
    color: '#111827',
    fontSize: 24,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  content: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
    backgroundColor: '#f9fafb',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    color: '#111827',
  },
  fieldContainer: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
    color: '#374151',
  },
  input: {
    backgroundColor: '#ffffff',
    padding: 12,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    color: '#111827',
    fontSize: 16,
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
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    marginTop: 8,
    maxHeight: 200,
  },
  suggestionItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  suggestionText: {
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
    color: '#374151',
    fontSize: 12,
    marginBottom: 4,
    textAlign: 'center',
  },
  floorInput: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 8,
    color: '#111827',
    textAlign: 'center',
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
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  chipSelected: {
    backgroundColor: '#3b82f6',
    borderColor: '#2563eb',
  },
  chipText: {
    color: '#374151',
    fontWeight: '500',
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
    backgroundColor: '#f3f4f6',
    borderColor: '#d1d5db',
  },
  navButtonLeft: {
    marginRight: 8,
  },
  navButtonRight: {
    marginLeft: 8,
  },
  navButtonDisabled: {
    backgroundColor: '#e5e7eb',
    borderColor: '#d1d5db',
  },
  navButtonText: {
    textAlign: 'center',
    fontWeight: '600',
    color: '#111827',
  },
  navButtonTextDisabled: {
    color: '#9ca3af',
  },
  completeButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginHorizontal: 8,
    borderWidth: 1,
    borderColor: '#2563eb',
  },
  completeButtonText: {
    color: '#ffffff',
    textAlign: 'center',
    fontWeight: '600',
  },
});

export default PropertyIDForm;