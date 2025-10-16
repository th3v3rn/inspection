import { corsHeaders } from "@shared/cors.ts";

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

const INSPECTION_CATEGORIES = [
  "Property ID",
  "Attached Structures",
  "HVAC",
  "Interior",
  "Foundation",
  "Plumbing",
  "Roof",
  "Electrical",
  "Hazards",
  "Exterior",
  "Finish Up",
  "Systems and Utilities"
];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { 
      headers: corsHeaders,
      status: 200 
    });
  }

  try {
    const { imageUrl } = await req.json();

    if (!imageUrl) {
      return new Response(
        JSON.stringify({ error: "imageUrl is required" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    if (!OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({ error: "OpenAI API key not configured" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        }
      );
    }

    // Call OpenAI Vision API with enhanced granular detection
    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are an AI assistant that analyzes property inspection photos with granular detail.

Your task is to:
1. Identify the primary inspection category from this list:
${INSPECTION_CATEGORIES.map((cat, i) => `${i + 1}. ${cat}`).join('\n')}

2. Detect ALL specific objects, materials, and features visible in the image, including but not limited to:

EXTERIOR FEATURES:
- Siding types (vinyl, wood, fiber cement, brick, stone, stucco, aluminum, etc.)
- Roof materials (asphalt shingles, tile, metal, slate, wood shake, etc.)
- Roof types (gable, hip, flat, mansard, gambrel, shed, etc.)
- Windows (single-hung, double-hung, casement, bay, skylight, etc.)
- Doors (entry, sliding glass, French, garage, etc.)
- Trim and fascia materials
- Gutters and downspouts
- Landscaping features (trees, shrubs, lawn, garden beds, etc.)
- Fountains, water features, ponds
- Fencing (wood, vinyl, chain-link, wrought iron, etc.)
- Driveways and walkways (concrete, asphalt, pavers, gravel, etc.)
- Decks, patios, porches (material and condition)

STRUCTURAL:
- Foundation type (slab, crawl space, basement, pier & beam)
- Construction materials (wood frame, brick, concrete block, steel, etc.)
- Number of stories
- Architectural style

HVAC & MECHANICAL:
- HVAC units (central air, heat pump, window units, etc.)
- Ductwork
- Vents and registers
- Thermostats

ELECTRICAL:
- Electrical panels and breaker boxes
- Outlets and switches
- Light fixtures
- Wiring (visible)
- Service entrance and meter

PLUMBING:
- Fixtures (sinks, toilets, tubs, showers, faucets)
- Water heaters
- Pipes (copper, PVC, galvanized, etc.)
- Drains and vents

INTERIOR:
- Flooring (hardwood, carpet, tile, laminate, vinyl, etc.)
- Wall finishes (drywall, paneling, tile, wallpaper, etc.)
- Ceiling types (drywall, popcorn, coffered, etc.)
- Cabinets and countertops
- Appliances
- Fireplaces (gas, wood, electric, etc.)

SAFETY & HAZARDS:
- Smoke detectors
- Carbon monoxide detectors
- Fire extinguishers
- Handrails and guardrails
- Trip hazards
- Damaged or deteriorating materials

Return your response as JSON with:
{
  "category": "exact category name from list",
  "confidence": 0.0-1.0,
  "description": "brief overall description",
  "detectedObjects": [
    {
      "name": "specific object name",
      "type": "object category",
      "material": "material if applicable",
      "condition": "good/fair/poor/unknown",
      "confidence": 0.0-1.0,
      "notes": "any relevant details"
    }
  ],
  "suggestedFields": {
    "fieldName": "suggested value based on what you see"
  }
}`
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Analyze this property inspection image in detail. Identify the category and detect all specific objects, materials, and features. Respond with JSON only."
              },
              {
                type: "image_url",
                image_url: {
                  url: imageUrl,
                  detail: "high"
                }
              }
            ]
          }
        ],
        max_tokens: 1500,
        temperature: 0.3
      }),
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      console.error("OpenAI API error:", errorText);
      return new Response(
        JSON.stringify({ 
          error: "OpenAI API error",
          details: errorText 
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        }
      );
    }

    const openaiData = await openaiResponse.json();
    const content = openaiData.choices[0]?.message?.content || "{}";

    // Parse JSON response
    let result;
    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      result = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
    } catch (parseError) {
      console.error("Failed to parse OpenAI response:", content);
      result = {
        category: "Unknown",
        confidence: 0,
        description: "Failed to categorize image",
        detectedObjects: [],
        suggestedFields: {}
      };
    }

    // Validate category
    if (!INSPECTION_CATEGORIES.includes(result.category)) {
      // Try to find closest match
      const lowerCategory = result.category?.toLowerCase() || "";
      const match = INSPECTION_CATEGORIES.find(cat => 
        cat.toLowerCase().includes(lowerCategory) || 
        lowerCategory.includes(cat.toLowerCase())
      );
      
      if (match) {
        result.category = match;
      } else {
        result.category = "Unknown";
        result.confidence = 0;
      }
    }

    // Ensure detectedObjects array exists
    if (!result.detectedObjects) {
      result.detectedObjects = [];
    }

    // Ensure suggestedFields object exists
    if (!result.suggestedFields) {
      result.suggestedFields = {};
    }

    return new Response(
      JSON.stringify(result),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error in ai-image-categorizer:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        category: "Unknown",
        confidence: 0,
        detectedObjects: [],
        suggestedFields: {}
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});