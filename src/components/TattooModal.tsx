import { useState } from 'react';
import type { GameState, TattooDesign, TattooStyle } from '../game/types';
import { TOPICS, type Topic } from '../game/data';

interface TattooModalProps {
    gameState: GameState;
    onClose: () => void;
    onStart: (design: TattooDesign) => void;
}

export const TattooModal = ({ gameState, onClose, onStart }: TattooModalProps) => {
    const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
    const [selectedStyle, setSelectedStyle] = useState<TattooStyle | null>(null);
    const [stats, setStats] = useState({ line: 50, shading: 50, color: 50 });

    const handleStart = () => {
        if (!selectedTopic || !selectedStyle) return;

        const design: TattooDesign = {
            topicId: selectedTopic.id,
            styleId: selectedStyle,
            complexity: selectedTopic.difficulty * 10,
            targetStats: stats
        };

        onStart(design);
    };

    // Filter unlocked styles
    const unlockedStyles = gameState.unlocks.styles;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="glass-panel w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 flex flex-col gap-6 anim-fade-in">

                <header className="flex justify-between items-center border-b border-white/10 pb-4">
                    <h2 className="text-xl font-bold text-accent-primary">Design New Tattoo</h2>
                    <button onClick={onClose} className="text-muted hover:text-white">✕</button>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Left Column: Selection */}
                    <div className="space-y-6">
                        {/* Topic Selection */}
                        <div>
                            <h3 className="text-sm text-muted mb-2 uppercase tracking-wider">Select Topic</h3>
                            <div className="grid grid-cols-2 gap-2">
                                {TOPICS.map(topic => (
                                    <button
                                        key={topic.id}
                                        onClick={() => setSelectedTopic(topic)}
                                        className={`glass-button text-sm justify-start ${selectedTopic?.id === topic.id ? 'border-accent-primary bg-accent-primary/20' : ''}`}
                                    >
                                        {topic.name}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Style Selection */}
                        <div>
                            <h3 className="text-sm text-muted mb-2 uppercase tracking-wider">Select Style</h3>
                            <div className="flex flex-wrap gap-2">
                                {unlockedStyles.map(styleId => (
                                    <button
                                        key={styleId}
                                        onClick={() => setSelectedStyle(styleId)}
                                        className={`glass-button text-sm ${selectedStyle === styleId ? 'border-accent-secondary bg-accent-secondary/20' : ''}`}
                                    >
                                        {styleId}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Execution */}
                    <div className="space-y-6">
                        {/* Stats Sliders */}
                        <div className="space-y-4 p-4 bg-black/20 rounded-lg">
                            <h3 className="text-sm text-muted mb-2 uppercase tracking-wider">Technique</h3>

                            <div className="space-y-1">
                                <div className="flex justify-between text-xs">
                                    <span>Linework</span>
                                    <span>{stats.line}%</span>
                                </div>
                                <input
                                    type="range" min="0" max="100"
                                    value={stats.line}
                                    onChange={(e) => setStats({ ...stats, line: parseInt(e.target.value) })}
                                    className="w-full accent-accent-primary"
                                />
                            </div>

                            <div className="space-y-1">
                                <div className="flex justify-between text-xs">
                                    <span>Shading</span>
                                    <span>{stats.shading}%</span>
                                </div>
                                <input
                                    type="range" min="0" max="100"
                                    value={stats.shading}
                                    onChange={(e) => setStats({ ...stats, shading: parseInt(e.target.value) })}
                                    className="w-full accent-accent-secondary"
                                />
                            </div>

                            <div className="space-y-1">
                                <div className="flex justify-between text-xs">
                                    <span>Color Saturation</span>
                                    <span>{stats.color}%</span>
                                </div>
                                <input
                                    type="range" min="0" max="100"
                                    value={stats.color}
                                    onChange={(e) => setStats({ ...stats, color: parseInt(e.target.value) })}
                                    className="w-full accent-green-400"
                                />
                            </div>
                        </div>

                        {/* Preview / Cost */}
                        <div className="p-4 border border-white/10 rounded-lg bg-white/5">
                            <div className="flex justify-between mb-2">
                                <span className="text-muted">Cost (Supplies)</span>
                                <span className="text-red-400">-$10</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted">Est. Reward</span>
                                <span className="text-green-400">
                                    ${selectedTopic ? selectedTopic.baseValue : 0} - ${selectedTopic ? selectedTopic.baseValue * 2 : 0}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-white/10">
                    <button
                        onClick={handleStart}
                        disabled={!selectedTopic || !selectedStyle || gameState.resources.money < 10}
                        className="glass-button action-btn-large bg-gradient-to-r from-accent-primary to-accent-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Start Tattoo
                    </button>
                </div>
            </div>
        </div>
    );
};
