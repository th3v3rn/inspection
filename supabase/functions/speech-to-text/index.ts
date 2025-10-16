import { corsHeaders } from "@shared/cors.ts";

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { audioBase64, mimeType } = await req.json();
    
    if (!audioBase64) {
      throw new Error('No audio data provided');
    }

    console.log('Received audio data, mime type:', mimeType);
    console.log('Audio data length:', audioBase64.length);

    // Call OpenAI Whisper API instead of Google Speech-to-Text
    const apiKey = Deno.env.get('OPENAI_API_KEY');
    if (!apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Convert base64 to blob
    const audioBuffer = Uint8Array.from(atob(audioBase64), c => c.charCodeAt(0));
    const audioBlob = new Blob([audioBuffer], { type: mimeType || 'audio/m4a' });

    // Create form data for Whisper API
    const formData = new FormData();
    formData.append('file', audioBlob, 'audio.m4a');
    formData.append('model', 'whisper-1');
    formData.append('language', 'en');

    console.log('Calling OpenAI Whisper API...');
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
      body: formData
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI Whisper API error:', response.status, errorText);
      throw new Error(`OpenAI Whisper API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log('OpenAI Whisper API response:', result);

    const transcript = result.text || 'No speech detected in the audio. Please speak clearly and try again.';

    return new Response(
      JSON.stringify({ transcript }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        transcript: 'Error processing audio. Please try again.'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});