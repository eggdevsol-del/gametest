import React from 'react';
import type { GameState } from '../game/types';

interface ResultModalProps {
    gameState: GameState;
    onDismiss: () => void;
}

export const ResultModal: React.FC<ResultModalProps> = ({ gameState, onDismiss }) => {
    const result = gameState.lastResult;
    if (!result) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md anim-fade-in">
            <div className="glass-panel w-full max-w-md p-8 text-center flex flex-col items-center gap-6 animate-bounce-in">

                <div className="space-y-2">
                    <h2 className="text-3xl font-bold bg-gradient-to-r from-accent-primary to-accent-secondary bg-clip-text text-transparent">
                        {result.title}
                    </h2>
                    <p className="text-muted italic">"{result.message}"</p>
                </div>

                <div className="flex items-center justify-center w-24 h-24 rounded-full bg-white/5 border-2 border-accent-secondary/50">
                    <span className="text-4xl font-bold text-white">{result.quality}%</span>
                </div>

                <div className="w-full bg-white/5 p-4 rounded-lg">
                    <p className="text-sm text-muted uppercase tracking-wider mb-2">Rewards</p>
                    <p className="font-mono text-green-400">{result.rewards}</p>
                </div>

                <button
                    onClick={onDismiss}
                    className="glass-button action-btn-large w-full justify-center"
                >
                    Awesome!
                </button>

            </div>
        </div>
    );
};
