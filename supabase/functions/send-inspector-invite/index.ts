import { corsHeaders } from "@shared/cors.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('Received request to send inspector invite');
    const body = await req.json();
    console.log('Request body:', JSON.stringify(body));
    
    const { email, adminId, organizationName } = body;

    if (!email || !adminId) {
      console.error('Missing required fields:', { email: !!email, adminId: !!adminId });
      return new Response(
        JSON.stringify({ error: 'Email and adminId are required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing environment variables');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Creating Supabase client');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const invitationToken = crypto.randomUUID();
    console.log('Generated invitation token');

    console.log('Inserting invitation record');
    const { data: invitation, error: invitationError } = await supabase
      .from('inspector_invitations')
      .insert({
        email: email,
        admin_id: adminId,
        status: 'pending',
        invitation_token: invitationToken
      })
      .select()
      .single();

    if (invitationError) {
      console.error('Error creating invitation:', JSON.stringify(invitationError));
      return new Response(
        JSON.stringify({ error: 'Failed to create invitation', details: invitationError }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Invitation record created:', invitation.id);

    console.log('Sending auth invite email');
    const inviteResponse = await fetch(`${supabaseUrl}/auth/v1/invite`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json',
        'apikey': supabaseServiceKey
      },
      body: JSON.stringify({
        email: email,
        data: {
          admin_id: adminId,
          organization_name: organizationName,
          role: 'inspector',
          invitation_token: invitationToken
        }
      })
    });

    if (!inviteResponse.ok) {
      const error = await inviteResponse.text();
      console.error('Supabase invite error:', error);
      
      console.log('Deleting invitation record due to email failure');
      await supabase
        .from('inspector_invitations')
        .delete()
        .eq('id', invitation.id);
      
      return new Response(
        JSON.stringify({ error: 'Failed to send invitation email', details: error }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const inviteData = await inviteResponse.json();
    console.log('Invitation sent successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Invitation sent successfully',
        data: inviteData 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    console.error('Error stack:', error.stack);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: error.message,
        stack: error.stack 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});