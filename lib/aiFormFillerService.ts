interface FormField {
  id: string;
  label: string;
  value: string;
  placeholder: string;
}

interface AIProcessingResult {
  updatedFields: FormField[];
  confidence: number;
  unmappedText?: string;
}

class AIFormFillerService {
  async processTranscriptForCategory(
    transcript: string,
    category: string,
    formFields: FormField[]
  ): Promise<AIProcessingResult> {
    try {
      // Create a prompt for the AI to map transcript to form fields
      const prompt = this.createMappingPrompt(transcript, category, formFields);
      
      // Call OpenAI API (you could also use other AI services)
      const result = await this.callOpenAI(prompt);
      
      return this.parseAIResponse(result, formFields);
    } catch (error) {
      console.error('AI processing failed:', error);
      // Fallback to simple keyword matching
      return this.fallbackKeywordMapping(transcript, formFields);
    }
  }

  private createMappingPrompt(
    transcript: string,
    category: string,
    formFields: FormField[]
  ): string {
    const fieldDescriptions = formFields
      .map(field => `- ${field.label}: ${field.placeholder}`)
      .join('\n');

    return `You are an AI assistant helping with property inspection form filling. 

Category: ${category}
Transcript: "${transcript}"

Available form fields:
${fieldDescriptions}

Please analyze the transcript and extract relevant information for each form field. Return a JSON object with the following structure:
{
  "mappings": [
    {
      "fieldId": "field_id",
      "value": "extracted_value",
      "confidence": 0.95
    }
  ],
  "unmappedText": "any text that couldn't be mapped to fields"
}

Rules:
- Only include mappings where you're confident (>0.7) about the match
- Keep values concise and relevant to the field
- If no relevant information is found for a field, don't include it
- Preserve important details and measurements`;
  }

