// Define CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
  'Access-Control-Max-Age': '86400',
};

interface SmartyPropertyResponse {
  results?: Array<{
    analysis?: {
      active?: string;
      vacant?: string;
    };
    attributes?: {
      lot_size_acres?: number;
      living_area?: number;
      year_built?: number;
      stories?: number;
      construction_type?: string;
      zoning?: string;
      occupancy_type?: string;
      parcel_number?: string;
    };
    address?: {
      street?: string;
      city?: string;
      state?: string;
      zipcode?: string;
    };
  }>;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { 
      headers: corsHeaders,
      status: 200 
    });
  }

  try {
    const { address } = await req.json();
    console.log("Received address for lookup:", address);
    
    if (!address) {
      console.error("No address provided");
      return new Response(
        JSON.stringify({ error: 'Address is required' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    // Get the Smarty API credentials from environment variables
    const authId = Deno.env.get('SMARTY_AUTH_ID');
    const authToken = Deno.env.get('SMARTY_AUTH_TOKEN');
    console.log("Using Smarty Auth ID:", authId ? "Found" : "Not found");
    console.log("Using Smarty Auth Token:", authToken ? "Found" : "Not found");
    
    if (!authId || !authToken) {
      console.error("Smarty API credentials not configured");
      return new Response(
        JSON.stringify({ error: 'Smarty API credentials not configured' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }

    // Call Smarty US Street API first to validate and standardize address
    const streetApiUrl = `https://us-street.api.smartystreets.com/street-address?auth-id=${authId}&auth-token=${authToken}&street=${encodeURIComponent(address)}&candidates=1`;
    console.log("Calling Smarty Street API URL:", streetApiUrl.replace(authToken, '[REDACTED]'));
    
    const streetResponse = await fetch(streetApiUrl, {
      headers: {
        'Host': 'us-street.api.smartystreets.com',
        'User-Agent': 'Home Inspection Pro/1.0'
      }
    });
    console.log("Street API response status:", streetResponse.status);
    
    if (!streetResponse.ok) {
      const errorText = await streetResponse.text();
      console.error("Street API error:", errorText);
      return new Response(
        JSON.stringify({ 
          error: `Street API error: ${streetResponse.status}`,
          details: errorText
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }
    
    const streetData = await streetResponse.json();
    console.log("Street API response data:", JSON.stringify(streetData).substring(0, 200) + "...");

    if (!streetData || streetData.length === 0) {
      console.error("Address not found or invalid");
      return new Response(
        JSON.stringify({ error: 'Address not found or invalid' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404,
        }
      );
    }

    const validatedAddress = streetData[0];
    const fullAddress = `${validatedAddress.delivery_line_1}, ${validatedAddress.last_line}`;
    console.log("Validated address:", fullAddress);

    // Now call Property API for detailed property information
    const propertyApiUrl = `https://us-property.api.smartystreets.com/lookup?auth-id=${authId}&auth-token=${authToken}&street=${encodeURIComponent(validatedAddress.delivery_line_1)}&city=${encodeURIComponent(validatedAddress.components.city_name)}&state=${encodeURIComponent(validatedAddress.components.state_abbreviation)}&zipcode=${encodeURIComponent(validatedAddress.components.zipcode)}`;
    console.log("Calling Smarty Property API URL:", propertyApiUrl.replace(authToken, '[REDACTED]'));
    
    const propertyResponse = await fetch(propertyApiUrl, {
      headers: {
        'Host': 'us-property.api.smartystreets.com',
        'User-Agent': 'Home Inspection Pro/1.0'
      }
    });
    console.log("Property API response status:", propertyResponse.status);
    
    if (!propertyResponse.ok) {
      const errorText = await propertyResponse.text();
      console.error("Property API error:", errorText);
      return new Response(
        JSON.stringify({ 
          error: `Property API error: ${propertyResponse.status}`,
          details: errorText
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }
    
    const propertyData: SmartyPropertyResponse = await propertyResponse.json();
    console.log("Property API response data:", JSON.stringify(propertyData).substring(0, 200) + "...");

    if (!propertyData.results || propertyData.results.length === 0) {
      console.error("Property data not found");
      return new Response(
        JSON.stringify({ 
          error: 'Property data not found',
          validatedAddress: fullAddress 
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404,
        }
      );
    }

    const property = propertyData.results[0];
    const attributes = property.attributes || {};
    const analysis = property.analysis || {};

    // Format the response for our Property ID form
    const propertyInfo = {
      propertyAddress: fullAddress,
      parcelInformation: attributes.parcel_number ? 
        `Parcel #: ${attributes.parcel_number}${attributes.lot_size_acres ? `, Lot Size: ${attributes.lot_size_acres} acres` : ''}${attributes.zoning ? `, Zoned: ${attributes.zoning}` : ''}` : 
        `${attributes.lot_size_acres ? `Lot Size: ${attributes.lot_size_acres} acres` : ''}${attributes.zoning ? `, Zoned: ${attributes.zoning}` : ''}`,
      yearBuilt: attributes.year_built ? 
        `Built in ${attributes.year_built}, approximately ${new Date().getFullYear() - attributes.year_built} years old` : '',
      squareFootage: attributes.living_area ? 
        `${attributes.living_area.toLocaleString()} sq ft living area` : '',
      constructionType: attributes.construction_type || '',
      numberOfStories: attributes.stories ? 
        `${attributes.stories} ${attributes.stories === 1 ? 'story' : 'stories'}` : '',
      occupancyType: analysis.vacant === 'Y' ? 'Vacant' : 
        (analysis.active === 'Y' ? 'Occupied' : 
        (attributes.occupancy_type || '')),
      rawData: {
        attributes,
        analysis,
        validatedAddress
      }
    };

    console.log("Returning property info:", JSON.stringify(propertyInfo).substring(0, 200) + "...");
    return new Response(
      JSON.stringify({ success: true, data: propertyInfo }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Smarty API Error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to fetch property data',
        details: error.message 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});