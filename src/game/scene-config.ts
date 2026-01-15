export const SCENE_CONFIG = {
    positions: {
        idle: { x: 50, y: 60, facing: 'right' as const }, // Middle of room
        chair: { x: 65, y: 45, facing: 'left' as const }, // Near the tattoo chair
        desk: { x: 30, y: 45, facing: 'right' as const }, // Near the drawing desk
        door: { x: 85, y: 30, facing: 'left' as const },  // Exit/Enter
    },
    animation: {
        walkSpeed: 500, // ms duration for transition
    }
};
