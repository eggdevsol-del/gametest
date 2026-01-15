import type { GameState } from '../game/types';
import { useState } from 'react';

interface StaffModalProps {
    gameState: GameState;
    onClose: () => void;
    onHire: (id: string) => void;
    onFire: (id: string) => void;
    locationCapacity: number;
}

export const StaffModal = ({ gameState, onClose, onHire, onFire, locationCapacity }: StaffModalProps) => {
    const [tab, setTab] = useState<'team' | 'hiring'>('team');

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="glass-panel w-full max-w-2xl p-6 relative flex flex-col gap-4 animate-fade-in max-h-[80vh] overflow-y-auto border border-blue-500/30">
                <div className="flex justify-between items-center border-b border-white/10 pb-4">
                    <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-600">
                        Staff Management
                    </h2>
                    <button onClick={onClose} className="text-2xl hover:text-white text-gray-400">&times;</button>
                </div>

                {/* Tabs */}
                <div className="flex gap-4 border-b border-white/10 pb-2">
                    <button
                        className={`px-4 py-2 font-bold transition-all ${tab === 'team' ? 'text-white border-b-2 border-blue-500' : 'text-gray-400 hover:text-white'}`}
                        onClick={() => setTab('team')}
                    >
                        Your Team ({gameState.staff.length}/{locationCapacity - 1})
                    </button>
                    <button
                        className={`px-4 py-2 font-bold transition-all ${tab === 'hiring' ? 'text-white border-b-2 border-green-500' : 'text-gray-400 hover:text-white'}`}
                        onClick={() => setTab('hiring')}
                    >
                        Applicants
                    </button>
                </div>

                {tab === 'team' ? (
                    <div className="flex flex-col gap-4 min-h-[200px]">
                        {gameState.staff.length === 0 ? (
                            <p className="text-gray-500 text-center italic mt-8">You have no employees. You are a one-person army.</p>
                        ) : (
                            gameState.staff.map(emp => (
                                <div key={emp.id} className="bg-white/5 p-4 rounded-lg flex justify-between items-center border border-white/10">
                                    <div>
                                        <h3 className="font-bold text-lg text-white">{emp.name} <span className="text-xs bg-blue-500/20 text-blue-400 px-2 rounded">Lvl {emp.level}</span></h3>
                                        <div className="flex gap-4 text-sm mt-1 text-gray-300">
                                            <span title="Passive Income Rate">⚡ Speed: {emp.stats.speed}</span>
                                            <span title="Revenue per work">🔧 Tech: {emp.stats.technical}</span>
                                            <span title="Reputation Bonus">🎨 Art: {emp.stats.artistic}</span>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-red-300 text-sm font-bold mb-2">Cost: ${emp.salary}/day</div>
                                        <button
                                            onClick={() => onFire(emp.id)}
                                            className="px-3 py-1 bg-red-900/40 text-red-500 hover:bg-red-900/60 border border-red-900/50 rounded text-sm"
                                        >
                                            Fire
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                ) : (
                    <div className="flex flex-col gap-4 min-h-[200px]">
                        {gameState.candidates.length === 0 ? (
                            <p className="text-gray-500 text-center italic mt-8">No applicants right now. Improve reputation or wait for new resumes.</p>
                        ) : (
                            gameState.candidates.map(cand => (
                                <div key={cand.id} className="bg-green-500/5 p-4 rounded-lg flex justify-between items-center border border-green-500/20">
                                    <div>
                                        <h3 className="font-bold text-lg text-white">{cand.name} <span className="text-xs bg-green-500/20 text-green-400 px-2 rounded">Lvl {cand.level}</span></h3>
                                        <div className="flex gap-4 text-sm mt-1 text-gray-300">
                                            <span className="text-yellow-200">⚡ {cand.stats.speed}</span>
                                            <span className="text-blue-200">🔧 {cand.stats.technical}</span>
                                            <span className="text-purple-200">🎨 {cand.stats.artistic}</span>
                                        </div>
                                    </div>
                                    <div className="text-right flex flex-col items-end gap-2">
                                        <div className="text-yellow-400 font-bold">Salary: ${cand.salary}/day</div>
                                        <button
                                            disabled={gameState.staff.length >= locationCapacity - 1} // Limit check
                                            onClick={() => onHire(cand.id)}
                                            className="px-4 py-2 bg-green-600 text-white font-bold rounded hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {gameState.staff.length >= locationCapacity - 1 ? 'Office Full' : 'Hire'}
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
