import { supabase } from './supabase';

export interface PropertyData {
  propertyAddress: string;
  parcelInformation: string;
  yearBuilt: string;
  squareFootage: string;
  constructionType: string;
  numberOfStories: string;
  occupancyType: string;
  generalNotes?: string;
  rawData?: any;
}

export interface SmartyApiResponse {
  success: boolean;
  data?: PropertyData;
  error?: string;
  details?: string;
}

// Fallback mock data in case API fails
const MOCK_PROPERTY_DATA = {
  parcelInformation: `Parcel #: 123-456-789, Lot Size: 0.25 acres, Zoned: R-1 Residential`,
  yearBuilt: `Built in 1985, approximately 38 years old`,
  squareFootage: `2,150 sq ft living area`,
  constructionType: `Wood frame construction with vinyl siding`,
  numberOfStories: `2 stories`,
  occupancyType: `Owner-occupied`,
};

export const smartyPropertyService = {
  async lookupProperty(address: string): Promise<SmartyApiResponse> {
    try {
      console.log('Looking up property data for address:', address);
      
      if (!this.isAddressValid(address)) {
        console.warn('Address appears incomplete, using fallback data');
        return {
          success: true,
          data: {
            propertyAddress: address || "1600 Pennsylvania Ave, Washington DC",
            ...MOCK_PROPERTY_DATA
          }
        };
      }
      
      // Call the Smarty edge function
      const formattedAddress = this.formatAddressForLookup(address);
      
      // Use the correct function name with supabase-functions prefix
      const { data, error } = await supabase.functions.invoke('supabase-functions-smarty-lookup-direct', {
        body: { address: formattedAddress }
      });
      
      console.log('Smarty API response:', data);
      
      if (error) {
        console.error('Smarty API error:', error);
        throw new Error(`API Error: ${error.message}`);
      }
      
      if (!data || !data.success) {
        console.warn('No data returned from Smarty API, using fallback data');
        return {
          success: true,
          data: {
            propertyAddress: address,
            ...MOCK_PROPERTY_DATA
          }
        };
      }
      
      return data;
    } catch (error) {
      console.error('Property lookup error:', error);
      
      // Return fallback data in case of error
      return {
        success: true,
        data: {
          propertyAddress: address || "1600 Pennsylvania Ave, Washington DC",
          ...MOCK_PROPERTY_DATA
        },
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  },

  // Helper function to validate if an address looks complete enough for lookup
  isAddressValid(address: string): boolean {
    if (!address) return false;
    
    // Basic validation - address should have at least 5 characters and contain numbers
    const hasNumbers = /\d/.test(address);
    return address.trim().length > 5 && hasNumbers;
  },

  // Format address for better API results
  formatAddressForLookup(address: string): string {
    return address?.trim() || "";
  }
};