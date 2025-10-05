import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log("Handling OPTIONS preflight request");
    return new Response('ok', { 
      headers: corsHeaders,
      status: 200 
    });
  }

  try {
    console.log("Property lookup edge function called");
    
    let address;
    try {
      const body = await req.json();
      address = body.address;
      console.log("Received address:", address);
    } catch (parseError) {
      console.error("Error parsing request body:", parseError);
      return new Response(
        JSON.stringify({ 
          error: 'Invalid request body',
          success: false 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }
    
    if (!address || typeof address !== 'string' || address.trim().length < 5) {
      console.error("Invalid address provided:", address);
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
    
    console.log("Smarty credentials available:", !!authId, !!authToken);
    
    if (!authId || !authToken) {
      console.log("Using mock data - credentials not available");
      return new Response(
        JSON.stringify({ 
          success: true,
          data: getMockPropertyData(address),
          message: "Using mock data - Smarty API credentials not found"
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    }
    
    // Make the actual API call to Smarty
    console.log("Making API call to Smarty...");
    
    // Prepare the request to Smarty US Address Enrichment API
    const smartyUrl = "https://us-enrichment.api.smartystreets.com/lookup";
    const requestBody = {
      address: address,
      include_all: true
    };

    // Create Basic Auth header
    const credentials = `${authId}:${authToken}`;
    const encodedCredentials = btoa(credentials);

    // Make the API call to Smarty
    const response = await fetch(smartyUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${encodedCredentials}`
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Smarty API error (${response.status}): ${errorText}`);
      
      return new Response(
        JSON.stringify({ 
          success: true,
          data: getMockPropertyData(address),
          message: `Using mock data - API error: ${response.status}`
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    }

    const smartyData = await response.json();
    console.log("Smarty API response received");

    // Transform Smarty API response to our application's format
    const propertyData = transformSmartyResponse(smartyData, address);

    return new Response(
      JSON.stringify({ 
        success: true,
        data: propertyData,
        message: "Data retrieved from Smarty API"
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
        success: true,
        data: getMockPropertyData(""),
        message: "Using mock data - Error processing request",
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  }
});

// Helper function to transform Smarty API response
function transformSmartyResponse(smartyData: any, originalAddress: string) {
  let propertyData = {
    propertyAddress: originalAddress,
    parcelInformation: "",
    yearBuilt: "",
    squareFootage: "",
    constructionType: "",
    numberOfStories: "",
    occupancyType: ""
  };

  // Extract relevant data from Smarty response
  if (smartyData && smartyData.results && smartyData.results.length > 0) {
    const result = smartyData.results[0];
    
    // Format address from Smarty response
    if (result.address) {
      propertyData.propertyAddress = `${result.address.street || ""}, ${result.address.city || ""}, ${result.address.state || ""} ${result.address.zipcode || ""}`;
    }
    
    // Extract parcel information
    if (result.property && result.property.parcel) {
      const parcel = result.property.parcel;
      const lotSize = parcel.area_acres || parcel.area_square_feet ? 
        `Lot Size: ${parcel.area_acres ? parcel.area_acres + ' acres' : 
        (parcel.area_square_feet ? Math.round(parcel.area_square_feet) + ' sq ft' : 'Unknown')}` : '';
      
      const zoning = result.property.zoning ? `Zoned: ${result.property.zoning}` : '';
      
      propertyData.parcelInformation = `Parcel #: ${parcel.apn || 'Unknown'}, ${lotSize}, ${zoning}`.trim();
    }
    
    // Extract year built
    if (result.property && result.property.structure && result.property.structure.year_built) {
      const yearBuilt = result.property.structure.year_built;
      const age = new Date().getFullYear() - yearBuilt;
      propertyData.yearBuilt = `Built in ${yearBuilt}, approximately ${age} years old`;
    }
    
    // Extract square footage
    if (result.property && result.property.structure && result.property.structure.area_square_feet) {
      const sqft = result.property.structure.area_square_feet;
      propertyData.squareFootage = `${sqft.toLocaleString()} sq ft living area`;
    }
    
    // Extract construction type
    if (result.property && result.property.structure) {
      const structure = result.property.structure;
      const constructionType = structure.construction_type || 'Unknown';
      const exteriorWall = structure.exterior_wall || '';
      
      propertyData.constructionType = `${constructionType} construction${exteriorWall ? ' with ' + exteriorWall : ''}`;
    }
    
    // Extract number of stories
    if (result.property && result.property.structure && result.property.structure.stories) {
      propertyData.numberOfStories = `${result.property.structure.stories} ${result.property.structure.stories === 1 ? 'story' : 'stories'}`;
    }
    
    // Extract occupancy type
    if (result.property && result.property.summary) {
      propertyData.occupancyType = result.property.summary.occupancy_status || 'Unknown';
    }
  }

  return propertyData;
}

// Helper function to generate mock property data
function getMockPropertyData(address: string) {
  return {
    propertyAddress: address || "1600 Pennsylvania Ave, Washington DC",
    parcelInformation: `Parcel #: 123-456-789, Lot Size: 0.25 acres, Zoned: R-1 Residential`,
    yearBuilt: `Built in 1985, approximately 38 years old`,
    squareFootage: `2,150 sq ft living area`,
    constructionType: `Wood frame construction with vinyl siding`,
    numberOfStories: `2 stories`,
    occupancyType: `Owner-occupied`,
  };
}