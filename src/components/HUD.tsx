import React, { useEffect, useState } from 'react';
import type { GameState } from '../game/types';

interface HUDProps {
    gameState: GameState;
}

export const HUD: React.FC<HUDProps> = ({ gameState }) => {
    const { resources, stats, currentAction } = gameState;

    // Derived Date: 1 minute = 1 day (simulated) or just use playedTime straight?
    // Let's say 1 IRL second = 1 game hour. 24s = 1 day.
    const totalHours = Math.floor(stats.playedTime);
    const day = Math.floor(totalHours / 24) + 1;
    const hour = totalHours % 24;

    // Progress Bar Logic
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        if (!currentAction) {
            setProgress(0);
            return;
        }

        const updateProgress = () => {
            const now = Date.now();
            const elapsed = now - currentAction.startTime;
            const pct = Math.min(100, (elapsed / currentAction.duration) * 100);
            setProgress(pct);
        };

        const interval = setInterval(updateProgress, 100);
        updateProgress();

        return () => clearInterval(interval);
    }, [currentAction]);

    return (
        <div className="absolute top-0 left-0 w-full p-4 z-40 pointer-events-none">
            <div className="flex justify-between items-start">

                {/* Left: Resources */}
                <div className="glass-panel px-6 py-3 flex gap-6 pointer-events-auto min-w-[300px]">
                    {/* Money */}
                    <div className="flex flex-col">
                        <span className="text-xs text-muted uppercase tracking-wider">Cash</span>
                        <span className="text-xl font-mono text-green-400 font-bold">
                            ${resources.money.toLocaleString()}
                        </span>
                    </div>

                    {/* Reputation */}
                    <div className="flex flex-col">
                        <span className="text-xs text-muted uppercase tracking-wider">Rep</span>
                        <span className="text-xl font-bold flex items-center gap-1">
                            ⭐ {resources.reputation}
                        </span>
                    </div>

                    {/* XP */}
                    <div className="flex flex-col flex-1">
                        <span className="text-xs text-muted uppercase tracking-wider">Experience</span>
                        <div className="flex items-center gap-2">
                            <div className="h-2 w-24 bg-white/10 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-blue-500 transition-all duration-500"
                                    style={{ width: `${(resources.experience % 1000) / 10}%` }} // Mock level up at 1000
                                />
                            </div>
                            <span className="text-sm font-mono">{resources.experience} XP</span>
                        </div>
                    </div>
                </div>

                {/* Right: Date/Time */}
                <div className="glass-panel px-4 py-2 pointer-events-auto">
                    <span className="font-mono text-lg font-bold">
                        Day {day} • {hour.toString().padStart(2, '0')}:00
                    </span>
                </div>
            </div>

            {/* Center: Action Progress */}
            {currentAction && (
                <div className="absolute top-20 left-1/2 -translate-x-1/2 w-96 anim-fade-in pointer-events-auto">
                    <div className="glass-panel p-3">
                        <div className="flex justify-between mb-1 text-sm">
                            <span className="font-bold text-accent-primary animate-pulse">{currentAction.name}</span>
                            <span className="text-muted">{Math.round(progress)}%</span>
                        </div>
                        <div className="h-4 bg-black/40 rounded-full overflow-hidden border border-white/5">
                            <div
                                className="h-full bg-gradient-to-r from-accent-primary to-accent-secondary transition-all duration-100 ease-linear relative overflow-hidden"
                                style={{ width: `${progress}%` }}
                            >
                                {/* Shimmer effect */}
                                <div className="absolute inset-0 bg-white/20 animate-slide-x" />
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
