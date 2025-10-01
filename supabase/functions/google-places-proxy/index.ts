import { corsHeaders } from "@shared/cors.ts";

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { 
      headers: corsHeaders,
      status: 200 
    });
  }

  try {
    const { query } = await req.json();
    
    if (!query || query.length < 2) {
      return new Response(
        JSON.stringify({ error: 'Query must be at least 2 characters' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    const apiKey = Deno.env.get('EXPO_PUBLIC_GOOGLE_MAPS_API_KEY');
    if (!apiKey) {
      throw new Error('Google Maps API key not configured');
    }

    const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(query)}&key=${apiKey}&types=address`;
    
    const response = await fetch(url);
    const data = await response.json();

    return new Response(
      JSON.stringify(data),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
