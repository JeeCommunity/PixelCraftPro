import React from 'react';
import { Layers, Heart, Shield, Zap, Sparkles } from 'lucide-react';
import { ToolId } from '../types';

interface FooterProps {
  onSelectTool?: (tool: ToolId) => void;
}

export const Footer: React.FC<FooterProps> = ({ onSelectTool }) => {
  return (
    <footer className="mt-auto bg-slate-950 border-t border-slate-900 text-slate-400 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
        <div className="md:col-span-1 space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
              <Layers className="w-4 h-4" />
            </div>
            <span className="font-bold text-white tracking-tight">PixelCraft Pro</span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Professional browser-based image tools suite. Fast, secure, and zero server upload required for most operations.
          </p>
        </div>

        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300 mb-4">Core Tools</h4>
          <ul className="space-y-2.5 text-xs">
            <li><button onClick={() => onSelectTool?.('background-remover')} className="hover:text-white transition-colors cursor-pointer text-left">Background Remover</button></li>
            <li><button onClick={() => onSelectTool?.('compressor')} className="hover:text-white transition-colors cursor-pointer text-left">Image Compressor</button></li>
            <li><button onClick={() => onSelectTool?.('resizer')} className="hover:text-white transition-colors cursor-pointer text-left">Resizer & Cropper</button></li>
            <li><button onClick={() => onSelectTool?.('converter')} className="hover:text-white transition-colors cursor-pointer text-left">Format Converter</button></li>
          </ul>
        </div>

        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300 mb-4">Legal & Privacy</h4>
          <ul className="space-y-2.5 text-xs">
            <li>
              <button 
                onClick={() => onSelectTool ? onSelectTool('privacy-policy') : window.location.href = '/privacy-policy'} 
                className="hover:text-white transition-colors cursor-pointer text-left"
              >
                Privacy Policy
              </button>
            </li>
            <li>
              <button 
                onClick={() => onSelectTool ? onSelectTool('terms') : window.location.href = '/terms'} 
                className="hover:text-white transition-colors cursor-pointer text-left"
              >
                Terms & Conditions
              </button>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300 mb-4">Privacy & Security</h4>
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center gap-2 text-xs text-emerald-400 font-medium">
              <Shield className="w-4 h-4 shrink-0" />
              <span>100% Client-Side Processing</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Your images stay on your device. We never store or transmit your personal photos to external servers.
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto pt-8 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-4">
        <p>© {new Date().getFullYear()} PixelCraft Pro. All rights reserved.</p>
        <div className="flex items-center gap-6">
          <span className="flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>High Performance Processing</span>
          </span>
          <span className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>Gemini AI Enabled</span>
          </span>
        </div>
      </div>
    </footer>
  );
};
