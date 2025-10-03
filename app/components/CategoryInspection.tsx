import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  Image,
  ActivityIndicator,
} from "react-native";
import { speechService } from "../../lib/speechService";
import { aiFormFillerService } from "../../lib/aiFormFillerService";
import { imageService, UploadedImage } from "../../lib/imageService";
import { directPropertyService } from "../../lib/directPropertyService";

interface CategoryInspectionProps {
  category: string;
  onComplete: (data: any) => void;
  initialData?: any;
  onCancel?: () => void;
  onNext?: () => void;
  onPrevious?: () => void;
  isFirstCategory?: boolean;
  isLastCategory?: boolean;
  address?: string; // Add address prop to receive from InspectionForm
}

export default function CategoryInspection({
  category = "Exterior",
  onComplete = () => {},
  initialData = {},
  onCancel = () => {},
  onNext = () => {},
  onPrevious = () => {},
  isFirstCategory = false,
  isLastCategory = false,
  address = "", // Default to empty string
}: CategoryInspectionProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [isLoadingPropertyData, setIsLoadingPropertyData] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // Dynamic form data based on category
  const getInitialFormData = (cat: string) => {
    switch (cat) {
      case "Property ID":
        return {
          propertyAddress: "",
          parcelInformation: "",
          yearBuilt: "",
          squareFootage: "",
          constructionType: "",
          numberOfStories: "",
          occupancyType: "",
          generalNotes: "",
        };
      case "HVAC":
        return {
          hvacType: "",
          age: "",
          ductwork: "",
          maintenanceIndicators: "",
          condition: "",
          generalNotes: "",
        };
      case "Interior":
        return {
          flooring: "",
          walls: "",
          ceilings: "",
          lighting: "",
          outlets: "",
          generalNotes: "",
        };
      case "Plumbing":
        return {
          waterPressure: "",
          fixtures: "",
          pipes: "",
          waterHeater: "",
          leaks: "",
          generalNotes: "",
        };
      case "Electrical":
        return {
          panelBox: "",
          wiring: "",
          outlets: "",
          switches: "",
          safetyDevices: "",
          generalNotes: "",
        };
      case "Hazards":
        return {
          exteriorHazards: "",
          roofHazards: "",
          electricalHazards: "",
          liabilityConcerns: "",
          poolSafety: "",
          generalNotes: "",
        };
      default: // Exterior
        return {
          roofType: "",
          sidingType: "",
          foundationAndStructure: "",
          windowsAndDoors: "",
          propertyHazards: "",
          generalNotes: "",
        };
    }
  };

  const [formData, setFormData] = useState(getInitialFormData(category));

  // Debug state for troubleshooting
  const [debugInfo, setDebugInfo] = useState({
    transcript: "",
    aiResponse: "",
    error: "",
    confidence: 0,
    formUpdates: {},
  });

  // Load initial data if provided
  useEffect(() => {
    if (initialData && Object.keys(initialData).length > 0) {
      setFormData((prev) => ({ ...prev, ...initialData }));
    }
  }, [initialData]);

  // Auto-populate property address from parent component if in Property ID category
  useEffect(() => {
    if (category === "Property ID" && address && !formData.propertyAddress) {
      setFormData(prev => ({
        ...prev,
        propertyAddress: address
      }));
    }
  }, [category, address]);

  // Load existing images for this category
  useEffect(() => {
    loadImages();
  }, [category]);

  const loadImages = async () => {
    try {
      // For demo purposes, using a mock inspection ID
      const mockInspectionId = "demo-inspection-123";
      const categoryImages = await imageService.getImagesForInspection(
        mockInspectionId,
        category,
      );
      setImages(categoryImages);
    } catch (error) {
      console.error("Failed to load images:", error);
    }
  };

  const handleImageCapture = async () => {
    if (isCapturing) return;

    try {
      setIsCapturing(true);
      const result = await imageService.captureImage();

      if (result && result.assets && result.assets[0]) {
        const asset = result.assets[0];

        // Prepare metadata
        const metadata = {
          fileName: asset.fileName || `${category}_${Date.now()}.jpg`,
          fileSize: asset.fileSize || 0,
          mimeType: asset.mimeType || "image/jpeg",
          exifData: asset.exif || {},
          width: asset.width,
          height: asset.height,
        };

        // Upload to Supabase
        const mockInspectionId = "demo-inspection-123";
        const uploadedImage = await imageService.uploadImageToSupabase(
          asset.uri,
          mockInspectionId,
          category,
          metadata,
        );

        // Add to local state
        setImages((prev) => [uploadedImage, ...prev]);

        Alert.alert("Success", "Image captured and uploaded successfully!");
      }
    } catch (error) {
      console.error("Image capture error:", error);
      Alert.alert("Error", "Failed to capture image. Please try again.");
    } finally {
      setIsCapturing(false);
    }
  };

  const handleDeleteImage = async (imageId: string) => {
    Alert.alert("Delete Image", "Are you sure you want to delete this image?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await imageService.deleteImage(imageId);
            setImages((prev) => prev.filter((img) => img.id !== imageId));
            Alert.alert("Success", "Image deleted successfully!");
          } catch (error) {
            console.error("Delete error:", error);
            Alert.alert("Error", "Failed to delete image.");
          }
        },
      },
    ]);
  };

  const handleVoiceRecording = async () => {
    if (isRecording) {
      try {
        setIsRecording(false);
        setDebugInfo((prev) => ({
          ...prev,
          transcript: "Stopping recording...",
          error: "",
        }));

        console.log("About to stop recording...");
        const transcript = await speechService.stopRecording();
        console.log("Received transcript:", transcript);

        if (transcript) {
          setDebugInfo((prev) => ({ ...prev, transcript }));

          // Create form fields structure for AI processing - category specific
          const formFields = getFormFields(category, formData);

          // Process with AI form filler using the correct method name
          setDebugInfo((prev) => ({
            ...prev,
            aiResponse: "Processing AI response...",
          }));
          const aiResult =
            await aiFormFillerService.processTranscriptForCategory(
              transcript,
              category,
              formFields,
            );

          setDebugInfo((prev) => ({
            ...prev,
            aiResponse: JSON.stringify(aiResult, null, 2),
            confidence: aiResult.confidence || 0,
          }));

          // Update form fields with AI results
          if (aiResult.updatedFields) {
            const newFormData = { ...formData };
            const formUpdates = {};
            aiResult.updatedFields.forEach((field) => {
              if (
                field.value &&
                field.value !== formData[field.id as keyof typeof formData]
              ) {
                newFormData[field.id as keyof typeof formData] = field.value;
                formUpdates[field.id] = field.value;
              }
            });
            setFormData(newFormData);
            setDebugInfo((prev) => ({ ...prev, formUpdates }));
          }
        } else {
          console.log("No transcript received from speechService");
          setDebugInfo((prev) => ({
            ...prev,
            transcript: "",
            error: "No transcript received from speech service",
          }));
        }
      } catch (error) {
        console.error("Voice recording error:", error);
        setDebugInfo((prev) => ({
          ...prev,
          transcript: "",
          error: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
        }));
        Alert.alert("Error", "Failed to process voice recording");
      }
    } else {
      try {
        setIsRecording(true);
        setDebugInfo({
          transcript: "Starting recording...",
          aiResponse: "",
          error: "",
          confidence: 0,
        });
        console.log("About to start recording...");
        await speechService.startRecording();
        console.log("Recording started successfully");
        setDebugInfo((prev) => ({
          ...prev,
          transcript: "Recording... (tap to stop)",
        }));
      } catch (error) {
        console.error("Recording start error:", error);
        setIsRecording(false);
        setDebugInfo((prev) => ({
          ...prev,
          transcript: "",
          error: `Recording start error: ${error instanceof Error ? error.message : "Unknown error"}`,
        }));
        Alert.alert("Error", "Failed to start recording");
      }
    }
  };

  const getFormFields = (cat: string, data: any) => {
    switch (cat) {
      case "Property ID":
        return [
          {
            id: "propertyAddress",
            label: "Property Address",
            value: data.propertyAddress,
            placeholder: "Full property address and parcel information",
          },
          {
            id: "parcelInformation",
            label: "Parcel Information",
            value: data.parcelInformation,
            placeholder: "Parcel number, lot size, zoning information, etc.",
          },
          {
            id: "yearBuilt",
            label: "Year Built / Age of Structure",
            value: data.yearBuilt,
            placeholder: "e.g., Built in 1985, 38 years old, etc.",
          },
          {
            id: "squareFootage",
            label: "Square Footage",
            value: data.squareFootage,
            placeholder: "Total square footage, living area, etc.",
          },
          {
            id: "constructionType",
            label: "Construction Type and Materials",
            value: data.constructionType,
            placeholder: "Frame, brick, concrete block, materials used, etc.",
          },
          {
            id: "numberOfStories",
            label: "Number of Stories",
            value: data.numberOfStories,
            placeholder: "e.g., Single story, Two story, Split level, etc.",
          },
          {
            id: "occupancyType",
            label: "Occupancy Type",
            value: data.occupancyType,
            placeholder: "Owner-occupied, rental, commercial, vacant, etc.",
          },
          {
            id: "generalNotes",
            label: "General Notes",
            value: data.generalNotes,
            placeholder: "Additional property identification notes...",
          },
        ];
      case "HVAC":
        return [
          {
            id: "hvacType",
            label: "Type of HVAC",
            value: data.hvacType,
            placeholder: "e.g., Central air, Heat pump, Boiler, Furnace, etc.",
          },
          {
            id: "age",
            label: "Age",
            value: data.age,
            placeholder: "e.g., 5 years old, installed in 2018, etc.",
          },
          {
            id: "ductwork",
            label: "Ductwork",
            value: data.ductwork,
            placeholder: "Condition, material, insulation, leaks, etc.",
          },
          {
            id: "maintenanceIndicators",
            label: "Maintenance Indicators",
            value: data.maintenanceIndicators,
            placeholder: "Filter condition, service records, cleanliness, etc.",
          },
          {
            id: "condition",
            label: "Condition",
            value: data.condition,
            placeholder: "Overall condition, functionality, efficiency, etc.",
          },
          {
            id: "generalNotes",
            label: "General Notes",
            value: data.generalNotes,
            placeholder: "Additional observations and notes...",
          },
        ];
      case "Interior":
        return [
          {
            id: "flooring",
            label: "Flooring",
            value: data.flooring,
            placeholder: "e.g., Hardwood, Carpet, Tile, Laminate, etc.",
          },
          {
            id: "walls",
            label: "Walls",
            value: data.walls,
            placeholder: "Paint condition, wallpaper, drywall, etc.",
          },
          {
            id: "ceilings",
            label: "Ceilings",
            value: data.ceilings,
            placeholder: "Condition, stains, cracks, texture, etc.",
          },
          {
            id: "lighting",
            label: "Lighting",
            value: data.lighting,
            placeholder: "Fixtures, bulbs, switches, natural light, etc.",
          },
          {
            id: "outlets",
            label: "Outlets & Switches",
            value: data.outlets,
            placeholder: "Functionality, GFCI, placement, condition, etc.",
          },
          {
            id: "generalNotes",
            label: "General Notes",
            value: data.generalNotes,
            placeholder: "Additional observations and notes...",
          },
        ];
      case "Plumbing":
        return [
          {
            id: "waterPressure",
            label: "Water Pressure",
            value: data.waterPressure,
            placeholder: "Hot/cold water pressure, flow rate, etc.",
          },
          {
            id: "fixtures",
            label: "Fixtures",
            value: data.fixtures,
            placeholder: "Sinks, toilets, showers, tubs, faucets, etc.",
          },
          {
            id: "pipes",
            label: "Pipes",
            value: data.pipes,
            placeholder: "Material, condition, visible pipes, etc.",
          },
          {
            id: "waterHeater",
            label: "Water Heater",
            value: data.waterHeater,
            placeholder: "Type, age, condition, capacity, etc.",
          },
          {
            id: "leaks",
            label: "Leaks & Issues",
            value: data.leaks,
            placeholder: "Visible leaks, water damage, drainage, etc.",
          },
          {
            id: "generalNotes",
            label: "General Notes",
            value: data.generalNotes,
            placeholder: "Additional observations and notes...",
          },
        ];
      case "Electrical":
        return [
          {
            id: "panelBox",
            label: "Panel Box",
            value: data.panelBox,
            placeholder: "Main panel, breakers, labeling, condition, etc.",
          },
          {
            id: "wiring",
            label: "Wiring",
            value: data.wiring,
            placeholder:
              "Visible wiring, type, condition, code compliance, etc.",
          },
          {
            id: "outlets",
            label: "Outlets",
            value: data.outlets,
            placeholder: "GFCI, grounding, functionality, placement, etc.",
          },
          {
            id: "switches",
            label: "Switches",
            value: data.switches,
            placeholder: "Light switches, functionality, condition, etc.",
          },
          {
            id: "safetyDevices",
            label: "Safety Devices",
            value: data.safetyDevices,
            placeholder: "Smoke detectors, carbon monoxide, AFCI, etc.",
          },
          {
            id: "generalNotes",
            label: "General Notes",
            value: data.generalNotes,
            placeholder: "Additional observations and notes...",
          },
        ];
      case "Hazards":
        return [
          {
            id: "exteriorHazards",
            label: "Exterior Hazards",
            value: data.exteriorHazards,
            placeholder: "Trip hazards, damaged walkways, loose railings, etc.",
          },
          {
            id: "roofHazards",
            label: "Roof Hazards",
            value: data.roofHazards,
            placeholder: "Missing shingles, damaged gutters, ice dams, etc.",
          },
          {
            id: "electricalHazards",
            label: "Electrical Hazards",
            value: data.electricalHazards,
            placeholder:
              "Exposed wiring, overloaded circuits, faulty outlets, etc.",
          },
          {
            id: "liabilityConcerns",
            label: "Liability Concerns",
            value: data.liabilityConcerns,
            placeholder: "Pool safety, trampoline, playground equipment, etc.",
          },
          {
            id: "poolSafety",
            label: "Pool/Trampoline/Playground/Lighting",
            value: data.poolSafety,
            placeholder:
              "Safety barriers, equipment condition, lighting adequacy, etc.",
          },
          {
            id: "generalNotes",
            label: "General Notes",
            value: data.generalNotes,
            placeholder: "Additional safety observations and notes...",
          },
        ];
      default: // Exterior
        return [
          {
            id: "roofType",
            label: "Roof Type",
            value: data.roofType,
            placeholder: "e.g., Asphalt shingles, Metal, Tile, etc.",
          },
          {
            id: "sidingType",
            label: "Siding Type",
            value: data.sidingType,
            placeholder: "e.g., Vinyl, Wood, Brick, Stucco, etc.",
          },
          {
            id: "foundationAndStructure",
            label: "Foundation and Structure",
            value: data.foundationAndStructure,
            placeholder: "Foundation type, structural condition, cracks, etc.",
          },
          {
            id: "windowsAndDoors",
            label: "Windows and Doors",
            value: data.windowsAndDoors,
            placeholder:
              "Condition, type, functionality, weatherstripping, etc.",
          },
          {
            id: "propertyHazards",
            label: "Property Hazards",
            value: data.propertyHazards,
            placeholder: "Safety concerns, trip hazards, damaged areas, etc.",
          },
          {
            id: "generalNotes",
            label: "General Notes",
            value: data.generalNotes,
            placeholder: "Additional observations and notes...",
          },
        ];
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Auto-lookup property data when address is available
  useEffect(() => {
    // Only run this effect when category is "Property ID" and address is available
    if (category !== "Property ID" || !address) return;
    
    // Skip if we already have data filled in
    const hasExistingData = formData.parcelInformation || 
                           formData.yearBuilt || 
                           formData.squareFootage;
    
    if (hasExistingData) return;
    
    // Use a ref to track if component is mounted
    let isMounted = true;
    
    const autoLookupProperty = async () => {
      try {
        setIsLoadingPropertyData(true);
        setApiError(null);
        console.log("Auto-looking up property data for:", address);
        
        // Call the direct property service instead of Supabase edge function
        const result = await directPropertyService.lookupProperty(address);
        
        // Only update state if component is still mounted
        if (!isMounted) return;
        
        console.log("Auto-fill result:", result);
        
        if (result.success && result.data) {
          console.log("Auto-fill successful");
          // Update form with property data
          setFormData(prev => ({
            ...prev,
            propertyAddress: result.data.propertyAddress || prev.propertyAddress,
            parcelInformation: result.data.parcelInformation || prev.parcelInformation,
            yearBuilt: result.data.yearBuilt || prev.yearBuilt,
            squareFootage: result.data.squareFootage || prev.squareFootage,
            constructionType: result.data.constructionType || prev.constructionType,
            numberOfStories: result.data.numberOfStories || prev.numberOfStories,
            occupancyType: result.data.occupancyType || prev.occupancyType,
          }));
        } else if (result.error) {
          setApiError(result.error);
          console.error("Auto-fill API error:", result.error);
        }
      } catch (error) {
        if (isMounted) {
          console.error("Auto-fill error:", error);
          setApiError(error instanceof Error ? error.message : "Unknown error");
        }
      } finally {
        if (isMounted) {
          setIsLoadingPropertyData(false);
        }
      }
    };
    
    // Call immediately if we have an address
    if (address) {
      autoLookupProperty();
    }
    
    // Cleanup function
    return () => {
      isMounted = false;
    };
  }, [category, address]);

  const handleAutoFillProperty = async () => {
    setIsLoadingPropertyData(true);
    setApiError(null);
    console.log("Manual auto-fill triggered");
    
    try {
      // Use the address from the form or the prop
      const addressToUse = formData.propertyAddress || address;
      
      if (!addressToUse || addressToUse.trim().length < 5) {
        setApiError("Please enter a valid address first");
        return;
      }
      
      // Call the direct property service instead of Supabase edge function
      const result = await directPropertyService.lookupProperty(addressToUse);
      console.log("Manual auto-fill result:", result);
      
      if (result.success && result.data) {
        // Update form with property data
        setFormData(prev => ({
          ...prev,
          propertyAddress: result.data.propertyAddress || prev.propertyAddress,
          parcelInformation: result.data.parcelInformation || prev.parcelInformation,
          yearBuilt: result.data.yearBuilt || prev.yearBuilt,
          squareFootage: result.data.squareFootage || prev.squareFootage,
          constructionType: result.data.constructionType || prev.constructionType,
          numberOfStories: result.data.numberOfStories || prev.numberOfStories,
          occupancyType: result.data.occupancyType || prev.occupancyType,
        }));
        
        Alert.alert(
          "Property Data Loaded", 
          "Property information has been automatically filled from Smarty API.",
          [{ text: "OK" }]
        );
      } else if (result.error) {
        setApiError(result.error);
        Alert.alert(
          "Property Data Error", 
          `Could not retrieve property data: ${result.error}`,
          [{ text: "OK" }]
        );
      } else {
        setApiError("No property data found");
        Alert.alert(
          "Property Data Not Found", 
          "Could not find property data for this address.",
          [{ text: "OK" }]
        );
      }
    } catch (error) {
      console.error('Auto-fill error:', error);
      setApiError(error instanceof Error ? error.message : "Unknown error");
      Alert.alert(
        "Auto-Fill Error", 
        "An error occurred while retrieving property data.",
        [{ text: "OK" }]
      );
    } finally {
      setIsLoadingPropertyData(false);
    }
  };

  const handleComplete = () => {
    // Save the current form data
    const categoryData = {
      category,
      ...formData,
      timestamp: new Date().toISOString(),
      completed: true,
    };

    console.log("Saving category data:", categoryData);
    onComplete(categoryData);
  };

  const handleNext = () => {
    // Save current data before moving to next
    handleComplete();
    if (onNext) {
      onNext();
    }
  };

  const handlePrevious = () => {
    // Save current data before moving to previous
    handleComplete();
    if (onPrevious) {
      onPrevious();
    }
  };

  const handleBackToCategories = () => {
    // Save current data before going back
    handleComplete();
    if (onCancel) {
      onCancel();
    }
  };

  return (
    <ScrollView className="flex-1 bg-gray-50">
      <View className="p-4">
        {/* Header */}
        <View className="mb-6">
          <Text className="text-2xl font-bold text-gray-800 mb-2">
            {category} Inspection
          </Text>
          <Text className="text-gray-600">
            Use voice recording or manual input to fill the form
          </Text>
        </View>

        {/* Action Buttons */}
        <View className="flex-row mb-6 space-x-3">
          <TouchableOpacity
            onPress={handleVoiceRecording}
            disabled={isCapturing}
            className={`flex-1 flex-row items-center justify-center py-3 px-4 rounded-lg ${
              isRecording
                ? "bg-red-500"
                : isCapturing
                  ? "bg-gray-400"
                  : "bg-blue-500"
            }`}
          >
            <Text className="text-white font-semibold mr-2">
              {isRecording ? "⏹️" : "🎤"}
            </Text>
            <Text className="text-white font-semibold">
              {isRecording ? "Stop" : "Record"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleImageCapture}
            disabled={isRecording || isCapturing}
            className={`flex-1 flex-row items-center justify-center py-3 px-4 rounded-lg ${
              isCapturing
                ? "bg-gray-400"
                : isRecording
                  ? "bg-gray-400"
                  : "bg-green-500"
            }`}
          >
            <Text className="text-white font-semibold mr-2">
              {isCapturing ? "⏳" : "📷"}
            </Text>
            <Text className="text-white font-semibold">
              {isCapturing ? "Capturing..." : "Capture"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Images Section */}
        {images.length > 0 && (
          <View className="mb-6">
            <Text className="text-lg font-semibold mb-3 text-gray-800">
              Captured Images ({images.length})
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View className="flex-row space-x-3">
                {images.map((image) => (
                  <View key={image.id} className="relative">
                    <Image
                      source={{ uri: image.url }}
                      className="w-24 h-24 rounded-lg"
                      resizeMode="cover"
                    />
                    <TouchableOpacity
                      onPress={() => handleDeleteImage(image.id)}
                      className="absolute -top-2 -right-2 bg-red-500 rounded-full w-6 h-6 items-center justify-center"
                    >
                      <Text className="text-white text-xs font-bold">×</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>
        )}

        {/* Debug Info */}
        {debugInfo.transcript && (
          <View className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <Text className="text-sm font-medium text-blue-800 mb-1">
              Transcript:
            </Text>
            <Text className="text-sm text-blue-700">
              {debugInfo.transcript}
            </Text>
            {debugInfo.confidence > 0 && (
              <Text className="text-xs text-blue-600 mt-1">
                Confidence: {Math.round(debugInfo.confidence * 100)}%
              </Text>
            )}
          </View>
        )}

        {debugInfo.error && (
          <View className="mb-4 p-3 bg-red-50 rounded-lg border border-red-200">
            <Text className="text-sm font-medium text-red-800 mb-1">
              Error:
            </Text>
            <Text className="text-sm text-red-700">{debugInfo.error}</Text>
          </View>
        )}

        {debugInfo.aiResponse && (
          <View className="mb-4 p-3 bg-green-50 rounded-lg border border-green-200">
            <Text className="text-sm font-medium text-green-800 mb-1">
              AI Response:
            </Text>
            <Text className="text-sm text-green-700">
              {debugInfo.aiResponse}
            </Text>
          </View>
        )}

        {debugInfo.formUpdates &&
          Object.keys(debugInfo.formUpdates).length > 0 && (
            <View className="mb-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
              <Text className="text-sm font-medium text-yellow-800 mb-1">
                Form Updates:
              </Text>
              {Object.entries(debugInfo.formUpdates).map(([key, value]) => (
                <Text key={key} className="text-sm text-yellow-700">
                  {key}: {String(value)}
                </Text>
              ))}
            </View>
          )}

        {/* API Error Display */}
        {apiError && (
          <View className="mb-4 p-3 bg-red-50 rounded-lg border border-red-200">
            <Text className="text-sm font-medium text-red-800 mb-1">
              API Error:
            </Text>
            <Text className="text-sm text-red-700">{apiError}</Text>
          </View>
        )}

        {/* Form Fields */}
        <View className="mb-6">
          <Text className="text-xl font-semibold mb-4 text-gray-800">
            {category} Inspection Form
          </Text>

          {category === "Property ID" ? (
            <>
              <View className="mb-4">
                <Text className="text-base font-medium mb-2 text-gray-700">
                  Property Address
                </Text>
                <TextInput
                  className="bg-white p-3 border border-gray-300 rounded-lg min-h-[80px]"
                  value={formData.propertyAddress || ""}
                  onChangeText={(text) =>
                    setFormData((prev) => ({ ...prev, propertyAddress: text }))
                  }
                  placeholder="Full property address and parcel information"
                  multiline
                  numberOfLines={3}
                />
                
                {/* Auto-Fill Button */}
                <TouchableOpacity
                  onPress={handleAutoFillProperty}
                  disabled={isLoadingPropertyData || !formData.propertyAddress?.trim()}
                  className={`mt-3 py-3 px-4 rounded-lg flex-row items-center justify-center ${
                    isLoadingPropertyData || !formData.propertyAddress?.trim()
                      ? "bg-gray-400"
                      : "bg-purple-500"
                  }`}
                >
                  {isLoadingPropertyData ? (
                    <>
                      <ActivityIndicator size="small" color="white" />
                      <Text className="text-white font-semibold ml-2">
                        Loading Property Data...
                      </Text>
                    </>
                  ) : (
                    <>
                      <Text className="text-white font-semibold mr-2">🏠</Text>
                      <Text className="text-white font-semibold">
                        Auto-Fill Property Data
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
                
                <Text className="text-xs text-gray-500 mt-2">
                  Enter an address above and tap "Auto-Fill" to automatically populate property details from Smarty API
                </Text>
              </View>

              <View className="mb-4">
                <Text className="text-base font-medium mb-2 text-gray-700">
                  Parcel Information
                </Text>
                <TextInput
                  className="bg-white p-3 border border-gray-300 rounded-lg min-h-[80px]"
                  value={formData.parcelInformation || ""}
                  onChangeText={(text) =>
                    setFormData((prev) => ({ ...prev, parcelInformation: text }))
                  }
                  placeholder="Parcel number, lot size, zoning information, etc."
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View className="mb-4">
                <Text className="text-base font-medium mb-2 text-gray-700">
                  Year Built / Age of Structure
                </Text>
                <TextInput
                  className="bg-white p-3 border border-gray-300 rounded-lg min-h-[50px]"
                  value={formData.yearBuilt || ""}
                  onChangeText={(text) =>
                    setFormData((prev) => ({ ...prev, yearBuilt: text }))
                  }
                  placeholder="e.g., Built in 1985, 38 years old, etc."
                  multiline
                />
              </View>

              <View className="mb-4">
                <Text className="text-base font-medium mb-2 text-gray-700">
                  Square Footage
                </Text>
                <TextInput
                  className="bg-white p-3 border border-gray-300 rounded-lg min-h-[50px]"
                  value={formData.squareFootage || ""}
                  onChangeText={(text) =>
                    setFormData((prev) => ({ ...prev, squareFootage: text }))
                  }
                  placeholder="Total square footage, living area, etc."
                  multiline
                />
              </View>

              <View className="mb-4">
                <Text className="text-base font-medium mb-2 text-gray-700">
                  Construction Type and Materials
                </Text>
                <TextInput
                  className="bg-white p-3 border border-gray-300 rounded-lg min-h-[80px]"
                  value={formData.constructionType || ""}
                  onChangeText={(text) =>
                    setFormData((prev) => ({ ...prev, constructionType: text }))
                  }
                  placeholder="Frame, brick, concrete block, materials used, etc."
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View className="mb-4">
                <Text className="text-base font-medium mb-2 text-gray-700">
                  Number of Stories
                </Text>
                <TextInput
                  className="bg-white p-3 border border-gray-300 rounded-lg min-h-[50px]"
                  value={formData.numberOfStories || ""}
                  onChangeText={(text) =>
                    setFormData((prev) => ({ ...prev, numberOfStories: text }))
                  }
                  placeholder="e.g., Single story, Two story, Split level, etc."
                  multiline
                />
              </View>

              <View className="mb-4">
                <Text className="text-base font-medium mb-2 text-gray-700">
                  Occupancy Type
                </Text>
                <TextInput
                  className="bg-white p-3 border border-gray-300 rounded-lg min-h-[80px]"
                  value={formData.occupancyType || ""}
                  onChangeText={(text) =>
                    setFormData((prev) => ({ ...prev, occupancyType: text }))
                  }
                  placeholder="Owner-occupied, rental, commercial, vacant, etc."
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View className="mb-4">
                <Text className="text-base font-medium mb-2 text-gray-700">
                  General Notes
                </Text>
                <TextInput
                  className="bg-white p-3 border border-gray-300 rounded-lg min-h-[100px]"
                  value={formData.generalNotes || ""}
                  onChangeText={(text) =>
                    setFormData((prev) => ({ ...prev, generalNotes: text }))
                  }
                  placeholder="Additional property identification notes..."
                  multiline
                  numberOfLines={4}
                />
              </View>
            </>
          ) : category === "HVAC" ? (
            <>
              <View className="mb-4">
                <Text className="text-base font-medium mb-2 text-gray-700">
                  Type of HVAC
                </Text>
                <TextInput
                  className="bg-white p-3 border border-gray-300 rounded-lg min-h-[50px]"
                  value={formData.hvacType || ""}
                  onChangeText={(text) =>
                    setFormData((prev) => ({ ...prev, hvacType: text }))
                  }
                  placeholder="e.g., Central air, Heat pump, Boiler, Furnace, etc."
                  multiline
                />
              </View>

              <View className="mb-4">
                <Text className="text-base font-medium mb-2 text-gray-700">
                  Age
                </Text>
                <TextInput
                  className="bg-white p-3 border border-gray-300 rounded-lg min-h-[50px]"
                  value={formData.age || ""}
                  onChangeText={(text) =>
                    setFormData((prev) => ({ ...prev, age: text }))
                  }
                  placeholder="e.g., 5 years old, installed in 2018, etc."
                  multiline
                />
              </View>

              <View className="mb-4">
                <Text className="text-base font-medium mb-2 text-gray-700">
                  Ductwork
                </Text>
                <TextInput
                  className="bg-white p-3 border border-gray-300 rounded-lg min-h-[80px]"
                  value={formData.ductwork || ""}
                  onChangeText={(text) =>
                    setFormData((prev) => ({ ...prev, ductwork: text }))
                  }
                  placeholder="Condition, material, insulation, leaks, etc."
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View className="mb-4">
                <Text className="text-base font-medium mb-2 text-gray-700">
                  Maintenance Indicators
                </Text>
                <TextInput
                  className="bg-white p-3 border border-gray-300 rounded-lg min-h-[80px]"
                  value={formData.maintenanceIndicators || ""}
                  onChangeText={(text) =>
                    setFormData((prev) => ({
                      ...prev,
                      maintenanceIndicators: text,
                    }))
                  }
                  placeholder="Filter condition, service records, cleanliness, etc."
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View className="mb-4">
                <Text className="text-base font-medium mb-2 text-gray-700">
                  Condition
                </Text>
                <TextInput
                  className="bg-white p-3 border border-gray-300 rounded-lg min-h-[80px]"
                  value={formData.condition || ""}
                  onChangeText={(text) =>
                    setFormData((prev) => ({ ...prev, condition: text }))
                  }
                  placeholder="Overall condition, functionality, efficiency, etc."
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View className="mb-4">
                <Text className="text-base font-medium mb-2 text-gray-700">
                  General Notes
                </Text>
                <TextInput
                  className="bg-white p-3 border border-gray-300 rounded-lg min-h-[100px]"
                  value={formData.generalNotes || ""}
                  onChangeText={(text) =>
                    setFormData((prev) => ({ ...prev, generalNotes: text }))
                  }
                  placeholder="Additional observations and notes..."
                  multiline
                  numberOfLines={4}
                />
              </View>
            </>
          ) : category === "Interior" ? (
            <>
              <View className="mb-4">
                <Text className="text-base font-medium mb-2 text-gray-700">
                  Flooring
                </Text>
                <TextInput
                  className="bg-white p-3 border border-gray-300 rounded-lg min-h-[50px]"
                  value={formData.flooring || ""}
                  onChangeText={(text) =>
                    setFormData((prev) => ({ ...prev, flooring: text }))
                  }
                  placeholder="e.g., Hardwood, Carpet, Tile, Laminate, etc."
                  multiline
                />
              </View>

              <View className="mb-4">
                <Text className="text-base font-medium mb-2 text-gray-700">
                  Walls
                </Text>
                <TextInput
                  className="bg-white p-3 border border-gray-300 rounded-lg min-h-[80px]"
                  value={formData.walls || ""}
                  onChangeText={(text) =>
                    setFormData((prev) => ({ ...prev, walls: text }))
                  }
                  placeholder="Paint condition, wallpaper, drywall, etc."
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View className="mb-4">
                <Text className="text-base font-medium mb-2 text-gray-700">
                  Ceilings
                </Text>
                <TextInput
                  className="bg-white p-3 border border-gray-300 rounded-lg min-h-[80px]"
                  value={formData.ceilings || ""}
                  onChangeText={(text) =>
                    setFormData((prev) => ({ ...prev, ceilings: text }))
                  }
                  placeholder="Condition, stains, cracks, texture, etc."
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View className="mb-4">
                <Text className="text-base font-medium mb-2 text-gray-700">
                  Lighting
                </Text>
                <TextInput
                  className="bg-white p-3 border border-gray-300 rounded-lg min-h-[80px]"
                  value={formData.lighting || ""}
                  onChangeText={(text) =>
                    setFormData((prev) => ({ ...prev, lighting: text }))
                  }
                  placeholder="Fixtures, bulbs, switches, natural light, etc."
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View className="mb-4">
                <Text className="text-base font-medium mb-2 text-gray-700">
                  Outlets & Switches
                </Text>
                <TextInput
                  className="bg-white p-3 border border-gray-300 rounded-lg min-h-[80px]"
                  value={formData.outlets || ""}
                  onChangeText={(text) =>
                    setFormData((prev) => ({ ...prev, outlets: text }))
                  }
                  placeholder="Functionality, GFCI, placement, condition, etc."
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View className="mb-4">
                <Text className="text-base font-medium mb-2 text-gray-700">
                  General Notes
                </Text>
                <TextInput
                  className="bg-white p-3 border border-gray-300 rounded-lg min-h-[100px]"
                  value={formData.generalNotes || ""}
                  onChangeText={(text) =>
                    setFormData((prev) => ({ ...prev, generalNotes: text }))
                  }
                  placeholder="Additional observations and notes..."
                  multiline
                  numberOfLines={4}
                />
              </View>
            </>
          ) : category === "Plumbing" ? (
            <>
              <View className="mb-4">
                <Text className="text-base font-medium mb-2 text-gray-700">
                  Water Pressure
                </Text>
                <TextInput
                  className="bg-white p-3 border border-gray-300 rounded-lg min-h-[50px]"
                  value={formData.waterPressure || ""}
                  onChangeText={(text) =>
                    setFormData((prev) => ({ ...prev, waterPressure: text }))
                  }
                  placeholder="Hot/cold water pressure, flow rate, etc."
                  multiline
                />
              </View>

              <View className="mb-4">
                <Text className="text-base font-medium mb-2 text-gray-700">
                  Fixtures
                </Text>
                <TextInput
                  className="bg-white p-3 border border-gray-300 rounded-lg min-h-[80px]"
                  value={formData.fixtures || ""}
                  onChangeText={(text) =>
                    setFormData((prev) => ({ ...prev, fixtures: text }))
                  }
                  placeholder="Sinks, toilets, showers, tubs, faucets, etc."
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View className="mb-4">
                <Text className="text-base font-medium mb-2 text-gray-700">
                  Pipes
                </Text>
                <TextInput
                  className="bg-white p-3 border border-gray-300 rounded-lg min-h-[80px]"
                  value={formData.pipes || ""}
                  onChangeText={(text) =>
                    setFormData((prev) => ({ ...prev, pipes: text }))
                  }
                  placeholder="Material, condition, visible pipes, etc."
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View className="mb-4">
                <Text className="text-base font-medium mb-2 text-gray-700">
                  Water Heater
                </Text>
                <TextInput
                  className="bg-white p-3 border border-gray-300 rounded-lg min-h-[80px]"
                  value={formData.waterHeater || ""}
                  onChangeText={(text) =>
                    setFormData((prev) => ({ ...prev, waterHeater: text }))
                  }
                  placeholder="Type, age, condition, capacity, etc."
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View className="mb-4">
                <Text className="text-base font-medium mb-2 text-gray-700">
                  Leaks & Issues
                </Text>
                <TextInput
                  className="bg-white p-3 border border-gray-300 rounded-lg min-h-[80px]"
                  value={formData.leaks || ""}
                  onChangeText={(text) =>
                    setFormData((prev) => ({ ...prev, leaks: text }))
                  }
                  placeholder="Visible leaks, water damage, drainage, etc."
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View className="mb-4">
                <Text className="text-base font-medium mb-2 text-gray-700">
                  General Notes
                </Text>
                <TextInput
                  className="bg-white p-3 border border-gray-300 rounded-lg min-h-[100px]"
                  value={formData.generalNotes || ""}
                  onChangeText={(text) =>
                    setFormData((prev) => ({ ...prev, generalNotes: text }))
                  }
                  placeholder="Additional observations and notes..."
                  multiline
                  numberOfLines={4}
                />
              </View>
            </>
          ) : category === "Electrical" ? (
            <>
              <View className="mb-4">
                <Text className="text-base font-medium mb-2 text-gray-700">
                  Panel Box
                </Text>
                <TextInput
                  className="bg-white p-3 border border-gray-300 rounded-lg min-h-[50px]"
                  value={formData.panelBox || ""}
                  onChangeText={(text) =>
                    setFormData((prev) => ({ ...prev, panelBox: text }))
                  }
                  placeholder="Main panel, breakers, labeling, condition, etc."
                  multiline
                />
              </View>

              <View className="mb-4">
                <Text className="text-base font-medium mb-2 text-gray-700">
                  Wiring
                </Text>
                <TextInput
                  className="bg-white p-3 border border-gray-300 rounded-lg min-h-[80px]"
                  value={formData.wiring || ""}
                  onChangeText={(text) =>
                    setFormData((prev) => ({ ...prev, wiring: text }))
                  }
                  placeholder="Visible wiring, type, condition, code compliance, etc."
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View className="mb-4">
                <Text className="text-base font-medium mb-2 text-gray-700">
                  Outlets
                </Text>
                <TextInput
                  className="bg-white p-3 border border-gray-300 rounded-lg min-h-[80px]"
                  value={formData.outlets || ""}
                  onChangeText={(text) =>
                    setFormData((prev) => ({ ...prev, outlets: text }))
                  }
                  placeholder="GFCI, grounding, functionality, placement, etc."
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View className="mb-4">
                <Text className="text-base font-medium mb-2 text-gray-700">
                  Switches
                </Text>
                <TextInput
                  className="bg-white p-3 border border-gray-300 rounded-lg min-h-[80px]"
                  value={formData.switches || ""}
                  onChangeText={(text) =>
                    setFormData((prev) => ({ ...prev, switches: text }))
                  }
                  placeholder="Light switches, functionality, condition, etc."
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View className="mb-4">
                <Text className="text-base font-medium mb-2 text-gray-700">
                  Safety Devices
                </Text>
                <TextInput
                  className="bg-white p-3 border border-gray-300 rounded-lg min-h-[80px]"
                  value={formData.safetyDevices || ""}
                  onChangeText={(text) =>
                    setFormData((prev) => ({ ...prev, safetyDevices: text }))
                  }
                  placeholder="Smoke detectors, carbon monoxide, AFCI, etc."
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View className="mb-4">
                <Text className="text-base font-medium mb-2 text-gray-700">
                  General Notes
                </Text>
                <TextInput
                  className="bg-white p-3 border border-gray-300 rounded-lg min-h-[100px]"
                  value={formData.generalNotes || ""}
                  onChangeText={(text) =>
                    setFormData((prev) => ({ ...prev, generalNotes: text }))
                  }
                  placeholder="Additional observations and notes..."
                  multiline
                  numberOfLines={4}
                />
              </View>
            </>
          ) : category === "Hazards" ? (
            <>
              <View className="mb-4">
                <Text className="text-base font-medium mb-2 text-gray-700">
                  Exterior Hazards
                </Text>
                <TextInput
                  className="bg-white p-3 border border-gray-300 rounded-lg min-h-[80px]"
                  value={formData.exteriorHazards || ""}
                  onChangeText={(text) =>
                    setFormData((prev) => ({ ...prev, exteriorHazards: text }))
                  }
                  placeholder="Trip hazards, damaged walkways, loose railings, etc."
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View className="mb-4">
                <Text className="text-base font-medium mb-2 text-gray-700">
                  Roof Hazards
                </Text>
                <TextInput
                  className="bg-white p-3 border border-gray-300 rounded-lg min-h-[80px]"
                  value={formData.roofHazards || ""}
                  onChangeText={(text) =>
                    setFormData((prev) => ({ ...prev, roofHazards: text }))
                  }
                  placeholder="Missing shingles, damaged gutters, ice dams, etc."
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View className="mb-4">
                <Text className="text-base font-medium mb-2 text-gray-700">
                  Electrical Hazards
                </Text>
                <TextInput
                  className="bg-white p-3 border border-gray-300 rounded-lg min-h-[80px]"
                  value={formData.electricalHazards || ""}
                  onChangeText={(text) =>
                    setFormData((prev) => ({
                      ...prev,
                      electricalHazards: text,
                    }))
                  }
                  placeholder="Exposed wiring, overloaded circuits, faulty outlets, etc."
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View className="mb-4">
                <Text className="text-base font-medium mb-2 text-gray-700">
                  Liability Concerns
                </Text>
                <TextInput
                  className="bg-white p-3 border border-gray-300 rounded-lg min-h-[80px]"
                  value={formData.liabilityConcerns || ""}
                  onChangeText={(text) =>
                    setFormData((prev) => ({
                      ...prev,
                      liabilityConcerns: text,
                    }))
                  }
                  placeholder="Pool safety, trampoline, playground equipment, etc."
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View className="mb-4">
                <Text className="text-base font-medium mb-2 text-gray-700">
                  Pool/Trampoline/Playground/Lighting
                </Text>
                <TextInput
                  className="bg-white p-3 border border-gray-300 rounded-lg min-h-[80px]"
                  value={formData.poolSafety || ""}
                  onChangeText={(text) =>
                    setFormData((prev) => ({ ...prev, poolSafety: text }))
                  }
                  placeholder="Safety barriers, equipment condition, lighting adequacy, etc."
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View className="mb-4">
                <Text className="text-base font-medium mb-2 text-gray-700">
                  General Notes
                </Text>
                <TextInput
                  className="bg-white p-3 border border-gray-300 rounded-lg min-h-[100px]"
                  value={formData.generalNotes || ""}
                  onChangeText={(text) =>
                    setFormData((prev) => ({ ...prev, generalNotes: text }))
                  }
                  placeholder="Additional safety observations and notes..."
                  multiline
                  numberOfLines={4}
                />
              </View>
            </>
          ) : (
            <>
              <View className="mb-4">
                <Text className="text-base font-medium mb-2 text-gray-700">
                  Roof Type
                </Text>
                <TextInput
                  className="bg-white p-3 border border-gray-300 rounded-lg min-h-[50px]"
                  value={formData.roofType || ""}
                  onChangeText={(text) =>
                    setFormData((prev) => ({ ...prev, roofType: text }))
                  }
                  placeholder="e.g., Asphalt shingles, Metal, Tile, etc."
                  multiline
                />
              </View>

              <View className="mb-4">
                <Text className="text-base font-medium mb-2 text-gray-700">
                  Siding Type
                </Text>
                <TextInput
                  className="bg-white p-3 border border-gray-300 rounded-lg min-h-[50px]"
                  value={formData.sidingType || ""}
                  onChangeText={(text) =>
                    setFormData((prev) => ({ ...prev, sidingType: text }))
                  }
                  placeholder="e.g., Vinyl, Wood, Brick, Stucco, etc."
                  multiline
                />
              </View>

              <View className="mb-4">
                <Text className="text-base font-medium mb-2 text-gray-700">
                  Foundation and Structure
                </Text>
                <TextInput
                  className="bg-white p-3 border border-gray-300 rounded-lg min-h-[80px]"
                  value={formData.foundationAndStructure || ""}
                  onChangeText={(text) =>
                    setFormData((prev) => ({
                      ...prev,
                      foundationAndStructure: text,
                    }))
                  }
                  placeholder="Foundation type, structural condition, cracks, etc."
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View className="mb-4">
                <Text className="text-base font-medium mb-2 text-gray-700">
                  Windows and Doors
                </Text>
                <TextInput
                  className="bg-white p-3 border border-gray-300 rounded-lg min-h-[80px]"
                  value={formData.windowsAndDoors || ""}
                  onChangeText={(text) =>
                    setFormData((prev) => ({ ...prev, windowsAndDoors: text }))
                  }
                  placeholder="Condition, type, functionality, weatherstripping, etc."
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View className="mb-4">
                <Text className="text-base font-medium mb-2 text-gray-700">
                  Property Hazards
                </Text>
                <TextInput
                  className="bg-white p-3 border border-gray-300 rounded-lg min-h-[80px]"
                  value={formData.propertyHazards || ""}
                  onChangeText={(text) =>
                    setFormData((prev) => ({ ...prev, propertyHazards: text }))
                  }
                  placeholder="Safety concerns, trip hazards, damaged areas, etc."
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View className="mb-4">
                <Text className="text-base font-medium mb-2 text-gray-700">
                  General Notes
                </Text>
                <TextInput
                  className="bg-white p-3 border border-gray-300 rounded-lg min-h-[100px]"
                  value={formData.generalNotes || ""}
                  onChangeText={(text) =>
                    setFormData((prev) => ({ ...prev, generalNotes: text }))
                  }
                  placeholder="Additional observations and notes..."
                  multiline
                  numberOfLines={4}
                />
              </View>
            </>
          )}
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
}