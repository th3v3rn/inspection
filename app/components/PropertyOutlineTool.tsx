import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Platform,
} from "react-native";
import {
  Trash2,
  Save,
  ZoomIn,
  ZoomOut,
  Move,
  Map as MapIcon,
} from "lucide-react-native";

interface Point {
  id: string;
  lat: number;
  lng: number;
}

interface PropertyOutlineToolProps {
  address?: string;
  initialPoints?: Point[];
  onSave?: (points: Point[], measurements: Measurements) => void;
  onCancel?: () => void;
  isLoading?: boolean;
}

interface Measurements {
  totalArea: number;
  perimeter: number;
  sides: number[];
}

const DEFAULT_ADDRESS = "123 Main St, Anytown, USA";
const DEFAULT_POINTS: Point[] = [
  { id: "p1", lat: 37.7749, lng: -122.4194 },
  { id: "p2", lat: 37.7749, lng: -122.4184 },
  { id: "p3", lat: 37.7739, lng: -122.4184 },
  { id: "p4", lat: 37.7739, lng: -122.4194 },
];

const DEFAULT_MEASUREMENTS: Measurements = {
  totalArea: 2500, // square feet
  perimeter: 200, // feet
  sides: [50, 50, 50, 50], // feet per side
};

const PropertyOutlineTool = ({
  address = DEFAULT_ADDRESS,
  initialPoints = DEFAULT_POINTS,
  onSave = () => {},
  onCancel = () => {},
  isLoading = false,
}: PropertyOutlineToolProps) => {
  const [points, setPoints] = useState<Point[]>(initialPoints);
  const [measurements, setMeasurements] =
    useState<Measurements>(DEFAULT_MEASUREMENTS);
  const [activePointId, setActivePointId] = useState<string | null>(null);
  const [mode, setMode] = useState<"move" | "edit">("edit");

  // Get Google Maps API key from environment
  const googleMapsApiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '';

  const updatePoint = (pointId: string, lat: number, lng: number) => {
    const updatedPoints = points.map((point) =>
      point.id === pointId ? { ...point, lat, lng } : point
    );
    setPoints(updatedPoints);
    calculateMeasurements(updatedPoints);
  };

  const addPoint = () => {
    if (points.length < 2) return;

    const lastPoint = points[points.length - 1];
    const firstPoint = points[0];

    const newPoint: Point = {
      id: `p${Date.now()}`,
      lat: (lastPoint.lat + firstPoint.lat) / 2,
      lng: (lastPoint.lng + firstPoint.lng) / 2,
    };

    const newPoints = [...points, newPoint];
    setPoints(newPoints);
    calculateMeasurements(newPoints);
  };

  const removePoint = (pointId: string) => {
    if (points.length <= 3) {
      // Don't allow fewer than 3 points for a valid polygon
      return;
    }

    const newPoints = points.filter((point) => point.id !== pointId);
    setPoints(newPoints);
    
    if (activePointId === pointId) {
      setActivePointId(null);
    }
    
    calculateMeasurements(newPoints);
  };

  const calculateMeasurements = (pointsToMeasure = points) => {
    // Calculate perimeter
    let perimeter = 0;
    const sides: number[] = [];

    for (let i = 0; i < pointsToMeasure.length; i++) {
      const point1 = pointsToMeasure[i];
      const point2 = pointsToMeasure[(i + 1) % pointsToMeasure.length];

      // Simple distance calculation (not accurate for real geo-coordinates)
      const distance = calculateDistance(
        point1.lat, point1.lng, 
        point2.lat, point2.lng
      );

      perimeter += distance;
      sides.push(parseFloat(distance.toFixed(2)));
    }

    // Calculate area using Shoelace formula
    let area = 0;
    for (let i = 0; i < pointsToMeasure.length; i++) {
      const j = (i + 1) % pointsToMeasure.length;
      area += pointsToMeasure[i].lat * pointsToMeasure[j].lng;
      area -= pointsToMeasure[j].lat * pointsToMeasure[i].lng;
    }
    area = (Math.abs(area) * 18200000) / 2; // Rough conversion factor for demo

    setMeasurements({
      totalArea: parseFloat(area.toFixed(2)),
      perimeter: parseFloat(perimeter.toFixed(2)),
      sides,
    });
  };

  // Calculate distance between two points in feet
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3; // Earth radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    
    // Convert to feet
    return distance * 3.28084;
  };

  const handleSave = () => {
    onSave(points, measurements);
  };

  const toggleMode = () => {
    setMode((prev) => (prev === "edit" ? "move" : "edit"));
  };

  // Render a fallback UI for web or unsupported platforms
  return (
    <View className="flex-1 bg-white w-[416px] h-[669px]">
      {/* Header */}
      <View className="p-4 bg-blue-600">
        <Text className="text-white text-lg font-bold">
          Property Outline Tool
        </Text>
        <Text className="text-white text-sm">{address}</Text>
      </View>
      
      {/* Map Container */}
      <View className="flex-1 relative">
        {isLoading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#0000ff" />
            <Text className="mt-2 text-gray-600">Loading property data...</Text>
          </View>
        ) : (
          <View className="flex-1 items-center justify-center p-4">
            <MapIcon size={64} color="#3b82f6" />
            <Text className="text-lg font-bold mt-4 text-center">
              Property Outline Tool
            </Text>
            <Text className="text-center mt-2 mb-4">
              {address}
            </Text>
            <Text className="text-center text-gray-600 mb-4">
              The property outline tool requires a mobile device.
            </Text>
            <Text className="text-center text-gray-600">
              Please use this feature on iOS or Android.
            </Text>
            <Text className="text-center text-gray-500 mt-4 text-sm">
              This feature uses native map functionality that is not available on web.
            </Text>
          </View>
        )}
      </View>
      
      {/* Measurements Panel */}
      <View className="bg-gray-100 p-4">
        <Text className="text-lg font-bold mb-2">Property Measurements</Text>
        <View className="flex-row justify-between mb-2">
          <Text className="text-gray-700">Total Area:</Text>
          <Text className="font-bold">{measurements.totalArea} sq ft</Text>
        </View>
        <View className="flex-row justify-between mb-2">
          <Text className="text-gray-700">Perimeter:</Text>
          <Text className="font-bold">{measurements.perimeter} ft</Text>
        </View>
        <View className="mb-2">
          <Text className="text-gray-700 mb-1">Side Lengths (ft):</Text>
          <View className="flex-row flex-wrap">
            {measurements.sides.map((side, index) => (
              <Text
                key={index}
                className="mr-2 mb-1 bg-gray-200 px-2 py-1 rounded"
              >
                Side {index + 1}: {side}
              </Text>
            ))}
          </View>
        </View>
      </View>
      
      {/* Action Buttons */}
      <View className="flex-row justify-between p-4 bg-white border-t border-gray-200">
        <TouchableOpacity
          onPress={onCancel}
          className="px-4 py-2 bg-gray-200 rounded-lg"
        >
          <Text className="text-gray-800 font-medium">Cancel</Text>
        </TouchableOpacity>

        <View className="flex-row">
          <TouchableOpacity
            onPress={handleSave}
            className="px-4 py-2 bg-blue-600 rounded-lg"
          >
            <Text className="text-white font-medium">Save Outline</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

export default PropertyOutlineTool;