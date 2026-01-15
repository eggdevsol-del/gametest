import React from 'react';
import type { GameState } from '../game/types';
import { SHOP_ITEMS, type ShopItem } from '../game/data';

interface ShopModalProps {
    gameState: GameState;
    onClose: () => void;
    onBuy: (item: ShopItem) => void;
}

export const ShopModal: React.FC<ShopModalProps> = ({ gameState, onClose, onBuy }) => {

    const isOwned = (id: string) => gameState.unlocks.equipment.includes(id);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="glass-panel w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col anim-fade-in">

                <header className="p-6 border-b border-white/10 flex justify-between items-center bg-accent-secondary/10">
                    <div>
                        <h2 className="text-xl font-bold text-accent-secondary">Supply Shop</h2>
                        <p className="text-xs text-muted">Upgrade your gear.</p>
                    </div>
                    <div className="text-right">
                        <p className="text-xs text-muted uppercase">Balance</p>
                        <p className="text-xl font-mono text-green-400 font-bold">${gameState.resources.money}</p>
                    </div>
                    <button onClick={onClose} className="absolute top-6 right-6 text-muted hover:text-white">✕</button>
                </header>

                <div className="p-6 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-4">
                    {SHOP_ITEMS.map(item => {
                        const owned = isOwned(item.id);
                        const affordable = gameState.resources.money >= item.cost;

                        return (
                            <div
                                key={item.id}
                                className={`p-4 rounded-lg border flex flex-col justify-between gap-4 transition-all ${owned ? 'bg-white/5 border-white/5 opacity-50' :
                                        'bg-black/40 border-white/10 hover:border-accent-secondary/50'
                                    }`}
                            >
                                <div>
                                    <div className="flex justify-between items-start mb-1">
                                        <h3 className="font-bold text-white">{item.name}</h3>
                                        {item.stats?.speedBonus && (
                                            <span className="text-[10px] bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded">
                                                +{item.stats.speedBonus * 100}% SPD
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-sm text-muted mb-2">{item.description}</p>
                                    <p className="font-mono text-lg text-green-400">${item.cost}</p>
                                </div>

                                <button
                                    onClick={() => onBuy(item)}
                                    disabled={owned || !affordable}
                                    className={`glass-button text-sm w-full justify-center ${owned ? 'bg-transparent border-transparent text-muted cursor-default' :
                                            affordable ? 'bg-accent-secondary/20 hover:bg-accent-secondary/30' :
                                                'opacity-50 cursor-not-allowed'
                                        }`}
                                >
                                    {owned ? 'Purchased' : 'Buy'}
                                </button>
                            </div>
                        );
                    })}
                </div>

            </div>
        </div>
    );
};
