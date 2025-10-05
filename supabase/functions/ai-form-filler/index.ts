import { corsHeaders } from "@shared/cors.ts";

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { 
      headers: corsHeaders,
      status: 200 
    });
  }

  try {
    const { prompt } = await req.json();

    if (!prompt) {
      return new Response(
        JSON.stringify({ error: 'Prompt is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('Processing prompt:', prompt);

    // Enhanced prompt to ensure consistent JSON response
    const enhancedPrompt = `${prompt}

Please respond with ONLY a valid JSON object in this exact format:
{
  "mappings": [
    {
      "fieldId": "roofType",
      "value": "extracted roof type value",
      "confidence": 0.9
    },
    {
      "fieldId": "sidingType", 
      "value": "extracted siding value",
      "confidence": 0.8
    }
  ],
  "unmappedText": "any text that couldn't be mapped"
}

Extract information for these field IDs: roofType, sidingType, foundationAndStructure, windowsAndDoors, propertyHazards, generalNotes. Only include mappings where you found relevant information with confidence > 0.7.`;

    // Call OpenAI API
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are an AI assistant that extracts structured data from property inspection voice notes. You must respond with valid JSON in the exact format requested. Be precise and only extract information you are confident about.'
          },
          {
            role: 'user',
            content: enhancedPrompt
          }
        ],
        temperature: 0.1,
        max_tokens: 1000,
      }),
    });

    if (!openaiResponse.ok) {
      throw new Error(`OpenAI API error: ${openaiResponse.statusText}`);
    }

    const openaiResult = await openaiResponse.json();
    const aiContent = openaiResult.choices[0]?.message?.content;

    if (!aiContent) {
      throw new Error('No response from AI');
    }

    console.log('AI raw response:', aiContent);

    // Parse the AI response as JSON
    let parsedResponse;
    try {
      parsedResponse = JSON.parse(aiContent);
      
      // Ensure the response has the expected structure
      if (!parsedResponse.mappings || !Array.isArray(parsedResponse.mappings)) {
        parsedResponse = {
          mappings: [],
          unmappedText: aiContent
        };
      }
    } catch (parseError) {
      console.error('JSON parsing failed:', parseError);
      // If JSON parsing fails, create a fallback response
      parsedResponse = {
        mappings: [],
        unmappedText: aiContent
      };
    }

    console.log('Final parsed response:', parsedResponse);

    return new Response(
      JSON.stringify(parsedResponse),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('AI form filler error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Failed to process voice input',
        details: error.message 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});