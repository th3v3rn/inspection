import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Linking,
  useColorScheme,
} from "react-native";
import {
  Mic,
  Search,
  MapPin,
  ChevronRight,
  Save,
  X,
  Map,
  Navigation,
} from "lucide-react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import CategoryInspection from "./CategoryInspection";
import PropertyIDForm from "./PropertyIDForm";
import PropertyOutlineTool from "./PropertyOutlineTool";
import { useInspections } from "../../hooks/useInspections";
import { supabase } from "../../lib/supabase";
import { useProperty } from "../contexts/PropertyContext";
import { directPropertyService } from "../../lib/directPropertyService";

type AddressMethod = "google" | "manual" | "assigned";
type Category =
  | "Property ID"
  | "Exterior"
  | "Interior"
  | "Systems and Utilities"
  | "Attached Structures"
  | "Roof"
  | "Foundation"
  | "Finish Up"
  | "Other";

interface InspectionFormProps {
  currentUser: any;
  onComplete?: () => void;
  onCancel?: () => void;
  initialData?: any;
  inspectionId?: string;
  onSave?: () => void;
}

// Helper function to calculate completion percentage for a category
const calculateCategoryCompletion = (categoryData: any): number => {
  if (!categoryData || typeof categoryData !== 'object') {
    return 0;
  }
  
  const fields = Object.keys(categoryData).filter(key => 
    key !== 'category' && 
    key !== 'timestamp' && 
    key !== 'completed'
  );
  
  if (fields.length === 0) {
    return 0;
  }
  
  const filledFields = fields.filter(key => {
    const value = categoryData[key];
    if (typeof value === 'boolean') return true; // Checkboxes count as filled
    if (typeof value === 'string') return value.trim().length > 0;
    if (typeof value === 'number') return true;
    return false;
  });
  
  return Math.round((filledFields.length / fields.length) * 100);
};

