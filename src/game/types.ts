export interface VisualState {
    character: {
        x: number;
        y: number;
        facing: 'left' | 'right';
        state: 'idle' | 'walking' | 'working';
    };
}

export interface GameState {
    resources: {
        money: number;
        reputation: number;
        experience: number;
    };
    stats: {
        tattoosDone: number;
        designsCreated: number;
        playedTime: number; // in seconds
    };
    unlocks: {
        styles: TattooStyle[];
        equipment: string[];
        research: string[]; // IDs of completed research
    };
    currentAction: GameAction | null;
    history: LogEntry[];
    lastResult: {
        title: string;
        message: string;
        rewards: string;
        quality: number; // 0-100
    } | null;
    settings: {
        soundVolume: number;
        musicVolume: number;
    };
    visuals: VisualState;
    // Meta Progression
    // Meta Progression
    location: string; // Current Location ID
    staff: Employee[]; // Hired staff
    candidates: Employee[]; // Available for hire
    activeEvent: GameEvent | null;
}

export interface Employee {
    id: string;
    name: string;
    level: number; // 1-10
    stats: {
        speed: number;    // Multiplier for passive income rate
        artistic: number; // Reputation bonus
        technical: number; // Base income value
    };
    salary: number; // Cost per 60s (Daily)
    hiredAt: number; // Timestamp
}

export type TattooStyle = 'Traditional' | 'Realism' | 'Tribal' | 'Watercolor' | 'Neo-Traditional' | 'Japanese';

export interface TattooDesign {
    topicId: string;
    styleId: TattooStyle;
    complexity: number; // 0-100? Derived from topic difficulty?
    // Player chosen settings
    targetStats: {
        line: number;
        shading: number;
        color: number;
    };
}

export interface GameAction {
    id: string;
    type: 'tattoo' | 'research' | 'rest';
    startTime: number;
    duration: number; // in milliseconds
    name: string;
    // Payload for specific actions
    payload?: {
        design?: TattooDesign;
        researchItem?: any; // Avoiding circular dependency with ResearchItem for now
    };
}

export interface LogEntry {
    id: string;
    timestamp: number;
    message: string;
    type: 'info' | 'success' | 'warning' | 'error';
}

export interface GameEvent {
    id: string;
    name: string;
    description: string;
    type: 'expo' | 'seminar' | 'viral';
    duration: number; // How long the offer lasts
    cost?: number;
    rewards: {
        reputation?: number;
        money?: number;
        xp?: number;
    };
}

export const INITIAL_STATE: GameState = {
    resources: {
        money: 50, // Start with $50 (enough for basic supplies)
        reputation: 0,
        experience: 0,
    },
    stats: {
        tattoosDone: 0,
        designsCreated: 0,
        playedTime: 0,
    },
    unlocks: {
        styles: ['Traditional'], // Start with one style
        equipment: ['Starter Machine'],
        research: [],
    },
    currentAction: null,
    history: [{
        id: 'init',
        timestamp: Date.now(),
        message: 'Welcome to your garage studio. Time to make a mark.',
        type: 'info'
    }],
    lastResult: null,
    settings: {
        soundVolume: 0.5,
        musicVolume: 0.5
    },
    // Initial visual state (centered)
    visuals: {
        character: {
            x: 50, // Percent 
            y: 60, // Percent
            facing: 'right',
            state: 'idle'
        }
    },
    location: 'loc_garage',
    staff: [],
    candidates: [],
    activeEvent: null
};
