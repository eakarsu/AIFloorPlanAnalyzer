import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '..', '.env') });

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'anthropic/claude-3-5-sonnet-20241022';
// HTTP-Referer is required by OpenRouter for analytics. Pull it from env so deployments
// can advertise their actual host instead of the previously hard-coded localhost value.
const AI_REFERER = process.env.AI_HTTP_REFERER || process.env.CLIENT_URL || 'http://localhost:3000';

/**
 * Validate OpenRouter is configured at startup. Throws in production so we fail
 * fast; warns in dev so local tinkering still boots.
 */
export function assertOpenRouterConfigured() {
  if (!OPENROUTER_API_KEY) {
    const msg = 'OPENROUTER_API_KEY is not set — AI endpoints will fail.';
    if (process.env.NODE_ENV === 'production') {
      throw new Error(msg);
    }
    // eslint-disable-next-line no-console
    console.warn(msg);
  }
}

// Robust JSON parser: tries 3 strategies before returning raw text
function parseJsonResponse(text) {
  // Strategy 1: direct parse
  try { return JSON.parse(text); } catch {}
  // Strategy 2: code block extraction
  const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (match) try { return JSON.parse(match[1].trim()); } catch {}
  // Strategy 3: find first { to last }
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start !== -1 && end !== -1) try { return JSON.parse(text.slice(start, end + 1)); } catch {}
  return { raw: text, parsed: false };
}

export const analyzeFloorPlan = async (imageBase64, analysisType = 'full') => {
  const startTime = Date.now();

  const prompts = {
    full: `Analyze this floor plan image comprehensively. Provide a detailed analysis with the following sections:

## Room Identification
List all visible rooms with their approximate dimensions in a table format.

## Layout Analysis
Describe the overall layout, traffic flow, and how spaces connect.

## Space Utilization
Rate the efficiency (1-10) and explain how well the space is used.

## Natural Light Assessment
Evaluate window placement and natural light distribution.

## Renovation Potential
List specific improvement opportunities with estimated impact.

Use markdown formatting with headers, bullet points, and tables for clarity.`,

    dimensions: `Extract all room dimensions from this floor plan.

First, provide a formatted markdown table:

## Room Dimensions

| Room | Type | Width (ft) | Length (ft) | Area (sq ft) | Features |
|------|------|------------|-------------|--------------|----------|
| Living Room | living | 15.5 | 20.0 | 310 | 2 windows |

Then provide a summary of total square footage and observations.

CRITICAL: You MUST end your response with this EXACT JSON format in a code block. Use these EXACT field names:

\`\`\`json
[
  {"room_name": "Living Room", "room_type": "living", "width": 15.5, "length": 20.0, "area": 310, "features": "2 windows"},
  {"room_name": "Kitchen", "room_type": "kitchen", "width": 12.0, "length": 14.0, "area": 168, "features": "island"}
]
\`\`\`

The JSON array MUST be the LAST thing in your response. Include ALL rooms. Use exact field names: room_name, room_type, width, length, area, features (numbers as numbers, not strings).`,

    suggestions: `Based on this floor plan, provide detailed renovation suggestions:

## High Priority Recommendations

### 1. [Suggestion Title]
- **Description**: Detailed explanation
- **Category**: Structural/Kitchen/Bathroom/Lighting/Storage
- **Estimated Cost**: $X,XXX - $XX,XXX
- **Difficulty**: Easy/Moderate/Complex
- **Timeline**: X-X weeks

Repeat for each suggestion (provide 5-7 suggestions total).

## Quick Wins (Low Cost, High Impact)
List 3-4 easy improvements that make a big difference.

## Budget Summary
| Priority | Suggestion | Cost Range |
|----------|------------|------------|
| High | ... | $X,XXX |

CRITICAL: You MUST end your response with this EXACT JSON format in a code block:

\`\`\`json
[
  {"title": "Suggestion Title", "description": "Detailed description", "category": "kitchen", "priority": "high", "estimated_cost": 5000, "difficulty": "moderate", "timeline": "2-3 weeks"}
]
\`\`\`

The JSON array MUST be the LAST thing in your response. Include ALL suggestions (5-7 items). Use exact field names. Category must be: structural, kitchen, bathroom, lighting, storage, technology, windows, trim, acoustic, furniture, outdoor, or other.`,

    materials: `Recommend materials for renovating this space based on the floor plan:

## Flooring Recommendations

| Room Type | Material | Brand/Style | Price/sq ft | Durability |
|-----------|----------|-------------|-------------|------------|
| Living | Hardwood | ... | $X-XX | Excellent |

## Countertops & Surfaces
Recommend options for kitchen and bathroom countertops with pros/cons.

## Cabinets & Storage
Style recommendations with finish options and price ranges.

## Paint & Wall Treatments
- **Living Areas**: Color palette suggestions with hex codes
- **Bedrooms**: Calming tones
- **Kitchen/Bath**: Moisture-resistant options

## Fixtures & Hardware
Recommended brands and styles for:
- Lighting fixtures
- Door/cabinet hardware
- Plumbing fixtures

## Budget Summary
| Category | Budget Option | Mid-Range | Premium |
|----------|--------------|-----------|---------|
| Flooring | $X/sqft | $X/sqft | $X/sqft |

CRITICAL: You MUST end your response with this EXACT JSON format in a code block:

\`\`\`json
[
  {"name": "Hardwood Flooring", "category": "flooring", "description": "Oak hardwood for living areas", "unit_price": 8.50, "unit": "sqft", "supplier": "Home Depot"},
  {"name": "Quartz Countertop", "category": "countertop", "description": "White quartz for kitchen", "unit_price": 75, "unit": "sqft", "supplier": "Local Stone"}
]
\`\`\`

The JSON array MUST be the LAST thing in your response. Include ALL recommended materials. Use exact field names: name, category, description, unit_price (number), unit, supplier.`,

    cost: `Provide a detailed cost estimate for renovating this floor plan:

## Cost Summary

| Category | Amount |
|----------|--------|
| Labor | $XX,XXX |
| Materials | $XX,XXX |
| Permits | $X,XXX |
| Contingency (15%) | $X,XXX |
| **Total** | **$XX,XXX** |

## Labor Cost Breakdown

| Trade | Estimated Cost | Days |
|-------|---------------|------|
| Plumbing | $X,XXX | X |
| Electrical | $X,XXX | X |
| Carpentry | $X,XXX | X |
| Painting | $X,XXX | X |

## Material Cost Breakdown

| Category | Cost | Notes |
|----------|------|-------|
| Flooring | $X,XXX | ... |
| Fixtures | $X,XXX | ... |

## Timeline
- **Total Duration**: XX days
- **Phase 1**: Demo & Prep (X days)
- **Phase 2**: Rough Work (X days)
- **Phase 3**: Finishing (X days)

## Cost-Saving Tips
1. Tip with explanation
2. Another tip

CRITICAL: You MUST end your response with this EXACT JSON format in a code block for database storage. Use these EXACT field names:

\`\`\`json
{"labor_cost": 52000, "material_cost": 78000, "total_cost": 156000, "timeline_days": 45}
\`\`\`

The JSON must be the LAST thing in your response and must use these exact field names: labor_cost, material_cost, total_cost, timeline_days (as numbers, not strings).`
  };

  const systemPrompt = `You are an expert interior designer and renovation consultant with 20+ years of experience.
You specialize in analyzing floor plans and providing actionable renovation recommendations.
Always provide specific, practical advice with realistic cost estimates.
Format your responses in a clear, structured manner that can be easily parsed.
When analyzing images, be thorough but concise.`;

  const normalizedImage = normalizeImageData(imageBase64);

  try {
    const data = await callOpenRouterWithRetry({
      model: OPENROUTER_MODEL,
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: normalizedImage ? [
            {
              type: 'text',
              text: prompts[analysisType] || prompts.full
            },
            {
              type: 'image_url',
              image_url: {
                url: normalizedImage
              }
            }
          ] : prompts[analysisType] || prompts.full
        }
      ],
      max_tokens: 10000,
      temperature: 0.7
    });

    const processingTime = Date.now() - startTime;

    return {
      success: true,
      analysis: data.choices[0].message.content,
      model: data.model,
      usage: {
        promptTokens: data.usage?.prompt_tokens,
        completionTokens: data.usage?.completion_tokens,
        totalTokens: data.usage?.total_tokens
      },
      processingTimeMs: processingTime
    };
  } catch (error) {
    console.error('OpenRouter API error:', error);
    return {
      success: false,
      error: error.message,
      processingTimeMs: Date.now() - startTime
    };
  }
};

