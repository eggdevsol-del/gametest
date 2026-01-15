import type { GameEvent } from '../game/types';

interface EventModalProps {
    event: GameEvent;
    onResolve: (accepted: boolean) => void;
}

export const EventModal = ({ event, onResolve }: EventModalProps) => {
    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="glass-panel w-full max-w-md p-6 relative flex flex-col gap-4 animate-fade-in border-2 border-indigo-500/50 shadow-[0_0_50px_rgba(99,102,241,0.2)]">

                <h2 className="text-3xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent text-center">
                    {event.name}
                </h2>

                <p className="text-gray-300 text-center text-lg">{event.description}</p>

                <div className="bg-white/5 rounded-lg p-4 space-y-2">
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-400">Duration</span>
                        <span className="text-white">{event.duration / 1000}s</span>
                    </div>
                    {event.cost ? (
                        <div className="flex justify-between items-center text-sm font-bold text-red-400">
                            <span>Entry Cost</span>
                            <span>${event.cost}</span>
                        </div>
                    ) : (
                        <div className="flex justify-between items-center text-sm font-bold text-green-400">
                            <span>Entry Cost</span>
                            <span>FREE</span>
                        </div>
                    )}
                </div>

                <div className="flex justify-between items-center text-xs text-gray-500 uppercase tracking-widest mt-2">
                    Potential Rewards
                </div>

                <div className="flex gap-2 justify-center">
                    {event.rewards.reputation && (
                        <span className="badge bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
                            +{event.rewards.reputation} Rep
                        </span>
                    )}
                    {event.rewards.money && (
                        <span className="badge bg-green-500/10 text-green-400 border border-green-500/20">
                            +${event.rewards.money}
                        </span>
                    )}
                    {event.rewards.xp && (
                        <span className="badge bg-purple-500/10 text-purple-400 border border-purple-500/20">
                            +{event.rewards.xp} XP
                        </span>
                    )}
                </div>

                <div className="grid grid-cols-2 gap-4 mt-6">
                    <button
                        onClick={() => onResolve(false)}
                        className="glass-button text-gray-400 hover:text-white"
                    >
                        Ignore
                    </button>
                    <button
                        onClick={() => onResolve(true)}
                        className="glass-button action-btn bg-indigo-600 hover:bg-indigo-500 border-indigo-400"
                    >
                        Accept
                    </button>
                </div>
            </div>
        </div>
    );
};
