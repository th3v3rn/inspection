import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders, status: 200 });
  }

  try {
    console.log('=== Export function started ===');
    
    // Parse request body
    let body;
    try {
      body = await req.json();
      console.log('Request body:', body);
    } catch (e) {
      console.error('Failed to parse request body:', e);
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid JSON in request body' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const { inspectionId, format = 'json' } = body;

    if (!inspectionId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Inspection ID is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Initialize Supabase - try multiple possible env var names
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || 
                        Deno.env.get("SUPABASE_SERVICE_KEY") ||
                        Deno.env.get("SERVICE_ROLE_KEY");
    
    console.log('Available env vars:', Object.keys(Deno.env.toObject()));
    console.log('Supabase URL exists:', !!supabaseUrl);
    console.log('Service Key exists:', !!supabaseKey);

    if (!supabaseUrl || !supabaseKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'Supabase credentials not configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch inspection
    console.log('Fetching inspection:', inspectionId);
    const { data: inspection, error: inspectionError } = await supabase
      .from('inspections')
      .select('*')
      .eq('id', inspectionId)
      .single();

    if (inspectionError) {
      console.error('Database error:', inspectionError);
      return new Response(
        JSON.stringify({ success: false, error: `Database error: ${inspectionError.message}` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    if (!inspection) {
      return new Response(
        JSON.stringify({ success: false, error: 'Inspection not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    console.log('Inspection found, fetching images...');

    // Fetch images
    const { data: images } = await supabase
      .from('inspection_images')
      .select('*')
      .eq('inspection_id', inspectionId);

    // Build export data
    const exportData = {
      inspection: {
        id: inspection.id,
        address: inspection.address,
        date: inspection.date,
        status: inspection.status,
        syncStatus: inspection.sync_status,
        inspectorId: inspection.inspector_id,
        createdAt: inspection.created_at,
        updatedAt: inspection.updated_at,
      },
      categories: inspection.categories,
      images: images?.map(img => ({
        id: img.id,
        category: img.category,
        imageUrl: img.image_url,
        caption: img.caption,
        uploadedAt: img.uploaded_at,
      })) || [],
      metadata: {
        exportedAt: new Date().toISOString(),
        format: format,
      }
    };

    console.log('Export successful');

    return new Response(
      JSON.stringify({ success: true, data: exportData }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : '';
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage,
        stack: errorStack 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});