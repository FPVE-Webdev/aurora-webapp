import OpenAI from 'openai';
import { NextResponse } from 'next/server';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const cache = new Map<string, { data: string, timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes (in-memory)

export async function POST(req: Request) {
  try {
    const { kp, probability, tromsoCloud, bestRegion } = await req.json();

    // Cache Check (Task 4)
    const cacheKey = JSON.stringify({ kp, probability, tromsoCloud, bestRegion });
    const now = Date.now();
    
    if (cache.has(cacheKey)) {
      const { data, timestamp } = cache.get(cacheKey)!;
      if (now - timestamp < CACHE_TTL) {
        return NextResponse.json({ interpretation: data, cached: true });
      }
      cache.delete(cacheKey);
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'OpenAI API key missing' }, { status: 500 });
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a factual aurora borealis reporter. 
          Your task is to write a single, neutral sentence interpreting the current conditions based STRICTLY on the visual state of the map.
          
          VISUAL STATE RULES:
          - If "Tromsø Cloud Cover" is > 70%, the map visually dims Tromsø. You MUST mention high cloud cover in Tromsø.
          - If "Best Chase Region" is provided, the map draws a green circle around it. You MUST reference this region as an alternative.
          
          TONE & STYLE RULES:
          - Strict neutrality: No "good", "bad", "great", "poor", "challenging".
          - No emotion: No "unfortunately", "luckily".
          - No imperatives: No "go", "try", "drive".
          - No emojis.
          - MAX 2 sentences.
          - Language: Norwegian (Bokmål).
          
          INPUT DATA:
          - Kp Index (Visualized as number)
          - Probability (Visualized as %)
          - Tromsø Cloud Cover (Visualized as dimming if high)
          - Best Chase Region (Visualized as circle)
          `
        },
        {
          role: "user",
          content: cacheKey // Use the raw key as content since it's the JSON
        }
      ],
      temperature: 0.05, // Extremely deterministic (Task 3)
      max_tokens: 100, // Reduced token limit
    });

    const interpretation = completion.choices[0].message.content?.trim();
    
    // Set Cache
    if (interpretation) {
      cache.set(cacheKey, { data: interpretation, timestamp: now });
      // Simple pruning
      if (cache.size > 100 && cache.keys().next().value) {
        cache.delete(cache.keys().next().value!);
      }
    }

    return NextResponse.json({ interpretation });
  } catch (error) {
    console.error('AI Interpretation Error:', error);
    return NextResponse.json({ error: 'Failed to generate interpretation' }, { status: 500 });
  }
}
