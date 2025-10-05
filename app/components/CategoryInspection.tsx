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
import { Picker } from "@react-native-picker/picker";
import { speechService } from "../../lib/speechService";
import { aiFormFillerService } from "../../lib/aiFormFillerService";
import { imageService, UploadedImage } from "../../lib/imageService";
import PropertyIDForm from "./PropertyIDForm";
import { useProperty } from "../contexts/PropertyContext";

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
  const { propertyData: globalPropertyData, isPropertyDataAvailable } = useProperty();
  
  const [isRecording, setIsRecording] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [images, setImages] = useState<UploadedImage[]>([]);

  // Dynamic form data based on category
  const getInitialFormData = (cat: string) => {
    const currentYear = new Date().getFullYear();
    
    switch (cat) {
      case "Property ID":
        return {
          propertyAddress: globalPropertyData?.propertyAddress || "",
          parcelInformation: globalPropertyData?.parcelInformation || "",
          yearBuilt: globalPropertyData?.yearBuilt || "",
          squareFootage: globalPropertyData?.squareFootage || "",
          constructionType: globalPropertyData?.constructionType || "",
          numberOfStories: globalPropertyData?.numberOfStories || "",
          occupancyType: globalPropertyData?.occupancyType || "",
          generalNotes: "",
        };
      case "HVAC":
        // Calculate age from year built if available
        const yearBuilt = globalPropertyData?.propertyData?.year_built;
        const calculatedAge = yearBuilt ? `${currentYear - parseInt(yearBuilt)} years` : "";
        
        return {
          hvacType: globalPropertyData?.propertyData?.air_conditioner || "",
          age: calculatedAge,
          ductwork: "",
          maintenanceIndicators: "",
          condition: "",
          generalNotes: "",
        };
      case "Interior":
        return {
          flooring: "",
          walls: globalPropertyData?.propertyData?.interior_structure || "",
          ceilings: "",
          lighting: "",
          outlets: "",
          generalNotes: "",
        };
      case "Foundation":
        return {
          foundationType: "",
          foundationMaterial: "",
          foundationShape: "",
          siteSlope: "",
          basementSqft: globalPropertyData?.propertyData?.propertyData?.attributes?.basement_sqft || "",
          percentFinished: "",
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
      case "Exterior":
        return {
          roofType: "",
          roofTypePercent: "",
          numberOfDormers: "",
          oldHomeWoodSide: false,
          roofMaterial: "",
          roofMaterialPercent: "",
          roofConstructionType: "",
          exteriorWallConstruction: "",
          exteriorWallConstructionPercent: "",
          exteriorWallFinish: "",
          exteriorWallFinishPercent: "",
          slidingDoorsCount: "",
          normalDoorsCount: "",
          trimDetails: "",
          windowsCount: "",
          specialtyWindowsCount: "",
          generalNotes: "",
        };
      default:
        return {
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

  // Load initial data if provided OR auto-populate from global property data
  useEffect(() => {
    if (initialData && Object.keys(initialData).length > 0) {
      setFormData((prev) => ({ ...prev, ...initialData }));
    } else if (isPropertyDataAvailable) {
      // Auto-populate from global property data
      setFormData(getInitialFormData(category));
    }
  }, [initialData, isPropertyDataAvailable, category]);

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
      case "Foundation":
        return [
          {
            id: "foundationType",
            label: "Foundation Type",
            type: "dropdown",
            value: data.foundationType,
            options: ["", "Crawl Space", "Basement", "Slab", "Pier & Beam", "Combination"],
          },
          {
            id: "foundationMaterial",
            label: "Foundation Material",
            type: "dropdown",
            value: data.foundationMaterial,
            options: ["", "Concrete", "Concrete Block", "Stone", "Brick", "Wood", "Other"],
          },
          {
            id: "foundationShape",
            label: "Foundation Shape",
            type: "dropdown",
            value: data.foundationShape,
            options: ["", "Square", "Rectangle", "L-Shape", "H-Shape", "T-Shape", "U-Shape", "Irregular"],
          },
          {
            id: "siteSlope",
            label: "Site Slope",
            type: "dropdown",
            value: data.siteSlope,
            options: ["", "Mild (0-15 degrees)", "Moderate (16-30 degrees)", "Large (31-45 degrees)", "Severe (>45 degrees)"],
          },
          {
            id: "basementSqft",
            label: "Basement Square Footage",
            value: data.basementSqft,
            placeholder: "Total basement square footage",
          },
          {
            id: "percentFinished",
            label: "% Finished of Lowest Level",
            value: data.percentFinished,
            placeholder: "e.g., 50%, 100%, etc.",
          },
          {
            id: "generalNotes",
            label: "General Notes",
            value: data.generalNotes,
            placeholder: "Additional foundation observations and notes...",
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
      case "Exterior":
        return [
          {
            id: "roofType",
            label: "Roof Type",
            type: "dropdown",
            value: data.roofType,
            options: ["", "Gable", "Hip", "Flat", "Mansard", "Metal", "Bonnet", "Gambrel", "Shed", "Other"],
          },
          {
            id: "roofTypePercent",
            label: "Roof Type %",
            value: data.roofTypePercent,
            placeholder: "e.g., 100%, 80%, etc.",
          },
          {
            id: "numberOfDormers",
            label: "Number of Dormers",
            value: data.numberOfDormers,
            placeholder: "e.g., 2, 0, etc.",
          },
          {
            id: "oldHomeWoodSide",
            label: "Old Home Wood Side",
            type: "checkbox",
            value: data.oldHomeWoodSide,
          },
          {
            id: "roofMaterial",
            label: "Roof Material",
            type: "dropdown",
            value: data.roofMaterial,
            options: ["", "Tile", "Shingle", "Metal", "Slate", "Wood", "Membrane", "Composite", "Other"],
          },
          {
            id: "roofMaterialPercent",
            label: "Roof Material %",
            value: data.roofMaterialPercent,
            placeholder: "e.g., 100%, 80%, etc.",
          },
          {
            id: "roofConstructionType",
            label: "Roof Construction Type",
            type: "dropdown",
            value: data.roofConstructionType,
            options: ["", "Wood Framed", "Steel Framed", "Concrete", "Truss", "Rafter", "Other"],
          },
          {
            id: "exteriorWallConstruction",
            label: "Exterior Wall Construction",
            type: "dropdown",
            value: data.exteriorWallConstruction,
            options: ["", "Wood", "Concrete", "Brick", "Block", "Steel", "Stone", "Other"],
          },
          {
            id: "exteriorWallConstructionPercent",
            label: "Exterior Wall Construction %",
            value: data.exteriorWallConstructionPercent,
            placeholder: "e.g., 100%, 80%, etc.",
          },
          {
            id: "exteriorWallFinish",
            label: "Exterior Wall Finish",
            type: "dropdown",
            value: data.exteriorWallFinish,
            options: ["", "Stucco", "Siding", "Shiplap", "Vinyl", "Brick", "Stone", "Fiber Cement", "Wood", "Other"],
          },
          {
            id: "exteriorWallFinishPercent",
            label: "Exterior Wall Finish %",
            value: data.exteriorWallFinishPercent,
            placeholder: "e.g., 100%, 80%, etc.",
          },
          {
            id: "slidingDoorsCount",
            label: "Sliding Doors Count",
            value: data.slidingDoorsCount,
            placeholder: "Number of sliding doors",
          },
          {
            id: "normalDoorsCount",
            label: "Normal Doors Count",
            value: data.normalDoorsCount,
            placeholder: "Number of normal doors",
          },
          {
            id: "trimDetails",
            label: "Trim Details",
            value: data.trimDetails,
            placeholder: "Describe trim condition, material, style, etc.",
          },
          {
            id: "windowsCount",
            label: "Number of Windows",
            value: data.windowsCount,
            placeholder: "Total number of windows",
          },
          {
            id: "specialtyWindowsCount",
            label: "Number of Specialty Windows",
            value: data.specialtyWindowsCount,
            placeholder: "Bay windows, skylights, etc.",
          },
          {
            id: "generalNotes",
            label: "General Notes",
            value: data.generalNotes,
            placeholder: "Additional exterior observations and notes...",
          },
        ];
      default:
        return [
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

  // If this is the Property ID category, use the dedicated PropertyIDForm component
  if (category === "Property ID") {
    return (
      <PropertyIDForm
        onComplete={onComplete}
        onCancel={onCancel}
        onNext={onNext}
        onPrevious={onPrevious}
        isFirstCategory={isFirstCategory}
        isLastCategory={isLastCategory}
        initialData={{
          address: address || formData.propertyAddress || "",
          numberOfStories: formData.numberOfStories || "",
          sqft: formData.squareFootage || "",
          yearBuilt: formData.yearBuilt || "",
          structureType: formData.constructionType || "",
          structureUse: formData.occupancyType || "",
          notes: formData.generalNotes || ""
        }}
      />
    );
  }

  // For all other categories, use the existing form
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

        {/* Form Fields - Dynamically rendered based on category */}
        <View className="mb-6">
          <Text className="text-xl font-semibold mb-4 text-gray-800">
            {category} Inspection Form
          </Text>

          {/* Render form fields based on category */}
          {getFormFields(category, formData).map((field) => (
            <View key={field.id} className="mb-4">
              <Text className="text-base font-medium mb-2 text-gray-700">
                {field.label}
              </Text>
              {field.type === "dropdown" ? (
                <View className="bg-white border border-gray-300 rounded-lg overflow-hidden">
                  <Picker
                    selectedValue={formData[field.id as keyof typeof formData] || ""}
                    onValueChange={(value) => handleInputChange(field.id, value)}
                    style={{ height: 50 }}
                  >
                    {field.options?.map((option) => (
                      <Picker.Item key={option} label={option || "Select..."} value={option} />
                    ))}
                  </Picker>
                </View>
              ) : field.type === "checkbox" ? (
                <TouchableOpacity
                  onPress={() => handleInputChange(field.id, !formData[field.id as keyof typeof formData])}
                  className="flex-row items-center bg-white p-3 border border-gray-300 rounded-lg"
                >
                  <View className={`w-6 h-6 border-2 rounded mr-3 items-center justify-center ${
                    formData[field.id as keyof typeof formData] ? 'bg-blue-500 border-blue-500' : 'border-gray-300'
                  }`}>
                    {formData[field.id as keyof typeof formData] && (
                      <Text className="text-white font-bold">✓</Text>
                    )}
                  </View>
                  <Text className="text-gray-700">
                    {formData[field.id as keyof typeof formData] ? 'Yes' : 'No'}
                  </Text>
                </TouchableOpacity>
              ) : (
                <TextInput
                  className="bg-white p-3 border border-gray-300 rounded-lg min-h-[80px]"
                  value={formData[field.id as keyof typeof formData] || ""}
                  onChangeText={(text) => handleInputChange(field.id, text)}
                  placeholder={field.placeholder}
                  multiline
                  numberOfLines={3}
                />
              )}
            </View>
          ))}
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