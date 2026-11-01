import { describe, it, expect } from 'vitest';
import { solveQuestTactics } from '../src/engine/tactical-solver';

describe('Tactical Solver Engine (TDD)', () => {
  it('should calculate the best elemental overlap and recommendations for a single monster (Zinogre)', () => {
    const result = solveQuestTactics({
      monsters: ['Zinogre'],
      map: 'Misty Peaks'
    });

    expect(result).toBeDefined();
    expect(result.monsters.length).toBe(1);
    expect(result.monsters[0].name).toBe('Zinogre');
    // In MHP3rd, Zinogre is primarily weak to Ice
    expect(result.bestElements[0].element).toBe('Ice');
    expect(result.bestElements[0].score).toBeGreaterThan(0);
    // Misty Peaks does not require hot or cool drinks
    expect(result.mapRequirements.needsHotDrink).toBe(false);
    expect(result.mapRequirements.needsCoolDrink).toBe(false);
  });

  it('should find the optimal intersecting weapon element across 3 monsters (Zinogre, Tigrex, Nargacuga)', () => {
    // Zinogre: Ice (highest), Water
    // Tigrex: Thunder (highest), Water
    // Nargacuga: Thunder (highest), Fire
    // Thunder hits Tigrex (25-35) and Narga (20-25), but Zinogre absorbs/takes 0 Thunder!
    // Water hits Zinogre (15) and Tigrex (15-20), neutral on Narga.
    // Or High Raw/Poison alternative.
    const result = solveQuestTactics({
      monsters: ['Zinogre', 'Tigrex', 'Nargacuga'],
      map: 'Misty Peaks'
    });

    expect(result.monsters.length).toBe(3);
    // Crucial check: Thunder should NOT be recommended as the unified element because Zinogre is immune!
    const thunderRec = result.bestElements.find(e => e.element === 'Thunder');
    expect(thunderRec?.hasImmuneMonster).toBe(true);

    // Should recommend a viable universal element or highlight Raw/Poison status
    expect(result.recommendedStrategy).toBeDefined();
    expect(result.bestElements.length).toBeGreaterThan(0);
  });

  it('should detect environmental drink requirements for harsh maps (Tundra & Volcano)', () => {
    const tundraResult = solveQuestTactics({
      monsters: ['Barioth'],
      map: 'Tundra'
    });
    expect(tundraResult.mapRequirements.needsHotDrink).toBe(true);
    expect(tundraResult.mapRequirements.needsCoolDrink).toBe(false);

    const volcanoResult = solveQuestTactics({
      monsters: ['Agnaktor'],
      map: 'Volcano'
    });
    expect(volcanoResult.mapRequirements.needsHotDrink).toBe(false);
    expect(volcanoResult.mapRequirements.needsCoolDrink).toBe(true);
  });
});
