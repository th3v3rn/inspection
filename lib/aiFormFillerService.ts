interface FormField {
  id: string;
  label: string;
  value: any;
  placeholder?: string;
  type?: string;
  options?: string[];
  keyboardType?: string;
}

interface AIFormFillerResult {
  updatedFields: Array<{ id: string; value: any; confidence: number }>;
  confidence: number;
  rawResponse?: string;
}

class AIFormFillerService {
  private openaiApiKey: string;

  constructor() {
    this.openaiApiKey = process.env.OPENAI_API_KEY || "";
  }

  /**
   * Process transcript for a specific category with field definitions
   */
  async processTranscriptForCategory(
    transcript: string,
    category: string,
    formFields: FormField[]
  ): Promise<AIFormFillerResult> {
    console.log("=== AI Form Filler Processing ===");
    console.log("Category:", category);
    console.log("Transcript:", transcript);
    console.log("Form fields:", JSON.stringify(formFields, null, 2));

    try {
      // First try keyword-based fallback for better accuracy
      const keywordResult = this.keywordBasedFallback(
        transcript,
        category,
        formFields
      );

      // Then enhance with OpenAI for more complex parsing
      const aiResult = await this.processWithOpenAI(
        transcript,
        category,
        formFields
      );

      // Merge results, preferring keyword matches when confidence is high
      const mergedFields = this.mergeResults(
        keywordResult.updatedFields,
        aiResult.updatedFields,
        formFields
      );

      return {
        updatedFields: mergedFields,
        confidence: Math.max(keywordResult.confidence, aiResult.confidence),
        rawResponse: aiResult.rawResponse,
      };
    } catch (error) {
      console.error("AI processing error:", error);
      // Fall back to keyword-only processing
      return this.keywordBasedFallback(transcript, category, formFields);
    }
  }

  /**
   * Enhanced keyword-based fallback with support for all categories
   */
  private keywordBasedFallback(
    transcript: string,
    category: string,
    formFields: FormField[]
  ): AIFormFillerResult {
    const lowerTranscript = transcript.toLowerCase();
    const updatedFields: Array<{ id: string; value: any; confidence: number }> = [];

    // Category-specific keyword mappings
    const categoryKeywords = this.getCategoryKeywords(category);

    formFields.forEach((field) => {
      const keywords = categoryKeywords[field.id] || [];
      
      // Handle different field types
      if (field.type === "checkbox") {
        const checkboxValue = this.extractCheckboxValue(lowerTranscript, keywords);
        if (checkboxValue !== null) {
          updatedFields.push({
            id: field.id,
            value: checkboxValue,
            confidence: 0.8,
          });
        }
      } else if (field.type === "dropdown" && field.options) {
        const dropdownValue = this.extractDropdownValue(lowerTranscript, field.options);
        if (dropdownValue) {
          updatedFields.push({
            id: field.id,
            value: dropdownValue,
            confidence: 0.85,
          });
        }
      } else {
        // Text field - extract value using keywords
        const extractedValue = this.extractValueForKeywords(lowerTranscript, keywords);
        if (extractedValue) {
          updatedFields.push({
            id: field.id,
            value: extractedValue,
            confidence: 0.7,
          });
        }
      }
    });

    const avgConfidence = updatedFields.length > 0
      ? updatedFields.reduce((sum, f) => sum + f.confidence, 0) / updatedFields.length
      : 0;

    return {
      updatedFields,
      confidence: avgConfidence,
      rawResponse: "Keyword-based extraction",
    };
  }

  /**
   * Extract checkbox value from transcript
   */
  private extractCheckboxValue(transcript: string, keywords: string[]): boolean | null {
    const yesPatterns = ["yes", "yeah", "yep", "correct", "true", "affirmative", "present"];
    const noPatterns = ["no", "nope", "negative", "false", "not present", "absent"];

    // Check if any keywords are mentioned in the transcript
    const keywordMentioned = keywords.some(kw => transcript.includes(kw.toLowerCase()));
    
    if (!keywordMentioned && keywords.length > 0) {
      return null; // Field not mentioned
    }

    // Check for yes/no patterns
    const hasYes = yesPatterns.some(pattern => transcript.includes(pattern));
    const hasNo = noPatterns.some(pattern => transcript.includes(pattern));

    if (hasYes && !hasNo) return true;
    if (hasNo && !hasYes) return false;
    
    return null;
  }

