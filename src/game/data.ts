import type { TattooStyle } from './types';

export interface Topic {
    id: string;
    name: string;
    difficulty: number; // 1-10 multiplier for time/risk
    baseValue: number; // Base money reward
    compatibleStyles: TattooStyle[];
}

export interface StyleConfig {
    id: TattooStyle;
    name: string;
    description: string;
    idealStats: {
        line: number; // 0-100
        shading: number; // 0-100
        color: number; // 0-100
    };
}

export const TOPICS: Topic[] = [
    {
        id: 'skull',
        name: 'Skull',
        difficulty: 1.0,
        baseValue: 50,
        compatibleStyles: ['Traditional', 'Realism', 'Neo-Traditional', 'Tribal']
    },
    {
        id: 'rose',
        name: 'Rose',
        difficulty: 1.2,
        baseValue: 60,
        compatibleStyles: ['Traditional', 'Realism', 'Watercolor', 'Neo-Traditional']
    },
    {
        id: 'dagger',
        name: 'Dagger',
        difficulty: 1.1,
        baseValue: 55,
        compatibleStyles: ['Traditional', 'Neo-Traditional']
    },
    {
        id: 'koi',
        name: 'Koi Fish',
        difficulty: 1.5,
        baseValue: 80,
        compatibleStyles: ['Japanese', 'Realism', 'Watercolor']
    },
    {
        id: 'script',
        name: 'Script / Text',
        difficulty: 0.8,
        baseValue: 40,
        compatibleStyles: ['Traditional', 'Tribal'] // Simplified
    }
];

export const STYLES: Record<TattooStyle, StyleConfig> = {
    'Traditional': {
        id: 'Traditional',
        name: 'American Traditional',
        description: 'Bold lines, heavy black shading, limited color palette.',
        idealStats: {
            line: 90,   // Heavy lines
            shading: 70, // Heavy black shading
            color: 40    // Minimal/Specific color
        }
    },
    'Realism': {
        id: 'Realism',
        name: 'Realism',
        description: 'Photo-realistic detail, smooth shading, no outlines.',
        idealStats: {
            line: 10,   // Minimal/No lines
            shading: 90, // Smooth shading is key
            color: 50    // Variable
        }
    },
    'Tribal': {
        id: 'Tribal',
        name: 'Tribal',
        description: 'Bold black abstract patterns.',
        idealStats: {
            line: 80,
            shading: 100, // Solid black fill
            color: 0
        }
    },
    'Watercolor': {
        id: 'Watercolor',
        name: 'Watercolor',
        description: 'No outlines, splashes of vibrant color.',
        idealStats: {
            line: 10,
            shading: 30,
            color: 100
        }
    },
    'Neo-Traditional': {
        id: 'Neo-Traditional',
        name: 'Neo-Traditional',
        description: 'Art Nouveau inspired, varied line weight, wider color palette.',
        idealStats: {
            line: 70,
            shading: 60,
            color: 80
        }
    },
    'Japanese': {
        id: 'Japanese',
        name: 'Irezumi (Japanese)',
        description: 'Large scale, flow, background elements like wind/waves.',
        idealStats: {
            line: 80,
            shading: 80,
            color: 90
        }
    }
};

// Research Data
export interface ResearchItem {
    id: string;
    name: string;
    description: string;
    cost: {
        money: number;
        xp: number;
    };
    duration: number; // ms
    type: 'style' | 'marketing' | 'equipment';
    unlockId?: string; // The ID of the thing it unlocks (e.g. 'Realism')
    prereq?: string[]; // IDs of required research
}

