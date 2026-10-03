import { ToolId, ToolItem } from '../types';
import { TOOLS } from '../data/tools';

const STORAGE_KEY = 'pixelcraft_tool_usage_v1';

const FALLBACK_POPULAR_IDS: string[] = [
  'compressor',
  'background-remover',
  'pdf-compressor',
  'converter'
];

export const getToolUsageCounts = (): Record<string, number> => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
};

export const incrementToolUsage = (toolId: string) => {
  if (!toolId || toolId === 'home') return;
  try {
    const counts = getToolUsageCounts();
    counts[toolId] = (counts[toolId] || 0) + 1;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(counts));
  } catch (err) {
    console.error('Failed to update tool usage:', err);
  }
};

export const getTopFourTools = (): ToolItem[] => {
  const counts = getToolUsageCounts();
  
  // Sort all tools by usage count DESC
  const sorted = [...TOOLS].sort((a, b) => {
    const countA = counts[a.id] || 0;
    const countB = counts[b.id] || 0;
    return countB - countA;
  });

  const topTools: ToolItem[] = [];
  const addedIds = new Set<string>();

  // First add tools with actual usage counts > 0
  for (const tool of sorted) {
    if ((counts[tool.id] || 0) > 0 && !addedIds.has(tool.id)) {
      topTools.push(tool);
      addedIds.add(tool.id);
      if (topTools.length === 4) break;
    }
  }

  // If we have fewer than 4, fill from fallback list
  for (const fallbackId of FALLBACK_POPULAR_IDS) {
    if (topTools.length >= 4) break;
    if (!addedIds.has(fallbackId)) {
      const found = TOOLS.find(t => t.id === fallbackId);
      if (found) {
        topTools.push(found);
        addedIds.add(fallbackId);
      }
    }
  }

  // If still fewer than 4 (e.g. fallback missing), fill from remaining TOOLS
  for (const tool of TOOLS) {
    if (topTools.length >= 4) break;
    if (!addedIds.has(tool.id)) {
      topTools.push(tool);
      addedIds.add(tool.id);
    }
  }

  return topTools.slice(0, 4);
};