  /**
   * Extract dropdown value from transcript by matching options
   */
  private extractDropdownValue(transcript: string, options: string[]): string | null {
    // Try to find exact or partial matches with dropdown options
    for (const option of options) {
      if (!option) continue; // Skip empty option
      
      const optionLower = option.toLowerCase();
      const words = optionLower.split(/\s+/);
      
      // Check for exact match
      if (transcript.includes(optionLower)) {
        return option;
      }
      
      // Check for partial match (at least 2 words or single significant word)
      if (words.length >= 2) {
        const matchCount = words.filter(word => 
          word.length > 3 && transcript.includes(word)
        ).length;
        
        if (matchCount >= Math.ceil(words.length / 2)) {
          return option;
        }
      } else if (words.length === 1 && words[0].length > 3) {
        if (transcript.includes(words[0])) {
          return option;
        }
      }
    }
    
    return null;
  }

  /**
   * Extract value for text fields using keywords
   */
  private extractValueForKeywords(transcript: string, keywords: string[]): string | null {
    if (keywords.length === 0) return null;

    // Find sentences containing any of the keywords
    const sentences = transcript.split(/[.!?]+/);
    const relevantSentences = sentences.filter(sentence =>
      keywords.some(kw => sentence.toLowerCase().includes(kw.toLowerCase()))
    );

    if (relevantSentences.length > 0) {
      return relevantSentences.join(". ").trim();
    }

    return null;
  }

