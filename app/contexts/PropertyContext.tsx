import React, { createContext, useContext, useState, ReactNode } from 'react';

interface PropertyData {
  propertyAddress?: string;
  fullAddress?: string;
  city?: string;
  state?: string;
  zipcode?: string;
  county?: string;
  latitude?: number;
  longitude?: number;
  parcelInformation?: string;
  yearBuilt?: string;
  squareFootage?: string;
  constructionType?: string;
  numberOfStories?: string;
  occupancyType?: string;
  assessedValue?: string;
  propertyData?: any;
  streetApiData?: any;
}

interface PropertyContextType {
  propertyData: PropertyData | null;
  setPropertyData: (data: PropertyData | null) => void;
  clearPropertyData: () => void;
  isPropertyDataAvailable: boolean;
}

const PropertyContext = createContext<PropertyContextType | undefined>(undefined);

export const PropertyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [propertyData, setPropertyData] = useState<PropertyData | null>(null);

  const clearPropertyData = () => {
    setPropertyData(null);
  };

  const isPropertyDataAvailable = propertyData !== null;

  return (
    <PropertyContext.Provider
      value={{
        propertyData,
        setPropertyData,
        clearPropertyData,
        isPropertyDataAvailable,
      }}
    >
      {children}
    </PropertyContext.Provider>
  );
};

export const useProperty = () => {
  const context = useContext(PropertyContext);
  
  // If context is undefined (not wrapped in PropertyProvider), return default values
  if (context === undefined) {
    console.warn('useProperty called outside of PropertyProvider, returning default values');
    return {
      propertyData: null,
      setPropertyData: () => {},
      clearPropertyData: () => {},
      isPropertyDataAvailable: false,
    };
  }
  
  return context;
};

// Default export to prevent Expo Router from treating this as a route
export default function PropertyContextRoute() {
  return null;
}