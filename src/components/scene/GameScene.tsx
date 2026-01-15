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
                <div
                    className="relative w-[1200px] h-[900px] select-none pointer-events-none"
                    style={{
                        transform: 'scale(0.8)', // Slight zoom out to fit typical screens
                        transformOrigin: 'center center'
                    }}
                >
                    {/* Background Layer */}
                    <img
                        src={garageBg}
                        alt="Garage Studio"
                        className="absolute inset-0 w-full h-full object-contain"
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