  /**
   * Get category-specific keyword mappings
   */
  private getCategoryKeywords(category: string): Record<string, string[]> {
    const keywords: Record<string, Record<string, string[]>> = {
      "Property ID": {
        propertyAddress: ["address", "located at", "property at"],
        parcelInformation: ["parcel", "lot", "zoning"],
        yearBuilt: ["built", "year", "age", "old"],
        squareFootage: ["square feet", "sqft", "square footage", "size"],
        constructionType: ["construction", "frame", "brick", "concrete", "materials"],
        numberOfStories: ["story", "stories", "level", "floors"],
        occupancyType: ["occupied", "rental", "owner", "vacant", "commercial"],
      },
      "Attached Structures": {
        garageCarCount: ["garage", "car", "cars"],
        garageCondition: ["garage condition", "garage state"],
        garageSqft: ["garage square", "garage size", "garage sqft"],
        decksSqft: ["deck square", "deck size", "deck sqft"],
        decksShape: ["deck shape"],
        decksMaterial: ["deck material"],
        decksCoveredPercent: ["deck covered"],
        decksEnclosedPercent: ["deck enclosed"],
        decksAverageHeight: ["deck height"],
        decksNumberOfLevels: ["deck level"],
        breezewaysSqft: ["breezeway"],
        balconySqft: ["balcony square", "balcony size"],
        balconyMaterial: ["balcony material"],
        balconyCoveredPercent: ["balcony covered"],
        balconyEnclosedPercent: ["balcony enclosed"],
        balconyFireplace: ["balcony fireplace"],
        porchSqft: ["porch square", "porch size"],
        porchMaterial: ["porch material"],
        porchCoveredPercent: ["porch covered"],
        porchEnclosedPercent: ["porch enclosed"],
        porchFireplace: ["porch fireplace"],
      },
      "HVAC": {
        hvacType: ["hvac", "heating", "cooling", "air conditioning", "furnace", "heat pump"],
        age: ["age", "years old", "installed"],
        ductwork: ["duct", "ductwork", "vents"],
        maintenanceIndicators: ["maintenance", "service", "filter", "clean"],
        condition: ["condition", "working", "functioning"],
      },
      "Interior": {
        wallsAndCeiling: ["walls", "ceiling", "stains", "cracks", "water damage"],
        floors: ["floor", "flooring", "level", "damage"],
        doors: ["door", "doors", "sealed"],
        plumbing: ["plumbing", "leak", "drain", "corrosion"],
        hotWaterHeaterFuelType: ["water heater", "hot water", "fuel"],
        electricalOutlets: ["outlet", "outlets", "wiring", "exposed"],
        smokeAndCoDetectors: ["smoke detector", "co detector", "carbon monoxide"],
        fireExtinguishers: ["fire extinguisher", "extinguisher"],
        fireplaceType: ["fireplace"],
      },
      "Foundation": {
        foundationType: ["foundation type", "crawl space", "basement", "slab"],
        foundationMaterial: ["foundation material", "concrete", "block", "stone"],
        foundationShape: ["foundation shape", "square", "rectangle"],
        siteSlope: ["slope", "grade", "hill"],
        basementSqft: ["basement", "basement size"],
        percentFinished: ["finished", "percent finished"],
      },
      "Plumbing": {
        waterPressure: ["water pressure", "pressure", "flow"],
        fixtures: ["fixture", "sink", "toilet", "shower", "tub", "faucet"],
        pipes: ["pipe", "pipes", "piping"],
        waterHeater: ["water heater", "hot water"],
        leaks: ["leak", "leaking", "drip", "water damage"],
      },
      "Roof": {
        roofType: ["roof type", "gable", "hip", "flat"],
        roofTypePercent: ["roof type percent"],
        numberOfDormers: ["dormer", "dormers"],
        oldHomeWoodSide: ["old home", "wood side"],
        roofMaterial: ["roof material", "shingle", "tile", "metal"],
        roofMaterialPercent: ["roof material percent"],
        roofConstructionType: ["roof construction", "framed", "truss"],
        condition: ["roof condition", "damage", "wear"],
        guttersAndDownspouts: ["gutter", "downspout", "drainage"],
        ventsFlashingSoffitFascia: ["vent", "flashing", "soffit", "fascia"],
        roofLife: ["roof life", "roof age", "years left"],
      },
      "Electrical": {
        panelBox: ["panel", "breaker", "electrical panel"],
        wiring: ["wiring", "wire", "electrical"],
        outlets: ["outlet", "receptacle", "gfci"],
        switches: ["switch", "switches", "light switch"],
        safetyDevices: ["safety", "smoke detector", "afci"],
      },
      "Hazards": {
        exteriorHazards: ["exterior hazard", "trip", "walkway", "railing"],
        roofHazards: ["roof hazard", "shingle", "gutter damage"],
        electricalHazards: ["electrical hazard", "exposed wire", "overload"],
        liabilityConcerns: ["liability", "pool", "trampoline"],
        poolSafety: ["pool", "trampoline", "playground", "lighting"],
      },
      "Exterior": {
        exteriorWallConstruction: ["wall construction", "wood", "concrete", "brick"],
        exteriorWallConstructionPercent: ["wall construction percent"],
        exteriorWallFinish: ["wall finish", "stucco", "siding", "vinyl"],
        exteriorWallFinishPercent: ["wall finish percent"],
        slidingDoorsCount: ["sliding door", "sliding doors"],
        normalDoorsCount: ["normal door", "doors"],
        trimDetails: ["trim", "trim detail"],
        windowsCount: ["window", "windows"],
        specialtyWindowsCount: ["specialty window", "bay window", "skylight"],
        drivewayAndWalkwaysCondition: ["driveway", "walkway", "crack", "hole"],
        landscaping: ["landscape", "landscaping", "tree", "shrub"],
        fencingAndGatesCondition: ["fence", "fencing", "gate"],
        landscapeFountain: ["fountain", "landscape fountain"],
      },
      "Finish Up": {
        inspectionComplete: ["inspection complete", "complete", "finished"],
        inspectorInitials: ["initials", "sign off"],
        surveyDateTime: ["date", "time", "survey date"],
        estimatedTLA: ["tla", "estimated tla"],
        roofVisibleEnough: ["roof visible", "assess roof"],
        addressChanged: ["address changed"],
        addressVerified: ["address verified", "verified"],
        homeVisibleFromRoad: ["visible from road"],
        homeAccessibleYearRound: ["accessible year round"],
        homesInArea: ["homes in area", "homes nearby"],
        yardsFromPavedRoad: ["yards from road", "distance from road"],
        gatedCommunity: ["gated", "gated community"],
      },
      "Systems and Utilities": {
        hvac: ["hvac", "heating", "cooling"],
        mainServiceAmperage: ["amperage", "amps", "service"],
        electricalPanel: ["electrical panel", "panel", "rust"],
        gfcisPresent: ["gfci", "ground fault"],
        necConcerns: ["nec", "code", "compliance"],
        plumbing: ["plumbing", "leak", "rust"],
        mainWaterShutoff: ["water shutoff", "main shutoff"],
        sewerSepticPresent: ["sewer", "septic"],
        sewerSepticCondition: ["sewer condition", "septic condition", "backup"],
        insulation: ["insulation", "insulated"],
        fireExits: ["fire exit", "exit"],
        securitySystems: ["security", "alarm", "camera"],
        stairsAndRailings: ["stairs", "railing", "handrail"],
        hazardousMaterials: ["hazardous", "asbestos", "lead paint"],
        emergencyNumbers: ["emergency number", "emergency contact"],
      },
    };

    return keywords[category] || {};
  }

