import React from 'react';
import { SCENE_CONFIG } from '../../game/scene-config';

interface SpriteCharacterProps {
    x: number;
    y: number;
    facing: 'left' | 'right';
    state: 'idle' | 'walking' | 'working';
    texture: string;
}

export const SpriteCharacter: React.FC<SpriteCharacterProps> = ({ x, y, facing, state, texture }) => {
    // Spritesheet Config
    // 8 Columns (Angles), 3 Rows (Actions)
    // Angles usually start South and go CW or CCW.
    // Let's guess: 0=S, 1=SE, 2=E, 3=NE, 4=N, 5=NW, 6=W, 7=SW
    // Facing 'right' (Isometric East/SE) -> Col 1 or 2
    // Facing 'left' (Isometric West/SW) -> Col 6 or 7

    let row = 0; // Idle
    let col = 0;

    // Row Logic
    if (state === 'idle') row = 0;
    if (state === 'walking') row = 1;
    if (state === 'working') row = 2;

    // Col Logic
    // We only support left/right facing prop for now, but we can map to isometric cols
    if (facing === 'right') {
        col = 2; // East-ish
    } else {
        col = 6; // West-ish
    }

    // Work override: If at desk, might need specific angle?
    // For now, respect 'facing' prop.

    // CSS Sprite Calculation
    // Sheet is 8 cols x 3 rows.
    // background-position-x: calc(100% / 7 * col)
    // background-position-y: calc(100% / 2 * row)

    // Animate "Walking" by bobbing? Or toggling frames if available?
    // Since columns are angles, we don't have walk frames for a single angle.
    // So distinct animation is limited to "Bobbing" or "Sliding".

    // Create a "Step" effect by slight angle toggle or bob logic if allowed?
    // No, switching angle would look like glitching.
    // Let's just stick to the angle column.

    return (
        <div
            className="absolute origin-bottom transition-all"
            style={{
                left: `${x}% `,
                top: `${y}% `,
                transition: `all ${SCENE_CONFIG.animation.moveDuration}ms linear`,
                zIndex: Math.floor(y),
            }}
        >
            <div className="relative -translate-x-1/2 -translate-y-[90%]">
                {/* Sprite Frame */}
                <div
                    className="w-16 h-16 overflow-hidden relative"
                    style={{
                        imageRendering: 'pixelated', // Crisp pixels
                    }}
                >
                    <div
                        style={{
                            backgroundImage: `url(${texture})`,
                            backgroundSize: '800% 300%', // 8 cols, 3 rows
                            backgroundPositionX: `${(col / 7) * 100}%`,
                            backgroundPositionY: `${(row / 2) * 100}%`,
                            width: '100%',
                            height: '100%',
                            position: 'absolute'
                        }}
                    />
                </div>

                {/* Shadow */}
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-8 h-3 bg-black/30 blur-sm rounded-full" />

                {/* Debug Label (Optional, remove for prod) */}
                {/* <div className="absolute top-0 text-[8px] bg-white opacity-50">{state}</div> */}
            </div>
        </div>
    );
};
