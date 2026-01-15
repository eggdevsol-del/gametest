import React from 'react';
import type { GameState } from '../game/types';
import { RESEARCH_ITEMS, type ResearchItem } from '../game/data';

interface ResearchModalProps {
    gameState: GameState;
    onClose: () => void;
    onStartResearch: (item: ResearchItem) => void;
}

export const ResearchModal: React.FC<ResearchModalProps> = ({ gameState, onClose, onStartResearch }) => {

    // Check if item is unlocked (in unlockedResearch array)
    const isUnlocked = (id: string) => gameState.unlocks.research.includes(id);

    // Check if prerequisites are met
    const canResearch = (item: ResearchItem) => {
        if (isUnlocked(item.id)) return false; // Already done
        if (!item.prereq) return true;
        return item.prereq.every(prereqId => isUnlocked(prereqId));
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="glass-panel w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col anim-fade-in">

                <header className="p-6 border-b border-white/10 flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-bold text-accent-primary">Research & Study</h2>
                        <p className="text-xs text-muted">Expand your artistic knowledge.</p>
                    </div>
                    <button onClick={onClose} className="text-muted hover:text-white">✕</button>
                </header>

                <div className="p-6 overflow-y-auto space-y-4">
                    {RESEARCH_ITEMS.map(item => {
                        const unlocked = isUnlocked(item.id);
                        const available = canResearch(item);
                        const affordable = gameState.resources.money >= item.cost.money && gameState.resources.experience >= item.cost.xp;

                        return (
                            <div
                                key={item.id}
                                className={`p-4 rounded-lg border flex justify-between items-center transition-all ${unlocked ? 'bg-green-900/20 border-green-500/30' :
                                    available ? 'bg-white/5 border-white/10 hover:border-accent-primary/50' :
                                        'bg-black/40 border-white/5 opacity-50'
                                    }`}
                            >
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <h3 className={`font-bold ${unlocked ? 'text-green-400' : 'text-white'}`}>
                                            {item.name}
                                        </h3>
                                        {unlocked && <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded">Learned</span>}
                                    </div>
                                    <p className="text-sm text-muted">{item.description}</p>

                                    {!unlocked && (
                                        <div className="flex gap-4 mt-2 text-xs font-mono">
                                            <span className={gameState.resources.money >= item.cost.money ? 'text-white' : 'text-red-400'}>
                                                ${item.cost.money}
                                            </span>
                                            <span className={gameState.resources.experience >= item.cost.xp ? 'text-blue-300' : 'text-red-400'}>
                                                {item.cost.xp} XP
                                            </span>
                                        </div>
                                    )}
                                </div>

                                <div>
                                    {!unlocked && (
                                        <button
                                            onClick={() => onStartResearch(item)}
                                            disabled={!available || !affordable}
                                            className={`glass-button text-sm px-4 py-2 ${!available ? 'invisible' : ''
                                                }`}
                                        >
                                            Study
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

            </div>
        </div>
    );
};
