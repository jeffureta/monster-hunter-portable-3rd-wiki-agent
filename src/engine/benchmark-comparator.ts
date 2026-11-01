import monstersData from '../data/monsters.json';
import mapsData from '../data/maps.json';
import { solveQuestTactics } from './tactical-solver';
import { GoogleGenAI } from '@google/genai';

export interface TacticalDivergenceInput {
  query: string;
  mhp3rdAdvisorText: string;
  genericSearchText: string;
  targetMonsters: string[];
}

export interface TacticalDivergenceReport {
  query: string;
  divergencePercentage: number;
  mhp3rdSpecificHitzoneScore: number;
  genericSpecificHitzoneScore: number;
  mhp3rdMechanicKeywordsFound: string[];
  genericMechanicKeywordsFound: string[];
  keyDifferences: string[];
}

/**
 * Normalizes text into word tokens
 */
function tokenize(text: string): Set<string> {
  const words = text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2);
  return new Set(words);
}

/**
 * Computes Jaccard distance between two texts (0 to 1)
 */
function computeLexicalDistance(a: string, b: string): number {
  const tokensA = tokenize(a);
  const tokensB = tokenize(b);

  if (tokensA.size === 0 && tokensB.size === 0) return 0;

  const intersection = new Set([...tokensA].filter(x => tokensB.has(x)));
  const union = new Set([...tokensA, ...tokensB]);

  const similarity = intersection.size / union.size;
  return 1 - similarity;
}

/**
 * Calculates domain specificity score for Monster Hunter Portable 3rd
 */
function calculateMhp3rdSpecificity(
  text: string, 
  targetMonsters: string[]
): { score: number; keywords: string[] } {
  const lower = text.toLowerCase();
  const keywordsFound: string[] = [];
  let score = 0;

  // Check hitzone specificity
  const hitzoneTerms = ['head', 'wings', 'tail', 'belly', 'cut', 'impact', 'shot', 'hitzone'];
  for (const term of hitzoneTerms) {
    if (lower.includes(term)) {
      keywordsFound.push(term);
      score += 10;
    }
  }

  // Check portable 3rd mechanics
  const mechanicTerms = [
    'shock trap', 'pitfall trap', 'earplugs', 'hot drink', 'cool drink', 
    'antidote', 'enraged', 'charge', 'spirit slash', 'ice', 'thunder', 'dragon'
  ];
  for (const term of mechanicTerms) {
    if (lower.includes(term)) {
      keywordsFound.push(term);
      score += 10;
    }
  }

  // Check for hitzone numeric values (e.g. 60, 55, 65)
  const numbersFound = text.match(/\b([4-7][0-9])\b/g);
  if (numbersFound && numbersFound.length > 0) {
    score += 20;
    keywordsFound.push(`numeric hitzones (${numbersFound.join(', ')})`);
  }

  return { 
    score: Math.min(score, 100), 
    keywords: Array.from(new Set(keywordsFound)) 
  };
}

/**
 * Calculates tactical divergence percentage between MHP3rd advisor and generic search AI
 */
export function calculateTacticalDivergence(input: TacticalDivergenceInput): TacticalDivergenceReport {
  const { query, mhp3rdAdvisorText, genericSearchText, targetMonsters } = input;

  if (mhp3rdAdvisorText.trim() === genericSearchText.trim()) {
    return {
      query,
      divergencePercentage: 0,
      mhp3rdSpecificHitzoneScore: 100,
      genericSpecificHitzoneScore: 100,
      mhp3rdMechanicKeywordsFound: [],
      genericMechanicKeywordsFound: [],
      keyDifferences: ['Exact identical responses']
    };
  }

  // 1. Lexical & semantic distance
  const lexicalDist = computeLexicalDistance(mhp3rdAdvisorText, genericSearchText);

  // 2. MHP3rd Game Domain Specificity
  const mhp3rdEval = calculateMhp3rdSpecificity(mhp3rdAdvisorText, targetMonsters);
  const genericEval = calculateMhp3rdSpecificity(genericSearchText, targetMonsters);

  // 3. Composite divergence percentage (0 - 100%)
  const specificityDelta = Math.abs(mhp3rdEval.score - genericEval.score) / 100;
  const compositeDivergence = Math.round(((lexicalDist * 0.6) + (specificityDelta * 0.4)) * 100);

  const keyDifferences: string[] = [];
  if (mhp3rdEval.score > genericEval.score) {
    keyDifferences.push(`MHP3rd Advisor includes verified hitzones and game mechanics missing from generic search (${mhp3rdEval.score}% vs ${genericEval.score}%)`);
  }
  if (!genericSearchText.toLowerCase().includes('drink') && mhp3rdAdvisorText.toLowerCase().includes('drink')) {
    keyDifferences.push('MHP3rd Advisor specifies environmental map drink requirements');
  }
  if (mhp3rdAdvisorText.toLowerCase().includes('trap') && !genericSearchText.toLowerCase().includes('trap')) {
    keyDifferences.push('MHP3rd Advisor warns on critical trap interactions');
  }

  return {
    query,
    divergencePercentage: Math.min(Math.max(compositeDivergence, 1), 100),
    mhp3rdSpecificHitzoneScore: mhp3rdEval.score,
    genericSpecificHitzoneScore: genericEval.score,
    mhp3rdMechanicKeywordsFound: mhp3rdEval.keywords,
    genericMechanicKeywordsFound: genericEval.keywords,
    keyDifferences
  };
}

/**
 * Runs a live comparison query generating both:
 * 1. MHP3rd Deterministic Tactical Advisor response
 * 2. Simulated Generic Web/Search AI response (unconstrained generic LLM without MHP3rd database)
 */
export async function generateBenchmarkComparison(
  query: string, 
  apiKey?: string
): Promise<{
  advisorResponse: string;
  genericResponse: string;
  divergenceReport: TacticalDivergenceReport;
}> {
  const keyToUse = apiKey || process.env.GEMINI_API_KEY;
  if (!keyToUse) {
    throw new Error('API key required for live benchmark comparison');
  }

  const ai = new GoogleGenAI({ apiKey: keyToUse });

  // 1. Generate generic search response (no MHP3rd database grounding)
  const genericPrompt = `You are a standard Google Web Search AI assistant. Answer this player query directly and generally:
Question: "${query}"`;

  const genericCall = await ai.models.generateContent({
    model: 'gemini-3.8-flash',
    contents: genericPrompt
  });
  const genericResponse = genericCall.text || 'No response';

  // 2. Generate MHP3rd Advisor response (grounded with our deterministic engine)
  const { consultHunterAgent } = await import('./agent');
  const advisorCall = await consultHunterAgent(query, keyToUse);
  const advisorResponse = advisorCall.tacticalAdvice;

  const targetMonsters = advisorCall.solverOutput.monsters.map(m => m.name);

  // 3. Calculate divergence
  const divergenceReport = calculateTacticalDivergence({
    query,
    mhp3rdAdvisorText: advisorResponse,
    genericSearchText: genericResponse,
    targetMonsters
  });

  return {
    advisorResponse,
    genericResponse,
    divergenceReport
  };
}
