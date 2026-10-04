import React, { useState } from 'react';
import { TOOLS } from '../data/tools';
import { ToolId, ToolItem } from '../types';
import { 
  Scissors, 
  Minimize2, 
  Maximize, 
  RefreshCw, 
  Shield, 
  Palette, 
  Sparkles, 
  ArrowRight, 
  Search,
  Zap,
  Layers,
  FileText,
  PlaySquare,
  Cpu,
  ChevronDown
} from 'lucide-react';
import { getTopFourTools, incrementToolUsage } from '../utils/usageTracking';

interface ToolGridProps {
  onSelectTool: (toolId: ToolId) => void;
}

export const ToolGrid: React.FC<ToolGridProps> = ({ onSelectTool }) => {
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showAllToolsDirectory, setShowAllToolsDirectory] = useState<boolean>(false);

  const categories = ['All', 'Image', 'PDF', 'AI Tools', 'Edit', 'Convert', 'YouTube'];

  const getCategoryFilterMatch = (tool: ToolItem, cat: string) => {
    if (cat === 'All') return true;
    if (cat === 'Image') return tool.category === 'Optimize' || tool.category === 'Edit';
    if (cat === 'PDF') return tool.id.includes('pdf') || tool.id.includes('merge') || tool.id.includes('split') || tool.id.includes('rotate');
    if (cat === 'AI Tools') return tool.category === 'AI';
    if (cat === 'Edit') return tool.category === 'Edit' || tool.id === 'watermarker';
    if (cat === 'Convert') return tool.category === 'Convert' && !tool.id.includes('pdf');
    if (cat === 'YouTube') return tool.id === 'youtube-to-slides';
    return true;
  };

  const filteredTools = TOOLS.filter(tool => {
    const q = searchQuery.toLowerCase().trim();
    const matchesCategory = getCategoryFilterMatch(tool, activeCategory);
    const matchesSearch = !q || 
                          tool.title.toLowerCase().includes(q) ||
                          tool.description.toLowerCase().includes(q) ||
                          (tool.keywords && tool.keywords.some(kw => kw.toLowerCase().includes(q)));
    return matchesCategory && matchesSearch;
  });

  const mostUsedTools = getTopFourTools();

  const handleToolClick = (toolId: ToolId) => {
    incrementToolUsage(toolId);
    onSelectTool(toolId);
  };

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'Scissors': return <Scissors className="w-5 h-5 text-indigo-400" />;
      case 'Minimize2': return <Minimize2 className="w-5 h-5 text-emerald-400" />;
      case 'Maximize': return <Maximize className="w-5 h-5 text-blue-400" />;
      case 'RefreshCw': return <RefreshCw className="w-5 h-5 text-amber-400" />;
      case 'Shield': return <Shield className="w-5 h-5 text-purple-400" />;
      case 'Palette': return <Palette className="w-5 h-5 text-pink-400" />;
      case 'Sparkles': return <Sparkles className="w-5 h-5 text-cyan-400" />;
      default: return <Zap className="w-5 h-5 text-indigo-400" />;
    }
  };

  const renderToolCard = (tool: ToolItem) => (
    <div
      key={tool.id}
      onClick={() => handleToolClick(tool.id)}
      className="group relative bg-slate-900/80 hover:bg-slate-900 border border-slate-800/80 hover:border-indigo-500/50 rounded-2xl p-5 transition-all duration-300 hover:shadow-2xl hover:shadow-indigo-500/10 cursor-pointer flex flex-col justify-between overflow-hidden"
    >
      <div className="absolute top-0 right-0 w-28 h-28 bg-indigo-500/5 rounded-full blur-2xl group-hover:bg-indigo-500/10 transition-all" />

      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="w-10 h-10 rounded-xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-center group-hover:scale-110 group-hover:bg-indigo-600/20 group-hover:border-indigo-500/40 transition-all duration-300">
            {getIcon(tool.iconName)}
          </div>
          <div className="flex items-center gap-2">
            {tool.badge && (
              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                tool.badge === 'Popular' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/30' :
                tool.badge === 'New' ? 'bg-pink-500/10 text-pink-400 border border-pink-500/30' :
                tool.badge === 'pdfcpu' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' :
                'bg-amber-500/10 text-amber-400 border border-amber-500/30'
              }`}>
                {tool.badge}
              </span>
            )}
          </div>
        </div>

        <h3 className="text-base font-bold text-white mb-1.5 group-hover:text-indigo-400 transition-colors">
          {tool.title}
        </h3>
        <p className="text-xs text-slate-400 leading-relaxed mb-4 line-clamp-2">
          {tool.description}
        </p>
      </div>

      <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs font-semibold text-indigo-400 group-hover:text-indigo-300">
        <span>Open Tool</span>
        <ArrowRight className="w-3.5 h-3.5 transform group-hover:translate-x-1 transition-transform" />
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      {/* Hero Section */}
      <div className="text-center space-y-4 max-w-3xl mx-auto">
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-white leading-tight">
          Powerful Image & PDF Tools
        </h1>
        <p className="text-slate-400 text-base sm:text-lg">
          Fast, private, browser-based tools for images, PDFs and more.
        </p>

        {/* Prominent Search Box */}
        <div className="pt-3 max-w-md mx-auto">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search tools..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (e.target.value.trim()) setShowAllToolsDirectory(true);
              }}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all shadow-inner"
            />
          </div>
        </div>
      </div>

      {/* Most Used Tools Section */}
      {!searchQuery && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
              Most Used Tools
            </h2>
            <span className="text-xs text-slate-400 font-mono">Dynamically Sorted</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {mostUsedTools.map(tool => renderToolCard(tool))}
          </div>
        </div>
      )}

      {/* Collapsible All Tools Directory Dropdown Section */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-lg font-bold text-white">All Tools Directory</h2>
            <p className="text-xs text-slate-400 mt-0.5">Explore all available image, PDF, AI, and conversion tools.</p>
          </div>
          <button
            onClick={() => setShowAllToolsDirectory(!showAllToolsDirectory)}
            className="py-2.5 px-5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-xs shadow-lg shadow-indigo-600/20 transition-all flex items-center gap-2 cursor-pointer"
          >
            <span>{showAllToolsDirectory ? 'Hide All Tools Directory' : 'All Tools Directory ▾'}</span>
            <ChevronDown className={`w-4 h-4 transition-transform ${showAllToolsDirectory ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {(showAllToolsDirectory || searchQuery.trim()) && (
          <div className="space-y-6 pt-4 border-t border-slate-800 animate-in fade-in duration-200">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-1.5 flex-wrap">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-all duration-200 cursor-pointer ${
                      activeCategory === cat
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                        : 'bg-slate-950 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Tools Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredTools.map((tool) => renderToolCard(tool))}
            </div>

            {filteredTools.length === 0 && (
              <div className="text-center py-16 bg-slate-950/60 rounded-xl border border-slate-800">
                <p className="text-slate-400 text-sm">No tools found matching "{searchQuery}".</p>
                <button 
                  onClick={() => { setSearchQuery(''); setActiveCategory('All'); }}
                  className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Reset Filters
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
