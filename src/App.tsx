
import { useGameEngine } from './game/engine';
import { Layout } from './components/Layout';
import { ActionMenu } from './components/ActionMenu';
import { ResultModal } from './components/ResultModal';
import { HUD } from './components/HUD';
import { EventModal } from './components/EventModal';

function App() {
  const { state, manualSave, resetGame, startTattoo, startResearch, dismissResult, buyItem, resolveEvent, upgradeLocation, hireStaff, fireStaff } = useGameEngine();

  return (
    <Layout gameState={state} onSave={manualSave} onReset={resetGame}>
      <div className="app-container relative h-full">

        {/* Heads Up Display */}
        <HUD gameState={state} />

        {/* Content Layer (Welcome Text, etc) */}
        {/* We push this down or make it subtle since HUD is top */}
        <div className="absolute top-1/2 left-4 -translate-y-1/2 max-w-md p-8 pointer-events-none">
          <h2 className="text-4xl font-black text-white/10 tracking-widest uppercase mb-4">The Garage</h2>
        </div>

        <ActionMenu
          gameState={state}
          onStartTattoo={startTattoo}
          onStartResearch={startResearch}
          onBuyItem={buyItem}
          onUpgradeLocation={upgradeLocation}
          onHireStaff={hireStaff}
          onFireStaff={fireStaff}
        />

        <ResultModal gameState={state} onDismiss={dismissResult} />

        {state.activeEvent && (
          <EventModal
            event={state.activeEvent}
            onResolve={resolveEvent}
          />
        )}

      </div>
    </Layout>
  );
}

export default App;