export const generateRenovationSuggestions = async (roomData) => {
  const startTime = Date.now();

  const prompt = `Based on the following room data, generate detailed renovation suggestions:

Room: ${roomData.name}
Type: ${roomData.room_type}
Dimensions: ${roomData.width || 0}ft x ${roomData.length || 0}ft (${roomData.area || 0} sq ft)
${roomData.notes ? `Notes: ${roomData.notes}` : ''}

Provide exactly 5 specific renovation suggestions. Return ONLY a valid JSON array with this exact structure:
[
  {
    "title": "Suggestion Title",
    "description": "Detailed description",
    "category": "structural|kitchen|bathroom|lighting|storage|technology|windows|trim|acoustic|furniture|outdoor|other",
    "priority": "high|medium|low",
    "estimated_cost": 5000,
    "difficulty": "easy|moderate|complex",
    "timeline": "2-3 weeks"
  }
]

Return ONLY the JSON array, no other text.`;

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': AI_REFERER,
        'X-Title': 'AI Floor Plan Analyzer'
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        messages: [
          {
            role: 'system',
            content: 'You are an expert renovation consultant. Always respond with valid JSON arrays containing renovation suggestions.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 10000,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'OpenRouter API error');
    }

    const data = await response.json();
    const content = data.choices[0].message.content;

    // Try to parse JSON from the response
    const suggestions = parseJsonResponse(content);

    return {
      success: true,
      suggestions,
      model: data.model,
      usage: data.usage,
      processingTimeMs: Date.now() - startTime
    };
  } catch (error) {
    console.error('OpenRouter API error:', error);
    return {
      success: false,
      error: error.message,
      processingTimeMs: Date.now() - startTime
    };
  }
};

