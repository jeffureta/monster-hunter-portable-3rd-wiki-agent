'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Plus,
  Trash2,
  PanelLeftClose,
  PanelLeft,
  Sparkles,
  ArrowUp,
  ExternalLink,
  ShieldAlert,
  Flame,
  Droplets,
  Zap,
  Snowflake,
  RotateCcw,
  CheckCircle2,
  Loader2,
  Cpu,
  ChevronDown,
  ChevronRight,
  ArrowLeft
} from 'lucide-react';

interface GroundingSource {
  title?: string;
  url?: string;
}

interface WorkflowStep {
  title: string;
  description: string;
  status: 'complete' | 'running' | 'pending';
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: GroundingSource[];
  workflowSteps?: WorkflowStep[];
  timestamp: number;
}

interface Thread {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
}

const SAMPLE_PROMPTS = [
  "What's the best electric bow-type weapon in MHP3rd?",
  "What is Zinogre's biggest elemental and cut weakness?",
  "What armor skills should I run for Great Sword against Deviljho?",
  "How do I prepare for a dual hunt with Rathalos and Tigrex?",
  "What's the best element against Amatsumagatsuchi?",
  "How do I break Barioth's wing spikes easily?",
  "Where can I find Firecell Stones and Dragonite Ore?",
  "What are the best Switch Axe options for water element?"
];

const LOCAL_STORAGE_KEY = 'mhp3rd_search_threads_v1';

