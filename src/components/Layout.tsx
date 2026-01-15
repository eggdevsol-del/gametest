import React from 'react';
import type { GameState } from '../game/types';
import { GameScene } from './scene/GameScene';

interface LayoutProps {
    children: React.ReactNode;
    gameState: GameState;
}

export const Layout: React.FC<LayoutProps> = ({ children, gameState }) => {
    return (
        <div className="layout-root">
            {/* 3D Game Scene Background */}
            <GameScene gameState={gameState} />

            {/* Header Removed (Replaced by HUD) */}

            {/* Main Content Area */}
            <main className="layout-main pointer-events-none">
                <div className="main-content pointer-events-auto">
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
