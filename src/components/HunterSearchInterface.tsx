'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { 
  Search, 
  Flame, 
  Droplets, 
  Zap, 
  Snowflake, 
  Sparkles, 
  ShieldAlert, 
  MapPin, 
  ThumbsUp, 
  ThumbsDown, 
  Settings2,
  Swords,
  Check
} from 'lucide-react';

interface TacticalSolution {
  monsters: Array<{
    id: string;
    name: string;
    aliases: string[];
    species: string;
    weakestElement: string;
    elements: Record<string, number>;
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
    specialNotes?: string;
  }>;
  bestElements: Array<{
    element: string;
    score: number;
    hasImmuneMonster: boolean;
    breakdown: Array<{
      monster: string;
      effectiveness: number;
      isImmune: boolean;
    }>;
  }>;
  recommendedStrategy: string;
  mapRequirements: {
    mapName: string;
    needsHotDrink: boolean;
    needsCoolDrink: boolean;
    notes: string;
  };
}

interface HunterResponse {
  query: string;
  solverOutput: TacticalSolution;
  tacticalAdvice: string;
  isCached?: boolean;
}

const WEAPON_CLASSES = [
  "Long Sword",
  "Great Sword",
  "Sword & Shield",
  "Dual Blades",
  "Hammer",
  "Hunting Horn",
  "Lance",
  "Gunlance",
  "Switch Axe",
  "Light Bowgun",
  "Heavy Bowgun",
  "Bow"
];

const ELEMENT_STYLES: Record<string, { icon: React.ReactNode; text: string; bg: string; border: string }> = {
  Ice: {
    icon: <Snowflake className="w-4 h-4 text-cyan-400 inline mr-1" />,
    text: "text-cyan-400",
    bg: "bg-cyan-950/40",
    border: "border-cyan-800/60"
  },
  Thunder: {
    icon: <Zap className="w-4 h-4 text-yellow-400 inline mr-1" />,
    text: "text-yellow-400",
    bg: "bg-yellow-950/40",
    border: "border-yellow-800/60"
  },
  Fire: {
    icon: <Flame className="w-4 h-4 text-orange-500 inline mr-1" />,
    text: "text-orange-400",
    bg: "bg-orange-950/40",
    border: "border-orange-800/60"
  },
  Water: {
    icon: <Droplets className="w-4 h-4 text-blue-400 inline mr-1" />,
    text: "text-blue-400",
    bg: "bg-blue-950/40",
    border: "border-blue-800/60"
  },
  Dragon: {
    icon: <Sparkles className="w-4 h-4 text-purple-400 inline mr-1" />,
    text: "text-purple-400",
    bg: "bg-purple-950/40",
    border: "border-purple-800/60"
  }
};

const SUGGESTIONS = [
  "Zinogre (Jinouga)",
  "Zinogre + Tigrex + Nargacuga in Misty Peaks",
  "Deviljho in Tundra",
  "Agnaktor in Volcano",
  "Amatsu Sacred Mountain",
  "Duramboros + Barioth"
];

