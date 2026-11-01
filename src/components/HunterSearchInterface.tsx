'use client';

import React, { useState, useTransition } from 'react';
import { 
  Search, 
  Flame, 
  Droplets, 
  Zap, 
  Snowflake, 
  Sparkles, 
  ShieldAlert, 
  MapPin, 
  ChevronRight,
  ThumbsUp,
  ThumbsDown,
  MessageSquarePlus,
  RefreshCw
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

const ELEMENT_ICONS: Record<string, React.ReactNode> = {
  Fire: <Flame className="w-4 h-4 text-red-500 inline mr-1" />,
  Water: <Droplets className="w-4 h-4 text-blue-400 inline mr-1" />,
  Thunder: <Zap className="w-4 h-4 text-yellow-400 inline mr-1" />,
  Ice: <Snowflake className="w-4 h-4 text-cyan-300 inline mr-1" />,
  Dragon: <Sparkles className="w-4 h-4 text-purple-400 inline mr-1" />,
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

  const handleSearch = (searchQuery: string) => {
    if (!searchQuery.trim()) return;

    startTransition(async () => {
      try {
        const res = await fetch('/api/tactics', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: searchQuery }),
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
            placeholder="Ask about a monster, multi-monster quest, or map... (e.g. Zinogre & Tigrex)"
            className="w-full pl-12 pr-28 py-3.5 sm:py-4 bg-[#14171d] hover:bg-[#181c24] focus:bg-[#181c24] text-gray-100 placeholder-gray-500 rounded-full border border-gray-700/60 focus:border-amber-400/80 focus:ring-2 focus:ring-amber-400/20 focus:outline-none text-base transition-all duration-200"
          />
          <Search className="w-5 h-5 text-gray-400 absolute left-4 pointer-events-none" />
          <button
            type="submit"
            disabled={isPending || !query.trim()}
            className="absolute right-2 px-5 py-2 bg-amber-500 hover:bg-amber-400 active:scale-95 disabled:opacity-40 disabled:hover:bg-amber-500 text-gray-950 font-medium rounded-full text-sm transition-all duration-150"
          >
            {isPending ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              'Consult'
            )}
          </button>
        </div>
      </form>

      {/* Quick Suggestion Chips */}
      <div className="flex flex-wrap items-center justify-center gap-2 mt-4 text-xs text-gray-400">
        <span className="text-gray-500 font-medium">Try asking:</span>
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            onClick={() => {
              setQuery(s);
              handleSearch(s);
            }}
            className="px-2.5 py-1 rounded-full bg-[#161a22] hover:bg-[#202632] border border-gray-800 hover:border-gray-700 text-gray-300 transition-colors"
          >
            {s}
          </button>
        ))}
      </div>

      {/* Deep Tactical Result Card (Expands cleanly below) */}
      {result && result.solverOutput && (
        <div className="w-full mt-8 space-y-4 animate-in fade-in duration-300">
          {/* 1. Tactical Briefing Card */}
          <div className="p-5 rounded-2xl bg-[#14171d] border border-gray-800 shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-amber-400">
                Guild Strategic Briefing
              </span>
              {result.isCached && (
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                  Instant Cache (0 tokens)
                </span>
              )}
            </div>
            <p className="text-sm leading-relaxed text-gray-200 whitespace-pre-line">
              {result.tacticalAdvice}
            </p>

            {/* In-App Feedback Loop Controls */}
            <div className="mt-4 pt-3 border-t border-gray-800/60 flex items-center justify-between text-xs text-gray-400">
              <span>Was this advice helpful?</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleFeedback('liked')}
                  className={`p-1.5 rounded-md hover:bg-gray-800 transition-colors ${
                    feedbackGiven === 'liked' ? 'text-amber-400 bg-gray-800' : 'text-gray-400'
                  }`}
                  title="Helpful advice"
                >
                  <ThumbsUp className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleFeedback('disliked')}
                  className={`p-1.5 rounded-md hover:bg-gray-800 transition-colors ${
                    feedbackGiven === 'disliked' ? 'text-rose-400 bg-gray-800' : 'text-gray-400'
                  }`}
                  title="Needs improvement"
                >
                  <ThumbsDown className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setShowFeedbackModal(true)}
                  className="ml-2 flex items-center gap-1 text-[11px] text-gray-400 hover:text-amber-400 transition-colors"
                >
                  <MessageSquarePlus className="w-3.5 h-3.5" />
                  <span>Refine Advice</span>
                </button>
              </div>
            </div>
          </div>

          {/* 2. Map & Environmental Hazards */}
          <div className="p-4 rounded-xl bg-[#14171d] border border-gray-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-gray-300">
              <MapPin className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <span>
                <strong className="text-white">{result.solverOutput.mapRequirements.mapName}:</strong>{' '}
                {result.solverOutput.mapRequirements.notes}
              </span>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {result.solverOutput.mapRequirements.needsHotDrink && (
                <span className="px-2.5 py-1 rounded bg-blue-500/10 text-cyan-300 border border-blue-500/20 font-medium">
                  ❄️ Hot Drink Required
                </span>
              )}
              {result.solverOutput.mapRequirements.needsCoolDrink && (
                <span className="px-2.5 py-1 rounded bg-orange-500/10 text-amber-300 border border-orange-500/20 font-medium">
                  🔥 Cool Drink Required
                </span>
              )}
              {!result.solverOutput.mapRequirements.needsHotDrink && !result.solverOutput.mapRequirements.needsCoolDrink && (
                <span className="px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                  🌿 Standard Climate (No Drink Needed)
                </span>
              )}
            </div>
          </div>

          {/* 3. Elemental Effectiveness Matrix */}
          <div className="p-5 rounded-xl bg-[#14171d] border border-gray-800">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">
              Cross-Monster Elemental Compatibility
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {result.solverOutput.bestElements.map((e) => (
                <div
                  key={e.element}
                  className={`p-3 rounded-lg border text-center transition-all ${
                    e.hasImmuneMonster
                      ? 'bg-rose-950/20 border-rose-900/40 text-gray-400'
                      : e.score > 20
                      ? 'bg-amber-950/20 border-amber-600/40 text-amber-200 ring-1 ring-amber-500/20'
                      : 'bg-[#181c24] border-gray-800 text-gray-300'
                  }`}
                >
                  <div className="text-sm font-semibold flex items-center justify-center">
                    {ELEMENT_ICONS[e.element]}
                    {e.element}
                  </div>
                  <div className="text-xs mt-1 font-mono">
                    Score: <span className="font-bold">{e.score}</span>
                  </div>
                  {e.hasImmuneMonster ? (
                    <div className="text-[10px] text-rose-400 font-medium mt-1">
                      ⚠️ Target Immune
                    </div>
                  ) : (
                    <div className="text-[10px] text-emerald-400 font-medium mt-1">
                      ✓ Universal Hit
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 4. Target Monster Hitzones & Weakness Dossiers */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Target Monster Dossiers ({result.solverOutput.monsters.length})
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {result.solverOutput.monsters.map((m) => (
                <div
                  key={m.id}
                  className="p-4 rounded-xl bg-[#14171d] border border-gray-800 space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between border-b border-gray-800/80 pb-2">
                    <span className="font-semibold text-white text-sm">
                      {m.name}
                    </span>
                    <span className="text-[11px] text-gray-400">
                      {m.species}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-gray-300 pt-1">
                    <span>Weakest Element:</span>
                    <span className="font-semibold text-amber-300 flex items-center">
                      {ELEMENT_ICONS[m.weakestElement]}
                      {m.weakestElement}
                    </span>
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
                    <div className="p-2 mt-2 rounded bg-amber-500/5 border border-amber-500/10 text-[11px] text-amber-200/90 leading-tight">
                      <strong>Note:</strong> {m.specialNotes}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Feedback & Suggestion Modal */}
      {showFeedbackModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#161a22] border border-gray-700/80 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl">
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
              className="w-full p-3 rounded-lg bg-[#0e1116] border border-gray-700 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-amber-400"
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
