import { useState } from 'react';
import { TattooModal } from './TattooModal';
import { ResearchModal } from './ResearchModal';
import { ShopModal } from './ShopModal';
import { LocationModal } from './LocationModal';
import { StaffModal } from './StaffModal';
import type { GameState, TattooDesign } from '../game/types';
import type { ResearchItem, ShopItem } from '../game/data';
import { LOCATIONS } from '../game/data';

interface ActionMenuProps {
    gameState: GameState;
    onStartTattoo: (design: TattooDesign) => void;
    onStartResearch: (item: ResearchItem) => void;
    onBuyItem: (item: ShopItem) => void;
    onUpgradeLocation: (locationId: string) => void;
    onHireStaff: (id: string) => void;
    onFireStaff: (id: string) => void;
}

export const ActionMenu = ({ gameState, onStartTattoo, onStartResearch, onBuyItem, onUpgradeLocation, onHireStaff, onFireStaff }: ActionMenuProps) => {
    const [isTattooModalOpen, setIsTattooModalOpen] = useState(false);
    const [isResearchModalOpen, setIsResearchModalOpen] = useState(false);
    const [isShopModalOpen, setIsShopModalOpen] = useState(false);
    const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
    const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);

    const handleTattooStart = (design: TattooDesign) => {
        onStartTattoo(design);
        setIsTattooModalOpen(false);
    };

    const handleResearchStart = (item: ResearchItem) => {
        onStartResearch(item);
        setIsResearchModalOpen(false);
    };

    const handleBuy = (item: ShopItem) => {
        onBuyItem(item);
    };

    // Derived
    const currentLocationDef = LOCATIONS.find(l => l.id === gameState.location);
    const locationCapacity = currentLocationDef ? currentLocationDef.capacity : 1;

    // Disable if busy
    const isBusy = !!gameState.currentAction;

    return (
        <>
            <div className="fixed bottom-8 right-8 z-50 flex flex-col gap-4 items-end">

                {/* Staff Button */}
                <button
                    className={`glass-button w-12 h-12 rounded-full flex items-center justify-center ${isBusy ? 'opacity-50' : ''}`}
                    onClick={() => setIsStaffModalOpen(true)}
                    title="Staff"
                >
                    👥
                </button>

                {/* Location Button */}
                <button
                    className={`glass-button w-12 h-12 rounded-full flex items-center justify-center ${isBusy ? 'opacity-50' : ''}`}
                    onClick={() => setIsLocationModalOpen(true)}
                    title="Locations"
                >
                    🏢
                </button>

                {/* Shop Button */}
                <button
                    className={`glass-button w-12 h-12 rounded-full flex items-center justify-center ${isBusy ? 'opacity-50' : ''}`}
                    onClick={() => setIsShopModalOpen(true)}
                    title="Shop"
                >
                    🛒
                </button>

                {/* Research Button */}
                <button
                    className={`glass-button w-12 h-12 rounded-full flex items-center justify-center ${isBusy ? 'opacity-50 cursor-not-allowed' : ''}`}
                    onClick={() => !isBusy && setIsResearchModalOpen(true)}
                    disabled={isBusy}
                    title="Research"
                >
                    📚
                </button>

                {/* Main Action Button */}
                <button
                    className={`glass-button action-btn-large ${isBusy ? 'opacity-50 cursor-not-allowed' : ''}`}
                    onClick={() => !isBusy && setIsTattooModalOpen(true)}
                    disabled={isBusy}
                >
                    {isBusy ? 'Busy...' : 'New Tattoo'}
                </button>
            </div>

            {isTattooModalOpen && (
                <TattooModal
                    gameState={gameState}
                    onClose={() => setIsTattooModalOpen(false)}
                    onStart={handleTattooStart}
                />
            )}

            {isResearchModalOpen && (
                <ResearchModal
                    gameState={gameState}
                    onClose={() => setIsResearchModalOpen(false)}
                    onStartResearch={handleResearchStart}
                />
            )}

            {isShopModalOpen && (
                <ShopModal
                    gameState={gameState}
                    onClose={() => setIsShopModalOpen(false)}
                    onBuy={handleBuy}
                />
            )}

            {isLocationModalOpen && (
                <LocationModal
                    gameState={gameState}
                    onClose={() => setIsLocationModalOpen(false)}
                    onUpgrade={onUpgradeLocation}
                />
            )}

            {isStaffModalOpen && (
                <StaffModal
                    gameState={gameState}
                    onClose={() => setIsStaffModalOpen(false)}
                    onHire={onHireStaff}
                    onFire={onFireStaff}
                    locationCapacity={locationCapacity}
                />
            )}
        </>
    );
};
