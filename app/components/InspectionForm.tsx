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
} from "react-native";
import {
  Mic,
  Search,
  MapPin,
  ChevronRight,
  Save,
  X,
  Map,
  ArrowLeft,
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
  | "HVAC"
  | "Plumbing"
  | "Electrical"
  | "Hazards"
  | "Other";

interface InspectionFormProps {
  onSave?: (data: any) => void;
  onCancel?: () => void;
  initialData?: any;
  assignedAddresses?: string[];
  isOfflineMode?: boolean;
}

const InspectionForm = ({
  onSave = () => {},
  onCancel = () => {},
  initialData = null,
  assignedAddresses = [
    "123 Main St, Anytown, USA",
    "456 Oak Ave, Springfield, USA",
    "789 Pine Rd, Lakeside, USA",
  ],
  isOfflineMode = false,
}: InspectionFormProps) => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const inspectionId = (params.id || params.inspectionId) as string;
  
  const { createInspection, getInspectionById } = useInspections();
  const { setPropertyData } = useProperty();
  const [isLoading, setIsLoading] = useState(inspectionId ? true : false);
  const [step, setStep] = useState<number>(inspectionId ? 2 : 1); // Start at category selection if editing
  const [addressMethod, setAddressMethod] = useState<AddressMethod>("google");
  const [address, setAddress] = useState<string>(initialData?.address || "");
  const [addressSuggestions, setAddressSuggestions] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(
    null,
  );
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [showPropertyOutlineTool, setShowPropertyOutlineTool] =
    useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [formData, setFormData] = useState<any>(
    initialData || {
      address: "",
      categories: {
        "Property ID": {},
        Foundation: {},
        Exterior: {},
        HVAC: {},
        Plumbing: {},
        Electrical: {},
        Hazards: {},
      },
      propertyOutline: null,
      measurements: {},
    },
  );
  
  // Add a ref to track if inspection has been loaded
  const inspectionLoaded = useRef(false);

  // Load inspection data if ID is provided
  useEffect(() => {
    const loadInspection = async () => {
      if (inspectionId && !inspectionLoaded.current) {
        try {
          setIsLoading(true);
          console.log("Loading inspection with ID:", inspectionId);
          
          const inspection = await getInspectionById(inspectionId);
          if (inspection) {
            console.log("Loaded inspection:", inspection);
            inspectionLoaded.current = true;
            
            // Convert database categories format to app format
            const appCategories = {
              "Property ID": inspection.categories?.property_id ? { completed: true } : {},
              Foundation: inspection.categories?.foundation || inspection.categories?.exterior ? { completed: true } : {},
              Exterior: inspection.categories?.exterior || inspection.categories?.interior ? { completed: true } : {},
              HVAC: inspection.categories?.hvac ? { completed: true } : {},
              Plumbing: inspection.categories?.plumbing ? { completed: true } : {},
              Electrical: inspection.categories?.electrical ? { completed: true } : {},
              Hazards: inspection.categories?.hazards ? { completed: true } : {},
            };
            
            // Set form data with loaded inspection
            setFormData({
              id: inspection.id,
              address: inspection.address || "",
              categories: appCategories,
              propertyOutline: inspection.property_outline || null,
              measurements: inspection.measurements || {},
              status: inspection.status || "incomplete",
              sync_status: inspection.sync_status || "synced",
              date: inspection.date || new Date().toISOString(),
            });
            
            setAddress(inspection.address || "");
            setStep(2); // Go directly to category selection
          } else {
            // Handle case where inspection is not found
            Alert.alert("Error", "Inspection not found");
            router.replace("/");
          }
        } catch (error) {
          console.error("Error loading inspection:", error);
          Alert.alert("Error", "Failed to load inspection details");
        } finally {
          setIsLoading(false);
        }
      }
    };
    
    loadInspection();
  }, [inspectionId]);

  // Update address state when initialData changes
  useEffect(() => {
    if (initialData?.address) {
      setAddress(initialData.address);
    }
  }, [initialData]);

  const categories = [
    "Property ID",
    "Foundation",
    "Exterior",
    "HVAC",
    "Plumbing",
    "Electrical",
    "Hazards",
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
        
        // Also store in formData for direct access
        setFormData((prev) => ({
          ...prev,
          propertyApiData: result.data,
        }));
        
        console.log("✅ PropertyContext updated");
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
    if (isOfflineMode) {
      Alert.alert(
        "Offline Mode",
        "Address search is not available in offline mode"
      );
      return;
    }

    if (query.length < 3) {
      setAddressSuggestions([]);
      return;
    }

    setIsSearching(true);
    
    try {
      console.log('Searching for address:', query);
      
      // Use the Supabase edge function proxy instead of direct API call
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

  const selectAddress = (selectedAddress: string) => {
    setAddress(selectedAddress);
    setAddressSuggestions([]);
    setFormData((prev) => ({ ...prev, address: selectedAddress }));
    
    console.log("=== Address Selected ===");
    console.log("Selected address:", selectedAddress);
    
    // Fetch property data from Smarty API immediately
    fetchPropertyData(selectedAddress);
  };

  const handleCategorySelect = (category: Category) => {
    setSelectedCategory(category);
    setStep(3);
  };

  const handleCategoryComplete = (categoryData: any) => {
    setFormData((prev) => ({
      ...prev,
      categories: {
        ...prev.categories,
        [categoryData.category]: categoryData,
      },
    }));

    // Don't automatically navigate away - let user use Next/Previous buttons
    // Only show property outline tool if explicitly requested
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
      setIsSaving(true);
      console.log("Starting save process...");
      
      // Calculate completion status
      const completedCategories = Object.values(formData.categories).filter(
        (category) => category && Object.keys(category).length > 0
      ).length;
      const totalCategories = categories.length;
      const status = completedCategories === totalCategories ? 'complete' : 'incomplete';

      // Prepare inspection data for database
      const inspectionData = {
        address: formData.address,
        categories: formData.categories,
        property_outline: formData.propertyOutline,
        measurements: formData.measurements,
        status,
        sync_status: 'synced',
        date: new Date().toISOString(),
      };

      console.log("Saving inspection with data:", inspectionData);
      
      const savedInspection = await createInspection(inspectionData);
      console.log("Save result:", savedInspection);
      
      if (savedInspection) {
        console.log("Save successful, inspection data:", savedInspection);
        Alert.alert(
          "Success", 
          "Inspection saved successfully",
          [
            {
              text: "OK",
              onPress: () => {
                console.log("Navigating to home page...");
                onSave(formData);
                // Use replace instead of push to avoid stacking navigation
                router.replace("/");
              }
            }
          ]
        );
        
        // Reset form
        setStep(1);
        setAddress("");
        setSelectedCategory(null);
        setFormData({
          address: "",
          categories: {
            "Property ID": {},
            Foundation: {},
            Exterior: {},
            HVAC: {},
            Plumbing: {},
            Electrical: {},
            Hazards: {},
          },
          propertyOutline: null,
          measurements: {},
        });
      } else {
        Alert.alert("Error", "Failed to save inspection. Please try again.");
      }
    } catch (error) {
      console.error('Error saving inspection:', error);
      Alert.alert("Error", "Failed to save inspection. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const renderAddressEntry = () => {
    return (
      <View className="bg-white p-4 rounded-lg shadow-sm">
        <Text className="text-xl font-bold mb-4">Property Address</Text>

        <View className="flex-row mb-6 border-b border-gray-200 pb-4">
          <TouchableOpacity
            className={`flex-1 items-center py-2 ${addressMethod === "google" ? "bg-blue-100 rounded-lg" : ""}`}
            onPress={() => setAddressMethod("google")}
          >
            <Search
              size={20}
              color={addressMethod === "google" ? "#3b82f6" : "#6b7280"}
            />
            <Text
              className={`mt-1 ${addressMethod === "google" ? "text-blue-600" : "text-gray-600"}`}
            >
              Search
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            className={`flex-1 items-center py-2 ${addressMethod === "manual" ? "bg-blue-100 rounded-lg" : ""}`}
            onPress={() => setAddressMethod("manual")}
          >
            <MapPin
              size={20}
              color={addressMethod === "manual" ? "#3b82f6" : "#6b7280"}
            />
            <Text
              className={`mt-1 ${addressMethod === "manual" ? "text-blue-600" : "text-gray-600"}`}
            >
              Manual
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            className={`flex-1 items-center py-2 ${addressMethod === "assigned" ? "bg-blue-100 rounded-lg" : ""}`}
            onPress={() => setAddressMethod("assigned")}
          >
            <ChevronRight
              size={20}
              color={addressMethod === "assigned" ? "#3b82f6" : "#6b7280"}
            />
            <Text
              className={`mt-1 ${addressMethod === "assigned" ? "text-blue-600" : "text-gray-600"}`}
            >
              Assigned
            </Text>
          </TouchableOpacity>
        </View>

        {addressMethod === "google" && (
          <View>
            <View className="relative mb-4">
              <TextInput
                className="border border-gray-300 rounded-lg p-3 pl-10"
                placeholder="Start typing an address..."
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
              <Search
                size={20}
                color="#6b7280"
                className="absolute left-3 top-3"
                style={{ position: "absolute", left: 10, top: 12 }}
              />
              {isSearching && (
                <ActivityIndicator
                  size="small"
                  color="#3b82f6"
                  style={{ position: "absolute", right: 10, top: 12 }}
                />
              )}
            </View>

            {addressSuggestions.length > 0 && (
              <View className="border border-gray-200 rounded-lg mb-4">
                {addressSuggestions.map((suggestion, index) => (
                  <TouchableOpacity
                    key={index}
                    className={`p-3 ${index < addressSuggestions.length - 1 ? "border-b border-gray-200" : ""}`}
                    onPress={() => selectAddress(suggestion)}
                  >
                    <Text>{suggestion}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}

        {addressMethod === "manual" && (
          <View className="mb-4">
            <TextInput
              className="border border-gray-300 rounded-lg p-3 mb-2"
              placeholder="Full address"
              value={address}
              onChangeText={(text) => {
                setAddress(text);
                setFormData((prev) => ({ ...prev, address: text }));
              }}
            />
          </View>
        )}

        {addressMethod === "assigned" && (
          <View className="border border-gray-200 rounded-lg mb-4">
            {assignedAddresses.map((assignedAddress, index) => (
              <TouchableOpacity
                key={index}
                className={`p-3 ${index < assignedAddresses.length - 1 ? "border-b border-gray-200" : ""}`}
                onPress={() => selectAddress(assignedAddress)}
              >
                <Text>{assignedAddress}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <TouchableOpacity
          className={`bg-blue-500 py-3 px-4 rounded-lg items-center ${!address ? "opacity-50" : ""}`}
          disabled={!address}
          onPress={() => {
            setFormData((prev) => ({ ...prev, address }));
            setStep(2);
          }}
        >
          <Text className="text-white font-semibold">Continue</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderCategorySelection = () => {
    return (
      <View className="bg-white p-4 rounded-lg shadow-sm">
        <View className="flex-row justify-between items-center mb-4">
          <Text className="text-xl font-bold">Inspection Categories</Text>
          <TouchableOpacity 
            onPress={handleSaveInspection}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="#3b82f6" />
            ) : (
              <Save size={20} color="#3b82f6" />
            )}
          </TouchableOpacity>
        </View>

        <Text className="text-gray-600 mb-4">Property: {formData.address}</Text>

        <ScrollView className="mb-4">
          {categories.map((category, index) => {
            const isCompleted =
              formData.categories[category] && Object.keys(formData.categories[category]).length > 0;

            return (
              <TouchableOpacity
                key={index}
                className={`flex-row justify-between items-center p-4 mb-2 rounded-lg border ${isCompleted ? "border-green-500 bg-green-50" : "border-gray-300"}`}
                onPress={() => handleCategorySelect(category)}
              >
                <Text
                  className={`font-medium ${isCompleted ? "text-green-700" : "text-gray-800"}`}
                >
                  {category}
                </Text>
                <View className="flex-row items-center">
                  {isCompleted && (
                    <Text className="text-green-600 mr-2">Completed</Text>
                  )}
                  <ChevronRight
                    size={16}
                    color={isCompleted ? "#10b981" : "#6b7280"}
                  />
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Property Outline Tool Button */}
        <TouchableOpacity
          className="bg-blue-100 py-3 px-4 rounded-lg items-center mb-4 flex-row justify-center"
          onPress={() => setShowPropertyOutlineTool(true)}
        >
          <Map size={20} color="#3b82f6" />
          <Text className="text-blue-700 font-semibold ml-2">
            Property Outline Tool
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          className="bg-gray-200 py-3 px-4 rounded-lg items-center mt-2"
          onPress={() => setStep(1)}
        >
          <Text className="text-gray-800 font-semibold">Back to Address</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View className="flex-1 bg-gray-100 p-4">
      {/* Back button header */}
      <View className="flex-row items-center mb-4">
        <TouchableOpacity 
          onPress={handleBackButton}
          className="p-2 rounded-full bg-white shadow-sm"
        >
          <ArrowLeft size={24} color="#3b82f6" />
        </TouchableOpacity>
        <Text className="text-lg font-semibold ml-2 text-gray-800">
          {inspectionId ? "Edit Inspection" :
           step === 1 ? "New Inspection" : 
           step === 2 ? "Select Category" : 
           selectedCategory ? `${selectedCategory} Inspection` : "Inspection"}
        </Text>
      </View>

      {isLoading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text className="mt-4 text-gray-600">Loading inspection...</Text>
        </View>
      ) : (
        <>
          {step === 1 && renderAddressEntry()}

          {step === 2 && !showPropertyOutlineTool && renderCategorySelection()}

          {step === 3 && selectedCategory && (
            <>
              {selectedCategory === "Property ID" ? (
                <PropertyIDForm
                  key={formData.address || "property-id-form"}
                  onComplete={handleCategoryComplete}
                  onCancel={handleCancelCategory}
                  onNext={handleNextCategory}
                  onPrevious={handlePreviousCategory}
                  isFirstCategory={categories.indexOf(selectedCategory) === 0}
                  isLastCategory={categories.indexOf(selectedCategory) === categories.length - 1}
                  initialData={{ 
                    address: formData.address,
                    propertyApiData: formData.propertyApiData,
                  }}
                />
              ) : (
                <CategoryInspection
                  category={selectedCategory}
                  initialData={formData.categories[selectedCategory]}
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
              )}
            </>
          )}

          {showPropertyOutlineTool && (
            <PropertyOutlineTool
              address={formData.address}
              onComplete={handlePropertyOutlineComplete}
              onCancel={() => {
                setShowPropertyOutlineTool(false);
                setStep(2);
              }}
            />
          )}
        </>
      )}
    </View>
  );
};

export default InspectionForm;