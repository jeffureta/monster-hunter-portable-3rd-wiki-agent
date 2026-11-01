import monstersData from '../data/monsters.json';
import mapsData from '../data/maps.json';

export type ElementType = 'Fire' | 'Water' | 'Thunder' | 'Ice' | 'Dragon';

export interface MonsterProfile {
  id: string;
  name: string;
  aliases: string[];
  species: string;
  elements: Record<ElementType, number>;
  weakestElement: ElementType;
  immuneElements: ElementType[];
  bestPhysicalWeakness: {
    part: string;
    cut: number;
    impact: number;
    shot: number;
  };
  status: Record<string, string>;
  hazards: {
    roar: string;
    wind: string;
    tremor: string;
  };
}

export interface MapProfile {
  id: string;
  name: string;
  aliases: string[];
  needsHotDrink: boolean;
  needsCoolDrink: boolean;
  hasWaterAreas: boolean;
  description: string;
  note?: string;
}

export interface QuestQuery {
  monsters: string[];
  map?: string;
}

export interface ElementEvaluation {
  element: ElementType;
  score: number;
  hasImmuneMonster: boolean;
  breakdown: {
    monster: string;
    effectiveness: number;
    isImmune: boolean;
  }[];
}

export interface TacticalSolution {
  monsters: MonsterProfile[];
  bestElements: ElementEvaluation[];
  recommendedStrategy: string;
  mapRequirements: {
    mapName: string;
    needsHotDrink: boolean;
    needsCoolDrink: boolean;
    notes: string;
  };
}

const ALL_ELEMENTS: ElementType[] = ['Fire', 'Water', 'Thunder', 'Ice', 'Dragon'];

export function findMonster(nameOrAlias: string): MonsterProfile | undefined {
  const clean = nameOrAlias.trim().toLowerCase();
  return (monstersData as MonsterProfile[]).find(m =>
    m.name.toLowerCase() === clean ||
    m.aliases.some(a => a.toLowerCase() === clean) ||
    m.id.toLowerCase() === clean
  );
}

export function findMap(nameOrAlias?: string): MapProfile {
  if (!nameOrAlias) {
    return {
      id: 'unknown',
      name: 'Standard Field',
      aliases: [],
      needsHotDrink: false,
      needsCoolDrink: false,
      hasWaterAreas: false,
      description: 'Standard temperate hunting grounds.'
    };
  }
  const clean = nameOrAlias.trim().toLowerCase();
  const found = (mapsData as MapProfile[]).find(m =>
    m.name.toLowerCase() === clean ||
    m.aliases.some(a => a.toLowerCase() === clean) ||
    m.id.toLowerCase() === clean
  );
  return found || {
    id: clean,
    name: nameOrAlias,
    aliases: [],
    needsHotDrink: clean.includes('tundra') || clean.includes('snow'),
    needsCoolDrink: clean.includes('volcano') || clean.includes('lava'),
    hasWaterAreas: false,
    description: 'Custom field map'
  };
}

export function solveQuestTactics(query: QuestQuery): TacticalSolution {
  const matchedMonsters: MonsterProfile[] = [];
  for (const mName of query.monsters) {
    const profile = findMonster(mName);
    if (profile) {
      matchedMonsters.push(profile);
    }
  }

  const mapProfile = findMap(query.map);

  // Evaluate each element across all monsters
  const elementEvaluations: ElementEvaluation[] = ALL_ELEMENTS.map(element => {
    let totalScore = 0;
    let hasImmune = false;
    const breakdown = matchedMonsters.map(m => {
      const val = m.elements[element] || 0;
      const isImmune = m.immuneElements.includes(element) || val === 0;
      if (isImmune) {
        hasImmune = true;
      }
      totalScore += val;
      return {
        monster: m.name,
        effectiveness: val,
        isImmune
      };
    });

    return {
      element,
      score: totalScore,
      hasImmuneMonster: hasImmune,
      breakdown
    };
  });

  // Sort elements: non-immune first, then by highest cumulative score
  elementEvaluations.sort((a, b) => {
    if (a.hasImmuneMonster !== b.hasImmuneMonster) {
      return a.hasImmuneMonster ? 1 : -1;
    }
    return b.score - a.score;
  });

  // Formulate clear tactical guidance
  let recommendedStrategy = '';
  const topViable = elementEvaluations.find(e => !e.hasImmuneMonster);

  if (matchedMonsters.length === 1) {
    recommendedStrategy = `Exploit primary elemental weakness (${matchedMonsters[0].weakestElement}) with high cut/impact on ${matchedMonsters[0].bestPhysicalWeakness.part}.`;
  } else if (topViable && topViable.score > 20) {
    recommendedStrategy = `Use unified ${topViable.element} weapon to cover all target monsters without suffering complete immunity.`;
  } else {
    recommendedStrategy = `Conflicting elemental immunities across targets. High Raw damage, Poison status, or high-affinity weapon with purple/white sharpness is recommended over elemental specialisation.`;
  }

  return {
    monsters: matchedMonsters,
    bestElements: elementEvaluations,
    recommendedStrategy,
    mapRequirements: {
      mapName: mapProfile.name,
      needsHotDrink: mapProfile.needsHotDrink,
      needsCoolDrink: mapProfile.needsCoolDrink,
      notes: mapProfile.description
    }
  };
}
