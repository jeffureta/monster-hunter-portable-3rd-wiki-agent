import { describe, it, expect } from 'vitest';
import { 
  calculateTacticalDivergence, 
  generateBenchmarkComparison,
  type TacticalDivergenceReport 
} from '../src/engine/benchmark-comparator';

describe('Benchmark Comparison Engine (TDD Red Phase)', () => {
  it('should calculate divergence metrics between MHP3rd deterministic agent and generic baseline AI', () => {
    // Ground truth MHP3rd advisor advice: Ice or Dragon, Head/Wings, Rathalos roar damage, Rathian tail flip poison
    const mhp3rdAdvisorText = `For Rathian and Rathalos, bring a Dragon or Thunder Bow (Ice also works). Focus your shots on the Head (Shot hitzone 60 for Rathian, 55 for Rathalos) and Wings. Beware Rathian backflip poison (pack Antidotes) and Rathalos aerial fireballs.`;
    
    // Generic baseline LLM response often hallucinates World/Rise mechanics or fails hitzone specificity
    const genericSearchText = `To fight Rathian and Rathalos in Monster Hunter, use a Thunder or Water bow. Aim for their tail and body parts. Watch out for fire breath and use flash bombs.`;

    const report: TacticalDivergenceReport = calculateTacticalDivergence({
      query: "What is the best bow against Rathian and Rathalos?",
      mhp3rdAdvisorText,
      genericSearchText,
      targetMonsters: ["Rathian", "Rathalos"]
    });

    expect(report).toBeDefined();
    expect(report.query).toBe("What is the best bow against Rathian and Rathalos?");
    // Semantic difference percentage should be between 0 and 100
    expect(report.divergencePercentage).toBeGreaterThan(0);
    expect(report.divergencePercentage).toBeLessThanOrEqual(100);
    // Hitzone accuracy score of MHP3rd advisor should detect exact Portable 3rd shot hitzone
    expect(report.mhp3rdSpecificHitzoneScore).toBeGreaterThanOrEqual(80);
    // Generic search should score significantly lower on MHP3rd game mechanics
    expect(report.genericSpecificHitzoneScore).toBeLessThan(report.mhp3rdSpecificHitzoneScore);
    // Game mechanics detected (MHP3rd specific traps, hitzone numbers, drinks)
    expect(report.mhp3rdMechanicKeywordsFound.length).toBeGreaterThan(0);
  });

  it('should return 0% divergence when comparing identical advice', () => {
    const text = `Use Ice against Zinogre. Aim for the Head.`;
    const report = calculateTacticalDivergence({
      query: "Best weapon against Zinogre?",
      mhp3rdAdvisorText: text,
      genericSearchText: text,
      targetMonsters: ["Zinogre"]
    });

    expect(report.divergencePercentage).toBe(0);
  });
});
