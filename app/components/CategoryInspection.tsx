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
  SafeAreaView,
  StatusBar,
  Platform,
  StyleSheet,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { speechService } from "../../lib/speechService";
import { aiFormFillerService } from "../../lib/aiFormFillerService";
import { imageService, LocalImage } from "../../lib/imageService";
import PropertyIDForm from "./PropertyIDForm";
import { useProperty } from "../contexts/PropertyContext";
import { v4 as uuidv4 } from 'uuid';
import 'react-native-get-random-values';
import { useAudioRecorder, useAudioRecorderState, AudioModule } from 'expo-audio';

interface CategoryInspectionProps {
  category: string;
  onComplete: (data: any) => void;
  initialData?: any;
  onCancel?: () => void;
  onNext?: () => void;
  onPrevious?: () => void;
  isFirstCategory?: boolean;
  isLastCategory?: boolean;
  address?: string;
  inspectionId?: string;
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
  address = "",
  inspectionId: inspectionIdProp,
}: CategoryInspectionProps) {
  const { propertyData: globalPropertyData, isPropertyDataAvailable } = useProperty();
  
  // Initialize audio recorder with expo-audio
  const audioRecorder = useAudioRecorder({
    android: {
      extension: '.m4a',
      outputFormat: 'mpeg4',
      audioEncoder: 'aac',
      sampleRate: 44100,
      numberOfChannels: 2,
      bitRate: 128000,
    },
    ios: {
      extension: '.m4a',
      audioQuality: 'max',
      sampleRate: 44100,
      numberOfChannels: 2,
      bitRate: 128000,
      linearPCMBitDepth: 16,
      linearPCMIsBigEndian: false,
      linearPCMIsFloat: false,
    },
    web: {
      mimeType: 'audio/webm',
      bitsPerSecond: 128000,
    },
  });

  // Get the recorder state
  const recorderState = useAudioRecorderState(audioRecorder);
  
  const [isRecording, setIsRecording] = useState(false);
  const [recordingUri, setRecordingUri] = useState<string | null>(null);
  const [inspectionId, setInspectionId] = useState<string>("");
  const [images, setImages] = useState<LocalImage[]>([]);
  const [isCapturing, setIsCapturing] = useState(false);
  const [hasAudioPermission, setHasAudioPermission] = useState(false);

  // Request audio permissions on mount
  useEffect(() => {
    requestAudioPermissions();
  }, []);

  const requestAudioPermissions = async () => {
    try {
      console.log("Requesting audio permissions...");
      const permission = await AudioModule.requestRecordingPermissionsAsync();
      console.log("Permission result:", permission);
      
      if (permission.granted) {
        setHasAudioPermission(true);
        console.log("Audio permission granted");
      } else {
        setHasAudioPermission(false);
        console.log("Audio permission denied");
        Alert.alert(
          "Microphone Permission Required",
          "Please enable microphone access in your device settings to use voice recording.",
          [{ text: "OK" }]
        );
      }
    } catch (error) {
      console.error("Error requesting audio permissions:", error);
      Alert.alert("Error", "Failed to request microphone permissions");
    }
  };

  // Prepare the recorder when component mounts
  useEffect(() => {
    const prepareRecorder = async () => {
      if (!hasAudioPermission) return;
      
      try {
        console.log("Preparing audio recorder...");
        await audioRecorder.prepareToRecordAsync();
        console.log("Audio recorder prepared, canRecord:", recorderState.canRecord);
      } catch (error) {
        console.error("Failed to prepare recorder:", error);
      }
    };
    
    if (hasAudioPermission) {
      prepareRecorder();
    }
  }, [hasAudioPermission]);

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
      case "Attached Structures":
        return {
          garageCarCount: "",
          garageCondition: "",
          garageSqft: "",
          decksSqft: "",
          decksShape: "",
          decksMaterial: "",
          decksCoveredPercent: "",
          decksEnclosedPercent: "",
          decksAverageHeight: "",
          decksNumberOfLevels: "",
          breezewaysSqft: "",
          balconySqft: "",
          balconyMaterial: "",
          balconyCoveredPercent: "",
          balconyEnclosedPercent: "",
          balconyFireplace: "",
          porchSqft: "",
          porchMaterial: "",
          porchCoveredPercent: "",
          porchEnclosedPercent: "",
          porchFireplace: "",
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
          wallsAndCeiling: "",
          floors: "",
          doors: "",
          plumbing: "",
          hotWaterHeaterFuelType: "",
          electricalOutlets: "",
          smokeAndCoDetectors: "",
          fireExtinguishers: "",
          fireplaceType: "",
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
      case "Roof":
        return {
          roofType: "",
          roofTypePercent: "",
          numberOfDormers: "",
          oldHomeWoodSide: false,
          roofMaterial: "",
          roofMaterialPercent: "",
          roofConstructionType: "",
          condition: "",
          guttersAndDownspouts: "",
          ventsFlashingSoffitFascia: "",
          roofLife: "",
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
          exteriorWallConstruction: "",
          exteriorWallConstructionPercent: "",
          exteriorWallFinish: "",
          exteriorWallFinishPercent: "",
          slidingDoorsCount: "",
          normalDoorsCount: "",
          trimDetails: "",
          windowsCount: "",
          specialtyWindowsCount: "",
          drivewayAndWalkwaysCondition: "",
          landscaping: "",
          fencingAndGatesCondition: "",
          landscapeFountain: false,
          generalNotes: "",
        };
      case "Finish Up":
        return {
          inspectionComplete: false,
          inspectorInitials: "",
          surveyDateTime: "",
          estimatedTLA: false,
          roofVisibleEnough: false,
          addressChanged: false,
          addressVerified: false,
          homeVisibleFromRoad: false,
          homeAccessibleYearRound: false,
          homesInArea: "",
          yardsFromPavedRoad: "",
          gatedCommunity: false,
          generalNotes: "",
        };
      case "Systems and Utilities":
        return {
          hvac: "",
          mainServiceAmperage: "",
          electricalPanel: "",
          gfcisPresent: "",
          necConcerns: "",
          plumbing: "",
          mainWaterShutoff: "",
          sewerSepticPresent: "",
          sewerSepticCondition: "",
          insulation: "",
          fireExits: "",
          securitySystems: "",
          stairsAndRailings: "",
          hazardousMaterials: "",
          emergencyNumbers: "",
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
    const propertyApiData = initialData?.propertyApiData?.propertyData?.attributes || 
                           globalPropertyData?.propertyData?.propertyData?.attributes;
    
    if (initialData && Object.keys(initialData).length > 0) {
      setFormData((prev) => ({ ...prev, ...initialData }));
    } else {
      const newFormData = getInitialFormData(category);
      
      // Auto-populate garage sqft for Attached Structures
      if (category === "Attached Structures" && propertyApiData?.garage_sqft) {
        newFormData.garageSqft = propertyApiData.garage_sqft.toString();
      }
      
      setFormData(newFormData);
    }
  }, [initialData, category]);

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
  }, [category, inspectionId]);

  // Generate or retrieve inspection ID
  useEffect(() => {
    // CRITICAL: Only use prop if provided, otherwise generate new UUID
    // This ensures we use the inspection ID from the parent component
    if (inspectionIdProp) {
      setInspectionId(inspectionIdProp);
      console.log('CategoryInspection using inspection ID from prop:', inspectionIdProp);
    } else if (initialData?.inspectionId) {
      setInspectionId(initialData.inspectionId);
      console.log('CategoryInspection using inspection ID from initialData:', initialData.inspectionId);
    } else {
      const newId = uuidv4();
      setInspectionId(newId);
      console.log('CategoryInspection generated new inspection ID:', newId);
    }
  }, [inspectionIdProp, initialData?.inspectionId]);

  const loadImages = async () => {
    if (!inspectionId) return;
    
    try {
      const categoryImages = await imageService.getLocalImages(inspectionId);
      // Filter by category
      const filtered = categoryImages.filter(img => img.category === category);
      setImages(filtered);
    } catch (error) {
      console.error("Failed to load images:", error);
    }
  };

  const handleImageCapture = async () => {
    if (isCapturing || !inspectionId) return;

    try {
      setIsCapturing(true);
      const result = await imageService.captureImage();

      if (result && result.assets && result.assets[0]) {
        const asset = result.assets[0];

        // Prepare metadata - fileName is a string, not an object
        const metadata = {
          fileName: asset.fileName || `${category}_${Date.now()}.jpg`,
          fileSize: asset.fileSize || 0,
          mimeType: asset.mimeType || "image/jpeg",
          exifData: asset.exif || {},
          width: asset.width,
          height: asset.height,
        };

        // Save locally first (will auto-queue for upload)
        const localImage = await imageService.saveImageLocally(
          asset.uri,
          inspectionId,
          category,
          metadata,
        );

        // Add to local state
        setImages((prev) => [localImage, ...prev]);

        Alert.alert(
          "Success", 
          "Image captured! It will be uploaded and categorized automatically when online."
        );
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
    // Check permissions first
    if (!hasAudioPermission) {
      Alert.alert(
        "Microphone Permission Required",
        "Please enable microphone access to use voice recording.",
        [
          { text: "Cancel", style: "cancel" },
          { 
            text: "Request Permission", 
            onPress: requestAudioPermissions 
          }
        ]
      );
      return;
    }

    if (isRecording) {
      try {
        setIsRecording(false);
        setDebugInfo((prev) => ({
          ...prev,
          transcript: "Stopping recording...",
          error: "",
        }));

        console.log("About to stop recording...");
        console.log("Recorder state before stop:", recorderState);
        
        // Stop the recording
        await audioRecorder.stop();
        console.log("Recording stopped");
        
        // Wait a moment for state to update
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Get the URI from the recorder
        const uri = audioRecorder.uri || recordingUri;
        console.log("Final URI:", uri);

        if (!uri) {
          throw new Error("No recording URI returned");
        }

        // Transcribe the audio using speechService
        const transcript = await speechService.transcribeAudio(uri);
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
        console.log("Preparing to record...");
        console.log("Can record?", recorderState.canRecord);
        
        if (!recorderState.canRecord) {
          console.log("Recorder not ready, preparing...");
          await audioRecorder.prepareToRecordAsync();
          // Wait for state to update
          await new Promise(resolve => setTimeout(resolve, 200));
        }
        
        setIsRecording(true);
        setDebugInfo({
          transcript: "Starting recording...",
          aiResponse: "",
          error: "",
          confidence: 0,
        });
        
        console.log("About to start recording...");
        console.log("Recorder state before start:", recorderState);
        
        // Start recording using expo-audio
        await audioRecorder.record();
        
        // Store the URI immediately
        if (audioRecorder.uri) {
          setRecordingUri(audioRecorder.uri);
        }
        
        console.log("Recording started successfully");
        console.log("Recorder state after start:", recorderState);
        console.log("Recording URI:", audioRecorder.uri);
        
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
      case "Attached Structures":
        return [
          {
            id: "garageCarCount",
            label: "Attached Garage - How Many Cars",
            value: data.garageCarCount,
            placeholder: "e.g., 2 cars",
          },
          {
            id: "garageCondition",
            label: "Attached Garage - Condition",
            value: data.garageCondition,
            placeholder: "Describe garage condition",
          },
          {
            id: "garageSqft",
            label: "Attached Garage - Sqft",
            value: data.garageSqft,
            placeholder: "e.g., 400",
            keyboardType: "numeric",
          },
          {
            id: "decksSqft",
            label: "Attached Decks - Sqft",
            value: data.decksSqft,
            placeholder: "e.g., 200",
            keyboardType: "numeric",
          },
          {
            id: "decksShape",
            label: "Attached Decks - Shape",
            type: "dropdown",
            value: data.decksShape,
            options: ["", "Square", "Rectangle", "Triangle", "L-Shaped", "Other"],
          },
          {
            id: "decksMaterial",
            label: "Attached Decks - Material",
            type: "dropdown",
            value: data.decksMaterial,
            options: ["", "Wood", "Stone", "Concrete", "Composite", "Other"],
          },
          {
            id: "decksCoveredPercent",
            label: "Attached Decks - Covered %",
            value: data.decksCoveredPercent,
            placeholder: "e.g., 50%",
          },
          {
            id: "decksEnclosedPercent",
            label: "Attached Decks - Enclosed %",
            value: data.decksEnclosedPercent,
            placeholder: "e.g., 25%",
          },
          {
            id: "decksAverageHeight",
            label: "Attached Decks - Average Height",
            value: data.decksAverageHeight,
            placeholder: "e.g., 10 ft",
          },
          {
            id: "decksNumberOfLevels",
            label: "Attached Decks - Number of Levels",
            value: data.decksNumberOfLevels,
            placeholder: "e.g., 2",
            keyboardType: "numeric",
          },
          {
            id: "breezewaysSqft",
            label: "Breezeways - Sqft",
            value: data.breezewaysSqft,
            placeholder: "e.g., 150",
            keyboardType: "numeric",
          },
          {
            id: "balconySqft",
            label: "Balcony - Sqft",
            value: data.balconySqft,
            placeholder: "e.g., 100",
            keyboardType: "numeric",
          },
          {
            id: "balconyMaterial",
            label: "Balcony - Material",
            type: "dropdown",
            value: data.balconyMaterial,
            options: ["", "Concrete", "Wood", "Metal", "Composite", "Other"],
          },
          {
            id: "balconyCoveredPercent",
            label: "Balcony - Covered %",
            value: data.balconyCoveredPercent,
            placeholder: "e.g., 100%",
          },
          {
            id: "balconyEnclosedPercent",
            label: "Balcony - Enclosed %",
            value: data.balconyEnclosedPercent,
            placeholder: "e.g., 0%",
          },
          {
            id: "balconyFireplace",
            label: "Balcony - Fireplace?",
            type: "dropdown",
            value: data.balconyFireplace,
            options: ["", "Yes", "No"],
          },
          {
            id: "porchSqft",
            label: "Porch - Sqft",
            value: data.porchSqft,
            placeholder: "e.g., 200",
            keyboardType: "numeric",
          },
          {
            id: "porchMaterial",
            label: "Porch - Material",
            type: "dropdown",
            value: data.porchMaterial,
            options: ["", "Concrete", "Wood", "Stone", "Brick", "Other"],
          },
          {
            id: "porchCoveredPercent",
            label: "Porch - Covered %",
            value: data.porchCoveredPercent,
            placeholder: "e.g., 100%",
          },
          {
            id: "porchEnclosedPercent",
            label: "Porch - Enclosed %",
            value: data.porchEnclosedPercent,
            placeholder: "e.g., 0%",
          },
          {
            id: "porchFireplace",
            label: "Porch - Fireplace?",
            type: "dropdown",
            value: data.porchFireplace,
            options: ["", "Yes", "No"],
          },
          {
            id: "generalNotes",
            label: "General Notes",
            value: data.generalNotes,
            placeholder: "Additional notes about attached structures...",
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
            id: "wallsAndCeiling",
            label: "Walls and Ceiling",
            value: data.wallsAndCeiling,
            placeholder: "Stains, cracks or signs of water damage",
          },
          {
            id: "floors",
            label: "Floors",
            value: data.floors,
            placeholder: "Clean, level and free of damage",
          },
          {
            id: "doors",
            label: "Doors",
            value: data.doors,
            placeholder: "Properly sealed and working condition",
          },
          {
            id: "plumbing",
            label: "Plumbing",
            value: data.plumbing,
            placeholder: "Leaks, corrosion or poor drainage",
          },
          {
            id: "hotWaterHeaterFuelType",
            label: "Hot Water Heater - Fuel Type",
            type: "dropdown",
            value: data.hotWaterHeaterFuelType,
            options: ["", "Electric", "Gas", "Oil", "Solar", "Tankless", "Other"],
          },
          {
            id: "electricalOutlets",
            label: "Electrical Outlets",
            value: data.electricalOutlets,
            placeholder: "Exposed wires, signs of burning",
          },
          {
            id: "smokeAndCoDetectors",
            label: "Smoke and CO Detectors",
            value: data.smokeAndCoDetectors,
            placeholder: "Installed and functioning in appropriate areas",
          },
          {
            id: "fireExtinguishers",
            label: "Fire Extinguishers",
            type: "dropdown",
            value: data.fireExtinguishers,
            options: ["", "Yes", "No"],
          },
          {
            id: "fireplaceType",
            label: "Fireplace - Type",
            type: "dropdown",
            value: data.fireplaceType,
            options: ["", "Gas", "Wood", "Pellet", "Electric", "None", "Other"],
          },
          {
            id: "generalNotes",
            label: "General Notes",
            value: data.generalNotes,
            placeholder: "Additional interior observations and notes...",
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
      case "Roof":
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
            id: "condition",
            label: "Condition",
            value: data.condition,
            placeholder: "Overall roof condition, damage, wear, etc.",
          },
          {
            id: "guttersAndDownspouts",
            label: "Gutters and Downspouts",
            value: data.guttersAndDownspouts,
            placeholder: "Condition, material, functionality, drainage, etc.",
          },
          {
            id: "ventsFlashingSoffitFascia",
            label: "Vents, Flashing, Soffit, Fascia Concerns?",
            value: data.ventsFlashingSoffitFascia,
            placeholder: "Any concerns with vents, flashing, soffit, or fascia",
          },
          {
            id: "roofLife",
            label: "Roof Life",
            type: "dropdown",
            value: data.roofLife,
            options: ["", "0-5 years", "6-10 years", "11-15 years", "16-20 years", "21-25 years", "26-30 years", "30+ years"],
          },
          {
            id: "generalNotes",
            label: "General Notes",
            value: data.generalNotes,
            placeholder: "Additional roof observations and notes...",
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
            id: "drivewayAndWalkwaysCondition",
            label: "Driveway and Walkways - Condition",
            value: data.drivewayAndWalkwaysCondition,
            placeholder: "Cracks, holes, tripping hazards, etc.",
          },
          {
            id: "landscaping",
            label: "Landscaping",
            value: data.landscaping,
            placeholder: "Trees/shrubs trimmed away from roof and power lines",
          },
          {
            id: "fencingAndGatesCondition",
            label: "Fencing and Gates - Condition",
            value: data.fencingAndGatesCondition,
            placeholder: "Structurally sound and secure",
          },
          {
            id: "landscapeFountain",
            label: "Landscape Fountain",
            type: "checkbox",
            value: data.landscapeFountain,
          },
          {
            id: "generalNotes",
            label: "General Notes",
            value: data.generalNotes,
            placeholder: "Additional exterior observations and notes...",
          },
        ];
      case "Finish Up":
        return [
          {
            id: "inspectionComplete",
            label: "Was the inspection complete?",
            type: "checkbox",
            value: data.inspectionComplete,
          },
          {
            id: "inspectorInitials",
            label: "Inspector Sign Off (Initials)",
            value: data.inspectorInitials,
            placeholder: "Enter your initials",
          },
          {
            id: "surveyDateTime",
            label: "Survey Date and Time",
            value: data.surveyDateTime,
            placeholder: "Tap button to auto-fill with today's date",
          },
          {
            id: "estimatedTLA",
            label: "Estimated TLA?",
            type: "checkbox",
            value: data.estimatedTLA,
          },
          {
            id: "roofVisibleEnough",
            label: "Was the roof visible enough to assess condition?",
            type: "checkbox",
            value: data.roofVisibleEnough,
          },
          {
            id: "addressChanged",
            label: "Address changed?",
            type: "checkbox",
            value: data.addressChanged,
          },
          {
            id: "addressVerified",
            label: "Address verified?",
            type: "checkbox",
            value: data.addressVerified,
          },
          {
            id: "homeVisibleFromRoad",
            label: "Is the home visible from the road?",
            type: "checkbox",
            value: data.homeVisibleFromRoad,
          },
          {
            id: "homeAccessibleYearRound",
            label: "Is home accessible year round?",
            type: "checkbox",
            value: data.homeAccessibleYearRound,
          },
          {
            id: "homesInArea",
            label: "How many homes are located in the area?",
            value: data.homesInArea,
            placeholder: "e.g., 10, 50, 100+, etc.",
          },
          {
            id: "yardsFromPavedRoad",
            label: "How many yards from paved road?",
            value: data.yardsFromPavedRoad,
            placeholder: "e.g., 50, 100, 500, etc.",
          },
          {
            id: "gatedCommunity",
            label: "Gated community?",
            type: "checkbox",
            value: data.gatedCommunity,
          },
          {
            id: "generalNotes",
            label: "General Notes",
            value: data.generalNotes,
            placeholder: "Additional final inspection notes...",
          },
        ];
      case "Systems and Utilities":
        return [
          {
            id: "hvac",
            label: "HVAC",
            value: data.hvac,
            placeholder: "Serviced, clean filters, no odd noises",
          },
          {
            id: "mainServiceAmperage",
            label: "Electrical Panel - Main Service Amperage",
            value: data.mainServiceAmperage,
            placeholder: "e.g., 100A, 200A, etc.",
          },
          {
            id: "electricalPanel",
            label: "Electrical Panel and Electrical",
            value: data.electricalPanel,
            placeholder: "Labels, outdated system, rust?",
          },
          {
            id: "gfcisPresent",
            label: "GFCIs Present in Bathrooms, Kitchens, or Wet Areas",
            type: "dropdown",
            value: data.gfcisPresent,
            options: ["", "Yes", "No"],
          },
          {
            id: "necConcerns",
            label: "Any Concerns per Current NEC Recommendations?",
            value: data.necConcerns,
            placeholder: "Describe any NEC compliance concerns",
          },
          {
            id: "plumbing",
            label: "Plumbing",
            value: data.plumbing,
            placeholder: "Leak, corrosion, signs of rust?",
          },
          {
            id: "mainWaterShutoff",
            label: "Main Water Shut Off Present?",
            type: "dropdown",
            value: data.mainWaterShutoff,
            options: ["", "Yes", "No"],
          },
          {
            id: "sewerSepticPresent",
            label: "Sewer/Septic - Present",
            type: "dropdown",
            value: data.sewerSepticPresent,
            options: ["", "Yes", "No"],
          },
          {
            id: "sewerSepticCondition",
            label: "Sewer/Septic - Condition",
            value: data.sewerSepticCondition,
            placeholder: "No backups or foul odors",
          },
          {
            id: "insulation",
            label: "Insulation",
            value: data.insulation,
            placeholder: "Adequate insulation in attic/basement (if accessible)",
          },
          {
            id: "fireExits",
            label: "Fire Exits",
            type: "dropdown",
            value: data.fireExits,
            options: ["", "Yes", "No"],
          },
          {
            id: "securitySystems",
            label: "Security Systems",
            value: data.securitySystems,
            placeholder: "Functioning alarms, locks, and cameras",
          },
          {
            id: "stairsAndRailings",
            label: "Stairs and Railings",
            value: data.stairsAndRailings,
            placeholder: "Sturdy, not loose or damaged",
          },
          {
            id: "hazardousMaterials",
            label: "Hazardous Materials",
            value: data.hazardousMaterials,
            placeholder: "No exposed asbestos, lead paint, or chemicals",
          },
          {
            id: "emergencyNumbers",
            label: "Emergency Numbers",
            value: data.emergencyNumbers,
            placeholder: "Clearly posted or stored in accessible areas",
          },
          {
            id: "generalNotes",
            label: "General Notes",
            value: data.generalNotes,
            placeholder: "Additional systems and utilities observations...",
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

    console.log("=== CategoryInspection handleComplete ===");
    console.log("Category:", category);
    console.log("Form data:", JSON.stringify(formData, null, 2));
    console.log("Category data being sent:", JSON.stringify(categoryData, null, 2));
    onComplete(categoryData);
  };

  const handleNext = () => {
    // Save data before navigating to next category
    console.log("=== CategoryInspection handleNext ===");
    console.log("Saving form data before next:", JSON.stringify(formData, null, 2));
    
    // Save the data first
    onComplete({
      category,
      ...formData,
      completed: false, // Not fully completed, just moving to next
      timestamp: new Date().toISOString(),
    });
    
    // Then navigate to next category
    if (onNext) {
      onNext();
    }
  };

  const handlePrevious = () => {
    // Just navigate without saving
    if (onPrevious) {
      onPrevious();
    }
  };

  const handleBackToCategories = () => {
    // Save current data before going back
    handleComplete();
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
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#111827" />
      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>
              {category} Inspection
            </Text>
            <Text style={styles.headerSubtitle}>
              Use voice recording or manual input to fill the form
            </Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              onPress={handleVoiceRecording}
              disabled={isCapturing}
              style={[
                styles.actionButton,
                isRecording ? styles.recordingButton : isCapturing ? styles.disabledButton : styles.normalButton
              ]}
            >
              <Text style={styles.actionButtonIcon}>
                {isRecording ? "⏹️" : "🎤"}
              </Text>
              <Text style={styles.actionButtonText}>
                {isRecording ? "Stop" : "Record"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleImageCapture}
              disabled={isRecording || isCapturing}
              style={[
                styles.actionButton,
                (isCapturing || isRecording) ? styles.disabledButton : styles.normalButton
              ]}
            >
              <Text style={styles.actionButtonIcon}>
                {isCapturing ? "⏳" : "📷"}
              </Text>
              <Text style={styles.actionButtonText}>
                {isCapturing ? "Capturing..." : "Capture"}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Images Section */}
          {images.length > 0 && (
            <View style={styles.imagesSection}>
              <Text style={styles.sectionTitle}>
                Captured Images ({images.length})
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.imagesRow}>
                  {images.map((image) => (
                    <View key={image.id} style={styles.imageContainer}>
                      <TouchableOpacity
                        onPress={() => {
                          if (image.aiDetectedObjects && image.aiDetectedObjects.length > 0) {
                            const objectsList = image.aiDetectedObjects
                              .map(obj => `• ${obj.name}${obj.material ? ` (${obj.material})` : ''}${obj.condition ? ` - ${obj.condition}` : ''}`)
                              .join('\n');
                            
                            Alert.alert(
                              'AI Detection Results',
                              `${image.aiDescription || 'No description'}\n\nDetected Objects:\n${objectsList}`,
                              [{ text: 'OK' }]
                            );
                          }
                        }}
                      >
                        <Image
                          source={{ uri: image.supabaseUrl || image.localUri }}
                          style={styles.image}
                          resizeMode="cover"
                        />
                      </TouchableOpacity>
                      
                      {/* Upload Status Badge */}
                      <View style={[
                        styles.badge,
                        styles.uploadBadge,
                        image.uploadStatus === 'uploaded' ? styles.uploadedBadge :
                        image.uploadStatus === 'uploading' ? styles.uploadingBadge :
                        image.uploadStatus === 'failed' ? styles.failedBadge :
                        styles.pendingBadge
                      ]}>
                        <Text style={styles.badgeText}>
                          {image.uploadStatus === 'uploaded' ? '✓' :
                           image.uploadStatus === 'uploading' ? '↑' :
                           image.uploadStatus === 'failed' ? '✗' :
                           '⏳'}
                        </Text>
                      </View>

                      {/* AI Category Badge */}
                      {image.aiCategory && image.aiCategory !== 'Unknown' && (
                        <View style={[styles.badge, styles.categoryBadge]}>
                          <Text style={styles.badgeText}>
                            {image.aiCategory}
                          </Text>
                        </View>
                      )}

                      {/* AI Objects Count Badge */}
                      {image.aiDetectedObjects && image.aiDetectedObjects.length > 0 && (
                        <TouchableOpacity
                          onPress={() => {
                            const objectsList = image.aiDetectedObjects
                              .map(obj => `• ${obj.name}${obj.material ? ` (${obj.material})` : ''}${obj.condition ? ` - ${obj.condition}` : ''}`)
                              .join('\n');
                            
                            Alert.alert(
                              'AI Detection Results',
                              `${image.aiDescription || 'No description'}\n\nDetected Objects:\n${objectsList}`,
                              [{ text: 'OK' }]
                            );
                          }}
                          style={styles.objectsBadge}
                        >
                          <Text style={styles.objectsBadgeText}>
                            🔍 {image.aiDetectedObjects.length}
                          </Text>
                        </TouchableOpacity>
                      )}

                      <TouchableOpacity
                        onPress={() => handleDeleteImage(image.id)}
                        style={styles.deleteImageButton}
                      >
                        <Text style={styles.deleteImageButtonText}>×</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              </ScrollView>

              {/* AI Detected Objects Summary */}
              {images.some(img => img.aiDetectedObjects && img.aiDetectedObjects.length > 0) && (
                <View style={styles.aiSummary}>
                  <Text style={styles.aiSummaryTitle}>
                    🔍 AI Detected Objects:
                  </Text>
                  {images
                    .filter(img => img.aiDetectedObjects && img.aiDetectedObjects.length > 0)
                    .map((image, idx) => (
                      <View key={idx} style={styles.aiSummaryItem}>
                        <Text style={styles.aiSummaryImageLabel}>Image {idx + 1}:</Text>
                        {image.aiDetectedObjects?.slice(0, 3).map((obj, objIdx) => (
                          <Text key={objIdx} style={styles.aiSummaryObject}>
                            • {obj.name}
                            {obj.material && ` (${obj.material})`}
                            {obj.condition && ` - ${obj.condition}`}
                          </Text>
                        ))}
                        {image.aiDetectedObjects && image.aiDetectedObjects.length > 3 && (
                          <Text style={styles.aiSummaryMore}>
                            + {image.aiDetectedObjects.length - 3} more (tap image for details)
                          </Text>
                        )}
                      </View>
                    ))}
                </View>
              )}
            </View>
          )}

          {/* Debug Info */}
          {debugInfo.transcript && (
            <View style={styles.debugInfo}>
              <Text style={styles.debugTitle}>Transcript:</Text>
              <Text style={styles.debugText}>{debugInfo.transcript}</Text>
              {debugInfo.confidence > 0 && (
                <Text style={styles.debugConfidence}>
                  Confidence: {Math.round(debugInfo.confidence * 100)}%
                </Text>
              )}
            </View>
          )}

          {debugInfo.error && (
            <View style={styles.errorInfo}>
              <Text style={styles.errorTitle}>Error:</Text>
              <Text style={styles.errorText}>{debugInfo.error}</Text>
            </View>
          )}

          {/* Form Fields */}
          <View style={styles.formSection}>
            <Text style={styles.formTitle}>
              {category} Inspection Form
            </Text>

            {getFormFields(category, formData).map((field) => (
              <View key={field.id} style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>{field.label}</Text>
                {field.type === "dropdown" ? (
                  <View style={styles.pickerContainer}>
                    <Picker
                      selectedValue={formData[field.id as keyof typeof formData] || ""}
                      onValueChange={(value) => handleInputChange(field.id, value)}
                      style={styles.picker}
                      dropdownIconColor="#9ca3af"
                    >
                      {field.options?.map((option) => (
                        <Picker.Item 
                          key={option} 
                          label={option || "Select..."} 
                          value={option} 
                          color="#f3f4f6"
                        />
                      ))}
                    </Picker>
                  </View>
                ) : field.type === "checkbox" ? (
                  <TouchableOpacity
                    onPress={() => {
                      const currentValue = formData[field.id as keyof typeof formData];
                      const newValue = !currentValue;
                      handleInputChange(field.id, newValue);
                    }}
                    style={styles.checkboxContainer}
                  >
                    <View style={[
                      styles.checkbox,
                      formData[field.id as keyof typeof formData] && styles.checkboxChecked
                    ]}>
                      {formData[field.id as keyof typeof formData] && (
                        <Text style={styles.checkboxCheck}>✓</Text>
                      )}
                    </View>
                    <Text style={styles.checkboxLabel}>
                      {formData[field.id as keyof typeof formData] ? 'Yes' : 'No'}
                    </Text>
                  </TouchableOpacity>
                ) : field.id === "surveyDateTime" ? (
                  <View style={styles.dateTimeRow}>
                    <TextInput
                      style={[styles.input, styles.dateTimeInput]}
                      value={formData[field.id as keyof typeof formData] || ""}
                      onChangeText={(text) => handleInputChange(field.id, text)}
                      placeholder={field.placeholder}
                      placeholderTextColor="#9ca3af"
                    />
                    <TouchableOpacity
                      onPress={() => {
                        const now = new Date();
                        const dateTimeString = now.toLocaleString('en-US', {
                          month: '2-digit',
                          day: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: true
                        });
                        handleInputChange(field.id, dateTimeString);
                      }}
                      style={styles.nowButton}
                    >
                      <Text style={styles.nowButtonText}>Now</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TextInput
                    style={styles.input}
                    value={String(formData[field.id as keyof typeof formData] || "")}
                    onChangeText={(text) => handleInputChange(field.id, text)}
                    placeholder={field.placeholder}
                    placeholderTextColor="#9ca3af"
                    multiline
                    numberOfLines={3}
                    keyboardType={field.keyboardType || "default"}
                  />
                )}
              </View>
            ))}
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
              onPress={handleBackToCategories}
              style={styles.completeButton}
            >
              <Text style={styles.completeButtonText}>Complete</Text>
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
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#111827',
  },
  content: {
    padding: 16,
  },
  header: {
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#f3f4f6',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#d1d5db',
  },
  actionButtons: {
    flexDirection: 'row',
    marginBottom: 24,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  normalButton: {
    backgroundColor: '#374151',
    borderColor: '#4b5563',
  },
  recordingButton: {
    backgroundColor: '#dc2626',
    borderColor: '#ef4444',
  },
  disabledButton: {
    backgroundColor: '#4b5563',
    borderColor: '#6b7280',
  },
  actionButtonIcon: {
    color: '#ffffff',
    fontWeight: '600',
    marginRight: 8,
  },
  actionButtonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  imagesSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: '#f3f4f6',
  },
  imagesRow: {
    flexDirection: 'row',
    gap: 12,
  },
  imageContainer: {
    position: 'relative',
  },
  image: {
    width: 160,
    height: 160,
    borderRadius: 8,
  },
  badge: {
    position: 'absolute',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  uploadBadge: {
    top: 8,
    left: 8,
  },
  uploadedBadge: {
    backgroundColor: '#16a34a',
  },
  uploadingBadge: {
    backgroundColor: '#2563eb',
  },
  failedBadge: {
    backgroundColor: '#dc2626',
  },
  pendingBadge: {
    backgroundColor: '#ca8a04',
  },
  categoryBadge: {
    bottom: 8,
    left: 8,
    backgroundColor: '#7c3aed',
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  objectsBadge: {
    position: 'absolute',
    top: 8,
    right: 56,
    backgroundColor: '#2563eb',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  objectsBadgeText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  deleteImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#ef4444',
    borderRadius: 8,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteImageButtonText: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  aiSummary: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#1f2937',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4b5563',
  },
  aiSummaryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#e5e7eb',
    marginBottom: 8,
  },
  aiSummaryItem: {
    marginBottom: 8,
  },
  aiSummaryImageLabel: {
    fontSize: 12,
    color: '#9ca3af',
    marginBottom: 4,
  },
  aiSummaryObject: {
    fontSize: 12,
    color: '#d1d5db',
    marginLeft: 8,
  },
  aiSummaryMore: {
    fontSize: 12,
    color: '#9ca3af',
    marginLeft: 8,
  },
  debugInfo: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#1f2937',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4b5563',
  },
  debugTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#e5e7eb',
    marginBottom: 4,
  },
  debugText: {
    fontSize: 14,
    color: '#d1d5db',
  },
  debugConfidence: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 4,
  },
  errorInfo: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#7f1d1d',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#991b1b',
  },
  errorTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#fecaca',
    marginBottom: 4,
  },
  errorText: {
    fontSize: 14,
    color: '#fca5a5',
  },
  formSection: {
    marginBottom: 24,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
    color: '#f3f4f6',
  },
  fieldContainer: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
    color: '#e5e7eb',
  },
  input: {
    backgroundColor: '#1f2937',
    padding: 12,
    borderWidth: 1,
    borderColor: '#4b5563',
    borderRadius: 8,
    minHeight: 80,
    color: '#f3f4f6',
    textAlignVertical: 'top',
  },
  pickerContainer: {
    backgroundColor: '#374151',
    borderWidth: 1,
    borderColor: '#4b5563',
    borderRadius: 8,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
    color: '#f3f4f6',
    backgroundColor: '#374151',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1f2937',
    padding: 12,
    borderWidth: 1,
    borderColor: '#4b5563',
    borderRadius: 8,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#6b7280',
    borderRadius: 4,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#4b5563',
    borderColor: '#6b7280',
  },
  checkboxCheck: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  checkboxLabel: {
    color: '#e5e7eb',
  },
  dateTimeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  dateTimeInput: {
    flex: 1,
  },
  nowButton: {
    backgroundColor: '#374151',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4b5563',
    justifyContent: 'center',
  },
  nowButtonText: {
    color: '#f3f4f6',
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
  navButtonText: {
    textAlign: 'center',
    fontWeight: '600',
    color: '#f3f4f6',
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
  completeButtonText: {
    color: '#f3f4f6',
    textAlign: 'center',
    fontWeight: '600',
  },
});