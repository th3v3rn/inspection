const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders, status: 200 });
  }

  try {
    console.log('=== Smarty Property Lookup V4 Started ===');
    
    const { address } = await req.json();
    console.log('Address to lookup:', address);

    if (!address) {
      return new Response(
        JSON.stringify({ success: false, error: 'Address is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const authId = Deno.env.get("SMARTY_AUTH_ID");
    const authToken = Deno.env.get("SMARTY_AUTH_TOKEN");

    if (!authId || !authToken) {
      return new Response(
        JSON.stringify({ success: false, error: 'Smarty credentials not configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // Step 1: Basic Street API call for address validation (no license)
    const streetUrl = `https://us-street.api.smarty.com/street-address?auth-id=${authId}&auth-token=${authToken}&street=${encodeURIComponent(address)}`;
    
    console.log('Step 1: Basic address validation...');
    const streetResponse = await fetch(streetUrl);
    
    console.log('Street API response status:', streetResponse.status);
    
    if (!streetResponse.ok) {
      const errorText = await streetResponse.text();
      console.error('Street API error:', streetResponse.status, errorText);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Address validation failed: ${streetResponse.status}`,
          details: errorText
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    const streetData = await streetResponse.json();
    console.log('Street API response:', JSON.stringify(streetData, null, 2));

    if (!streetData || streetData.length === 0) {
      console.log('No street data returned');
      return new Response(
        JSON.stringify({ success: false, error: 'Address not found or invalid' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    const validatedAddress = streetData[0];
    const components = validatedAddress.components;
    const metadata = validatedAddress.metadata;
    
    console.log('Validated address:', validatedAddress.delivery_line_1);

    // Step 2: Property lookup using freeform search
    const freeformUrl = `https://us-enrichment.api.smarty.com/lookup/search/property/principal?auth-id=${authId}&auth-token=${authToken}&freeform=${encodeURIComponent(address)}`;
    console.log('Property lookup - Freeform URL:', freeformUrl);
    
    const freeformResponse = await fetch(freeformUrl);
    console.log('Property API status:', freeformResponse.status);
    
    let propertyData = null;
    
    if (freeformResponse.ok) {
      const freeformData = await freeformResponse.json();
      console.log('Property data received:', JSON.stringify(freeformData, null, 2));
      
      if (freeformData && freeformData.length > 0) {
        propertyData = freeformData[0];
        console.log('Property data found via freeform search');
      }
    } else {
      const errorText = await freeformResponse.text();
      console.log('Property API error:', freeformResponse.status, errorText);
    }

    // Format the response data
    const formattedData = {
      propertyAddress: validatedAddress.delivery_line_1,
      fullAddress: `${validatedAddress.delivery_line_1}, ${components.city_name}, ${components.state_abbreviation} ${components.zipcode}`,
      city: components.city_name,
      state: components.state_abbreviation,
      zipcode: components.zipcode,
      county: metadata.county_name,
      latitude: metadata.latitude,
      longitude: metadata.longitude,
      residentialDeliveryIndicator: metadata.rdi,
      timeZone: metadata.time_zone,
      congressionalDistrict: metadata.congressional_district,
    };

    // Add property data if available
    if (propertyData) {
      console.log('Property data found:', JSON.stringify(propertyData, null, 2));
      
      formattedData.parcelInformation = propertyData.parcel_id || 'N/A';
      formattedData.yearBuilt = propertyData.year_built || 'N/A';
      formattedData.squareFootage = propertyData.total_area_sq_ft || 'N/A';
      formattedData.constructionType = propertyData.construction_type || 'N/A';
      formattedData.numberOfStories = propertyData.stories || 'N/A';
      formattedData.occupancyType = propertyData.occupancy_type || 'N/A';
      formattedData.assessedValue = propertyData.assessed_value || 'N/A';
      formattedData.propertyData = propertyData;
      formattedData.message = 'Address validated and property data retrieved successfully';
    } else {
      console.log('No property data available');
      formattedData.parcelInformation = 'N/A';
      formattedData.yearBuilt = 'N/A';
      formattedData.squareFootage = 'N/A';
      formattedData.constructionType = 'N/A';
      formattedData.numberOfStories = 'N/A';
      formattedData.occupancyType = 'N/A';
      formattedData.assessedValue = 'N/A';
      formattedData.message = 'Address validated successfully. Property data not available for this address.';
    }

    formattedData.streetApiData = validatedAddress;

    console.log('Returning formatted data');

    return new Response(
      JSON.stringify({ success: true, data: formattedData }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});