const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders, status: 200 });
  }

  try {
    console.log('=== Smarty Property Lookup Started ===');
    
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

    console.log('Auth ID exists:', !!authId);
    console.log('Auth Token exists:', !!authToken);

    if (!authId || !authToken) {
      return new Response(
        JSON.stringify({ success: false, error: 'Smarty credentials not configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // Step 1: Validate address with US Street API
    const streetUrl = `https://us-street.api.smarty.com/street-address?auth-id=${authId}&auth-token=${authToken}&street=${encodeURIComponent(address)}`;
    
    console.log('Step 1: Validating address with Street API...');
    const streetResponse = await fetch(streetUrl);
    
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
      return new Response(
        JSON.stringify({ success: false, error: 'Address not found or invalid' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    const validatedAddress = streetData[0];
    const components = validatedAddress.components;

    // Step 2: Get property data using US Enrichment API
    const propertyUrl = `https://us-enrichment.api.smarty.com/lookup?auth-id=${authId}&auth-token=${authToken}&street=${encodeURIComponent(validatedAddress.delivery_line_1)}&city=${encodeURIComponent(components.city_name)}&state=${encodeURIComponent(components.state_abbreviation)}&zipcode=${encodeURIComponent(components.zipcode)}&dataset=property`;
    
    console.log('Step 2: Getting property data...');
    const propertyResponse = await fetch(propertyUrl);
    
    console.log('Property API status:', propertyResponse.status);
    
    if (!propertyResponse.ok) {
      const errorText = await propertyResponse.text();
      console.error('Property API error:', propertyResponse.status, errorText);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Property lookup failed: ${propertyResponse.status}`,
          details: errorText,
          message: propertyResponse.status === 402 ? 'Payment Required - Property API access needed' : undefined
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    const propertyData = await propertyResponse.json();
    console.log('Property API response:', JSON.stringify(propertyData, null, 2));

    if (!propertyData || propertyData.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'No property data found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    // Extract property data
    const property = propertyData[0];
    const financial = property.financial || {};
    const structure = property.structure || {};
    
    const formattedData = {
      propertyAddress: validatedAddress.delivery_line_1,
      parcelInformation: property.parcel_id || 'N/A',
      yearBuilt: structure.year_built || 'N/A',
      squareFootage: structure.total_area_sq_ft || 'N/A',
      constructionType: structure.construction_type || 'N/A',
      numberOfStories: structure.stories || 'N/A',
      occupancyType: structure.occupancy_type || 'N/A',
      assessedValue: financial.assessed_value || 'N/A',
      rawData: property
    };

    console.log('Property data extracted successfully');

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