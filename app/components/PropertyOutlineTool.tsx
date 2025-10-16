import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  ScrollView,
  TextInput,
  Alert,
  Dimensions,
  Modal,
  Pressable,
  StyleSheet,
  Platform,
  StatusBar,
  SafeAreaView,
} from "react-native";
import Svg, { Path, Circle } from "react-native-svg";
import {
  Trash2,
  Save,
  Plus,
  Download,
  Home,
  Square,
  Layers,
  ZoomIn,
  ZoomOut,
  RefreshCw,
  Check,
  Edit2,
  Eye,
  EyeOff,
} from "lucide-react-native";
import { supabase } from "../../lib/supabase";

interface Point {
  x: number;
  y: number;
}

interface Structure {
  id: string;
  type: 'foundation' | 'garage' | 'deck' | 'patio' | 'porch';
  points: Point[];
  color: string;
  label: string;
  visible: boolean;
}

interface PropertyOutlineToolProps {
  address?: string;
  latitude?: number;
  longitude?: number;
  propertyId?: string;
  onSave?: (structures: Structure[], exportImage: string) => void;
  onCancel?: () => void;
}

const STRUCTURE_TYPES = [
  { type: 'foundation' as const, label: 'Foundation', color: '#ef4444', icon: Home },
  { type: 'garage' as const, label: 'Garage', color: '#3b82f6', icon: Square },
  { type: 'deck' as const, label: 'Deck', color: '#10b981', icon: Layers },
  { type: 'patio' as const, label: 'Patio', color: '#f59e0b', icon: Layers },
  { type: 'porch' as const, label: 'Porch', color: '#8b5cf6', icon: Layers },
];

const DEFAULT_ADDRESS = "123 Main St, Anytown, USA";
const CLOSE_THRESHOLD = 20; // pixels - distance to first point to auto-close
const SNAP_ANGLE_THRESHOLD = 8; // degrees - snap to 90° if within this threshold
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const MAP_WIDTH = Math.min(800, SCREEN_WIDTH - 32); // Responsive width with padding
const MAP_HEIGHT = 400; // Further reduced height to show measurements checkbox
const DEFAULT_ZOOM = 20; // High zoom for detailed satellite view