export const estimateCosts = async (projectDetails) => {
  const startTime = Date.now();

  const prompt = `Provide a detailed cost estimate for the following renovation project:

**Project:** ${projectDetails.name}
**Description:** ${projectDetails.description || 'General renovation'}
**Total Area:** ${projectDetails.total_area || 0} sq ft
**Rooms:** ${projectDetails.rooms?.map(r => `${r.name} (${r.area || 0} sq ft)`).join(', ') || 'No rooms specified'}

## Cost Summary

| Category | Amount |
|----------|--------|
| Labor | $XX,XXX |
| Materials | $XX,XXX |
| Permits | $X,XXX |
| Contingency (15%) | $X,XXX |
| **Total** | **$XX,XXX** |

## Labor Cost Breakdown

| Trade | Estimated Cost | Days |
|-------|---------------|------|
| Plumbing | $X,XXX | X |
| Electrical | $X,XXX | X |
| Carpentry | $X,XXX | X |
| Painting | $X,XXX | X |

## Material Cost Breakdown

| Category | Cost | Notes |
|----------|------|-------|
| Flooring | $X,XXX | ... |
| Fixtures | $X,XXX | ... |

## Timeline
- **Total Duration**: XX days
- **Phase 1**: Demo & Prep (X days)
- **Phase 2**: Rough Work (X days)
- **Phase 3**: Finishing (X days)

## Cost-Saving Tips
1. Tip with explanation
2. Another tip

Use markdown formatting with clear tables and sections.`;

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': AI_REFERER,
        'X-Title': 'AI Floor Plan Analyzer'
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        messages: [
          {
            role: 'system',
            content: 'You are an expert construction cost estimator. Provide realistic cost estimates based on current market rates. Always respond with structured JSON.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 10000,
        temperature: 0.5
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'OpenRouter API error');
    }

    const data = await response.json();
    const content = data.choices[0].message.content;

    // Parse JSON from response using robust parser
    const estimateData = parseJsonResponse(content);

    return {
      success: true,
      estimate: content,
      estimateData: estimateData,
      model: data.model,
      usage: data.usage,
      processingTimeMs: Date.now() - startTime
    };
  } catch (error) {
    console.error('OpenRouter API error:', error);
    return {
      success: false,
      error: error.message,
      processingTimeMs: Date.now() - startTime
    };
  }
};

export const recommendMaterials = async (roomData, style) => {
  const startTime = Date.now();

  const prompt = `Recommend materials for the following room renovation:

**Room:** ${roomData.name}
**Type:** ${roomData.room_type}
**Size:** ${roomData.area || 0} sq ft
**Style Preference:** ${style || 'Modern'}

## Recommended Materials

### Flooring
| Option | Material | Price/sq ft | Pros | Cons |
|--------|----------|-------------|------|------|
| Budget | ... | $X | ... | ... |
| Premium | ... | $X | ... | ... |

### Wall Treatment
Recommended paint colors, wallpaper, or accent wall options.

### Lighting
- **Ambient**: Fixture recommendations
- **Task**: Work area lighting
- **Accent**: Decorative options

### Fixtures & Hardware
Specific product recommendations with price ranges.

## Color Palette
- Primary: #XXXXXX (Color name)
- Secondary: #XXXXXX (Color name)
- Accent: #XXXXXX (Color name)

## Budget Estimate
| Item | Budget | Mid-Range | Premium |
|------|--------|-----------|---------|
| Flooring | $X,XXX | $X,XXX | $X,XXX |
| Paint | $XXX | $XXX | $XXX |
| Fixtures | $XXX | $X,XXX | $X,XXX |

Use markdown formatting with tables and clear sections.`;

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': AI_REFERER,
        'X-Title': 'AI Floor Plan Analyzer'
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        messages: [
          {
            role: 'system',
            content: 'You are an expert interior designer specializing in material selection. Provide specific, practical recommendations with realistic pricing.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 10000,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'OpenRouter API error');
    }

    const data = await response.json();
    const content = data.choices[0].message.content;

    // Parse JSON from response using robust parser
    const materials = parseJsonResponse(content);

    return {
      success: true,
      recommendations: content,
      materials: materials,
      model: data.model,
      usage: data.usage,
      processingTimeMs: Date.now() - startTime
    };
  } catch (error) {
    console.error('OpenRouter API error:', error);
    return {
      success: false,
      error: error.message,
      processingTimeMs: Date.now() - startTime
    };
  }
};

export const analyzeLayoutOptimization = async (floorPlanData) => {
  const startTime = Date.now();

  const prompt = `Analyze the following floor plan layout and suggest optimizations:

Floor Plan: ${floorPlanData.name}
Total Area: ${floorPlanData.total_area} sq ft
Rooms:
${floorPlanData.rooms?.map(r => `- ${r.name} (${r.room_type}): ${r.width}ft x ${r.length}ft`).join('\n')}

## Traffic Flow Analysis
Describe the movement patterns through the space:
- Main circulation paths
- Bottlenecks or congestion points
- Recommended improvements

## Space Efficiency Score

| Metric | Score (1-10) | Notes |
|--------|--------------|-------|
| Overall Efficiency | X | ... |
| Room Proportions | X | ... |
| Storage Adequacy | X | ... |
| Functional Zones | X | ... |

**Overall Score: X/10**

## Natural Light Optimization
- Current light distribution analysis
- Window placement effectiveness
- Recommendations for maximizing natural light

## Privacy Considerations
Analyze privacy levels between spaces:

| Zone | Privacy Level | Adjacent To | Recommendations |
|------|--------------|-------------|-----------------|
| Bedrooms | ... | ... | ... |
| Bathrooms | ... | ... | ... |

## Noise Zone Mapping
- **Quiet Zones**: Bedrooms, study areas
- **Active Zones**: Kitchen, living room
- **Buffer Zones**: Hallways, closets
- Soundproofing recommendations

## Furniture Placement Suggestions
Provide specific placement recommendations for each room:

### Living Room
- Sofa placement: ...
- TV/Entertainment: ...
- Traffic clearance: ...

### Bedrooms
- Bed orientation: ...
- Dresser placement: ...
- Desk area (if applicable): ...

## Layout Modification Options

### Option 1: [Minor Adjustments]
- Description of changes
- Estimated impact
- Difficulty: Easy/Moderate/Complex

### Option 2: [Moderate Renovation]
- Description of changes
- Estimated impact
- Difficulty: Easy/Moderate/Complex

### Option 3: [Major Transformation]
- Description of changes
- Estimated impact
- Difficulty: Easy/Moderate/Complex

CRITICAL: You MUST end your response with this EXACT JSON format in a code block:

\`\`\`json
{"traffic_flow": "Good flow between main areas", "efficiency_score": 7.5, "natural_light": "Adequate in living areas", "privacy_analysis": "Good separation between zones", "noise_zones": "Kitchen noise may affect bedroom", "furniture_suggestions": "Reposition sofa", "layout_modifications": "Consider opening kitchen to living room"}
\`\`\`

The JSON MUST be the LAST thing in your response. Use exact field names: traffic_flow, efficiency_score (number 1-10), natural_light, privacy_analysis, noise_zones, furniture_suggestions, layout_modifications.`;

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': AI_REFERER,
        'X-Title': 'AI Floor Plan Analyzer'
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        messages: [
          {
            role: 'system',
            content: 'You are an expert space planner and architect. Analyze layouts for optimal functionality and living experience.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 10000,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'OpenRouter API error');
    }

    const data = await response.json();

    return {
      success: true,
      optimization: data.choices[0].message.content,
      model: data.model,
      usage: data.usage,
      processingTimeMs: Date.now() - startTime
    };
  } catch (error) {
    console.error('OpenRouter API error:', error);
    return {
      success: false,
      error: error.message,
      processingTimeMs: Date.now() - startTime
    };
  }
};

