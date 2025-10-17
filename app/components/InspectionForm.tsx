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
  
  // Add a ref to track property_id
  const propertyIdRef = useRef<string | null>(null);

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

  // Initialize property ID when component mounts or when we need it
  const initPropertyId = async () => {
    if (propertyIdRef.current) {
      console.log('Property ID already initialized:', propertyIdRef.current);
      return;
    }

    // Don't auto-create property - user must complete Property ID form first
    console.log('Property ID not initialized - user must complete Property ID form');
  };

  // Get or create property ID
  const getPropertyId = async (): Promise<string | null> => {
    if (propertyIdRef.current) {
      return propertyIdRef.current;
    }

    // Don't auto-create property - user must complete Property ID form first
    Alert.alert(
      "Complete Property ID First",
      "Please complete and save the Property ID section before using features that require a property record.",
      [{ text: "OK" }]
    );
    return null;
  };

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
    
    // Create inspection in database immediately
    if (!currentInspectionId) {
      try {
        console.log("Creating inspection in database...");
        
        const inspectionData = {
          address: selectedAddress,
          date: new Date().toISOString(),
          status: 'incomplete',
          categories: {},
          sync_status: 'not-synced',
          inspector_id: currentUser.id,
          admin_id: currentUser.role === 'admin' ? currentUser.id : currentUser.admin_id,
          property_api_data: null,
          inspection_complete: false,
        };

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
        setCurrentInspectionId(data.id);
        
        // Verify the inspection was created
        const { data: verifyData, error: verifyError } = await supabase
          .from('inspections')
          .select('id')
          .eq('id', data.id)
          .single();
        
        if (verifyError) {
          console.error('❌ Failed to verify inspection creation:', verifyError);
        } else {
          console.log('✅ Verified inspection exists in database:', verifyData);
        }
      } catch (error) {
        console.error('Failed to create inspection:', error);
        Alert.alert('Error', 'Failed to create inspection. Please try again.');
      }
    } else {
      console.log('Inspection already exists with ID:', currentInspectionId);
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
    
    // If this is the Property ID category, extract the property_id
    if (categoryKey === 'property_id' && categoryData.property_id) {
      console.log("Setting property_id in formData:", categoryData.property_id);
      
      // Store in ref for immediate access
      propertyIdRef.current = categoryData.property_id;
      console.log("✅ propertyIdRef.current set to:", propertyIdRef.current);
      
      // Update formData with property_id - this will trigger re-render
      setFormData((prev) => ({
        ...prev,
        property_id: categoryData.property_id,
        categories: {
          ...prev.categories,
          [categoryKey]: categoryData,
        },
      }));
      
      // Also update the inspection in the database with the property_id
      if (currentInspectionId) {
        try {
          const { error } = await supabase
            .from('inspections')
            .update({ property_id: categoryData.property_id })
            .eq('id', currentInspectionId);
          
          if (error) {
            console.error('Error updating inspection with property_id:', error);
          } else {
            console.log('✅ Inspection updated with property_id:', categoryData.property_id);
          }
        } catch (error) {
          console.error('Error updating inspection:', error);
        }
      }
    } else {
      setFormData((prev) => ({
        ...prev,
        categories: {
          ...prev.categories,
          [categoryKey]: categoryData,
        },
      }));
    }
    
    console.log("Updated formData.categories:", JSON.stringify({
      ...formData.categories,
      [categoryKey]: categoryData,
    }, null, 2));
    
    // Only go back to category selection if the category is marked as completed
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
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Property Address</Text>

        <View style={styles.methodSelector}>
          <TouchableOpacity
            style={[styles.methodButton, addressMethod === "google" && styles.methodButtonActive]}
            onPress={() => setAddressMethod("google")}
          >
            <Search
              size={20}
              color={addressMethod === "google" ? "#9ca3af" : "#6b7280"}
            />
            <Text style={[styles.methodButtonText, addressMethod === "google" && styles.methodButtonTextActive]}>
              Search
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.methodButton, addressMethod === "manual" && styles.methodButtonActive]}
            onPress={() => setAddressMethod("manual")}
          >
            <MapPin
              size={20}
              color={addressMethod === "manual" ? "#9ca3af" : "#6b7280"}
            />
            <Text style={[styles.methodButtonText, addressMethod === "manual" && styles.methodButtonTextActive]}>
              Manual
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.methodButton, addressMethod === "assigned" && styles.methodButtonActive]}
            onPress={() => setAddressMethod("assigned")}
          >
            <ChevronRight
              size={20}
              color={addressMethod === "assigned" ? "#9ca3af" : "#6b7280"}
            />
            <Text style={[styles.methodButtonText, addressMethod === "assigned" && styles.methodButtonTextActive]}>
              Assigned
            </Text>
          </TouchableOpacity>
        </View>

        {addressMethod === "google" && (
          <View>
            <View style={styles.searchInputContainer}>
              <Search size={20} color="#6b7280" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
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
                  color="#9ca3af"
                  style={styles.searchSpinner}
                />
              )}
            </View>

            {addressSuggestions.length > 0 && (
              <View style={styles.suggestionsContainer}>
                {addressSuggestions.map((suggestion, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[styles.suggestionItem, index < addressSuggestions.length - 1 && styles.suggestionItemBorder]}
                    onPress={() => selectAddress(suggestion)}
                  >
                    <Text style={styles.suggestionText}>{suggestion}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}

        {addressMethod === "manual" && (
          <View style={styles.manualInputContainer}>
            <TextInput
              style={styles.input}
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
          <View style={styles.suggestionsContainer}>
            {assignedAddresses.map((assignedAddress, index) => (
              <TouchableOpacity
                key={index}
                style={[styles.suggestionItem, index < assignedAddresses.length - 1 && styles.suggestionItemBorder]}
                onPress={() => selectAddress(assignedAddress)}
              >
                <Text style={styles.suggestionText}>{assignedAddress}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <TouchableOpacity
          style={[styles.primaryButton, !address && styles.buttonDisabled]}
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
          style={styles.backButton}
          onPress={handleBackToDashboard}
        >
          <Text style={styles.backButtonText}>Back to Dashboard</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderCategorySelection = () => {
    return (
      <View style={styles.card}>
        <View style={styles.categoryHeader}>
          <Text style={styles.cardTitle}>Inspection Categories</Text>
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
        <View style={styles.completeToggleContainer}>
          <Text style={styles.completeToggleText}>Inspection Complete?</Text>
          <TouchableOpacity
            onPress={() => setIsInspectionComplete(!isInspectionComplete)}
            style={[styles.toggleSwitch, isInspectionComplete && styles.toggleSwitchActive]}
          >
            <View style={[styles.toggleThumb, isInspectionComplete && styles.toggleThumbActive]} />
          </TouchableOpacity>
        </View>

        <Text style={styles.propertyAddress}>Property: {formData.address}</Text>

        <ScrollView style={styles.categoriesScroll}>
          {categories.map((category, index) => {
            const categoryKey = category.toLowerCase().replace(/ /g, '_');
            const isCompleted = formData.categories?.[categoryKey] && 
                               Object.keys(formData.categories[categoryKey]).length > 0;
            const completionPercentage = calculateCategoryCompletion(formData.categories?.[categoryKey]);

            return (
              <TouchableOpacity
                key={index}
                style={[styles.categoryItem, isCompleted && styles.categoryItemCompleted]}
                onPress={() => handleCategorySelect(category)}
              >
                <View style={styles.categoryItemContent}>
                  <Text style={[styles.categoryItemText, isCompleted && styles.categoryItemTextCompleted]}>
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

        {/* Property Outline Tool Button */}
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => setShowPropertyOutlineTool(true)}
        >
          <Map size={20} color="#9ca3af" />
          <Text style={styles.secondaryButtonText}>Property Outline Tool</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={handleGetDirections}
        >
          <Navigation size={20} color="#9ca3af" />
          <Text style={styles.secondaryButtonText}>Get Directions</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBackToDashboard}
        >
          <Text style={styles.backButtonText}>Back to Dashboard</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {showPropertyOutlineTool ? (
        <PropertyOutlineTool
          address={formData.address}
          propertyId={formData.property_id || propertyIdRef.current}
          onSave={async (structures, exportImage) => {
            console.log("PropertyOutlineTool onSave called");
            console.log("formData.property_id:", formData.property_id);
            console.log("propertyIdRef.current:", propertyIdRef.current);
            
            const propId = formData.property_id || propertyIdRef.current;
            if (!propId) {
              Alert.alert(
                "Complete Property ID First",
                "Please complete and save the Property ID section before using the Property Outline Tool.",
                [{ text: "OK" }]
              );
              return;
            }
            
            setShowPropertyOutlineTool(false);
            setStep(2);
          }}
          onCancel={() => {
            setShowPropertyOutlineTool(false);
            setStep(2);
          }}
        />
      ) : (
        <>
          {step === 1 && renderAddressEntry()}

          {/* Category Selection List */}
          {step === 2 && !selectedCategory && (
            <View style={styles.categorySelection}>
              <View style={styles.categoryHeader}>
                <Text style={styles.sectionTitle}>Select Category</Text>
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
              <View style={styles.completeToggleContainer}>
                <Text style={styles.completeToggleText}>Inspection Complete?</Text>
                <TouchableOpacity
                  onPress={() => setIsInspectionComplete(!isInspectionComplete)}
                  style={[styles.toggleSwitch, isInspectionComplete && styles.toggleSwitchActive]}
                >
                  <View style={[styles.toggleThumb, isInspectionComplete && styles.toggleThumbActive]} />
                </TouchableOpacity>
              </View>

              <Text style={styles.propertyAddress}>Property: {formData.address}</Text>

              <ScrollView style={styles.categoriesScroll}>
                {categories.map((category, index) => {
                  const categoryKey = category.toLowerCase().replace(/ /g, '_');
                  const isCompleted = formData.categories?.[categoryKey] && 
                                     Object.keys(formData.categories[categoryKey]).length > 0;
                  const completionPercentage = calculateCategoryCompletion(formData.categories?.[categoryKey]);

                  return (
                    <TouchableOpacity
                      key={index}
                      style={[styles.categoryItem, isCompleted && styles.categoryItemCompleted]}
                      onPress={() => handleCategorySelect(category)}
                    >
                      <View style={styles.categoryItemContent}>
                        <Text style={[styles.categoryItemText, isCompleted && styles.categoryItemTextCompleted]}>
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

              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => setShowPropertyOutlineTool(true)}
              >
                <Map size={20} color="#9ca3af" />
                <Text style={styles.secondaryButtonText}>Property Outline Tool</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={handleGetDirections}
              >
                <Navigation size={20} color="#9ca3af" />
                <Text style={styles.secondaryButtonText}>Get Directions</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.backButton}
                onPress={handleBackToDashboard}
              >
                <Text style={styles.backButtonText}>Back to Dashboard</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Category Forms */}
          {step === 2 && selectedCategory && (
            selectedCategory === "Property ID" ? (
              <PropertyIDForm
                key={formData.address || "property-id-form"}
                onComplete={handleCategoryComplete}
                onCancel={() => {
                  setSelectedCategory(null);
                  setStep(2);
                }}
                onNext={handleNextCategory}
                onPrevious={handlePreviousCategory}
                isFirstCategory={categories.indexOf(selectedCategory) === 0}
                isLastCategory={categories.indexOf(selectedCategory) === categories.length - 1}
                initialData={{ 
                  address: formData.address,
                  propertyApiData: formData.propertyApiData,
                  ...formData.categories?.property_id,
                }}
              />
            ) : (
              <CategoryInspection
                category={selectedCategory}
                inspectionId={currentInspectionId}
                initialData={(() => {
                  const categoryKey = selectedCategory.toLowerCase().replace(/ /g, '_');
                  const data = formData.categories?.[categoryKey] || {};
                  return data;
                })()}
                onComplete={handleCategoryComplete}
                onCancel={() => {
                  setSelectedCategory(null);
                  setStep(2);
                }}
                onNext={() => {
                  const currentIndex = categories.indexOf(selectedCategory);
                  if (currentIndex < categories.length - 1) {
                    const nextCategory = categories[currentIndex + 1];
                    setSelectedCategory(nextCategory);
                  }
                }}
                onPrevious={() => {
                  const currentIndex = categories.indexOf(selectedCategory);
                  if (currentIndex > 0) {
                    const prevCategory = categories[currentIndex - 1];
                    setSelectedCategory(prevCategory);
                  }
                }}
                isFirstCategory={categories.indexOf(selectedCategory) === 0}
                isLastCategory={categories.indexOf(selectedCategory) === categories.length - 1}
                address={formData.address}
              />
            )
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#9ca3af',
    marginTop: 16,
    fontSize: 16,
  },
  header: {
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#f3f4f6',
  },
  closeButton: {
    marginRight: 12,
  },
  card: {
    backgroundColor: '#1f2937',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#374151',
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#f3f4f6',
  },
  methodSelector: {
    flexDirection: 'row',
    marginBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
    paddingBottom: 16,
  },
  methodButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  methodButtonActive: {
    backgroundColor: '#374151',
    borderRadius: 8,
  },
  methodButtonText: {
    marginTop: 4,
    color: '#6b7280',
  },
  methodButtonTextActive: {
    color: '#9ca3af',
  },
  searchInputContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  searchInput: {
    backgroundColor: '#374151',
    borderWidth: 1,
    borderColor: '#4b5563',
    borderRadius: 8,
    padding: 12,
    paddingLeft: 40,
    color: '#f3f4f6',
    fontSize: 16,
  },
  searchIcon: {
    position: 'absolute',
    left: 12,
    top: 12,
    zIndex: 1,
  },
  searchSpinner: {
    position: 'absolute',
    right: 12,
    top: 12,
  },
  suggestionsContainer: {
    borderWidth: 1,
    borderColor: '#374151',
    borderRadius: 8,
    marginBottom: 16,
    backgroundColor: '#374151',
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
  },
  manualInputContainer: {
    marginBottom: 16,
  },
  input: {
    backgroundColor: '#374151',
    borderWidth: 1,
    borderColor: '#4b5563',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    color: '#f3f4f6',
    fontSize: 16,
  },
  primaryButton: {
    backgroundColor: '#374151',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#4b5563',
  },
  primaryButtonText: {
    color: '#f3f4f6',
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  saveButton: {
    marginLeft: 12,
  },
  completeToggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#374151',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4b5563',
  },
  completeToggleText: {
    color: '#f3f4f6',
    fontWeight: '500',
  },
  toggleSwitch: {
    width: 56,
    height: 32,
    borderRadius: 16,
    padding: 4,
    backgroundColor: '#4b5563',
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
    marginLeft: 'auto',
  },
  propertyAddress: {
    color: '#9ca3af',
    marginBottom: 16,
  },
  categoriesScroll: {
    marginBottom: 16,
  },
  categoryItem: {
    flexDirection: 'column',
    padding: 16,
    marginBottom: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4b5563',
    backgroundColor: '#374151',
    overflow: 'hidden',
  },
  categoryItemCompleted: {
    borderColor: '#10b981',
  },
  categoryItemText: {
    fontWeight: '500',
    color: '#f3f4f6',
  },
  categoryItemTextCompleted: {
    color: '#6ee7b7',
  },
  categoryItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  completedBadge: {
    color: '#6ee7b7',
    marginRight: 8,
  },
  categoryItemContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressBarContainer: {
    height: 4,
    backgroundColor: '#1f2937',
    borderRadius: 2,
    marginTop: 12,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 2,
    transition: 'width 0.3s ease',
  },
  secondaryButton: {
    backgroundColor: '#374151',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#4b5563',
  },
  secondaryButtonText: {
    color: '#9ca3af',
    fontWeight: '600',
    marginLeft: 8,
  },
  backButton: {
    backgroundColor: '#4b5563',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#6b7280',
  },
  backButtonText: {
    color: '#f3f4f6',
    fontWeight: '600',
  },
  categorySelection: {
    padding: 16,
    backgroundColor: '#1f2937',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#374151',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#f3f4f6',
    marginBottom: 16,
  },
});