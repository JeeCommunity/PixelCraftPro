import React, { useState, useRef, useEffect } from 'react';
import { ToolId } from '../types';
import { 
  Sparkles, 
  Layers, 
  ArrowLeft, 
  ChevronDown, 
  Menu, 
  X, 
  Search
} from 'lucide-react';
import { TOOLS } from '../data/tools';
import { incrementToolUsage } from '../utils/usageTracking';

interface HeaderProps {
  currentTool: ToolId;
  onSelectTool: (tool: ToolId) => void;
}

export const Header: React.FC<HeaderProps> = ({ currentTool, onSelectTool }) => {
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [mobileExpandedCat, setMobileExpandedCat] = useState<string | null>('Image Tools');
  const [headerSearch, setHeaderSearch] = useState<string>('');
  const [searchOpen, setSearchOpen] = useState<boolean>(false);

  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const categories = [
    { name: 'Image Tools', tools: TOOLS.filter(t => t.category === 'Optimize' || t.category === 'Edit') },
    { name: 'PDF Tools', tools: TOOLS.filter(t => t.id.includes('pdf') || t.id.includes('merge') || t.id.includes('split') || t.id.includes('rotate')) },
    { name: 'AI Tools', tools: TOOLS.filter(t => t.category === 'AI') },
    { name: 'Edit Tools', tools: TOOLS.filter(t => t.category === 'Edit' || t.id === 'watermarker') },
    { name: 'Convert Tools', tools: TOOLS.filter(t => t.category === 'Convert' && !t.id.includes('pdf')) },
    { name: 'YouTube Tools', tools: TOOLS.filter(t => t.id === 'youtube-to-slides') }
  ];

  const searchResults = headerSearch.trim() 
    ? TOOLS.filter(t => t.title.toLowerCase().includes(headerSearch.toLowerCase()) || t.keywords?.some(k => k.toLowerCase().includes(headerSearch.toLowerCase())))
    : [];

  const handleToolClick = (toolId: ToolId) => {
    incrementToolUsage(toolId);
    onSelectTool(toolId);
    setActiveDropdown(null);
    setSearchOpen(false);
    setHeaderSearch('');
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80" ref={dropdownRef}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand Wordmark & Back Button */}
        <div className="flex items-center gap-3">
          {currentTool !== 'home' && (
            <button
              onClick={() => handleToolClick('home')}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-900 transition-colors cursor-pointer flex items-center justify-center min-w-[40px] min-h-[40px]"
              title="Back to Suite"
              aria-label="Back to Suite"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <button 
            onClick={() => handleToolClick('home')}
            className="flex items-center gap-2.5 text-left group cursor-pointer"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform shrink-0">
              <Layers className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight text-white flex items-center gap-1.5 truncate">
                PixelCraft Pro
                <span className="hidden sm:inline-block text-[10px] font-semibold bg-indigo-500/20 text-indigo-400 px-1.5 py-0.5 rounded border border-indigo-500/30">SUITE</span>
              </span>
            </div>
          </button>
        </div>

        {/* Desktop Navigation & All Tools Dropdown */}
        <nav className="hidden lg:flex items-center gap-1 text-sm font-medium text-slate-300">
          <button 
            onClick={() => handleToolClick('home')}
            className={`px-3 py-2 rounded-xl transition-colors cursor-pointer hover:text-white hover:bg-slate-900 ${currentTool === 'home' ? 'text-white bg-slate-900 font-semibold' : ''}`}
          >
            Home
          </button>

          {/* All Tools Dropdown */}
          <div className="relative">
            <button
              onClick={() => setActiveDropdown(activeDropdown === 'AllTools' ? null : 'AllTools')}
              className={`px-3 py-2 rounded-xl transition-colors cursor-pointer hover:text-white hover:bg-slate-900 flex items-center gap-1 ${activeDropdown === 'AllTools' ? 'text-indigo-400 bg-slate-900 font-semibold' : ''}`}
              aria-expanded={activeDropdown === 'AllTools'}
            >
              <span>All Tools ▾</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${activeDropdown === 'AllTools' ? 'rotate-180 text-indigo-400' : ''}`} />
            </button>

            {activeDropdown === 'AllTools' && (
              <div className="absolute top-full left-0 mt-2 w-[720px] max-w-[calc(100vw-2rem)] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 z-50 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-top-2 duration-150 max-h-[75vh] overflow-y-auto">
                {categories.map((cat) => (
                  <div key={cat.name} className="space-y-2">
                    <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider border-b border-slate-800 pb-1.5 flex items-center gap-1.5">
                      <span>{cat.name}</span>
                    </h4>
                    <div className="space-y-1">
                      {cat.tools.map((tool) => (
                        <button
                          key={tool.id}
                          onClick={() => handleToolClick(tool.id)}
                          className="w-full text-left px-2.5 py-2 rounded-xl text-xs hover:bg-indigo-600/15 hover:text-indigo-300 text-slate-300 transition-all flex items-center justify-between group cursor-pointer"
                        >
                          <span className="font-medium group-hover:translate-x-0.5 transition-transform truncate pr-1">{tool.title}</span>
                          {tool.badge && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 group-hover:bg-indigo-500/20 group-hover:text-indigo-300 shrink-0">
                              {tool.badge}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {categories.map((cat) => (
            <div key={cat.name} className="relative">
              <button
                onClick={() => setActiveDropdown(activeDropdown === cat.name ? null : cat.name)}
                className={`px-3 py-2 rounded-xl transition-colors cursor-pointer hover:text-white hover:bg-slate-900 flex items-center gap-1 ${activeDropdown === cat.name ? 'text-indigo-400 bg-slate-900 font-semibold' : ''}`}
                aria-expanded={activeDropdown === cat.name}
              >
                <span>{cat.name}</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${activeDropdown === cat.name ? 'rotate-180 text-indigo-400' : ''}`} />
              </button>

              {activeDropdown === cat.name && (
                <div className="absolute top-full left-0 mt-2 w-72 max-w-[calc(100vw-2rem)] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-2 z-50 grid gap-1 animate-in fade-in slide-in-from-top-2 duration-150 max-h-[70vh] overflow-y-auto">
                  {cat.tools.map((tool) => (
                    <button
                      key={tool.id}
                      onClick={() => handleToolClick(tool.id)}
                      className="w-full text-left px-3 py-2.5 rounded-xl text-xs hover:bg-indigo-600/10 hover:text-indigo-300 text-slate-300 transition-all flex items-center justify-between group cursor-pointer"
                    >
                      <span className="font-medium group-hover:translate-x-0.5 transition-transform truncate pr-1">{tool.title}</span>
                      {tool.badge && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 group-hover:bg-indigo-500/20 group-hover:text-indigo-300 shrink-0">
                          {tool.badge}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>

        {/* Right Actions: Search & Mobile Toggle */}
        <div className="flex items-center gap-3">
          {/* Search Trigger */}
          <div className="relative">
            <button
              onClick={() => setSearchOpen(!searchOpen)}
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 transition-all cursor-pointer flex items-center gap-2 min-h-[40px]"
              aria-label="Search tools"
            >
              <Search className="w-4 h-4 text-indigo-400 shrink-0" />
              <span className="hidden sm:inline text-xs text-slate-400">Search tools...</span>
            </button>

            {searchOpen && (
              <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 max-w-[calc(100vw-2rem)] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-3 z-50 space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    autoFocus
                    type="text"
                    placeholder="Search by name, category..."
                    value={headerSearch}
                    onChange={(e) => setHeaderSearch(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                {headerSearch.trim() && (
                  <div className="max-h-60 overflow-y-auto space-y-1 pt-1">
                    {searchResults.length > 0 ? (
                      searchResults.map((tool) => (
                        <button
                          key={tool.id}
                          onClick={() => handleToolClick(tool.id)}
                          className="w-full text-left px-3 py-2 rounded-xl text-xs hover:bg-indigo-600/20 text-slate-200 flex items-center justify-between cursor-pointer"
                        >
                          <span className="font-medium truncate pr-1">{tool.title}</span>
                          <span className="text-[10px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded shrink-0">{tool.category}</span>
                        </button>
                      ))
                    ) : (
                      <p className="text-center text-xs text-slate-500 py-3">No tools found</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white cursor-pointer min-w-[40px] min-h-[40px] flex items-center justify-center"
            aria-label="Toggle mobile menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Accordion Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-slate-950 border-b border-slate-800 p-4 space-y-3 max-h-[80vh] overflow-y-auto animate-in slide-in-from-top duration-200">
          <button
            onClick={() => handleToolClick('home')}
            className="w-full text-left px-4 py-2.5 rounded-xl bg-slate-900 font-semibold text-xs text-white flex items-center justify-between cursor-pointer"
          >
            <span>Home</span>
            <Layers className="w-4 h-4 text-indigo-400" />
          </button>

          {categories.map((cat) => (
            <div key={cat.name} className="border border-slate-800/80 rounded-xl overflow-hidden bg-slate-900/60">
              <button
                onClick={() => setMobileExpandedCat(mobileExpandedCat === cat.name ? null : cat.name)}
                className="w-full text-left px-4 py-3 text-xs font-bold text-slate-200 flex items-center justify-between cursor-pointer hover:bg-slate-900"
              >
                <span>{cat.name}</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${mobileExpandedCat === cat.name ? 'rotate-180 text-indigo-400' : ''}`} />
              </button>

              {mobileExpandedCat === cat.name && (
                <div className="bg-slate-950 p-2 space-y-1 border-t border-slate-800">
                  {cat.tools.map((tool) => (
                    <button
                      key={tool.id}
                      onClick={() => handleToolClick(tool.id)}
                      className="w-full text-left px-3 py-2 rounded-lg text-xs text-slate-300 hover:bg-indigo-600/20 hover:text-white flex items-center justify-between cursor-pointer"
                    >
                      <span className="truncate pr-1">{tool.title}</span>
                      {tool.badge && (
                        <span className="text-[9px] font-semibold bg-slate-800 text-indigo-400 px-1.5 py-0.5 rounded shrink-0">
                          {tool.badge}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </header>
  );
};
