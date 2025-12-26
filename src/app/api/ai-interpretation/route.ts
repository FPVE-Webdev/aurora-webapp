import OpenAI from 'openai';
import { NextResponse } from 'next/server';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { kp, probability, tromsoCloud, bestRegion } = await req.json();

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'OpenAI API key missing' }, { status: 500 });
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a factual aurora borealis reporter. 
          Your task is to write a single, neutral sentence interpreting the current conditions.
          
          RULES:
          - Maximum 1 sentence.
          - Neutral, factual tone only.
          - NO imperatives (no "go", "drive", "should").
          - NO hype (no "amazing", "stunning").
          - NO emojis.
          - NO future predictions.
          - Focus on: Activity level (based on Kp/Prob) and Cloud conditions.
          - Language: Norwegian (Bokmål).
          
          INPUT DATA:
          - Kp Index (0-9)
          - Probability (0-100%)
          - Tromsø Cloud Cover (0-100%)
          - Best Chase Region (if needing to escape clouds)
          
          EXAMPLES:
          - "Nordlysaktiviteten er moderat, men høyt skydekke over Tromsø gjør observasjon vanskelig."
          - "Forholdene i Tromsø er gode med lite skyer og stabil aktivitet."
          - "Aktiviteten er lav, og skydekket er varierende i regionen."
          `
        },
        {
          role: "user",
          content: JSON.stringify({
            kp,
            probability,
            tromsoCloud,
            bestRegion: bestRegion ? `${bestRegion.name} (${bestRegion.visibilityScore}% visibility)` : "None"
          })
        }
      ],
      temperature: 0.1, // Deterministic
      max_tokens: 60,
    });

    const interpretation = completion.choices[0].message.content?.trim();

    return NextResponse.json({ interpretation });
  } catch (error) {
    console.error('AI Interpretation Error:', error);
    return NextResponse.json({ error: 'Failed to generate interpretation' }, { status: 500 });
  }
}
