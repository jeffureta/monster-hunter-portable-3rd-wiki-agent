import { GoogleGenAI } from '@google/genai';
import { solveQuestTactics, TacticalSolution } from './tactical-solver';
import monstersData from '../data/monsters.json';
import mapsData from '../data/maps.json';

export interface GroundingSource {
  title?: string;
  url?: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface HunterAgentResponse {
  query: string;
  solverOutput: TacticalSolution;
  tacticalAdvice: string;
  sources?: GroundingSource[];
  isCached?: boolean;
  isOfflineFallback?: boolean;
  workflowSteps?: Array<{
    title: string;
    description: string;
    status: 'complete' | 'running' | 'pending';
  }>;
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

export interface HunterAgentOptions {
  apiKey?: string;
  preferredWeapon?: string;
  history?: ChatMessage[];
}

/**
 * Consults the MHP3rd Hunter Tactical Agent
 * 1. Solves the exact math deterministically (0 tokens)
 * 2. Uses Gemini Flash only to formulate crisp, tactical hunter advice with multi-turn support
 */
export async function consultHunterAgent(
  userPrompt: string,
  options?: string | HunterAgentOptions
): Promise<HunterAgentResponse> {
  const apiKey = typeof options === 'string' ? options : options?.apiKey;
  const preferredWeapon = typeof options === 'object' ? options.preferredWeapon : undefined;
  const history = typeof options === 'object' ? options.history || [] : [];

  const historyKey = history.length > 0 ? `::hist_${history.length}` : '';
  const normalizedKey = `${userPrompt.trim().toLowerCase()}::${preferredWeapon || 'any'}${historyKey}`;
  if (responseCache.has(normalizedKey)) {
    const cached = responseCache.get(normalizedKey)!;
    return { ...cached, isCached: true };
  }

  // Step 1: Deterministic entity parsing and tactical math (0 tokens)
  // Include past user messages to extract context (e.g. which monster we are talking about)
  const contextForEntities = [
    ...history.filter(m => m.role === 'user').map(m => m.content),
    userPrompt
  ].join(' ');
  const entities = parseQueryEntities(contextForEntities);
  const solverOutput = solveQuestTactics({
    monsters: entities.monsters.length > 0 ? entities.monsters : ['Zinogre'],
    map: entities.map
  });

  const keyToUse = apiKey || process.env.GEMINI_API_KEY;

  // Helper to build deterministic fallback response
  const buildOfflineResponse = (): HunterAgentResponse => {
    const bestElem = solverOutput.bestElements[0];
    const tacticalAdvice = [
      `### Tactical Briefing (Deterministic Offline Mode)`,
      `- **Target Monsters:** ${solverOutput.monsters.map(m => m.name).join(', ')}`,
      `- **Recommended Element:** **${bestElem.element}** (Rating: ${bestElem.score} total)`,
      preferredWeapon ? `- **Hunter Weapon Focus:** **${preferredWeapon}** (Tailored combat advice active)` : '',
      `- **Core Strategy:** ${solverOutput.recommendedStrategy}`,
      `- **Environmental Prep:** ${solverOutput.mapRequirements.mapName} — Hot Drink: ${solverOutput.mapRequirements.needsHotDrink ? 'YES' : 'NO'}, Cool Drink: ${solverOutput.mapRequirements.needsCoolDrink ? 'YES' : 'NO'}.`
    ].filter(Boolean).join('\n');

    const workflowSteps = [
      {
        title: 'Query Entity Parsing',
        description: `Identified target(s): ${entities.monsters.length > 0 ? entities.monsters.join(', ') : 'Zinogre (fallback)'}${entities.map ? ` in ${entities.map}` : ''}`,
        status: 'complete' as const
      },
      {
        title: 'Deterministic Tactical Math Engine',
        description: `Calculated elemental effectiveness matrix across 5 elements and physical hitzone thresholds`,
        status: 'complete' as const
      },
      {
        title: 'Offline Tactical Generator',
        description: `Formulated instant zero-token guild briefing strategy`,
        status: 'complete' as const
      }
    ];

    return {
      query: userPrompt,
      solverOutput,
      tacticalAdvice,
      sources: [],
      isCached: false,
      isOfflineFallback: true,
      workflowSteps
    };
  };

  // Fallback: If no API key is provided, return pure deterministic tactical briefing (0 tokens)
  if (!keyToUse) {
    const offlineResult = buildOfflineResponse();
    responseCache.set(normalizedKey, offlineResult);
    return offlineResult;
  }

  // Step 2: Use Gemini Flash with Google Search Grounding for specific weapon trees & skills
  try {
    const ai = new GoogleGenAI({ apiKey: keyToUse });
    const compactContext = JSON.stringify({
      game: "Monster Hunter Portable 3rd (PSP / English Patch)",
      monsters: solverOutput.monsters.map(m => ({
        name: m.name,
        bestWeakness: m.bestPhysicalWeakness,
        elementRank: m.elements,
        specialNotes: (m as any).specialNotes
      })),
      bestElements: solverOutput.bestElements.slice(0, 3),
      map: solverOutput.mapRequirements,
      strategy: solverOutput.recommendedStrategy,
      preferredWeapon: preferredWeapon || 'General'
    });

    const conversationHistoryText = history.length > 0
      ? `\nPrior conversation history:\n${history.map(h => `${h.role === 'user' ? 'Hunter' : 'Advisor'}: ${h.content}`).join('\n')}\n`
      : '';

    const prompt = `You are an elite Monster Hunter Portable 3rd Guild Advisor. Answer the hunter's question using this verified MHP3rd game data and live search:
${compactContext}
${conversationHistoryText}
Current Question: "${userPrompt}"
${preferredWeapon ? `Hunter Main Weapon: "${preferredWeapon}" - Give specific MHP3rd craftable weapon trees, optimal armor skills (e.g. Load Up, Weakness Exploit, Sharpness +1), and combat tips.` : ''}

Format rules:
- Format as a clean, polished Guild Search Overview with clear sections, crisp bullet points, and highlight terms in bold.
- Keep it concise, practical, and punchy (under 200 words).
- Recommend specific MHP3rd weapon trees/endgame weapons (e.g., Akantor, Alatreon, Jinouga weapon lines) and key armor skills.
- Ensure all weapons, skills, and mechanics exist in Monster Hunter Portable 3rd (do NOT mention World, Rise, or GU).
- Mention essential map items (Hot/Cool drinks, traps) if relevant.
- Do NOT use robotic headers like "### Tactical Briefing (Deterministic Offline Mode)" or raw dump formats. Write directly to the hunter.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }]
      }
    });

    const tacticalAdvice = response.text || solverOutput.recommendedStrategy;

    // Extract web search grounding sources
    const sources: GroundingSource[] = [];
    const candidate = response.candidates?.[0];
    const groundingChunks = (candidate as any)?.groundingMetadata?.groundingChunks;
    if (Array.isArray(groundingChunks)) {
      for (const chunk of groundingChunks) {
        if (chunk.web?.uri) {
          sources.push({
            title: chunk.web.title || chunk.web.uri,
            url: chunk.web.uri
          });
        }
      }
    }

    const workflowSteps = [
      {
        title: 'Entity & Context Extraction',
        description: `Parsed target: ${entities.monsters.length > 0 ? entities.monsters.join(', ') : 'Zinogre (default)'}${entities.map ? ` in ${entities.map}` : ''}${preferredWeapon ? ` (Weapon: ${preferredWeapon})` : ''}`,
        status: 'complete' as const
      },
      {
        title: 'Tactical Damage & Weakness Solver',
        description: `Computed hitzone formulas and ranked optimal elements (${solverOutput.bestElements.slice(0, 2).map(e => `${e.element}: ${e.score}`).join(', ')})`,
        status: 'complete' as const
      },
      {
        title: 'Google Search Grounding & Synthesis',
        description: `Cross-referenced MHP3rd database trees & grounded weapon trees via Gemini 3.8 Flash (${sources.length} sources referenced)`,
        status: 'complete' as const
      }
    ];

    const result: HunterAgentResponse = {
      query: userPrompt,
      solverOutput,
      tacticalAdvice,
      sources,
      isCached: false,
      isOfflineFallback: false,
      workflowSteps
    };

    responseCache.set(normalizedKey, result);
    return result;
  } catch (err) {
    // Seamless fallback to deterministic solver on network error, invalid key, or quota limit
    const fallbackResult = buildOfflineResponse();
    responseCache.set(normalizedKey, fallbackResult);
    return fallbackResult;
  }
}