export default function HunterSearchInterface() {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<HunterResponse | null>(null);
  const [isPending, startTransition] = useTransition();
  const [feedbackGiven, setFeedbackGiven] = useState<'liked' | 'disliked' | null>(null);
  const [feedbackNote, setFeedbackNote] = useState('');
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [preferredWeapon, setPreferredWeapon] = useState<string>('Long Sword');

  // Load preferred weapon from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('mhp3rd_preferred_weapon');
      if (saved) setPreferredWeapon(saved);
    } catch (e) {
      console.warn('localStorage read error', e);
    }
  }, []);

  const selectWeapon = (weapon: string) => {
    setPreferredWeapon(weapon);
    try {
      localStorage.setItem('mhp3rd_preferred_weapon', weapon);
    } catch (e) {
      console.warn('localStorage write error', e);
    }
  };

  const handleSearch = (searchQuery: string) => {
    if (!searchQuery.trim()) return;

    startTransition(async () => {
      try {
        const res = await fetch('/api/tactics', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: searchQuery,
            preferredWeapon
          }),
        });
        const data = await res.json();
        setResult(data);
        setFeedbackGiven(null);
      } catch (err) {
        console.error('Failed to fetch tactical advice:', err);
      }
    });
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearch(query);
  };

  const handleFeedback = (type: 'liked' | 'disliked') => {
    setFeedbackGiven(type);
    if (type === 'disliked') {
      setShowFeedbackModal(true);
    }
  };

  const saveFeedbackNote = () => {
    if (!feedbackNote.trim()) return;
    try {
      const stored = JSON.parse(localStorage.getItem('mhp3rd_hunter_feedback') || '[]');
      stored.push({
        query: result?.query,
        weapon: preferredWeapon,
        note: feedbackNote,
        date: new Date().toISOString()
      });
      localStorage.setItem('mhp3rd_hunter_feedback', JSON.stringify(stored));
    } catch (e) {
      console.warn('LocalStorage error:', e);
    }
    setShowFeedbackModal(false);
    setFeedbackNote('');
  };

  return (
    <div className="w-full max-w-3xl mx-auto flex flex-col items-center px-4">
      {/* Top Bar with Hunter Profile Cog */}
      <div className="w-full flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          <span className="text-xs uppercase tracking-wider font-semibold text-gray-500">MHP3rd Tactical Advisor</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-800 text-emerald-400 font-mono">Hobby Tier $0</span>
        </div>
        
        {/* Hunter Profile Trigger */}
        <button
          onClick={() => setShowProfileModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700/80 hover:border-amber-400/60 text-xs text-gray-300 hover:text-white transition-all shadow-sm"
        >
          <Swords className="w-3.5 h-3.5 text-amber-400" />
          <span>Main: <strong className="text-amber-300 font-medium">{preferredWeapon}</strong></span>
          <Settings2 className="w-3 h-3 text-gray-500 ml-1" />
        </button>
      </div>

      {/* Sleek Minimalist Branding */}
      <div className="text-center mb-6">
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-white mb-2">
          MHP3rd <span className="text-amber-400 font-bold">Tactical Wiki</span>
        </h1>
        <p className="text-sm text-gray-400">
          Instant multi-monster synergy, hitzones & environmental prep. Zero cost.
        </p>
      </div>

      {/* Google-Search-Style Centered Input (Deep Module Entry Point) */}
      <form onSubmit={onSubmit} className="w-full relative group">
        <div className="relative flex items-center shadow-2xl">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Ask about a quest, monster, or map with your ${preferredWeapon}...`}
            className="w-full px-5 py-4 pl-12 rounded-2xl bg-slate-900/90 border border-slate-700/80 text-white placeholder-gray-500 text-base focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400 transition-all backdrop-blur-md"
          />
          <Search className="w-5 h-5 text-gray-400 absolute left-4 pointer-events-none group-focus-within:text-amber-400 transition-colors" />
          <button
            type="submit"
            disabled={isPending || !query.trim()}
            className="absolute right-3 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-gray-950 font-medium text-sm transition-all"
          >
            {isPending ? 'Solving...' : 'Advise'}
          </button>
        </div>
      </form>

      {/* Suggestion Chips */}
      <div className="w-full flex flex-wrap gap-2 justify-center mt-3 mb-8">
        {SUGGESTIONS.map((s, idx) => (
          <button
            key={idx}
            onClick={() => {
              setQuery(s);
              handleSearch(s);
            }}
            className="text-xs px-3 py-1.5 rounded-full bg-slate-900/60 border border-slate-800 text-gray-400 hover:text-amber-300 hover:border-slate-700 transition-all"
          >
            {s}
          </button>
        ))}
      </div>

      {/* Tactical Output Container */}
      {result && (
        <div className="w-full space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
          {/* High-Contrast Tactical HUD Headline */}
          <div className="p-5 rounded-2xl bg-slate-900/95 border border-slate-700/80 shadow-2xl space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase font-bold tracking-wider text-amber-400">Tactical Briefing</span>
                {result.isCached && (
                  <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-gray-400 font-mono border border-slate-700">
                    ⚡ Instant Cache (0 Tokens)
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <span>Tailored for: <strong className="text-amber-300">{preferredWeapon}</strong></span>
                <button
                  onClick={() => handleFeedback('liked')}
                  className={`p-1 rounded hover:bg-slate-800 transition-colors ${feedbackGiven === 'liked' ? 'text-emerald-400' : 'text-gray-400'}`}
                  title="Accurate advice"
                >
                  <ThumbsUp className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleFeedback('disliked')}
                  className={`p-1 rounded hover:bg-slate-800 transition-colors ${feedbackGiven === 'disliked' ? 'text-red-400' : 'text-gray-400'}`}
                  title="Needs tweak"
                >
                  <ThumbsDown className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Tactical Advice Body */}
            <div className="text-sm leading-relaxed text-gray-200 whitespace-pre-wrap font-sans">
              {result.tacticalAdvice}
            </div>
          </div>

          {/* Environmental Hazards Banner */}
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-gray-300">
              <MapPin className="w-4 h-4 text-emerald-400" />
              <span>Map: <strong className="text-white">{result.solverOutput.mapRequirements.mapName}</strong></span>
              <span className="text-gray-500">|</span>
              <span className="text-gray-400">{result.solverOutput.mapRequirements.notes}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className={`px-2 py-1 rounded font-semibold ${result.solverOutput.mapRequirements.needsHotDrink ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30' : 'bg-slate-800 text-gray-500'}`}>
                Hot Drink: {result.solverOutput.mapRequirements.needsHotDrink ? 'REQUIRED' : 'NONE'}
              </span>
              <span className={`px-2 py-1 rounded font-semibold ${result.solverOutput.mapRequirements.needsCoolDrink ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'bg-slate-800 text-gray-500'}`}>
                Cool Drink: {result.solverOutput.mapRequirements.needsCoolDrink ? 'REQUIRED' : 'NONE'}
              </span>
            </div>
          </div>

          {/* Multi-Monster Elemental Compromise Matrix */}
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase font-semibold text-gray-400 tracking-wider">Elemental Synergy Matrix</span>
              <span className="text-[11px] text-gray-500">Ranked by total cross-monster effectiveness</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {result.solverOutput.bestElements.map((elem, idx) => {
                const style = ELEMENT_STYLES[elem.element] || {
                  icon: null,
                  text: 'text-gray-300',
                  bg: 'bg-slate-800',
                  border: 'border-slate-700'
                };
                return (
                  <div
                    key={idx}
                    className={`p-3 rounded-lg border flex flex-col items-center justify-between text-center ${style.bg} ${style.border} ${elem.hasImmuneMonster ? 'opacity-60' : ''}`}
                  >
                    <div className="flex items-center font-medium text-xs mb-1">
                      {style.icon}
                      <span className={style.text}>{elem.element}</span>
                    </div>
                    <span className="text-lg font-bold text-white tracking-tight">{elem.score}</span>
                    {elem.hasImmuneMonster ? (
                      <span className="text-[10px] text-red-400 mt-1 font-mono">⚠️ Has Immunity</span>
                    ) : (
                      <span className="text-[10px] text-emerald-400 mt-1 font-mono">✓ Safe All Targets</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Individual Monster Dossiers */}
          <div className="space-y-2">
            <span className="text-xs uppercase font-semibold text-gray-400 tracking-wider px-1">Target Monster Dossiers</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {result.solverOutput.monsters.map((m) => (
                <div key={m.id} className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-sm">{m.name}</span>
                    <span className="text-gray-400">{m.species}</span>
                  </div>
                  <div className="flex items-center justify-between text-gray-300">
                    <span>Weakness:</span>
                    <span className="font-semibold text-amber-300">{m.weakestElement}</span>
                  </div>
                  <div className="flex items-center justify-between text-gray-300">
                    <span>Best Physical Target:</span>
                    <span className="font-medium text-white">
                      {m.bestPhysicalWeakness.part} (Cut: {m.bestPhysicalWeakness.cut}, Impact: {m.bestPhysicalWeakness.impact})
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-gray-300">
                    <span>Disruptions:</span>
                    <span className="text-gray-400">
                      Roar: {m.hazards.roar} | Tremor: {m.hazards.tremor}
                    </span>
                  </div>
                  {m.specialNotes && (
                    <div className="p-2 mt-2 rounded bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-200/90 leading-tight">
                      <strong>Rule:</strong> {m.specialNotes}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Hunter Profile Selection Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Swords className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-semibold text-white">Hunter Weapon Profile</h3>
              </div>
              <span className="text-xs text-emerald-400 font-mono">Local Storage ($0)</span>
            </div>
            
            <p className="text-xs text-gray-400">
              Select your primary weapon class. The advisor will automatically inject tailored positioning, spirit slashes, and charge attack advice for your weapon.
            </p>

            <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto pr-1">
              {WEAPON_CLASSES.map((w) => {
                const isSelected = preferredWeapon === w;
                return (
                  <button
                    key={w}
                    onClick={() => selectWeapon(w)}
                    className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium border transition-all ${
                      isSelected
                        ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                        : 'bg-slate-800/60 border-slate-700/80 text-gray-300 hover:border-slate-600'
                    }`}
                  >
                    <span>{w}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-amber-400" />}
                  </button>
                );
              })}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-800">
              <button
                onClick={() => setShowProfileModal(false)}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-gray-950 font-semibold text-xs transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Feedback & Suggestion Modal */}
      {showFeedbackModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <h3 className="text-base font-semibold text-white">
              Refine Tactical Advice
            </h3>
            <p className="text-xs text-gray-400">
              Tell the agent what you want customized (e.g. "I prefer Hammer stun build suggestions", "Always mention tail carve items").
            </p>
            <textarea
              value={feedbackNote}
              onChange={(e) => setFeedbackNote(e.target.value)}
              placeholder="What could be improved or remembered for your next hunt?"
              rows={3}
              className="w-full p-3 rounded-lg bg-slate-950 border border-slate-700 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-amber-400"
            />
            <div className="flex justify-end gap-2 text-xs">
              <button
                onClick={() => setShowFeedbackModal(false)}
                className="px-3 py-1.5 rounded-lg text-gray-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={saveFeedbackNote}
                className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-gray-950 font-medium"
              >
                Save Preference
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