// Helper: call OpenRouter with retry logic for transient errors
const callOpenRouterWithRetry = async (payload, maxRetries = 2) => {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': AI_REFERER,
        'X-Title': 'AI Floor Plan Analyzer'
      },
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      return await response.json();
    }

    const errorBody = await response.json();
    const errorMsg = errorBody.error?.message || JSON.stringify(errorBody.error) || 'OpenRouter API error';
    console.error(`OpenRouter API error (attempt ${attempt + 1}/${maxRetries + 1}):`, JSON.stringify(errorBody, null, 2));

    // Retry on provider errors or 5xx, but not on 4xx client errors (except 429 rate limit)
    const isRetryable = response.status >= 500 || response.status === 429 || errorMsg.includes('Provider returned error');
    if (!isRetryable || attempt === maxRetries) {
      throw new Error(errorMsg);
    }

    // Wait before retrying (exponential backoff)
    await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
  }
};

// Helper: validate and normalize image data URL for vision API
const normalizeImageData = (imageBase64) => {
  if (!imageBase64) return null;

  // Extract mime type from data URL
  const mimeMatch = imageBase64.match(/^data:(image\/[^;]+);base64,/);
  if (mimeMatch) {
    const mime = mimeMatch[1];
    // GIF and SVG are not supported by Claude vision - convert to PNG by re-encoding
    if (mime === 'image/gif' || mime === 'image/svg+xml') {
      console.warn(`Unsupported image format for vision API: ${mime}. Image may fail.`);
      // Replace mime type with png as a best-effort (actual conversion should happen client-side)
      return imageBase64.replace(/^data:image\/[^;]+/, 'data:image/png');
    }
    return imageBase64;
  }

  // Raw base64 without data URL prefix
  return `data:image/jpeg;base64,${imageBase64}`;
};

// AI Room Detector - Detects and identifies rooms from floor plan images
export const detectRooms = async (imageBase64) => {
  const startTime = Date.now();

  const prompt = `Analyze this floor plan image and detect all rooms. For each room identified:

## Detected Rooms Summary

| # | Room Name | Type | Estimated Size (sq ft) | Confidence |
|---|-----------|------|------------------------|------------|
| 1 | Living Room | living | 300 | High |

## Room Details

### Room 1: [Name]
- **Type**: living/bedroom/kitchen/bathroom/dining/office/garage/utility/hallway/closet
- **Location**: Description of where in the floor plan
- **Approximate Dimensions**: Width x Length
- **Notable Features**: Windows, doors, closets, etc.
- **Confidence Level**: High/Medium/Low

Repeat for each room detected.

## Floor Plan Overview
- Total rooms detected: X
- Total estimated area: X sq ft
- Layout type: Open concept / Traditional / Split-level / etc.

CRITICAL: End your response with this EXACT JSON format:

\`\`\`json
{
  "total_rooms": 5,
  "confidence_score": 85.5,
  "detected_rooms": [
    {"name": "Living Room", "type": "living", "width": 15, "length": 20, "area": 300, "features": ["2 windows", "fireplace"], "confidence": "high"},
    {"name": "Kitchen", "type": "kitchen", "width": 12, "length": 14, "area": 168, "features": ["island", "pantry"], "confidence": "high"}
  ]
}
\`\`\``;

  const normalizedImage = normalizeImageData(imageBase64);

  try {
    const data = await callOpenRouterWithRetry({
      model: OPENROUTER_MODEL,
      messages: [
        {
          role: 'system',
          content: 'You are an expert floor plan analyst specializing in room detection and space identification. Analyze floor plans with precision and provide detailed room information.'
        },
        {
          role: 'user',
          content: normalizedImage ? [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: normalizedImage } }
          ] : prompt
        }
      ],
      max_tokens: 10000,
      temperature: 0.5
    });

    return {
      success: true,
      analysis: data.choices[0].message.content,
      model: data.model,
      usage: data.usage,
      processingTimeMs: Date.now() - startTime
    };
  } catch (error) {
    console.error('OpenRouter API error:', error);
    return { success: false, error: error.message, processingTimeMs: Date.now() - startTime };
  }
};