  private async callOpenAI(prompt: string): Promise<any> {
    // Call our Supabase edge function instead of directly calling OpenAI
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    
    if (!supabaseUrl) {
      throw new Error('Supabase URL not configured');
    }

    const response = await fetch(
      `${supabaseUrl}/functions/v1/supabase-functions-ai-form-filler`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ prompt }),
      }
    );

    if (!response.ok) {
      throw new Error('AI service unavailable');
    }

    return await response.json();
  }

  private parseAIResponse(aiResponse: any, formFields: FormField[]): AIProcessingResult {
    const updatedFields = [...formFields];
    let overallConfidence = 0;
    let mappingCount = 0;

    console.log('AI Response received:', aiResponse);

    if (aiResponse.mappings && Array.isArray(aiResponse.mappings)) {
      aiResponse.mappings.forEach((mapping: any) => {
        console.log('Processing mapping:', mapping);
        const fieldIndex = updatedFields.findIndex(f => f.id === mapping.fieldId);
        if (fieldIndex !== -1 && mapping.confidence > 0.7) {
          updatedFields[fieldIndex] = {
            ...updatedFields[fieldIndex],
            value: mapping.value
          };
          overallConfidence += mapping.confidence;
          mappingCount++;
          console.log(`Updated field ${mapping.fieldId} with value: ${mapping.value}`);
        }
      });
    } else {
      console.log('No mappings found in AI response or mappings is not an array');
    }

    const result = {
      updatedFields,
      confidence: mappingCount > 0 ? overallConfidence / mappingCount : 0,
      unmappedText: aiResponse.unmappedText
    };

    console.log('Final result:', result);
    return result;
  }

  private fallbackKeywordMapping(
    transcript: string,
    formFields: FormField[]
  ): AIProcessingResult {
    const updatedFields = [...formFields];
    const lowerTranscript = transcript.toLowerCase();
    let mappingCount = 0;

    // Enhanced keyword mapping for both exterior and HVAC inspection fields
    const keywordMappings = {
      // Exterior fields
      rooftype: {
        keywords: ['roof', 'shingle', 'shingles', 'tile', 'tiles', 'metal roof', 'asphalt', 'slate', 'cedar', 'composite', 'membrane', 'flat roof', 'pitched roof'],
        patterns: ['roof is', 'roofing material', 'roof type', 'covered with', 'roofed with']
      },
      sidingtype: {
        keywords: ['siding', 'vinyl', 'wood siding', 'brick', 'stucco', 'fiber cement', 'aluminum', 'cedar', 'clapboard', 'board and batten', 'stone veneer'],
        patterns: ['siding is', 'exterior is', 'walls are', 'covered in', 'sided with']
      },
      foundationandstructure: {
        keywords: ['foundation', 'basement', 'crawl space', 'slab', 'concrete', 'block', 'stone', 'pier', 'beam', 'structural', 'crack', 'settlement', 'footing'],
        patterns: ['foundation is', 'built on', 'structural', 'foundation type', 'cracks in']
      },
      windowsanddoors: {
        keywords: ['window', 'windows', 'door', 'doors', 'glass', 'frame', 'frames', 'sill', 'double hung', 'casement', 'sliding', 'french door', 'entry door', 'storm door', 'screen'],
        patterns: ['windows are', 'doors are', 'window condition', 'door condition', 'glass is']
      },
      propertyhazards: {
        keywords: ['hazard', 'danger', 'unsafe', 'damaged', 'broken', 'cracked', 'loose', 'missing', 'trip hazard', 'safety', 'concern', 'risk', 'deteriorated', 'rotted'],
        patterns: ['safety concern', 'hazard', 'dangerous', 'needs repair', 'damaged', 'broken']
      },
      // HVAC fields
      hvactype: {
        keywords: ['hvac', 'air conditioning', 'heating', 'furnace', 'boiler', 'heat pump', 'central air', 'ductless', 'mini split', 'geothermal', 'radiant', 'baseboard', 'forced air'],
        patterns: ['hvac system', 'heating system', 'cooling system', 'air conditioner', 'furnace type', 'heat pump']
      },
      age: {
        keywords: ['years old', 'installed', 'replaced', 'new', 'old', 'vintage', 'recent', 'age', 'manufactured', 'built'],
        patterns: ['installed in', 'years old', 'replaced in', 'age of', 'manufactured', 'built in']
      },
      ductwork: {
        keywords: ['duct', 'ducts', 'ductwork', 'vents', 'registers', 'grilles', 'insulation', 'flex duct', 'metal duct', 'leak', 'sealed'],
        patterns: ['ductwork is', 'ducts are', 'vents are', 'duct condition', 'insulated', 'duct leaks']
      },
      maintenanceindicators: {
        keywords: ['filter', 'filters', 'maintenance', 'service', 'cleaned', 'dirty', 'replaced', 'serviced', 'tune up', 'inspection sticker'],
        patterns: ['filter is', 'last serviced', 'maintenance', 'recently cleaned', 'needs service', 'filter changed']
      },
      condition: {
        keywords: ['condition', 'working', 'functioning', 'operational', 'broken', 'needs repair', 'excellent', 'good', 'fair', 'poor', 'efficiency'],
        patterns: ['condition is', 'working well', 'needs repair', 'functioning', 'operates', 'efficiency']
      },
      generalnotes: {
        keywords: ['overall', 'general', 'condition', 'note', 'observation', 'additional', 'also', 'furthermore', 'appears', 'seems'],
        patterns: ['overall', 'in general', 'additionally', 'also noted', 'appears to be']
      }
    };

    updatedFields.forEach((field, index) => {
      const fieldId = field.id.toLowerCase().replace(/[^a-z]/g, '');
      const mapping = keywordMappings[fieldId as keyof typeof keywordMappings];
      
      if (mapping && !field.value) {
        // Check for keyword matches
        const matchingKeywords = mapping.keywords.filter(keyword => 
          lowerTranscript.includes(keyword)
        );
        
        // Check for pattern matches
        const matchingPatterns = mapping.patterns.filter(pattern =>
          lowerTranscript.includes(pattern)
        );
        
        if (matchingKeywords.length > 0 || matchingPatterns.length > 0) {
          // Extract relevant sentences containing the keywords/patterns
          const sentences = transcript.split(/[.!?]+/);
          const relevantSentences = sentences.filter(sentence => {
            const lowerSentence = sentence.toLowerCase();
            return matchingKeywords.some(keyword => lowerSentence.includes(keyword)) ||
                   matchingPatterns.some(pattern => lowerSentence.includes(pattern));
          });
          
          if (relevantSentences.length > 0) {
            // Combine relevant sentences, limit to reasonable length
            let combinedText = relevantSentences.join('. ').trim();
            if (combinedText.length > 200) {
              combinedText = combinedText.substring(0, 200) + '...';
            }
            
            updatedFields[index] = {
              ...field,
              value: combinedText
            };
            mappingCount++;
          }
        }
      }
    });

    return {
      updatedFields,
      confidence: mappingCount > 0 ? Math.min(0.8, 0.6 + (mappingCount * 0.1)) : 0,
      unmappedText: mappingCount === 0 ? transcript : undefined
    };
  }
}

export const aiFormFillerService = new AIFormFillerService();