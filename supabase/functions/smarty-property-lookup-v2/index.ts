import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { address } = await req.json();
    
    if (!address || typeof address !== 'string' || address.trim().length < 5) {
      return new Response(
        JSON.stringify({ 
          error: 'Invalid address provided',
          success: false 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }

    // Get Smarty API credentials from environment variables
    const authId = Deno.env.get("SMARTY_AUTH_ID");
    const authToken = Deno.env.get("SMARTY_AUTH_TOKEN");

    if (!authId || !authToken) {
      console.error("Smarty API credentials not configured");
      return new Response(
        JSON.stringify({ 
          error: 'API credentials not configured',
          success: false 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500 
        }
      );
    }

    // Call the Smarty Address Enrichment API
    const enrichmentApiUrl = `https://us-enrichment.api.smartystreets.com/lookup/search/property/principal?auth-id=${authId}&auth-token=${authToken}&freeform=${encodeURIComponent(address.trim())}`;
    
    console.log(`Calling Smarty Enrichment API for address: ${address}`);
    
    const response = await fetch(enrichmentApiUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Home Inspection Pro/1.0'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Smarty API error: ${response.status}`, errorText);
      
      return new Response(
        JSON.stringify({ 
          error: `Smarty API error: ${response.status}`,
          details: errorText,
          success: false 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 502 
        }
      );
    }

    const data = await response.json();
    
    if (!data.results || data.results.length === 0) {
      return new Response(
        JSON.stringify({ 
          error: 'No property data found',
          success: false,
          data: null
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404 
        }
      );
    }

    // Process the property data
    const property = data.results[0];
    const attributes = property.attributes || {};
    const analysis = property.analysis || {};
    const addressComponents = property.address || {};
    
    // Format the full address
    const fullAddress = addressComponents.street_line 
      ? `${addressComponents.street_line}, ${addressComponents.city}, ${addressComponents.state} ${addressComponents.zipcode}`
      : address;
    
    // Format the response for our Property ID form
    const propertyInfo = {
      propertyAddress: fullAddress,
      parcelInformation: attributes.apn 
        ? `Parcel #: ${attributes.apn}${attributes.lot_size_acres ? `, Lot Size: ${attributes.lot_size_acres} acres` : ''}${attributes.zoning ? `, Zoned: ${attributes.zoning}` : ''}` 
        : `${attributes.lot_size_acres ? `Lot Size: ${attributes.lot_size_acres} acres` : ''}${attributes.zoning ? `, Zoned: ${attributes.zoning}` : ''}`,
      yearBuilt: attributes.year_built 
        ? `Built in ${attributes.year_built}, approximately ${new Date().getFullYear() - attributes.year_built} years old` 
        : '',
      squareFootage: attributes.building_area_sq_ft 
        ? `${attributes.building_area_sq_ft.toLocaleString()} sq ft living area` 
        : '',
      constructionType: attributes.construction_type || '',
      numberOfStories: attributes.stories 
        ? `${attributes.stories} ${attributes.stories === 1 ? 'story' : 'stories'}` 
        : '',
      occupancyType: analysis.vacant === 'Y' 
        ? 'Vacant' 
        : (analysis.active === 'Y' ? 'Occupied' : (attributes.occupancy_type || '')),
      rawData: {
        attributes,
        analysis,
        addressComponents
      }
    };

    return new Response(
      JSON.stringify({ 
        success: true,
        data: propertyInfo,
        rawApiResponse: data
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
    
  } catch (error) {
    console.error("Error processing request:", error);
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        success: false 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});