const PropertyOutlineTool = ({
  address = DEFAULT_ADDRESS,
  latitude,
  longitude,
  propertyId,
  onSave = () => {},
  onCancel = () => {},
}: PropertyOutlineToolProps) => {
  const [structures, setStructures] = useState<Structure[]>([]);
  const [activeStructure, setActiveStructure] = useState<Structure | null>(null);
  const [selectedType, setSelectedType] = useState<typeof STRUCTURE_TYPES[0]>(STRUCTURE_TYPES[0]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [satelliteImageUrl, setSatelliteImageUrl] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [scale, setScale] = useState(1); // pixels per foot
  const [zoomLevel, setZoomLevel] = useState(DEFAULT_ZOOM);
  const [currentLat, setCurrentLat] = useState<number | null>(latitude || null);
  const [currentLng, setCurrentLng] = useState<number | null>(longitude || null);
  const [addressInput, setAddressInput] = useState(address);
  const [showMeasurements, setShowMeasurements] = useState(true);
  const [editingStructureId, setEditingStructureId] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState("");
  const [showNameModal, setShowNameModal] = useState(false);
  const [pendingStructureName, setPendingStructureName] = useState("");
  const [previewPoint, setPreviewPoint] = useState<Point | null>(null);
  const imageRef = useRef<View>(null);
  const mapContainerRef = useRef<View>(null);
  const [mapLayout, setMapLayout] = useState({ x: 0, y: 0 });
  const isAddingPointRef = useRef(false); // Prevent duplicate point additions

  const googleMapsApiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '';

  useEffect(() => {
    // Load saved outlines if propertyId is provided
    if (propertyId) {
      loadSavedOutlines(propertyId);
    }

    // If we have coordinates, use them
    if (latitude && longitude) {
      setCurrentLat(latitude);
      setCurrentLng(longitude);
      loadSatelliteImage(latitude, longitude, zoomLevel);
    } 
    // Otherwise, try to geocode the address
    else if (address && address !== DEFAULT_ADDRESS) {
      geocodeAddress(address);
    } else {
      setIsLoading(false);
      Alert.alert(
        "No Location Data", 
        "Please provide an address or coordinates to load the satellite view."
      );
    }
  }, [propertyId]);

  const loadSavedOutlines = async (propId: string) => {
    try {
      const { data, error } = await supabase
        .from('property_outlines')
        .select('*')
        .eq('property_id', propId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Error loading outlines:', error);
        return;
      }

      if (data) {
        setStructures(data.structures || []);
        if (data.latitude && data.longitude) {
          setCurrentLat(data.latitude);
          setCurrentLng(data.longitude);
        }
        if (data.zoom_level) {
          setZoomLevel(data.zoom_level);
        }
      }
    } catch (error) {
      console.error('Error loading saved outlines:', error);
    }
  };

  const geocodeAddress = async (addr: string) => {
    if (!googleMapsApiKey) {
      Alert.alert("Error", "Google Maps API key not configured");
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(addr)}&key=${googleMapsApiKey}`
      );
      const data = await response.json();

      if (data.results && data.results.length > 0) {
        const location = data.results[0].geometry.location;
        setCurrentLat(location.lat);
        setCurrentLng(location.lng);
        loadSatelliteImage(location.lat, location.lng, zoomLevel);
      } else {
        Alert.alert("Error", "Could not find location for this address");
        setIsLoading(false);
      }
    } catch (error) {
      console.error("Geocoding error:", error);
      Alert.alert("Error", "Failed to geocode address");
      setIsLoading(false);
    }
  };

  const loadSatelliteImage = (lat: number, lng: number, zoom: number) => {
    if (!googleMapsApiKey) {
      console.error("Google Maps API key not found!");
      Alert.alert("Error", "Google Maps API key not configured");
      setIsLoading(false);
      return;
    }

    console.log("Loading satellite image with API key:", googleMapsApiKey.substring(0, 10) + "...");
    
    // Round dimensions to integers for Google Maps Static API
    const width = Math.round(MAP_WIDTH);
    const height = Math.round(MAP_HEIGHT);
    
    // Google Maps Static API with satellite imagery
    const imageUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=${zoom}&size=${width}x${height}&maptype=satellite&key=${googleMapsApiKey}`;
    
    console.log("Satellite image URL:", imageUrl.replace(googleMapsApiKey, "API_KEY_HIDDEN"));
    
    setSatelliteImageUrl(imageUrl);
    
    // Calculate scale based on zoom level
    // At zoom 20: ~1 pixel = 0.3 feet
    // At zoom 19: ~1 pixel = 0.6 feet
    // At zoom 18: ~1 pixel = 1.2 feet
    const pixelsPerFoot = Math.pow(2, zoom - 18) * 0.83;
    setScale(pixelsPerFoot);
    
    setIsLoading(false);
  };

  const handleZoomIn = () => {
    if (zoomLevel < 21 && currentLat && currentLng) {
      const newZoom = zoomLevel + 1;
      setZoomLevel(newZoom);
      setIsLoading(true);
      loadSatelliteImage(currentLat, currentLng, newZoom);
    }
  };

  const handleZoomOut = () => {
    if (zoomLevel > 15 && currentLat && currentLng) {
      const newZoom = zoomLevel - 1;
      setZoomLevel(newZoom);
      setIsLoading(true);
      loadSatelliteImage(currentLat, currentLng, newZoom);
    }
  };

  const handleRefreshLocation = () => {
    if (addressInput) {
      setIsLoading(true);
      geocodeAddress(addressInput);
    }
  };

  const getNextStructureName = (type: string, label: string): string => {
    const sameTypeStructures = structures.filter(s => s.type === type);
    if (sameTypeStructures.length === 0) {
      return label;
    }
    return `${label} ${sameTypeStructures.length + 1}`;
  };

  const startDrawing = () => {
    const nextName = getNextStructureName(selectedType.type, selectedType.label);
    setPendingStructureName(nextName);
    setShowNameModal(true);
  };

  const confirmStartDrawing = () => {
    const newStructure: Structure = {
      id: `structure_${Date.now()}`,
      type: selectedType.type,
      points: [],
      color: selectedType.color,
      label: pendingStructureName || selectedType.label,
      visible: true,
    };
    setActiveStructure(newStructure);
    setIsDrawing(true);
    setShowNameModal(false);
  };

  const snapToRightAngle = (newPoint: Point, previousPoint: Point): Point => {
    const dx = newPoint.x - previousPoint.x;
    const dy = newPoint.y - previousPoint.y;
    
    // Calculate angle in degrees
    const angleRad = Math.atan2(dy, dx);
    const angleDeg = angleRad * 180 / Math.PI;
    
    // Normalize angle to 0-360
    const normalizedAngle = ((angleDeg % 360) + 360) % 360;
    
    // Check if close to horizontal (0° or 180°)
    if (Math.abs(normalizedAngle) <= SNAP_ANGLE_THRESHOLD || 
        Math.abs(normalizedAngle - 180) <= SNAP_ANGLE_THRESHOLD ||
        Math.abs(normalizedAngle - 360) <= SNAP_ANGLE_THRESHOLD) {
      // Snap to horizontal
      return { x: newPoint.x, y: previousPoint.y };
    }
    
    // Check if close to vertical (90° or 270°)
    if (Math.abs(normalizedAngle - 90) <= SNAP_ANGLE_THRESHOLD || 
        Math.abs(normalizedAngle - 270) <= SNAP_ANGLE_THRESHOLD) {
      // Snap to vertical
      return { x: previousPoint.x, y: newPoint.y };
    }
    
    // No snap needed
    return newPoint;
  };

  const addPoint = (x: number, y: number) => {
    if (!activeStructure) {
      console.log('addPoint called but no activeStructure');
      return;
    }

    console.log('addPoint called with:', { x, y, currentPoints: activeStructure.points.length });

    let newPoint = { x, y };
    
    // Apply snap-to-90° if there's a previous point
    if (activeStructure.points.length > 0) {
      const previousPoint = activeStructure.points[activeStructure.points.length - 1];
      newPoint = snapToRightAngle(newPoint, previousPoint);
      console.log('Snapped point:', newPoint);
    }

    const updatedStructure = {
      ...activeStructure,
      points: [...activeStructure.points, newPoint],
    };
    
    console.log('Updated structure points:', updatedStructure.points);
    setActiveStructure(updatedStructure);
  };

  const completeStructure = () => {
    if (!activeStructure || activeStructure.points.length < 3) {
      Alert.alert("Error", "Please add at least 3 points to complete the outline");
      return;
    }

    console.log('Completing structure with points:', activeStructure.points);
    
    setStructures([...structures, activeStructure]);
    setActiveStructure(null);
    setIsDrawing(false);
    setPreviewPoint(null); // Clear preview point
  };

  const cancelDrawing = () => {
    setActiveStructure(null);
    setIsDrawing(false);
    setPreviewPoint(null); // Clear preview point
  };

  const deleteStructure = (id: string) => {
    setStructures(structures.filter(s => s.id !== id));
  };

  const toggleStructureVisibility = (id: string) => {
    setStructures(structures.map(s => 
      s.id === id ? { ...s, visible: !s.visible } : s
    ));
  };

  const startEditingLabel = (structure: Structure) => {
    setEditingStructureId(structure.id);
    setEditingLabel(structure.label);
  };

  const saveLabel = (id: string) => {
    if (editingLabel.trim()) {
      setStructures(structures.map(s => 
        s.id === id ? { ...s, label: editingLabel.trim() } : s
      ));
    }
    setEditingStructureId(null);
    setEditingLabel("");
  };

  const cancelEditingLabel = () => {
    setEditingStructureId(null);
    setEditingLabel("");
  };

  const calculateDistance = (p1: Point, p2: Point): number => {
    const pixelDistance = Math.sqrt(
      Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2)
    );
    return pixelDistance / scale; // Convert to feet
  };

  const calculatePerimeter = (points: Point[]): number => {
    let perimeter = 0;
    for (let i = 0; i < points.length; i++) {
      const nextIndex = (i + 1) % points.length;
      perimeter += calculateDistance(points[i], points[nextIndex]);
    }
    return perimeter;
  };

  const calculateArea = (points: Point[]): number => {
    if (points.length < 3) return 0;
    
    // Shoelace formula for polygon area
    let area = 0;
    for (let i = 0; i < points.length; i++) {
      const j = (i + 1) % points.length;
      area += points[i].x * points[j].y;
      area -= points[j].x * points[i].y;
    }
    area = Math.abs(area) / 2;
    
    // Convert from square pixels to square feet
    return area / (scale * scale);
  };

  const getMidpoint = (p1: Point, p2: Point) => ({
    x: (p1.x + p2.x) / 2,
    y: (p1.y + p2.y) / 2,
  });

  const exportImage = async () => {
    // In a real implementation, this would use a canvas library to draw
    // the satellite image with overlays and export as base64
    // For now, we'll return a placeholder
    const exportData = {
      satelliteImageUrl,
      structures: structures.map(s => ({
        ...s,
        measurements: {
          area: calculateArea(s.points).toFixed(2),
          perimeter: calculatePerimeter(s.points).toFixed(2),
        }
      })),
    };
    
    return JSON.stringify(exportData);
  };

  const handleSave = async () => {
    console.log('handleSave called');
    console.log('propertyId:', propertyId);
    console.log('structures:', structures);
    
    if (!propertyId) {
      console.log('No propertyId provided');
      Alert.alert("Error", "No property ID provided. Cannot save outlines.");
      return;
    }

    if (structures.length === 0) {
      console.log('No structures to save');
      Alert.alert("Error", "No structures to save.");
      return;
    }

    console.log('Starting save process...');
    
    try {
      // Check if outlines already exist for this property
      console.log('Checking for existing outlines...');
      const { data: existing, error: checkError } = await supabase
        .from('property_outlines')
        .select('id')
        .eq('property_id', propertyId)
        .maybeSingle();

      console.log('Existing check result:', { existing, checkError });

      const outlineData = {
        property_id: propertyId,
        structures: structures,
        satellite_image_url: satelliteImageUrl,
        latitude: currentLat,
        longitude: currentLng,
        zoom_level: zoomLevel,
        updated_at: new Date().toISOString(),
      };

      console.log('Outline data to save:', outlineData);

      let result;
      if (existing) {
        // Update existing outlines
        console.log('Updating existing outlines...');
        result = await supabase
          .from('property_outlines')
          .update(outlineData)
          .eq('property_id', propertyId);
      } else {
        // Insert new outlines
        console.log('Inserting new outlines...');
        result = await supabase
          .from('property_outlines')
          .insert(outlineData);
      }

      console.log('Save result:', result);

      if (result.error) {
        console.error('Error saving outlines:', result.error);
        Alert.alert("Error", `Failed to save outlines: ${result.error.message}`);
        return;
      }

      console.log('Save successful!');
      Alert.alert("Success", "Property outlines saved successfully!");
      
      // Call the onSave callback if provided
      const exportedImage = await exportImage();
      onSave(structures, exportedImage);
    } catch (error) {
      console.error('Error saving outlines:', error);
      Alert.alert("Error", `Failed to save outlines: ${error}`);
    }
  };

  const isNearFirstPoint = (x: number, y: number): boolean => {
    if (!activeStructure || activeStructure.points.length < 3) return false;
    
    const firstPoint = activeStructure.points[0];
    const distance = Math.sqrt(
      Math.pow(x - firstPoint.x, 2) + Math.pow(y - firstPoint.y, 2)
    );
    
    const isNear = distance <= CLOSE_THRESHOLD;
    
    console.log('Checking distance to first point:', {
      touchPoint: { x, y },
      firstPoint,
      distance,
      threshold: CLOSE_THRESHOLD,
      isNear,
      currentPointsCount: activeStructure.points.length
    });
    
    return isNear;
  };

  const handleMapLayout = (event: any) => {
    const { x, y } = event.nativeEvent.layout;
    setMapLayout({ x, y });
    console.log('Map layout:', { x, y });
  };

  const renderMap = () => {
    if (!address) return null;

    const mapUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${encodeURIComponent(
      address
    )}&zoom=${DEFAULT_ZOOM}&size=${MAP_WIDTH}x${MAP_HEIGHT}&maptype=satellite&key=${googleMapsApiKey}`;

    return (
      <View style={{ marginBottom: 16 }}>
        <View
          ref={mapContainerRef}
          style={{
            width: MAP_WIDTH,
            height: MAP_HEIGHT,
            position: 'relative',
            backgroundColor: '#e0e0e0',
          }}
        >
          <Image
            source={{ uri: mapUrl }}
            style={{ width: MAP_WIDTH, height: MAP_HEIGHT }}
            resizeMode="cover"
          />
          
          {/* Drawing overlay using Pressable instead of responder system */}
          <Pressable
            onPress={(event) => {
              if (!isDrawing || !activeStructure) return;
              
              // Prevent multiple rapid touches
              if (isAddingPointRef.current) {
                console.log('Ignoring touch - already processing a point');
                return;
              }
              
              isAddingPointRef.current = true;
              
              const { locationX, locationY } = event.nativeEvent;
              
              console.log('Pressable touch:', { locationX, locationY });
              
              // Validate coordinates
              if (locationX == null || locationY == null || 
                  typeof locationX !== 'number' || typeof locationY !== 'number' || 
                  isNaN(locationX) || isNaN(locationY) ||
                  locationX < 0 || locationX > MAP_WIDTH || 
                  locationY < 0 || locationY > MAP_HEIGHT) {
                console.log('Invalid touch, ignoring');
                isAddingPointRef.current = false;
                return;
              }
              
              console.log('Valid touch at:', locationX, locationY);
              
              // Check if closing polygon
              if (isNearFirstPoint(locationX, locationY)) {
                console.log('Closing polygon');
                completeStructure();
                isAddingPointRef.current = false;
                return;
              }
              
              // Add point
              addPoint(locationX, locationY);
              
              setTimeout(() => {
                isAddingPointRef.current = false;
              }, 150);
            }}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: MAP_WIDTH,
              height: MAP_HEIGHT,
            }}
          >
            <Svg width={MAP_WIDTH} height={MAP_HEIGHT} style={{ position: 'absolute' }}>
              {/* Draw completed structures */}
              {structures.filter(s => s.visible).map((structure) => (
                <View key={structure.id}>
                  {/* Draw lines between points */}
                  {structure.points.map((point, index) => {
                    const nextPoint = structure.points[(index + 1) % structure.points.length];
                    const angle = Math.atan2(nextPoint.y - point.y, nextPoint.x - point.x) * 180 / Math.PI;
                    const length = Math.sqrt(
                      Math.pow(nextPoint.x - point.x, 2) + Math.pow(nextPoint.y - point.y, 2)
                    );
                    const distance = calculateDistance(point, nextPoint);
                    const midpoint = getMidpoint(point, nextPoint);
                    
                    return (
                      <View key={`line-${index}`}>
                        <Path
                          d={`M${point.x},${point.y} L${nextPoint.x},${nextPoint.y}`}
                          stroke={structure.color}
                          strokeWidth={3}
                          fill="none"
                          strokeLinecap="round"
                        />
                        {showMeasurements && (
                          <View
                            style={{
                              position: 'absolute',
                              left: midpoint.x - 25,
                              top: midpoint.y - 12,
                              backgroundColor: 'rgba(255, 255, 255, 0.95)',
                              paddingHorizontal: 6,
                              paddingVertical: 2,
                              borderRadius: 4,
                              borderWidth: 1,
                              borderColor: structure.color,
                            }}
                          >
                            <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#000' }}>
                              {distance.toFixed(1)}'
                            </Text>
                          </View>
                        )}
                      </View>
                    );
                  })}
                  
                  {/* Draw points */}
                  {structure.points.map((point, index) => (
                    <Circle
                      key={`point-${index}`}
                      cx={point.x}
                      cy={point.y}
                      r={6}
                      fill={structure.color}
                      stroke="#fff"
                      strokeWidth={2}
                    />
                  ))}

                  {/* Show total perimeter and area */}
                  {showMeasurements && structure.points.length >= 3 && (
                    <View
                      style={{
                        position: 'absolute',
                        left: structure.points[0].x + 10,
                        top: structure.points[0].y - 40,
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        padding: 6,
                        borderRadius: 6,
                        borderWidth: 2,
                        borderColor: structure.color,
                      }}
                    >
                      <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#000' }}>
                        {structure.label}
                      </Text>
                      <Text style={{ fontSize: 10, color: '#000' }}>
                        Perimeter: {calculatePerimeter(structure.points).toFixed(1)}'
                      </Text>
                      <Text style={{ fontSize: 10, color: '#000' }}>
                        Area: {calculateArea(structure.points).toFixed(0)} sq ft
                      </Text>
                    </View>
                  )}
                </View>
              ))}
              
              {/* Draw active structure being drawn */}
              {activeStructure && activeStructure.points.length > 0 && (
                <View>
                  {/* Draw lines between points */}
                  {activeStructure.points.map((point, index) => {
                    if (index === activeStructure.points.length - 1) return null;
                    const nextPoint = activeStructure.points[index + 1];
                    const angle = Math.atan2(nextPoint.y - point.y, nextPoint.x - point.x) * 180 / Math.PI;
                    const length = Math.sqrt(
                      Math.pow(nextPoint.x - point.x, 2) + Math.pow(nextPoint.y - point.y, 2)
                    );
                    const distance = calculateDistance(point, nextPoint);
                    const midpoint = getMidpoint(point, nextPoint);
                    
                    return (
                      <View key={`active-line-${index}`}>
                        <Path
                          d={`M${point.x},${point.y} L${nextPoint.x},${nextPoint.y}`}
                          stroke={selectedType.color}
                          strokeWidth={4}
                          fill="none"
                          strokeLinecap="round"
                          opacity={0.8}
                        />
                        {showMeasurements && (
                          <View
                            style={{
                              position: 'absolute',
                              left: midpoint.x - 25,
                              top: midpoint.y - 12,
                              backgroundColor: 'rgba(255, 255, 255, 0.95)',
                              paddingHorizontal: 6,
                              paddingVertical: 2,
                              borderRadius: 4,
                              borderWidth: 1,
                              borderColor: selectedType.color,
                            }}
                          >
                            <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#000' }}>
                              {distance.toFixed(1)}'
                            </Text>
                          </View>
                        )}
                      </View>
                    );
                  })}

                  {/* Draw points */}
                  {activeStructure.points.map((point, index) => (
                    <Circle
                      key={`active-point-${index}`}
                      cx={point.x}
                      cy={point.y}
                      r={8}
                      fill={selectedType.color}
                      stroke="#fff"
                      strokeWidth={3}
                    />
                  ))}
                  
                  {/* Preview line from last point to cursor */}
                  {previewPoint && activeStructure.points.length > 0 && (
                    <View>
                      {(() => {
                        const lastPoint = activeStructure.points[activeStructure.points.length - 1];
                        const angle = Math.atan2(previewPoint.y - lastPoint.y, previewPoint.x - lastPoint.x) * 180 / Math.PI;
                        const length = Math.sqrt(
                          Math.pow(previewPoint.x - lastPoint.x, 2) + Math.pow(previewPoint.y - lastPoint.y, 2)
                        );
                        const distance = calculateDistance(lastPoint, previewPoint);
                        const midpoint = getMidpoint(lastPoint, previewPoint);
                        
                        return (
                          <>
                            {/* Dashed preview line */}
                            <Path
                              d={`M${lastPoint.x},${lastPoint.y} L${previewPoint.x},${previewPoint.y}`}
                              stroke={selectedType.color}
                              strokeWidth={2}
                              fill="none"
                              strokeLinecap="round"
                              strokeDasharray="5,5"
                              opacity={0.5}
                            />
                            {/* Preview point */}
                            <Circle
                              cx={previewPoint.x}
                              cy={previewPoint.y}
                              r={6}
                              fill={selectedType.color}
                              stroke="#fff"
                              strokeWidth={2}
                              opacity={0.6}
                            />
                            {/* Preview measurement */}
                            {showMeasurements && (
                              <View
                                style={{
                                  position: 'absolute',
                                  left: midpoint.x - 25,
                                  top: midpoint.y - 12,
                                  backgroundColor: 'rgba(255, 255, 255, 0.9)',
                                  paddingHorizontal: 6,
                                  paddingVertical: 2,
                                  borderRadius: 4,
                                  borderWidth: 1,
                                  borderColor: selectedType.color,
                                  opacity: 0.8,
                                }}
                              >
                                <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#000' }}>
                                  {distance.toFixed(1)}'
                                </Text>
                              </View>
                            )}
                          </>
                        );
                      })()}
                    </View>
                  )}
                  
                  {/* First point indicator (clickable to close) */}
                  {activeStructure && activeStructure.points.length >= 3 && (
                    <>
                      <Circle
                        cx={activeStructure.points[0].x}
                        cy={activeStructure.points[0].y}
                        r={CLOSE_THRESHOLD}
                        fill="rgba(34, 197, 94, 0.2)"
                        stroke="#22c55e"
                        strokeWidth={2}
                      />
                      <Circle
                        cx={activeStructure.points[0].x}
                        cy={activeStructure.points[0].y}
                        r={8}
                        fill="#22c55e"
                        onPress={(e) => {
                          e.stopPropagation?.();
                          console.log('*** FIRST POINT CIRCLE CLICKED - CLOSING POLYGON ***');
                          completeStructure();
                        }}
                      />
                    </>
                  )}
                  
                  {/* Highlight first point when you have 3+ points */}
                  {activeStructure.points.length >= 3 && (
                    <Circle
                      cx={activeStructure.points[0].x}
                      cy={activeStructure.points[0].y}
                      r={12}
                      fill="transparent"
                      stroke="#fff"
                      strokeWidth={2}
                      strokeDasharray="5,5"
                    />
                  )}
                </View>
              )}
            </Svg>
          </Pressable>
          
          {/* Separate Pressable overlay for closing the polygon - sits on top */}
          {isDrawing && activeStructure && activeStructure.points.length >= 3 && (
            <Pressable
              onPressIn={(e) => {
                e.stopPropagation();
                console.log('*** CLOSE BUTTON PRESSED - COMPLETING STRUCTURE ***');
                completeStructure();
              }}
              onPress={(e) => {
                e.stopPropagation();
              }}
              style={{
                position: 'absolute',
                left: activeStructure.points[0].x - CLOSE_THRESHOLD,
                top: activeStructure.points[0].y - CLOSE_THRESHOLD,
                width: CLOSE_THRESHOLD * 2,
                height: CLOSE_THRESHOLD * 2,
                borderRadius: CLOSE_THRESHOLD,
                backgroundColor: 'rgba(34, 197, 94, 0.3)',
                borderWidth: 2,
                borderColor: '#22c55e',
                zIndex: 1000,
              }}
            >
              <View style={{
                width: '100%',
                height: '100%',
                borderRadius: CLOSE_THRESHOLD,
                justifyContent: 'center',
                alignItems: 'center',
              }}>
                <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 12 }}>CLOSE</Text>
              </View>
            </Pressable>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#111827" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          Property Outline Tool
        </Text>
        <View style={styles.addressRow}>
          <TextInput
            style={styles.addressInput}
            value={addressInput}
            onChangeText={setAddressInput}
            placeholder="Enter address..."
            placeholderTextColor="#9ca3af"
          />
          <TouchableOpacity
            onPress={handleRefreshLocation}
            style={styles.refreshButton}
          >
            <RefreshCw size={20} color="#fff" />
          </TouchableOpacity>
        </View>
        {currentLat && currentLng && (
          <Text style={styles.coordsText}>
            {currentLat.toFixed(6)}, {currentLng.toFixed(6)} | Zoom: {zoomLevel}
          </Text>
        )}
      </View>

      {/* Structure Type Selector */}
      <View style={styles.typeSelector}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {STRUCTURE_TYPES.map((type) => {
            const Icon = type.icon;
            return (
              <TouchableOpacity
                key={type.type}
                onPress={() => setSelectedType(type)}
                style={[
                  styles.typeButton,
                  selectedType.type === type.type && styles.typeButtonActive,
                  { borderColor: type.color }
                ]}
              >
                <Icon 
                  size={20} 
                  color={selectedType.type === type.type ? '#fff' : type.color} 
                />
                <Text 
                  style={[
                    styles.typeButtonText,
                    selectedType.type === type.type && styles.typeButtonTextActive
                  ]}
                >
                  {type.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Measurements Toggle */}
      <View style={styles.measurementsToggle}>
        <TouchableOpacity
          onPress={() => setShowMeasurements(!showMeasurements)}
          style={styles.measurementsRow}
        >
          <View style={[
            styles.checkbox,
            showMeasurements && styles.checkboxChecked
          ]}>
            {showMeasurements && <Check size={16} color="#fff" />}
          </View>
          <Text style={styles.measurementsText}>Show Measurements</Text>
        </TouchableOpacity>
      </View>

      {/* Map Container with Zoom Controls */}
      <View style={styles.mapContainer}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3b82f6" />
            <Text style={styles.loadingText}>Loading satellite imagery...</Text>
          </View>
        ) : !currentLat || !currentLng ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.noLocationText}>
              No location data available. Please enter an address above.
            </Text>
          </View>
        ) : (
          <View style={{ width: MAP_WIDTH, position: 'relative' }}>
            {/* Zoom Controls */}
            <View style={styles.zoomControls}>
              <TouchableOpacity
                onPress={handleZoomIn}
                style={[styles.zoomButton, styles.zoomButtonTop]}
                disabled={zoomLevel >= 21}
              >
                <ZoomIn size={24} color={zoomLevel >= 21 ? "#ccc" : "#000"} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleZoomOut}
                style={styles.zoomButton}
                disabled={zoomLevel <= 15}
              >
                <ZoomOut size={24} color={zoomLevel <= 15 ? "#ccc" : "#000"} />
              </TouchableOpacity>
            </View>

            <View 
              ref={mapContainerRef}
              onLayout={handleMapLayout}
              style={{ position: 'relative', width: MAP_WIDTH, height: MAP_HEIGHT }}
            >
              <Image
                source={{ uri: satelliteImageUrl }}
                style={{ width: MAP_WIDTH, height: MAP_HEIGHT }}
                resizeMode="cover"
                onError={(error) => {
                  console.error("Image load error:", error.nativeEvent.error);
                  Alert.alert("Error", "Failed to load satellite imagery. Please check your internet connection.");
                }}
                onLoad={() => {
                  console.log("Satellite image loaded successfully!");
                }}
              />
              
              <Pressable
                onPress={(event) => {
                  const touch = event.nativeEvent;
                  const x = touch.locationX;
                  const y = touch.locationY;

                  console.log('=== PRESS EVENT ===');
                  console.log('Pressable touch:', { locationX: x, locationY: y });

                  // Validate touch is within map bounds
                  if (x < 0 || y < 0 || x > MAP_WIDTH || y > MAP_HEIGHT) {
                    console.log('Touch outside map bounds, ignoring');
                    return;
                  }

                  console.log('Valid touch at:', x, y);

                  if (!isDrawing) {
                    console.log('Not in drawing mode, ignoring touch');
                    return;
                  }

                  console.log('Current points count:', activeStructure?.points.length || 0);

                  // Check if we should close the structure
                  if (activeStructure && activeStructure.points.length >= 3) {
                    const firstPoint = activeStructure.points[0];
                    const distance = Math.sqrt(
                      Math.pow(x - firstPoint.x, 2) + Math.pow(y - firstPoint.y, 2)
                    );

                    console.log('Checking distance to first point:', {
                      touchPoint: { x, y },
                      firstPoint,
                      distance,
                      threshold: CLOSE_THRESHOLD,
                      isNear: distance <= CLOSE_THRESHOLD,
                      currentPointsCount: activeStructure.points.length,
                    });

                    if (distance <= CLOSE_THRESHOLD) {
                      console.log('Close to first point, completing structure');
                      completeStructure();
                      return;
                    }
                  }

                  console.log('Adding new point');
                  addPoint(x, y);
                }}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: MAP_WIDTH,
                  height: MAP_HEIGHT,
                  backgroundColor: 'transparent',
                }}
              >
                <Svg width={MAP_WIDTH} height={MAP_HEIGHT} style={{ position: 'absolute' }}>
                  {/* Draw completed structures */}
                  {structures.filter(s => s.visible).map((structure) => (
                    <React.Fragment key={structure.id}>
                      {/* Draw lines between points */}
                      {structure.points.map((point, index) => {
                        const nextPoint = structure.points[(index + 1) % structure.points.length];
                        return (
                          <Path
                            key={`line-${index}`}
                            d={`M${point.x},${point.y} L${nextPoint.x},${nextPoint.y}`}
                            stroke={structure.color}
                            strokeWidth={3}
                            fill="none"
                            strokeLinecap="round"
                          />
                        );
                      })}
                      
                      {/* Draw points */}
                      {structure.points.map((point, index) => (
                        <Circle
                          key={`point-${index}`}
                          cx={point.x}
                          cy={point.y}
                          r={6}
                          fill={structure.color}
                          stroke="#fff"
                          strokeWidth={2}
                        />
                      ))}
                    </React.Fragment>
                  ))}
                  
                  {/* Draw active structure being drawn */}
                  {activeStructure && activeStructure.points.length > 0 && (
                    <React.Fragment>
                      {/* Draw lines between points */}
                      {activeStructure.points.map((point, index) => {
                        if (index === activeStructure.points.length - 1) return null;
                        const nextPoint = activeStructure.points[index + 1];
                        return (
                          <Path
                            key={`active-line-${index}`}
                            d={`M${point.x},${point.y} L${nextPoint.x},${nextPoint.y}`}
                            stroke={selectedType.color}
                            strokeWidth={4}
                            fill="none"
                            strokeLinecap="round"
                            opacity={0.8}
                          />
                        );
                      })}

                      {/* Draw points */}
                      {activeStructure.points.map((point, index) => (
                        <Circle
                          key={`active-point-${index}`}
                          cx={point.x}
                          cy={point.y}
                          r={8}
                          fill={selectedType.color}
                          stroke="#fff"
                          strokeWidth={3}
                        />
                      ))}
                      
                      {/* Preview line from last point to cursor */}
                      {previewPoint && activeStructure.points.length > 0 && (
                        <React.Fragment>
                          {(() => {
                            const lastPoint = activeStructure.points[activeStructure.points.length - 1];
                            return (
                              <>
                                {/* Dashed preview line */}
                                <Path
                                  d={`M${lastPoint.x},${lastPoint.y} L${previewPoint.x},${previewPoint.y}`}
                                  stroke={selectedType.color}
                                  strokeWidth={2}
                                  fill="none"
                                  strokeLinecap="round"
                                  strokeDasharray="5,5"
                                  opacity={0.5}
                                />
                                {/* Preview point */}
                                <Circle
                                  cx={previewPoint.x}
                                  cy={previewPoint.y}
                                  r={6}
                                  fill={selectedType.color}
                                  stroke="#fff"
                                  strokeWidth={2}
                                  opacity={0.6}
                                />
                              </>
                            );
                          })()}
                        </React.Fragment>
                      )}
                      
                      {/* First point indicator (clickable to close) */}
                      {activeStructure && activeStructure.points.length >= 3 && (
                        <>
                          <Circle
                            cx={activeStructure.points[0].x}
                            cy={activeStructure.points[0].y}
                            r={CLOSE_THRESHOLD}
                            fill="rgba(34, 197, 94, 0.2)"
                            stroke="#22c55e"
                            strokeWidth={2}
                          />
                          <Circle
                            cx={activeStructure.points[0].x}
                            cy={activeStructure.points[0].y}
                            r={12}
                            fill="transparent"
                            stroke="#fff"
                            strokeWidth={2}
                            strokeDasharray="5,5"
                          />
                        </>
                      )}
                    </React.Fragment>
                  )}
                </Svg>

                {/* Measurement labels - these need to be View elements */}
                {structures.filter(s => s.visible).map((structure) => (
                  <React.Fragment key={`labels-${structure.id}`}>
                    {/* Draw measurement labels between points */}
                    {structure.points.map((point, index) => {
                      const nextPoint = structure.points[(index + 1) % structure.points.length];
                      const distance = calculateDistance(point, nextPoint);
                      const midpoint = getMidpoint(point, nextPoint);
                      
                      return showMeasurements ? (
                        <View
                          key={`label-${index}`}
                          style={{
                            position: 'absolute',
                            left: midpoint.x - 25,
                            top: midpoint.y - 12,
                            backgroundColor: 'rgba(255, 255, 255, 0.95)',
                            paddingHorizontal: 6,
                            paddingVertical: 2,
                            borderRadius: 4,
                            borderWidth: 1,
                            borderColor: structure.color,
                          }}
                        >
                          <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#000' }}>
                            {distance.toFixed(1)}'
                          </Text>
                        </View>
                      ) : null;
                    })}

                    {/* Show total perimeter and area */}
                    {showMeasurements && structure.points.length >= 3 && (
                      <View
                        style={{
                          position: 'absolute',
                          left: structure.points[0].x + 10,
                          top: structure.points[0].y - 40,
                          backgroundColor: 'rgba(255, 255, 255, 0.95)',
                          padding: 6,
                          borderRadius: 6,
                          borderWidth: 2,
                          borderColor: structure.color,
                        }}
                      >
                        <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#000' }}>
                          {structure.label}
                        </Text>
                        <Text style={{ fontSize: 10, color: '#000' }}>
                          Perimeter: {calculatePerimeter(structure.points).toFixed(1)}'
                        </Text>
                        <Text style={{ fontSize: 10, color: '#000' }}>
                          Area: {calculateArea(structure.points).toFixed(0)} sq ft
                        </Text>
                      </View>
                    )}
                  </React.Fragment>
                ))}

                {/* Active structure measurement labels */}
                {activeStructure && activeStructure.points.length > 0 && (
                  <React.Fragment>
                    {activeStructure.points.map((point, index) => {
                      if (index === activeStructure.points.length - 1) return null;
                      const nextPoint = activeStructure.points[index + 1];
                      const distance = calculateDistance(point, nextPoint);
                      const midpoint = getMidpoint(point, nextPoint);
                      
                      return showMeasurements ? (
                        <View
                          key={`active-label-${index}`}
                          style={{
                            position: 'absolute',
                            left: midpoint.x - 25,
                            top: midpoint.y - 12,
                            backgroundColor: 'rgba(255, 255, 255, 0.95)',
                            paddingHorizontal: 6,
                            paddingVertical: 2,
                            borderRadius: 4,
                            borderWidth: 1,
                            borderColor: selectedType.color,
                          }}
                        >
                          <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#000' }}>
                            {distance.toFixed(1)}'
                          </Text>
                        </View>
                      ) : null;
                    })}

                    {/* Preview measurement */}
                    {previewPoint && activeStructure.points.length > 0 && showMeasurements && (
                      (() => {
                        const lastPoint = activeStructure.points[activeStructure.points.length - 1];
                        const distance = calculateDistance(lastPoint, previewPoint);
                        const midpoint = getMidpoint(lastPoint, previewPoint);
                        
                        return (
                          <View
                            style={{
                              position: 'absolute',
                              left: midpoint.x - 25,
                              top: midpoint.y - 12,
                              backgroundColor: 'rgba(255, 255, 255, 0.9)',
                              paddingHorizontal: 6,
                              paddingVertical: 2,
                              borderRadius: 4,
                              borderWidth: 1,
                              borderColor: selectedType.color,
                              opacity: 0.8,
                            }}
                          >
                            <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#000' }}>
                              {distance.toFixed(1)}'
                            </Text>
                          </View>
                        );
                      })()
                    )}
                  </React.Fragment>
                )}
              </Pressable>
            </View>

            {/* Drawing Instructions */}
            {isDrawing && (
              <View style={styles.drawingInstructions}>
                <Text style={styles.drawingTitle}>
                  Drawing {activeStructure?.label || selectedType.label}
                </Text>
                <Text style={styles.drawingText}>
                  {activeStructure && activeStructure.points.length >= 3 
                    ? "Tap first point to close, or add more points"
                    : "Tap to add points. Need at least 3 points."}
                </Text>
                <Text style={styles.drawingPoints}>
                  Points: {activeStructure?.points.length || 0}
                </Text>
              </View>
            )}
          </View>
        )}
      </View>

      {/* Structures List with Layer Management */}
      <View style={styles.structuresList}>
        <Text style={styles.structuresTitle}>Layers ({structures.length})</Text>
        <ScrollView>
          {structures.map((structure) => (
            <View 
              key={structure.id}
              style={[styles.structureCard, { borderLeftColor: structure.color }]}
            >
              {editingStructureId === structure.id ? (
                <View style={styles.editingRow}>
                  <TextInput
                    style={styles.editInput}
                    value={editingLabel}
                    onChangeText={setEditingLabel}
                    autoFocus
                    placeholder="Structure name..."
                    placeholderTextColor="#9ca3af"
                  />
                  <TouchableOpacity
                    onPress={() => saveLabel(structure.id)}
                    style={styles.saveEditButton}
                  >
                    <Text style={styles.saveEditButtonText}>Save</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={cancelEditingLabel}
                    style={styles.cancelEditButton}
                  >
                    <Text style={styles.cancelEditButtonText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.structureHeader}>
                  <Text style={styles.structureName}>{structure.label}</Text>
                  <View style={styles.structureActions}>
                    <TouchableOpacity
                      onPress={() => startEditingLabel(structure)}
                      style={styles.actionButton}
                    >
                      <Edit2 size={18} color="#3b82f6" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => toggleStructureVisibility(structure.id)}
                      style={styles.actionButton}
                    >
                      {structure.visible ? (
                        <Eye size={18} color="#10b981" />
                      ) : (
                        <EyeOff size={18} color="#9ca3af" />
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => deleteStructure(structure.id)}
                      style={styles.actionButton}
                    >
                      <Trash2 size={18} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                </View>
              )}
              <Text style={styles.structureInfo}>
                Area: {calculateArea(structure.points).toFixed(2)} sq ft
              </Text>
              <Text style={styles.structureInfo}>
                Perimeter: {calculatePerimeter(structure.points).toFixed(2)} ft
              </Text>
            </View>
          ))}
          {structures.length === 0 && (
            <Text style={styles.emptyText}>
              No structures outlined yet
            </Text>
          )}
        </ScrollView>
      </View>

      {/* Name Input Modal */}
      <Modal
        visible={showNameModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowNameModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Name Your Structure</Text>
            <TextInput
              style={styles.modalInput}
              value={pendingStructureName}
              onChangeText={setPendingStructureName}
              placeholder="e.g., Main House, Garage 2, Basement..."
              placeholderTextColor="#9ca3af"
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                onPress={() => setShowNameModal(false)}
                style={styles.modalCancelButton}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={confirmStartDrawing}
                style={styles.modalConfirmButton}
              >
                <Text style={styles.modalConfirmButtonText}>Start Drawing</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Action Buttons */}
      <View style={styles.actionBar}>
        {isDrawing ? (
          <View style={styles.drawingActions}>
            <TouchableOpacity
              onPress={cancelDrawing}
              style={styles.cancelDrawingButton}
            >
              <Text style={styles.cancelDrawingButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={completeStructure}
              style={styles.completeDrawingButton}
            >
              <Text style={styles.completeDrawingButtonText}>Complete</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.normalActions}>
            <TouchableOpacity
              onPress={onCancel}
              style={styles.cancelButton}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <View style={styles.rightActions}>
              <TouchableOpacity
                onPress={startDrawing}
                style={styles.drawButton}
              >
                <Plus size={20} color="#fff" />
                <Text style={styles.drawButtonText}>Draw {selectedType.label}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleSave}
                style={[styles.saveButton, structures.length === 0 && styles.saveButtonDisabled]}
                disabled={structures.length === 0}
              >
                <Save size={20} color="#fff" />
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  header: {
    padding: 16,
    backgroundColor: '#1f2937',
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  headerTitle: {
    color: '#f3f4f6',
    fontSize: 18,
    fontWeight: 'bold',
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  addressInput: {
    flex: 1,
    backgroundColor: '#374151',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: '#f3f4f6',
  },
  refreshButton: {
    marginLeft: 8,
    backgroundColor: '#4b5563',
    padding: 8,
    borderRadius: 8,
  },
  coordsText: {
    color: '#9ca3af',
    fontSize: 12,
    marginTop: 4,
  },
  typeSelector: {
    padding: 8,
    backgroundColor: '#1f2937',
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  typeButton: {
    marginRight: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#374151',
    borderWidth: 1,
  },
  typeButtonActive: {
    backgroundColor: '#3b82f6',
  },
  typeButtonText: {
    marginLeft: 8,
    fontWeight: '500',
    color: '#f3f4f6',
  },
  typeButtonTextActive: {
    color: '#ffffff',
  },
  measurementsToggle: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#1f2937',
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  measurementsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#6b7280',
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  measurementsText: {
    color: '#e5e7eb',
    fontWeight: '500',
  },
  mapContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 16,
    color: '#9ca3af',
  },
  noLocationText: {
    color: '#9ca3af',
    textAlign: 'center',
  },
  zoomControls: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 50,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  zoomButton: {
    padding: 12,
  },
  zoomButtonTop: {
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  drawingInstructions: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 80,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    padding: 12,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 40,
  },
  drawingTitle: {
    fontWeight: 'bold',
    color: '#3b82f6',
  },
  drawingText: {
    fontSize: 14,
    color: '#374151',
  },
  drawingPoints: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '500',
  },
  structuresList: {
    backgroundColor: '#1f2937',
    padding: 16,
    maxHeight: 256,
  },
  structuresTitle: {
    fontWeight: 'bold',
    fontSize: 18,
    marginBottom: 8,
    color: '#f3f4f6',
  },
  structureCard: {
    backgroundColor: '#374151',
    padding: 12,
    marginBottom: 8,
    borderRadius: 8,
    borderLeftWidth: 4,
  },
  editingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  editInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#3b82f6',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    color: '#f3f4f6',
  },
  saveEditButton: {
    marginLeft: 8,
    backgroundColor: '#16a34a',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 4,
  },
  saveEditButtonText: {
    color: '#ffffff',
    fontWeight: '500',
  },
  cancelEditButton: {
    marginLeft: 4,
    backgroundColor: '#6b7280',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 4,
  },
  cancelEditButtonText: {
    color: '#e5e7eb',
    fontWeight: '500',
  },
  structureHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  structureName: {
    fontWeight: 'bold',
    color: '#f3f4f6',
    flex: 1,
  },
  structureActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    padding: 8,
  },
  structureInfo: {
    fontSize: 14,
    color: '#9ca3af',
  },
  emptyText: {
    textAlign: 'center',
    color: '#6b7280',
    paddingVertical: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#111827',
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 16,
    color: '#111827',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  modalCancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 8,
    marginRight: 8,
  },
  modalCancelButtonText: {
    color: '#374151',
    fontWeight: '500',
  },
  modalConfirmButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#3b82f6',
    borderRadius: 8,
  },
  modalConfirmButtonText: {
    color: '#ffffff',
    fontWeight: '500',
  },
  actionBar: {
    padding: 16,
    backgroundColor: '#1f2937',
    borderTopWidth: 1,
    borderTopColor: '#374151',
  },
  drawingActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cancelDrawingButton: {
    flex: 1,
    marginRight: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#6b7280',
    borderRadius: 8,
  },
  cancelDrawingButtonText: {
    textAlign: 'center',
    color: '#f3f4f6',
    fontWeight: '500',
  },
  completeDrawingButton: {
    flex: 1,
    marginLeft: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#16a34a',
    borderRadius: 8,
  },
  completeDrawingButtonText: {
    textAlign: 'center',
    color: '#ffffff',
    fontWeight: '500',
  },
  normalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#6b7280',
    borderRadius: 8,
  },
  cancelButtonText: {
    color: '#f3f4f6',
    fontWeight: '500',
  },
  rightActions: {
    flexDirection: 'row',
  },
  drawButton: {
    marginRight: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  drawButtonText: {
    marginLeft: 8,
    color: '#ffffff',
    fontWeight: '500',
  },
  saveButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#16a34a',
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    marginLeft: 8,
    color: '#ffffff',
    fontWeight: '500',
  },
});

export default PropertyOutlineTool;