export default function HunterSearchInterface() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  // Inputs
  const [initialQuery, setInitialQuery] = useState('');
  const [followUpQuery, setFollowUpQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeWorkflowStage, setActiveWorkflowStage] = useState<number>(0);
  const [placeholder, setPlaceholder] = useState("What's the best electric bow-type weapon in MHP3rd?");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const followUpInputRef = useRef<HTMLInputElement>(null);

  // Workflow steps cycling during search
  useEffect(() => {
    let interval: NodeJS.Timeout | undefined;
    if (isLoading) {
      setActiveWorkflowStage(0);
      interval = setInterval(() => {
        setActiveWorkflowStage(prev => (prev < 2 ? prev + 1 : prev));
      }, 700);
    } else {
      setActiveWorkflowStage(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isLoading]);

  // Initialize random dynamic placeholder and load persisted threads
  useEffect(() => {
    const randomPick = SAMPLE_PROMPTS[Math.floor(Math.random() * SAMPLE_PROMPTS.length)];
    setPlaceholder(randomPick);

    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setThreads(parsed);
          // Default to most recent thread if available
          setActiveThreadId(parsed[0].id);
        }
      }
    } catch (e) {
      console.error('Failed to load threads from localStorage', e);
    }
  }, []);

  // Sync threads to localStorage
  useEffect(() => {
    if (threads.length > 0) {
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(threads));
      } catch (e) {
        console.error('Failed to save threads to localStorage', e);
      }
    } else {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
    }
  }, [threads]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [threads, activeThreadId, isLoading]);

  const activeThread = threads.find(t => t.id === activeThreadId);

  const startNewSearch = () => {
    setActiveThreadId(null);
    setInitialQuery('');
    setFollowUpQuery('');
    const randomPick = SAMPLE_PROMPTS[Math.floor(Math.random() * SAMPLE_PROMPTS.length)];
    setPlaceholder(randomPick);
  };

  const deleteThread = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const updated = threads.filter(t => t.id !== id);
    setThreads(updated);
    if (activeThreadId === id) {
      if (updated.length > 0) {
        setActiveThreadId(updated[0].id);
      } else {
        startNewSearch();
      }
    }
  };

  const handleExecuteSearch = async (queryText: string, isFollowUp = false) => {
    const trimmed = queryText.trim();
    if (!trimmed || isLoading) return;

    setIsLoading(true);

    const userMessage: Message = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content: trimmed,
      timestamp: Date.now()
    };

    let targetThreadId = activeThreadId;
    let currentHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [];

    if (!isFollowUp || !targetThreadId || !activeThread) {
      // Create a brand new thread
      const newThreadId = `thread_${Date.now()}`;
      targetThreadId = newThreadId;
      const newThread: Thread = {
        id: newThreadId,
        title: trimmed.length > 40 ? trimmed.substring(0, 40) + '...' : trimmed,
        messages: [userMessage],
        createdAt: Date.now()
      };
      setThreads(prev => [newThread, ...prev]);
      setActiveThreadId(newThreadId);
      setInitialQuery('');
    } else {
      // Append to current thread
      currentHistory = activeThread.messages.map(m => ({ role: m.role, content: m.content }));
      setThreads(prev =>
        prev.map(t =>
          t.id === targetThreadId
            ? { ...t, messages: [...t.messages, userMessage] }
            : t
        )
      );
      setFollowUpQuery('');
    }

    try {
      const res = await fetch('/api/tactics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: trimmed,
          history: currentHistory
        })
      });

      if (!res.ok) {
        throw new Error(`Server returned ${res.status}`);
      }

      const data = await res.json();
      const assistantMessage: Message = {
        id: `msg_${Date.now() + 1}`,
        role: 'assistant',
        content: data.tacticalAdvice || data.solverOutput?.recommendedStrategy || 'No tactical data found.',
        sources: data.sources || [],
        workflowSteps: data.workflowSteps || [
          {
            title: 'Query Parsing & Target Extraction',
            description: `Identified quest targets and combat context from query`,
            status: 'complete'
          },
          {
            title: 'Tactical Math & Weakness Engine',
            description: `Calculated hitzone vulnerability and optimal elemental ratings`,
            status: 'complete'
          },
          {
            title: 'Google Grounded Guild Advisor',
            description: `Synthesized MHP3rd database trees and combat recommendations`,
            status: 'complete'
          }
        ],
        timestamp: Date.now()
      };

      setThreads(prev =>
        prev.map(t =>
          t.id === targetThreadId
            ? { ...t, messages: [...t.messages, assistantMessage] }
            : t
        )
      );
    } catch (err: any) {
      const errorMessage: Message = {
        id: `msg_err_${Date.now()}`,
        role: 'assistant',
        content: `Guild connection error: ${err.message || 'Unable to retrieve data'}. Please verify your connection or try again.`,
        timestamp: Date.now()
      };

      setThreads(prev =>
        prev.map(t =>
          t.id === targetThreadId
            ? { ...t, messages: [...t.messages, errorMessage] }
            : t
        )
      );
    } finally {
      setIsLoading(false);
      setTimeout(() => {
        followUpInputRef.current?.focus();
      }, 100);
    }
  };

  // Modern typography parser to render clean headers, lists, and bold highlights
  const renderFormattedContent = (content: string) => {
    const lines = content.split('\n');

    return (
      <div className="space-y-3 text-[15px] leading-relaxed text-gray-200 selection:bg-amber-500/30 selection:text-white">
        {lines.map((line, idx) => {
          const trimmed = line.trim();
          if (!trimmed) return <div key={idx} className="h-1" />;

          // Headings
          if (trimmed.startsWith('### ')) {
            return (
              <h3 key={idx} className="text-base font-semibold text-amber-300/95 tracking-wide pt-2 border-b border-gray-800/60 pb-1">
                {trimmed.replace('### ', '')}
              </h3>
            );
          }
          if (trimmed.startsWith('## ')) {
            return (
              <h2 key={idx} className="text-lg font-bold text-gray-100 tracking-tight pt-3">
                {trimmed.replace('## ', '')}
              </h2>
            );
          }

          // Bullet points
          if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
            const itemText = trimmed.substring(2);
            return (
              <div key={idx} className="flex items-start gap-2.5 pl-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400/80 mt-2 shrink-0" />
                <span className="text-gray-300">
                  {renderInlineFormatting(itemText)}
                </span>
              </div>
            );
          }

          // Numbered points
          const matchNumber = trimmed.match(/^(\d+)\.\s+(.*)/);
          if (matchNumber) {
            return (
              <div key={idx} className="flex items-start gap-2 pl-1.5">
                <span className="text-amber-400/90 font-mono text-sm shrink-0 mt-0.5">
                  {matchNumber[1]}.
                </span>
                <span className="text-gray-300">
                  {renderInlineFormatting(matchNumber[2])}
                </span>
              </div>
            );
          }

          // Regular paragraph
          return (
            <p key={idx} className="text-gray-300">
              {renderInlineFormatting(trimmed)}
            </p>
          );
        })}
      </div>
    );
  };

  // Helper for bold and code tags within markdown lines
  const renderInlineFormatting = (text: string) => {
    // Split by bold (**text**)
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={i} className="font-semibold text-white tracking-tight">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return part;
    });
  };

  return (
    <div className="flex h-screen bg-[#0c0e12] text-gray-100 overflow-hidden font-sans">
      {/* Left Sidebar */}
      <aside
        className={`${
          isSidebarOpen ? 'w-64' : 'w-0'
        } transition-all duration-200 ease-in-out border-r border-gray-800/80 bg-[#12151c] flex flex-col shrink-0 overflow-hidden z-20`}
      >
        <div className="p-3 border-b border-gray-800/80 flex items-center justify-between">
          <button
            onClick={startNewSearch}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gradient-to-r from-amber-600/20 to-amber-500/10 hover:from-amber-600/30 hover:to-amber-500/20 text-amber-300 text-sm font-medium rounded-lg border border-amber-500/30 transition-all shadow-sm active:scale-[0.98]"
          >
            <Plus className="w-4 h-4 text-amber-400" />
            <span>New Search</span>
          </button>
        </div>

        {/* Thread History List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-thin scrollbar-thumb-gray-800">
          <div className="px-2 py-1 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
            Recent Searches
          </div>
          {threads.length === 0 ? (
            <div className="px-3 py-6 text-xs text-gray-400 text-center italic">
              No previous searches yet.
            </div>
          ) : (
            threads.map(thread => {
              const isActive = thread.id === activeThreadId;
              return (
                <div
                  key={thread.id}
                  onClick={() => setActiveThreadId(thread.id)}
                  className={`group flex items-center justify-between px-3 py-2.5 rounded-lg text-sm cursor-pointer transition-colors ${
                    isActive
                      ? 'bg-gray-800/90 text-white font-medium border border-gray-700/60 shadow-inner'
                      : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/40'
                  }`}
                >
                  <div className="truncate pr-2 text-xs flex-1">
                    {thread.title}
                  </div>
                  <button
                    onClick={e => deleteThread(e, thread.id)}
                    title="Delete search"
                    className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-400 p-1 rounded transition-opacity"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Info */}
        <div className="p-3 border-t border-gray-800/80 text-[11px] text-gray-400 flex items-center justify-between">
          <span>MHP3rd Guild Engine</span>
          <span className="text-amber-500/70 font-mono">v1.2</span>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Top Navbar */}
        <header className="h-14 border-b border-gray-800/60 bg-[#0e1017]/90 backdrop-blur px-4 flex items-center justify-between z-10 shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(prev => !prev)}
              title={isSidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
              className="p-1.5 text-gray-400 hover:text-gray-200 hover:bg-gray-800/60 rounded-md transition-colors"
            >
              {isSidebarOpen ? <PanelLeftClose className="w-5 h-5" /> : <PanelLeft className="w-5 h-5" />}
            </button>
            <button
              onClick={startNewSearch}
              title="Return to Main Search Page"
              className="group flex items-center gap-2 p-1.5 -ml-1 rounded-lg hover:bg-gray-800/60 transition-all text-left"
            >
              {activeThread && (
                <ArrowLeft className="w-4 h-4 text-amber-400 group-hover:-translate-x-0.5 transition-transform" />
              )}
              <span className="font-bold text-gray-100 text-base tracking-wide flex items-center gap-1.5 group-hover:text-amber-200 transition-colors">
                <span className="text-amber-400">Monster Hunter</span> P3rd Search
              </span>
            </button>
          </div>

          {activeThread && (
            <button
              onClick={startNewSearch}
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-amber-300 px-2.5 py-1.5 rounded-md hover:bg-gray-800/40 border border-gray-800 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>New Search</span>
            </button>
          )}
        </header>

        {/* View Switch: Centered Landing vs. Active Conversation */}
        {!activeThread || activeThread.messages.length === 0 ? (
          /* ================= GOOGLE SEARCH LANDING VIEW ================= */
          <div className="flex-1 flex flex-col items-center justify-center px-4 -mt-10 overflow-y-auto">
            <div className="w-full max-w-2xl flex flex-col items-center text-center space-y-6">
              {/* Google-style Title */}
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-medium mb-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Google AI Search for Monster Hunter Portable 3rd</span>
                </div>
                <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight">
                  <span className="text-amber-400">Yukumo</span> Guild Search
                </h1>
                <p className="text-sm text-gray-400 max-w-md mx-auto">
                  Instant tactical guidance, weapon craft trees, and monster weakness intelligence.
                </p>
              </div>

              {/* Centered Search Bar */}
              <form
                onSubmit={e => {
                  e.preventDefault();
                  handleExecuteSearch(initialQuery || placeholder);
                }}
                className="w-full"
              >
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-gray-400 group-focus-within:text-amber-400 transition-colors" />
                  </div>
                  <input
                    type="text"
                    value={initialQuery}
                    onChange={e => setInitialQuery(e.target.value)}
                    placeholder={placeholder}
                    className="w-full pl-12 pr-28 py-3.5 bg-[#141822] border border-gray-700/80 rounded-full text-base text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500/60 shadow-xl transition-all"
                    autoFocus
                  />
                  <div className="absolute inset-y-1.5 right-1.5 flex items-center">
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="h-full px-5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-gray-950 font-bold text-sm rounded-full transition-all shadow-md active:scale-95 flex items-center gap-1.5"
                    >
                      <span>Search</span>
                    </button>
                  </div>
                </div>
              </form>

              {/* Dynamic prompt suggestion button */}
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <span>Try:</span>
                <button
                  type="button"
                  onClick={() => handleExecuteSearch(placeholder)}
                  className="text-amber-400/90 hover:text-amber-300 underline underline-offset-4 decoration-amber-500/30 truncate max-w-lg"
                >
                  "{placeholder}"
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* ================= MULTI-TURN CONVERSATION VIEW ================= */
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            {/* Conversation Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6 max-w-3xl w-full mx-auto">
              {activeThread.messages.map(message => {
                const isUser = message.role === 'user';

                if (isUser) {
                  return (
                    <div key={message.id} className="flex justify-end pt-2">
                      <div className="max-w-xl bg-gray-800/70 border border-gray-700/50 rounded-2xl px-4 py-2.5 text-gray-100 text-sm shadow-sm">
                        {message.content}
                      </div>
                    </div>
                  );
                }

                // Assistant (Google AI Overview Block)
                return (
                  <div
                    key={message.id}
                    className="bg-[#121620] border border-gray-800/90 rounded-2xl p-5 shadow-lg space-y-4"
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between pb-3 border-b border-gray-800/60">
                      <div className="flex items-center gap-2">
                        <div className="p-1 rounded-md bg-amber-500/10 text-amber-400">
                          <Sparkles className="w-4 h-4" />
                        </div>
                        <span className="text-xs font-semibold text-gray-200 tracking-wide uppercase">
                          AI Overview
                        </span>
                      </div>
                      <span className="text-[11px] text-gray-400">
                        Monster Hunter Portable 3rd Guild Advisor
                      </span>
                    </div>

                    {/* Background Workflow Execution Details */}
                    {message.workflowSteps && message.workflowSteps.length > 0 && (
                      <div className="bg-[#0b0d12]/70 rounded-xl border border-gray-800/70 p-3 space-y-2.5">
                        <div className="flex items-center gap-2 text-xs font-semibold text-gray-300">
                          <Cpu className="w-3.5 h-3.5 text-amber-400" />
                          <span>Guild Engine Execution Trace</span>
                        </div>
                        <div className="space-y-2">
                          {message.workflowSteps.map((step, idx) => (
                            <div key={idx} className="flex items-start gap-2.5 text-xs">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                              <div className="flex-1">
                                <span className="text-gray-200 font-medium">{step.title}</span>
                                <p className="text-gray-400 text-[11px] mt-0.5">{step.description}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Uniform Typography Content */}
                    <div className="pt-1">
                      {renderFormattedContent(message.content)}
                    </div>

                    {/* Sources (Grounding Pills) */}
                    {message.sources && message.sources.length > 0 && (
                      <div className="pt-3 border-t border-gray-800/60 space-y-2">
                        <div className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">
                          Referenced Wiki Sources
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {message.sources.map((src, i) => (
                            <a
                              key={i}
                              href={src.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-800/80 hover:bg-gray-700/80 border border-gray-700/60 text-xs text-amber-300 hover:text-amber-200 transition-colors"
                            >
                              <span className="truncate max-w-[200px]">{src.title || src.url}</span>
                              <ExternalLink className="w-3 h-3 shrink-0 opacity-70" />
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Live Background Workflow & Loading Indicator */}
              {isLoading && (
                <div className="bg-[#121620] border border-amber-500/30 rounded-2xl p-5 shadow-lg space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-gray-800/60">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-400 animate-spin" />
                      <span className="text-xs font-semibold text-amber-300 uppercase tracking-wide">
                        Guild Workflow In Progress
                      </span>
                    </div>
                    <span className="text-[11px] text-gray-400 font-mono">
                      Running Pipeline...
                    </span>
                  </div>

                  {/* Step-by-step background processing visualizer */}
                  <div className="space-y-3 bg-[#0b0d12]/80 rounded-xl p-3.5 border border-gray-800/80">
                    <div className="flex items-start gap-3">
                      {activeWorkflowStage > 0 ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      ) : (
                        <Loader2 className="w-4 h-4 text-amber-400 animate-spin shrink-0 mt-0.5" />
                      )}
                      <div>
                        <div className={`text-xs font-medium ${activeWorkflowStage >= 0 ? 'text-gray-200' : 'text-gray-400'}`}>
                          1. Query Parsing & Target Entity Extraction
                        </div>
                        <div className="text-[11px] text-gray-400 mt-0.5">
                          Identifying monster names, environment maps, and hunter weapon context...
                        </div>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      {activeWorkflowStage > 1 ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      ) : activeWorkflowStage === 1 ? (
                        <Loader2 className="w-4 h-4 text-amber-400 animate-spin shrink-0 mt-0.5" />
                      ) : (
                        <div className="w-4 h-4 rounded-full border border-gray-700 shrink-0 mt-0.5" />
                      )}
                      <div>
                        <div className={`text-xs font-medium ${activeWorkflowStage >= 1 ? 'text-gray-200' : 'text-gray-400'}`}>
                          2. Deterministic Tactical Damage & Math Engine
                        </div>
                        <div className="text-[11px] text-gray-400 mt-0.5">
                          Computing monster hitzone tables, cut/impact/shot formulas, and optimal elemental rank...
                        </div>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      {activeWorkflowStage >= 2 ? (
                        <Loader2 className="w-4 h-4 text-amber-400 animate-spin shrink-0 mt-0.5" />
                      ) : (
                        <div className="w-4 h-4 rounded-full border border-gray-700 shrink-0 mt-0.5" />
                      )}
                      <div>
                        <div className={`text-xs font-medium ${activeWorkflowStage >= 2 ? 'text-gray-200' : 'text-gray-400'}`}>
                          3. Grounded Synthesis & Endgame Tree Verification
                        </div>
                        <div className="text-[11px] text-gray-400 mt-0.5">
                          Cross-referencing live MHP3rd database trees and formulating tactical briefing...
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 pt-1 animate-pulse">
                    <div className="h-3.5 bg-gray-800/80 rounded w-3/4" />
                    <div className="h-3.5 bg-gray-800/60 rounded w-5/6" />
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Pinned Bottom Follow-Up Bar */}
            <div className="p-4 border-t border-gray-800/80 bg-[#0e1017]/95 backdrop-blur shrink-0">
              <form
                onSubmit={e => {
                  e.preventDefault();
                  handleExecuteSearch(followUpQuery, true);
                }}
                className="max-w-3xl mx-auto relative flex items-center"
              >
                <input
                  ref={followUpInputRef}
                  type="text"
                  value={followUpQuery}
                  onChange={e => setFollowUpQuery(e.target.value)}
                  placeholder="Ask a follow up..."
                  disabled={isLoading}
                  className="w-full pl-4 pr-12 py-3 bg-[#141822] border border-gray-700/70 rounded-full text-sm text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500/60 transition-all shadow-inner disabled:opacity-60"
                />
                <button
                  type="submit"
                  disabled={!followUpQuery.trim() || isLoading}
                  className="absolute right-1.5 p-2 bg-amber-500 hover:bg-amber-400 disabled:bg-gray-800 text-gray-950 disabled:text-gray-400 rounded-full transition-all active:scale-95 disabled:active:scale-100 shadow-md"
                >
                  <ArrowUp className="w-4 h-4 stroke-[2.5]" />
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