// AI Home Staging Advisor - Provides staging recommendations for real estate
export const getHomeStagingAdvice = async (roomData, targetBuyer = 'general') => {
  const startTime = Date.now();

  const prompt = `Provide professional home staging advice for this room to maximize appeal for ${targetBuyer} buyers:

**Room:** ${roomData.name || 'Living Space'}
**Type:** ${roomData.room_type || 'living'}
**Size:** ${roomData.area || 0} sq ft
**Dimensions:** ${roomData.width || 0}ft x ${roomData.length || 0}ft

## Staging Strategy

### Overall Theme
Recommended style that appeals to target buyers.

### Furniture Recommendations

| Item | Style | Placement | Purpose |
|------|-------|-----------|---------|
| Sofa | Modern | Against main wall | Anchor piece |

### Color Palette
- **Walls**: Color recommendation with hex code
- **Accents**: 2-3 complementary colors
- **Textiles**: Suggested fabrics and patterns

### Decluttering Checklist
- [ ] Items to remove
- [ ] Items to add
- [ ] Items to rearrange

### Lighting Improvements
- Natural light optimization
- Artificial lighting suggestions

### Curb Appeal Factors
How this room contributes to overall home appeal.

### Estimated Value Increase
- Staging investment: $X,XXX
- Potential value increase: $X,XXX - $XX,XXX
- ROI: X%

### Quick Wins (Under $100)
1. Quick improvement
2. Another easy fix

CRITICAL: End with this JSON:

\`\`\`json
{
  "staging_style": "Modern Transitional",
  "target_buyer": "${targetBuyer}",
  "estimated_value_increase": 15000,
  "recommendations": [
    {"category": "furniture", "item": "Neutral sofa", "cost": 800, "impact": "high"},
    {"category": "decor", "item": "Fresh flowers", "cost": 50, "impact": "medium"}
  ]
}
\`\`\``;

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': AI_REFERER,
        'X-Title': 'AI Floor Plan Analyzer'
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        messages: [
          {
            role: 'system',
            content: 'You are a professional real estate staging consultant with expertise in maximizing property appeal and value. Provide actionable, budget-conscious staging recommendations.'
          },
          { role: 'user', content: prompt }
        ],
        max_tokens: 10000,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'OpenRouter API error');
    }

    const data = await response.json();
    return {
      success: true,
      analysis: data.choices[0].message.content,
      model: data.model,
      usage: data.usage,
      processingTimeMs: Date.now() - startTime
    };
  } catch (error) {
    console.error('OpenRouter API error:', error);
    return { success: false, error: error.message, processingTimeMs: Date.now() - startTime };
  }
};

// AI Furniture Placer - Optimizes furniture placement
export const placeFurniture = async (roomData, style = 'modern') => {
  const startTime = Date.now();

  const prompt = `Create an optimal furniture placement plan for this room:

**Room:** ${roomData.name || 'Room'}
**Type:** ${roomData.room_type || 'living'}
**Dimensions:** ${roomData.width || 12}ft x ${roomData.length || 14}ft (${roomData.area || 168} sq ft)
**Style Preference:** ${style}

## Furniture Layout Plan

### Primary Furniture

| Item | Size (WxD) | Position | Orientation | Distance from Wall |
|------|------------|----------|-------------|-------------------|
| Sofa | 7'x3' | Center-left | Facing TV wall | 18" |

### Layout Diagram
[ASCII representation of furniture placement]

### Traffic Flow Analysis
- Main pathways (minimum 36" clearance)
- Entry/exit points
- Bottlenecks to avoid

### Conversation Areas
- Primary seating arrangement
- Secondary groupings
- Focal points

### Lighting Considerations
- Task lighting placement
- Ambient lighting zones
- Natural light optimization

### Space Efficiency Score: X/10

### Alternative Layouts

#### Option A: [Style Name]
Brief description with key differences.

#### Option B: [Style Name]
Brief description with key differences.

### Shopping List

| Priority | Item | Recommended Size | Est. Cost |
|----------|------|-----------------|-----------|
| 1 | Main sofa | 84" | $800-2000 |

CRITICAL: End with this JSON:

\`\`\`json
{
  "layout_score": 8.5,
  "traffic_flow_rating": "excellent",
  "furniture_items": [
    {"name": "Sectional Sofa", "width": 84, "depth": 36, "position_x": 24, "position_y": 48, "rotation": 0},
    {"name": "Coffee Table", "width": 48, "depth": 24, "position_x": 60, "position_y": 72, "rotation": 0}
  ]
}
\`\`\``;

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': AI_REFERER,
        'X-Title': 'AI Floor Plan Analyzer'
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        messages: [
          {
            role: 'system',
            content: 'You are an expert interior designer specializing in space planning and furniture arrangement. Create functional, aesthetically pleasing layouts that maximize space usage.'
          },
          { role: 'user', content: prompt }
        ],
        max_tokens: 10000,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'OpenRouter API error');
    }

    const data = await response.json();
    return {
      success: true,
      analysis: data.choices[0].message.content,
      model: data.model,
      usage: data.usage,
      processingTimeMs: Date.now() - startTime
    };
  } catch (error) {
    console.error('OpenRouter API error:', error);
    return { success: false, error: error.message, processingTimeMs: Date.now() - startTime };
  }
};

