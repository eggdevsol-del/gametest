import React from 'react';
import characterSprite from '../../assets/character.png';
import { SCENE_CONFIG } from '../../game/scene-config';

interface CharacterProps {
    x: number; // Percentage 0-100
    y: number; // Percentage 0-100
    facing: 'left' | 'right';
    state: 'idle' | 'walking' | 'working';
}

export const Character: React.FC<CharacterProps> = ({ x, y, facing, state }) => {
    return (
        <div
            className="absolute origin-bottom transition-all"
            style={{
                left: `${x}%`,
                top: `${y}%`,
                transform: `translate(-50%, -100%) scale(${facing === 'left' ? -1 : 1}, 1)`, // Flip for facing
                transition: `all ${SCENE_CONFIG.animation.moveDuration}ms ease-in-out`,
                zIndex: Math.floor(y), // Dynamic Z-Index for pseudo-3D
            }}
        >
            <div className={`relative ${state === 'working' ? 'animate-bounce' : ''}`}> {/* Simple bounce for working */}
                {/* Sprite Image */}
                <img
                    src={characterSprite}
                    alt="Character"
                    className="w-32 h-auto drop-shadow-2xl"
                    style={{
                        imageRendering: 'pixelated'
                    }}
                />

                {/* Shadow blob */}
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-16 h-4 bg-black/40 blur-sm rounded-full -z-10" />
            </div>
        </div>
    );
};
