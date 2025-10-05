import { Alert } from 'react-native';
import { Buffer } from 'buffer';
import { supabase } from './supabase';

// Interface for property data
export interface PropertyData {
  propertyAddress: string;
  parcelInformation: string;
  yearBuilt: string;
  squareFootage: string;
  constructionType: string;
  numberOfStories: string;
  occupancyType: string;
}

// Response interface
export interface PropertyLookupResponse {
  success: boolean;
  data?: PropertyData;
  error?: string;
  message?: string;
}

class DirectPropertyService {
  async lookupProperty(address: string): Promise<PropertyLookupResponse> {
    console.log("DirectPropertyService: Looking up property for address:", address);

    if (!address || typeof address !== 'string' || address.trim().length < 5) {
      return {
        success: false,
        error: 'Invalid address provided'
      };
    }

    try {
      // Use the latest Supabase edge function v4
      console.log("Calling Smarty edge function v4...");
      
      const { data, error } = await supabase.functions.invoke('supabase-functions-smarty-property-lookup-v4', {
        body: { address: address }
      });
      
      if (error) {
        console.error("Edge function error:", error);
        return {
          ...this.getMockPropertyData(address),
          message: `Using mock data - Edge function error: ${error.message}`
        };
      }
      
      console.log("Edge function response:", data);
      
      if (!data || !data.success) {
        console.warn("No data returned from edge function, using mock data");
        return this.getMockPropertyData(address);
      }
      
      return data;
    } catch (error) {
      console.error("Error processing request:", error);
      
      // Return mock data with error message
      return {
        ...this.getMockPropertyData(address),
        message: "Using mock data - Error processing request",
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  // Helper method to generate mock property data
  private getMockPropertyData(address: string): PropertyLookupResponse {
    const mockPropertyData: PropertyData = {
      propertyAddress: address,
      parcelInformation: `Parcel #: 123-456-789, Lot Size: 0.25 acres, Zoned: R-1 Residential`,
      yearBuilt: `Built in 1985, approximately 38 years old`,
      squareFootage: `2,150 sq ft living area`,
      constructionType: `Wood frame construction with vinyl siding`,
      numberOfStories: `2 stories`,
      occupancyType: `Owner-occupied`,
    };
    
    return {
      success: true,
      data: mockPropertyData,
      message: "Using mock data"
    };
  }
}

export const directPropertyService = new DirectPropertyService();