// AI Home Maintenance Predictor - Predicts maintenance needs
export const predictMaintenance = async (floorPlanData, homeAge = 10) => {
  const startTime = Date.now();

  const roomsSummary = floorPlanData.rooms?.map(r => `${r.name} (${r.room_type}): ${r.area || 0} sq ft`).join(', ') || 'No rooms specified';

  const prompt = `Predict maintenance needs for this home:

**Property:** ${floorPlanData.name || 'Home'}
**Total Area:** ${floorPlanData.total_area || 0} sq ft
**Estimated Age:** ${homeAge} years
**Rooms:** ${roomsSummary}

## Annual Maintenance Calendar

### Q1 (Jan-Mar)
| Task | Priority | Est. Cost | DIY? |
|------|----------|-----------|------|
| HVAC filter | High | $30 | Yes |

### Q2 (Apr-Jun)
| Task | Priority | Est. Cost | DIY? |
|------|----------|-----------|------|

### Q3 (Jul-Sep)
| Task | Priority | Est. Cost | DIY? |
|------|----------|-----------|------|

### Q4 (Oct-Dec)
| Task | Priority | Est. Cost | DIY? |
|------|----------|-----------|------|

## Major System Predictions

### HVAC System
- Current estimated condition: Good/Fair/Poor
- Expected lifespan remaining: X years
- Recommended actions

### Plumbing
- Risk areas based on layout
- Preventive measures

### Electrical
- Capacity assessment
- Upgrade recommendations

### Roof & Exterior
- Weather-related maintenance

### Appliances
Expected replacement timeline for major appliances.

## 5-Year Cost Projection

| Year | Routine | Major Repairs | Total |
|------|---------|---------------|-------|
| 2024 | $X,XXX | $X,XXX | $X,XXX |

## Priority Action Items
1. Urgent item
2. Important item
3. Recommended item

CRITICAL: End with this JSON:

\`\`\`json
{
  "total_annual_cost": 3500,
  "priority_items": 3,
  "next_maintenance_date": "2024-03-15",
  "predictions": [
    {"item": "HVAC Service", "category": "hvac", "frequency": "annual", "cost": 150, "priority": "high", "next_due": "2024-03-01"},
    {"item": "Gutter Cleaning", "category": "exterior", "frequency": "biannual", "cost": 200, "priority": "medium", "next_due": "2024-04-01"}
  ]
}
\`\`\``;

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': AI_REFERER,
        'X-Title': 'AI Floor Plan Analyzer'
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        messages: [
          {
            role: 'system',
            content: 'You are a home maintenance expert and property manager with extensive knowledge of residential systems, their lifecycles, and maintenance requirements. Provide practical, prioritized maintenance schedules.'
          },
          { role: 'user', content: prompt }
        ],
        max_tokens: 10000,
        temperature: 0.6
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'OpenRouter API error');
    }

    const data = await response.json();
    return {
      success: true,
      analysis: data.choices[0].message.content,
      model: data.model,
      usage: data.usage,
      processingTimeMs: Date.now() - startTime
    };
  } catch (error) {
    console.error('OpenRouter API error:', error);
    return { success: false, error: error.message, processingTimeMs: Date.now() - startTime };
  }
};

// AI Energy Efficiency Auditor - Analyzes energy efficiency
export const auditEnergyEfficiency = async (floorPlanData, climateZone = 'temperate') => {
  const startTime = Date.now();

  const roomsSummary = floorPlanData.rooms?.map(r => `${r.name} (${r.room_type}): ${r.area || 0} sq ft`).join(', ') || 'No rooms specified';

  const prompt = `Conduct an energy efficiency audit for this home:

**Property:** ${floorPlanData.name || 'Home'}
**Total Area:** ${floorPlanData.total_area || 0} sq ft
**Climate Zone:** ${climateZone}
**Rooms:** ${roomsSummary}

## Energy Efficiency Score: X/100

### Score Breakdown
| Category | Score | Weight | Contribution |
|----------|-------|--------|--------------|
| Insulation | X/100 | 25% | X |
| Windows | X/100 | 20% | X |
| HVAC | X/100 | 25% | X |
| Lighting | X/100 | 15% | X |
| Appliances | X/100 | 15% | X |

## Current Energy Profile

### Estimated Annual Costs
| Utility | Monthly | Annual |
|---------|---------|--------|
| Electricity | $XXX | $X,XXX |
| Gas/Heating | $XXX | $X,XXX |
| Water | $XX | $XXX |
| **Total** | **$XXX** | **$X,XXX** |

### Carbon Footprint
- Annual CO2 emissions: X tons
- Comparison to average: X% above/below

## Improvement Recommendations

### High Impact (ROI < 3 years)
| Upgrade | Cost | Annual Savings | Payback |
|---------|------|----------------|---------|
| LED Lighting | $300 | $150 | 2 years |

### Medium Impact (ROI 3-7 years)
| Upgrade | Cost | Annual Savings | Payback |
|---------|------|----------------|---------|

### Long-term Investments
| Upgrade | Cost | Annual Savings | Payback |
|---------|------|----------------|---------|
| Solar Panels | $15,000 | $2,000 | 7.5 years |

## Room-by-Room Analysis

### ${floorPlanData.rooms?.[0]?.name || 'Living Room'}
- Energy concerns
- Quick fixes
- Investment opportunities

## Rebates & Incentives
Available federal, state, and utility rebates.

## Smart Home Integration
Recommended smart devices for energy monitoring.

CRITICAL: End with this JSON:

\`\`\`json
{
  "efficiency_score": 72.5,
  "annual_cost_estimate": 2400,
  "potential_savings": 720,
  "carbon_footprint": 8.5,
  "recommendations": [
    {"item": "LED Lighting Upgrade", "category": "lighting", "cost": 300, "annual_savings": 150, "payback_years": 2, "priority": "high"},
    {"item": "Smart Thermostat", "category": "hvac", "cost": 250, "annual_savings": 180, "payback_years": 1.4, "priority": "high"}
  ]
}
\`\`\``;

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': AI_REFERER,
        'X-Title': 'AI Floor Plan Analyzer'
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        messages: [
          {
            role: 'system',
            content: 'You are a certified energy auditor with expertise in residential energy efficiency, renewable energy, and sustainable building practices. Provide actionable recommendations with clear ROI calculations.'
          },
          { role: 'user', content: prompt }
        ],
        max_tokens: 10000,
        temperature: 0.6
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'OpenRouter API error');
    }

    const data = await response.json();
    return {
      success: true,
      analysis: data.choices[0].message.content,
      model: data.model,
      usage: data.usage,
      processingTimeMs: Date.now() - startTime
    };
  } catch (error) {
    console.error('OpenRouter API error:', error);
    return { success: false, error: error.message, processingTimeMs: Date.now() - startTime };
  }
};

