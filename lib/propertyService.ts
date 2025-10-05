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

export interface PropertyLookupResponse {
  success: boolean;
  data?: PropertyData;
  error?: string;
  message?: string;
}

export const propertyService = {
  async lookupProperty(address: string): Promise<PropertyLookupResponse> {
    try {
      console.log('=== propertyService.lookupProperty START ===');
      console.log('Address:', address);

      if (!address || address.trim().length < 5) {
        return {
          success: false,
          error: 'Please enter a valid address'
        };
      }

      // Call the latest Smarty edge function v4
      const { data, error } = await supabase.functions.invoke('supabase-functions-smarty-property-lookup-v4', {
        body: { address: address.trim() }
      });

      console.log('Edge function response:', { data, error });

      if (error) {
        console.error('Edge function error:', error);
        return {
          success: false,
          error: `Failed to lookup property: ${error.message}`
        };
      }

      if (!data || !data.success) {
        return {
          success: false,
          error: data?.error || 'No property data found'
        };
      }

      console.log('=== propertyService.lookupProperty SUCCESS ===');
      return {
        success: true,
        data: data.data,
        message: 'Property data retrieved successfully'
      };

    } catch (error) {
      console.error('=== propertyService.lookupProperty ERROR ===');
      console.error(error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }
};