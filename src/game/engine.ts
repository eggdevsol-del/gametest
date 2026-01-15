import { useState, useEffect, useRef, useCallback } from 'react';
import { type GameState, INITIAL_STATE, type TattooDesign, type LogEntry, type TattooStyle, type Employee, type VisualEffect } from './types';
import { SCENE_CONFIG } from './scene-config';
import { type ResearchItem, type ShopItem, LOCATIONS, GAME_EVENTS } from './data';

// ... (rest of imports)

// ... inside useGameEngine ...

// Game Timing Constants
const TICK_RATE = 1000;
const DAY_LENGTH_SECONDS = 300; // 5 Minutes per Game Day
const EVENT_CHECK_INTERVAL = 60; // Check for events every 60s of game time

const AUTO_SAVE_INTERVAL = 30000; // 30 seconds

export const useGameEngine = () => {
    const [state, setState] = useState<GameState>(() => {
        // Load from local storage
        const saved = localStorage.getItem('tattoo-tycoon-save');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                // Migration: Ensure new fields (visuals, etc) exist by merging with INITIAL_STATE
                // We do a shallow merge of top-lvl and specific merge for nested criticals
                return {
                    ...INITIAL_STATE,
                    ...parsed,
                    visuals: {
                        ...INITIAL_STATE.visuals,
                        ...(parsed.visuals || {})
                    },
                    // Ensure stats and resources are also safe (though usually they exist)
                    stats: { ...INITIAL_STATE.stats, ...(parsed.stats || {}) },
                    resources: { ...INITIAL_STATE.resources, ...(parsed.resources || {}) }
                };
            } catch (e) {
                console.error('Failed to load save, resetting:', e);
                return INITIAL_STATE;
            }
        }
        return INITIAL_STATE;
    });

    const lastSaveTime = useRef(Date.now());

    // Game Loop
    useEffect(() => {
        const interval = setInterval(() => {
            setState(current => {
                const now = Date.now();
                const newState = { ...current };

                // Update played time
                newState.stats.playedTime += TICK_RATE / 1000;

                // Handle active actions
                if (current.currentAction) {
                    const elapsed = now - current.currentAction.startTime;
                    if (elapsed >= current.currentAction.duration) {
                        // Check if we need to finalize the action via the callback
                        // We can't call the callback directly inside setState reducer easily without refs/effects
                        // But for simplicity in this tick-based model, we can just mark it done or handle it in specific effect
                        // REFACTOR: Actually, let's just use the 'completeTattoo' logic directly here or trigger an effect
                        // Better yet, lets expose a 'tick' function if we move logic out, but for now:

                        // If it's a tattoo action that just finished
                        if (current.currentAction.type === 'tattoo' && current.currentAction.payload?.design) {
                            // We need to trigger completion. Since we are in setState, we can't call another setState (completeTattoo).
                            // We will handle this in a separate useEffect that watches state.currentAction?
                            // OR, just do the logic right here.

                            // Let's do logic inline for now to ensure atomic update
                            const design = current.currentAction.payload.design;
                            console.log('Completing tattoo:', design);
                            const quality = Math.floor(Math.random() * 50) + 50;
                            const reward = 100 * (quality / 100);
                            const xp = 10 + (quality / 5);

                            const historyEntry: LogEntry = {
                                id: crypto.randomUUID(),
                                timestamp: Date.now(),
                                message: `Completed tattoo! Quality: ${quality}%. Earned $${reward.toFixed(0)}.`,
                                type: 'success'
                            };

                            newState.resources.money += reward;
                            newState.resources.reputation += 1;
                            newState.resources.experience += xp;
                            newState.stats.tattoosDone += 1;
                            newState.history = [historyEntry, ...newState.history].slice(0, 50);
                            newState.currentAction = null;

                            // Visuals: Return to idle
                            newState.visuals.character = {
                                ...newState.visuals.character,
                                x: SCENE_CONFIG.positions.idle.x,
                                y: SCENE_CONFIG.positions.idle.y,
                                facing: SCENE_CONFIG.positions.idle.facing,
                                state: 'idle'
                            };

                            // Set Last Result
                            newState.lastResult = {
                                title: 'Tattoo Complete',
                                message: `You completed a ${design.styleId} ${design.topicId}.`,
                                rewards: `$${reward.toFixed(0)} | ${xp.toFixed(0)} XP`,
                                quality: quality
                            };

                        } else if (current.currentAction.type === 'research') {
                            // Handle Research Completion
                            // We need to extract the research ID. Since we didn't firmly type it in payload yet,
                            // we have to rely on a hack or expected state structure.
                            // In startResearch we passed it.
                            const researchItem = (current.currentAction as any).payload?.researchItem as ResearchItem;

                            if (researchItem) {
                                newState.unlocks.research = [...(newState.unlocks.research || []), researchItem.id];

                                // Unlock style if applicable
                                if (researchItem.type === 'style' && researchItem.unlockId) {
                                    newState.unlocks.styles = [...newState.unlocks.styles, researchItem.unlockId as TattooStyle];
                                }

                                newState.history.unshift({
                                    id: crypto.randomUUID(),
                                    timestamp: Date.now(),
                                    message: `Research Complete: ${researchItem.name}`,
                                    type: 'success'
                                });

                                newState.lastResult = {
                                    title: 'Research Complete',
                                    message: `You have mastered ${researchItem.name}!`,
                                    rewards: 'New Style Unlocked',
                                    quality: 100
                                };
                            }

                            newState.currentAction = null;
                            newState.visuals.character.state = 'idle';
                            // Reset position
                            newState.visuals.character.x = SCENE_CONFIG.positions.idle.x;
                            newState.visuals.character.y = SCENE_CONFIG.positions.idle.y;

                        } else {
                            // Generic action completion
                            newState.currentAction = null;
                            newState.visuals.character.state = 'idle';
                        }
                    }
                }

                // Auto Save
                if (now - lastSaveTime.current > AUTO_SAVE_INTERVAL) {
                    localStorage.setItem('tattoo-tycoon-save', JSON.stringify(newState));
                    lastSaveTime.current = now;
                }

                // ----------------------------------------------------
                // PASSIVE INCOME (Staff Working)
                // ----------------------------------------------------
                // Passive Income from Staff (Every 1s approx)
                if (newState.staff.length > 0) {
                    if (now % 1000 < 100) { // Throttle
                        let passiveMoney = 0;
                        const newEffects: VisualEffect[] = [];

                        newState.staff.forEach((employee, index) => {
                            const chance = employee.stats.speed * 0.1;
                            if (Math.random() < chance) {
                                const qualityRoll = Math.random() * 10 + (employee.stats.technical * 0.5);
                                const earnings = Math.floor(employee.stats.technical * 5);

                                let type: VisualEffect['type'] = 'money';
                                let color = 'orange';

                                if (qualityRoll < 4) {
                                    type = 'bug';
                                    color = 'red';
                                } else if (qualityRoll > 12) {
                                    type = 'tech';
                                    color = '#4ade80';
                                    passiveMoney += earnings * 2;
                                } else {
                                    passiveMoney += earnings;
                                }

                                const slot = SCENE_CONFIG.staffSlots[index % SCENE_CONFIG.staffSlots.length];
                                newEffects.push({
                                    id: Date.now() + '-' + index,
                                    x: slot.x,
                                    y: slot.y,
                                    type,
                                    value: type !== 'bug' ? `+$${earnings}` : 'Oops',
                                    color,
                                    createdAt: now
                                });
                            }
                        });

                        if (passiveMoney > 0 || newEffects.length > 0) {
                            const activeEffects = newState.visuals.effects.filter(e => now - e.createdAt < 2000);
                            newState.resources.money += passiveMoney;
                            newState.visuals.effects = [...activeEffects, ...newEffects];
                        }
                    }
                }

                // ----------------------------------------------------
                // SALARY UPKEEP (Every Day)
                // ----------------------------------------------------
                const dayLength = DAY_LENGTH_SECONDS;
                const prevDay = Math.floor((newState.stats.playedTime - TICK_RATE / 1000) / dayLength);
                const currentDay = Math.floor(newState.stats.playedTime / dayLength);

                if (currentDay > prevDay && newState.staff.length > 0) {
                    // Pay Day!
                    const totalSalaries = newState.staff.reduce((acc, emp) => acc + emp.salary, 0);
                    if (newState.resources.money >= totalSalaries) {
                        newState.resources.money -= totalSalaries;
                        newState.history.unshift({
                            id: crypto.randomUUID(),
                            timestamp: Date.now(),
                            message: `Paid staff salaries: $${totalSalaries}`,
                            type: 'info'
                        });
                    } else {
                        // Cant pay?
                        // For now, go into debt or force fire?
                        // Let's just go negative/debt allowed for salaries
                        newState.resources.money -= totalSalaries;
                        newState.history.unshift({
                            id: crypto.randomUUID(),
                            timestamp: Date.now(),
                            message: `Wages paid (Overdraft): -$${totalSalaries}`,
                            type: 'warning'
                        });
                    }
                }

                // ----------------------------------------------------
                // RECRUITMENT (Refresh Candidates)
                // ----------------------------------------------------
                // Every 2 minutes, refresh candidates if < 3
                if ((newState.stats.playedTime % 120) < 1 && newState.candidates.length < 3) {
                    // Generate a candidate
                    const level = Math.max(1, Math.floor(newState.resources.reputation / 200));
                    // Rep 0 = Lvl 1. Rep 1000 = Lvl 5.

                    const newb: Employee = {
                        id: crypto.randomUUID(),
                        name: `Artist ${Math.floor(Math.random() * 1000)}`, // TODO: Real names
                        level: level,
                        stats: {
                            speed: 20 + (level * 10) + Math.floor(Math.random() * 20),
                            technical: 20 + (level * 10) + Math.floor(Math.random() * 20),
                            artistic: 20 + (level * 10) + Math.floor(Math.random() * 20)
                        },
                        salary: 50 * level,
                        hiredAt: 0
                    };
                    newState.candidates.push(newb);
                }

                // Event Trigger Logic (Random Chance: 1% per check if no event active)
                // Check every EVENT_CHECK_INTERVAL seconds of game time (approx)
                const gameTimeSec = newState.stats.playedTime;

                if (!newState.activeEvent && !newState.currentAction && gameTimeSec > 60) {
                    // We only want to check roughly once per interval, not every tick
                    // Current logic call is 1 sec.
                    if (gameTimeSec % EVENT_CHECK_INTERVAL === 0) {
                        // 20% Chance when interval hits
                        if (Math.random() < 0.2) {
                            // Pick random event
                            const eventIdx = Math.floor(Math.random() * GAME_EVENTS.length);
                            const evt = GAME_EVENTS[eventIdx];

                            // Reputation Check
                            if ((evt.minReputation || 0) <= newState.resources.reputation) {
                                // Check if we can afford it? No, event just Offers itself.
                                // But maybe we filter by 'milestone' logic? For now, random is fun.
                                newState.activeEvent = evt;
                            }
                        }
                    }
                }

                return newState;
            });
        }, TICK_RATE);

        return () => clearInterval(interval);
    }, [state]); // Added state dependency if needed or empty array if refs used

    const manualSave = useCallback(() => {
        localStorage.setItem('tattoo-tycoon-save', JSON.stringify(state));
        lastSaveTime.current = Date.now();
    }, [state]);

    const startTattoo = useCallback((design: TattooDesign) => {
        // Validation: Check money (supplies cost approx $10)
        if (state.resources.money < 10) return false;

        setState(prev => ({
            ...prev,
            resources: {
                ...prev.resources,
                money: prev.resources.money - 10
            },
            currentAction: {
                id: crypto.randomUUID(),
                type: 'tattoo',
                name: 'Doing Tattoo...',
                startTime: Date.now(),
                duration: 5000, // Fixed 5 seconds for now
                payload: { design }
            },
            visuals: {
                character: {
                    ...prev.visuals.character,
                    x: SCENE_CONFIG.positions.chair.x,
                    y: SCENE_CONFIG.positions.chair.y,
                    facing: SCENE_CONFIG.positions.chair.facing,
                    state: 'working'
                },
                effects: prev.visuals.effects
            }
        }));
        return true;
    }, [state.resources.money]);

    const resetGame = useCallback(() => {
        if (confirm('Are you sure you want to reset your progress?')) {
            localStorage.removeItem('tattoo-tycoon-save');
            setState(INITIAL_STATE);
        }
    }, []);

    const startResearch = useCallback((item: ResearchItem) => {
        // Validation
        if (state.resources.money < item.cost.money || state.resources.experience < item.cost.xp) return false;

        setState(prev => ({
            ...prev,
            resources: {
                ...prev.resources,
                money: prev.resources.money - item.cost.money,
                experience: prev.resources.experience - item.cost.xp
            },
            currentAction: {
                id: crypto.randomUUID(),
                type: 'research',
                name: `Researching: ${item.name}`,
                startTime: Date.now(),
                duration: item.duration,
                payload: { researchItem: item }
            },
            // Hack: Stashing the research ID in the name or we should have extended GameAction.Payload
            // Let's extend it properly in types next time, but for now we can infer or carry it.
            // Actually, let's use the payload.design field as a generic 'data' or just add a researchId to payload?
            // To be safe without editing types again immediately, we will store the item ID in history or just know 
            // that we need to look it up.
            // BETTER: Lets add a payload field for researchId now in the types update or just use a temporary mechanic.
            // I'll update types.ts to support research payload? No, I'll rely on the `completeResearch` finding the active item by some other means?
            // Wait, we need to know WHICH research is finishing.
            // Let's re-use the payload object, but we need to cast it or change types.
            // Simplest fix: Add researchId to payload in types.ts (done in previous step? No).
            // I will add it to the state update below, assuming I'll fix the type definition if it breaks.
            // actually, let's just use the `name` to find it or passing it in the closure?
            // The tick loop doesn't know the ID.

            // Let's just fix the Type in the next step if needed. 
            // For now, I will add `researchId` to payload as 'any' to bypass if strict.
            // actually I will modify the startResearch to take the ID.

            visuals: {
                character: {
                    ...prev.visuals.character,
                    x: SCENE_CONFIG.positions.desk.x,
                    y: SCENE_CONFIG.positions.desk.y,
                    facing: SCENE_CONFIG.positions.desk.facing,
                    state: 'working'
                }
            }
        } as any)); // Type cast to allow researchId payload until we fix types
        return true;
    }, [state.resources.money, state.resources.experience]);

    const upgradeLocation = useCallback((locationId: string) => {
        const location = LOCATIONS.find(l => l.id === locationId);
        if (!location) return false;

        // Check costs and requirements
        if (state.resources.money < location.cost) return false;
        if (state.resources.reputation < location.repReq) return false;
        if (state.location === locationId) return false; // Already here

        setState(prev => ({
            ...prev,
            location: locationId,
            resources: {
                ...prev.resources,
                money: prev.resources.money - location.cost
            },
            history: [
                {
                    id: crypto.randomUUID(),
                    timestamp: Date.now(),
                    message: `Moved to ${location.name}!`,
                    type: 'success' as const
                },
                ...prev.history
            ].slice(0, 50)
        }));
        return true;
    }, [state.resources.money, state.resources.reputation, state.location]);

    const resolveEvent = useCallback((accepted: boolean) => {
        if (!state.activeEvent) return;

        if (accepted) {
            const evt = state.activeEvent;

            // Check cost
            if (evt.cost && state.resources.money < evt.cost) {
                // Can't afford
                setState(prev => ({
                    ...prev,
                    activeEvent: null, // Dismiss
                    history: [{ id: crypto.randomUUID(), timestamp: Date.now(), message: `Could not afford ${evt.name}`, type: 'warning' as const }, ...prev.history].slice(0, 50)
                }));
                return;
            }

            // Apply cost and rewards
            setState(prev => ({
                ...prev,
                activeEvent: null,
                resources: {
                    ...prev.resources,
                    money: prev.resources.money - (evt.cost || 0) + (evt.rewards.money || 0),
                    reputation: prev.resources.reputation + (evt.rewards.reputation || 0),
                    experience: prev.resources.experience + (evt.rewards.xp || 0)
                },
                history: [{ id: crypto.randomUUID(), timestamp: Date.now(), message: `Participated in ${evt.name}!`, type: 'success' as const }, ...prev.history].slice(0, 50)
            }));
        } else {
            // Declined
            setState(prev => ({ ...prev, activeEvent: null }));
        }
    }, [state.activeEvent, state.resources.money]);

    const hireStaff = useCallback((candidateId: string) => {
        const candidateIndex = state.candidates.findIndex(c => c.id === candidateId);
        if (candidateIndex === -1) return;

        const candidate = state.candidates[candidateIndex];

        // Check Capacity
        const loc = LOCATIONS.find(l => l.id === state.location);
        const capacity = loc ? loc.capacity : 1;

        // Count includes player? Let's say Capacity is ADDITONAL staff for now to be generous, 
        // OR player takes a slot.
        // "Capacity: 2 Artists" usually means Player + 1. 
        // Let's stick to: Capacity = Max Total Artists (Player + Staff).
        // So Staff array length must be < Capacity - 1 (for player).
        if (state.staff.length >= capacity - 1) {
            setState(prev => ({
                ...prev,
                history: [{ id: crypto.randomUUID(), timestamp: Date.now(), message: `Studio is full! Upgrade location to hire more.`, type: 'warning' as const }, ...prev.history].slice(0, 50)
            }));
            return;
        }

        // Check Hiring Cost? (Usually just salary, but maybe a signing bonus? Let's free for now)

        setState(prev => {
            const newCandidates = [...prev.candidates];
            newCandidates.splice(candidateIndex, 1);

            return {
                ...prev,
                candidates: newCandidates,
                staff: [...prev.staff, { ...candidate, hiredAt: Date.now() }],
                history: [{ id: crypto.randomUUID(), timestamp: Date.now(), message: `You hired ${candidate.name}!`, type: 'success' as const }, ...prev.history].slice(0, 50)
            };
        });
    }, [state.candidates, state.location, state.staff]);

    const fireStaff = useCallback((staffId: string) => {
        setState(prev => ({
            ...prev,
            staff: prev.staff.filter(s => s.id !== staffId),
            history: [{ id: crypto.randomUUID(), timestamp: Date.now(), message: `You fired an employee.`, type: 'info' as const }, ...prev.history].slice(0, 50)
        }));
    }, []);

    const buyItem = useCallback((item: ShopItem) => {
        if (state.resources.money < item.cost) return false;

        // Prevent duplicate buy
        if (state.unlocks.equipment.includes(item.id)) return false;

        setState(prev => ({
            ...prev,
            resources: {
                ...prev.resources,
                money: prev.resources.money - item.cost
            },
            unlocks: {
                ...prev.unlocks,
                equipment: [...prev.unlocks.equipment, item.id]
            },
            history: [
                {
                    id: crypto.randomUUID(),
                    timestamp: Date.now(),
                    message: `Purchased ${item.name}`,
                    type: 'info' as const
                },
                ...prev.history
            ].slice(0, 50)
        }));
        return true;
    }, [state.resources.money, state.unlocks.equipment]);

    const dismissResult = useCallback(() => {
        setState(prev => ({ ...prev, lastResult: null }));
    }, []);

    return {
        state,
        manualSave,
        resetGame,
        startTattoo,
        startResearch,
        dismissResult,
        buyItem,
        upgradeLocation,
        resolveEvent,
        hireStaff,
        fireStaff
    };
};