// AI Home Inspection Reporter - Generates inspection reports
export const generateHomeInspection = async (floorPlanData, inspectionType = 'general') => {
  const startTime = Date.now();

  const roomsSummary = floorPlanData.rooms?.map(r => `${r.name} (${r.room_type}): ${r.area || 0} sq ft`).join(', ') || 'No rooms specified';

  const prompt = `Generate a comprehensive home inspection report:

**Property:** ${floorPlanData.name || 'Property'}
**Total Area:** ${floorPlanData.total_area || 0} sq ft
**Inspection Type:** ${inspectionType}
**Rooms:** ${roomsSummary}

## Executive Summary

**Overall Condition:** Excellent/Good/Fair/Poor
**Recommended Action:** Move-in Ready / Minor Repairs / Major Repairs / Significant Concerns

### Key Findings
- X critical issues
- X major issues
- X minor issues

## Detailed Inspection Report

### Structural Elements

#### Foundation
| Component | Condition | Notes |
|-----------|-----------|-------|
| Foundation walls | Good | Minor settling observed |

#### Framing
| Component | Condition | Notes |
|-----------|-----------|-------|

### Exterior

#### Roof
- Type: Asphalt shingle / Metal / Tile
- Estimated age: X years
- Condition: Good/Fair/Poor
- Remaining lifespan: X years

#### Siding & Trim
| Component | Condition | Notes |
|-----------|-----------|-------|

#### Windows & Doors
| Location | Type | Condition | Notes |
|----------|------|-----------|-------|

### Interior Systems

#### Plumbing
| Component | Condition | Notes |
|-----------|-----------|-------|
| Water heater | Fair | 8 years old, consider replacement |

#### Electrical
| Component | Condition | Notes |
|-----------|-----------|-------|
| Panel | Good | 200 amp service |

#### HVAC
| Component | Condition | Age | Notes |
|-----------|-----------|-----|-------|

### Room-by-Room Inspection

#### ${floorPlanData.rooms?.[0]?.name || 'Living Room'}
| Item | Condition | Issue | Priority |
|------|-----------|-------|----------|

## Issues Summary

### Critical (Immediate Action Required)
| # | Issue | Location | Est. Repair Cost |
|---|-------|----------|------------------|

### Major (Address Within 6 Months)
| # | Issue | Location | Est. Repair Cost |
|---|-------|----------|------------------|

### Minor (Routine Maintenance)
| # | Issue | Location | Est. Repair Cost |
|---|-------|----------|------------------|

## Cost Summary
| Priority | Count | Total Est. Cost |
|----------|-------|-----------------|
| Critical | X | $X,XXX |
| Major | X | $X,XXX |
| Minor | X | $X,XXX |
| **Total** | **X** | **$XX,XXX** |

## Recommendations
1. Prioritized list of actions
2. Next steps

CRITICAL: End with this JSON:

\`\`\`json
{
  "inspection_type": "${inspectionType}",
  "overall_condition": "Good",
  "critical_issues": 1,
  "estimated_repair_cost": 8500,
  "issues_found": [
    {"item": "Water heater aging", "location": "Utility room", "severity": "major", "cost": 1500, "priority": 2},
    {"item": "Missing caulk around windows", "location": "Living room", "severity": "minor", "cost": 50, "priority": 5}
  ]
}
\`\`\``;

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': AI_REFERER,
        'X-Title': 'AI Floor Plan Analyzer'
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        messages: [
          {
            role: 'system',
            content: 'You are a certified home inspector with extensive experience in residential property evaluation. Provide thorough, professional inspection reports that identify issues and estimate repair costs.'
          },
          { role: 'user', content: prompt }
        ],
        max_tokens: 10000,
        temperature: 0.5
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'OpenRouter API error');
    }

    const data = await response.json();
    return {
      success: true,
      analysis: data.choices[0].message.content,
      model: data.model,
      usage: data.usage,
      processingTimeMs: Date.now() - startTime
    };
  } catch (error) {
    console.error('OpenRouter API error:', error);
    return { success: false, error: error.message, processingTimeMs: Date.now() - startTime };
  }
};

// AI Contractor Matcher - Ranks contractors by fit for a project
export const matchContractors = async (contractors, costEstimates, jobType, budgetRange) => {
  const startTime = Date.now();

  const contractorSummary = contractors.map(c =>
    `- ${c.name} (${c.specialty || 'General'}): Rating ${c.rating || 'N/A'}, ${c.location || 'Location unknown'}, ${c.license_number ? 'Licensed' : 'Unlicensed'}`
  ).join('\n');

  const estimateSummary = costEstimates.length > 0
    ? costEstimates.map(e => `- ${e.title || 'Estimate'}: $${e.total_cost || 0} (Labor: $${e.labor_cost || 0}, Materials: $${e.material_cost || 0})`).join('\n')
    : 'No existing cost estimates available';

  const prompt = `Given these contractor specializations and cost estimates, rank contractors by fit for this project.

## Project Details
- Job Type: ${jobType}
- Budget Range: ${budgetRange}

## Available Contractors
${contractorSummary}

## Existing Cost Estimates
${estimateSummary}

Return a ranked list with fit score (1-100), rationale, and red flags for each contractor. Format as JSON:
\`\`\`json
{
  "ranked_contractors": [
    {"name": "Contractor Name", "fit_score": 85, "rationale": "...", "red_flags": ["..."], "recommended": true}
  ],
  "recommendation_summary": "Overall recommendation..."
}
\`\`\``;

  try {
    const data = await callOpenRouterWithRetry({
      model: OPENROUTER_MODEL,
      messages: [
        {
          role: 'system',
          content: 'You are an expert construction project manager who evaluates contractors for renovation projects. Provide objective, data-driven rankings.'
        },
        { role: 'user', content: prompt }
      ],
      max_tokens: 4000,
      temperature: 0.5
    });

    const content = data.choices[0].message.content;
    return {
      success: true,
      analysis: content,
      parsed: parseJsonResponse(content),
      model: data.model,
      usage: data.usage,
      processingTimeMs: Date.now() - startTime
    };
  } catch (error) {
    console.error('Contractor matcher AI error:', error);
    return { success: false, error: error.message, processingTimeMs: Date.now() - startTime };
  }
};

