import React from 'react';
import garageBg from '../../assets/garage_bg.png';
import { Character } from './Character';
import type { GameState } from '../../game/types';

interface GameSceneProps {
    gameState: GameState;
}

export const GameScene: React.FC<GameSceneProps> = ({ gameState }) => {
    const { character } = gameState.visuals;

    return (
        <div className="absolute inset-0 overflow-hidden bg-[#1a1a2e]">
            {/* Camera / Scroll Container - centering the room */}
            <div className="relative w-full h-full flex items-center justify-center">

                {/* Scene Container - scaled to fit or fixed size */}
                {/* Scene Container - Scaled to fit */}
                <div
                    className="relative w-full h-full select-none pointer-events-none"
                >
                    {/* Background Layer */}
                    <img
                        src={garageBg}
                        alt="Garage Studio"
                        className="absolute inset-0 w-full h-full object-cover"
                    />

                    {/* Character Layer */}
                    <Character
                        x={character.x}
                        y={character.y}
                        facing={character.facing}
                        state={character.state}
                    />

                    {/* Foreground Effects (Optional, e.g. lighting overlays) */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent pointer-events-none mix-blend-multiply" />
                </div>
            </div>
        </div>
    );
};