  /**
   * Process with OpenAI for complex parsing
   */
  private async processWithOpenAI(
    transcript: string,
    category: string,
    formFields: FormField[]
  ): Promise<AIFormFillerResult> {
    // Build field descriptions for OpenAI
    const fieldDescriptions = formFields.map(field => {
      let desc = `- ${field.id} (${field.label})`;
      if (field.type === "dropdown" && field.options) {
        desc += ` - DROPDOWN OPTIONS: ${field.options.filter(o => o).join(", ")}`;
      } else if (field.type === "checkbox") {
        desc += ` - CHECKBOX (true/false)`;
      }
      return desc;
    }).join("\n");

    const prompt = `You are an AI assistant helping to fill out a ${category} inspection form based on voice transcription.

FORM FIELDS:
${fieldDescriptions}

TRANSCRIPT:
"${transcript}"

INSTRUCTIONS:
1. For DROPDOWN fields: Return ONLY values that EXACTLY match one of the provided options
2. For CHECKBOX fields: Return true or false based on the transcript
3. For TEXT fields: Extract relevant information from the transcript
4. Only include fields that are clearly mentioned in the transcript
5. Return your response as a JSON array

Return ONLY a JSON array in this format:
[
  {"id": "fieldId", "value": "extracted value", "confidence": 0.9},
  ...
]`;

    try {
      // Use the Supabase edge function instead of calling OpenAI directly
      const response = await fetch("https://3621be4e-ba60-4a22-93e8-efd8b5b7134c.canvases.tempo.build/supabase-functions-ai-form-filler", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: prompt,
        }),
      });

      if (!response.ok) {
        throw new Error(`AI API error: ${response.status}`);
      }

      const data = await response.json();
      
      console.log("AI edge function response:", data);

      // The edge function returns a different format, adapt it
      const updatedFields = data.mappings || [];

      // Validate and convert field values based on type
      const validatedFields = updatedFields.map((field: any) => {
        const fieldDef = formFields.find(f => f.id === field.fieldId || f.id === field.id);
        if (!fieldDef) return null;

        const normalizedField = {
          id: field.fieldId || field.id,
          value: field.value,
          confidence: field.confidence || 0.5
        };

        if (fieldDef.type === "checkbox") {
          // Convert to boolean
          normalizedField.value = normalizedField.value === true || normalizedField.value === "true" || normalizedField.value === "yes";
        } else if (fieldDef.type === "dropdown" && fieldDef.options) {
          // Validate dropdown value
          if (!fieldDef.options.includes(normalizedField.value)) {
            console.warn(`Invalid dropdown value "${normalizedField.value}" for field ${normalizedField.id}`);
            return null;
          }
        }

        return normalizedField;
      }).filter(Boolean);

      const avgConfidence = validatedFields.length > 0
        ? validatedFields.reduce((sum: number, f: any) => sum + (f.confidence || 0.5), 0) / validatedFields.length
        : 0;

      return {
        updatedFields: validatedFields,
        confidence: avgConfidence,
        rawResponse: JSON.stringify(data),
      };
    } catch (error) {
      console.error("OpenAI processing error:", error);
      throw error;
    }
  }

  /**
   * Merge keyword and AI results
   */
  private mergeResults(
    keywordFields: Array<{ id: string; value: any; confidence: number }>,
    aiFields: Array<{ id: string; value: any; confidence: number }>,
    formFields: FormField[]
  ): Array<{ id: string; value: any; confidence: number }> {
    const merged = new Map<string, { id: string; value: any; confidence: number }>();

    // Add keyword results first
    keywordFields.forEach(field => {
      merged.set(field.id, field);
    });

    // Add or update with AI results, preferring higher confidence
    aiFields.forEach(field => {
      const existing = merged.get(field.id);
      if (!existing || field.confidence > existing.confidence) {
        merged.set(field.id, field);
      }
    });

    return Array.from(merged.values());
  }
}

export const aiFormFillerService = new AIFormFillerService();