// AI Portfolio Analyzer - Compares multiple properties
export const analyzePortfolio = async (floorPlans) => {
  const startTime = Date.now();

  const propertySummaries = floorPlans.map((fp, i) =>
    `### Property ${i + 1}: ${fp.name}
- Total Area: ${fp.total_area || 'Unknown'} sq ft
- Rooms: ${fp.rooms?.length || 0} (${fp.rooms?.map(r => r.room_type || r.name).join(', ') || 'none'})
- Existing analyses: ${fp.analyses?.length || 0}`
  ).join('\n\n');

  const prompt = `Compare these ${floorPlans.length} properties and provide a portfolio analysis.

${propertySummaries}

Rank each property by:
1. Renovation ROI potential
2. Maintenance risk
3. Energy efficiency improvement potential

Provide a portfolio summary and strategic recommendations. Format response as JSON:
\`\`\`json
{
  "portfolio_summary": "...",
  "properties": [
    {
      "name": "Property Name",
      "roi_potential_rank": 1,
      "maintenance_risk_rank": 2,
      "energy_efficiency_rank": 1,
      "roi_score": 85,
      "maintenance_risk_score": 30,
      "energy_score": 70,
      "key_opportunities": ["...", "..."],
      "key_risks": ["..."]
    }
  ],
  "strategic_recommendations": ["...", "..."],
  "best_investment": "Property Name"
}
\`\`\``;

  try {
    const data = await callOpenRouterWithRetry({
      model: OPENROUTER_MODEL,
      messages: [
        {
          role: 'system',
          content: 'You are a real estate investment analyst specializing in renovation ROI, property maintenance, and energy efficiency. Provide data-driven portfolio analysis.'
        },
        { role: 'user', content: prompt }
      ],
      max_tokens: 6000,
      temperature: 0.5
    });

    const content = data.choices[0].message.content;
    return {
      success: true,
      analysis: content,
      parsed: parseJsonResponse(content),
      model: data.model,
      usage: data.usage,
      processingTimeMs: Date.now() - startTime
    };
  } catch (error) {
    console.error('Portfolio analyzer AI error:', error);
    return { success: false, error: error.message, processingTimeMs: Date.now() - startTime };
  }
};

// Comparable Property Analyzer — cross-references floor plan analysis with local real estate context
export const analyzeComparableProperty = async (floorPlanAnalysis, propertyAddress, renovationData = null) => {
  const payload = {
    model: OPENROUTER_MODEL,
    messages: [
      {
        role: 'user',
        content: `You are a real estate investment analyst with expertise in renovation ROI and comparable market analysis.

Analyze this property's renovation potential compared to local real estate comps and estimate the market ROI.

Property Address: ${propertyAddress}

Floor Plan Analysis Summary:
${JSON.stringify(floorPlanAnalysis, null, 2)}

Renovation Data (if available):
${renovationData ? JSON.stringify(renovationData, null, 2) : 'No renovation data provided'}

Based on typical comparable sales data for this type of property and the floor plan characteristics, provide:

Return JSON in this exact format:
{
  "property_assessment": {
    "estimated_square_footage": number_or_null,
    "property_type": "single-family/condo/townhouse/multi-family",
    "layout_quality_score": 1-10,
    "renovation_appeal": "low/medium/high"
  },
  "market_roi_estimate": {
    "renovation_cost_estimate": "$range",
    "estimated_value_increase": "$range",
    "roi_percentage": "X-Y%",
    "payback_period_months": number,
    "confidence_level": "low/medium/high"
  },
  "comparable_insights": [
    {
      "factor": "comparable factor name",
      "impact": "positive/negative/neutral",
      "detail": "explanation"
    }
  ],
  "top_value_adding_renovations": [
    {
      "renovation": "name",
      "cost_estimate": "$X,000-$Y,000",
      "value_add": "$X,000-$Y,000",
      "roi": "X%"
    }
  ],
  "market_positioning": "2-3 sentence summary of how this property competes in its market",
  "investment_recommendation": "buy-and-renovate/sell-as-is/rent/hold",
  "caveats": ["important disclaimer 1", "get professional appraisal disclaimer"]
}`
      }
    ],
    max_tokens: 2000,
    temperature: 0.4,
  };

  try {
    const result = await callOpenRouterWithRetry(payload);
    if (result.error) return result;
    const parsed = parseJsonResponse(result.analysis);
    return {
      success: true,
      model: result.model,
      property_address: propertyAddress,
      analysis: parsed,
      generated_at: new Date().toISOString(),
    };
  } catch (err) {
    return { error: err.message, success: false };
  }
};

export default {
  analyzeFloorPlan,
  generateRenovationSuggestions,
  estimateCosts,
  recommendMaterials,
  analyzeLayoutOptimization,
  detectRooms,
  getHomeStagingAdvice,
  placeFurniture,
  predictMaintenance,
  auditEnergyEfficiency,
  generateHomeInspection,
  matchContractors,
  analyzePortfolio,
  analyzeComparableProperty,
};
