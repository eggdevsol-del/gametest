import type { GameState } from '../game/types';
import { LOCATIONS, type LocationDef } from '../game/data';

interface LocationModalProps {
    gameState: GameState;
    onClose: () => void;
    onUpgrade: (locationId: string) => void;
}

export const LocationModal = ({ gameState, onClose, onUpgrade }: LocationModalProps) => {
    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="glass-panel w-full max-w-2xl p-6 relative flex flex-col gap-4 animate-fade-in max-h-[80vh] overflow-y-auto">
                <div className="flex justify-between items-center border-b border-white/10 pb-4">
                    <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-green-400 to-emerald-600">
                        Real Estate
                    </h2>
                    <button onClick={onClose} className="text-2xl hover:text-white text-gray-400">&times;</button>
                </div>

                <div className="grid gap-4">
                    {LOCATIONS.map((loc: LocationDef) => {
                        const isCurrent = gameState.location === loc.id;
                        const canAfford = gameState.resources.money >= loc.cost;
                        const hasRep = gameState.resources.reputation >= loc.repReq;
                        const isLocked = !hasRep;

                        return (
                            <div
                                key={loc.id}
                                className={`p-4 rounded-xl border transition-all ${isCurrent
                                    ? 'bg-green-500/10 border-green-500/50'
                                    : isLocked
                                        ? 'bg-gray-800/50 border-gray-700 opacity-70'
                                        : 'bg-white/5 border-white/10 hover:bg-white/10'
                                    }`}
                            >
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="text-xl font-bold flex items-center gap-2">
                                            {loc.name}
                                            {isCurrent && <span className="text-xs bg-green-500 text-black px-2 py-0.5 rounded-full">CURRENT</span>}
                                        </h3>
                                        <p className="text-gray-400 text-sm mt-1">{loc.description}</p>
                                        <div className="flex gap-4 mt-2 text-xs uppercase tracking-widest text-gray-500">
                                            <span>Cap: {loc.capacity} Artists</span>
                                        </div>
                                    </div>

                                    <div className="text-right flex flex-col items-end gap-2">
                                        <div className="text-sm">
                                            <span className={canAfford ? 'text-green-400' : 'text-red-400'}>${loc.cost}</span>
                                            <span className="text-gray-500 mx-2">|</span>
                                            <span className={hasRep ? 'text-yellow-400' : 'text-red-400'}>{loc.repReq} Rep</span>
                                        </div>

                                        {!isCurrent && (
                                            <button
                                                disabled={isLocked || !canAfford}
                                                onClick={() => {
                                                    onUpgrade(loc.id);
                                                    onClose();
                                                }}
                                                className={`px-4 py-2 rounded-lg font-bold text-sm ${isLocked || !canAfford
                                                    ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                                                    : 'bg-green-600 hover:bg-green-500 text-white shadow-lg shadow-green-900/20'
                                                    }`}
                                            >
                                                {isLocked ? 'Locked' : 'Move In'}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
