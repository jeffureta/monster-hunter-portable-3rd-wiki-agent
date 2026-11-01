import { describe, it, expect } from 'vitest';
import { parseQueryEntities, consultHunterAgent } from '../src/engine/agent';

describe('Hunter Agent & Entity Parser (TDD)', () => {
  it('should parse monster names and maps out of casual hunter English queries', () => {
    const query = "What weapon should I bring against Jinouga and Tigrex in the Misty Peaks?";
    const parsed = parseQueryEntities(query);

    expect(parsed.monsters).toContain('Zinogre'); // Jinouga alias resolved
    expect(parsed.monsters).toContain('Tigrex');
    expect(parsed.map).toBe('Misty Peaks');
  });

  it('should parse 3-monster quest questions with Japanese aliases', () => {
    const query = "I have a quest with Doboruberuku, Narga, and Agna in Volcano";
    const parsed = parseQueryEntities(query);

    expect(parsed.monsters).toContain('Duramboros'); // Doboruberuku
    expect(parsed.monsters).toContain('Nargacuga');   // Narga
    expect(parsed.monsters).toContain('Agnaktor');    // Agna
    expect(parsed.map).toBe('Volcano');
  });

  it('should return tactical briefing even in zero-token offline mode (no API key needed)', async () => {
    const result = await consultHunterAgent(
      "Best weapon against Zinogre and Tigrex in Tundra?"
    );

    expect(result.solverOutput).toBeDefined();
    expect(result.solverOutput.monsters.length).toBe(2);
    expect(result.tacticalAdvice).toContain('Tactical Briefing');
    expect(result.solverOutput.mapRequirements.needsHotDrink).toBe(true);
  });

  it('should accept hunter weapon preference in options and incorporate into tactical advice', async () => {
    const result = await consultHunterAgent(
      "Best weapon against Zinogre in Misty Peaks?",
      { preferredWeapon: "Long Sword" }
    );

    expect(result.solverOutput).toBeDefined();
    // Offline deterministic advice should feature the weapon class explicitly
    expect(result.tacticalAdvice).toContain('Long Sword');
  });
});
