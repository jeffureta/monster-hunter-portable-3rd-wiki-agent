import { GoogleGenAI } from '@google/genai';
import { solveQuestTactics, TacticalSolution } from './tactical-solver';
import monstersData from '../data/monsters.json';
import mapsData from '../data/maps.json';

export interface HunterAgentResponse {
  query: string;
  solverOutput: TacticalSolution;
  tacticalAdvice: string;
  isCached?: boolean;
}

// In-memory cache for ultra-fast, zero-token repeated questions
const responseCache = new Map<string, HunterAgentResponse>();

/**
 * Extracts monster and map mentions from natural language query
 */
export function parseQueryEntities(userPrompt: string): { monsters: string[]; map?: string } {
  const promptLower = userPrompt.toLowerCase();

  const foundMonsters: string[] = [];
  for (const m of monstersData) {
    if (
      promptLower.includes(m.name.toLowerCase()) ||
      m.aliases.some(a => promptLower.includes(a.toLowerCase())) ||
      promptLower.includes(m.id)
    ) {
      foundMonsters.push(m.name);
    }
  }

  let matchedMap: string | undefined = undefined;
  for (const map of mapsData) {
    if (
      promptLower.includes(map.name.toLowerCase()) ||
      map.aliases.some(a => promptLower.includes(a.toLowerCase()))
    ) {
      matchedMap = map.name;
      break;
    }
  }

  return { monsters: foundMonsters, map: matchedMap };
}

/**
 * Consults the MHP3rd Hunter Tactical Agent
 * 1. Solves the exact math deterministically (0 tokens)
 * 2. Uses Gemini Flash only to formulate crisp, tactical hunter advice
 */
export async function consultHunterAgent(userPrompt: string, apiKey?: string): Promise<HunterAgentResponse> {
  const normalizedKey = userPrompt.trim().toLowerCase();
  if (responseCache.has(normalizedKey)) {
    const cached = responseCache.get(normalizedKey)!;
    return { ...cached, isCached: true };
  }

  // Step 1: Deterministic entity parsing and tactical math (0 tokens)
  const entities = parseQueryEntities(userPrompt);
  const solverOutput = solveQuestTactics({
    monsters: entities.monsters.length > 0 ? entities.monsters : ['Zinogre'],
    map: entities.map
  });

  const keyToUse = apiKey || process.env.GEMINI_API_KEY;

  // Fallback: If no API key is provided, return pure deterministic tactical briefing (0 tokens)
  if (!keyToUse) {
    const bestElem = solverOutput.bestElements[0];
    const tacticalAdvice = [
      `### Tactical Briefing (Deterministic Offline Mode)`,
      `- **Target Monsters:** ${solverOutput.monsters.map(m => m.name).join(', ')}`,
      `- **Recommended Element:** **${bestElem.element}** (Rating: ${bestElem.score} total)`,
      `- **Core Strategy:** ${solverOutput.recommendedStrategy}`,
      `- **Environmental Prep:** ${solverOutput.mapRequirements.mapName} — Hot Drink: ${solverOutput.mapRequirements.needsHotDrink ? 'YES' : 'NO'}, Cool Drink: ${solverOutput.mapRequirements.needsCoolDrink ? 'YES' : 'NO'}.`
    ].join('\n');

    const result: HunterAgentResponse = {
      query: userPrompt,
      solverOutput,
      tacticalAdvice,
      isCached: false
    };
    responseCache.set(normalizedKey, result);
    return result;
  }

  // Step 2: Use Gemini Flash with minimal tokens
  const ai = new GoogleGenAI({ apiKey: keyToUse });
  const compactContext = JSON.stringify({
    monsters: solverOutput.monsters.map(m => ({
      name: m.name,
      bestWeakness: m.bestPhysicalWeakness,
      elementRank: m.elements,
      specialNotes: (m as any).specialNotes
    })),
    bestElements: solverOutput.bestElements.slice(0, 3),
    map: solverOutput.mapRequirements,
    strategy: solverOutput.recommendedStrategy
  });

  const prompt = `You are a veteran Monster Hunter Portable 3rd Guild Advisor. Answer the hunter's question using this verified MHP3rd game data:
${compactContext}

Question: "${userPrompt}"

Format rules:
- Keep it concise, practical, and punchy (under 180 words).
- Mention the single best weapon element/raw choice, which body part to focus on, and any essential map items (Hot/Cool drinks, traps).
- If multiple monsters are present, explain the cross-monster trade-off.`;

  const response = await ai.models.generateContent({
    model: 'gemini-3.8-flash',
    contents: prompt
  });

  const tacticalAdvice = response.text || solverOutput.recommendedStrategy;

  const result: HunterAgentResponse = {
    query: userPrompt,
    solverOutput,
    tacticalAdvice,
    isCached: false
  };

  responseCache.set(normalizedKey, result);
  return result;
}