export default function InspectionForm({ 
  currentUser, 
  inspectionId: inspectionIdProp, 
  initialData = null,
  onCancel, 
  onComplete, 
  onSave 
}: InspectionFormProps) {
  // Use system color scheme
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';
  
  const router = useRouter();
  const params = useLocalSearchParams();
  const paramsInspectionId = params.id as string;
  
  // Use prop inspectionId if provided, otherwise use params
  const initialInspectionId = inspectionIdProp || paramsInspectionId;
  
  // Get property context at component level (not inside handler)
  // Wrap in try-catch to handle cases where provider isn't available yet
  let propertyContext;
  try {
    propertyContext = useProperty();
  } catch (error) {
    console.warn('PropertyContext not available, using defaults');
    propertyContext = {
      propertyData: null,
      setPropertyData: () => {},
      clearPropertyData: () => {},
      isPropertyDataAvailable: false,
    };
  }
  const { propertyData, setPropertyData } = propertyContext;
  
  // Add safety check for currentUser
  const { createInspection, updateInspection } = useInspections(
    currentUser?.id || '',
    currentUser?.role || 'inspector'
  );
  const [isLoading, setIsLoading] = useState(initialInspectionId ? true : false);
  const [saving, setSaving] = useState(false);
  
  // Helper function to get inspection by ID
  const getInspectionById = async (id: string) => {
    try {
      const { data, error } = await supabase
        .from('inspections')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) {
        console.error('Error fetching inspection:', error);
        return null;
      }
      
      return data;
    } catch (error) {
      console.error('Error in getInspectionById:', error);
      return null;
    }
  };
  
  // Helper function to migrate old category names to new ones
  const migrateCategoryData = (oldCategories: any) => {
    const newCategories: any = {
      property_id: {},
      foundation: {},
      exterior: {},
      attached_structure: {},
      roof: {},
      interior: {},
      systems_and_utilities: {},
      finish_up: {},
    };
    
    // Map old category names to new ones
    const categoryMapping: { [key: string]: string } = {
      'hvac': 'attached_structure',
      'hazards': 'finish_up',
      'other': 'finish_up',
      'plumbing': 'roof',
      'electrical': 'interior', // Migrate old electrical data to interior
      // Keep existing categories that haven't changed
      'property_id': 'property_id',
      'foundation': 'foundation',
      'exterior': 'exterior',
      'interior': 'interior',
      'systems_and_utilities': 'systems_and_utilities',
      'roof': 'roof',
    };
    
    // Migrate data from old categories to new ones
    if (oldCategories && typeof oldCategories === 'object') {
      Object.keys(oldCategories).forEach(oldKey => {
        const newKey = categoryMapping[oldKey] || oldKey;
        if (oldCategories[oldKey] && typeof oldCategories[oldKey] === 'object') {
          newCategories[newKey] = oldCategories[oldKey];
        }
      });
    }
    
    return newCategories;
  };
  
  const [step, setStep] = useState<number>(initialInspectionId ? 2 : 1);
  const [addressMethod, setAddressMethod] = useState<AddressMethod>("google");
  const [address, setAddress] = useState<string>(initialData?.address || "");
  const [addressSuggestions, setAddressSuggestions] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [showPropertyOutlineTool, setShowPropertyOutlineTool] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [assignedAddresses, setAssignedAddresses] = useState<string[]>([]);
  const [formData, setFormData] = useState<any>(
    initialData || {
      address: "",
      categories: {
        property_id: {},
        foundation: {},
        exterior: {},
        interior: {},
        systems_and_utilities: {},
        attached_structure: {},
        roof: {},
        finish_up: {},
      },
      propertyOutline: null,
      measurements: {},
    },
  );
  const [date, setDate] = useState<string>(new Date().toISOString());
  const [currentInspectionId, setCurrentInspectionId] = useState<string>(initialInspectionId);
  const [isInspectionComplete, setIsInspectionComplete] = useState<boolean>(false);

  // Add a ref to track if inspection has been loaded
  const inspectionLoaded = useRef(false);

  // Show loading if currentUser is not available yet
  if (!currentUser) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#111827" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#9ca3af" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Load assigned addresses for inspectors
  useEffect(() => {
    const loadAssignedAddresses = async () => {
      if (currentUser?.role === 'inspector') {
        const { data: assignments } = await supabase
          .from('assignments')
          .select('properties(address)')
          .eq('inspector_id', currentUser.id);
        
        if (assignments) {
          const addresses = assignments
            .map(a => a.properties?.address)
            .filter(Boolean);
          setAssignedAddresses(addresses);
        }
      }
    };
    loadAssignedAddresses();
  }, [currentUser]);

  // Load existing inspection if inspectionId is provided
  useEffect(() => {
    if (initialInspectionId) {
      loadInspection(initialInspectionId);
    }
  }, [initialInspectionId]);

  const loadInspection = async (id: string) => {
    try {
      console.log('=== Loading inspection ===');
      console.log('Inspection ID:', id);
      
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from('inspections')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      if (!data) {
        console.error('No inspection data returned');
        throw new Error('Inspection not found');
      }

      console.log('Loaded inspection:', data);
      console.log('Inspection categories (raw):', data.categories);

      // Set the property data from the inspection if available
      if (data.property_api_data) {
        console.log('✅ Setting property data from inspection:', data.property_api_data);
        setPropertyData({
          propertyAddress: data.address,
          fullAddress: data.address,
          propertyData: data.property_api_data,
        });
      } else {
        console.log('⚠️ No property_api_data found in inspection');
      }

      // Migrate old category names to new ones
      const migratedCategories = migrateCategoryData(data.categories);
      console.log("Migrated categories:", JSON.stringify(migratedCategories, null, 2));
      
      // Set form data with loaded inspection - use migrated categories
      setFormData({
        id: data.id,
        address: data.address || "",
        categories: migratedCategories,
        propertyOutline: data.property_outline || null,
        measurements: data.measurements || {},
        status: data.status || "incomplete",
        sync_status: data.sync_status || "synced",
        date: data.date || new Date().toISOString(),
        inspection_complete: data.inspection_complete || false,
        // CRITICAL: Include property_metadata so PropertyIDForm can load it
        property_metadata: data.property_metadata || null,
      });
      
      setAddress(data.address || "");
      setIsInspectionComplete(data.inspection_complete || false);
      setStep(2); // Go directly to category selection
      
      console.log('✅ Inspection loaded successfully');
    } catch (error) {
      console.error("❌ Error loading inspection:", error);
      Alert.alert("Error", "Failed to load inspection details. Please try again.");
      if (onCancel) {
        onCancel();
      }
    } finally {
      setIsLoading(false);
      console.log('=== Load inspection complete ===');
    }
  };

  // Update address state when initialData changes
  useEffect(() => {
    if (initialData?.address) {
      setAddress(initialData.address);
    }
  }, [initialData]);

  const categories = [
    "Property ID",
    "Foundation",
    "Roof",
    "Exterior",
    "Attached Structures",
    "Interior",
    "Systems and Utilities",
    "Finish Up",
  ];

  // Function to fetch property data from Smarty API
  const fetchPropertyData = async (selectedAddress: string) => {
    try {
      console.log("=== Fetching Property Data ===");
      console.log("Address:", selectedAddress);
      
      const result = await directPropertyService.lookupProperty(selectedAddress);
      
      console.log("API Result:", result);
      
      if (result.success && result.data) {
        console.log("✅ Property data fetched successfully");
        console.log("Property data:", JSON.stringify(result.data, null, 2));
        
        const propertyContextData = {
          fullAddress: selectedAddress,
          propertyAddress: selectedAddress,
          propertyData: result.data,
        };
        
        console.log("Setting PropertyContext with:", JSON.stringify(propertyContextData, null, 2));
        
        // Store in PropertyContext
        setPropertyData(propertyContextData);
        
        // CRITICAL: Store in formData with the correct structure for PropertyIDForm
        setFormData((prev) => ({
          ...prev,
          address: selectedAddress,
          propertyApiData: {
            fullAddress: selectedAddress,
            propertyData: result.data,
          },
        }));
        
        console.log("✅ PropertyContext and formData updated");
      } else {
        console.warn("❌ Failed to fetch property data:", result.error);
      }
    } catch (error) {
      console.error("❌ Error fetching property data:", error);
    }
  };

  // Function to handle back button press
  const handleBackButton = () => {
    if (step === 3) {
      // If in category inspection, go back to category selection
      setSelectedCategory(null);
      setStep(2);
    } else if (step === 2) {
      // If in category selection, go back to address entry
      setStep(1);
    } else if (step === 1) {
      // If in address entry, go back to home screen
      router.replace("/");
    }
  };

  // Function to search addresses using Google Places API through our proxy
  const searchAddress = async (query: string) => {
    if (query.length < 3) {
      setAddressSuggestions([]);
      return;
    }

    setIsSearching(true);
    
    try {
      console.log('Searching for address:', query);
      
      // Use the correct edge function slug
      const { data, error } = await supabase.functions.invoke('supabase-functions-google-places-proxy', {
        body: { query }
      });
      
      console.log('Google Places API response:', data);
      
      if (error) {
        console.error('Google Places API error:', error);
        throw new Error(error.message);
      }
      
      if (data && data.predictions && data.predictions.length > 0) {
        const suggestions = data.predictions.map((prediction: any) => prediction.description);
        console.log('Setting suggestions:', suggestions);
        setAddressSuggestions(suggestions);
      } else {
        console.log('No predictions found or API error:', data?.status, data?.error_message);
        setAddressSuggestions([]);
      }
    } catch (error) {
      console.error('Google Places API error:', error);
      setAddressSuggestions([]);
      Alert.alert("Error", "Failed to search addresses. Please check your internet connection.");
    } finally {
      setIsSearching(false);
    }
  };

  const selectAddress = async (selectedAddress: string) => {
    setAddress(selectedAddress);
    setAddressSuggestions([]);
    setFormData((prev) => ({ ...prev, address: selectedAddress }));
    
    console.log("=== Address Selected ===");
    console.log("Selected address:", selectedAddress);
    
    // Fetch property data from Smarty API immediately
    await fetchPropertyData(selectedAddress);
    
    // Create inspection in database immediately with property_api_data
    if (!currentInspectionId) {
      try {
        console.log("Creating inspection in database...");
        
        // Wait a moment for propertyData to be set
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const inspectionData = {
          address: selectedAddress,
          date: new Date().toISOString(),
          status: 'incomplete',
          categories: {},
          sync_status: 'not-synced',
          inspector_id: currentUser.id,
          admin_id: currentUser.role === 'admin' ? currentUser.id : currentUser.admin_id,
          property_api_data: propertyData?.propertyData || null,
          inspection_complete: false,
        };

        console.log("Inspection data to create:", JSON.stringify(inspectionData, null, 2));

        const { data, error } = await supabase
          .from('inspections')
          .insert([inspectionData])
          .select()
          .single();

        if (error) {
          console.error('Error creating inspection:', error);
          throw error;
        }

        console.log('✅ Inspection created in database with ID:', data.id);
        console.log('✅ Property API data saved:', data.property_api_data ? 'Yes' : 'No');
        setCurrentInspectionId(data.id);
        
        // Verify the inspection was created
        const { data: verifyData, error: verifyError } = await supabase
          .from('inspections')
          .select('id, property_api_data')
          .eq('id', data.id)
          .single();
        
        if (verifyError) {
          console.error('❌ Failed to verify inspection creation:', verifyError);
        } else {
          console.log('✅ Verified inspection exists in database:', verifyData);
          console.log('✅ Verified property_api_data:', verifyData.property_api_data ? 'Present' : 'Missing');
        }
      } catch (error) {
        console.error('Failed to create inspection:', error);
        Alert.alert('Error', 'Failed to create inspection. Please try again.');
      }
    } else {
      console.log('Inspection already exists with ID:', currentInspectionId);
      
      // Update existing inspection with property_api_data if it doesn't have it
      try {
        const { data: existingInspection } = await supabase
          .from('inspections')
          .select('property_api_data')
          .eq('id', currentInspectionId)
          .single();
        
        if (!existingInspection?.property_api_data && propertyData?.propertyData) {
          console.log('Updating existing inspection with property_api_data...');
          
          const { error } = await supabase
            .from('inspections')
            .update({ property_api_data: propertyData.propertyData })
            .eq('id', currentInspectionId);
          
          if (error) {
            console.error('Error updating inspection with property_api_data:', error);
          } else {
            console.log('✅ Existing inspection updated with property_api_data');
          }
        }
      } catch (error) {
        console.error('Error checking/updating existing inspection:', error);
      }
    }
  };

  const handleCategorySelect = (category: Category) => {
    setSelectedCategory(category);
    // Don't change step - keep it at 2 so forms render
  };

  const handleCategoryComplete = async (categoryData: any) => {
    // Convert category name to database format (lowercase with underscores)
    const categoryKey = categoryData.category.toLowerCase().replace(/ /g, '_');
    
    console.log("=== InspectionForm handleCategoryComplete ===");
    console.log("Category data received:", JSON.stringify(categoryData, null, 2));
    console.log("Category key:", categoryKey);
    console.log("Current formData.categories:", JSON.stringify(formData.categories, null, 2));
    
    const updatedCategories = {
      ...formData.categories,
      [categoryKey]: categoryData,
    };
    
    setFormData((prev) => ({
      ...prev,
      categories: updatedCategories,
    }));
    
    console.log("Updated formData.categories:", JSON.stringify(updatedCategories, null, 2));
    
    // Save to database immediately
    if (currentInspectionId) {
      try {
        console.log("Saving categories to database...");
        const { error } = await supabase
          .from('inspections')
          .update({ categories: updatedCategories })
          .eq('id', currentInspectionId);
        
        if (error) {
          console.error("Error saving categories:", error);
        } else {
          console.log("✅ Categories saved to database");
        }
      } catch (error) {
        console.error("Error in handleCategoryComplete:", error);
      }
    }
    
    // Always go back to category selection when completed is true
    if (categoryData.completed) {
      setSelectedCategory(null);
      setStep(2);
    }
  };

  const handleNextCategory = () => {
    if (selectedCategory) {
      const currentIndex = categories.indexOf(selectedCategory);
      if (currentIndex < categories.length - 1) {
        const nextCategory = categories[currentIndex + 1];
        setSelectedCategory(nextCategory);
      }
    }
  };

  const handlePreviousCategory = () => {
    if (selectedCategory) {
      const currentIndex = categories.indexOf(selectedCategory);
      if (currentIndex > 0) {
        const prevCategory = categories[currentIndex - 1];
        setSelectedCategory(prevCategory);
      }
    }
  };

  const handleCancelCategory = () => {
    setSelectedCategory(null);
    setStep(2);
  };

  const handlePropertyOutlineComplete = (outlineData: any) => {
    setFormData((prev) => ({
      ...prev,
      propertyOutline: outlineData.outline,
      measurements: outlineData.measurements,
    }));
    setShowPropertyOutlineTool(false);
    setStep(2); // Back to category selection
  };

  const handleSaveInspection = async () => {
    try {
      setSaving(true);
      console.log('Saving inspection...');
      console.log('Property data:', propertyData);
      console.log('Categories:', formData.categories);
      console.log('Inspection Complete:', isInspectionComplete);

      const inspectionData = {
        address: propertyData?.propertyAddress || address,
        date: date,
        status: isInspectionComplete ? 'complete' : 'incomplete',
        categories: formData.categories,
        sync_status: 'not-synced',
        inspector_id: currentUser.id, // Changed from user_id to inspector_id
        admin_id: currentUser.role === 'admin' ? currentUser.id : currentUser.admin_id,
        property_api_data: propertyData?.propertyData || null,
        inspection_complete: isInspectionComplete,
      };

      console.log('Inspection data to save:', inspectionData);

      if (currentInspectionId) {
        // Update existing inspection
        const { error } = await supabase
          .from('inspections')
          .update(inspectionData)
          .eq('id', currentInspectionId);

        if (error) throw error;
        console.log('✅ Inspection updated successfully');
      } else {
        // Create new inspection
        const { data, error } = await supabase
          .from('inspections')
          .insert([inspectionData])
          .select()
          .single();

        if (error) throw error;
        console.log('✅ Inspection created successfully:', data);
        
        // Update the inspectionId state so subsequent saves are updates
        setCurrentInspectionId(data.id);
      }

      Alert.alert('Success', 'Inspection saved successfully');
      
      // Navigate back to dashboard
      if (onSave) {
        onSave();
      } else if (onComplete) {
        onComplete();
      } else {
        // Fallback: navigate to home
        router.replace('/');
      }
    } catch (error) {
      console.error('Error saving inspection:', error);
      Alert.alert('Error', 'Failed to save inspection');
    } finally {
      setSaving(false);
    }
  };

  const handleBackToDashboard = () => {
    if (onCancel) {
      onCancel();
    }
  };

  const handleClose = () => {
    if (onCancel) {
      onCancel();
    } else {
      router.replace('/');
    }
  };

  const handleGetDirections = () => {
    const encodedAddress = encodeURIComponent(formData.address);
    const url = `https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}`;
    
    Linking.openURL(url).catch((err) => {
      console.error('Error opening maps:', err);
      Alert.alert('Error', 'Could not open maps application');
    });
  };

  const renderAddressEntry = () => {
    return (
      <View style={[styles.card, !isDarkMode && styles.cardLight]}>
        <Text style={[styles.cardTitle, !isDarkMode && styles.cardTitleLight]}>Property Address</Text>

        <View style={styles.methodSelector}>
          <TouchableOpacity
            style={[
              styles.methodButton, 
              !isDarkMode && styles.methodButtonLight,
              addressMethod === "google" && styles.methodButtonActive,
              addressMethod === "google" && !isDarkMode && styles.methodButtonActiveLight
            ]}
            onPress={() => setAddressMethod("google")}
          >
            <Search
              size={20}
              color={addressMethod === "google" ? "#3b82f6" : (isDarkMode ? "#6b7280" : "#9ca3af")}
            />
            <Text style={[
              styles.methodButtonText, 
              !isDarkMode && styles.methodButtonTextLight,
              addressMethod === "google" && styles.methodButtonTextActive
            ]}>
              Search
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.methodButton, 
              !isDarkMode && styles.methodButtonLight,
              addressMethod === "manual" && styles.methodButtonActive,
              addressMethod === "manual" && !isDarkMode && styles.methodButtonActiveLight
            ]}
            onPress={() => setAddressMethod("manual")}
          >
            <MapPin
              size={20}
              color={addressMethod === "manual" ? "#3b82f6" : (isDarkMode ? "#6b7280" : "#9ca3af")}
            />
            <Text style={[
              styles.methodButtonText, 
              !isDarkMode && styles.methodButtonTextLight,
              addressMethod === "manual" && styles.methodButtonTextActive
            ]}>
              Manual
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.methodButton, 
              !isDarkMode && styles.methodButtonLight,
              addressMethod === "assigned" && styles.methodButtonActive,
              addressMethod === "assigned" && !isDarkMode && styles.methodButtonActiveLight
            ]}
            onPress={() => setAddressMethod("assigned")}
          >
            <ChevronRight
              size={20}
              color={addressMethod === "assigned" ? "#3b82f6" : (isDarkMode ? "#6b7280" : "#9ca3af")}
            />
            <Text style={[
              styles.methodButtonText, 
              !isDarkMode && styles.methodButtonTextLight,
              addressMethod === "assigned" && styles.methodButtonTextActive
            ]}>
              Assigned
            </Text>
          </TouchableOpacity>
        </View>

        {addressMethod === "google" && (
          <View>
            <View style={[styles.searchInputContainer, !isDarkMode && styles.searchInputContainerLight]}>
              <Search size={20} color={isDarkMode ? "#6b7280" : "#9ca3af"} style={styles.searchIcon} />
              <TextInput
                style={[styles.searchInput, !isDarkMode && styles.inputLight]}
                placeholder="Start typing an address..."
                placeholderTextColor="#9ca3af"
                value={address}
                onChangeText={(text) => {
                  setAddress(text);
                  if (text.length > 2) {
                    searchAddress(text);
                  } else {
                    setAddressSuggestions([]);
                  }
                }}
              />
              {isSearching && (
                <ActivityIndicator
                  size="small"
                  color={isDarkMode ? "#9ca3af" : "#3b82f6"}
                  style={styles.searchSpinner}
                />
              )}
            </View>

            {addressSuggestions.length > 0 && (
              <View style={[styles.suggestionsContainer, !isDarkMode && styles.suggestionsContainerLight]}>
                {addressSuggestions.map((suggestion, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[styles.suggestionItem, index < addressSuggestions.length - 1 && styles.suggestionItemBorder]}
                    onPress={() => selectAddress(suggestion)}
                  >
                    <Text style={[styles.suggestionText, !isDarkMode && styles.suggestionTextLight]}>{suggestion}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}

        {addressMethod === "manual" && (
          <View style={styles.manualInputContainer}>
            <TextInput
              style={[styles.input, !isDarkMode && styles.inputLight]}
              placeholder="Full address"
              placeholderTextColor="#9ca3af"
              value={address}
              onChangeText={(text) => {
                setAddress(text);
                setFormData((prev) => ({ ...prev, address: text }));
              }}
            />
          </View>
        )}

        {addressMethod === "assigned" && (
          <View style={[styles.suggestionsContainer, !isDarkMode && styles.suggestionsContainerLight]}>
            {assignedAddresses.map((assignedAddress, index) => (
              <TouchableOpacity
                key={index}
                style={[styles.suggestionItem, index < assignedAddresses.length - 1 && styles.suggestionItemBorder]}
                onPress={() => selectAddress(assignedAddress)}
              >
                <Text style={[styles.suggestionText, !isDarkMode && styles.suggestionTextLight]}>{assignedAddress}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <TouchableOpacity
          style={[
            styles.primaryButton, 
            !isDarkMode && styles.primaryButtonLight,
            !address && styles.buttonDisabled,
            !address && !isDarkMode && styles.buttonDisabledLight
          ]}
          disabled={!address}
          onPress={() => {
            setFormData((prev) => ({ ...prev, address }));
            setStep(2);
          }}
        >
          <Text style={styles.primaryButtonText}>Continue</Text>
        </TouchableOpacity>

        {/* Back to Dashboard Button */}
        <TouchableOpacity
          onPress={handleClose}
          style={styles.backButton}
          data-tempoelementid="tempo-8bd3da83-4ad9-468c-bcfd-820964030869"
        >
          <Text style={[styles.backButtonText, !isDarkMode && styles.backButtonTextLight]}>Back to Dashboard</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderCategorySelection = () => {
    return (
      <View style={[styles.categorySelectionContainer, !isDarkMode && styles.categorySelectionContainerLight]}>
        <View style={[styles.card, styles.categoryCard, !isDarkMode && styles.cardLight]}>
          <View style={styles.categoryHeader}>
            <Text style={[styles.cardTitle, !isDarkMode && styles.cardTitleLight]}>Inspection Categories</Text>
            <TouchableOpacity 
              onPress={handleSaveInspection}
              disabled={isSaving}
              style={styles.saveButton}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="#9ca3af" />
              ) : (
                <Save size={20} color="#9ca3af" />
              )}
            </TouchableOpacity>
          </View>

          {/* Inspection Complete Toggle */}
          <View style={[styles.completeToggleContainer, !isDarkMode && styles.completeToggleContainerLight]}>
            <Text style={[styles.completeToggleText, !isDarkMode && styles.completeToggleTextLight]}>Inspection Complete?</Text>
            <TouchableOpacity
              onPress={() => setIsInspectionComplete(!isInspectionComplete)}
              style={[styles.toggleSwitch, isInspectionComplete && styles.toggleSwitchActive]}
            >
              <View style={[styles.toggleThumb, isInspectionComplete && styles.toggleThumbActive]} />
            </TouchableOpacity>
          </View>

          <Text style={styles.propertyAddress}>Property: {formData.address}</Text>

          <ScrollView 
            style={styles.categoriesScroll}
            contentContainerStyle={styles.categoriesScrollContent}
            showsVerticalScrollIndicator={true}
            nestedScrollEnabled={true}
          >
            {categories.map((category, index) => {
              const categoryKey = category.toLowerCase().replace(/ /g, '_');
              const isCompleted = formData.categories?.[categoryKey] && 
                                 Object.keys(formData.categories[categoryKey]).length > 0;
              const completionPercentage = calculateCategoryCompletion(formData.categories?.[categoryKey]);

              return (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.categoryItem, 
                    !isDarkMode && styles.categoryItemLight,
                    isCompleted && styles.categoryItemCompleted,
                    isCompleted && !isDarkMode && styles.categoryItemCompletedLight
                  ]}
                  onPress={() => handleCategorySelect(category)}
                >
                  <View style={styles.categoryItemContent}>
                    <Text style={[
                      styles.categoryItemText, 
                      !isDarkMode && styles.categoryItemTextLight,
                      isCompleted && styles.categoryItemTextCompleted,
                      isCompleted && !isDarkMode && styles.categoryItemTextCompletedLight
                    ]}>
                      {category}
                    </Text>
                    <View style={styles.categoryItemRight}>
                      {isCompleted && (
                        <Text style={styles.completedBadge}>Completed</Text>
                      )}
                      <ChevronRight
                        size={16}
                        color={isCompleted ? "#10b981" : "#9ca3af"}
                      />
                    </View>
                  </View>
                  
                  {/* Visual Fill Indicator */}
                  <View style={styles.progressBarContainer}>
                    <View 
                      style={[
                        styles.progressBarFill, 
                        { 
                          width: `${completionPercentage}%`,
                          backgroundColor: completionPercentage === 100 ? '#10b981' : 
                                          completionPercentage > 50 ? '#3b82f6' : 
                                          completionPercentage > 0 ? '#f59e0b' : '#4b5563'
                        }
                      ]} 
                    />
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Fixed Bottom Buttons Container */}
          <View style={styles.bottomButtonsContainer}>
            {/* Property Outline Tool Button */}
            <TouchableOpacity
              style={[styles.secondaryButton, !isDarkMode && styles.secondaryButtonLight]}
              onPress={() => setShowPropertyOutlineTool(true)}
            >
              <Map size={20} color={isDarkMode ? "#9ca3af" : "#374151"} />
              <Text style={[styles.secondaryButtonText, !isDarkMode && styles.secondaryButtonTextLight]}>Property Outline Tool</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.secondaryButton, !isDarkMode && styles.secondaryButtonLight]}
              onPress={handleGetDirections}
            >
              <Navigation size={20} color={isDarkMode ? "#9ca3af" : "#374151"} />
              <Text style={[styles.secondaryButtonText, !isDarkMode && styles.secondaryButtonTextLight]}>Get Directions</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.backButton}
              onPress={handleClose}
            >
              <Text style={[styles.backButtonText, !isDarkMode && styles.backButtonTextLight]}>Back to Dashboard</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, !isDarkMode && styles.containerLight]}>
      <StatusBar 
        barStyle={isDarkMode ? "light-content" : "dark-content"} 
        backgroundColor={isDarkMode ? "#111827" : "#ffffff"} 
      />

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Loading inspection...</Text>
        </View>
      ) : showPropertyOutlineTool ? (
        <PropertyOutlineTool
          address={formData.address}
          propertyId={currentInspectionId}
          onComplete={handlePropertyOutlineComplete}
          onCancel={() => setShowPropertyOutlineTool(false)}
        />
      ) : selectedCategory ? (
        selectedCategory === "Property ID" ? (
          <PropertyIDForm
            onComplete={handleCategoryComplete}
            onCancel={handleCancelCategory}
            onNext={handleNextCategory}
            onPrevious={handlePreviousCategory}
            isFirstCategory={categories.indexOf(selectedCategory) === 0}
            isLastCategory={categories.indexOf(selectedCategory) === categories.length - 1}
            initialData={formData.categories?.property_id}
            inspectionId={currentInspectionId}
          />
        ) : (
          <CategoryInspection
            category={selectedCategory}
            onComplete={handleCategoryComplete}
            onCancel={handleCancelCategory}
            onNext={handleNextCategory}
            onPrevious={handlePreviousCategory}
            isFirstCategory={categories.indexOf(selectedCategory) === 0}
            isLastCategory={categories.indexOf(selectedCategory) === categories.length - 1}
            initialData={formData.categories?.[selectedCategory.toLowerCase().replace(/ /g, '_')]}
            address={formData.address}
            inspectionId={currentInspectionId}
          />
        )
      ) : step === 1 ? (
        renderAddressEntry()
      ) : (
        renderCategorySelection()
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#9ca3af',
    marginTop: 12,
  },
  categorySelectionContainer: {
    flex: 1,
    backgroundColor: '#111827',
  },
  categorySelectionContainerLight: {
    backgroundColor: '#ffffff',
  },
  card: {
    backgroundColor: '#1f2937',
    borderRadius: 12,
    padding: 20,
    margin: 16,
  },
  categoryCard: {
    flex: 1,
    margin: 16,
  },
  cardLight: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#f3f4f6',
    marginBottom: 16,
  },
  cardTitleLight: {
    color: '#111827',
  },
  methodSelector: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 8,
  },
  methodButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#374151',
    borderWidth: 1,
    borderColor: '#4b5563',
  },
  methodButtonLight: {
    backgroundColor: '#ffffff',
    borderColor: '#d1d5db',
  },
  methodButtonActive: {
    backgroundColor: '#1f2937',
    borderColor: '#3b82f6',
  },
  methodButtonActiveLight: {
    backgroundColor: '#eff6ff',
    borderColor: '#3b82f6',
  },
  methodButtonText: {
    color: '#9ca3af',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  methodButtonTextLight: {
    color: '#4b5563',
  },
  methodButtonTextActive: {
    color: '#3b82f6',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#374151',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  searchInputContainerLight: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: '#f3f4f6',
    padding: 12,
    fontSize: 16,
  },
  searchSpinner: {
    marginLeft: 8,
  },
  suggestionsContainer: {
    backgroundColor: '#374151',
    borderRadius: 8,
    marginBottom: 12,
    maxHeight: 200,
  },
  suggestionsContainerLight: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  suggestionItem: {
    padding: 12,
  },
  suggestionItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#4b5563',
  },
  suggestionText: {
    color: '#f3f4f6',
    fontSize: 14,
  },
  suggestionTextLight: {
    color: '#111827',
  },
  manualInputContainer: {
    marginBottom: 12,
  },
  input: {
    backgroundColor: '#374151',
    color: '#f3f4f6',
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
  },
  inputLight: {
    backgroundColor: '#ffffff',
    color: '#111827',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  primaryButton: {
    backgroundColor: '#3b82f6',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  primaryButtonLight: {
    backgroundColor: '#3b82f6',
  },
  buttonDisabled: {
    backgroundColor: '#4b5563',
  },
  buttonDisabledLight: {
    backgroundColor: '#d1d5db',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  backButton: {
    marginTop: 12,
    padding: 12,
    alignItems: 'center',
  },
  backButtonText: {
    color: '#3b82f6',
    fontSize: 14,
  },
  backButtonTextLight: {
    color: '#2563eb',
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  saveButton: {
    padding: 8,
  },
  completeToggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#374151',
    borderRadius: 8,
  },
  completeToggleContainerLight: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  completeToggleText: {
    color: '#f3f4f6',
    fontSize: 16,
    fontWeight: '500',
  },
  completeToggleTextLight: {
    color: '#111827',
  },
  toggleSwitch: {
    width: 50,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#4b5563',
    padding: 2,
    justifyContent: 'center',
  },
  toggleSwitchActive: {
    backgroundColor: '#10b981',
  },
  toggleThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#ffffff',
  },
  toggleThumbActive: {
    alignSelf: 'flex-end',
  },
  propertyAddress: {
    color: '#9ca3af',
    fontSize: 14,
    marginBottom: 16,
  },
  categoriesScroll: {
    flexGrow: 0,
    flexShrink: 1,
  },
  categoriesScrollContent: {
    paddingBottom: 16,
  },
  categoryItem: {
    backgroundColor: '#374151',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  categoryItemLight: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  categoryItemCompleted: {
    backgroundColor: '#064e3b',
    borderWidth: 1,
    borderColor: '#047857',
  },
  categoryItemCompletedLight: {
    backgroundColor: '#d1fae5',
    borderColor: '#10b981',
  },
  categoryItemContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryItemText: {
    color: '#f3f4f6',
    fontSize: 16,
    fontWeight: '500',
  },
  categoryItemTextLight: {
    color: '#111827',
  },
  categoryItemTextCompleted: {
    color: '#6ee7b7',
  },
  categoryItemTextCompletedLight: {
    color: '#047857',
  },
  categoryItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  completedBadge: {
    backgroundColor: '#047857',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    fontSize: 12,
    color: '#6ee7b7',
    fontWeight: '600',
  },
  progressBarContainer: {
    height: 4,
    backgroundColor: '#4b5563',
    borderRadius: 2,
    marginTop: 8,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  bottomButtonsContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#374151',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#374151',
    padding: 14,
    borderRadius: 8,
    marginTop: 12,
    gap: 8,
  },
  secondaryButtonLight: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  secondaryButtonText: {
    color: '#f3f4f6',
    fontSize: 14,
    fontWeight: '500',
  },
  secondaryButtonTextLight: {
    color: '#374151',
  },
});