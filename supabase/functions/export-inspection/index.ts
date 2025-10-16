import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { 
      headers: corsHeaders,
      status: 200 
    });
  }

  try {
    const { inspectionId, format = 'json', email } = await req.json();
    
    if (!inspectionId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Inspection ID is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    if (!email) {
      return new Response(
        JSON.stringify({ success: false, error: 'Email address is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log(`Exporting inspection ${inspectionId} in ${format} format to ${email}`);

    // Initialize Supabase
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

    // Fetch inspector details
    console.log('Fetching inspector details...');
    const { data: inspector } = await supabase
      .from('users')
      .select('email, full_name')
      .eq('id', inspection.inspector_id)
      .single();

    // Extract latitude and longitude from property_api_data
    let latitude = null;
    let longitude = null;
    
    if (inspection.property_api_data) {
      const propertyData = inspection.property_api_data;
      latitude = propertyData.latitude || propertyData.lat || null;
      longitude = propertyData.longitude || propertyData.lng || propertyData.lon || null;
    }

    // Build export data
    const exportData = {
      inspection: {
        id: inspection.id,
        address: inspection.address,
        date: inspection.date,
        status: inspection.status,
        syncStatus: inspection.sync_status,
        inspectorId: inspection.inspector_id,
        inspectorName: inspector?.full_name || inspector?.email || 'Unknown',
        latitude: latitude,
        longitude: longitude,
        createdAt: inspection.created_at,
        updatedAt: inspection.updated_at,
      },
      categories: inspection.categories,
      propertyApiData: inspection.property_api_data || null,
      propertyOutline: inspection.property_outline || null,
      measurements: inspection.measurements || {},
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
        recipientEmail: email,
      }
    };

    console.log('Export data structure:', JSON.stringify(exportData, null, 2));

    // Send to n8n webhook
    const n8nWebhookUrl = Deno.env.get("N8N_WEBHOOK_URL");
    
    if (n8nWebhookUrl) {
      console.log('Sending data to n8n webhook...');
      try {
        const webhookResponse = await fetch(n8nWebhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(exportData),
        });

        if (!webhookResponse.ok) {
          console.error('n8n webhook error:', await webhookResponse.text());
        } else {
          console.log('Successfully sent to n8n webhook');
        }
      } catch (webhookError) {
        console.error('Failed to send to n8n webhook:', webhookError);
      }
    } else {
      console.warn('N8N_WEBHOOK_URL not configured, skipping webhook');
    }

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