export const RESEARCH_ITEMS: ResearchItem[] = [
    {
        id: 'res_realism',
        name: 'Study Realism',
        description: 'Learn the techniques of realistic shading and portraiture.',
        cost: { money: 100, xp: 50 },
        duration: 10000,
        type: 'style',
        unlockId: 'Realism'
    },
    {
        id: 'res_tribal',
        name: 'Tribal Patterns',
        description: 'Master the bold, black lines of tribal designs.',
        cost: { money: 50, xp: 20 },
        duration: 5000,
        type: 'style',
        unlockId: 'Tribal'
    },
    {
        id: 'res_watercolor',
        name: 'Watercolor Technique',
        description: 'Learn to blend colors without outlines.',
        cost: { money: 200, xp: 100 },
        duration: 15000,
        type: 'style',
        unlockId: 'Watercolor',
        prereq: ['res_realism']
    },
    {
        id: 'res_japanese',
        name: 'Irezumi Basics',
        description: 'Study the flow and motifs of Japanese traditional tattoos.',
        cost: { money: 300, xp: 150 },
        duration: 20000,
        type: 'style',
        unlockId: 'Japanese'
    },
    {
        id: 'res_neo_trad',
        name: 'Neo-Traditional',
        description: 'Modernizing the classics with varying line weights.',
        cost: { money: 150, xp: 75 },
        duration: 12000,
        type: 'style',
        unlockId: 'Neo-Traditional'
    }
];

// Shop Model
export interface ShopItem {
    id: string;
    name: string;
    description: string;
    cost: number;
    type: 'machine' | 'chair' | 'decor';
    stats?: {
        speedBonus?: number; // Percent faster
        qualityBonus?: number; // Percent better results
    };
}

export const SHOP_ITEMS: ShopItem[] = [
    {
        id: 'mach_coil_v2',
        name: 'Iron Workhorse',
        description: 'A reliable coil machine. Faster and steadier.',
        cost: 300,
        type: 'machine',
        stats: { speedBonus: 0.1, qualityBonus: 5 }
    },
    {
        id: 'mach_rotary_v1',
        name: 'Stealth Rotary',
        description: 'Quiet, lightweight, and precise. Great for lining.',
        cost: 800,
        type: 'machine',
        stats: { speedBonus: 0.2, qualityBonus: 10 }
    },
    {
        id: 'decor_neon',
        name: 'Neon Sign',
        description: 'Adds some vibe. Clients trust a place with a neon sign.',
        cost: 150,
        type: 'decor'
    },
    {
        id: 'chair_comfy',
        name: 'Ergo-Chair 3000',
        description: 'Your back will thank you.',
        cost: 500,
        type: 'chair'
    }
];

// Location / Studio Data
export interface LocationDef {
    id: string;
    name: string;
    description: string;
    capacity: number; // Max artists
    cost: number;
    repReq: number; // Reputation required to buy
    bgKey: string; // Asset key for background
}

export const LOCATIONS: LocationDef[] = [
    {
        id: 'loc_garage',
        name: 'Mom\'s Garage',
        description: 'It smells like oil and ambition. Rent free!',
        capacity: 1,
        cost: 0,
        repReq: 0,
        bgKey: 'garage'
    },
    {
        id: 'loc_studio',
        name: 'Private Studio',
        description: 'A proper clean space. You can hire an apprentice.',
        capacity: 2,
        cost: 2000,
        repReq: 100,
        bgKey: 'studio_small'
    },
    {
        id: 'loc_street',
        name: 'Street Shop',
        description: 'High visibility, high traffic. The real deal.',
        capacity: 10,
        cost: 10000,
        repReq: 500,
        bgKey: 'shop_street'
    },
    {
        id: 'loc_highrise',
        name: 'Highrise Elite',
        description: 'Top floor, top dollar. Pinnacle of the industry.',
        capacity: 20,
        cost: 50000,
        repReq: 2000,
        bgKey: 'studio_large'
    }
];

// Game Events
import type { GameEvent } from './types';

export const GAME_EVENTS: GameEvent[] = [
    {
        id: 'evt_small_expo',
        name: 'Local Tattoo Expo',
        description: 'A small convention in town. Good for reputation.',
        type: 'expo',
        duration: 60000,
        cost: 200,
        rewards: { reputation: 25, xp: 50, money: 0 }
    },
    {
        id: 'evt_workshop',
        name: 'Online Seminar',
        description: 'Teach a class online about hygiene and shading.',
        type: 'seminar',
        duration: 30000,
        cost: 0,
        rewards: { reputation: 10, money: 100 }
    },
    {
        id: 'evt_big_expo',
        name: 'International Tattoo Fest',
        description: 'The big leagues. Huge networking opportunity.',
        type: 'expo',
        duration: 120000,
        cost: 1000,
        rewards: { reputation: 200, xp: 500 }
    }
];
