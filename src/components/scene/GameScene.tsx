import React from 'react';
import garageBg from '../../assets/garage_bg.png';
import { Character } from './Character';
import { Bubble } from './Bubble';
import type { GameState } from '../../game/types';
import { SCENE_CONFIG } from '../../game/scene-config';

interface GameSceneProps {
    gameState: GameState;
}

export const GameScene: React.FC<GameSceneProps> = ({ gameState }) => {
    const { character } = gameState.visuals;

    return (
        <div className="absolute inset-0 overflow-hidden bg-[#1a1a2e]">
            {/* Camera / Scroll Container - centering the room */}
            <div className="relative w-full h-full flex items-center justify-center">

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

                    {/* Staff Layer */}
                    {gameState.staff.map((employee, index) => {
                        const slot = SCENE_CONFIG.staffSlots[index % SCENE_CONFIG.staffSlots.length];
                        return (
                            <Character
                                key={employee.id}
                                x={slot.x}
                                y={slot.y}
                                facing={slot.facing}
                                state={'working'} // Staff are always "working" or idle at station
                            />
                        );
                    })}

                    {/* Character Layer (Player) */}
                    <Character
                        x={character.x}
                        y={character.y}
                        facing={character.facing}
                        state={character.state}
                    />

                    {/* VFX Layer (Bubbles) */}
                    {gameState.visuals.effects.map(effect => (
                        <Bubble
                            key={effect.id}
                            x={effect.x}
                            y={effect.y}
                            color={effect.color}
                            label={effect.value ? String(effect.value) : undefined}
                        />
                    ))}

                    {/* Foreground Effects (Optional, e.g. lighting overlays) */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent pointer-events-none mix-blend-multiply" />
                </div>
            </div>
        </div>
    );
};
