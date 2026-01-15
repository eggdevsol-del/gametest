import React from 'react';
import type { GameState } from '../game/types';
import { GameScene } from './scene/GameScene';

interface LayoutProps {
    children: React.ReactNode;
    gameState: GameState;
    onReset: () => void;
    onSave: () => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, gameState, onReset, onSave }) => {
    return (
        <div className="layout-root">
            {/* 3D Game Scene Background */}
            <GameScene gameState={gameState} />

            {/* Header / Top Bar */}
            <header className="layout-header glass-panel">
                <div className="header-brand">
                    <h1 className="brand-title">
                        Tattoo Tycoon
                    </h1>
                    <div className="header-stats">
                        <span className="stat-item">
                            <span className="stat-icon money-symbol">$</span>
                            {gameState.resources.money.toFixed(0)}
                        </span>
                        <span className="stat-item">
                            <span className="stat-icon rep-symbol">★</span>
                            {gameState.resources.reputation.toFixed(0)}
                        </span>
                        <span className="stat-item">
                            <span className="stat-icon xp-symbol">XP</span>
                            {gameState.resources.experience.toFixed(0)}
                        </span>
                    </div>
                </div>

                <div className="header-controls">
                    {/* Debug/System Controls */}
                    <button onClick={onSave} className="glass-button btn-small">
                        Save
                    </button>
                    <button onClick={onReset} className="glass-button btn-small btn-danger">
                        Reset
                    </button>
                </div>
            </header>

            {/* Main Content Area */}
            <main className="layout-main">
                <div className="glass-panel main-content">
                    {children}
                </div>
            </main>

            {/* Status Bar / Bottom */}
            <footer className="layout-footer">
                v0.1.0 • Pre-Alpha
            </footer>
        </div>
    );
};
